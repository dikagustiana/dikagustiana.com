/**
 * /books-academia/:slug/read: a free book read in the page (docs/books/R2-RUNBOOK.md). The file is in a
 * private bucket; the `book-file` edge function signs an hour's URL for whoever RLS lets see the book (a
 * published, live book, or any book for the admin), and the reader streams from it: pdf.js for a PDF,
 * epub.js for an EPUB, each in its own chunk so the shelves never load either. A book that is not there, or
 * not free, says so with a way back. Not indexed: the book's page is its dialog on /books-academia.
 */
import { lazy, Suspense, useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { signedBookUrl } from '@/lib/bookFile';
import { readerKind, titleFromFilename } from '@/lib/bookReader';

const PdfReader = lazy(() => import('@/components/books/reader/PdfReader'));
const EpubReader = lazy(() => import('@/components/books/reader/EpubReader'));

export default function BookReader() {
  const { slug = '' } = useParams();
  const [failed, setFailed] = useState<string | null>(null);
  const onError = useCallback((m: string) => setFailed(m), []);
  const signed = useQuery({
    queryKey: ['books', 'file', slug, 'inline'],
    queryFn: () => signedBookUrl(slug, 'inline'),
    // The URL lives an hour; a fresh one well before that, never one mid-read.
    staleTime: 45 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const result = signed.data;
  const title = result?.ok ? titleFromFilename(result.filename, slug) : slug;
  const bookUrl = `/books-academia?book=${encodeURIComponent(slug)}`;

  const download = async () => {
    const d = await signedBookUrl(slug, 'download');
    if (d.ok) window.location.assign(d.url);
    else setFailed(d.message);
  };

  return (
    <PageLayout width="reading" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Books', path: '/books-academia' }, { label: title }]}>
      <SEO title={title} description={`Read ${title} on this site.`} noindex />
      <div className={`${PAGE_COLUMN.reading} py-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to={bookUrl} className="inline-flex items-center text-sm text-accent hover:underline">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            About this book
          </Link>
          {result?.ok && (
            <Button type="button" variant="outline" size="sm" onClick={download}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download
            </Button>
          )}
        </div>
        <h1 className="mb-4 font-display text-2xl font-bold leading-tight md:text-3xl">{title}</h1>

        {signed.isLoading ? (
          <LoadingState />
        ) : !result?.ok || failed ? (
          result && !result.ok && result.reason === 'not_found' ? (
            <div>
              <p className="text-muted-foreground">This book is not available to read here.</p>
              <Link to="/books-academia" className="mt-3 inline-block text-sm text-accent hover:underline">
                Back to the shelves →
              </Link>
            </div>
          ) : (
            <ErrorState
              title="Couldn't open the book"
              message={failed ?? (result && !result.ok ? result.message : 'The book could not be opened just now.')}
              onRetry={() => {
                setFailed(null);
                void signed.refetch();
              }}
            />
          )
        ) : (
          <Suspense fallback={<LoadingState />}>
            {readerKind(result.contentType, result.filename) === 'epub' ? (
              <EpubReader url={result.url} title={title} onError={onError} />
            ) : (
              <PdfReader url={result.url} title={title} onError={onError} />
            )}
          </Suspense>
        )}
      </div>
    </PageLayout>
  );
}
