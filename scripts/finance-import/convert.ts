/**
 * The finance "Fundamentals" import (owner brief of 24 Oct 2026): one markdown
 * file with YAML frontmatter → the curriculum stub it fills.
 *
 * Built on the accounting import (scripts/accounting-import/convert.ts): the
 * same frontmatter subset, the same markdown-it → TipTap path through the
 * app's own schema (`getSchemaExtensions`), the same text and number checks.
 * What this batch adds:
 *
 *   - ```latex fences become the editor's own `blockMath` node (the stored
 *     HTML is `<div data-type="block-math" data-latex="…">`, KaTeX renders it
 *     on the published page and in the editor), not a code block.
 *   - The opening "In brief" list moves to `presentation.key_takeaways`, as
 *     on the finance essays already published (the finance page prints the
 *     takeaways as end matter, so leaving them in the body prints them twice).
 *   - Each file is matched to a seeded curriculum stub by title, then slug,
 *     then curriculum code; the stub keeps its id and slug.
 *
 * Pure functions, no I/O; generateJSON/generateHTML need `window` and
 * `document` (import.ts and the unit test provide them).
 */
import MarkdownIt from 'markdown-it';
import type { JSONContent } from '@tiptap/core';
import {
  normaliseMarkdown,
  normaliseRendered,
  docText,
  numbersOf,
} from '../accounting-import/convert';

export {
  parseFrontmatter,
  str,
  stripHeader,
  keyTakeaways,
  htmlToDoc,
  docToHtml,
  docStats,
  docText,
  markdownStats,
  normaliseMarkdown,
  normaliseRendered,
  numbersOf,
  lintArithmetic,
} from '../accounting-import/convert';

// ---------------------------------------------------------------------------
// Markdown → HTML, with display math
// ---------------------------------------------------------------------------

