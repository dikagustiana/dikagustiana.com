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

import GreenTransitionPhase from '@/pages/GreenTransitionPhase';
import GreenTransitionEssayPage from '@/pages/GreenTransitionEssayPage';

/**
 * `/green-transition/now`, `/gaps` and `/future` are static routes in App.tsx,
 * so the phase page gets no :phase param on them. It used to read only the
 * param, so on its own tabs it titled itself "Essays" and never queried: every
 * essay placed in Where We Are Now was invisible there.
 */

type Call = [string, unknown[]];

/** A chainable builder that records every filter call and resolves to `rows`. */
function recordingBuilder(calls: Call[], rows: unknown[], single: unknown = null) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'is', 'filter']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return builder;
    };
  }
  builder.maybeSingle = () => Promise.resolve({ data: single, error: null });
  const list = Promise.resolve({ data: rows, error: null });
  (builder as { then: unknown }).then = list.then.bind(list);
  (builder as { catch: unknown }).catch = list.catch.bind(list);
  (builder as { finally: unknown }).finally = list.finally.bind(list);
  return builder;
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/green-transition/now" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/gaps" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/future" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase/:slug" element={<GreenTransitionEssayPage />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const essayRow = {
  id: 'e1',
  slug: 'an-essay',
  title: 'An Essay',
  snippet: 'Deck.',
  author: 'Dika',
  date: '2026-10-11',
  read_time: '9 min read',
  thumbnail_url: null,
  phase: 'where-we-are-now',
  status: 'published',
};

beforeEach(() => fromMock.mockReset());

describe('green transition phase tabs', () => {
  it.each([
    ['/green-transition/now', 'Where We Are Now', 'where-we-are-now'],
    ['/green-transition/gaps', 'Challenges Ahead', 'challenges-ahead'],
    ['/green-transition/future', 'Pathways Forward', 'pathways-forward'],
    ['/green-transition/where-we-are-now', 'Where We Are Now', 'where-we-are-now'],
  ])('%s titles itself %s and lists the essays in phase %s', async (path, title, dbPhase) => {
    const calls: Call[] = [];
    fromMock.mockImplementation(() => recordingBuilder(calls, [essayRow]));
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(await screen.findByText('An Essay')).toBeInTheDocument();
    expect(calls).toContainEqual(['eq', ['phase', dbPhase]]);
    expect(screen.getByText('An Essay').closest('a')?.getAttribute('href')).toMatch(/\/an-essay$/);
  });
});

describe('green transition essay siblings', () => {
  it('come from the essay\'s own section and phase, not its catch-all category', async () => {
    const calls: Call[] = [];
    fromMock.mockImplementation(() =>
      recordingBuilder(calls, [], {
        ...essayRow,
        content: '<p>Body.</p>',
        section: 'green-transition',
        published: true,
        category_id: '0f111111-1111-4111-8111-111111111111',
        created_at: '2026-10-11T00:00:00Z',
        updated_at: '2026-10-11T00:00:00Z',
        presentation: null,
        brief_json: null,
      }),
    );
    renderAt('/green-transition/now/an-essay');
    await waitFor(() => expect(calls).toContainEqual(['select', ['slug, title']]));
    expect(calls).toContainEqual(['eq', ['section', 'green-transition']]);
    expect(calls).toContainEqual(['eq', ['phase', 'where-we-are-now']]);
    expect(calls.some(([m, args]) => m === 'eq' && args[0] === 'category_id')).toBe(false);
  });
});
