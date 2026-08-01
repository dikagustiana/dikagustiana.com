/**
 * Essay presentation payload — deck, references, key takeaways, hero caption,
 * author bio.
 *
 * History worth knowing before touching this: the same payload used to live in
 * four columns named after personas (`manager_fields`, `economist_fields`,
 * `educator_fields`, `coach_fields`), with `voice_role` nominally selecting
 * which one was live. Three were always NULL, and the read path never actually
 * switched on `voice_role` — every essay page read `economist_fields`
 * directly. The four collapsed into a single `presentation` column on
 * 2026-08-01.
 *
 * Note this is NOT the "tone fields" schema that also used the persona names
 * (coreQuestion / whyHappening / whoBenefits / …). That was a separate,
 * never-populated design; it was deleted with the persona system. The shape
 * below is what has always been in the database.
 */

/** A reference entry. Legacy rows may store a bare string instead of an object. */
export type PresentationReference = string | { label: string; url?: string };

export interface EssayPresentation {
  deck?: string;
  key_takeaways?: string[];
  references?: PresentationReference[];
  hero_caption?: string;
  author_bio?: string;
}

/**
 * A row that may carry either the new column or one of the legacy ones.
 * Every field is optional so callers can pass their own narrower row types.
 */
export interface PresentationSource {
  presentation?: EssayPresentation | null;
  /** @deprecated legacy column, retained until the follow-up drop migration */
  economist_fields?: EssayPresentation | null;
  /** @deprecated legacy column, never populated */
  manager_fields?: EssayPresentation | null;
  /** @deprecated legacy column, never populated */
  educator_fields?: EssayPresentation | null;
  /** @deprecated legacy column, never populated */
  coach_fields?: EssayPresentation | null;
}

/**
 * Resolve the presentation payload for an essay.
 *
 * `presentation` wins. The legacy columns are consulted only when it is null,
 * which is deliberate belt-and-braces for the window between this change and
 * the migration that drops them: a row the backfill somehow missed still
 * renders its references rather than silently losing them.
 *
 * When the legacy columns are dropped, delete the fallback chain and the
 * `@deprecated` fields above — nothing else needs to change.
 */
export function resolvePresentation(row: PresentationSource | null | undefined): EssayPresentation {
  if (!row) return {};
  return (
    row.presentation ??
    row.economist_fields ??
    row.manager_fields ??
    row.educator_fields ??
    row.coach_fields ??
    {}
  );
}

/** The columns an essay query must select for `resolvePresentation` to work. */
export const PRESENTATION_COLUMNS = 'presentation, economist_fields';
