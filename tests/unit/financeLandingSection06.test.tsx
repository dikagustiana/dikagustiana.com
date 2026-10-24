/**
 * The six cards on the /finance landing (docs/prd/finance-restructure §1 A,
 * §3, 24 October 2026): the four tracks from finance_sections, then
 * 05 Finance in Action with its two sub-entries and 06 Toolkits. It replaced
 * the October sweep's card per row, which drew Capital Allocation as 05 and,
 * once migration 20261010110000_finance_section_06 is applied, Finance in
 * Action as 06; those two rows are no longer drawn as tracks, whichever side
 * of that migration the database is on. These render the REAL route table (App.tsx), as
 * capitalInMotionRoutes.test does, so the card's link and the page it lands
 * on are the ones a reader gets.
 *
 * Supabase is mocked at the client module: nothing in this file can reach a
 * network. The rows are the five tracks' titles and the 06 row, read from the
 * migration file itself; no figure of any kind.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchRoutes } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeQueryResult } from './helpers/renderWithProviders';
import { renderFiaPage } from './helpers/renderFiaPage';

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
import FinanceTrackIndex from '@/pages/FinanceTrackIndex';
import { COPY } from '@/lib/finance-in-action/copy';
import { CURRICULUM_CONTRACT } from '@/data/curriculumContract';

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

/**
 * The row 20261010110000_finance_section_06.sql inserts, parsed from the file
 * with its comments stripped, as the route tests below parse App.tsx: the
 * sixth card is drawn from what the owner applies, so a typo there fails here.
 */
function insertedRow() {
  const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261010110000_finance_section_06.sql'), 'utf8').replace(/--.*$/gm, '');
  const m = sql.match(/INSERT INTO public\.finance_sections \(([^)]+)\)\s*VALUES \(([\s\S]+?)\)\s*ON CONFLICT \(slug\) DO NOTHING;/);
  if (!m) throw new Error('the migration no longer reads as one finance_sections INSERT … ON CONFLICT (slug) DO NOTHING');
  const columns = m[1].split(',').map((c) => c.trim());
  const values = [...m[2].matchAll(/'((?:[^']|'')*)'|(\d+)/g)].map(([, s, n]) => (s !== undefined ? s.replace(/''/g, "'") : Number(n)));
  if (values.length !== columns.length) throw new Error(`the migration names ${columns.length} columns and ${values.length} values`);
  return Object.fromEntries(columns.map((c, i) => [c, values[i]])) as { slug: string; title: string; description: string; icon: string; sort_order: number };
}
const INSERTED = insertedRow();

/** The five rows production holds, then the row the migration inserts. */
const SECTIONS = [
  row(1, 'fundamentals', 'Fundamentals', 'Core concepts every finance professional must master.', 'Landmark'),
  row(2, 'strategic-finance', 'Strategic Finance', 'Capital allocation, M&A, and value creation.', 'Target'),
  row(3, 'planning', 'Planning & Forecasting', 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.', 'BarChart3'),
  row(4, 'analytics', 'Financial Analytics', 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.', 'TrendingUp'),
  row(5, 'capital-allocation', 'Capital Allocation', 'Twenty-one structural capital conditions observed in Indonesian markets. Institutional framework for allocators.', 'Layers'),
  row(INSERTED.sort_order, INSERTED.slug, INSERTED.title, INSERTED.description, INSERTED.icon),
];

/**
 * A read over `data` that honours .eq(): a list read answers the matching
 * rows, a single-row read the first match or null. FinanceTrackIndex reads
 * its row by slug, so a fall-through to /finance/:track draws the 06 row's
 * own title, as it would in production, not the first row's.
 */
function rows(data: Record<string, unknown>[]) {
  const where: Record<string, unknown> = {};
  const hits = () => data.filter((r) => Object.entries(where).every(([k, v]) => r[k] === v));
  const b = makeQueryResult(data) as Record<string, unknown>;
  b.eq = (column: string, value: unknown) => {
    where[column] = value;
    return b;
  };
  b.then = (ok: (v: unknown) => unknown, no?: (e: unknown) => unknown) => Promise.resolve({ data: hits(), error: null }).then(ok, no);
  b.maybeSingle = () => makeQueryResult(hits()[0] ?? null);
  b.single = () => makeQueryResult(hits()[0] ?? null);
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
  await within(main).findByRole('heading', { level: 3, name: 'Toolkits' });
  return [...main.querySelectorAll<HTMLElement>('[data-finance-card]')];
}
const card = async (title: string) => (await cards()).find((c) => c.querySelector('h3')?.textContent === title)!;

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => rows(table === 'finance_sections' ? SECTIONS : []));
});

