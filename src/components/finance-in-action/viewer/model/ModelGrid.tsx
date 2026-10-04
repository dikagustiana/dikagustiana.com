/**
 * "The model" (brief §5.3): three tabs, the cell legend, the unit line with
 * the number convention, and the grid with a sticky label column, the
 * financial-year column shaded and forecast headers marked. One tab stop for
 * the grid; arrow keys, Home and End move within it; Enter or a click selects
 * a cell for the inspector.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CELL_KINDS, SHEETS, byId, type SheetId } from '@/lib/finance-in-action/constants';
import { formatForRow, NUMBER_CONVENTION } from '@/lib/finance-in-action/format';
import { cn } from '@/lib/utils';
import type { ModelView } from './useModelView';

/** What a later layer (the lens, an edit) adds to a cell. */
export interface CellDecoration {
  className?: string;
  /** Shown before the value, aria-hidden; the meaning is in `label`. */
  glyph?: string;
  /** A second line under the value: a delta. */
  note?: ReactNode;
  /** Words for assistive technology. */
  label?: string;
  flash?: boolean;
}

export interface GridEditing {
  /** True when this key may be edited. */
  canEdit: (key: string) => boolean;
  /** Renders the editor in place of the value. */
  editor: (key: string, close: () => void) => ReactNode;
}

export function CellLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground" aria-label="Cell legend">
      {CELL_KINDS.map((k) => (
        <li key={k.id} className="inline-flex items-center gap-2">
          <span className={cn('inline-flex rounded-sm border border-border px-1.5 py-0.5 font-medium', k.className)}>{k.label}</span>
          <span>{k.means}</span>
        </li>
      ))}
    </ul>
  );
}

