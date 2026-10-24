/**
 * /books-academia/:slug — a book's canonical page (docs/prd/library-phase-2 §1 Acceptance, §3 Cover page):
 * its cover, what it is, and Read/Download or Buy (CoverPage.tsx). The reader stays at
 * /books-academia/:slug/read and closes back to here. A book RLS hides (unpublished, removed) or that is not
 * there says so, with a way back to the shelves.
 */
import { Link, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { CoverPage } from '@/components/books/CoverPage';
import { useBook, useCitedBy } from '@/hooks/queries/useBooks';

export default function BookCoverPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useBook(slug);
  const cited = useCitedBy(data?.book.id);
  const title = data?.book.title ?? data?.book.slug ?? 'Book';

  return (
    <PageLayout width="wide" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Books', path: '/books-academia' }, { label: data ? title : 'Book' }]}>
      <SEO title={data ? title : 'Books'} description={data?.book.synopsis_excerpt ?? undefined} noindex={!isLoading && !data} />
      <div className={`${PAGE_COLUMN.wide} py-8`}>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState title="Couldn't load the book" message="The book could not be fetched just now. Try again in a moment." onRetry={() => refetch()} />
        ) : data ? (
          <CoverPage book={data.book} shelf={data.shelf} citedBy={cited.data ?? []} />
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold">Not on the shelves</h1>
            <p className="mt-3 text-muted-foreground">This book is not available here.</p>
            <Link to="/books-academia" className="mt-4 inline-block text-sm text-accent hover:underline">
              Back to the shelves →
            </Link>
          </>
        )}
      </div>
    </PageLayout>
  );
}
