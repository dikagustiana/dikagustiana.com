import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { useBookCategories } from '@/hooks/queries/useBooks';
import { ErrorState, LoadingState } from '@/components/states';

const categoryLabel = (category: string) =>
  category.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function BooksAcademia() {
  const { data: categories, isLoading, error, refetch } = useBookCategories();

  return (
    <PageLayout
      width="reading"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Books' }
      ]}
    >
      <SEO
        title="Books"
        description="Books read for this site's work, by subject."
      />

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Books
          </h1>
          <p className="text-muted-foreground mb-8">
            Books read for this site's work, by subject.
          </p>

          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState
              title="Couldn't load the books"
              message="The book list could not be fetched just now. This is a temporary failure, not an empty shelf."
              onRetry={() => refetch()}
            />
          ) : categories && categories.length > 0 ? (
            <ul className="divide-y divide-border border-y border-border">
              {categories.map(({ category, count }) => (
                <li key={category}>
                  <Link
                    to={`/books/${category}`}
                    className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <span className="text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                      {categoryLabel(category)}
                    </span>
                    <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                      {count} {count === 1 ? 'book' : 'books'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No books added yet.</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
