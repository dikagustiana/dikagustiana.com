/**
 * /books-academia: books on shelves (site cleanup 2026-10, PRD §D; 03-DESIGN §5).
 *
 * Each shelf opens and closes; on a first visit the first is open and the rest closed, and after that the
 * page remembers, per browser, which the reader left open (D1, X4). A book opens in a dialog that the URL
 * names, /books-academia?book=<slug> (D3, X5): opening it replaces the URL's entry rather than adding one,
 * and closing it takes the parameter away, so a link straight to a book opens it, and Back from a page that
 * linked here closes it. ?shelf=<slug> opens that shelf and brings it into view (the old /books/:category
 * links land there, D8). Only shelves holding a published book are shown (D7); with none, the page says so
 * quietly, and the admin gets a link to add one.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { BookDialog } from '@/components/books/BookDialog';
import { Shelf } from '@/components/books/Shelf';
import { useAuth } from '@/contexts/AuthContext';
import { useShelves, type Book } from '@/hooks/queries/useBooks';
import { readOpenShelves, writeOpenShelves } from '@/lib/books';

const DESCRIPTION = "Books read for this site's work, by subject.";

export default function BooksAcademia() {
  const { data: shelves, isLoading, error, refetch } = useShelves();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const shelfParam = params.get('shelf');
  const bookParam = params.get('book');

  // Which shelves are open: null until the shelves are known.
  const [open, setOpen] = useState<string[] | null>(null);
  useEffect(() => {
    if (!shelves || open !== null) return;
    setOpen(readOpenShelves() ?? (shelves[0] ? [shelves[0].slug] : []));
  }, [shelves, open]);

  // A link to a shelf (or to a book) opens its shelf; a link to a shelf brings it into view.
  const found = useMemo(() => {
    if (!shelves || !bookParam) return null;
    for (const s of shelves) {
      const b = s.books.find((x) => x.slug === bookParam);
      if (b) return { book: b, shelf: s };
    }
    return null;
  }, [shelves, bookParam]);
  const linkedShelf = shelfParam ?? found?.shelf.slug ?? null;
  useEffect(() => {
    if (!linkedShelf || open === null || !shelves?.some((s) => s.slug === linkedShelf)) return;
    if (!open.includes(linkedShelf)) setOpen([...open, linkedShelf]);
    if (shelfParam) requestAnimationFrame(() => document.getElementById(`shelf-${linkedShelf}`)?.scrollIntoView?.({ block: 'start' }));
    // Only when the link changes, not at each open or close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedShelf, open === null, shelves]);

  const setShelfOpen = (slug: string, isOpen: boolean) => {
    const next = isOpen ? [...new Set([...(open ?? []), slug])] : (open ?? []).filter((s) => s !== slug);
    setOpen(next);
    writeOpenShelves(next);
  };

  const openBook = useCallback(
    (book: Book) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('book', book.slug);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const closeBook = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('book');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const book = found?.book ?? null;

  return (
    <PageLayout width="reading" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Books' }]}>
      <SEO title={book ? (book.title ?? 'Books') : 'Books'} description={book?.synopsis_excerpt ?? DESCRIPTION} />

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <h1 className="mb-4 font-display text-3xl font-bold md:text-4xl">Books</h1>
        <p className="mb-8 text-muted-foreground">{DESCRIPTION}</p>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            title="Couldn't load the books"
            message="The shelves could not be fetched just now. This is a temporary failure, not an empty shelf."
            onRetry={() => refetch()}
          />
        ) : shelves && shelves.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {shelves.map((s) => (
              <Shelf key={s.id} shelf={s} open={!!open?.includes(s.slug)} onOpenChange={(o) => setShelfOpen(s.slug, o)} onOpenBook={openBook} />
            ))}
          </ul>
        ) : (
          <>
            <p className="text-muted-foreground">No books on the shelves yet.</p>
            {isAdmin && (
              <Link to="/admin/books" className="mt-3 inline-block text-sm text-accent hover:underline">
                Add a book →
              </Link>
            )}
          </>
        )}
      </div>

      <BookDialog book={book} shelfName={found?.shelf.name ?? null} onClose={closeBook} />
    </PageLayout>
  );
}
