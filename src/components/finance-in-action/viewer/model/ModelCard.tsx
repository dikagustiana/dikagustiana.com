/**
 * "The model" in one card (chain view, PROMPT-site §3.3): the sheets, the
 * cell legend, the unit line and the grid (ModelGrid), with Reset (only after
 * an edit), Full screen and Download .xlsx, the page's one primary action.
 *
 * Full screen makes the card fill the viewport as a modal dialog: focus moves
 * into it and stays there (Tab wraps), Escape or the button returns, and focus
 * goes back to the Full screen button. The inspector comes into the card while
 * it is full screen, so a selected cell can still be read. No animation.
 */
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { COPY } from '@/lib/finance-in-action/copy';
import { cn } from '@/lib/utils';

export const FULL_SCREEN = 'Full screen';
export const EXIT_FULL_SCREEN = 'Exit full screen';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModelCard({
  id,
  onReset,
  download,
  inspector,
  children,
}: {
  id: string;
  /** Present only after an edit. */
  onReset?: () => void;
  download: ReactNode;
  /** Shown inside the card while it is full screen. */
  inspector?: ReactNode;
  children: ReactNode;
}) {
  const [full, setFull] = useState(false);
  const card = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const wasFull = useRef(false);

  // Focus into the card on the way in, back to the button on the way out.
  useEffect(() => {
    if (full) toggle.current?.focus();
    else if (wasFull.current) toggle.current?.focus();
    wasFull.current = full;
  }, [full]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!full) return;
      if (e.key === 'Escape') {
        // An open cell editor takes its own Escape first.
        if ((e.target as HTMLElement).closest('input, textarea, select')) return;
        e.preventDefault();
        setFull(false);
        return;
      }
      if (e.key !== 'Tab' || !card.current) return;
      const items = Array.from(card.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden]'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !card.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [full],
  );

  return (
    <section
      id={id}
      ref={card}
      aria-labelledby={titleId}
      role={full ? 'dialog' : undefined}
      aria-modal={full ? true : undefined}
      onKeyDown={onKeyDown}
      data-full-screen={full || undefined}
      className={cn(
        'scroll-mt-24 rounded-lg border border-border bg-card',
        full ? 'fixed inset-0 z-50 overflow-auto rounded-none p-4 sm:p-6' : 'mb-12 p-4 sm:p-5',
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h2 id={titleId} className="text-xl font-semibold text-foreground">
          {COPY.theModel}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-11 items-center rounded-md border border-input px-3 text-sm text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {COPY.reset}
            </button>
          )}
          <button
            ref={toggle}
            type="button"
            onClick={() => setFull((f) => !f)}
            aria-pressed={full}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {full ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            {full ? EXIT_FULL_SCREEN : FULL_SCREEN}
          </button>
          {download}
        </div>
      </div>
      {/* One tree in both states, so the grid keeps its place and its focus. */}
      <div className={cn(full && inspector && 'xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-6')}>
        <div className="min-w-0">{children}</div>
        {full && inspector}
      </div>
    </section>
  );
}
