/**
 * Essay language — which of an essay's (up to) four bodies a reader sees.
 *
 * An essay has an English long body (always), an optional English Brief, and
 * an optional Indonesian translation (`essay_translations`, locale 'id') that
 * may carry a long body, a Brief, or both. The reader picks a language
 * (`EN · ID`) and a view (`Full · Brief`); this module decides what is
 * actually shown when the pick names a cell that does not exist.
 *
 * Pure functions only — no React, no Supabase — so every combination is
 * unit-testable (tests/unit/essayLanguage.test.ts). The article shells call
 * these; no page re-derives the rules. docs/prd/essay-language/02-BACA.md.
 *
 * Nothing here produces text. A translation is written by the owner.
 */

import type { JSONContent } from '@tiptap/core';
import { isEmptyBrief, parseBriefDoc } from './brief';
import { isEmptyDoc } from './revisions';
import type { EssayPresentation } from './presentation';

export type EssayLanguage = 'en' | 'id';
export type EssayView = 'full' | 'brief';

/** The translatable subset of `presentation`. References, genre, images stay the essay's. */
export type TranslationPresentation = Pick<
  EssayPresentation,
  'deck' | 'key_takeaways' | 'hero_caption' | 'revision_note'
>;

/** The fields of an `essay_translations` row the reader side uses. */
export interface EssayTranslation {
  essay_id: string;
  locale: string;
  title: string;
  snippet: string | null;
  content_json: unknown;
  brief_json: unknown;
  presentation: unknown;
  read_time: string | null;
  published: boolean;
}

/** Which cells exist for one essay. `en.full` always does. */
export interface EssayCells {
  en: { full: true; brief: boolean };
  /** null: no published Indonesian version. */
  id: { full: boolean; brief: boolean } | null;
}

export interface EssaySelection {
  language: EssayLanguage;
  view: EssayView;
}

/** `?lang=` → language. Only an exact `id` (any case) selects Indonesian. */
export function parseLanguageParam(value: string | null | undefined): EssayLanguage {
  return value?.trim().toLowerCase() === 'id' ? 'id' : 'en';
}

/** A jsonb body narrowed to a non-empty TipTap document, or null. */
export function parseBodyDoc(value: unknown): JSONContent | null {
  const doc = parseBriefDoc(value);
  return doc && !isEmptyDoc(doc) ? doc : null;
}

/** A jsonb Brief narrowed to a real Brief (same predicate as the English toggle), or null. */
function parseRealBrief(value: unknown): JSONContent | null {
  const doc = parseBriefDoc(value);
  return doc && !isEmptyBrief(doc) ? doc : null;
}

/**
 * The cells an essay has. A translation counts only when it is published and
 * holds at least one non-empty body; a row with only a title is not a version.
 */
export function essayCells(
  english: { hasBrief: boolean },
  translation: EssayTranslation | null | undefined,
): EssayCells {
  let id: EssayCells['id'] = null;
  if (translation && translation.published && translation.locale === 'id') {
    const full = parseBodyDoc(translation.content_json) != null;
    const brief = parseRealBrief(translation.brief_json) != null;
    if (full || brief) id = { full, brief };
  }
  return { en: { full: true, brief: english.hasBrief }, id };
}

export function availableLanguages(cells: EssayCells): EssayLanguage[] {
  return cells.id ? ['en', 'id'] : ['en'];
}

/** The views a language has, Full first. Two entries → the `Full · Brief` toggle renders. */
export function viewsFor(cells: EssayCells, language: EssayLanguage): EssayView[] {
  const c = language === 'id' ? cells.id : cells.en;
  if (!c) return [];
  const out: EssayView[] = [];
  if (c.full) out.push('full');
  if (c.brief) out.push('brief');
  return out;
}

/**
 * What is shown for a requested selection:
 *   1. a language the essay lacks falls back to English;
 *   2. the requested view, when that language has it;
 *   3. otherwise that language's other view.
 * English always has Full, so the result is never empty.
 */
export function resolveSelection(cells: EssayCells, wanted: EssaySelection): EssaySelection {
  const language: EssayLanguage = wanted.language === 'id' && cells.id ? 'id' : 'en';
  const views = viewsFor(cells, language);
  const view = views.includes(wanted.view) ? wanted.view : views[0];
  return { language, view };
}

/** The English values the article shell already renders. */
export interface EnglishShellFields {
  title: string;
  seoTitle: string;
  seoDescription?: string;
  deck?: string | null;
  keyTakeaways?: string[];
  heroCaption?: string | null;
  revisionNote?: string | null;
  readTime?: string | null;
}

export type LocalizedShellFields = EnglishShellFields;

function narrowPresentation(value: unknown): TranslationPresentation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as TranslationPresentation;
}

const filled = (s: string | null | undefined): s is string => !!s && s.trim().length > 0;

/**
 * The header and end-matter fields for a language.
 *
 * Indonesian: the title is the translation's (NOT NULL). Deck, hero caption,
 * revision note and read time fall back to English when left blank — an
 * English caption under an Indonesian essay is better than a missing one.
 * Key takeaways do NOT fall back: an English summary under an Indonesian body
 * reads as a mistake, so an untranslated list is hidden.
 */
export function localizeShellFields(
  english: EnglishShellFields,
  translation: EssayTranslation | null | undefined,
  language: EssayLanguage,
): LocalizedShellFields {
  if (language !== 'id' || !translation) return english;
  const p = narrowPresentation(translation.presentation);
  const takeaways = Array.isArray(p.key_takeaways) ? p.key_takeaways.filter(filled) : [];
  const deck = filled(p.deck) ? p.deck : filled(translation.snippet) ? translation.snippet : english.deck;
  return {
    title: translation.title,
    seoTitle: translation.title,
    seoDescription: filled(translation.snippet) ? translation.snippet : (deck ?? english.seoDescription) || undefined,
    deck,
    keyTakeaways: takeaways.length ? takeaways : undefined,
    heroCaption: filled(p.hero_caption) ? p.hero_caption : english.heroCaption,
    revisionNote: filled(p.revision_note) ? p.revision_note : english.revisionNote,
    readTime: filled(translation.read_time) ? translation.read_time : english.readTime,
  };
}

/**
 * The body for a resolved Indonesian selection, as the JSON string ArticleBody
 * takes (the same form the English Brief is passed in). Null when absent.
 */
export function translationBody(
  translation: EssayTranslation | null | undefined,
  view: EssayView,
): string | null {
  if (!translation) return null;
  const doc = view === 'brief' ? parseRealBrief(translation.brief_json) : parseBodyDoc(translation.content_json);
  return doc ? JSON.stringify(doc) : null;
}

/**
 * The only query a shared or canonical essay address keeps: `?lang=id` when
 * the reader is on the Indonesian version, nothing otherwise. Every other
 * parameter is dropped, as the canonical URL always has.
 */
export function languageQuery(search: string): string {
  return parseLanguageParam(new URLSearchParams(search).get('lang')) === 'id' ? '?lang=id' : '';
}

/**
 * The address of the same page in another language: `?lang=id` set or removed,
 * every other parameter and the fragment kept. English carries no parameter.
 */
export function withLanguageParam(search: string, language: EssayLanguage): string {
  const params = new URLSearchParams(search);
  if (language === 'id') params.set('lang', 'id');
  else params.delete('lang');
  const s = params.toString();
  return s ? `?${s}` : '';
}
