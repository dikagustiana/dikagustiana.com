/**
 * The Indonesian version's form fields ↔ its `essay_translations` row, and the
 * publish rule. Pure, so the writer's surface stays thin and these are tested
 * (tests/unit/translationForm.test.ts). docs/prd/essay-language/04-PENULIS.md.
 */

import type { TranslationPresentation } from './essayLanguage';

export interface TranslationForm {
  title: string;
  snippet: string;
  deck: string;
  /** One takeaway per line. */
  keyTakeaways: string;
  heroCaption: string;
  revisionNote: string;
  readTime: string;
}

interface RowLike {
  title?: string | null;
  snippet?: string | null;
  presentation?: unknown;
  read_time?: string | null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function translationFormFromRow(row: RowLike | null | undefined): TranslationForm {
  const p = (row?.presentation && typeof row.presentation === 'object' && !Array.isArray(row.presentation)
    ? row.presentation
    : {}) as Record<string, unknown>;
  return {
    title: str(row?.title),
    snippet: str(row?.snippet),
    deck: str(p.deck),
    keyTakeaways: Array.isArray(p.key_takeaways) ? (p.key_takeaways as unknown[]).map(str).join('\n') : '',
    heroCaption: str(p.hero_caption),
    revisionNote: str(p.revision_note),
    readTime: str(row?.read_time),
  };
}

/**
 * The translatable presentation keys, blank ones left out so the reader falls
 * back to English where the rules allow it (essayLanguage.localizeShellFields).
 * Null when nothing is set, so an untouched row stores NULL, not `{}`.
 */
export function presentationFromForm(form: TranslationForm): TranslationPresentation | null {
  const out: TranslationPresentation = {};
  if (form.deck.trim()) out.deck = form.deck.trim();
  const takeaways = form.keyTakeaways.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (takeaways.length) out.key_takeaways = takeaways;
  if (form.heroCaption.trim()) out.hero_caption = form.heroCaption.trim();
  if (form.revisionNote.trim()) out.revision_note = form.revisionNote.trim();
  return Object.keys(out).length ? out : null;
}

/**
 * Publishing needs: everything saved (a published version must be what is in
 * the row), a title, and at least one body. A Brief-only version may go live.
 */
export function canPublishTranslation(s: {
  saved: boolean;
  title: string;
  hasFull: boolean;
  hasBrief: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!s.saved) return { ok: false, reason: 'Save first: what goes live is what is saved.' };
  if (!s.title.trim()) return { ok: false, reason: 'The Indonesian title is required.' };
  if (!s.hasFull && !s.hasBrief) return { ok: false, reason: 'Write the Full text or the Brief first.' };
  return { ok: true };
}
