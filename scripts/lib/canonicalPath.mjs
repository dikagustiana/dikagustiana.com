/**
 * The prerender's canonical-path mapper — the single shared copy.
 *
 * This is a mirror of essayUrl's canonical mapping (src/lib/essayUrl.ts,
 * route-table-tested in the app), plus one distinction essayUrl does not
 * need to make: whether the canonical URL belongs to THIS ESSAY ALONE.
 *
 * Accounting essays canonicalise to PAGE-level surfaces —
 * /accounting/fsli/:slug, /accounting/consolidation/:topic,
 * /accounting/statutory-reporting — which inline several essays. Writing one
 * essay's og:title there would make an arbitrary essay speak for the whole
 * page (last writer wins), and writing it at /essays/:slug instead would
 * advertise a doorway that redirects. Both are wrong, so those rows are
 * SKIPPED (null) and named in the prerender's log rather than silently
 * mishandled. Giving those pages their own page-level cards is separate work
 * on a separate object. The consolidation series is the exception: each of
 * its essays is placed on a topic of its own, so that page is the essay's.
 *
 * Parity with essayUrl is asserted per-branch in
 * tests/unit/canonicalPathParity.test.ts — a drift here ships a wrong
 * og:url/canonical silently.
 *
 * @param {{ slug: string, section: string | null, phase: string | null,
 *            finance_section: string | null, fsli_slug: string | null,
 *            topic: string | null,
 *            finance_modules?: { track_slug?: string | null } | null }} row
 * @returns {string | null} the path to pre-render, or null to skip the row
 */
export function canonicalPath(row) {
  const mod = row.finance_modules ?? null;
  const track = mod?.track_slug ?? row.finance_section ?? null;
  switch (row.section) {
    case 'finance':
      return track ? `/finance/${track}/${row.slug}` : `/essays/${row.slug}`;
    case 'green-transition': {
      const short = { 'where-we-are-now': 'now', 'challenges-ahead': 'gaps', 'pathways-forward': 'future' };
      return row.phase ? `/green-transition/${short[row.phase] ?? row.phase}/${row.slug}` : `/essays/${row.slug}`;
    }
    case 'next-big-thing':
      // Theme (the category, cached as phase) is the third segment; a
      // theme-less essay keeps the two-segment resolver shape, which renders
      // it directly. Mirrors essayUrl's next-big-thing branch.
      return row.phase ? `/the-next-big-thing/${row.phase}/${row.slug}` : `/the-next-big-thing/${row.slug}`;
    case 'critical-thinking':
    case 'critical-thinking-research':
      // Foundations of Knowing; mirrors essayUrl's critical-thinking branch.
      return row.phase ? `/foundations-of-knowing/${row.phase}/${row.slug}` : `/essays/${row.slug}`;
    case 'accounting':
      // One exception: an essay of the consolidation series sits on a topic
      // of its own (topic = its slug), so /accounting/consolidation/<slug>
      // is that essay's page alone (ConsolidationDetail renders it as the
      // essay) and its card is the essay's to write.
      if (row.phase === 'consolidated-reporting' && row.topic && row.topic === row.slug && !row.fsli_slug) {
        return `/accounting/consolidation/${row.slug}`;
      }
      // Page-level canonical: not this essay's URL to claim. See above.
      if (row.fsli_slug || row.topic || row.phase === 'statutory-reporting') return null;
      return `/essays/${row.slug}`;
    default:
      return `/essays/${row.slug}`;
  }
}
