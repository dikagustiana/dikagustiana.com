/**
 * The working paper's section of /accounting/consolidated-reporting (PRD site sweep 2026-10, R4.6, R4.7; site
 * cleanup 2026-10, A4, A11): the heading, the lede, one line saying the figures are dummy, and the viewer.
 * The Method panel and its download are gone.
 *
 * Nothing of the viewer loads with the page. When the section comes within a screen of the viewport, its code
 * (its own chunk) and the workbook JSON (a file in public/, never in a bundle) are fetched together; a link
 * that names a sheet or a cell loads them at once, and opens the page at the viewer, not at the heading,
 * which on a phone would push the cell the link names below the fold. If either fails, the section says so.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { loadWorkbook } from '@/lib/workbook/load';
import type { PublishedWorkbook } from '@/lib/workbook/types';

const loadViewer = () => import('./WorkbookViewer');
const WorkbookViewer = lazy(loadViewer);

/** How far below the viewport the section starts loading. */
const AHEAD = '600px 0px';
/** The viewer's height while it loads, so the page below does not jump when it arrives. */
const HOLD = 'min-h-[min(70vh,44rem)]';

function Loading() {
  return (
    <div role="status" className={`${HOLD} flex items-center justify-center rounded-md border border-border bg-popover text-sm text-muted-foreground`}>
      {COPY.loading}
    </div>
  );
}

function Failed() {
  return (
    <div role="alert" className="rounded-md border border-border bg-popover p-6">
      <p className="font-semibold text-foreground">{COPY.failedTitle}</p>
      <p className="mt-1 text-sm text-muted-foreground">{COPY.failedMessage}</p>
    </div>
  );
}

export function WorkingPaperSection() {
  const [params] = useSearchParams();
  const linked = params.has('sheet') || params.has('cell');
  const anchor = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(linked);
  const [book, setBook] = useState<PublishedWorkbook | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = anchor.current;
    if (!el || typeof IntersectionObserver !== 'function') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: AHEAD },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // Arriving by a link, the page opens at the viewer; only then, not at each move the URL records. The
  // viewer's top is where the placeholder's is, so it can be scrolled to before the viewer arrives. A jump,
  // as a link to a place on a page lands: html's smooth scrolling (src/index.css) would glide the length of
  // the page, and the reader's first click on the way would stop it short.
  useEffect(() => {
    if (linked) anchor.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!near) return;
    const ctrl = new AbortController();
    // The chunk starts on its way beside the JSON; a failure shows when the viewer renders.
    loadViewer().catch(() => undefined);
    loadWorkbook(undefined, ctrl.signal).then(setBook, () => {
      if (!ctrl.signal.aborted) setFailed(true);
    });
    return () => ctrl.abort();
  }, [near]);

  return (
    <section className="mb-14" aria-labelledby="working-paper">
      <h2 id="working-paper" className="mb-1 text-2xl font-bold text-foreground">
        {COPY.heading}
      </h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{COPY.lede}</p>
      <p className="mb-6 mt-1 max-w-3xl text-xs text-muted-foreground">{COPY.disclaimer}</p>
      {/* scroll-mt-20: the site's fixed header is 64px. */}
      <div ref={anchor} data-workbook-viewer className="scroll-mt-20">
        {failed ? (
          <Failed />
        ) : book ? (
          <ErrorBoundary fallback={() => <Failed />}>
            <Suspense fallback={<Loading />}>
              <WorkbookViewer book={book} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <Loading />
        )}
      </div>
    </section>
  );
}