export function ModelGrid({
  view,
  sheetId,
  onSheet,
  decorate,
  editing,
}: {
  view: ModelView;
  sheetId: SheetId;
  onSheet: (id: SheetId) => void;
  decorate?: (key: string) => CellDecoration | null;
  editing?: GridEditing;
}) {
  const { pkg, wb, values } = view;
  const sheet = pkg.sheets.find((s) => s.id === sheetId) ?? pkg.sheets[0];
  const tabs = SHEETS.filter((s) => pkg.sheets.some((x) => x.id === s.id));
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRow = sheet.rows.length - 1;
  const lastCol = pkg.periods.length - 1;
  const firstForecast = pkg.periods.findIndex((p) => p.forecast);

  const moveTo = (r: number, c: number) => {
    const next = { r: Math.max(0, Math.min(lastRow, r)), c: Math.max(0, Math.min(lastCol, c)) };
    setFocus(next);
    refs.current.get(`${next.r}:${next.c}`)?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number, key: string) => {
    const moves: Record<string, [number, number]> = {
      ArrowRight: [r, c + 1],
      ArrowLeft: [r, c - 1],
      ArrowDown: [r + 1, c],
      ArrowUp: [r - 1, c],
      Home: [r, 0],
      End: [r, lastCol],
    };
    const to = moves[e.key];
    if (to) {
      e.preventDefault();
      moveTo(to[0], to[1]);
      return;
    }
    if ((e.key === 'Enter' || e.key === 'F2') && editing?.canEdit(key)) {
      e.preventDefault();
      view.select(key);
      setEditingKey(key);
    }
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onSheet(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Sheets" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t, i) => {
          const active = t.id === sheet.id;
          return (
            <button
              key={t.id}
              ref={(el) => (el ? tabRefs.current.set(t.id, el) : tabRefs.current.delete(t.id))}
              type="button"
              role="tab"
              id={`fia-tab-${t.id}`}
              aria-selected={active}
              aria-controls="fia-sheet"
              tabIndex={active ? 0 : -1}
              onClick={() => onSheet(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                '-mb-px min-h-11 border-b-2 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{byId(SHEETS, sheet.id)?.means}</p>
      <CellLegend />
      <p className="text-xs text-muted-foreground">
        Each row carries its unit in the second column. {NUMBER_CONVENTION}
      </p>
      <div
        id="fia-sheet"
        role="tabpanel"
        aria-labelledby={`fia-tab-${sheet.id}`}
        className="overflow-x-auto rounded-md border border-border"
      >
        <table role="grid" aria-label={`${byId(SHEETS, sheet.id)?.label} sheet`} className="w-max min-w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="sticky left-0 z-10 min-w-[13rem] bg-background px-3 py-2 text-left font-semibold text-foreground">
                {pkg.meta.ticker}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                Unit
              </th>
              {pkg.periods.map((p, i) => (
                <th
                  key={p.id}
                  scope="col"
                  className={cn(
                    'min-w-[5.5rem] px-3 py-2 text-right font-semibold text-foreground',
                    p.kind === 'fy' && 'bg-muted',
                    p.forecast && 'italic',
                    i === firstForecast && 'border-l-2 border-dashed border-foreground/40',
                  )}
                >
                  <span className="block">{p.label}</span>
                  {p.forecast && <span className="block text-[10px] font-normal not-italic uppercase tracking-wider text-muted-foreground">forecast</span>}
                  {p.kind === 'fy' && <span className="block text-[10px] font-normal uppercase tracking-wider text-muted-foreground">year</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, r) => (
              <tr key={row.id} className={cn('border-b border-border/60', row.style === 'total' && 'border-t border-t-foreground/30 font-semibold')}>
                <th scope="row" className="sticky left-0 z-10 bg-background px-3 py-1 text-left font-normal text-foreground">
                  <span className={cn(row.style === 'total' && 'font-semibold')}>{row.label}</span>
                </th>
                <td className="whitespace-nowrap px-3 py-1 text-xs text-muted-foreground">{row.unit}</td>
                {pkg.periods.map((p, c) => {
                  const key = wb.keyOf(`${sheet.id}!${row.id}`, p.id)!;
                  const cell = row.cells[c];
                  const kind = byId(CELL_KINDS, cell.kind);
                  const v = values.get(key);
                  const shown = formatForRow(typeof v === 'number' ? v : null, row);
                  const selected = view.selected === key;
                  const deco = decorate?.(key) ?? null;
                  const isEditing = editingKey === key && editing;
                  return (
                    <td
                      key={p.id}
                      role="gridcell"
                      aria-selected={selected}
                      className={cn(
                        'p-0 text-right',
                        p.kind === 'fy' && 'bg-muted',
                        c === firstForecast && 'border-l-2 border-dashed border-foreground/40',
                      )}
                    >
                      {isEditing ? (
                        editing.editor(key, () => {
                          setEditingKey(null);
                          refs.current.get(`${r}:${c}`)?.focus();
                        })
                      ) : (
                        <button
                          ref={(el) => (el ? refs.current.set(`${r}:${c}`, el) : refs.current.delete(`${r}:${c}`))}
                          type="button"
                          tabIndex={focus.r === r && focus.c === c ? 0 : -1}
                          onFocus={() => setFocus({ r, c })}
                          onClick={() => {
                            setFocus({ r, c });
                            view.select(key);
                          }}
                          onDoubleClick={() => editing?.canEdit(key) && setEditingKey(key)}
                          onKeyDown={(e) => onKey(e, r, c, key)}
                          aria-label={`${row.label}, ${p.label}: ${shown}, ${kind?.label ?? cell.kind}${deco?.label ? `, ${deco.label}` : ''}`}
                          className={cn(
                            'flex min-h-11 w-full flex-col items-end justify-center px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                            kind?.className,
                            deco?.className,
                            deco?.flash && 'fia-flash',
                            selected && 'ring-2 ring-inset ring-ring',
                          )}
                        >
                          <span className="whitespace-nowrap">
                            {deco?.glyph && (
                              <span aria-hidden="true" className="mr-1 text-[10px] text-foreground">
                                {deco.glyph}
                              </span>
                            )}
                            {shown}
                          </span>
                          {deco?.note && <span className="whitespace-nowrap text-[10px] font-normal not-italic text-foreground">{deco.note}</span>}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
