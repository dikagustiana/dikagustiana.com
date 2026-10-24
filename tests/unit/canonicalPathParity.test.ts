/**
 * The prerender's canonical-path mapper and the app's essayUrl must never
 * drift: a divergence ships a wrong og:url/canonical in the raw crawler HTML
 * and no test in the build would notice (the prerender's read-back check only
 * proves pages it WROTE carry their tags).
 *
 * For every section: canonicalPath(row) === essayUrl(essayUrlInputFromRow(row)),
 * except accounting — where essayUrl returns the PAGE-level surface the essay
 * inlines into, and the prerender deliberately skips the row (null) rather
 * than claim a page-level URL for one essay.
 */
import { describe, it, expect } from 'vitest';
import { canonicalPath } from '../../scripts/lib/canonicalPath.mjs';
import { essayUrl, essayUrlInputFromRow } from '@/lib/essayUrl';

const row = (over: Record<string, unknown> = {}) => ({
  slug: 'my-essay',
  section: 'finance',
  phase: null,
  finance_section: null,
  fsli_slug: null,
  topic: null,
  finance_modules: null,
  ...over,
});

function expectParity(over: Record<string, unknown> = {}) {
  const r = row(over);
  expect(canonicalPath(r)).toBe(essayUrl(essayUrlInputFromRow(r)));
}

describe('canonicalPath ≡ essayUrl (non-accounting sections)', () => {
  it('finance with a joined module track', () => {
    expectParity({ finance_modules: { track_slug: 'analytics' }, slug: 'driver-tree-construction' });
    expect(canonicalPath(row({ finance_modules: { track_slug: 'analytics' }, slug: 'driver-tree-construction' })))
      .toBe('/finance/analytics/driver-tree-construction');
  });

  it('finance with the row-level track and without any track', () => {
    expectParity({ finance_section: 'fundamentals' });
    expectParity({}); // falls to the universal /essays/:slug on both sides
  });

  it('green-transition: long phases shorten, unknown phases pass through, no phase goes universal', () => {
    expectParity({ section: 'green-transition', phase: 'where-we-are-now' });
    expectParity({ section: 'green-transition', phase: 'challenges-ahead' });
    expectParity({ section: 'green-transition', phase: 'pathways-forward' });
    expectParity({ section: 'green-transition', phase: 'some-new-phase' });
    expectParity({ section: 'green-transition', phase: null });
    expect(canonicalPath(row({ section: 'green-transition', phase: 'where-we-are-now' })))
      .toBe('/green-transition/now/my-essay');
  });

  it('next-big-thing: theme and the two-segment resolver shape', () => {
    expectParity({ section: 'next-big-thing', phase: 'economy' });
    expectParity({ section: 'next-big-thing', phase: null });
    expect(canonicalPath(row({ section: 'next-big-thing', phase: null })))
      .toBe('/the-next-big-thing/my-essay');
  });

  it('critical-thinking: the part is the second segment; no part, the universal route', () => {
    expectParity({ section: 'critical-thinking', phase: 'knowing' });
    expectParity({ section: 'critical-thinking', phase: null });
    expectParity({ section: 'critical-thinking-research', phase: null });
    expect(canonicalPath(row({ section: 'critical-thinking', phase: 'knowing' })))
      .toBe('/foundations-of-knowing/knowing/my-essay');
  });

  it('unknown section: universal route on both sides', () => {
    expectParity({ section: 'something-else' });
  });
});

describe('accounting: page-level canonicals are SKIPPED, the rest match', () => {
  it('fsli, consolidation and statutory rows are skipped (null)', () => {
    expect(canonicalPath(row({ section: 'accounting', fsli_slug: 'cash-and-cash-equivalents' }))).toBeNull();
    expect(canonicalPath(row({ section: 'accounting', phase: 'consolidated-reporting', topic: 'nci' }))).toBeNull();
    expect(canonicalPath(row({ section: 'accounting', phase: 'statutory-reporting' }))).toBeNull();
  });

  it('the page-level URLs essayUrl builds are exactly the ones skipped', () => {
    expect(essayUrl(essayUrlInputFromRow(row({ section: 'accounting', fsli_slug: 'cash' }))))
      .toBe('/accounting/fsli/cash');
    expect(essayUrl(essayUrlInputFromRow(row({ section: 'accounting', phase: 'statutory-reporting' }))))
      .toBe('/accounting/statutory-reporting');
  });

  it('a consolidation-series essay, on a topic of its own, is its page: written, and in parity', () => {
    const series = { section: 'accounting', phase: 'consolidated-reporting', slug: 'consolidation-worksheet-elimination-entries', topic: 'consolidation-worksheet-elimination-entries' };
    expectParity(series);
    expect(canonicalPath(row(series))).toBe('/accounting/consolidation/consolidation-worksheet-elimination-entries');
    // A configured topic that inlines several essays stays skipped.
    expect(canonicalPath(row({ section: 'accounting', phase: 'consolidated-reporting', slug: 'nci-measurement', topic: 'nci' }))).toBeNull();
  });

  it('an accounting essay with no page-level placement goes universal on both sides', () => {
    expectParity({ section: 'accounting' });
    expect(canonicalPath(row({ section: 'accounting' }))).toBe('/essays/my-essay');
  });
});
