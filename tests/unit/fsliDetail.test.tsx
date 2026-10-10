/**
 * The FSLI line-item page (src/pages/FsliDetail.tsx) after the October 2026
 * sweep: the linked essay is the page body (owner decision D1(a)), a page
 * without one points at the line item whose essay covers it (D2(a)), and
 * "Related line items" stays inside the page's own category.
 *
 * Supabase is mocked at the client module with a builder that filters on
 * eq() the way PostgREST does; nothing here can reach a network. Figures are
 * dummies, not any issuer's.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, isLoading: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
// The chrome around the page is not what this file is about.
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

import FsliDetail from '@/pages/FsliDetail';

type Row = Record<string, unknown>;

/** A query builder that answers from `tables`, filtering on eq() like PostgREST. */
function builderFor(rows: Row[]) {
  let result = rows;
  let single = false;
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'in', 'is', 'neq', 'filter']) builder[m] = () => builder;
  builder.eq = (column: string, value: unknown) => {
    result = result.filter((row) => row[column] === value);
    return builder;
  };
  builder.maybeSingle = () => {
    single = true;
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: single ? (result[0] ?? null) : result, error: null }).then(resolve, reject);
  return builder;
}

function page(slug: string, title: string, category: string, sort_order: number, over: Row = {}): Row {
  return {
    id: `p-${slug}`,
    slug,
    title,
    subtitle: null,
    notes_ref: '1',
    dec_2024: '1,000',
    dec_2023: '900',
    category,
    sort_order,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const heading = (level: number, text: string) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const ESSAY = {
  id: 'e-cash',
  slug: 'what-cash-is',
  title: 'What Cash Is',
  snippet: 'A dummy lede for the cash line.',
  author: 'Test Author',
  read_time: '5 min read',
  presentation: null,
  section: 'accounting',
  fsli_slug: 'cash',
  published: true,
  sort_order: 1,
  updated_at: '2026-01-01T00:00:00Z',
  content: JSON.stringify({
    type: 'doc',
    content: [
      heading(2, 'What counts as cash'),
      para('A dummy paragraph about demand deposits.'),
      heading(3, 'Placements'),
      para('Another dummy paragraph.'),
      heading(2, 'Where it is presented'),
    ],
  }),
};

const CURRENT = [
  page('cash', 'Cash', 'current_assets', 1),
  page('restricted', 'Restricted', 'current_assets', 2),
  ...Array.from({ length: 9 }, (_, i) => page(`current-${i + 1}`, `Current item ${i + 1}`, 'current_assets', 3 + i)),
];
const NON_CURRENT = [
  page('restricted-non-current', 'Restricted, non-current', 'non_current_assets', 20, { covered_by_slug: 'restricted' }),
  page('loose', 'Loose', 'non_current_assets', 21, { covered_by_slug: null }),
  page('cash-non-current', 'Cash, non-current', 'non_current_assets', 22, { covered_by_slug: 'cash' }),
  page('legacy', 'Legacy', 'non_current_assets', 23), // no covered_by_slug key: the column is not there yet
];

let tables: Record<string, Row[]>;

beforeEach(() => {
  tables = { fsli_pages: [...CURRENT, ...NON_CURRENT], essays: [ESSAY] };
  fromMock.mockReset();
  fromMock.mockImplementation((table: string) => builderFor(tables[table] ?? []));
});

function renderAt(slug: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/accounting/fsli/${slug}`]}>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/accounting/fsli/:slug" element={<FsliDetail />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const main = () => screen.getByRole('main');

describe('FSLI page with a published essay', () => {
  it('renders the essay as the body: its title the first h2, its snippet the lede, then the essay', async () => {
    renderAt('cash');
    await screen.findByRole('heading', { level: 2, name: 'What Cash Is' });

    const h2s = within(main()).getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(['What Cash Is', 'What counts as cash', 'Where it is presented']);
    expect(main()).toHaveTextContent('A dummy lede for the cash line.');
    expect(main()).toHaveTextContent('A dummy paragraph about demand deposits.');
    // No outline, no empty state, no trailing block.
    expect(main()).not.toHaveTextContent('Not written yet');
    expect(main()).not.toHaveTextContent('Related Essays');
    expect(main()).not.toHaveTextContent('Definition');
    expect(fromMock).not.toHaveBeenCalledWith('fsli_sections');
  });

  it('lists the essay\'s headings on this page, each pointing at a heading that is there', async () => {
    renderAt('cash');
    await screen.findByRole('heading', { level: 2, name: 'What Cash Is' });

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    const entries = within(toc).getAllByRole('button').map((b) => b.textContent);
    expect(entries).toEqual(['What counts as cash', 'Placements', 'Where it is presented']);
    for (const id of ['what-counts-as-cash', 'placements', 'where-it-is-presented']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.getByPlaceholderText('Find in page...')).toBeInTheDocument();
  });

  it('gives two linked essays one set of ids, so every heading is listed and none is repeated', async () => {
    const SECOND = {
      ...ESSAY,
      id: 'e-cash-2',
      slug: 'cash-again',
      title: 'Cash Again',
      sort_order: 2,
      content: JSON.stringify({ type: 'doc', content: [heading(2, 'What counts as cash'), heading(2, 'Restrictions')] }),
    };
    tables.essays = [ESSAY, SECOND];
    renderAt('cash');
    await screen.findByRole('heading', { level: 2, name: 'Cash Again' });

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    expect(within(toc).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'What counts as cash',
      'Placements',
      'Where it is presented',
      'What counts as cash',
      'Restrictions',
    ]);
    const ids = Array.from(main().querySelectorAll('[id]')).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.getElementById('what-counts-as-cash-2')).toHaveTextContent('What counts as cash');
  });

  it('shows no covered-by sentence even when the row names a cover', async () => {
    tables.essays = [{ ...ESSAY, fsli_slug: 'cash-non-current' }];
    renderAt('cash-non-current');
    await screen.findByRole('heading', { level: 2, name: 'What Cash Is' });
    expect(main()).not.toHaveTextContent('Covered in');
  });
});

describe('FSLI page without an essay', () => {
  it('says which essay covers it, linking to the covering line item', async () => {
    tables.essays = [{ ...ESSAY, fsli_slug: 'restricted', title: 'The Restricted Essay' }];
    renderAt('restricted-non-current');
    const link = await screen.findByRole('link', { name: 'The Restricted Essay' });
    expect(link).toHaveAttribute('href', '/accounting/fsli/restricted');
    expect(link.closest('p')).toHaveTextContent(/^Covered in The Restricted Essay$/);
    expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
    expect(main()).not.toHaveTextContent('Not written yet');
  });

  it('falls back to the covering page\'s own title while that page has no essay', async () => {
    tables.essays = [];
    renderAt('restricted-non-current');
    const link = await screen.findByRole('link', { name: 'Restricted' });
    expect(link).toHaveAttribute('href', '/accounting/fsli/restricted');
    expect(link.closest('p')).toHaveTextContent(/^Covered in Restricted$/);
  });

  it('ends at its figures with no cover, and when the column is not there yet', async () => {
    for (const slug of ['loose', 'legacy']) {
      const { unmount } = renderAt(slug);
      await screen.findByRole('heading', { level: 1 });
      await screen.findByText('Figures as reported in the source financial statements.');
      expect(main()).not.toHaveTextContent('Covered in');
      expect(main()).not.toHaveTextContent('Not written yet');
      expect(within(main()).queryAllByRole('heading', { level: 2 })).toHaveLength(0);
      expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
      unmount();
    }
  });
});

describe('Related line items', () => {
  /** The sidebar's links, once the page and the list have both loaded. */
  async function relatedLinks(firstLink: string) {
    const list = (await screen.findByText('Related line items')).closest('div')!;
    await within(list).findByRole('link', { name: firstLink });
    return within(list).getAllByRole('link').map((a) => a.textContent);
  }

  it('lists the page\'s own category, itself excluded', async () => {
    renderAt('restricted-non-current');
    expect(await relatedLinks('Loose')).toEqual(['Loose', 'Cash, non-current', 'Legacy']);
  });

  it('stops at eight, in statement order', async () => {
    renderAt('cash');
    expect(await relatedLinks('Restricted')).toEqual([
      'Restricted',
      ...Array.from({ length: 7 }, (_, i) => `Current item ${i + 1}`),
    ]);
  });
});
