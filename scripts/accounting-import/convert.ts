/**
 * The accounting essay import (owner brief of 12 Oct 2026): one markdown file
 * with YAML frontmatter → the essay row the site stores.
 *
 * `content` is the HTML the editor itself writes (TipTap `getHTML()`, which is
 * `generateHTML` over the same schema) and `content_json` is the document it
 * was serialised from, so the published page (which reads `content`) and the
 * Writer Studio (which reads `content_json` first) hold one document, as every
 * essay saved through the studio does. The schema is the app's own
 * (`getSchemaExtensions`), never a second list.
 *
 * Pure functions, no I/O: `import.ts` reads the files and talks to the
 * database; tests/unit/accountingImport.test.ts runs these under jsdom.
 * generateJSON/generateHTML need `window` and `document`.
 */
import MarkdownIt from 'markdown-it';
import { generateHTML, generateJSON, type JSONContent } from '@tiptap/core';
import { getSchemaExtensions } from '@/lib/tiptap/extensions';

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

export type FrontmatterValue = string | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return v;
}

/**
 * The YAML subset the batch uses: `key: scalar`, `key: "quoted"`,
 * `key: [a, b]` and `key:` followed by `  - item` lines. Anything else throws,
 * so a file written another way is refused, not half-read.
 */
export function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error('no frontmatter block');
  const fm: Frontmatter = {};
  let listKey: string | null = null;
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) throw new Error(`list item outside a list: ${line}`);
      (fm[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`unreadable frontmatter line: ${line}`);
    const [, key, raw] = kv;
    if (raw === '') {
      fm[key] = [];
      listKey = key;
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      fm[key] = raw.slice(1, -1).split(',').map((s) => unquote(s)).filter(Boolean);
      listKey = null;
    } else {
      fm[key] = unquote(raw);
      listKey = null;
    }
  }
  return { fm, body: text.slice(match[0].length) };
}

export function str(fm: Frontmatter, key: string): string {
  const v = fm[key];
  if (typeof v !== 'string' || !v) throw new Error(`frontmatter: ${key} missing`);
  return v;
}

export function list(fm: Frontmatter, key: string): string[] {
  const v = fm[key];
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new Error(`frontmatter: ${key} is not a list`);
  return v;
}

/**
 * The body opens with `# <title>` and `*<deck>*`, which the row carries as
 * `title` and `snippet` (the existing drafts and published essays start at
 * "In brief"). Both must match the frontmatter, so a stale heading is caught
 * rather than silently dropped.
 */
export function stripHeader(body: string, title: string, deck: string): string {
  const rest = body.replace(/^\n+/, '');
  const heading = `# ${title}\n\n*${deck}*\n\n`;
  if (!rest.startsWith(heading)) {
    throw new Error('body does not open with the frontmatter title and deck');
  }
  return rest.slice(heading.length);
}

// ---------------------------------------------------------------------------
// Corrections (corrections.json)
// ---------------------------------------------------------------------------

export interface CorrectionEntry {
  rule: string;
  find: string;
  replace: string;
  count?: number;
}

export interface CorrectionManifest {
  relatedFsliRemap: Record<string, string>;
  global: CorrectionEntry[];
  files: Record<string, CorrectionEntry[]>;
}

export interface AppliedCorrection {
  rule: string;
  find: string;
  replace: string;
  count: number;
}

function occurrences(text: string, find: string): number {
  return find ? text.split(find).length - 1 : 0;
}

/** {K1}..{K6} and {fsli:<slug>} in a replacement become site paths. */
export function fillPlaceholders(text: string, paths: Record<string, string>): string {
  return text
    .replace(/\{(K[1-6])\}/g, (_, k: string) => {
      const p = paths[k];
      if (!p) throw new Error(`no path for ${k}`);
      return p;
    })
    .replace(/\{fsli:([a-z0-9-]+)\}/g, (_, slug: string) => `/accounting/fsli/${slug}`);
}

export function applyCorrections(
  file: string,
  text: string,
  manifest: CorrectionManifest,
  paths: Record<string, string>,
): { text: string; applied: AppliedCorrection[] } {
  const applied: AppliedCorrection[] = [];
  let out = text;
  for (const entry of manifest.files[file] ?? []) {
    const n = occurrences(out, entry.find);
    if (n !== (entry.count ?? 1)) {
      throw new Error(`${file}: "${entry.find}" matched ${n} times, expected ${entry.count ?? 1}`);
    }
    const replace = fillPlaceholders(entry.replace, paths);
    out = out.split(entry.find).join(replace);
    applied.push({ rule: entry.rule, find: entry.find, replace, count: n });
  }
  for (const entry of manifest.global) {
    const n = occurrences(out, entry.find);
    if (n === 0) continue;
    out = out.split(entry.find).join(entry.replace);
    applied.push({ rule: entry.rule, find: entry.find, replace: entry.replace, count: n });
  }
  return { text: out, applied };
}

