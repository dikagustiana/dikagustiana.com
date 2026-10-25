/**
 * Import the finance "Fundamentals" essays 01–15 (owner brief of 24 Oct 2026)
 * into the curriculum stubs of modules T1-M01 … T1-M06, and publish them.
 *
 *   npx vite-node scripts/finance-import/import.ts -- --src <dir> --stubs <json> --out <dir> [--dry-run]
 *
 * <dir> holds NN-*.md. <json> is the finance stubs as the database holds
 * them, one object per essay with a module:
 *   select e.id, e.slug, e.title, e.code, e.section, e.finance_order,
 *          m.slug as module_slug, m.id as module_id
 *     from essays e join finance_modules m on m.id = e.module_id
 *    where e.section = 'finance';
 * The sources and the output stay out of the repo, as the accounting
 * import's do.
 *
 * Every run converts and checks each file and refuses the whole batch on the
 * first failure: a body that does not open with its title, deck and "In
 * brief", a table, formula block or display equation lost in conversion, a
 * text or number difference, an HTML ↔ JSON round trip that is not stable, a
 * stub matched twice, or a stub whose module or place disagrees with the
 * file's frontmatter. It writes report.json and report.md.
 *
 *   --dry-run   stops there.
 *   (default)   also writes payload.json (the rows) and sql/NN-<slug>.sql:
 *               one statement per essay. A matched stub is updated by id
 *               (its id and slug are kept), only within section 'finance'
 *               and only when a column differs; an unmatched file is
 *               inserted by slug. Either way a `migration` revision records
 *               the change, and an unchanged row writes nothing, so a re-run
 *               is a no-op. Data writes in this repo go through the Supabase
 *               MCP or psql: the script holds no key and sends nothing.
 *
 * The row is stored the way the Writer Studio stores a publish: `content` is
 * the HTML (generateHTML over the app's schema, which is the editor's
 * getHTML()), `content_json` is the document it was serialised from,
 * `read_time` is the editor's own 200-words-a-minute count over that HTML,
 * placement is derived from the module (phase, topic, finance_section) as
 * the editor's save derives it, and status is 'published'.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { JSDOM } from 'jsdom';

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

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

/** WriterEditor's TRACK_TO_PHASE for the one track this batch places into. */
const TRACK = 'fundamentals';
const PHASE = 'fundamentals';

type StubRow = import('./convert').Stub & { module_id: string };

