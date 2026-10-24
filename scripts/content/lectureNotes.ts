/**
 * Removing the lecture-notes source from the essays (site cleanup 2026-10, PRD §C, WP3): the pure part,
 * with no I/O, so tests/unit/lectureNotesStrip.test.ts can run it.
 *
 * The essays hold one document twice: `content_json` (the TipTap document the Writer Studio edits) and
 * `content` (its HTML, which the public pages render). The edits work on the document; the HTML is then
 * generated from it with the app's own schema, as the editor's getHTML() does, so the two stay one document
 * (C5). Every essay row in production had content === generateHTML(content_json) before this change.
 *
 * The edits are the owner's to approve (Gate B): scripts/content/lecture-notes-edits.json, one entry per
 * essay slug, each edit one of
 *
 *   { "find": "…", "replace": "…" }   the text, which must occur exactly once in the essay's paragraphs and
 *                                     headings, becomes the replacement; marks (italic, links) outside the
 *                                     span are kept, and the replacement takes the marks of the text where
 *                                     the span starts
 *   { "deleteBlock": "…" }           the list item (or, outside a list, the paragraph) whose text holds this,
 *                                     exactly once, is removed; an emptied list goes with it
 *   { "field": "presentation", "find": "…", "replace": "…" }
 *                                     the same, in a string of the essay's `presentation` JSON (its key
 *                                     takeaways and deck), which some pages print
 *
 * The references are an ordered list under the "References" heading; the body cites them as "ref. N". When
 * an item before N is removed, every "ref. N" in the essay is renumbered (C2, R3). A citation of a removed
 * item is refused: the sentence must be rewritten by an edit first. "essay NN, ref. N" names another
 * essay's list and is left to an explicit edit; it is reported.
 */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface DocNode {
  type: string;
  text?: string;
  attrs?: Record<string, Json>;
  marks?: { type: string; attrs?: Record<string, Json> }[];
  content?: DocNode[];
}

export type Edit =
  | { find: string; replace: string; field?: 'content' | 'presentation'; note?: string }
  | { deleteBlock: string; note?: string };

export interface EssayEdits {
  slug: string;
  edits: Edit[];
}

/** What must be gone from every essay after the change (PRD §6, C). */
export const HARD_PATTERNS: readonly RegExp[] = [/lecture note/i, /Rumpun Akuntansi/i, /AKL\s*[–-]\s*Chapter/i];
/** What may still point at the notes and is listed for a human to read (C3). */
export const SOFT_PATTERNS: readonly RegExp[] = [
  /\bAKL\b/,
  /this page follows/i,
  /\bthe notes\b(?!\s+to\b)/i,
  /\bthe notes'/i,
  /\bnotes (?:say|cite|give|state|use|run|cover|credit|accrue|treat|stack|handle|advise|measure)\b/i,
  /\bInter(?:mediate)? ?2\s*[–-]\s*Chapter/i,
  /\bNOTES\b/,
];

const TEXTBLOCKS = new Set(['paragraph', 'heading', 'codeBlock']);

export function textOf(node: DocNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(textOf).join('');
}

/** Every textblock in document order, with the chain of its ancestors. */
function textblocks(doc: DocNode): { node: DocNode; path: DocNode[] }[] {
  const out: { node: DocNode; path: DocNode[] }[] = [];
  const walk = (n: DocNode, path: DocNode[]) => {
    if (TEXTBLOCKS.has(n.type)) {
      out.push({ node: n, path });
      return;
    }
    for (const c of n.content ?? []) walk(c, [...path, n]);
  };
  walk(doc, []);
  return out;
}

function count(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + 1)) n++;
  return n;
}

export class EditError extends Error {}

/**
 * Replaces [from, to) of a textblock's text with `text`. Text nodes wholly inside the span go; the node
 * where the span starts keeps its marks and takes the replacement; the rest of the node where it ends stays.
 */
export function spliceBlock(block: DocNode, from: number, to: number, text: string): void {
  const kids = block.content ?? [];
  const out: DocNode[] = [];
  let pos = 0;
  let placed = false;
  for (const k of kids) {
    const len = k.type === 'text' ? (k.text ?? '').length : k.type === 'hardBreak' ? 1 : textOf(k).length;
    const start = pos;
    const end = pos + len;
    pos = end;
    if (end <= from || start >= to) {
      // Outside the span. An empty span (an insertion) lands at the start of the node at `from`.
      if (from === to && !placed && start === from && text) {
        out.push({ type: 'text', text, ...(k.marks ? { marks: k.marks } : {}) });
        placed = true;
      }
      out.push(k);
      continue;
    }
    if (k.type !== 'text') {
      // A non-text inline node inside the span is removed; the replacement goes into a text node.
      if (!placed && text) {
        out.push({ type: 'text', text });
        placed = true;
      }
      continue;
    }
    const t = k.text ?? '';
    const before = t.slice(0, Math.max(0, from - start));
    const after = t.slice(Math.min(len, to - start));
    const mid = placed ? '' : text;
    placed = true;
    const merged = before + mid + after;
    if (merged) out.push({ ...k, text: merged });
  }
  if (!placed && text) out.push({ type: 'text', text });
  // Adjacent text nodes with the same marks are joined, as ProseMirror would.
  const joined: DocNode[] = [];
  for (const n of out) {
    const last = joined[joined.length - 1];
    if (last && last.type === 'text' && n.type === 'text' && JSON.stringify(last.marks ?? []) === JSON.stringify(n.marks ?? [])) {
      joined[joined.length - 1] = { ...last, text: (last.text ?? '') + (n.text ?? '') };
    } else joined.push(n);
  }
  if (joined.length) block.content = joined;
  else delete block.content;
}

