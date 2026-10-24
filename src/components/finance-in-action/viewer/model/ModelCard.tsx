/**
 * "The model" in one card (chain view, PROMPT-site §3.3; sheet-first PRD
 * R2): a toolbar with the title, the cell legend, Reset (only after an
 * edit), the inspector's switch, Full screen and Download .xlsx, the page's
 * one primary action; then the formula bar, the grid with the inspector
 * beside it, and the footer with the sheet tabs, zoom and the status line.
 * Reading order and DOM order are the same: toolbar, formula bar, grid,
 * tabs.
 *
 * The inspector sits in the card from 1280px up and can be folded away; it
 * opens folded below 1440px (D-S6). Narrower, it is the panel along the
 * bottom edge it always was.
 *
 * Full screen makes the card fill the viewport as a modal dialog: focus moves
 * into it and stays there (Tab wraps), Escape or the button returns, and focus
 * goes back to the Full screen button. The grid takes the height left. No
 * animation.
 */
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { COPY } from '@/lib/finance-in-action/copy';
import { cn } from '@/lib/utils';

export const FULL_SCREEN = 'Full screen';
export const EXIT_FULL_SCREEN = 'Exit full screen';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const TOOL = 'inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ModelCard({
  id,
  onReset,
  download,
  legend,
  formulaBar,
  inspector,
  inspectorId,
  inspectorOpen,
  onInspector,
  footer,
  note,
  children,
}: {
  id: string;
  /** Present only after an edit. */
  onReset?: () => void;
  download: ReactNode;
  legend: ReactNode;
  formulaBar: ReactNode;
  /** Beside the grid from 1280px up, while open. */
  inspector: ReactNode;
  inspectorId: string;
  inspectorOpen: boolean;
  onInspector: (open: boolean) => void;
  footer: ReactNode;
  /** A sentence under the footer: what the sheet holds and how its numbers are written. */
  note?: ReactNode;
  /** The grid. */
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
        // An open cell editor, or the name box, takes its own Escape first.
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
      className={cn('group scroll-mt-24 rounded-lg border border-border bg-card', full ? 'fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none' : 'mb-6')}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 sm:px-4">
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {COPY.theModel}
        </h2>
        {legend}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onReset && (
            <button type="button" onClick={onReset} className={TOOL}>
              {COPY.reset}
            </button>
          )}
          <button
            type="button"
            onClick={() => onInspector(!inspectorOpen)}
            aria-expanded={inspectorOpen}
            aria-controls={inspectorId}
            className={cn(TOOL, 'hidden xl:inline-flex')}
          >
            {inspectorOpen ? <PanelRightClose className="h-4 w-4" aria-hidden="true" /> : <PanelRightOpen className="h-4 w-4" aria-hidden="true" />}
            {inspectorOpen ? COPY.hideInspector : COPY.showInspector}
          </button>
          <button ref={toggle} type="button" onClick={() => setFull((f) => !f)} aria-pressed={full} className={TOOL}>
            {full ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            {full ? EXIT_FULL_SCREEN : FULL_SCREEN}
          </button>
          {download}
        </div>
      </div>
      {formulaBar}
      {/* One tree in both states, so the grid keeps its place and its focus. */}
      <div className={cn('min-h-0', inspectorOpen && 'xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch', full && 'flex flex-1 flex-col xl:grid')}>
        <div className={cn('min-w-0', full && 'flex min-h-0 flex-1 flex-col')}>{children}</div>
        {inspector}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-1 pb-1 sm:flex-nowrap">{footer}</div>
      {note && <div className={cn('border-t border-border px-3 py-2 sm:px-4', full && 'hidden')}>{note}</div>}
    </section>
  );
}