describe('the row the migration inserts', () => {
  it('is finance-in-action, titled Finance in Action, sort_order 6, described by COPY.seoDescription', () => {
    expect(INSERTED).toStrictEqual({
      slug: 'finance-in-action',
      title: 'Finance in Action',
      description: COPY.seoDescription,
      icon: 'Table',
      sort_order: 6,
    });
  });
});

describe('the six cards on /finance', () => {
  it('draws the four tracks, then 05 Finance in Action and 06 Toolkits; Capital Allocation is not a card', async () => {
    renderAt('/finance');
    const found = await cards();
    expect(found.map((c) => c.querySelector('h3')?.textContent)).toEqual([
      'Fundamentals', 'Strategic Finance', 'Planning & Forecasting', 'Financial Analytics', 'Finance in Action', 'Toolkits',
    ]);
    expect(found.map((c) => c.querySelector('span')?.textContent)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(within(screen.getByRole('main')).queryByText('Capital Allocation')).not.toBeInTheDocument();
  });

  it('gives 05 and 06 the PRD copy, and no "Start here" chip', async () => {
    renderAt('/finance');
    const fia = await card('Finance in Action');
    const toolkits = await card('Toolkits');
    expect(fia).toHaveTextContent('The theory at company scale: twenty-one conditions, and the IDX companies where they are happening now.');
    expect(toolkits).toHaveTextContent('The working files behind the essays. Download, open, use.');
    expect(fia).not.toHaveTextContent(/start here/i);
    expect(toolkits).not.toHaveTextContent(/start here/i);
    expect(await card('Fundamentals')).toHaveTextContent(/start here/i);
  });

  it('05 links the index, Capital in Motion and the company models; 06 links the toolkits', async () => {
    renderAt('/finance');
    const fia = await card('Finance in Action');
    expect(within(fia).getByRole('link', { name: 'Finance in Action' })).toHaveAttribute('href', FIA);
    expect(within(fia).getByRole('link', { name: 'Capital in Motion' })).toHaveAttribute('href', `${FIA}/capital-in-motion`);
    expect(within(fia).getByRole('link', { name: 'Company models' })).toHaveAttribute('href', `${FIA}#company-models`);
    expect(await card('Toolkits')).toHaveAttribute('href', '/finance/toolkits');
  });

  it('opens the Finance in Action page, not a track index', async () => {
    renderAt('/finance');
    await userEvent.click(within(await card('Finance in Action')).getByRole('link', { name: 'Finance in Action' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Finance in Action' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(FIA);
    // The h1 alone cannot tell the pages apart (the control below). Tests
    // build with both Finance in Action flags off, so App picks the legacy
    // index: its models line is drawn, the track index's curriculum note is
    // not. The live index (__FIA_LIVE__) is fiaLive.test's.
    expect(screen.getByText(/models available/)).toBeInTheDocument();
    expect(screen.queryByText(CURRICULUM_CONTRACT.note)).not.toBeInTheDocument();
  });

  it('every card resolves to a page: no card is a 404', async () => {
    renderAt('/finance');
    const hrefs = (await cards()).flatMap((c) => [...c.querySelectorAll('a')].map((a) => a.getAttribute('href')!));
    const APP = readFileSync(join(__dirname, '../../src/App.tsx'), 'utf8');
    const routes = [...APP.matchAll(/<Route path="([^"]+)"/g)].map((m) => ({ path: m[1] }));
    for (const href of new Set(hrefs)) {
      const m = matchRoutes(routes, href.split('#')[0]);
      expect(m?.[m.length - 1].route.path, href).not.toBe('*');
      expect(m, href).not.toBeNull();
    }
  });

  it('control: a track index at the same address draws the same h1, with the curriculum note and no models line', async () => {
    renderFiaPage(<FinanceTrackIndex />, { path: '/finance/:track', url: FIA });
    expect(await screen.findByRole('heading', { level: 1, name: 'Finance in Action' })).toBeInTheDocument();
    expect(screen.getByText(CURRICULUM_CONTRACT.note)).toBeInTheDocument();
    expect(screen.queryByText(/models available/)).not.toBeInTheDocument();
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