const md = new MarkdownIt('default', { html: false, linkify: false, typographer: false });
const defaultFence = md.renderer.rules.fence!;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim() === 'latex') {
    // The shape BlockMath parses (and serialize.ts writes): the source in
    // data-latex, no children. md.utils.escapeHtml covers & < > ".
    return `<div data-type="block-math" data-latex="${md.utils.escapeHtml(token.content.trim())}"></div>\n`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export function markdownToHtml(markdown: string): string {
  return md.render(markdown);
}

/** Every ```latex fence's source, in order. Any other fence is refused. */
export function latexBlocks(markdown: string): string[] {
  const out: string[] = [];
  for (const t of md.parse(markdown, {})) {
    if (t.type !== 'fence') continue;
    if (t.info.trim() !== 'latex') throw new Error(`unexpected code fence "${t.info}"`);
    out.push(t.content.trim());
  }
  return out;
}

/** Every blockMath / inlineMath node's LaTeX, in order. */
export function docLatex(doc: JSONContent): { block: string[]; inline: string[]; codeBlocks: number } {
  const block: string[] = [];
  const inline: string[] = [];
  let codeBlocks = 0;
  const walk = (node: JSONContent) => {
    if (node.type === 'blockMath') block.push(String(node.attrs?.latex ?? ''));
    if (node.type === 'inlineMath') inline.push(String(node.attrs?.latex ?? ''));
    if (node.type === 'codeBlock') codeBlocks++;
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return { block, inline, codeBlocks };
}

/** The markdown with its latex fences removed: the prose a reader reads as text. */
export function withoutLatex(markdown: string): string {
  return markdown.replace(/^```latex\n[\s\S]*?\n```$/gm, '');
}

// ---------------------------------------------------------------------------
// Starred variables
// ---------------------------------------------------------------------------

/**
 * `V* = c / e` and `x_1* = …` name an optimum, and the star is literal; inside
 * `**bold**` markdown reads it as an emphasis delimiter and garbles the line.
 * A star right after a letter or digit and right before ` =` (or < > ≤ ≥) is
 * escaped. Returns the text and how many stars were escaped.
 */
export function escapeStarredVariables(markdown: string): { text: string; count: number } {
  let count = 0;
  const text = markdown.replace(/(?<=[A-Za-z0-9])\*(?= [=<>≤≥])/g, () => {
    count++;
    return '\\*';
  });
  return { text, count };
}

// ---------------------------------------------------------------------------
// In brief → presentation.key_takeaways
// ---------------------------------------------------------------------------

/** The body after the opening "In brief" list and the rule that closes it. */
export function stripInBrief(body: string): string {
  const m = /^\*\*In brief\*\*\n\n(?:- .*\n)+\n---\n\n/.exec(body);
  if (!m) throw new Error('body does not open with an "In brief" list closed by a rule');
  return body.slice(m[0].length);
}

// ---------------------------------------------------------------------------
// Reading time — the editor's own rule (WriterEditor calculateReadTime)
// ---------------------------------------------------------------------------

/** 200 words a minute over the body's text, rounded up, as the editor computes it. */
export function editorReadTime(plainText: string): string {
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return minutes < 1 ? '1 min read' : `${minutes} min read`;
}

// ---------------------------------------------------------------------------
// Stub matching
// ---------------------------------------------------------------------------

export interface Stub {
  id: string;
  slug: string;
  title: string;
  code: string | null;
  module_slug: string;
  finance_order: number | null;
  section: string | null;
}

export interface Match {
  stub: Stub;
  by: 'title' | 'slug' | 'code';
}

const comparable = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The module slug a frontmatter `module` names ("T1-M05 Firm …" → "t1-m05"). */
export function moduleSlugOf(module: string): string {
  const m = /^(T\d+-[A-Z]*M?\d+[A-Z]?)\b/.exec(module.trim());
  if (!m) throw new Error(`unreadable module "${module}"`);
  return m[1].toLowerCase();
}

/** The stub's curriculum code for a frontmatter code ("fu-05-03" → "ff-05-03"). */
export function stubCodeOf(code: string): string {
  const m = /^fu-(\d{2})-(\d{2})$/.exec(code);
  if (!m) throw new Error(`unreadable code "${code}"`);
  return `ff-${m[1]}-${m[2]}`;
}

/**
 * Title (the stub's title before its deck colon), then slug, then curriculum
 * code, each only among the finance stubs. Two stubs at one step is refused,
 * never guessed; none at all returns null (a new row).
 */
export function matchStub(
  input: { title: string; slug: string; code: string },
  stubs: readonly Stub[],
): Match | null {
  const finance = stubs.filter((s) => s.section === 'finance');
  const steps: Array<[Match['by'], (s: Stub) => boolean]> = [
    ['title', (s) => comparable(s.title.split(': ')[0]) === comparable(input.title) || comparable(s.title) === comparable(input.title)],
    ['slug', (s) => s.slug === input.slug],
    ['code', (s) => s.code === stubCodeOf(input.code)],
  ];
  for (const [by, test] of steps) {
    const hits = finance.filter(test);
    if (hits.length > 1) throw new Error(`"${input.title}": ${hits.length} stubs match by ${by}`);
    if (hits.length === 1) return { stub: hits[0], by };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Verification helpers
// ---------------------------------------------------------------------------

/** The reader's text of the markdown equals the document's, word for word. */
export function textDifference(markdown: string, doc: JSONContent): string | null {
  // A literal (escaped) star survives into the text; every other star is markup.
  const STAR = '\u2217';
  const fromMarkdown = normaliseMarkdown(withoutLatex(markdown).replace(/\\\*/g, STAR));
  const fromDoc = normaliseRendered(docText(doc).replace(/\*/g, STAR));
  if (fromMarkdown === fromDoc) {
    const a = numbersOf(fromMarkdown);
    const b = numbersOf(fromDoc);
    return a.join(' ') === b.join(' ') ? null : 'numbers differ';
  }
  let i = 0;
  while (i < fromMarkdown.length && fromMarkdown[i] === fromDoc[i]) i++;
  return `"${fromMarkdown.slice(Math.max(0, i - 40), i + 40)}" vs "${fromDoc.slice(Math.max(0, i - 40), i + 40)}"`;
}
