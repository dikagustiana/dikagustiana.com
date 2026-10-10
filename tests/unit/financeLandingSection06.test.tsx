/**
 * Section 06 on the /finance landing (site sweep October 2026, PRD R5.1 and
 * R5.6). The landing draws one numbered card per finance_sections row;
 * migration 20261010110000_finance_section_06 adds Finance in Action as the
 * sixth. These render the REAL route table (App.tsx), as
 * capitalInMotionRoutes.test does, so the card's link and the page it lands
 * on are the ones a reader gets.
 *
 * Supabase is mocked at the client module: nothing in this file can reach a
 * network. The rows are the five tracks' titles and the 06 row the migration
 * inserts; no figure of any kind.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchRoutes } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

import App from '@/App';
import { COPY } from '@/lib/finance-in-action/copy';

const FIA = '/finance/finance-in-action';

const row = (sort_order: number, slug: string, title: string, description: string, icon: string) => ({
  id: `00000000-0000-0000-0000-00000000000${sort_order}`,
  slug,
  title,
  description,
  icon,
  sort_order,
  created_at: '2026-07-31T00:00:00Z',
  updated_at: '2026-07-31T00:00:00Z',
});

/** The five rows production holds, then the row the migration inserts. */
const SECTIONS = [
  row(1, 'fundamentals', 'Fundamentals', 'Core concepts every finance professional must master.', 'Landmark'),
  row(2, 'strategic-finance', 'Strategic Finance', 'Capital allocation, M&A, and value creation.', 'Target'),
  row(3, 'planning', 'Planning & Forecasting', 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.', 'BarChart3'),
  row(4, 'analytics', 'Financial Analytics', 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.', 'TrendingUp'),
  row(5, 'capital-allocation', 'Capital Allocation', 'Twenty-one structural capital conditions observed in Indonesian markets. Institutional framework for allocators.', 'Layers'),
  row(6, 'finance-in-action', 'Finance in Action', COPY.seoDescription, 'Table'),
];

/** A list read answers rows; a single-row read (the featured essay) answers its first row or null. */
function rows(data: unknown[]) {
  const b = makeQueryResult(data) as Record<string, unknown>;
  b.maybeSingle = () => makeQueryResult(data[0] ?? null);
  b.single = () => makeQueryResult(data[0] ?? null);
  return b;
}

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

/** The landing's cards, scoped to the page body: the site header links Finance in Action too. */
async function cards() {
  await screen.findByRole('heading', { level: 1, name: 'Finance' });
  const main = screen.getByRole('main');
  await within(main).findByRole('heading', { level: 3, name: 'Finance in Action' });
  return [...main.querySelectorAll('a')].filter((a) => a.querySelector('h3'));
}

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => rows(table === 'finance_sections' ? SECTIONS : []));
});

describe('section 06 on /finance', () => {
  it('draws six cards in sort order, numbered 01 to 06', async () => {
    renderAt('/finance');
    const found = await cards();
    expect(found.map((a) => a.querySelector('h3')?.textContent)).toEqual(SECTIONS.map((s) => s.title));
    expect(found.map((a) => a.querySelector('span')?.textContent)).toEqual(['01', '02', '03', '04', '05', '06']);
  });

  it('numbers the Finance in Action card 06 and links it to /finance/finance-in-action', async () => {
    renderAt('/finance');
    const card = (await cards()).find((a) => a.querySelector('h3')?.textContent === 'Finance in Action')!;
    expect(card).toHaveAttribute('href', FIA);
    expect(within(card).getByText('06')).toBeInTheDocument();
    expect(within(card).getByText(COPY.seoDescription)).toBeInTheDocument();
  });

  it('opens the Finance in Action page, not a track index', async () => {
    renderAt('/finance');
    const card = (await cards()).find((a) => a.querySelector('h3')?.textContent === 'Finance in Action')!;
    await userEvent.click(card);
    expect(await screen.findByRole('heading', { level: 1, name: 'Finance in Action' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(FIA);
  });
});

describe('the Finance in Action routes stay ahead of /finance/:track', () => {
  // Parsed from App.tsx the way capitalInMotionRoutes.test does. The router
  // ranks a static segment above a dynamic one whatever the order, so both
  // are pinned: the order the PRD asks for (R5.1) and the route that wins.
  const APP = readFileSync(join(__dirname, '../../src/App.tsx'), 'utf8');
  const paths = [...APP.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);
  const at = (p: string) => {
    const i = paths.indexOf(p);
    expect(i, `${p} is not declared in App.tsx`).toBeGreaterThanOrEqual(0);
    return i;
  };
  const winner = (url: string) => {
    const m = matchRoutes(paths.map((path) => ({ path })), url);
    return m?.[m.length - 1].route.path;
  };

  it('declares the index and the model route before /finance/:track', () => {
    expect(at(FIA)).toBeLessThan(at('/finance/:track'));
    expect(at(`${FIA}/:modelSlug`)).toBeLessThan(at('/finance/:track'));
    expect(at(`${FIA}/:modelSlug`)).toBeLessThan(at('/finance/:track/:slug'));
  });

  it('sends both addresses to the Finance in Action routes', () => {
    expect(winner(FIA)).toBe(FIA);
    expect(winner(`${FIA}/ptba`)).toBe(`${FIA}/:modelSlug`);
  });
});
