import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import GreenTransitionEssayPage from '@/pages/GreenTransitionEssayPage';
import DevelopmentFinanceEssayPage from '@/pages/DevelopmentFinanceEssayPage';

/**
 * An address must not assert an intellectual home the essay does not have.
 *
 * Both pages matched on the globally unique slug and then rendered under
 * WHATEVER section and phase the URL claimed, deriving breadcrumbs, sibling
 * links and the canonical tag from those claims. Two consequences, both
 * reproduced below: a green-transition address could present an essay that
 * belongs to another section, and the explicit /green-transition/
 * climate-finance/:slug route — which declares no :phase segment — minted
 * sibling links reading `/green-transition/undefined/<slug>`.
 */

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    slug: 'a-real-essay',
    title: 'A Real Essay',
    snippet: 'Deck.',
    author: 'Dika',
    date: '2026-08-02',
    read_time: '9 min read',
    thumbnail_url: null,
    content: '<p>Body.</p>',
    section: 'green-transition',
    phase: 'where-we-are-now',
    status: 'published',
    published: true,
    category_id: 'c1',
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    presentation: null,
    brief_json: null,
    ...over,
  };
}

/** A builder whose maybeSingle() resolves to one row and whose lists are empty. */
function builderFor(single: unknown) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'is', 'filter'];
  for (const m of methods) builder[m] = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: single, error: null });
  const list = Promise.resolve({ data: [], error: null });
  (builder as { then: unknown }).then = list.then.bind(list);
  (builder as { catch: unknown }).catch = list.catch.bind(list);
  (builder as { finally: unknown }).finally = list.finally.bind(list);
  return builder;
}

function Probe() {
  const { pathname } = useLocation();
  return <div data-testid="path">{pathname}</div>;
}

function renderAt(path: string, element: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <Probe />
        <Routes>
          <Route path="/green-transition/climate-finance/:slug" element={element} />
          <Route path="/green-transition/:phase/:slug" element={element} />
          <Route path="/development-finance/:phase/:slug" element={element} />
          <Route path="/essays/:slug" element={<div>universal route</div>} />
          <Route path="*" element={<div>elsewhere</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => fromMock.mockReset());

describe('green transition essay ownership', () => {
  it('renders at the address the essay actually owns', async () => {
    fromMock.mockReturnValue(builderFor(row()));
    renderAt('/green-transition/now/a-real-essay', <GreenTransitionEssayPage />);
    await waitFor(() => expect(screen.getByText('A Real Essay')).toBeInTheDocument());
    expect(screen.getByTestId('path')).toHaveTextContent('/green-transition/now/a-real-essay');
  });

  it('redirects a wrong-phase address to the phase the essay is in', async () => {
    fromMock.mockReturnValue(builderFor(row()));
    renderAt('/green-transition/future/a-real-essay', <GreenTransitionEssayPage />);
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/green-transition/now/a-real-essay'),
    );
  });

  it('does not render an essay from another section under a green-transition address', async () => {
    fromMock.mockReturnValue(builderFor(row({ section: 'next-big-thing', phase: 'economy' })));
    renderAt('/green-transition/now/a-real-essay', <GreenTransitionEssayPage />);
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/the-next-big-thing/economy/a-real-essay'),
    );
  });

  it('sends a placement-less essay to the universal route rather than inventing a phase', async () => {
    fromMock.mockReturnValue(builderFor(row({ phase: null })));
    renderAt('/green-transition/now/a-real-essay', <GreenTransitionEssayPage />);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/essays/a-real-essay'));
  });

  it('handles the climate-finance route, which declares no :phase segment', async () => {
    fromMock.mockReturnValue(builderFor(row({ phase: 'climate-finance' })));
    renderAt('/green-transition/climate-finance/a-real-essay', <GreenTransitionEssayPage />);
    await waitFor(() => expect(screen.getByText('A Real Essay')).toBeInTheDocument());
    // It stays put, and nothing on the page contains the literal "undefined"
    // that the URL param produced when interpolated.
    expect(screen.getByTestId('path')).toHaveTextContent(
      '/green-transition/climate-finance/a-real-essay',
    );
    expect(document.body.innerHTML).not.toContain('/green-transition/undefined');
  });
});

describe('development finance essay ownership', () => {
  it('redirects a wrong-phase address', async () => {
    fromMock.mockReturnValue(
      builderFor(row({ section: 'development-finance', phase: 'blended-finance' })),
    );
    renderAt('/development-finance/sovereign-wealth-funds/a-real-essay', <DevelopmentFinanceEssayPage />);
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(
        '/development-finance/blended-finance/a-real-essay',
      ),
    );
  });
});

describe('no generated link carries an undefined segment', () => {
  const SRC = [
    'src/pages/GreenTransitionEssayPage.tsx',
    'src/pages/DevelopmentFinanceEssayPage.tsx',
  ].map((f) => [f, readFileSync(f, 'utf-8')] as const);

  it('never interpolates a route param straight into an essay path', () => {
    for (const [file, src] of SRC) {
      // `${phase}` inside a path literal is the exact shape that produced
      // /green-transition/undefined/<slug> on a route with no :phase segment.
      expect(src, file).not.toMatch(/`\/(green-transition|development-finance)\/\$\{phase/);
    }
  });
});
