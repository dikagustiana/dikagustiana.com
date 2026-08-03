/**
 * Revision / autosave core.
 *
 * Pure functions only — no Supabase, no React — so the decision logic that
 * protects unsaved work is unit-testable without a database.
 *
 * The safety model (writing-layout-spec §2, Phase 2):
 *   - Typing debounces into an `autosave` row in `essay_revisions`. The essays
 *     row is NOT touched; autosave is a backup, not a publish.
 *   - Consecutive autosaves inside one writing burst roll up into the SAME
 *     revision row instead of appending one per keystroke-pause, so history
 *     stays readable and the table stays bounded.
 *   - On load, a newer autosave than the essays row is OFFERED, never applied
 *     silently — neither side is overwritten without the author choosing.
 */

import type { JSONContent } from '@tiptap/core';

/** Quiet period after the last keystroke before an autosave fires. */
export const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Within this window an autosave overwrites the revision it wrote last instead
 * of appending a new one, so a long writing session yields roughly one
 * revision per minute rather than one per pause.
 */
export const REVISION_ROLLUP_MS = 60_000;

export type RevisionChangeType =
  | 'create'
  | 'autosave'
  | 'manual_save'
  | 'publish'
  | 'unpublish'
  | 'rollback'
  | 'migration'
  | 'brief_autosave'
  | 'brief_manual_save';

/**
 * Which body a revision row describes. Brief revisions share the table and
 * the content_json column with long-body revisions, namespaced by
 * change_type (docs/DECISIONS.md, "Brief revisions coexist…"). Every reader
 * MUST scope to one body: a long-body recovery probe that picked up a
 * `brief_autosave` row would offer to replace the 26,000-character essay
 * with its 600-word Brief.
 */
export type RevisionBody = 'long' | 'brief';

export const BRIEF_CHANGE_TYPES: readonly string[] = ['brief_autosave', 'brief_manual_save'];

/** The change types belonging to a body — the filter every reader applies. */
export function changeTypesForBody(body: RevisionBody): readonly string[] {
  return body === 'brief'
    ? BRIEF_CHANGE_TYPES
    : ['create', 'autosave', 'manual_save', 'publish', 'unpublish', 'rollback', 'migration'];
}

/** The autosave change type for a body (rollup compares against this). */
export function autosaveTypeForBody(body: RevisionBody): RevisionChangeType {
  return body === 'brief' ? 'brief_autosave' : 'autosave';
}

/** The subset of an `essay_revisions` row the decision logic needs. */
export interface RevisionSummary {
  id: string;
  revision_no: number;
  change_type: string;
  created_at: string;
  content_json: unknown;
  title: string | null;
}

// ---------------------------------------------------------------------------
// Canonical comparison
// ---------------------------------------------------------------------------

/**
 * Stringify with object keys sorted, so two structurally equal documents
 * compare equal regardless of key order.
 *
 * This is not cosmetic. `content_json` is stored as `jsonb`, and Postgres
 * jsonb does not preserve key order (it orders by key length, then bytes). A
 * plain JSON.stringify comparison between what the editor holds and what the
 * database returned would therefore report "different" on every load and make
 * the recovery prompt fire constantly. Array order IS preserved — document
 * order is meaningful.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** True when two TipTap documents differ in content (key order ignored). */
export function docsDiffer(a: unknown, b: unknown): boolean {
  if (!a && !b) return false;
  return canonicalJson(a ?? null) !== canonicalJson(b ?? null);
}

/** True for a document with no meaningful content (never worth autosaving). */
export function isEmptyDoc(doc: JSONContent | null | undefined): boolean {
  if (!doc || !doc.content || doc.content.length === 0) return true;
  return doc.content.every(
    node => node.type === 'paragraph' && (!node.content || node.content.length === 0),
  );
}

// ---------------------------------------------------------------------------
// Write decisions
// ---------------------------------------------------------------------------

/**
 * Silent autosave is only safe once the essay row exists and carries the fields
 * the DB requires (`essays.category_id` is a NOT NULL FK). For a brand-new
 * essay the author saves manually once; autosave takes over after that. This
 * keeps autosave from spamming failed inserts or hijacking focus with a
 * create-redirect mid-keystroke.
 *
 * Ported from the WriterStudio stack, which was the only editor that had it.
 */
export function canAutosave(state: {
  essayId: string | null;
  title: string;
  sectionId: string;
  categoryId: string;
}): boolean {
  return (
    !!state.essayId &&
    state.title.trim().length > 0 &&
    !!state.sectionId &&
    !!state.categoryId
  );
}

/**
 * Whether this autosave should overwrite the revision we wrote last rather
 * than appending a new one.
 *
 * Requires the candidate to be OUR row (`ownRevisionId`) — rolling up a row
 * this session did not write would silently destroy another tab's backup, and
 * a page reload deliberately starts a fresh revision so the pre-reload state
 * stays recoverable.
 *
 * `autosaveType` scopes the check to one body's autosave kind — a Brief
 * autosave must never roll up a long-body row or vice versa, even if the id
 * bookkeeping were somehow confused.
 */
export function shouldRollUpRevision(
  latest: RevisionSummary | null,
  ownRevisionId: string | null,
  nowMs: number,
  autosaveType: RevisionChangeType = 'autosave',
): boolean {
  if (!latest || !ownRevisionId) return false;
  if (latest.id !== ownRevisionId) return false;
  if (latest.change_type !== autosaveType) return false;
  const age = nowMs - new Date(latest.created_at).getTime();
  return Number.isFinite(age) && age >= 0 && age < REVISION_ROLLUP_MS;
}

/** Monotonic revision number for the next row. */
export function nextRevisionNo(latest: RevisionSummary | null): number {
  return (latest?.revision_no ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// Recovery decision
// ---------------------------------------------------------------------------

export interface RecoveryCandidate {
  revision: RevisionSummary;
  /** ISO timestamp of the revision, for the prompt. */
  savedAt: string;
}

/**
 * Decide whether to OFFER recovery when opening an essay.
 *
 * Offered only when an autosaved backup exists whose body differs from what
 * the essays row holds. That is exactly the "the tab died before Save" case.
 * A matching backup means the last save captured everything and there is
 * nothing to recover. Recovery is never applied automatically.
 *
 * `latest` must already be the newest revision OF THIS BODY (the caller
 * queries with the body filter); `autosaveType` is the second fence — a row
 * of the other body's kind can never become a candidate here.
 */
export function findRecoveryCandidate(
  latest: RevisionSummary | null,
  essayDoc: unknown,
  autosaveType: RevisionChangeType = 'autosave',
): RecoveryCandidate | null {
  if (!latest) return null;
  if (latest.change_type !== autosaveType) return null;
  if (!latest.content_json) return null;
  if (!docsDiffer(latest.content_json, essayDoc)) return null;
  return { revision: latest, savedAt: latest.created_at };
}
