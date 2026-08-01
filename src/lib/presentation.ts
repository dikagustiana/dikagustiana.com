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
  /**
   * Declared by the admin preview but NOT populated by any write path — the
   * hero image lives in the `essays.thumbnail_url` column, not in this
   * payload. Kept optional so the type does not lie about what may appear in
   * older rows; read it with `?? row.thumbnail_url`, never on its own.
   */
  hero_image_url?: string;
}

/**
 * A row that may carry either the new column or one of the legacy ones.
 * Every field is optional so callers can pass their own narrower row types.
 */
export interface PresentationSource {
  presentation?: EssayPresentation | null;
}

/**
 * Resolve the presentation payload for an essay.
 *
 * The fallback chain to the four persona columns was removed when they were
 * dropped (migration 20260802000000). Selecting a dropped column is a hard
 * PostgREST error, not a silent null, so the selects had to be cleaned before
 * the drop rather than after.
 */
export function resolvePresentation(row: PresentationSource | null | undefined): EssayPresentation {
  return row?.presentation ?? {};
}

/** The columns an essay query must select for `resolvePresentation` to work. */
export const PRESENTATION_COLUMNS = 'presentation';
