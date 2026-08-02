import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { essayUrl, essayUrlInputFromRow, universalEssayUrl } from '@/lib/essayUrl';

/**
 * The bug this file exists to prevent: `getEssayLink` returned `/essays/:slug`,
 * a route that did not exist, and passed typecheck, build and every test. So
 * this suite does not check the strings in isolation — it checks them against
 * the route table actually declared in App.tsx.
 */

const APP = readFileSync('src/App.tsx', 'utf-8');
const ROUTE_PATHS = [...APP.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]);

/** Does a concrete URL match any declared <Route path>? */
function matchesARoute(url: string): boolean {
  const parts = url.split('/').filter(Boolean);
  return ROUTE_PATHS.some(pattern => {
    if (pattern === '*') return false; // the catch-all is not a match, it is a 404
    const pp = pattern.split('/').filter(Boolean);
    if (pp.length !== parts.length) return false;
    return pp.every((seg, i) => seg.startsWith(':') || seg === parts[i]);
  });
}

describe('route table sanity', () => {
  it('parsed the routes out of App.tsx', () => {
    expect(ROUTE_PATHS.length).toBeGreaterThan(50);
  });

  it('the universal /essays/:slug route exists — the old fallback pointed at nothing', () => {
    expect(ROUTE_PATHS).toContain('/essays/:slug');
  });
});

describe('essayUrl — every branch resolves to a real route', () => {
  const cases: Array<{ name: string; input: Parameters<typeof essayUrl>[0]; expected: string }> = [
    {
      name: 'finance curriculum lesson (three segments — module is not part of the address)',
      input: {
        slug: 'driver-tree-construction',
        section: 'finance',
        track: 'analytics',
        moduleSlug: 't4-m07',
      },
      expected: '/finance/analytics/driver-tree-construction',
    },
    {
      name: 'finance essay with no curriculum placement',
      input: { slug: 'site-rebuild-note', section: 'finance' },
      expected: '/essays/site-rebuild-note',
    },
    {
      name: 'finance with a track but no module: track alone is a full address now',
      input: { slug: 'x', section: 'finance', track: 'analytics' },
      expected: '/finance/analytics/x',
    },
    {
      name: 'green transition, long phase slug is canonicalised',
      input: { slug: 'g1', section: 'green-transition', phase: 'where-we-are-now' },
      expected: '/green-transition/now/g1',
    },
    {
      name: 'green transition, short phase passes through',
      input: { slug: 'g2', section: 'green-transition', phase: 'gaps' },
      expected: '/green-transition/gaps/g2',
    },
    {
      name: 'development finance',
      input: { slug: 'd1', section: 'development-finance', phase: 'blended' },
      expected: '/development-finance/blended/d1',
    },
    {
      name: 'next big thing',
      input: { slug: 'n1', section: 'next-big-thing' },
      expected: '/the-next-big-thing/n1',
    },
    {
      name: 'critical thinking with phase',
      input: { slug: 'c1', section: 'critical-thinking', phase: 'clarify' },
      expected: '/critical-thinking-research/clarify/c1',
    },
    {
      name: 'accounting FSLI',
      input: { slug: 'a1', section: 'accounting', fsliSlug: 'cash' },
      expected: '/accounting/fsli/cash',
    },
    {
      name: 'unknown section falls back to the universal route',
      input: { slug: 'u1', section: 'mystery' },
      expected: '/essays/u1',
    },
  ];

  for (const c of cases) {
    it(`${c.name} → ${c.expected}`, () => {
      const url = essayUrl(c.input);
      expect(url).toBe(c.expected);
      expect(matchesARoute(url!), `${url} matches no <Route path> in App.tsx`).toBe(true);
    });
  }

  it('never emits the old dead /essays/ shape for a curriculum essay', () => {
    const url = essayUrl({
      slug: 'driver-tree-construction',
      section: 'finance',
      track: 'analytics',
      moduleSlug: 't4-m07',
    });
    expect(url).not.toBe('/essays/driver-tree-construction');
  });

  it('never emits the retired four-segment shape', () => {
    const url = essayUrl({
      slug: 'driver-tree-construction',
      section: 'finance',
      track: 'analytics',
      moduleSlug: 't4-m07',
    });
    expect(url!.split('/').filter(Boolean)).toHaveLength(3);
  });

  it('returns null with no slug, so the caller renders a non-link', () => {
    expect(essayUrl({ slug: null, section: 'finance' })).toBeNull();
    expect(essayUrl({ slug: '   ', section: 'finance' })).toBeNull();
  });
});

describe('essayUrlInputFromRow', () => {
  it('prefers the joined module over the row-level finance_section', () => {
    const got = essayUrlInputFromRow({
      slug: 's',
      section: 'finance',
      finance_section: 'stale-track',
      finance_modules: { slug: 't4-m07', track_slug: 'analytics' },
    });
    expect(got.track).toBe('analytics');
    expect(got.moduleSlug).toBe('t4-m07');
  });

  it('falls back to finance_section when there is no join', () => {
    const got = essayUrlInputFromRow({ slug: 's', section: 'finance', finance_section: 'analytics' });
    expect(got.track).toBe('analytics');
    expect(got.moduleSlug).toBeNull();
  });

  it('produces a resolvable URL for the real driver-tree-construction row shape', () => {
    const url = essayUrl(
      essayUrlInputFromRow({
        slug: 'driver-tree-construction',
        section: 'finance',
        phase: 'fundamentals',
        finance_section: 'analytics',
        finance_modules: { slug: 't4-m07', track_slug: 'analytics' },
      }),
    );
    expect(url).toBe('/finance/analytics/driver-tree-construction');
    expect(matchesARoute(url!)).toBe(true);
  });
});

describe('universalEssayUrl', () => {
  it('matches a declared route', () => {
    expect(matchesARoute(universalEssayUrl('anything'))).toBe(true);
  });
});
