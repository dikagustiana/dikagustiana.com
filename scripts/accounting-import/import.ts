/**
 * Import the accounting essay batch of 11 Oct 2026 (owner brief of 12 Oct
 * 2026): 30 FSLI essays and the six-part consolidation series.
 *
 *   npx vite-node scripts/accounting-import/import.ts -- --src <dir> --out <dir> --dry-run
 *   npx vite-node scripts/accounting-import/import.ts -- --src <dir> --out <dir> [--snapshot <json>]
 *   npx vite-node scripts/accounting-import/import.ts -- --src <dir> --out <dir> --apply
 *
 * <dir> holds "Accounting - FSLI/NN-*.md" and "Accounting - Consolidation/K*.md".
 * The source and the output stay out of the repo: the bodies are unpublished
 * prose, and the output carries them.
 *
 * Every run parses, applies corrections.json, converts and checks each file,
 * and refuses the whole batch on the first failure: a correction that matches
 * the wrong number of times, a table or formula block lost in conversion, a
 * text or number difference other than the corrections, an HTML ↔ JSON round
 * trip that is not stable, or a link to a page that will not exist. It writes
 * report.json (and report.md) to --out.
 *
 *   --dry-run   stops there. With --snapshot (the current rows, JSON) the
 *               report also says, row by row, which columns would change.
 *   (default)   also writes payload.json, the rows to send.
 *   --apply     sends payload.json, one essay per call, to the temporary
 *               import function (a SECURITY DEFINER RPC that checks a one-time
 *               token against its hash, upserts by slug and writes one
 *               `migration` revision per changed essay; see the PR). Reads
 *               ACCOUNTING_IMPORT_TOKEN, SUPABASE_URL and SUPABASE_KEY (the
 *               publishable key) from the environment and never prints them.
 *
 * Status is never set here: new rows are drafts, existing rows keep theirs.
 * Re-running with unchanged files changes nothing and writes no revision.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { JSDOM } from 'jsdom';

// generateJSON and generateHTML parse and serialise through the DOM.
// The schema's figure and link-card nodes import modules that touch storage.
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
const SECTION_DIRS = { fsli: 'Accounting - FSLI', consolidation: 'Accounting - Consolidation' } as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

async function main() {
  const conv = await import('./convert');
  const src = arg('--src');
  const out = arg('--out');
  if (!src || !out) throw new Error('--src and --out are required');
  mkdirSync(out, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(HERE, 'corrections.json'), 'utf8')) as import('./convert').CorrectionManifest;

  // ---- read every file first: links resolve across the whole batch -------
  type Source = { file: string; group: 'fsli' | 'consolidation'; fm: import('./convert').Frontmatter; body: string };
  const sources: Source[] = [];
  for (const [group, dir] of Object.entries(SECTION_DIRS) as Array<[Source['group'], string]>) {
    for (const file of readdirSync(join(src, dir)).filter((f) => f.endsWith('.md')).sort()) {
      // Half the batch was saved with CRLF line endings; the text is the same.
      const text = readFileSync(join(src, dir, file), 'utf8').replace(/\r\n?/g, '\n');
      const { fm, body } = conv.parseFrontmatter(text);
      sources.push({ file, group, fm, body });
    }
  }

  // Line-item pages: an essay's own fsli_slug, and every slug its also_covers names.
  const essayPage = new Map<string, string>();
  const coveredBy = new Map<string, string>();
  const kPaths: Record<string, string> = {};
  for (const s of sources) {
    if (s.group === 'fsli') {
      const page = conv.str(s.fm, 'fsli_slug');
      essayPage.set(page, s.file);
      for (const c of conv.list(s.fm, 'also_covers')) {
        if (coveredBy.has(c) && coveredBy.get(c) !== page) throw new Error(`${c} is claimed by two essays`);
        coveredBy.set(c, page);
      }
    } else {
      kPaths[s.file.split('-')[0]] = new URL(conv.str(s.fm, 'url')).pathname;
    }
  }
  const resolve = (slug: string) => (essayPage.has(slug) ? slug : coveredBy.get(slug) ?? null);
  const validHref = (href: string) =>
    Object.values(kPaths).includes(href) ||
    (href.startsWith('/accounting/fsli/') && essayPage.has(href.slice('/accounting/fsli/'.length)));

  const snapshot = arg('--snapshot')
    ? new Map((JSON.parse(readFileSync(arg('--snapshot')!, 'utf8')) as Array<Record<string, unknown>>).map((r) => [r.slug as string, r]))
    : null;

  const rows: Array<Record<string, unknown>> = [];
  const report: Array<Record<string, unknown>> = [];

  for (const s of sources) {
    const title = conv.str(s.fm, 'title');
    const deck = conv.str(s.fm, 'deck');
    const slug = conv.str(s.fm, 'slug');
    const ownPage = s.group === 'fsli' ? conv.str(s.fm, 'fsli_slug') : null;
    const url = new URL(conv.str(s.fm, 'url')).pathname;
    const expectedUrl = ownPage ? `/accounting/fsli/${ownPage}` : `/accounting/consolidation/${slug}`;
    if (url !== expectedUrl) throw new Error(`${s.file}: url ${url}, expected ${expectedUrl}`);

    const source = conv.stripHeader(s.body, title, deck);
    const corrected = conv.applyCorrections(s.file, source, manifest, kPaths);
    const linked = conv.linkSlugs(corrected.text, ownPage, resolve);
    const markdown = linked.text;

    // Nothing local may survive: no file names, no paths.
    const leftovers = markdown.match(/`[^`]*(\.md|\.pdf|\.csv|\.txt|\\)[^`]*`|`K\d-[^`]*`|Downloads\\|_referensi/g);
    if (leftovers) throw new Error(`${s.file}: local references left: ${leftovers.join(', ')}`);
    if (/PSAK 211\b|PSAK 219 \(formerly PSAK 19/.test(markdown)) throw new Error(`${s.file}: PSAK numbering left uncorrected`);

    const html = conv.markdownToHtml(markdown);
    const doc = conv.htmlToDoc(html);
    const content = conv.docToHtml(doc);
    if (!isDeepStrictEqual(conv.htmlToDoc(content), doc)) throw new Error(`${s.file}: HTML ↔ JSON round trip is not stable`);

    // Structure survived the conversion.
    const want = conv.markdownStats(markdown);
    const got = conv.docStats(doc);
    if (!isDeepStrictEqual(want.tables, got.tables)) throw new Error(`${s.file}: tables ${JSON.stringify(want.tables)} became ${JSON.stringify(got.tables)}`);
    if (want.blockquotes !== got.blockquotes || want.quoteParagraphs !== got.quoteParagraphs) {
      throw new Error(`${s.file}: formula blocks ${want.blockquotes}/${want.quoteParagraphs} became ${got.blockquotes}/${got.quoteParagraphs}`);
    }
    const badLinks = got.hrefs.filter((h) => !validHref(h));
    if (badLinks.length) throw new Error(`${s.file}: links to pages that will not exist: ${badLinks.join(', ')}`);

    // The text is the markdown's, word for word and number for number.
    const fromMarkdown = conv.normaliseMarkdown(markdown);
    const fromDoc = conv.normaliseRendered(conv.docText(doc));
    if (fromMarkdown !== fromDoc) {
      let i = 0;
      while (i < fromMarkdown.length && fromMarkdown[i] === fromDoc[i]) i++;
      throw new Error(`${s.file}: text differs at "${fromMarkdown.slice(i - 40, i + 40)}" vs "${fromDoc.slice(i - 40, i + 40)}"`);
    }
    // Numbers: the conversion and the slug links change none, and against the
    // untouched source the corrections remove and add exactly the numbers
    // their own find and replace strings carry (PSAK 211 → 111, a path's
    // "2024", a file's "25"). Every figure is otherwise where it was.
    const sourceNumbers = conv.numbersOf(conv.normaliseMarkdown(source));
    const correctedNumbers = conv.numbersOf(conv.normaliseMarkdown(corrected.text));
    const finalNumbers = conv.numbersOf(fromDoc);
    if (!isDeepStrictEqual(correctedNumbers, finalNumbers)) throw new Error(`${s.file}: the conversion changed a number`);
    const removedByEntries: string[] = [];
    const addedByEntries: string[] = [];
    for (const a of corrected.applied) {
      for (let k = 0; k < a.count; k++) {
        removedByEntries.push(...conv.numbersOf(conv.normaliseMarkdown(a.find)));
        addedByEntries.push(...conv.numbersOf(conv.normaliseMarkdown(a.replace)));
      }
    }
    const removed = conv.multisetMinus(sourceNumbers, correctedNumbers);
    const added = conv.multisetMinus(correctedNumbers, sourceNumbers);
    if (
      conv.multisetMinus(removed, conv.multisetMinus(removedByEntries, addedByEntries)).length ||
      conv.multisetMinus(added, conv.multisetMinus(addedByEntries, removedByEntries)).length
    ) {
      throw new Error(`${s.file}: numbers changed beyond the corrections (removed ${removed.join(' ')}; added ${added.join(' ')})`);
    }

    const related = s.group === 'consolidation' ? conv.remapRelated(conv.list(s.fm, 'related_fsli'), manifest.relatedFsliRemap) : null;
    for (const r of related ?? []) if (!essayPage.has(r)) throw new Error(`${s.file}: related_fsli ${r} has no essay`);
    const presentation: Record<string, unknown> = {
      deck,
      genre: null,
      author_bio: null,
      references: [],
      hero_caption: null,
      key_takeaways: conv.keyTakeaways(source),
      revision_note: null,
    };
    if (related) presentation.related_fsli = related;

    const byRule = (rule: string) => corrected.applied.filter((a) => a.rule === rule);
    const summary = [
      `Imported from the accounting batch of 11 Oct 2026 (${s.file}, ${conv.str(s.fm, 'status')}).`,
      ...byRule('C1').map((a) => `C1 PSAK numbering: "${a.find}" → "${a.replace}".`),
      related && conv.list(s.fm, 'related_fsli').some((r) => manifest.relatedFsliRemap[r])
        ? `C2 related_fsli remapped: ${conv.list(s.fm, 'related_fsli').filter((r) => manifest.relatedFsliRemap[r]).map((r) => `${r} → ${manifest.relatedFsliRemap[r]}`).join(', ')}.`
        : null,
      linked.linked.length ? `C3 ${linked.linked.length} line-item references linked to their pages (self-references kept as text: ${linked.selfRefs.length}).` : null,
      byRule('C3').length ? `C3 file references made site links or removed: ${byRule('C3').reduce((n, a) => n + a.count, 0)}.` : null,
      byRule('C4').length ? `C4 local paths removed or replaced by the document title: ${byRule('C4').reduce((n, a) => n + a.count, 0)}.` : null,
    ].filter(Boolean).join(' ');

    const row = {
      slug,
      title,
      snippet: deck,
      author: conv.str(s.fm, 'author'),
      date: conv.str(s.fm, 'date'),
      read_time: conv.str(s.fm, 'read_time'),
      fsli_slug: ownPage,
      phase: s.group === 'consolidation' ? 'consolidated-reporting' : null,
      topic: s.group === 'consolidation' ? slug : null,
      sort_order: s.group === 'consolidation' ? Number(conv.str(s.fm, 'series_part')) : 0,
      content,
      content_json: doc,
      presentation,
      change_summary: summary,
    };
    rows.push(row);

    const before = snapshot?.get(slug);
    const changes = before
      ? (['title', 'snippet', 'author', 'date', 'read_time', 'fsli_slug', 'phase', 'topic', 'sort_order', 'content', 'content_json', 'presentation'] as const)
          .filter((k) => !isDeepStrictEqual(before[k] ?? null, (row as Record<string, unknown>)[k] ?? null))
      : null;

    report.push({
      file: s.file,
      slug,
      url,
      action: snapshot ? (before ? (changes!.length ? 'update' : 'unchanged') : 'insert') : null,
      columns_changing: changes,
      tables: got.tables.length,
      formula_blocks: got.blockquotes,
      formula_paragraphs: got.quoteParagraphs,
      links: got.hrefs.length,
      slug_links: linked.linked.length,
      self_refs_kept: linked.selfRefs.length,
      corrections: corrected.applied,
      related_fsli: related,
      content_length: content.length,
      arithmetic_flags: conv.lintArithmetic(markdown),
      change_summary: summary,
    });
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    join(out, 'report.md'),
    [
      '| File | Slug | Action | Changing | Tables | Formula blocks | Links | Corrections | Arithmetic flags |',
      '|---|---|---|---|---|---|---|---|---|',
      ...report.map((r) =>
        `| ${r.file} | ${r.slug} | ${r.action ?? ''} | ${(r.columns_changing as string[] | null)?.join(', ') ?? ''} | ${r.tables} | ${r.formula_blocks} | ${r.links} | ${(r.corrections as unknown[]).length} | ${(r.arithmetic_flags as unknown[]).length} |`,
      ),
    ].join('\n') + '\n',
  );
  console.log(`checked ${report.length} essays: every correction, table, formula block, link, text and number check passed`);
  if (flag('--dry-run')) return;

  writeFileSync(join(out, 'payload.json'), JSON.stringify(rows));
  console.log(`wrote payload.json (${rows.length} rows)`);
  if (!flag('--apply')) return;

  const { ACCOUNTING_IMPORT_TOKEN: token, SUPABASE_URL: base, SUPABASE_KEY: key } = process.env;
  if (!token || !base || !key) throw new Error('ACCOUNTING_IMPORT_TOKEN, SUPABASE_URL and SUPABASE_KEY must be set');
  for (const row of rows) {
    const res = await fetch(`${base}/rest/v1/rpc/_import_accounting_essays_20261012`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_token: token, p_rows: [row] }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${row.slug}: HTTP ${res.status} ${text.slice(0, 300)}`);
    console.log(text);
  }
}

// The schema's imports start a Supabase client whose timers would keep the
// process alive, so the outcome ends it.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
