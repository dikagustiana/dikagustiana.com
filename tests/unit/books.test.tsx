/**
 * Books on shelves (site cleanup 2026-10, PRD §D): the pure part of the hooks (grouping, the save rules the
 * database also checks, the excerpt, the slug), then the public page over a mocked data hook (shelves that
 * open and close, the first open on a first visit and the reader's choice remembered, a card opening the
 * dialog that the URL names, Download for a free book and Buy for a paid one, a deep link, the empty
 * state), then the old addresses landing on their shelf and book.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { Book, BookDraft, Shelf, ShelfWithBooks } from '@/hooks/queries/useBooks';

const { useShelvesMock, useBookByIdMock, auth } = vi.hoisted(() => ({
  useShelvesMock: vi.fn(),
  useBookByIdMock: vi.fn(),
  auth: { isAdmin: false },
}));
vi.mock('@/hooks/queries/useBooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/queries/useBooks')>()),
  useShelves: useShelvesMock,
  useBookById: useBookByIdMock,
}));
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/SEO', () => ({ SEO: ({ title }: { title: string }) => <meta data-seo-title={title} /> }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: auth.isAdmin, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import { bookErrors, excerptOf, groupShelves, slugify } from '@/hooks/queries/useBooks';
import BooksAcademia from '@/pages/BooksAcademia';
import { BookRedirect, BooksCategoryRedirect } from '@/pages/BookRedirects';
import { OPEN_SHELVES_KEY } from '@/lib/books';

const book = (over: Partial<Book>): Book => ({
  id: over.slug ?? 'b',
  slug: 'b',
  title: 'B',
  author: null,
  year: null,
  shelf_id: 's1',
  access: 'free',
  purchase_url: null,
  license_note: 'CC BY 4.0',
  filepath: 'files/b/1-b.pdf',
  filename: 'b.pdf',
  mime_type: 'application/pdf',
  size_bytes: 10,
  cover_path: null,
  synopsis_json: null,
  synopsis_html: null,
  synopsis_excerpt: null,
  sort_order: 0,
  published: true,
  deleted_at: null,
  ...over,
});

const SHELVES: Shelf[] = [
  { id: 's2', slug: 'accounting', name: 'Accounting', sort_order: 1 },
  { id: 's1', slug: 'corporate-finance', name: 'Corporate Finance', sort_order: 0 },
  { id: 's3', slug: 'empty', name: 'Empty', sort_order: 2 },
];
const BOOKS: Book[] = [
  book({ slug: 'valuation', title: 'Valuation', author: 'A. Damodaran', year: 2012, sort_order: 1, synopsis_html: '<p>How to value a <strong>firm</strong>.</p><script>alert(1)</script>', synopsis_excerpt: 'How to value a firm.' }),
  book({ slug: 'open-finance', title: 'Open Finance', sort_order: 0, license_note: 'CC BY 4.0' }),
  book({ slug: 'advanced-accounting', title: 'Advanced Accounting', shelf_id: 's2', access: 'paid', purchase_url: 'https://example.com/buy', filepath: null, filename: null, license_note: null }),
  book({ slug: 'draft-book', title: 'Draft Book', published: false, sort_order: 2 }),
  book({ slug: 'gone-book', title: 'Gone', deleted_at: '2026-10-01T00:00:00Z' }),
];

describe('the books data', () => {
  it('groups live books under their shelves in order; readers see published books and only shelves that hold one', () => {
    const readers = groupShelves(SHELVES, BOOKS, true);
    expect(readers.map((s) => s.slug)).toEqual(['corporate-finance', 'accounting']);
    expect(readers[0].books.map((b) => b.slug)).toEqual(['open-finance', 'valuation']);
    const admin = groupShelves(SHELVES, BOOKS, false);
    expect(admin.map((s) => s.slug)).toEqual(['corporate-finance', 'accounting', 'empty']);
    expect(admin[0].books.map((b) => b.slug)).toEqual(['open-finance', 'valuation', 'draft-book']);
  });

  const draft = (over: Partial<BookDraft>): BookDraft => ({
    title: 'T',
    slug: 't',
    author: '',
    year: '',
    shelf_id: 's1',
    access: 'free',
    license_note: 'CC BY 4.0',
    purchase_url: '',
    published: false,
    file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
    filepath: null,
    cover: null,
    cover_path: null,
    synopsis_json: null,
    synopsis_html: null,
    ...over,
  });

  it('holds a free book to a file and its redistribution basis, and a paid one to an https link and no file', () => {
    expect(bookErrors(draft({}))).toEqual({});
    expect(bookErrors(draft({ license_note: '  ' }))).toHaveProperty('license_note');
    expect(bookErrors(draft({ file: null }))).toHaveProperty('file');
    expect(bookErrors(draft({ file: null, filepath: 'files/t/1-a.pdf' }))).toEqual({});
    expect(bookErrors(draft({ file: new File(['x'], 'a.docx', { type: 'application/msword' }) }))).toHaveProperty('file');
    const paid = draft({ access: 'paid', file: null, license_note: '' });
    expect(bookErrors(paid)).toHaveProperty('purchase_url');
    expect(bookErrors({ ...paid, purchase_url: 'http://example.com' })).toHaveProperty('purchase_url');
    expect(bookErrors({ ...paid, purchase_url: 'https://example.com/b' })).toEqual({});
    expect(bookErrors(draft({ title: '', slug: 'Bad Slug', shelf_id: '', year: '20x3' }))).toEqual(
      expect.objectContaining({ title: expect.any(String), slug: expect.any(String), shelf_id: expect.any(String), year: expect.any(String) }),
    );
    expect(bookErrors(draft({}), ['t'])).toHaveProperty('slug', 'Another book has this slug.');
    const big = new File(['x'], 'c.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
    expect(bookErrors(draft({ cover: big }))).toHaveProperty('cover', 'At most 2 MB.');
  });

  it('makes the excerpt the synopsis as plain text, cut at a word near 240 characters, and a slug from a title', () => {
    expect(excerptOf('<p>One <em>two</em></p><ul><li>three</li></ul>')).toBe('One two three');
    expect(excerptOf('<p></p>')).toBeNull();
    const long = excerptOf(`<p>${'word '.repeat(100)}</p>`)!;
    expect(long.length).toBeLessThanOrEqual(241);
    expect(long.endsWith('word…')).toBe(true);
    expect(slugify('Valuation: Measuring & Managing (7th ed.)')).toBe('valuation-measuring-managing-7th-ed');
    expect(slugify('Économie verte')).toBe('economie-verte');
  });
});

describe('the Books page', () => {
  const shelves: ShelfWithBooks[] = groupShelves(SHELVES, BOOKS, true);

  const renderPage = (url = '/books-academia') => {
    const router = createMemoryRouter([{ path: '/books-academia', element: <BooksAcademia /> }], { initialEntries: [url] });
    render(<RouterProvider router={router} />);
    return router;
  };
  const shelfButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

  beforeEach(() => {
    window.localStorage.clear();
    auth.isAdmin = false;
    useShelvesMock.mockReturnValue({ data: shelves, isLoading: false, error: null, refetch: vi.fn() });
  });
  afterEach(() => vi.restoreAllMocks());

  it('opens the first shelf on a first visit, the rest closed, and remembers what the reader opens and closes', async () => {
    renderPage();
    await waitFor(() => expect(shelfButton('Corporate Finance')).toHaveAttribute('aria-expanded', 'true'));
    expect(shelfButton('Accounting')).toHaveAttribute('aria-expanded', 'false');
    expect(shelfButton('Corporate Finance')).toHaveTextContent('2 books');
    expect(shelfButton('Accounting')).toHaveTextContent('1 book');
    expect(screen.getByRole('button', { name: /Valuation/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Advanced Accounting/ })).toBeNull();
    // Unpublished and removed books, and the empty shelf, are not there.
    expect(screen.queryByText('Draft Book')).toBeNull();
    expect(screen.queryByText('Gone')).toBeNull();
    expect(screen.queryByText('Empty')).toBeNull();

    await userEvent.click(shelfButton('Accounting'));
    expect(shelfButton('Accounting')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(shelfButton('Corporate Finance'));
    expect(shelfButton('Corporate Finance')).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(window.localStorage.getItem(OPEN_SHELVES_KEY)!)).toEqual(['accounting']);
  });

  it('opens the shelves the reader left open on the next visit', async () => {
    window.localStorage.setItem(OPEN_SHELVES_KEY, JSON.stringify(['accounting']));
    renderPage();
    await waitFor(() => expect(shelfButton('Accounting')).toHaveAttribute('aria-expanded', 'true'));
    expect(shelfButton('Corporate Finance')).toHaveAttribute('aria-expanded', 'false');
  });

  it('works when storage refuses', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderPage();
    await waitFor(() => expect(shelfButton('Corporate Finance')).toHaveAttribute('aria-expanded', 'true'));
    await userEvent.click(shelfButton('Accounting'));
    expect(shelfButton('Accounting')).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a book in a dialog the URL names, with Download for a free book and its licence, and closes it', async () => {
    const router = renderPage();
    const card = await screen.findByRole('button', { name: /Valuation/ });
    expect(card).toHaveTextContent('A. Damodaran · 2012');
    expect(card).toHaveTextContent('How to value a firm.');
    expect(card).toHaveTextContent('Free');
    await userEvent.click(card);
    expect(new URLSearchParams(router.state.location.search).get('book')).toBe('valuation');
    expect(router.state.historyAction).toBe('REPLACE');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Valuation' })).toBeInTheDocument();
    expect(within(dialog).getByText('A. Damodaran · 2012 · Corporate Finance')).toBeInTheDocument();
    const download = within(dialog).getByRole('link', { name: /Download PDF/ });
    expect(download).toHaveAttribute('download');
    expect(download.getAttribute('href')).toContain('files/b/1-b.pdf');
    expect(within(dialog).getByText('License: CC BY 4.0')).toBeInTheDocument();
    // The synopsis is the owner's HTML through the sanitiser.
    const synopsis = dialog.querySelector('[data-synopsis]')!;
    expect(synopsis.innerHTML).toContain('<strong>firm</strong>');
    expect(synopsis.innerHTML).not.toContain('script');
    expect(document.querySelector('meta[data-seo-title]')).toHaveAttribute('data-seo-title', 'Valuation');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(new URLSearchParams(router.state.location.search).has('book')).toBe(false);
  });

  it('opens a paid book from a deep link, its shelf too, with Buy opening the purchase URL in a new tab and no download', async () => {
    renderPage('/books-academia?book=advanced-accounting');
    const dialog = await screen.findByRole('dialog');
    const buy = within(dialog).getByRole('link', { name: 'Buy Advanced Accounting (opens in a new tab)' });
    expect(buy).toHaveAttribute('href', 'https://example.com/buy');
    expect(buy).toHaveAttribute('target', '_blank');
    expect(buy).toHaveAttribute('rel', 'noopener noreferrer');
    expect(buy).toHaveTextContent('Buy ↗');
    expect(within(dialog).queryByRole('link', { name: /Download/ })).toBeNull();
    expect(within(dialog).queryByText(/License/)).toBeNull();
    // Behind the modal dialog the page is hidden from the accessibility tree; its shelf is open.
    await waitFor(() => expect(screen.getByRole('button', { name: /^Accounting/, hidden: true })).toHaveAttribute('aria-expanded', 'true'));
  });

  it('opens the shelf a link names', async () => {
    renderPage('/books-academia?shelf=accounting');
    await waitFor(() => expect(shelfButton('Accounting')).toHaveAttribute('aria-expanded', 'true'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says quietly that the shelves are empty, and offers the admin a way to add a book', async () => {
    useShelvesMock.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('No books on the shelves yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Add a book/ })).toBeNull();
    act(() => {
      auth.isAdmin = true;
    });
    const router = createMemoryRouter([{ path: '/books-academia', element: <BooksAcademia /> }], { initialEntries: ['/books-academia'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('link', { name: 'Add a book →' })).toHaveAttribute('href', '/admin/books');
  });

  it('says the books could not load, not that there are none, when the read fails', () => {
    useShelvesMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('down'), refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("Couldn't load the books")).toBeInTheDocument();
    expect(screen.queryByText('No books on the shelves yet.')).toBeNull();
  });
});

describe('the old Books addresses', () => {
  const land = async (url: string) => {
    const router = createMemoryRouter(
      [
        { path: '/books/:category', element: <BooksCategoryRedirect /> },
        { path: '/books/:category/:bookId/read', element: <BookRedirect /> },
        { path: '/books-academia', element: <p>books page</p> },
      ],
      { initialEntries: [url] },
    );
    const view = render(<RouterProvider router={router} />);
    await within(view.container).findByText('books page');
    view.unmount();
    return `${router.state.location.pathname}${router.state.location.search}`;
  };

  it('sends /books/:category to its shelf', async () => {
    useBookByIdMock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    expect(await land('/books/corporate-finance')).toBe('/books-academia?shelf=corporate-finance');
  });

  it('sends /books/:category/:id/read to its book, or to its shelf when the book is not found', async () => {
    useBookByIdMock.mockReturnValue({ data: { id: 'x1', slug: 'valuation' }, isLoading: false, isError: false });
    expect(await land('/books/corporate-finance/x1/read')).toBe('/books-academia?book=valuation');
    useBookByIdMock.mockReturnValue({ data: null, isLoading: false, isError: false });
    expect(await land('/books/corporate-finance/x2/read')).toBe('/books-academia?shelf=corporate-finance');
  });
});
