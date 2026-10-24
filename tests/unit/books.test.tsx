/**
 * Books on shelves (site cleanup 2026-10, PRD §D): the pure part of the hooks (grouping, the save rules the
 * database also checks, the excerpt, the slug), then the public page over a mocked data hook (library phase
 * 2: spines on shelves, the arrow keys along a shelf, a spine opening its cover page and the dialog's old
 * address sent there, the sorts, the empty and error states, the credit), then the old addresses landing on
 * their shelf and book. The cover page itself: tests/unit/coverPage.test.tsx.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { Book, BookDraft, Shelf } from '@/hooks/queries/useBooks';

const { useShelfBooksMock, useBookByIdMock, auth } = vi.hoisted(() => ({
  useShelfBooksMock: vi.fn(),
  useBookByIdMock: vi.fn(),
  auth: { isAdmin: false },
}));
vi.mock('@/hooks/queries/useBooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/queries/useBooks')>()),
  useShelfBooks: useShelfBooksMock,
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

import { SLUG_SHAPE, bookErrors, excerptOf, groupShelves, removedSlug, slugify, withSpines } from '@/hooks/queries/useBooks';
import BooksAcademia from '@/pages/BooksAcademia';
import { BookRedirect, BooksCategoryRedirect } from '@/pages/BookRedirects';

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
  file_store: 'r2',
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
    // A removed book frees its slug, and keeps one the database accepts.
    expect(removedSlug('valuation', 1_700_000_000_000)).toBe('valuation-removed-loyw3v28');
    expect(SLUG_SHAPE.test(removedSlug('valuation'))).toBe(true);
  });
});

describe('the Books page', () => {
  const shelves = withSpines(groupShelves(SHELVES, BOOKS, true), SHELVES);

  const renderPage = (url = '/books-academia') => {
    const router = createMemoryRouter(
      [
        { path: '/books-academia', element: <BooksAcademia /> },
        { path: '/books-academia/:slug', element: <p>cover page</p> },
      ],
      { initialEntries: [url] },
    );
    render(<RouterProvider router={router} />);
    return router;
  };
  const spine = (name: string | RegExp) => screen.getByRole('button', { name });
  const shelfOf = (name: string) => screen.getByRole('list', { name });

  beforeEach(() => {
    auth.isAdmin = false;
    // The virtualiser scrolls the window; jsdom has no scrolling.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    useShelfBooksMock.mockReturnValue({ data: shelves, isLoading: false, error: null, refetch: vi.fn() });
  });
  afterEach(() => vi.restoreAllMocks());

  it("stands each shelf's published books as spines under its name and count, and credits Gloss", () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Corporate Finance' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accounting' })).toBeInTheDocument();
    expect(within(shelfOf('Corporate Finance')).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Open Finance',
      'Valuation, A. Damodaran, 2012',
    ]);
    // A paid book says it is bought, not read, here.
    expect(within(shelfOf('Accounting')).getByRole('button')).toHaveAccessibleName('Advanced Accounting, to buy');
    expect(screen.getByText('3 books')).toBeInTheDocument();
    // Unpublished and removed books, and the empty shelf, are not there.
    expect(screen.queryByRole('button', { name: /Draft Book/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Gone/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Empty' })).toBeNull();
    const credit = document.querySelector('[data-credit]')!;
    expect(credit).toHaveTextContent('Shelf and margin design adapted from Gloss by Hassan El Mghari, with permission.');
    expect(within(credit as HTMLElement).getByRole('link', { name: 'Gloss' })).toHaveAttribute('href', 'https://github.com/Nutlope/gloss');
  });

  it('walks along a shelf with the arrow keys, Home and End, one tab stop per shelf', async () => {
    renderPage();
    const first = spine('Open Finance');
    const second = spine(/^Valuation/);
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    expect(spine(/^Advanced Accounting/)).toHaveAttribute('tabindex', '0');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute('tabindex', '0');
    expect(first).toHaveAttribute('tabindex', '-1');
    // The end of a shelf stops there; it does not run on into the next.
    await userEvent.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(first).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(second).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(first).toHaveFocus();
  });

  it("opens a book on its cover page, and sends the dialog's old address there too", async () => {
    const router = renderPage();
    await userEvent.click(spine(/^Valuation/));
    expect(router.state.location.pathname).toBe('/books-academia/valuation');
    const old = renderPage('/books-academia?book=advanced-accounting');
    expect(old.state.location.pathname).toBe('/books-academia/advanced-accounting');
    expect(old.state.historyAction).toBe('REPLACE');
  });

  it('re-files the books by year and by author, the sort in the URL', async () => {
    const router = renderPage();
    const sorts = screen.getByRole('radiogroup', { name: 'Sort by' });
    expect(within(sorts).getByRole('radio', { name: 'Shelf' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(within(sorts).getByRole('radio', { name: 'Year' }));
    expect(new URLSearchParams(router.state.location.search).get('sort')).toBe('year');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['2010s', 'Undated']);
    await userEvent.click(within(sorts).getByRole('radio', { name: 'Author' }));
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['D', 'Unknown author']);
    await userEvent.click(within(sorts).getByRole('radio', { name: 'Shelf' }));
    expect(new URLSearchParams(router.state.location.search).has('sort')).toBe(false);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Corporate Finance', 'Accounting']);
  });

  it('says quietly that the shelves are empty, and offers the admin a way to add a book', async () => {
    useShelfBooksMock.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() });
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
    useShelfBooksMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('down'), refetch: vi.fn() });
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
        { path: '/books-academia/:slug', element: <p>books page</p> },
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
    expect(await land('/books/corporate-finance/x1/read')).toBe('/books-academia/valuation');
    useBookByIdMock.mockReturnValue({ data: null, isLoading: false, isError: false });
    expect(await land('/books/corporate-finance/x2/read')).toBe('/books-academia?shelf=corporate-finance');
  });
});
