/**
 * /books-academia: books as spines on shelves (docs/prd/library-phase-2 §3, Shelf; earlier, site cleanup
 * 2026-10, PRD §D).
 *
 * One run of spines per shelf, in the shelves' order, each under its name and count (Shelf.tsx); a sort
 * control re-files the same books by year (a run per decade) or by author (a run per initial). The sort is in
 * the URL, ?sort=year|author, the default (by shelf) leaving it out. A spine opens its book's dialog, which the
 * URL names, /books-academia?book=<slug> (D3, X5): opening it replaces the URL's entry rather than adding one,
 * and closing it takes the parameter away. ?shelf=<slug> brings that shelf into view (the old /books/:category
 * links land there, D8). Only shelves holding a published book are shown (D7); private (unpublished) books
 * never reach a reader, by RLS. With none, the page says so quietly, and the admin gets a link to add one.
 *
 * The page's foot credits Gloss, whose library the shelf is adapted from, with permission (§4, Credit).
 */
import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { BookDialog } from '@/components/books/BookDialog';
import { Shelf } from '@/components/books/Shelf';
import { useAuth } from '@/contexts/AuthContext';
import { useShelfBooks, type Book } from '@/hooks/queries/useBooks';
import { SHELF_SORTS, groupBooks, parseSort, type ShelfSort } from '@/lib/spines';
import { cn } from '@/lib/utils';

const DESCRIPTION = "Books read for this site's work, by subject.";
const GLOSS_URL = 'https://github.com/Nutlope/gloss';

export default function BooksAcademia() {
  const { data: shelves, isLoading, error, refetch } = useShelfBooks();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const shelfParam = params.get('shelf');
  const bookParam = params.get('book');
  const sort = parseSort(params.get('sort'));

  const groups = useMemo(() => (shelves ? groupBooks(shelves, sort) : []), [shelves, sort]);

  const found = useMemo(() => {
    if (!shelves || !bookParam) return null;
    for (const s of shelves) {
      const b = s.books.find((x) => x.slug === bookParam);
      if (b) return { book: b, shelf: s };
    }
    return null;
  }, [shelves, bookParam]);

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const openBook = useCallback((book: Book) => setParam('book', book.slug), [setParam]);
  const closeBook = useCallback(() => setParam('book', null), [setParam]);
  const setSort = (s: ShelfSort) => setParam('sort', s === 'shelf' ? null : s);

  const book = found?.book ?? null;
  const count = shelves?.reduce((n, s) => n + s.books.length, 0) ?? 0;

  return (
    <PageLayout width="wide" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Books' }]}>
      <SEO title={book ? (book.title ?? 'Books') : 'Books'} description={book?.synopsis_excerpt ?? DESCRIPTION} />

      <div className={`${PAGE_COLUMN.wide} py-8`}>
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
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-border pb-4">
              <span id="shelf-sort-label" className="text-sm text-muted-foreground">
                Sort by
              </span>
              <div role="radiogroup" aria-labelledby="shelf-sort-label" className="inline-flex rounded-md border border-border p-0.5">
                {SHELF_SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={sort === s.key}
                    onClick={() => setSort(s.key)}
                    className={cn(
                      'rounded-[5px] px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                      sort === s.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {count} {count === 1 ? 'book' : 'books'}
              </span>
            </div>
            <Shelf groups={groups} onOpen={openBook} scrollTo={sort === 'shelf' ? (shelfParam ?? found?.shelf.slug ?? null) : null} />
          </>
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

        <p data-credit className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
          Shelf and margin design adapted from{' '}
          <a href={GLOSS_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Gloss
          </a>{' '}
          by Hassan El Mghari, with permission.
        </p>
      </div>

      <BookDialog book={book} shelfName={found?.shelf.name ?? null} onClose={closeBook} />
    </PageLayout>
  );
}
