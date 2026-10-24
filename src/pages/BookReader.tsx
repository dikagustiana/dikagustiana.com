/**
 * /books-academia/:slug/read: a free book read the way an e-reader shows it (docs/books/R2-RUNBOOK.md). The
 * reader takes the whole window, without the site's header and footer: a thin bar with the title, where the
 * reader is, Download, full screen and close, over a dark stage that holds one page at a time.
 *
 * The file is in a private bucket; the `book-file` edge function signs an hour's URL for whoever RLS lets see
 * the book (a published, live book, or any book for the admin), and the reader streams from it: pdf.js for a
 * PDF, epub.js for an EPUB, each in its own chunk so the shelves never load either. Esc or ✕ goes back to the
 * book's dialog; F or ⛶ asks the browser for true full screen, where the browser supports it (not an iPhone).
 * A book that is not there, or not free, says so with a way back. Not indexed: the book's page is its dialog.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Maximize, Minimize, X } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { signedBookUrl } from '@/lib/bookFile';
import { isTypingTarget, readerKind, titleFromFilename } from '@/lib/bookReader';

const PdfReader = lazy(() => import('@/components/books/reader/PdfReader'));
const EpubReader = lazy(() => import('@/components/books/reader/EpubReader'));

const barButton = 'h-9 text-neutral-200 hover:bg-white/10 hover:text-white';

export default function BookReader() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const shellRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [full, setFull] = useState(false);
  const [canFull] = useState(() => typeof document !== 'undefined' && !!document.fullscreenEnabled);
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

  // The page under the reader does not scroll while it is open.
  useEffect(() => {
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = was;
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    else void shellRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  // Esc closes the reader (in browser full screen the browser takes Esc first, to leave full screen); F toggles it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      if (e.key === 'Escape' && !document.fullscreenElement) navigate(bookUrl);
      else if ((e.key === 'f' || e.key === 'F') && canFull) {
        e.preventDefault();
        toggleFull();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, bookUrl, canFull, toggleFull]);

  const download = async () => {
    const d = await signedBookUrl(slug, 'download');
    if (d.ok) window.location.assign(d.url);
    else setFailed(d.message);
  };

  const retry = () => {
    setFailed(null);
    void signed.refetch();
  };

  return (
    <div ref={shellRef} data-reader className="fixed inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100">
      <SEO title={title} description={`Read ${title} on this site.`} noindex />
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:px-4">
        <Button asChild variant="ghost" size="icon" className={barButton}>
          <Link to={bookUrl} aria-label="Close the reader" title="Close (Esc)">
            <X className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold sm:text-lg">{title}</h1>
        {/* The one live status: read out at every width, shown here from sm up; on a phone it is shown under the page. */}
        <p className="sr-only shrink-0 text-sm text-neutral-400 sm:not-sr-only" aria-live="polite">
          {status}
        </p>
        {result?.ok && (
          <Button type="button" variant="ghost" size="sm" className={barButton} onClick={download} title="Download">
            <Download className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Download</span>
          </Button>
        )}
        {canFull && (
          <Button type="button" variant="ghost" size="icon" className={barButton} onClick={toggleFull} aria-label={full ? 'Leave full screen' : 'Full screen'} title={full ? 'Leave full screen (F)' : 'Full screen (F)'}>
            {full ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
          </Button>
        )}
      </header>

      <main className="relative min-h-0 flex-1 p-2 sm:p-4">
        {signed.isLoading ? (
          <Centered>
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </Centered>
        ) : result && !result.ok && result.reason === 'not_found' ? (
          <Centered>
            <p className="text-neutral-300">This book is not available to read here.</p>
            <Link to="/books-academia" className="mt-3 text-sm text-sky-300 hover:underline">
              Back to the shelves →
            </Link>
          </Centered>
        ) : !result?.ok || failed ? (
          <Centered>
            <p className="font-semibold">Couldn't open the book</p>
            <p className="mt-1 max-w-sm text-center text-sm text-neutral-400">
              {failed ?? (result && !result.ok ? result.message : 'The book could not be opened just now.')}
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={retry}>
              Try again
            </Button>
          </Centered>
        ) : (
          <Suspense
            fallback={
              <Centered>
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true" />
              </Centered>
            }
          >
            {readerKind(result.contentType, result.filename) === 'epub' ? (
              <EpubReader url={result.url} title={title} slug={slug} onError={onError} onStatus={setStatus} />
            ) : (
              <PdfReader url={result.url} title={title} slug={slug} onError={onError} onStatus={setStatus} />
            )}
          </Suspense>
        )}
      </main>
      {status && (
        <p className="shrink-0 pb-2 text-center text-xs text-neutral-400 sm:hidden" aria-hidden="true">
          {status}
        </p>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center">{children}</div>;
}