/** related_fsli (Group C) after the owner's remap, without duplicates. */
export function remapRelated(slugs: string[], remap: Record<string, string>): string[] {
  const out: string[] = [];
  for (const s of slugs) {
    const t = remap[s] ?? s;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Slug references → site links (C3)
// ---------------------------------------------------------------------------

/**
 * A code span naming a line item (`inventories-net`) becomes a link to the
 * page whose essay covers it: the slug itself when an essay has that
 * fsli_slug, else the essay whose `also_covers` lists it. A reference to the
 * page it is written on ("covered on this page") stays as written. The link
 * text is the slug as written; TipTap's code mark excludes every other mark, so
 * a linked slug cannot also keep its code styling.
 */
export function linkSlugs(
  text: string,
  ownPage: string | null,
  resolve: (slug: string) => string | null,
): { text: string; linked: string[]; selfRefs: string[] } {
  const linked: string[] = [];
  const selfRefs: string[] = [];
  const out = text.replace(/`([a-z0-9]+(?:-[a-z0-9]+)+|[a-z]+)`/g, (whole, slug: string) => {
    const page = resolve(slug);
    if (!page) return whole;
    if (page === ownPage) {
      selfRefs.push(slug);
      return whole;
    }
    linked.push(slug);
    return `[${slug}](/accounting/fsli/${page})`;
  });
  return { text: out, linked, selfRefs };
}

// ---------------------------------------------------------------------------
// Markdown → TipTap document → HTML
// ---------------------------------------------------------------------------

const md = new MarkdownIt('default', { html: false, linkify: false, typographer: false });

export function markdownToHtml(markdown: string): string {
  return md.render(markdown);
}

export function markdownStats(markdown: string) {
  const tokens = md.parse(markdown, {});
  const tables: Array<{ rows: number; cols: number }> = [];
  let blockquotes = 0;
  let quoteParagraphs = 0;
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'blockquote_open') {
      if (depth === 0) blockquotes++;
      depth++;
    } else if (t.type === 'blockquote_close') depth--;
    else if (t.type === 'paragraph_open' && depth > 0) quoteParagraphs++;
    else if (t.type === 'table_open') {
      let rows = 0;
      let cols = 0;
      for (let j = i + 1; j < tokens.length && tokens[j].type !== 'table_close'; j++) {
        if (tokens[j].type === 'tr_open') rows++;
        if (rows === 1 && (tokens[j].type === 'th_open' || tokens[j].type === 'td_open')) cols++;
      }
      tables.push({ rows, cols });
    }
  }
  return { tables, blockquotes, quoteParagraphs };
}

export function htmlToDoc(html: string): JSONContent {
  return generateJSON(html, getSchemaExtensions()) as JSONContent;
}

export function docToHtml(doc: JSONContent): string {
  return generateHTML(doc, getSchemaExtensions());
}

export function docStats(doc: JSONContent) {
  const tables: Array<{ rows: number; cols: number }> = [];
  let blockquotes = 0;
  let quoteParagraphs = 0;
  const hrefs: string[] = [];
  const walk = (node: JSONContent, inQuote: boolean) => {
    if (node.type === 'table') {
      const rows = node.content ?? [];
      tables.push({ rows: rows.length, cols: rows[0]?.content?.length ?? 0 });
    }
    if (node.type === 'blockquote') blockquotes++;
    if (node.type === 'paragraph' && inQuote) quoteParagraphs++;
    for (const mark of node.marks ?? []) {
      if (mark.type === 'link') hrefs.push(String(mark.attrs?.href ?? ''));
    }
    for (const child of node.content ?? []) walk(child, inQuote || node.type === 'blockquote');
  };
  walk(doc, false);
  return { tables, blockquotes, quoteParagraphs, hrefs };
}

/** The readable text of a document, blocks separated by newlines. */
export function docText(doc: JSONContent): string {
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === 'text') {
      parts.push(node.text ?? '');
      return;
    }
    if (node.type === 'hardBreak') parts.push('\n');
    for (const child of node.content ?? []) walk(child);
    if (node.type && /^(paragraph|heading|tableCell|tableHeader|listItem|horizontalRule)$/.test(node.type)) {
      parts.push('\n');
    }
  };
  walk(doc);
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Text normalisation and numbers (verification)
// ---------------------------------------------------------------------------

/**
 * Markdown reduced to the words a reader sees: markup, link targets, list and
 * quote markers gone, whitespace collapsed, typographic quotes unified. Equal
 * to `normaliseRendered` of the same prose rendered.
 */
