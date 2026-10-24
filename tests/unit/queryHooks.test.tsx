import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { useShelves } from '@/hooks/queries/useBooks';
import { useSelectedEssays } from '@/hooks/queries/useSelectedEssays';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const shelfRow = { id: 's1', slug: 'economics', name: 'Economics', sort_order: 0 };
const bookRow = {
  id: 'b1',
  slug: 'the-wealth-of-nations',
  shelf_id: 's1',
  access: 'free',
  license_note: 'Public domain',
  filepath: 'files/the-wealth-of-nations/1-y.pdf',
  filename: 'y.pdf',
  mime_type: 'application/pdf',
  title: 'The Wealth of Nations',
  author: 'Adam Smith',
  cover_path: null,
  size_bytes: 1234,
  year: 1776,
  sort_order: 0,
  published: true,
  deleted_at: null,
};

beforeEach(() => fromMock.mockReset());

describe('useShelves', () => {
  it('returns the shelves from book_shelves with their books from books_uploads', async () => {
    fromMock.mockImplementation((table: string) => makeQueryResult(table === 'book_shelves' ? [shelfRow] : [bookRow]));
    const { result } = renderHook(() => useShelves(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('book_shelves');
    expect(fromMock).toHaveBeenCalledWith('books_uploads');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].books[0].title).toBe('The Wealth of Nations');
  });

  it('surfaces query errors', async () => {
    fromMock.mockReturnValue(makeQueryResult(null, { message: 'boom' }));
    const { result } = renderHook(() => useShelves(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useSelectedEssays — the one featuring mechanism', () => {
  it('queries the essays table and returns selected rows', async () => {
    const essay = {
      id: 'e1',
      slug: 's',
      title: 'T',
      snippet: null,
      section: 'next-big-thing',
      phase: null,
      author: 'A',
      read_time: '5 min',
    };
    fromMock.mockReturnValue(makeQueryResult([essay]));
    const { result } = renderHook(() => useSelectedEssays(4), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('essays');
    expect(result.current.data?.[0].title).toBe('T');
  });
});
