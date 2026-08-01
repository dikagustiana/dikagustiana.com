import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useBooks } from '@/hooks/queries/useBooks';
import { LoadingState, EmptyState } from '@/components/states';

/**
 * The four categories the library is organised into. Titles are editorial and
 * fixed; the counts are not — they are read from `books_uploads`.
 *
 * This page previously carried hardcoded counts (12, 8, 15, 10) against a table
 * holding zero rows, so it advertised 45 books that do not exist and every card
 * led to an empty list.
 */
const CATEGORIES = [
  { id: 'finance-accounting', title: 'Finance & Accounting' },
  { id: 'academic-temper', title: 'An Academic Temper' },
  { id: 'business-strategy', title: 'Business & Strategy' },
  { id: 'personal-development', title: 'Personal Development' },
];

export default function BooksCategories() {
  const { data: books, isLoading } = useBooks();

  const countFor = (id: string) => (books ?? []).filter(b => b.category === id).length;
  const total = books?.length ?? 0;

  return (
    <PageLayout
      variant="content"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Books and Academia', path: '/books-academia' },
        { label: 'Categories' },
      ]}
    >
      <SEO
        title="Book Categories"
        description="Browse the library by category — finance, accounting, strategy, and academic readings."
      />
      <div className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Book Categories</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse the library by category.
          </p>
        </div>

        {isLoading ? (
          <LoadingState variant="cards" count={4} />
        ) : total === 0 ? (
          <EmptyState
            title="The library is empty"
            message="No books have been uploaded yet. Categories appear here once there is something to put in them."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {CATEGORIES.map(category => {
              const count = countFor(category.id);
              return (
                <Link key={category.id} to={`/books/${category.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader>
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>
                        {count === 1 ? '1 book' : `${count} books`}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
