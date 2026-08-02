/**
 * The navigation is data, and data can lie. Two finance items pointed at
 * `/finance/planning-forecasting` and `/finance/financial-analytics` — readable
 * labels, nonexistent tracks — and every route check stayed green, because
 * `/finance/:track` happily matches any second segment. The nav rendered two
 * empty track indexes and hid two whole tracks of the curriculum.
 *
 * Two assertions, because they fail differently:
 *   1. every nav path matches a declared <Route> — catches typo'd shapes;
 *   2. finance track segments come from the KNOWN slug set — catches exactly
 *      the wildcard case above, which (1) cannot.
 *
 * The slug list mirrors the `finance_sections` seed. If a track is renamed in
 * the database, this test failing is the desired behaviour: nav and DB must
 * move together, deliberately.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  navSections,
  financeItems,
  accountingItems,
  greenTransitionItems,
  developmentFinanceItems,
  learningItems,
  nextBigThingItems,
} from '@/config/navConfig';

const APP = readFileSync(join(__dirname, '../../src/App.tsx'), 'utf8');
const ROUTE_PATHS = [...APP.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]);

function matchesARoute(url: string): boolean {
  const path = url.split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return ROUTE_PATHS.includes('/');
  return ROUTE_PATHS.some(pattern => {
    if (pattern === '*') return false;
    const pp = pattern.split('/').filter(Boolean);
    if (pp.length !== parts.length) return false;
    return pp.every((seg, i) => seg.startsWith(':') || seg === parts[i]);
  });
}

/** Mirrors the `finance_sections` seed. Update BOTH on a rename, on purpose. */
const FINANCE_TRACK_SLUGS = [
  'fundamentals',
  'strategic-finance',
  'planning',
  'analytics',
  'capital-allocation',
];
/** Real named finance routes that are not tracks. */
const FINANCE_NAMED_PAGES = ['finance-in-action', 'finance-in-motion'];

const ALL_ITEMS = [
  ...financeItems,
  ...accountingItems,
  ...greenTransitionItems,
  ...developmentFinanceItems,
  ...learningItems,
  ...nextBigThingItems,
  ...navSections.filter(s => s.path).map(s => ({ label: s.label, path: s.path! })),
];

describe('navConfig', () => {
  it('parsed the route table out of App.tsx', () => {
    expect(ROUTE_PATHS.length).toBeGreaterThan(50);
  });

  it.each(ALL_ITEMS.map(i => [i.label, i.path]))(
    '"%s" (%s) matches a declared route',
    (_label, path) => {
      expect(matchesARoute(path as string), `${path} matches no <Route>`).toBe(true);
    },
  );

  it('every finance nav item uses a real track slug or a named finance page', () => {
    for (const item of financeItems) {
      const seg = item.path.replace(/^\/finance\//, '').split('/')[0];
      const known = FINANCE_TRACK_SLUGS.includes(seg) || FINANCE_NAMED_PAGES.includes(seg);
      // `/finance/:track` matches ANY segment, so route-matching alone can
      // never fail here — this assertion is the one that catches a bad slug.
      expect(known, `"${item.label}" points at /finance/${seg}, which is neither a track slug nor a named page`).toBe(true);
    }
  });

  it('links the tracks it advertises to the slugs the database uses', () => {
    const trackPaths = financeItems
      .map(i => i.path.replace(/^\/finance\//, ''))
      .filter(seg => FINANCE_TRACK_SLUGS.includes(seg));
    // The four tracks with content today. capital-allocation is deliberately
    // absent from the nav until it has modules (0 today).
    expect(trackPaths).toEqual(['fundamentals', 'strategic-finance', 'planning', 'analytics']);
  });
});
