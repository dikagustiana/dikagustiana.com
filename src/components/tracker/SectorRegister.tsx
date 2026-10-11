import { Fragment, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SECTOR_LABEL,
  SECTOR_ORDER,
  STATUS_LABEL,
  TRACKER_QUARTERS,
  registerGrid,
  sourceNumbers,
  type TrackerEntry,
  type TrackerSector,
} from '@/lib/tracker';
import { SourceRefs } from './SourceRefs';

/**
 * The sector register (PRD §B5, item 3): rows are sectors, columns are the
 * quarters, each cell the entry's one-sentence finding under its status in
 * words. A row opens to show both quarters' detail.
 *
 * One table at every width. Below `md` the cells stack, so a 375px screen
 * never scrolls sideways; the explicit roles keep it a table to a screen
 * reader once CSS has changed how its parts display (Safari drops table
 * semantics on display: block otherwise).
 */
export function SectorRegister({
  entries,
  numberOf,
}: {
  entries: TrackerEntry[];
  numberOf: Map<string, number>;
}) {
  const grid = registerGrid(entries);
  const [open, setOpen] = useState<Set<TrackerSector>>(() => new Set());
  const toggle = (sector: TrackerSector) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });

  const rows = SECTOR_ORDER.filter((sector) => (grid.get(sector)?.size ?? 0) > 0);

  return (
    <table role="table" className="w-full border-collapse text-left text-base text-foreground">
      <caption className="sr-only">
        Sector register: what each sector&rsquo;s primary documents record for each quarter. Open a row for the detail.
      </caption>
      <thead role="rowgroup" className="hidden md:table-header-group">
        <tr role="row" className="border-b border-border">
          <th role="columnheader" scope="col" className="w-[22%] py-3 pr-4 align-bottom text-sm font-semibold">
            Sector
          </th>
          {TRACKER_QUARTERS.map((q) => (
            <th key={q.key} role="columnheader" scope="col" className="w-[33%] py-3 pr-4 align-bottom text-sm font-semibold">
              {q.label}
            </th>
          ))}
          <th role="columnheader" scope="col" className="py-3 align-bottom text-sm font-semibold">
            Sources
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((sector) => {
          const cells = grid.get(sector)!;
          const isOpen = open.has(sector);
          const detailId = `register-detail-${sector}`;
          const rowEntries = TRACKER_QUARTERS.map((q) => cells.get(q.key)).filter(
            (e): e is TrackerEntry => e !== undefined,
          );
          const numbers = [...new Set(rowEntries.flatMap((e) => sourceNumbers(e, numberOf)))].sort((a, b) => a - b);
          return (
            <Fragment key={sector}>
              <tr
                role="row"
                onClick={() => toggle(sector)}
                className="block cursor-pointer border-t border-border transition-colors hover:bg-muted/30 md:table-row"
              >
                <th role="rowheader" scope="row" className="block pb-1 pt-4 align-top font-normal md:table-cell md:py-4 md:pr-4">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(sector);
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 text-left font-semibold text-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SECTOR_LABEL[sector]}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                    />
                  </button>
                </th>
                {TRACKER_QUARTERS.map((q) => {
                  const entry = cells.get(q.key);
                  return (
                    <td key={q.key} role="cell" className="block py-2 align-top md:table-cell md:py-4 md:pr-4">
                      <span className="block text-sm font-semibold text-muted-foreground md:hidden">{q.label}</span>
                      {entry ? (
                        <>
                          <span className="block text-sm font-semibold">
                            {STATUS_LABEL[entry.status]}
                            {!entry.published && <span className="font-normal text-muted-foreground"> · not published</span>}
                          </span>
                          <span className="mt-1 block leading-relaxed">{entry.finding}</span>
                        </>
                      ) : (
                        <span className="block text-muted-foreground">No entry.</span>
                      )}
                    </td>
                  );
                })}
                <td role="cell" className="block pb-4 pt-2 align-top text-sm md:table-cell md:py-4">
                  <span className="text-muted-foreground md:hidden">Sources </span>
                  <SourceRefs numbers={numbers} />
                </td>
              </tr>
              <tr role="row" id={detailId} hidden={!isOpen} className={cn(isOpen && 'block md:table-row')}>
                <td role="cell" colSpan={4} className="block pb-6 md:table-cell">
                  <div className="grid gap-4 md:grid-cols-2">
                    {rowEntries.map((entry) => {
                      const q = TRACKER_QUARTERS.find((x) => x.key === entry.quarter)!;
                      return (
                        <div key={entry.id}>
                          <p className="text-sm font-semibold text-foreground">{q.label}</p>
                          <p className="mt-1 leading-relaxed text-foreground">{entry.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
