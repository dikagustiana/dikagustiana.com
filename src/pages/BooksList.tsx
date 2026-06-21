import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooks } from '@/hooks/queries/useBooks';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { EmptyState } from '@/components/states/EmptyState';

const formatTitle = (s: string) =>
  s?.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Category';

export default function BooksList() {
  const { category } = useParams<{ category: string }>();
  const { data: books, isLoading, error, refetch } = useBooks({ category });

  const heading = formatTitle(category || '');

  return (
    <PageLayout
      variant="content"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Books and Academia', path: '/books-academia' },
        { label: 'Categories', path: '/books/categories' },
        { label: heading },
      ]}
    >
      <SEO
        title={`${heading} — Books`}
        description={`Books in the ${heading} collection.`}
      />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">{heading}</h1>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !books || books.length === 0 ? (
          <EmptyState
            title="No books yet"
            message="No books have been added to this category."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Link key={book.id} to={`/books/${category}/${book.id}/read`}>
                <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{book.title || book.filename}</CardTitle>
                    <CardDescription>
                      {[book.author, book.year].filter(Boolean).join(' • ') || 'Unknown author'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </PageLayout>
  );
}
