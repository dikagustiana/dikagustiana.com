/**
 * The sheet tabs, under the grid as a workbook has them (sheet-first PRD
 * R2.4): Model, Reported, Assumptions, then Checks. One tab stop; the arrow
 * keys move between tabs and open each. On a phone the row scrolls sideways.
 */
import { useRef, type KeyboardEvent } from 'react';
import { COPY } from '@/lib/finance-in-action/copy';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { viewSheets, type ViewSheetId } from '@/lib/finance-in-action/view/checksSheet';
import { cn } from '@/lib/utils';

export function SheetTabs({ pkg, current, onSheet }: { pkg: ModelPackage; current: ViewSheetId; onSheet: (id: ViewSheetId) => void }) {
  const tabs = viewSheets(pkg);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onSheet(next.id);
    refs.current.get(next.id)?.focus();
  };

  return (
    <div role="tablist" aria-label={COPY.sheetsLabel} className="-mb-px flex min-w-0 overflow-x-auto">
      {tabs.map((t, i) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            ref={(el) => (el ? refs.current.set(t.id, el) : refs.current.delete(t.id))}
            type="button"
            role="tab"
            id={`fia-tab-${t.id}`}
            aria-selected={active}
            aria-controls="fia-sheet"
            tabIndex={active ? 0 : -1}
            onClick={() => onSheet(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'min-h-11 shrink-0 whitespace-nowrap border-x border-b-2 border-t-0 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              active ? 'border-x-border border-b-foreground bg-card text-foreground' : 'border-x-transparent border-b-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