/** The one textblock holding `needle`, and where; throws when there is none or more than one. */
function locate(doc: DocNode, needle: string, slug: string) {
  const hits: { node: DocNode; path: DocNode[]; at: number }[] = [];
  for (const b of textblocks(doc)) {
    const t = textOf(b.node);
    const n = count(t, needle);
    if (n > 1) throw new EditError(`${slug}: "${needle.slice(0, 80)}" occurs ${n} times in one paragraph`);
    if (n === 1) hits.push({ ...b, at: t.indexOf(needle) });
  }
  if (hits.length !== 1) throw new EditError(`${slug}: "${needle.slice(0, 80)}" found ${hits.length} times (must be exactly once)`);
  return hits[0];
}

function removeChild(parent: DocNode, child: DocNode): void {
  parent.content = (parent.content ?? []).filter((c) => c !== child);
}

/** Removes the list item holding the block, or the block itself; a list left empty goes too. */
function deleteAt(doc: DocNode, hit: { node: DocNode; path: DocNode[] }): DocNode {
  const chain = [...hit.path, hit.node];
  let i = chain.length - 1;
  while (i > 0 && chain[i].type !== 'listItem') i--;
  const target = i > 0 && chain[i].type === 'listItem' ? i : chain.length - 1;
  const removed = chain[target];
  removeChild(chain[target - 1], removed);
  for (let j = target - 1; j > 0; j--) {
    const n = chain[j];
    if ((n.content ?? []).length) break;
    if (['orderedList', 'bulletList', 'blockquote'].includes(n.type)) removeChild(chain[j - 1], n);
    else break;
  }
  void doc;
  return removed;
}

/** The ordered list under the "References" heading: the last such heading in the document. */
export function referencesList(doc: DocNode): DocNode | null {
  const top = doc.content ?? [];
  for (let i = top.length - 1; i >= 0; i--) {
    const n = top[i];
    if (n.type === 'heading' && /^references$/i.test(textOf(n).trim())) {
      for (let j = i + 1; j < top.length; j++) {
        if (top[j].type === 'orderedList') return top[j];
        if (top[j].type === 'heading') return null;
      }
      return null;
    }
  }
  return null;
}

export interface CitationChange {
  before: string;
  after: string;
  context: string;
}