async function main() {
  const conv = await import('./convert');
  const src = arg('--src');
  const out = arg('--out');
  const stubsPath = arg('--stubs');
  if (!src || !out || !stubsPath) throw new Error('--src, --stubs and --out are required');
  mkdirSync(out, { recursive: true });
  const stubs = JSON.parse(readFileSync(stubsPath, 'utf8')) as StubRow[];
  const moduleIds = new Map(stubs.map((s) => [s.module_slug, s.module_id]));

  const files = readdirSync(src).filter((f) => /^\d{2}-.*\.md$/.test(f)).sort();
  const rows: Array<Record<string, unknown>> = [];
  const report: Array<Record<string, unknown>> = [];
  const claimed = new Set<string>();

  for (const file of files) {
    const text = readFileSync(join(src, file), 'utf8').replace(/\r\n?/g, '\n');
    const { fm, body } = conv.parseFrontmatter(text);
    const title = conv.str(fm, 'title');
    const deck = conv.str(fm, 'deck');
    const fmSlug = conv.str(fm, 'slug');
    const code = conv.str(fm, 'code');
    const moduleSlug = conv.moduleSlugOf(conv.str(fm, 'module'));
    if (conv.str(fm, 'track') !== 'Fundamentals') throw new Error(`${file}: track is not Fundamentals`);
    const order = Number(code.slice(-2));

    const afterHeader = conv.stripHeader(body, title, deck);
    const takeaways = conv.keyTakeaways(afterHeader);
    if (takeaways.length < 3) throw new Error(`${file}: ${takeaways.length} takeaways; the publish gate wants 3`);
    const starred = conv.escapeStarredVariables(conv.stripInBrief(afterHeader));
    const markdown = starred.text;

    const html = conv.markdownToHtml(markdown);
    const doc = conv.htmlToDoc(html);
    const content = conv.docToHtml(doc);
    if (!isDeepStrictEqual(conv.htmlToDoc(content), doc)) throw new Error(`${file}: HTML ↔ JSON round trip is not stable`);

    // Structure survived: tables cell for cell, quote blocks, every equation.
    const want = conv.markdownStats(markdown);
    const got = conv.docStats(doc);
    if (!isDeepStrictEqual(want.tables, got.tables)) throw new Error(`${file}: tables ${JSON.stringify(want.tables)} became ${JSON.stringify(got.tables)}`);
    if (want.blockquotes !== got.blockquotes || want.quoteParagraphs !== got.quoteParagraphs) {
      throw new Error(`${file}: formula blocks ${want.blockquotes}/${want.quoteParagraphs} became ${got.blockquotes}/${got.quoteParagraphs}`);
    }
    const latex = conv.latexBlocks(markdown);
    const math = conv.docLatex(doc);
    if (!isDeepStrictEqual(latex, math.block)) throw new Error(`${file}: display equations changed in conversion`);
    if (math.codeBlocks) throw new Error(`${file}: ${math.codeBlocks} code blocks left`);
    const textDiff = conv.textDifference(markdown, doc);
    if (textDiff) throw new Error(`${file}: text differs at ${textDiff}`);
    const headings = (markdown.match(/^#{2,6} /gm) ?? []).length;
    const docHeadings = (doc.content ?? []).filter((n) => n.type === 'heading').length;
    if (headings !== docHeadings) throw new Error(`${file}: ${headings} headings became ${docHeadings}`);
    if (/^# /m.test(markdown)) throw new Error(`${file}: a second H1 in the body`);

    // Placement: matched stub, or a new row in the frontmatter's module.
    const match = conv.matchStub({ title, slug: fmSlug, code }, stubs);
    if (match) {
      if (claimed.has(match.stub.id)) throw new Error(`${file}: stub ${match.stub.slug} already claimed`);
      claimed.add(match.stub.id);
      if (match.stub.module_slug !== moduleSlug) throw new Error(`${file}: matched stub sits in ${match.stub.module_slug}, file says ${moduleSlug}`);
      if (match.stub.finance_order !== order) throw new Error(`${file}: matched stub is #${match.stub.finance_order}, file says #${order}`);
    }
    const moduleId = moduleIds.get(moduleSlug);
    if (!moduleId) throw new Error(`${file}: no module ${moduleSlug}`);
    const slug = match ? match.stub.slug : fmSlug;

    const presentation = {
      deck,
      genre: null,
      author_bio: null,
      references: [],
      hero_caption: null,
      key_takeaways: takeaways,
      revision_note: null,
    };
    const plain = new dom.window.DOMParser().parseFromString(content, 'text/html').body.textContent ?? '';
    const columns = {
      title,
      snippet: deck,
      author: conv.str(fm, 'author'),
      date: conv.str(fm, 'date'),
      read_time: conv.editorReadTime(plain),
      content,
      content_json: doc,
      presentation,
      section: 'finance',
      phase: PHASE,
      topic: moduleSlug,
      finance_section: TRACK,
      module_id: moduleId,
      finance_order: order,
      lesson_type: 'concept',
      voice_role: 'economist',
      status: 'published',
      published: true,
    };
    const summary =
      `Imported and published from the Fundamentals batch of 24 Oct 2026 (${file}, ${conv.str(fm, 'status')}). ` +
      `${match ? `Filled stub ${match.stub.code} (matched by ${match.by}).` : 'New row.'} ` +
      `In brief → key takeaways; ${latex.length} display equations as math blocks` +
      `${starred.count ? `; ${starred.count} starred variables (V*, x_1*) escaped so the star prints` : ''}.`;
    rows.push({ file, id: match?.stub.id ?? null, slug, columns, change_summary: summary });

    report.push({
      file,
      title,
      slug,
      url: `/finance/${TRACK}/${slug}`,
      stub: match ? { id: match.stub.id, code: match.stub.code, by: match.by, stub_title: match.stub.title } : 'NEW',
      module: moduleSlug,
      order,
      words: plain.trim().split(/\s+/).filter(Boolean).length,
      read_time: columns.read_time,
      source_read_time: fm.read_time ?? null,
      headings: docHeadings,
      tables: got.tables.length,
      formula_blocks: got.blockquotes,
      equations: latex.length,
      links: got.hrefs.length,
      takeaways: takeaways.length,
      starred_escaped: starred.count,
      content_length: content.length,
      arithmetic_flags: conv.lintArithmetic(markdown),
    });
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    join(out, 'report.md'),
    [
      '| File | Slug | Stub | Module | # | Words | Read time | Headings | Tables | Formula blocks | Equations | Links |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|',
      ...report.map((r) => {
        const stub = r.stub === 'NEW' ? 'NEW' : `${(r.stub as { code: string }).code} (${(r.stub as { by: string }).by})`;
        return `| ${r.file} | ${r.slug} | ${stub} | ${r.module} | ${r.order} | ${r.words} | ${r.read_time} | ${r.headings} | ${r.tables} | ${r.formula_blocks} | ${r.equations} | ${r.links} |`;
      }),
    ].join('\n') + '\n',
  );
  console.log(`checked ${report.length} essays: every heading, table, formula block, equation, text and number check passed`);
  if (flag('--dry-run')) return;

  writeFileSync(join(out, 'payload.json'), JSON.stringify(rows));
  mkdirSync(join(out, 'sql'), { recursive: true });
  rows.forEach((row) => {
    writeFileSync(join(out, 'sql', `${String(row.file).slice(0, 2)}-${row.slug}.sql`), upsertSql(row));
  });
  console.log(`wrote payload.json and sql/ (${rows.length} rows)`);
}

/** A dollar-quoted literal, refused if the text could close it early. */
function literal(text: string, tag: string): string {
  if (text.includes(`$${tag}$`)) throw new Error(`text contains $${tag}$`);
  return `$${tag}$${text}$${tag}$`;
}
const quoted = (v: unknown) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const COLUMNS = [
  'title', 'snippet', 'author', 'date', 'read_time', 'content', 'content_json', 'presentation',
  'section', 'phase', 'topic', 'finance_section', 'module_id', 'finance_order', 'lesson_type',
  'voice_role', 'status', 'published',
] as const;

function value(column: (typeof COLUMNS)[number], v: unknown): string {
  switch (column) {
    case 'content':
      return literal(String(v), 'c');
    case 'content_json':
      return `${literal(JSON.stringify(v), 'j')}::jsonb`;
    case 'presentation':
      return `${literal(JSON.stringify(v), 'p')}::jsonb`;
    case 'title':
    case 'snippet':
      return literal(String(v), column === 'title' ? 't' : 's');
    case 'module_id':
      return `${quoted(v)}::uuid`;
    case 'finance_order':
      return String(Number(v));
    case 'lesson_type':
      return `${quoted(v)}::public.lesson_type_enum`;
    case 'status':
      return `${quoted(v)}::public.content_status_enum`;
    case 'published':
      return v ? 'true' : 'false';
    default:
      return quoted(v);
  }
}

/**
 * One essay: update the matched stub by id (slug and section checked too),
 * or insert by slug; only when a column differs, and then one `migration`
 * revision carrying the document. No row back means nothing changed.
 */
function upsertSql(row: Record<string, unknown>): string {
  const cols = row.columns as Record<string, unknown>;
  const src = `src as (select ${COLUMNS.map((c) => `${value(c, cols[c])} as ${c}`).join(',\n  ')})`;
  const tuple = (alias: string) => `(${COLUMNS.map((c) => `${alias}.${c}`).join(', ')})`;
  const write = row.id
    ? `up as (
  update public.essays e set ${COLUMNS.map((c) => `${c} = src.${c}`).join(', ')}
    from src
   where e.id = ${quoted(row.id)}::uuid and e.slug = ${quoted(row.slug)} and e.section = 'finance'
     and ${tuple('e')} is distinct from ${tuple('src')}
  returning e.id, e.title, e.snippet, e.status, false as inserted
)`
    : `up as (
  insert into public.essays as e (slug, ${COLUMNS.join(', ')})
  select ${quoted(row.slug)}, ${COLUMNS.map((c) => `src.${c}`).join(', ')} from src
  on conflict on constraint essays_slug_key do update set
    ${COLUMNS.map((c) => `${c} = excluded.${c}`).join(', ')}
  where e.section = 'finance' and ${tuple('e')} is distinct from ${tuple('excluded')}
  returning e.id, e.title, e.snippet, e.status, (e.xmax = 0) as inserted
)`;
  return `with ${src},
${write},
rev as (
  insert into public.essay_revisions (essay_id, revision_no, change_type, title, snippet, content_json, status, change_summary, changed_by)
  select up.id, coalesce((select max(x.revision_no) from public.essay_revisions x where x.essay_id = up.id), 0) + 1, 'migration',
         up.title, up.snippet, src.content_json, up.status, ${literal(String(row.change_summary), 'm')}, null
    from up, src
  returning essay_id, revision_no
)
select up.id, up.inserted, rev.revision_no from up join rev on rev.essay_id = up.id;
`;
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
