/**
 * The working paper's sheet tabs (PRD site sweep 2026-10, R4.3, R4.5), in workbook order, as the reference's
 * tab strip draws them: washed tabs on a hairline, the open one on paper with the accent rule along its top.
 * One tab stop; Left and Right move between tabs and open them, Home and End go to the first and the last.
 *
 * The strip scrolls sideways when the tabs do not fit (a phone has room for two or three). The open tab is
 * kept in view by moving the strip alone: scrollIntoView would also scroll the page to it. While more tabs
 * lie past the right edge, the edge fades and a ▸ control scrolls the strip on (site cleanup 2026-10,
 * 03-DESIGN §1), so the reader can tell more sheets exist; it is not a tab stop, the arrow keys reach every
 * tab already.
 */
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { cn } from '@/lib/utils';

interface SheetTabsProps {
  /** Prefix of the tabs' ids. */
  id: string;
  sheets: readonly string[];
  active: string;
  /** The element the tabs control: the grid's panel. */
  controls: string;
  onSelect: (sheet: string) => void;
  className?: string;
}

export function SheetTabs({ id, sheets, active, controls, onSelect, className }: SheetTabsProps) {
  const strip = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = Math.max(0, sheets.indexOf(active));
  /** Whether tabs lie past the strip's right edge. */
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const el = strip.current;
    setMore(!!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useLayoutEffect(() => {
    const el = strip.current;
    measure();
    if (!el || typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, sheets]);

  useLayoutEffect(() => {
    const el = strip.current;
    const tab = tabs.current[at];
    if (!el || !tab) return;
    // The strip is positioned, so a tab's offsetLeft is measured from it.
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < el.scrollLeft) el.scrollLeft = left;
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
    measure();
  }, [at, measure]);

  const scrollOn = () => {
    const el = strip.current;
    if (!el) return;
    const by = Math.max(120, el.clientWidth * 0.8);
    if (typeof el.scrollBy === 'function') el.scrollBy({ left: by, behavior: 'smooth' });
    else el.scrollLeft += by;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = sheets.length - 1;
    const to = e.key === 'ArrowRight' ? (at + 1) % sheets.length : e.key === 'ArrowLeft' ? (at + last) % sheets.length : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    onSelect(sheets[to]);
    tabs.current[to]?.focus();
  };

  return (
    <div className={cn('relative min-w-0', className)}>
      <div ref={strip} role="tablist" aria-label={COPY.sheets} onScroll={measure} className="relative flex items-end gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        {sheets.map((name, i) => {
          const selected = i === at;
          return (
            <button
              key={name}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-${i}`}
              aria-selected={selected}
              aria-controls={controls}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(name)}
              onKeyDown={onKeyDown}
              className={cn(
                'min-h-9 flex-none whitespace-pre rounded-t-md border border-b-0 border-border px-3 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11',
                selected
                  ? 'bg-popover font-semibold text-foreground shadow-[inset_0_2px_0_hsl(var(--accent))]'
                  : 'bg-background font-medium text-muted-foreground hover:text-foreground',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
      {more && (
        <div data-tabs-more className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent">
          <button
            type="button"
            tabIndex={-1}
            onClick={scrollOn}
            aria-label={COPY.moreSheets}
            title={COPY.moreSheets}
            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-popover text-muted-foreground hover:text-foreground [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
