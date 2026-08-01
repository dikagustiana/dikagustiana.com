/**
 * The single canonical essay URL builder.
 *
 * There used to be four of these — Index.tsx, About.tsx, WriterList.tsx and
 * AdminContent.tsx — and they disagreed. Two of them fell through to
 * `/essays/${slug}`, which was not a route, so every homepage card 404'd. That
 * shipped past typecheck, build and tests, because none of those can tell you
 * whether a string matches a route.
 *
 * Rules for changing this file:
 *   1. Every branch must correspond to a real `<Route path=...>` in App.tsx.
 *      A URL that looks plausible is worth nothing.
 *   2. Never invent a fallback shape. If placement cannot produce a canonical
 *      URL, return the universal `/essays/:slug` route, which exists and
 *      resolves — or `null` when there is not even a slug, in which case the
 *      caller must render the card as non-clickable rather than as a dead link.
 *   3. tests/unit/essayUrl.test.ts asserts every branch against the route list.
 *      Add a case there when you add a branch.
 */

/**
 * Placement fields needed to build a canonical URL. Deliberately loose — the
 * various queries select different subsets — but a finance curriculum essay
 * needs BOTH `track` and `moduleSlug`, which do not live on the essays row
 * (`module_slug` comes from a join on finance_modules). A query feeding this
 * must select them; that is why `useFeaturedEssays` joins the module.
 */
export interface EssayUrlInput {
  slug: string | null | undefined;
  section?: string | null;
  phase?: string | null;
  /** finance track — `finance_section` on the row, or `track_slug` on the joined module */
  track?: string | null;
  /** finance_modules.slug for the owning module */
  moduleSlug?: string | null;
  fsliSlug?: string | null;
  topic?: string | null;
}

/**
 * Green Transition stores long phase slugs but the readable routes use short
 * ones. Both resolve (`/green-transition/:phase/:slug` matches anything and
 * the page accepts either spelling), so this is about canonical form, not
 * reachability.
 */
const GREEN_TRANSITION_PHASE: Record<string, string> = {
  'where-we-are-now': 'now',
  'challenges-ahead': 'gaps',
  'pathways-forward': 'future',
};

/**
 * The universal fallback route. Every published essay is reachable here even
 * with no placement at all; `/essays/:slug` redirects to the canonical URL when
 * one exists and renders the essay itself when one does not.
 */
export function universalEssayUrl(slug: string): string {
  return `/essays/${slug}`;
}

/**
 * Build the canonical public URL for an essay.
 *
 * Returns `null` only when there is no slug to build from. Callers must treat
 * `null` as "not a link" — never as "use some other path".
 */
export function essayUrl(essay: EssayUrlInput): string | null {
  const slug = essay.slug?.trim();
  if (!slug) return null;

  const section = essay.section ?? '';
  const phase = essay.phase ?? '';

  switch (section) {
    case 'finance': {
      // Curriculum lessons live four segments deep. Both parts are required —
      // a track without a module (or vice versa) does not match the route, so
      // fall through to the universal route rather than emit a broken path.
      if (essay.track && essay.moduleSlug) {
        return `/finance/${essay.track}/${essay.moduleSlug}/${slug}`;
      }
      // Finance essays with no curriculum placement (e.g. site notes) have no
      // four-segment home. `/finance-101/essays/:slug` is NOT usable here: it
      // discards the slug and redirects to /finance, losing the essay.
      return universalEssayUrl(slug);
    }

    case 'green-transition': {
      if (!phase) return universalEssayUrl(slug);
      const p = GREEN_TRANSITION_PHASE[phase] ?? phase;
      return `/green-transition/${p}/${slug}`;
    }

    case 'development-finance':
      return phase
        ? `/development-finance/${phase}/${slug}`
        : universalEssayUrl(slug);

    case 'next-big-thing':
      return `/the-next-big-thing/${slug}`;

    case 'critical-thinking':
    case 'critical-thinking-research':
      // Route is /critical-thinking-research/:phase/:essayId
      return `/critical-thinking-research/${phase || 'clarify'}/${slug}`;

    case 'accounting': {
      // Accounting essays resolve to their FSLI or consolidation page rather
      // than to a per-essay route, because no per-essay accounting route exists.
      if (essay.fsliSlug) return `/accounting/fsli/${essay.fsliSlug}`;
      if (phase === 'consolidated-reporting' && essay.topic) {
        return `/accounting/consolidation/${essay.topic}`;
      }
      if (phase === 'statutory-reporting') return '/accounting/statutory-reporting';
      return universalEssayUrl(slug);
    }

    default:
      // Unknown section: the universal route still resolves it by slug.
      return universalEssayUrl(slug);
  }
}

/** Absolute URL, for the admin "View live" button and copy-to-clipboard. */
export function absoluteEssayUrl(essay: EssayUrlInput, origin?: string): string | null {
  const path = essayUrl(essay);
  if (!path) return null;
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${path}`;
}

/**
 * Normalise a database row (whatever shape the query produced) into
 * `EssayUrlInput`. Accepts the joined-module shapes the various queries return.
 */
export function essayUrlInputFromRow(row: {
  slug?: string | null;
  section?: string | null;
  phase?: string | null;
  finance_section?: string | null;
  fsli_slug?: string | null;
  topic?: string | null;
  module_slug?: string | null;
  finance_modules?: { slug?: string | null; track_slug?: string | null } | null;
}): EssayUrlInput {
  const mod = row.finance_modules ?? null;
  return {
    slug: row.slug,
    section: row.section,
    phase: row.phase,
    // finance_section is the row's own track; track_slug on the joined module
    // is the authoritative one when present.
    track: mod?.track_slug ?? row.finance_section ?? null,
    moduleSlug: mod?.slug ?? row.module_slug ?? null,
    fsliSlug: row.fsli_slug,
    topic: row.topic,
  };
}
