/**
 * The working paper's sheet tabs (PRD site sweep 2026-10, R4.3, R4.5), in workbook order, as the reference's
 * tab strip draws them: washed tabs on a hairline, the open one on paper with the accent rule along its top.
 * One tab stop; Left and Right move between tabs and open them, Home and End go to the first and the last.
 *
 * The strip scrolls sideways when the tabs do not fit (a phone has room for two or three). The open tab is
 * kept in view by moving the strip alone: scrollIntoView would also scroll the page to it.
 */
import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
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
}

export function SheetTabs({ id, sheets, active, controls, onSelect }: SheetTabsProps) {
  const strip = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = Math.max(0, sheets.indexOf(active));

  useLayoutEffect(() => {
    const el = strip.current;
    const tab = tabs.current[at];
    if (!el || !tab) return;
    // The strip is positioned, so a tab's offsetLeft is measured from it.
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < el.scrollLeft) el.scrollLeft = left;
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
  }, [at]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = sheets.length - 1;
    const to = e.key === 'ArrowRight' ? (at + 1) % sheets.length : e.key === 'ArrowLeft' ? (at + last) % sheets.length : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    onSelect(sheets[to]);
    tabs.current[to]?.focus();
  };

  return (
    <div ref={strip} role="tablist" aria-label={COPY.sheets} className="relative flex items-end gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
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
                : 'bg-secondary font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
