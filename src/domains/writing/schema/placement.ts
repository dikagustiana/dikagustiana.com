/**
 * Pure essay-placement logic.
 *
 * One source of truth that maps an editor's section/category/module/leaf
 * selections to (a) the DB fields written on the essay and (b) the public URL the
 * essay will resolve to. Keeping both in one tested module prevents the
 * "saved fields don't match how the public page queries" class of bug, and lets us
 * verify "placement -> correct route" without rendering the whole editor.
 *
 * See docs/CONTENT_MODEL.md for the per-section resolution rules.
 */

export interface PlacementInput {
  /** Slug of the selected section, e.g. "finance", "accounting". */
  sectionSlug: string;
  /** Slug of the selected category (used to derive `phase`). */
  categorySlug?: string | null;
  /** The essay slug. */
  slug: string;
  /** Finance: selected module's track slug + slug (for the URL) and its id (for the FK). */
  moduleId?: string | null;
  moduleTrackSlug?: string | null;
  moduleSlug?: string | null;
  financeSection?: string | null;
  financeOrder?: number | null;
  lessonType?: string | null;
  /** Accounting: FSLI line-item slug or consolidation topic slug. */
  fsliSlug?: string | null;
  topic?: string | null;
}

/** DB fields written onto the essay row to place it in the hierarchy. */
export interface PlacementFields {
  section: string;
  phase: string | null;
  module_id: string | null;
  finance_section: string | null;
  finance_order: number | null;
  lesson_type: string | null;
  fsli_slug: string | null;
  topic: string | null;
}

/** Derive a phase value from a category slug by stripping the section prefix. */
export function derivePhase(sectionSlug: string, categorySlug?: string | null): string | null {
  if (!categorySlug) return null;
  const prefix = `${sectionSlug}-`;
  if (categorySlug.startsWith(prefix)) return categorySlug.slice(prefix.length);
  return categorySlug;
}

/**
 * Compute the DB placement fields for an essay. Fields irrelevant to the chosen
 * section are nulled so changing a section never leaves stale cross-section data
 * (e.g. a finance `module_id` lingering on a green-transition essay).
 */
export function resolvePlacementFields(input: PlacementInput): PlacementFields {
  const section = input.sectionSlug;
  const isFinance = section === 'finance';
  const isAccounting = section === 'accounting';

  return {
    section,
    phase: derivePhase(section, input.categorySlug),
    module_id: isFinance ? input.moduleId ?? null : null,
    finance_section: isFinance ? input.financeSection || null : null,
    finance_order: isFinance ? input.financeOrder ?? null : null,
    lesson_type: isFinance ? input.lessonType || null : null,
    fsli_slug: isAccounting ? input.fsliSlug || null : null,
    topic: isAccounting ? input.topic || null : null,
  };
}

/**
 * Build the public URL the essay will resolve to, matching exactly how each
 * section's routes/nav are constructed in `App.tsx` and the public pages.
 * Returns "" when the essay is not yet reachable from any nav (e.g. an accounting
 * essay with neither an FSLI line item nor a consolidation topic selected).
 */
export function buildCanonicalUrl(input: PlacementInput): string {
  const { sectionSlug, slug } = input;
  if (!slug) return '';

  switch (sectionSlug) {
    case 'finance': {
      // Three segments — the module is navigation, not part of the address.
      const track = input.moduleTrackSlug || input.financeSection;
      if (track) return `/finance/${track}/${slug}`;
      return `/essays/${slug}`;
    }
    case 'accounting': {
      if (input.fsliSlug) return `/accounting/fsli/${input.fsliSlug}`;
      if (input.topic) return `/accounting/consolidation/${input.topic}`;
      return '';
    }
    case 'green-transition': {
      const phase = derivePhase(sectionSlug, input.categorySlug) || 'general';
      return `/green-transition/${phase}/${slug}`;
    }
    case 'development-finance': {
      const phase = derivePhase(sectionSlug, input.categorySlug) || 'general';
      return `/development-finance/${phase}/${slug}`;
    }
    case 'critical-thinking': {
      const phase = derivePhase(sectionSlug, input.categorySlug) || 'clarify';
      return `/critical-thinking-research/${phase}/${slug}`;
    }
    case 'next-big-thing': {
      // Kept in lockstep with src/lib/essayUrl.ts: the theme (category slug
      // minus the section prefix, cached as essays.phase) is the third
      // segment; without one the two-segment resolver route still works.
      const phase = derivePhase(sectionSlug, input.categorySlug);
      return phase ? `/the-next-big-thing/${phase}/${slug}` : `/the-next-big-thing/${slug}`;
    }
    default:
      return `/${sectionSlug}/${slug}`;
  }
}

/** True when the section requires an extra leaf selection to be reachable from nav. */
export function isReachable(input: PlacementInput): boolean {
  return buildCanonicalUrl(input) !== '';
}
