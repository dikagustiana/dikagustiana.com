import { useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useBook } from '@/hooks/queries/useBooks';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';

const formatTitle = (s: string) =>
  s?.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

export default function BookReader() {
  const { category, bookId } = useParams<{ category: string; bookId: string }>();
  const { data: book, isLoading, error, refetch } = useBook(bookId || '');

  const publicUrl = book?.filepath
    ? supabase.storage.from('books').getPublicUrl(book.filepath).data.publicUrl
    : null;
  const isPdf = (book?.mime_type || '').includes('pdf') || (book?.filename || '').toLowerCase().endsWith('.pdf');
  const heading = book?.title || formatTitle(bookId || '');

  return (
    <PageLayout
      variant="content"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Books and Academia', path: '/books-academia' },
        { label: formatTitle(category || ''), path: `/books/${category}` },
        { label: heading },
      ]}
    >
      <SEO title={`${heading} — Reader`} description={`Read ${heading}.`} />
      <div className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !book ? (
            <ErrorState title="Book not found" message="This book is no longer available." />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h1 className="text-2xl font-display font-bold">{heading}</h1>
                  {(book.author || book.year) && (
                    <p className="text-sm text-muted-foreground">
                      {[book.author, book.year].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
                {publicUrl && (
                  <Button asChild variant="outline">
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                )}
              </div>

              {publicUrl && isPdf ? (
                <iframe
                  src={publicUrl}
                  title={heading}
                  className="w-full aspect-[3/4] rounded-lg border border-border bg-card"
                />
              ) : (
                <div className="bg-card rounded-lg border border-border aspect-[3/4] flex items-center justify-center p-8 text-center">
                  <p className="text-muted-foreground">
                    {publicUrl
                      ? 'Preview is unavailable for this file type. Use the Download button above.'
                      : 'This book has no attached file yet.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
