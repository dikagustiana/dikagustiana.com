/**
 * The Brief companion — core pure functions.
 *
 * A Brief is a second, optional body on an essay: 500–600 words of flowing
 * prose explaining the same thing the long essay explains, written by the
 * owner days after publication. It is a writing exercise (compression as a
 * test of understanding), which is why nothing in this module — or anywhere
 * else — generates, summarises or suggests Brief text. See
 * docs/DECISIONS.md, "The Brief companion".
 *
 * Storage: `essays.brief_json` (TipTap JSON, restricted schema — paragraphs,
 * bold, italic, links). No HTML mirror exists; the word count is derived
 * here, never stored, so it cannot go stale and the editor's live number and
 * the admin queue's number come from ONE function.
 */

import type { JSONContent } from '@tiptap/core';

/**
 * The target band, stated to the writer while writing. A target, not a gate:
 * nothing blocks saving outside it, and an essay leaves the Brief queue on
 * existence, not on landing inside the band (docs/DECISIONS.md, delegated
 * decision 3).
 */
export const BRIEF_TARGET_MIN = 500;
export const BRIEF_TARGET_MAX = 600;

/** All text inside a TipTap document, in document order. */
function collectText(node: JSONContent, out: string[]): void {
  if (node.type === 'text' && node.text) out.push(node.text);
  if (node.content) {
    for (const child of node.content) collectText(child, out);
    // Block boundaries separate words: two paragraphs must not glue their
    // last and first words together into one.
    out.push(' ');
  }
}

/**
 * Word count of a Brief document. Same tokenisation the long editor uses
 * (split on whitespace, drop empties), so the number means the same thing
 * on both surfaces.
 */
export function briefWordCount(doc: JSONContent | null | undefined): number {
  if (!doc) return 0;
  const parts: string[] = [];
  collectText(doc, parts);
  return parts.join(' ').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * True when the document holds no meaningful content. "A Brief exists" —
 * the public toggle's and the queue's shared predicate — is the negation of
 * this, so an accidentally-saved empty document never counts as a Brief.
 */
export function isEmptyBrief(doc: JSONContent | null | undefined): boolean {
  if (!doc || !doc.content || doc.content.length === 0) return true;
  return briefWordCount(doc) === 0;
}

/**
 * Narrow an essays-row `brief_json` value (typed Json by the generated
 * client) to a TipTap document, or null when absent/malformed. The one
 * boundary where the jsonb column becomes a typed document.
 */
export function parseBriefDoc(value: unknown): JSONContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const doc = value as JSONContent;
  if (doc.type !== 'doc') return null;
  return doc;
}

/** The queue/toggle predicate: a real Brief is present on this value. */
export function hasBrief(value: unknown): boolean {
  const doc = parseBriefDoc(value);
  return !!doc && !isEmptyBrief(doc);
}
