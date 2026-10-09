import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeQueryResult } from './helpers/renderWithProviders';
import { canSearchFeed, canSortFeed, MIN_ESSAYS_TO_SEARCH, MIN_ESSAYS_TO_SORT } from '@/lib/feedControls';

// The feed reads straight from the Supabase client, so the client is what gets
// replaced. Each test sets what `from('essays')` resolves to.
const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromMock } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));

import { EditorialFeed } from '@/components/editorial/EditorialFeed';

const essay = (n: number) => ({
  id: `e${n}`,
  slug: `essay-${n}`,
  title: `Essay ${n}`,
  snippet: null,
  author: null,
  date: null,
  read_time: null,
  thumbnail_url: null,
  phase: null,
  status: 'published',
  published: true,
});

function renderFeed() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <EditorialFeed section="next-big-thing" getEssayUrl={(e) => `/x/${e.slug}`} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => fromMock.mockReset());

describe('feed controls', () => {
  it('turns sort on at two essays and search on at six', () => {
    expect(canSortFeed(MIN_ESSAYS_TO_SORT - 1)).toBe(false);
    expect(canSortFeed(MIN_ESSAYS_TO_SORT)).toBe(true);
    expect(canSearchFeed(MIN_ESSAYS_TO_SEARCH - 1)).toBe(false);
    expect(canSearchFeed(MIN_ESSAYS_TO_SEARCH)).toBe(true);
  });
});

describe('EditorialFeed', () => {
  it('says the fetch failed instead of reporting an empty section', async () => {
    fromMock.mockReturnValue(makeQueryResult(null, { message: 'boom' }));
    renderFeed();
    expect(await screen.findByText("Couldn't load the essays")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    // The false statements the old feed made during an outage.
    expect(screen.queryByText('No essays found')).not.toBeInTheDocument();
    expect(screen.queryByText(/0 essays/)).not.toBeInTheDocument();
  });

  it('keeps search and sort off a short list', async () => {
    fromMock.mockReturnValue(makeQueryResult([essay(1)]));
    renderFeed();
    expect(await screen.findByText('Essay 1')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search essays...')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('offers sort at two essays but not yet search', async () => {
    fromMock.mockReturnValue(makeQueryResult([essay(1), essay(2)]));
    renderFeed();
    expect(await screen.findByText('Essay 1')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search essays...')).not.toBeInTheDocument();
  });

  it('offers search once the list is long enough', async () => {
    fromMock.mockReturnValue(makeQueryResult([1, 2, 3, 4, 5, 6].map(essay)));
    renderFeed();
    expect(await screen.findByText('Essay 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search essays...')).toBeInTheDocument();
  });
});
