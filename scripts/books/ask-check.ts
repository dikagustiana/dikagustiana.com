/**
 * Asks the deployed book-ask function one fixed question and checks the answer
 * (docs/prd/library-phase-2 §4 Tests: "cites only [¶n] present in context"). For the owner, once the
 * function and its secrets are live; it spends one of the day's questions and a few cents.
 *
 *   npx vite-node scripts/books/ask-check.ts --book <book id> --chapter <n> --from <para> --to <para> \
 *     [--question "…"]
 *
 * Reads SUPABASE_URL (or VITE_SUPABASE_URL) and the public key VITE_SUPABASE_PUBLISHABLE_KEY from .env.local
 * or the environment, asks as an anonymous visitor, prints the streamed answer, and exits 1 when the answer
 * cites a paragraph outside its context, cites none, or the function refuses.
 */
import fs from 'node:fs';
import { ENV_FILE, parseEnvFile } from '../fia/db';
import { args } from './lib';

async function main() {
  const { values } = args();
  const env = { ...(process.env as Record<string, string>), ...(fs.existsSync(ENV_FILE) ? parseEnvFile(fs.readFileSync(ENV_FILE, 'utf8')) : {}) };
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are needed.');
  const from = Number(values.from);
  const to = Number(values.to ?? values.from);
  const res = await fetch(`${url}/functions/v1/book-ask`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      book_id: values.book,
      chapter: Number(values.chapter),
      selection: { para_from: from, para_to: to, text: values.text ?? 'the selected passage' },
      question: values.question ?? 'What does this passage say? Cite the paragraphs.',
    }),
  });
  const body = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(body);
  if (!res.ok) process.exit(1);
  const done = /event: done\ndata: (.*)/.exec(body)?.[1];
  const d = done ? (JSON.parse(done) as { cited: number[]; outside: number[] }) : null;
  if (!d || !d.cited.length || d.outside.length) {
    console.log(`FAIL: cited ${JSON.stringify(d?.cited ?? [])}, outside the context ${JSON.stringify(d?.outside ?? [])}`);
    process.exit(1);
  }
  console.log(`OK: cites ${d.cited.map((n) => `[¶${n}]`).join(' ')}, all in the context`);
}

main().catch((e) => {
  console.error(`ask-check: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