export function normaliseMarkdown(text: string): string {
  return normaliseRendered(
    text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // a link reads as its text
      .replace(/^[ \t]*\|?[ \t:|-]*-{3,}[ \t:|-]*$/gm, ' ') // table separator rows and rules
      .replace(/^[ \t]*>[ \t]?/gm, '') // quote markers
      .replace(/^[ \t]*(?:[-*]|\d+\.)[ \t]+/gm, '') // list markers (before headings: "## 1. Title" keeps its 1.)
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, '') // heading markers
      .replace(/[*`]/g, '') // emphasis and code markers
      .replace(/^[ \t]*\|.*$/gm, (row) => row.replace(/\|/g, ' ')) // table cell borders (a | in prose stays)
      .replace(/\\([\\`*_{}[\]()#+\-.!>|])/g, '$1'), // markdown escapes
  );
}

/** Rendered text (a document's text, a page's innerText) for comparison. */
export function normaliseRendered(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every number in order, as written (thousands separators kept). */
export function numbersOf(text: string): string[] {
  return text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
}

/** a − b as multisets of strings: what a has that b does not, with multiplicity. */
export function multisetMinus(a: readonly string[], b: readonly string[]): string[] {
  const left = new Map<string, number>();
  for (const x of b) left.set(x, (left.get(x) ?? 0) + 1);
  const out: string[] = [];
  for (const x of a) {
    const n = left.get(x) ?? 0;
    if (n > 0) left.set(x, n - 1);
    else out.push(x);
  }
  return out;
}

// ---------------------------------------------------------------------------
// In brief → presentation.key_takeaways
// ---------------------------------------------------------------------------

function plainInline(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function keyTakeaways(body: string): string[] {
  const m = /^\*\*In brief\*\*\n\n([\s\S]*?)\n\n---\n/.exec(body);
  if (!m) throw new Error('no "In brief" block before the first rule');
  return m[1]
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => plainInline(l.slice(2)));
}

// ---------------------------------------------------------------------------
// Arithmetic lint (reported, never fixed)
// ---------------------------------------------------------------------------

function evalArithmetic(expr: string): number | null {
  const src = expr
    .replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    .trim();
  if (!src || !/^[\d\s.+\-*/()]+$/.test(src)) return null;
  try {
    // Only digits, operators, points and parentheses reach here (checked above).
    const value = Function(`"use strict"; return (${src});`)() as unknown;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** The arithmetic at the start of a side of an equation, words dropped. */
function leadingArithmetic(side: string, fromEnd: boolean): string {
  const text = side.trim();
  const pattern = /[−\-(]?[\d(][\d,.\s+\-−×÷*/()%]*/g;
  const runs = text.match(pattern) ?? [];
  const pick = fromEnd ? runs[runs.length - 1] : runs[0];
  if (!pick) return '';
  // The run must touch the side's end (left side) or start (right side).
  if (fromEnd && !text.trimEnd().endsWith(pick.trimEnd())) return '';
  if (!fromEnd && !text.startsWith(pick.trimStart())) return '';
  return pick.trim().replace(/[\s,.(]+$/, '');
}

/**
 * Every `x = y` inside the formula blocks where both sides are arithmetic
 * (`a × b = c`, and each step of `a = b = c`): a difference beyond rounding
 * at the precision the right side is written to is reported. Reported only:
 * the import never changes a figure.
 */
export function lintArithmetic(markdown: string): string[] {
  const issues: string[] = [];
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('>')) continue;
    for (const segment of line.slice(1).split(/;\s+/)) {
      const sides = segment.split(' = ');
      for (let i = 0; i + 1 < sides.length; i++) {
        const leftExpr = leadingArithmetic(sides[i], true);
        const rightExpr = leadingArithmetic(sides[i + 1], false);
        if (!/[+\-−×÷*/]/.test(leftExpr.replace(/^[−-]/, '')) && !/[+\-−×÷*/]/.test(rightExpr.replace(/^[−-]/, ''))) continue;
        const left = evalArithmetic(leftExpr);
        const right = evalArithmetic(rightExpr);
        if (left === null || right === null) continue;
        // A right side written as a single figure sets the precision.
        const literal = /^[−-]?\d[\d,]*(\.\d+)?%?$/.test(rightExpr);
        const decimals = literal ? (rightExpr.replace(/%$/, '').split('.')[1] ?? '').length : 2;
        const scale = rightExpr.endsWith('%') ? 100 : 1;
        const unit = 10 ** -decimals / scale;
        const tolerance = decimals > 0 ? 0.505 * unit : Math.max(unit, Math.abs(right) * 0.0005);
        if (Math.abs(left - right) > tolerance) {
          issues.push(`${segment.trim()}  [left ${Number((left * scale).toFixed(4))}, written ${Number((right * scale).toFixed(4))}]`);
        }
      }
    }
  }
  return issues;
}
