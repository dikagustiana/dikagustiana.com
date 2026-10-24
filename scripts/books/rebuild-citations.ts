/**
 * Rebuilds public.book_citations (docs/prd/library-phase-2 §4, Data;
 * supabase/migrations/20261025110000_library_book_citations.sql): every live book against every essay's
 * references (scripts/books/citations.ts). Run by hand whenever essays change; there is no trigger.
 *
 *   npx vite-node scripts/books/rebuild-citations.ts [--dry-run]
 *
 * Replaces the table's rows in one pass: the pairs found are upserted and every other pair deleted. Settings:
 * scripts/books/lib.ts. Prints each pair as "book ← essay".
 */
import { citations, type CitableBook, type CitingEssay } from './citations';
import { adminClient, args, settings } from './lib';

async function main() {
  const { flags } = args();
  const db = adminClient(settings());
  const books = await db.from('books_uploads').select('id, slug, title, author').is('deleted_at', null);
  if (books.error) throw books.error;
  const essays: (CitingEssay & { slug: string })[] = [];
  for (let from = 0; ; from += 500) {
    const page = await db.from('essays').select('id, slug, presentation, content_json').order('id').range(from, from + 499);
    if (page.error) throw page.error;
    essays.push(...((page.data ?? []) as (CitingEssay & { slug: string })[]));
    if ((page.data ?? []).length < 500) break;
  }
  const pairs = citations((books.data ?? []) as CitableBook[], essays);
  const bookSlug = new Map((books.data ?? []).map((b) => [b.id as string, b.slug as string]));
  const essaySlug = new Map(essays.map((e) => [e.id, e.slug]));
  for (const p of pairs) console.log(`${bookSlug.get(p.book_id)} ← ${essaySlug.get(p.essay_id)}`);
  console.log(`${pairs.length} pair(s) from ${books.data?.length ?? 0} book(s) and ${essays.length} essay(s).`);
  if (flags.has('dry-run')) return;

  const existing = await db.from('book_citations').select('book_id, essay_id');
  if (existing.error) throw existing.error;
  const keep = new Set(pairs.map((p) => `${p.book_id}/${p.essay_id}`));
  for (const old of existing.data ?? []) {
    if (keep.has(`${old.book_id}/${old.essay_id}`)) continue;
    const { error } = await db.from('book_citations').delete().eq('book_id', old.book_id).eq('essay_id', old.essay_id);
    if (error) throw error;
  }
  if (pairs.length) {
    const { error } = await db.from('book_citations').upsert(pairs, { onConflict: 'book_id,essay_id', ignoreDuplicates: true });
    if (error) throw error;
  }
}

main().catch((e) => {
  console.error(`rebuild-citations: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
