/**
 * A book's cover page (docs/prd/library-phase-2 §3, Cover page; src/pages/BookCoverPage.tsx): the generated
 * cover on the shelf's colour, title, author · year · shelf, Read and Download for a free book, Buy for a paid
 * one, the licence line, the synopsis through the sanitiser, "Cited by", and the not-found state.
 */
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Book, Shelf } from '@/hooks/queries/useBooks';

const { useBookMock, useCitedByMock } = vi.hoisted(() => ({ useBookMock: vi.fn(), useCitedByMock: vi.fn() }));
vi.mock('@/hooks/queries/useBooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/queries/useBooks')>()),
  useBook: useBookMock,
  useCitedBy: useCitedByMock,
}));
vi.mock('@/components/layouts/PageLayout', () => ({ PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({
  SEO: ({ title, noindex }: { title: string; noindex?: boolean }) => <meta data-seo-title={title} data-noindex={String(!!noindex)} />,
}));

import { withSpines } from '@/hooks/queries/useBooks';
import BookCoverPage from '@/pages/BookCoverPage';

const SHELF: Shelf = { id: 's1', slug: 'tan-malaka', name: 'Tan Malaka', sort_order: 0 };
const row = (over: Partial<Book>): Book => ({
  id: 'b1', slug: 'menuju-republik', title: 'Menuju Republik Indonesia', author: 'Tan Malaka', year: 1925, shelf_id: 's1', access: 'free',
  purchase_url: null, license_note: 'Public domain', filepath: 'files/m/1-m.pdf', file_store: 'r2', filename: 'm.pdf', mime_type: 'application/pdf',
  size_bytes: 344_379, cover_path: null, synopsis_json: null, synopsis_html: '<p>A plan for a <em>republic</em>.</p><img src=x onerror=alert(1)>',
  synopsis_excerpt: 'A plan for a republic.', sort_order: 0, published: true, deleted_at: null, ...over,
});
const spined = (b: Book) => withSpines([{ ...SHELF, books: [b] }], [SHELF])[0].books[0];

const renderAt = (slug = 'menuju-republik') =>
  render(
    <MemoryRouter initialEntries={[`/books-academia/${slug}`]}>
      <Routes>
        <Route path="/books-academia/:slug" element={<BookCoverPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('the cover page', () => {
  beforeEach(() => {
    useCitedByMock.mockReturnValue({ data: [] });
  });

  it('shows a free book with its generated cover, Read, Download and its licence', () => {
    const book = spined(row({}));
    useBookMock.mockReturnValue({ data: { book, shelf: SHELF }, isLoading: false, error: null, refetch: vi.fn() });
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Menuju Republik Indonesia' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tan Malaka' })).toHaveAttribute('href', '/books-academia?shelf=tan-malaka');
    expect(screen.getByText(/Tan Malaka · 1925/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/books-academia/menuju-republik/read');
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(screen.getByText('License: Public domain')).toBeInTheDocument();
    const cover = document.querySelector<HTMLElement>('[data-cover]')!;
    expect(cover).toHaveTextContent('Menuju Republik Indonesia');
    expect(cover.style.background).not.toBe('');
    const synopsis = document.querySelector('[data-synopsis]')!;
    expect(synopsis.innerHTML).toContain('<em>republic</em>');
    expect(synopsis.innerHTML).not.toContain('onerror');
    expect(document.querySelector('meta[data-seo-title]')).toHaveAttribute('data-seo-title', 'Menuju Republik Indonesia');
    expect(screen.queryByRole('heading', { name: 'Cited by' })).toBeNull();
  });

  it('shows a paid book with Buy in a new tab, and no Read, Download or licence', () => {
    const book = spined(row({ access: 'paid', purchase_url: 'https://example.com/buy', filepath: null, license_note: null }));
    useBookMock.mockReturnValue({ data: { book, shelf: SHELF }, isLoading: false, error: null, refetch: vi.fn() });
    renderAt();
    const buy = screen.getByRole('link', { name: 'Buy Menuju Republik Indonesia (opens in a new tab)' });
    expect(buy).toHaveAttribute('href', 'https://example.com/buy');
    expect(buy).toHaveAttribute('target', '_blank');
    expect(buy).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('link', { name: 'Read' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Download/ })).toBeNull();
    expect(screen.queryByText(/License/)).toBeNull();
  });

  it('lists the essays that cite the book', () => {
    useBookMock.mockReturnValue({ data: { book: spined(row({})), shelf: SHELF }, isLoading: false, error: null, refetch: vi.fn() });
    useCitedByMock.mockReturnValue({ data: [{ title: 'Madilog and method', href: '/essays/madilog' }, { title: 'Unplaced', href: null }] });
    renderAt();
    const section = screen.getByRole('region', { name: 'Cited by' });
    expect(within(section).getByRole('link', { name: 'Madilog and method' })).toHaveAttribute('href', '/essays/madilog');
    expect(within(section).getByText('Unplaced')).toBeInTheDocument();
  });

  it('says a hidden or missing book is not on the shelves, not indexed, with a way back', () => {
    useBookMock.mockReturnValue({ data: null, isLoading: false, error: null, refetch: vi.fn() });
    renderAt('draft');
    expect(screen.getByRole('heading', { name: 'Not on the shelves' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the shelves →' })).toHaveAttribute('href', '/books-academia');
    expect(document.querySelector('meta[data-seo-title]')).toHaveAttribute('data-noindex', 'true');
  });
});
