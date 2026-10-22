import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import ConsolidationDetail from '@/pages/ConsolidationDetail';

/**
 * /accounting/consolidation/<slug> is a consolidation-series essay's own page.
 * It used to render the essay inside the topic template: a left-pinned
 * max-w-3xl box, a display-font h1 out of line with the body, no "On this
 * page" rail, no byline, no end matter. It now wears the essay layout every
 * other essay page wears (ArticleShell). The nine configured topics keep the
 * topic template.
 */

/** A chainable builder that answers by what was selected. */
function builder(answer: (select: string) => unknown[]) {
  let select = '';
  const b: Record<string, unknown> = {};
  for (const m of ['eq', 'neq', 'in', 'order', 'limit', 'is', 'filter']) b[m] = () => b;
  b.select = (columns: string) => {
    select = columns;
    return b;
  };
  b.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
    Promise.resolve({ data: answer(select), error: null }).then(ok, fail);
  return b;
}

const part = (n: number, slug: string, title: string) => ({
  id: `k${n}`,
  slug,
  title,
  snippet: `${title} deck.`,
  section: 'accounting',
  phase: 'consolidated-reporting',
  topic: slug,
  sort_order: n,
  read_time: '16 min read',
});

const SERIES = [
  part(1, 'business-combinations', 'Business Combinations'),
  part(2, 'worksheet-eliminations', 'Worksheet Eliminations'),
  part(3, 'intercompany-profit-in-inventory', 'Intercompany Profit in Inventory'),
];

const ESSAY = {
  ...SERIES[1],
  author: 'Dika Gustiana',
  date: '2026-10-11',
  thumbnail_url: null,
  published: true,
  status: 'published',
  category_id: null,
  module_id: null,
  finance_section: null,
  finance_order: null,
  fsli_slug: null,
  created_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
  content:
    '<h2>In brief</h2><p>A group earns nothing by selling to itself.</p>' +
    '<h2>Downstream and upstream</h2><p>Direction decides who bears it.</p>' +
    '<h2>The worksheet</h2><table style="min-width: 75px"><colgroup><col style="min-width: 25px"></colgroup>' +
    '<tbody><tr><th colspan="1" rowspan="1"><p>Account</p></th></tr></tbody></table>',
  presentation: { deck: 'How the worksheet removes what the group did with itself.', key_takeaways: ['Eliminate in full.'] },
  brief_json: null,
};

function answer(topicRows: unknown[]) {
  return (select: string) => {
    if (select.includes('brief_json')) return topicRows; // useEssaysByTopic
    if (select.startsWith('id, slug, title, snippet, section, phase, topic, sort_order')) return SERIES;
    return []; // RelatedEssays
  };
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/accounting/consolidation/:topic" element={<ConsolidationDetail />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  fromMock.mockReset();
  // The table of contents' scroll-spy; jsdom has no IntersectionObserver.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe('consolidation series essay page', () => {
  it('renders the essay in the essay layout, not the topic template', async () => {
    fromMock.mockImplementation(() => builder(answer([ESSAY])));
    const { container } = renderAt('/accounting/consolidation/worksheet-eliminations');

    const title = await screen.findByRole('heading', { level: 1, name: 'Worksheet Eliminations' });
    // The essay page's title and deck classes, as on every other essay.
    expect(title).toHaveClass('editorial-title');
    expect(title).not.toHaveClass('font-display');
    expect(screen.getByText('How the worksheet removes what the group did with itself.')).toHaveClass('editorial-subtitle');
    // Byline and the essay page's back link.
    expect(screen.getByText('Dika Gustiana', { selector: 'span.font-medium' })).toBeInTheDocument();
    for (const back of screen.getAllByRole('link', { name: /Back to Consolidated Reporting/ })) {
      expect(back).toHaveAttribute('href', '/accounting/consolidated-reporting');
    }
    // The centred two-column grid with the "On this page" rail.
    expect(container.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_13rem\\]')).not.toBeNull();
    expect(screen.getByText('On this page')).toBeInTheDocument();
    // The body. Key takeaways are the body's own "In brief", copied by the
    // import, so they are not printed again as end matter.
    expect(container.querySelector('article.prose-editorial')).not.toBeNull();
    expect(screen.queryByText('Eliminate in full.')).not.toBeInTheDocument();
    // The wide table scrolls in its own wrapper.
    expect(container.querySelector('article table')?.parentElement).toHaveClass('overflow-x-auto');
    // No topic-page chrome.
    expect(screen.queryByText('Consolidation Topic')).not.toBeInTheDocument();
  });

  it('links the previous and next parts of the series', async () => {
    fromMock.mockImplementation(() => builder(answer([ESSAY])));
    renderAt('/accounting/consolidation/worksheet-eliminations');

    await waitFor(() => expect(screen.getByText('Previous')).toBeInTheDocument());
    expect(screen.getByText('Business Combinations').closest('a')).toHaveAttribute(
      'href',
      '/accounting/consolidation/business-combinations',
    );
    expect(screen.getByText('Intercompany Profit in Inventory').closest('a')).toHaveAttribute(
      'href',
      '/accounting/consolidation/intercompany-profit-in-inventory',
    );
  });

  it('keeps the topic template for a configured topic', async () => {
    fromMock.mockImplementation(() => builder(answer([])));
    const { container } = renderAt('/accounting/consolidation/psak-principles');

    expect(await screen.findByRole('heading', { level: 1, name: 'PSAK Principles' })).toHaveClass('font-display');
    expect(await screen.findByText('Not written yet.')).toBeInTheDocument();
    expect(container.querySelector('article.prose-editorial')).toBeNull();
  });
});