export interface EssayResult {
  doc: DocNode;
  presentation: Json;
  /** The reference list as it was and is, each item's text, numbered from 1. */
  referencesBefore: string[];
  referencesAfter: string[];
  /** Old number → new number; null for a removed item. */
  renumber: Map<number, number | null>;
  citations: CitationChange[];
  /** Textblocks changed: their text before and after (null when removed). */
  blocks: { before: string; after: string | null; note?: string }[];
  /** Cross-essay citations ("essay NN, ref. N") left as they are. */
  crossRefs: string[];
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Applies one essay's edits, then renumbers its "ref. N" citations. Throws EditError on any doubt. */
export function applyEdits(slug: string, docIn: DocNode, presentationIn: Json, edits: Edit[]): EssayResult {
  const doc = clone(docIn);
  let presentation = clone(presentationIn);
  const refs = referencesList(doc);
  const originalItems = refs ? [...(refs.content ?? [])] : [];
  const referencesBefore = originalItems.map((n) => textOf(n).trim());
  if (refs && refs.attrs && refs.attrs.start !== undefined && refs.attrs.start !== 1 && refs.attrs.start !== null) {
    throw new EditError(`${slug}: the references list starts at ${String(refs.attrs.start)}, not 1`);
  }

  const blocks: EssayResult['blocks'] = [];
  for (const e of edits) {
    if ('deleteBlock' in e) {
      const hit = locate(doc, e.deleteBlock, slug);
      const removed = deleteAt(doc, hit);
      blocks.push({ before: textOf(removed).trim(), after: null, note: e.note });
      continue;
    }
    if (e.field === 'presentation') {
      let n = 0;
      const walk = (v: Json): Json => {
        if (typeof v === 'string') {
          const c = count(v, e.find);
          if (!c) return v;
          n += c;
          blocks.push({ before: `[presentation] ${v}`, after: `[presentation] ${v.split(e.find).join(e.replace)}`, note: e.note });
          return v.split(e.find).join(e.replace);
        }
        if (Array.isArray(v)) return v.map(walk);
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
        return v;
      };
      presentation = walk(presentation);
      if (n !== 1) throw new EditError(`${slug}: presentation "${e.find.slice(0, 80)}" found ${n} times (must be exactly once)`);
      continue;
    }
    const hit = locate(doc, e.find, slug);
    const before = textOf(hit.node);
    spliceBlock(hit.node, hit.at, hit.at + e.find.length, e.replace);
    const after = textOf(hit.node);
    if (after !== before.slice(0, hit.at) + e.replace + before.slice(hit.at + e.find.length)) {
      throw new EditError(`${slug}: replacing "${e.find.slice(0, 60)}" did not give the expected text`);
    }
    // A paragraph left empty by an edit is removed (with its list item).
    if (!after.trim()) {
      deleteAt(doc, hit);
      blocks.push({ before: before.trim(), after: null, note: e.note });
    } else blocks.push({ before: before.trim(), after: after.trim(), note: e.note });
  }

  // Renumbering: where each original item now stands.
  const now = refs ? refs.content ?? [] : [];
  const renumber = new Map<number, number | null>();
  originalItems.forEach((item, i) => {
    const at = now.indexOf(item);
    renumber.set(i + 1, at < 0 ? null : at + 1);
  });
  const referencesAfter = now.map((n) => textOf(n).trim());

  for (const blk of textblocks(doc)) {
    const m = /\brefs\.\s?\d/i.exec(textOf(blk.node));
    if (m) throw new EditError(`${slug}: a plural citation ("${m[0]}…") is not renumbered by this script; rewrite it with an edit`);
  }
  const citations: CitationChange[] = [];
  const crossRefs: string[] = [];
  const changed = [...renumber].some(([a, b]) => a !== b);
  const CITE = /(essay\s+\d+,\s*)?\bref\.\s?(\d+)\b/gi;
  for (const b of textblocks(doc)) {
    const kids = b.node.content ?? [];
    for (const k of kids) {
      if (k.type !== 'text' || !k.text) continue;
      const block = textOf(b.node);
      k.text = k.text.replace(CITE, (m: string, other: string | undefined, num: string) => {
        if (other) {
          crossRefs.push(`${m} — "${block.slice(0, 160)}"`);
          return m;
        }
        const n = Number(num);
        if (!renumber.has(n)) throw new EditError(`${slug}: "${m}" cites no item of the references list (${originalItems.length} items)`);
        const to = renumber.get(n);
        if (to === null) throw new EditError(`${slug}: "${m}" cites the removed item ${n}; rewrite that sentence with an edit`);
        if (!changed || to === n) return m;
        const out = m.replace(num, String(to));
        citations.push({ before: m, after: out, context: block.slice(Math.max(0, block.indexOf(m) - 100), block.indexOf(m) + m.length + 20) });
        return out;
      });
    }
  }
  return { doc, presentation, referencesBefore, referencesAfter, renumber, citations, blocks, crossRefs };
}

/** Every pattern of `list` found in a string, with a little context. */
export function findPatterns(text: string, list: readonly RegExp[]): string[] {
  const out: string[] = [];
  for (const p of list) {
    const g = new RegExp(p.source, p.flags.includes('g') ? p.flags : `${p.flags}g`);
    for (const m of text.matchAll(g)) out.push(`${p.source}: …${text.slice(Math.max(0, (m.index ?? 0) - 80), (m.index ?? 0) + m[0].length + 80).replace(/\s+/g, ' ')}…`);
  }
  return out;
}

/** The text a reader can see of a row: the document's text, its HTML's text and its presentation's strings. */
export function searchableText(row: { content: string | null; content_json: Json; presentation?: Json }): string {
  return [row.content ?? '', JSON.stringify(row.content_json ?? null), JSON.stringify(row.presentation ?? null)].join('\n');
}

/**
 * Every "ref. N" resolves to an item of the references list and the list has no gaps (R3). Returns the
 * problems; empty when the essay is sound.
 */
export function citationProblems(doc: DocNode): string[] {
  const refs = referencesList(doc);
  const total = refs ? (refs.content ?? []).length : 0;
  const out: string[] = [];
  for (const b of textblocks(doc)) {
    for (const m of textOf(b.node).matchAll(/(essay\s+\d+,\s*)?\bref\.\s?(\d+)\b/gi)) {
      if (m[1]) continue;
      const n = Number(m[2]);
      if (n < 1 || n > total) out.push(`"${m[0]}" but the references list has ${total} items`);
    }
  }
  if (refs && (refs.content ?? []).some((n) => n.type !== 'listItem')) out.push('the references list holds something other than list items');
  return out;
}
