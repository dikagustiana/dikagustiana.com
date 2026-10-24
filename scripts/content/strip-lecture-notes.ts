/**
 * Removes the lecture-notes source from every essay (site cleanup 2026-10, PRD §C, WP3).
 *
 *   npx vite-node scripts/content/strip-lecture-notes.ts                 dry run against the database
 *   npx vite-node scripts/content/strip-lecture-notes.ts -- --apply      backup, then write, in one transaction
 *   npx vite-node scripts/content/strip-lecture-notes.ts -- --from <rows.json>   dry run against a dump
 *
 * The database is the one in .env.local (SUPABASE_DB_URL and SUPABASE_DB_PASSWORD, as for the fia scripts;
 * scripts/fia/db.ts). Nothing here prints a secret, and nothing here holds a key.
 *
 * Every run reads every essay (all sections, published and draft), applies the approved edits
 * (scripts/content/lecture-notes-edits.json, see ./lectureNotes.ts), regenerates `content` from the edited
 * `content_json` with the app's schema, and checks each changed row: the document is valid in the schema,
 * none of HARD_PATTERNS is left in content, content_json or presentation, and every "ref. N" resolves. It
 * writes the diff (docs/prd/site-cleanup-2026-10/lecture-notes-diff.md) and stops there unless --apply.
 *
 * It refuses to write when any essay still holds a HARD_PATTERN without an approved edit (a draft nobody
 * has seen, say), when an edit does not match the text exactly once, or when a row's HTML was not its
 * document's HTML before the change. With --apply it first saves every row it will change to
 * backups/essays-lecture-notes-<timestamp>.json, then updates them in one transaction, each only if its
 * updated_at is what was read (no one saved it meanwhile), and writes one `migration` revision per essay
 * into essay_revisions, as the accounting import does. Rollback: scripts/content/restore-from-backup.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// generateHTML serialises through the DOM; the schema's figure and link-card nodes import modules that touch
// storage.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  sessionStorage: dom.window.sessionStorage,
  DOMParser: dom.window.DOMParser,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
});

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CHANGE_SUMMARY = 'Lecture-notes source removed and references renumbered (site cleanup 2026-10, WP3)';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

export interface Row {
  id: string;
  slug: string;
  section: string | null;
  title: string | null;
  status: string | null;
  published: boolean | null;
  content: string | null;
  content_json: import('./lectureNotes').Json;
  presentation: import('./lectureNotes').Json;
  updated_at: string;
}

const COLUMNS = 'id, slug, section, title, snippet, status, published, content, content_json, presentation, updated_at';

async function main() {
  const lib = await import('./lectureNotes');
  const { generateHTML, getSchema } = await import('@tiptap/core');
  const { Node: PMNode } = await import('@tiptap/pm/model');
  const { getSchemaExtensions } = await import('@/lib/tiptap/extensions');
  const extensions = getSchemaExtensions();
  const schema = getSchema(extensions);

  const editsFile = arg('--edits') ?? join(HERE, 'lecture-notes-edits.json');
  const diffFile = arg('--diff') ?? join(ROOT, 'docs/prd/site-cleanup-2026-10/lecture-notes-diff.md');
  const from = arg('--from');
  const apply = flag('--apply');
  if (apply && from) throw new Error('--apply writes to the database; it cannot read rows from --from');

  const plan = JSON.parse(readFileSync(editsFile, 'utf8')) as { essays: import('./lectureNotes').EssayEdits[] };
  const bySlug = new Map(plan.essays.map((e) => [e.slug, e.edits]));

  // ---- read ----------------------------------------------------------------
  let rows: Row[];
  let client: import('pg').Client | null = null;
  let secrets: string[] = [];
  if (from) {
    rows = JSON.parse(readFileSync(from, 'utf8')) as Row[];
  } else {
    const db = await import('../fia/db');
    const c = await db.connect();
    client = c.client;
    secrets = c.secrets;
    rows = (await client.query(`select ${COLUMNS} from public.essays order by section, slug`)).rows as Row[];
  }
  const source = from ? `the dump ${from}` : 'the database in .env.local';

  // ---- transform -----------------------------------------------------------
  type Done = { row: Row; result: import('./lectureNotes').EssayResult; html: string; soft: string[] };
  const done: Done[] = [];
  const problems: string[] = [];
  const unknownSlugs = new Set(bySlug.keys());
  for (const row of rows) {
    const text = lib.searchableText(row);
    const hard = lib.findPatterns(text, lib.HARD_PATTERNS);
    const edits = bySlug.get(row.slug);
    unknownSlugs.delete(row.slug);
    if (!edits) {
      if (hard.length) problems.push(`${row.slug} (${row.section}, ${row.status ?? (row.published ? 'published' : 'draft')}): mentions the lecture notes and has no approved edits:\n    ${hard.slice(0, 3).join('\n    ')}`);
      continue;
    }
    try {
      if (!row.content_json) throw new lib.EditError(`${row.slug}: no content_json`);
      const before = generateHTML(row.content_json as never, extensions);
      if (before !== row.content) throw new lib.EditError(`${row.slug}: its HTML is not its document's HTML; refusing to regenerate it`);
      const result = lib.applyEdits(row.slug, row.content_json as never, row.presentation, edits);
      PMNode.fromJSON(schema, result.doc).check();
      const html = generateHTML(result.doc as never, extensions);
      const after = { content: html, content_json: result.doc as never, presentation: result.presentation };
      const left = lib.findPatterns(lib.searchableText(after), lib.HARD_PATTERNS);
      if (left.length) throw new lib.EditError(`${row.slug}: still mentions the lecture notes after its edits:\n    ${left.slice(0, 4).join('\n    ')}`);
      const cites = lib.citationProblems(result.doc);
      if (cites.length) throw new lib.EditError(`${row.slug}: ${cites.join('; ')}`);
      const soft = lib.findPatterns([lib.textOf(result.doc), JSON.stringify(result.presentation)].join('\n'), lib.SOFT_PATTERNS);
      done.push({ row, result, html, soft });
    } catch (e) {
      problems.push(e instanceof lib.EditError ? e.message : String(e));
    }
  }
  for (const s of unknownSlugs) problems.push(`${s}: has edits but no essay with this slug in ${source}`);

  // ---- diff ----------------------------------------------------------------
  writeFileSync(diffFile, renderDiff(done, problems, source));
  console.log(`read ${rows.length} essays from ${source}`);
  console.log(`${done.length} essays change; diff written to ${diffFile}`);
  if (problems.length) console.log(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}`);

  if (!apply) return;
  if (problems.length) throw new Error('not applied: fix the problems above first (nothing was written)');
  if (!client) throw new Error('no database');

  // ---- backup, then one transaction ----------------------------------------
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const backupFile = join(ROOT, 'backups', `essays-lecture-notes-${stamp}.json`);
  mkdirSync(dirname(backupFile), { recursive: true });
  writeFileSync(backupFile, JSON.stringify(done.map((d) => d.row), null, 1));
  console.log(`backup of ${done.length} rows: ${backupFile}`);

  try {
    await client.query('begin');
    for (const d of done) {
      const up = await client.query(
        `update public.essays set content = $2, content_json = $3::jsonb, presentation = $4::jsonb, updated_at = now()
          where id = $1 and updated_at = $5 returning id, title, snippet, status`,
        [d.row.id, d.html, JSON.stringify(d.result.doc), JSON.stringify(d.result.presentation), d.row.updated_at],
      );
      if (up.rowCount !== 1) throw new Error(`${d.row.slug} was saved by someone else after it was read; nothing written. Run again.`);
      await client.query(
        `insert into public.essay_revisions (essay_id, revision_no, change_type, title, snippet, content_json, status, change_summary, changed_by)
         select e.id, coalesce((select max(x.revision_no) from public.essay_revisions x where x.essay_id = e.id), 0) + 1, 'migration',
                e.title, e.snippet, e.content_json, e.status, $2, null
           from public.essays e where e.id = $1`,
        [d.row.id, CHANGE_SUMMARY],
      );
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => undefined);
    throw e;
  }
  console.log(`written: ${done.length} essays, ${done.length} revisions, in one transaction`);

  // ---- verify --------------------------------------------------------------
  const all = (await client.query(`select ${COLUMNS} from public.essays`)).rows as Row[];
  let left = 0;
  let unsynced = 0;
  let cites = 0;
  for (const r of all) {
    if (lib.findPatterns(lib.searchableText(r), lib.HARD_PATTERNS).length) left++;
    if (r.content_json && done.some((d) => d.row.id === r.id)) {
      if (generateHTML(r.content_json as never, extensions) !== r.content) unsynced++;
      cites += lib.citationProblems(r.content_json as never).length;
    }
  }
  console.log(`verify: ${left} essays mention the lecture notes; ${unsynced} changed essays out of sync; ${cites} citation problems`);
  if (left || unsynced || cites) throw new Error('verification failed: restore with scripts/content/restore-from-backup.ts ' + backupFile);
  void secrets;
}

function renderDiff(done: { row: Row; result: import('./lectureNotes').EssayResult; soft: string[] }[], problems: string[], source: string): string {
  const q = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const out: string[] = [];
  out.push('# Lecture notes removal — dry-run diff (Gate B)', '');
  out.push(`Generated by \`scripts/content/strip-lecture-notes.ts\` from ${source}, ${new Date().toISOString()}.`, '');
  out.push(
    'Each essay below: the reference removed, the references list before and after (renumbered), every changed paragraph before → after, and every inline citation renumbered. Edits come from `scripts/content/lecture-notes-edits.json`; to change a rewrite, edit its `replace` text there and run the dry run again. Nothing is written to the database until the script is run with `--apply`.',
    '',
  );
  out.push(`**${done.length} essays change.**`, '');
  if (problems.length) out.push('## Not resolved', '', ...problems.map((p) => `- ${p.replace(/\n/g, '<br>')}`), '');
  for (const d of done) {
    const r = d.result;
    out.push(`## ${d.row.title ?? d.row.slug}`, '');
    out.push(`\`${d.row.slug}\` · ${d.row.section ?? '—'} · ${d.row.status ?? (d.row.published ? 'published' : 'draft')}`, '');
    const removed = [...r.renumber].filter(([, to]) => to === null).map(([n]) => n);
    if (removed.length) {
      out.push(`**Reference removed:** ${removed.map((n) => `#${n}`).join(', ')}.`, '');
      const moved = [...r.renumber].filter(([n, to]) => to !== null && to !== n);
      out.push(moved.length ? `**Renumbered:** ${moved.map(([n, to]) => `${n} → ${to}`).join(', ')}.` : '**Renumbered:** nothing (the removed item was last).', '');
      out.push('<details><summary>References after</summary>', '');
      r.referencesAfter.forEach((t, i) => out.push(`${i + 1}. ${t.slice(0, 220)}${t.length > 220 ? '…' : ''}`));
      out.push('', '</details>', '');
    }
    out.push('| # | Before | After |', '|---|---|---|');
    r.blocks.forEach((b, i) => out.push(`| ${i + 1} | ${q(b.before)} | ${b.after === null ? '*(removed)*' : q(b.after)} |`));
    out.push('');
    if (r.citations.length) {
      out.push('**Citations renumbered:**', '');
      for (const c of r.citations) out.push(`- \`${c.before}\` → \`${c.after}\` — …${q(c.context)}…`);
      out.push('');
    }
    if (r.crossRefs.length) {
      out.push('**Citations of another essay’s list (check by hand):**', '');
      for (const c of r.crossRefs) out.push(`- ${q(c)}`);
      out.push('');
    }
    if (d.soft.length) {
      out.push('<details><summary>Left as is — wording a reader might still connect to the notes (reviewed)</summary>', '');
      for (const s of d.soft) out.push(`- ${q(s)}`);
      out.push('', '</details>', '');
    }
  }
  return out.join('\n') + '\n';
}

// The schema's imports start a Supabase client whose timers would keep the process alive, so the outcome
// ends it.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
