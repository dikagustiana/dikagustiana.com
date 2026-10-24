/**
 * /admin/books (site cleanup 2026-10, PRD D6): the shelves with their counts and a delete that a shelf
 * holding books cannot use, the chosen shelf's books, and the book form, whose Save waits for the rules:
 * a free book's file and licence note, a paid book's https link.
 */
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Book, ShelfWithBooks } from '@/hooks/queries/useBooks';

const { shelvesData } = vi.hoisted(() => ({ shelvesData: { current: [] as unknown[] } }));
vi.mock('@/hooks/queries/useBooks', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/hooks/queries/useBooks')>();
  const idle = () => ({ mutate: vi.fn(), isPending: false });
  return {
    ...real,
    useAdminShelves: () => ({ data: shelvesData.current, isLoading: false, error: null, refetch: vi.fn() }),
    useSaveBook: idle,
    useDeleteBook: idle,
    useSaveShelf: idle,
    useDeleteShelf: idle,
    useReorderShelves: idle,
    useReorderBooks: idle,
  };
});
vi.mock('@/components/layouts/PageLayout', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/components/books/SynopsisEditor', () => ({ SynopsisEditor: () => <div data-synopsis-editor /> }));

import AdminBooks from '@/pages/AdminBooks';

// Radix's switch and radio measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const book: Book = {
  id: 'b1', slug: 'valuation', title: 'Valuation', author: null, year: null, shelf_id: 's1', access: 'paid', purchase_url: 'https://example.com',
  license_note: null, filepath: null, file_store: 'r2', filename: null, mime_type: null, size_bytes: null, cover_path: null, synopsis_json: null, synopsis_html: null,
  synopsis_excerpt: null, sort_order: 0, published: false, deleted_at: null,
};
shelvesData.current = [
  { id: 's1', slug: 'corporate-finance', name: 'Corporate Finance', sort_order: 0, books: [book] },
  { id: 's2', slug: 'accounting', name: 'Accounting', sort_order: 1, books: [] },
] satisfies ShelfWithBooks[];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AdminBooks />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('/admin/books', () => {
  it('lists the shelves and the first shelf\'s books; a shelf with books cannot be deleted', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Books in: Corporate Finance' })).toBeInTheDocument();
    expect(screen.getByText('Valuation')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete the shelf "Corporate Finance"' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete the shelf "Accounting"' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move "Corporate Finance" up' })).toBeDisabled();
  });

  it('keeps Save disabled until a free book has its file and licence note, or a paid book an https link', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Add book/ }));
    const form = screen.getByRole('dialog');
    const save = within(form).getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await userEvent.type(within(form).getByLabelText('Title'), 'Open Finance');
    expect(within(form).getByLabelText('Slug')).toHaveValue('open-finance');
    expect(within(form).getByText(/Why this book can be redistributed/)).toBeInTheDocument();
    await userEvent.upload(within(form).getByLabelText('File'), new File(['%PDF'], 'of.pdf', { type: 'application/pdf' }));
    expect(save).toBeDisabled();
    await userEvent.type(within(form).getByLabelText('License note'), 'CC BY 4.0');
    expect(save).toBeEnabled();

    await userEvent.click(within(form).getByLabelText('Paid (buy link)'));
    expect(within(form).queryByLabelText('License note')).toBeNull();
    expect(save).toBeDisabled();
    await userEvent.type(within(form).getByLabelText('Purchase URL'), 'http://example.com');
    expect(save).toBeDisabled();
    await userEvent.clear(within(form).getByLabelText('Purchase URL'));
    await userEvent.type(within(form).getByLabelText('Purchase URL'), 'https://example.com/buy');
    expect(save).toBeEnabled();
  });
});
