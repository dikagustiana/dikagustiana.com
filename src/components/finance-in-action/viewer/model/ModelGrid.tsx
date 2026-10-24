/**
 * "The model" grid (brief §5.3; sheet-first PRD R2.3): a sheet laid out as
 * the downloaded workbook lays it out, its column letters over it and its row
 * numbers beside it, so every address on screen is the workbook's (K2). The
 * period header is row 1, column A the label, column B the unit. The letters,
 * the header, the row numbers and columns A and B stay put while the cells
 * scroll inside the grid's own area (B only from a small tablet up: on a
 * phone it would leave no room for a period). The financial-year column is
 * shaded, forecasts start at a dashed rule, ratio rows are italic.
 *
 * Rows close up to 28px under a mouse or a trackpad and stay 44px under a
 * finger (D-S3); zoom scales the type, the rows and the period columns. On
 * opening, the grid scrolls so the latest reported quarter and the forecast
 * are in view (D-S7).
 *
 * One tab stop for the grid; arrows, Home and End move the selection; Enter,
 * F2 or a double click edits an assumption in place. The Checks sheet
 * (D-S4) is drawn by the same grid, read-only: its Cell column goes to the
 * checked cell.
 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import { CELL_KINDS, SHEETS, byId } from '@/lib/finance-in-action/constants';
import { ADDRESSING, type Period, type Row } from '@/lib/finance-in-action/contract/types';
import { COPY } from '@/lib/finance-in-action/copy';
import { isNum, type Value } from '@/lib/finance-in-action/engine/engine';
import { EMPTY, formatForRow, formatNumber, formatPercent } from '@/lib/finance-in-action/format';
import { LEGEND_SAMPLE, LIMITS, PERCENT } from '@/lib/finance-in-action/layout';
import { rowNumber } from '@/lib/finance-in-action/model/workbook';
import { CHECK_COLUMNS, CHECKS_SHEET, checksHeader, type CheckRow, type ViewSheetId } from '@/lib/finance-in-action/view/checksSheet';
import { columnLetters, letters } from '@/lib/finance-in-action/view/sheetAddress';
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

/** A place in the grid: a row of the sheet and a column after A and B. */
export interface GridPlace {
  r: number;
  c: number;
}

/** The Checks sheet's rows, where the grid's cursor is on it, and where its Cell column goes. */
export interface GridChecks {
  rows: CheckRow[];
  cursor: GridPlace | null;
  onCursor: (at: GridPlace) => void;
  onOpen: (key: string) => void;
}

export const LEGEND_LABEL = 'Cell legend';

/** The sample each legend chip carries, in the house format: words and a figure, never colour alone. */
const LEGEND_SAMPLES: Record<string, string> = {
  sourced: formatNumber(LEGEND_SAMPLE.figure),
  formula: formatNumber(LEGEND_SAMPLE.figure),
  assumption: formatPercent(LEGEND_SAMPLE.rate),
  missing: EMPTY,
};

export function CellLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-1.5 text-xs text-foreground" aria-label={LEGEND_LABEL}>
      {CELL_KINDS.map((k) => (
        <li key={k.id} title={k.means} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-1.5 py-0.5">
          <span aria-hidden="true" className={cn('rounded-sm px-0.5 font-medium tabular-nums', k.className)}>
            {LEGEND_SAMPLES[k.id]}
          </span>
          {COPY.legend[k.id]}
          <span className="sr-only">: {k.means}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Rows: a 44px target under a finger, a 28px row (its rule included) under a
 * mouse (D-S3), and never a target under 24px however far it is zoomed out.
 */
const ROW_H = 'min-h-[max(2.75rem,calc(2.75rem*var(--fia-grid-scale)))] pointer-fine:min-h-[max(1.5rem,calc(1.75rem*var(--fia-grid-scale)-1px))]';
const CELL = 'border-b border-r border-border';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
/** The row numbers' column and column A, frozen on every screen. */
const STICK_NUM = 'sticky left-0 w-[var(--fia-col-num)] min-w-[var(--fia-col-num)]';
const STICK_A = 'sticky left-[var(--fia-col-num)] w-[var(--fia-col-a)] min-w-[var(--fia-col-a)] max-w-[var(--fia-col-a)]';
/** Column B, frozen from a small tablet up. */
const STICK_B = 'sm:sticky sm:left-[calc(var(--fia-col-num)+var(--fia-col-a))] sm:w-[var(--fia-col-b)] sm:min-w-[var(--fia-col-b)] sm:max-w-[var(--fia-col-b)]';
const HEAD_TOP = 'sticky top-[var(--fia-letters-h)]';
const LETTER = 'h-[var(--fia-letters-h)] whitespace-nowrap px-1 text-center text-[11px] font-normal leading-none tabular-nums';
const NUMBER = 'px-1 text-center text-[11px] tabular-nums';
const ON = 'bg-secondary text-foreground';
/** A total's rule over its row, drawn inside the cells so the row keeps its height. */
const TOTAL_RULE = 'shadow-[inset_0_1px_0_hsl(var(--foreground)/0.4)]';
const OFF = 'bg-muted text-foreground';

interface RowActions {
  select: (at: GridPlace) => void;
  keyDown: (e: KeyboardEvent<HTMLButtonElement>, at: GridPlace) => void;
  /** A double click. */
  activate: (at: GridPlace) => void;
  editor: (at: GridPlace) => ReactNode;
}

interface Shared {
  actions: MutableRefObject<RowActions>;
  cells: MutableRefObject<Map<string, HTMLButtonElement>>;
}

const placeId = (r: number, c: number) => `${r}:${c}`;
/** The letters before the first value column: the label's and the unit's. */
const FIRST_VALUE = ADDRESSING.firstPeriodColumn - ADDRESSING.labelColumn;

function RowNumber({ n, on }: { n: number; on: boolean }) {
  return (
    <td aria-hidden="true" className={cn(CELL, NUMBER, STICK_NUM, 'z-10', on ? ON : OFF)}>
      {n}
    </td>
  );
}

const SheetRow = memo(function SheetRow({
  row,
  r,
  keys,
  periods,
  firstForecast,
  values,
  selectedCol,
  focusCol,
  editingCol,
  decorate,
  shared,
}: {
  row: Row;
  r: number;
  keys: string[];
  periods: Period[];
  firstForecast: number;
  values: Map<string, Value>;
  selectedCol: number;
  focusCol: number;
  editingCol: number;
  decorate?: (key: string) => CellDecoration | null;
  shared: Shared;
}) {
  const total = row.style === 'total';
  const ratio = row.style === 'ratio';
  return (
    <tr className={cn(total && 'font-semibold', ratio && 'italic')}>
      <RowNumber n={rowNumber(r)} on={selectedCol >= 0} />
      <th scope="row" title={row.label} className={cn(CELL, STICK_A, 'z-10 bg-card px-2 text-left font-normal text-foreground', total && cn(TOTAL_RULE, 'font-semibold'))}>
        <span className="block truncate">{row.label}</span>
      </th>
      <td title={row.unit} className={cn(CELL, STICK_B, 'z-10 bg-card px-2 text-xs not-italic text-muted-foreground', total && TOTAL_RULE)}>
        <span className="block whitespace-nowrap sm:truncate">{row.unit}</span>
      </td>
      {periods.map((p, c) => {
        const key = keys[c];
        const cell = row.cells[c];
        const kind = byId(CELL_KINDS, cell.kind);
        const v = values.get(key);
        const shown = formatForRow(isNum(v) ? v : null, row);
        const selected = selectedCol === c;
        const deco = decorate?.(key) ?? null;
        return (
          <td
            key={p.id}
            role="gridcell"
            aria-selected={selected}
            className={cn(
              CELL,
              'p-0 text-right',
              p.kind === 'fy' && 'bg-muted',
              c === firstForecast && 'border-l-2 border-l-foreground/40 [border-left-style:dashed]',
              total && TOTAL_RULE,
            )}
          >
            {editingCol === c ? (
              shared.actions.current.editor({ r, c })
            ) : (
              <button
                ref={(el) => (el ? shared.cells.current.set(placeId(r, c), el) : shared.cells.current.delete(placeId(r, c)))}
                type="button"
                tabIndex={focusCol === c ? 0 : -1}
                onClick={() => shared.actions.current.select({ r, c })}
                onDoubleClick={() => shared.actions.current.activate({ r, c })}
                onKeyDown={(e) => shared.actions.current.keyDown(e, { r, c })}
                aria-label={`${row.label}, ${p.label}: ${shown}, ${kind?.label ?? cell.kind}${deco?.label ? `, ${deco.label}` : ''}`}
                className={cn('flex w-full flex-col items-end justify-center px-2', ROW_H, FOCUS, kind?.className, deco?.className, selected && 'ring-2 ring-inset ring-ring')}
              >
                <span className="whitespace-nowrap">
                  {deco?.glyph && (
                    <span aria-hidden="true" className="mr-1 text-[10px] not-italic text-foreground">
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
  );
});

const ChecksRowView = memo(function ChecksRowView({
  check,
  r,
  selectedCol,
  focusCol,
  shared,
}: {
  check: CheckRow;
  r: number;
  selectedCol: number;
  focusCol: number;
  shared: Shared;
}) {
  return (
    <tr>
      <RowNumber n={rowNumber(r)} on={selectedCol >= 0} />
      <th scope="row" title={check.label} className={cn(CELL, STICK_A, 'z-10 bg-card px-2 text-left font-normal text-foreground')}>
        <span className="block truncate">{check.label}</span>
      </th>
      <td title={check.unit} className={cn(CELL, STICK_B, 'z-10 bg-card px-2 text-xs text-muted-foreground')}>
        <span className="block whitespace-nowrap sm:truncate">{check.unit}</span>
      </td>
      {CHECK_COLUMNS.map((col, c) => {
        const cell = check.cells[c];
        const selected = selectedCol === c;
        const goes = col.id === 'cell';
        return (
          <td key={col.id} role="gridcell" aria-selected={selected} className={cn(CELL, 'p-0', cell.value !== undefined ? 'text-right' : 'text-left')}>
            <button
              ref={(el) => (el ? shared.cells.current.set(placeId(r, c), el) : shared.cells.current.delete(placeId(r, c)))}
              type="button"
              tabIndex={focusCol === c ? 0 : -1}
              onClick={() => (goes ? shared.actions.current.activate({ r, c }) : shared.actions.current.select({ r, c }))}
              onKeyDown={(e) => shared.actions.current.keyDown(e, { r, c })}
              aria-label={`${check.label}, ${col.label}: ${cell.text}${goes ? `, ${COPY.checksGoTo}` : ''}`}
              className={cn(
                'flex w-full items-center whitespace-nowrap px-2',
                cell.value !== undefined ? 'justify-end' : 'justify-start',
                ROW_H,
                FOCUS,
                goes && 'tabular-nums text-accent underline-offset-2 hover:underline',
                col.id === 'status' && check.status === 'differs' && 'font-semibold',
                selected && 'ring-2 ring-inset ring-ring',
              )}
            >
              {cell.text}
            </button>
          </td>
        );
      })}
    </tr>
  );
});

export function ModelGrid({
  view,
  sheetId,
  decorate,
  editing,
  zoom = LIMITS.zoomDefault,
  reveal,
  checks,
}: {
  view: ModelView;
  sheetId: ViewSheetId;
  decorate?: (key: string) => CellDecoration | null;
  editing?: GridEditing;
  /** Per cent. */
  zoom?: number;
  /** A place to bring into view and focus; a new object for each request. */
  reveal?: GridPlace | null;
  /** The Checks sheet, when it is the one shown. */
  checks?: GridChecks;
}) {
  const { pkg, wb, values } = view;
  const onChecks = sheetId === CHECKS_SHEET.id;
  const sheet = onChecks ? undefined : pkg.sheets.find((s) => s.id === sheetId) ?? pkg.sheets[0];
  const sheetLabel = onChecks ? CHECKS_SHEET.label : byId(SHEETS, sheet!.id)?.label;
  const checkRows = useMemo(() => checks?.rows ?? [], [checks?.rows]);
  const rowCount = onChecks ? checkRows.length : sheet!.rows.length;
  const colCount = onChecks ? CHECK_COLUMNS.length : pkg.periods.length;
  const firstForecast = pkg.periods.findIndex((p) => p.forecast);
  const heads = onChecks ? letters(checksHeader().length) : columnLetters(pkg.periods.length);
  /** Every cell's key, by row then period: worked once a sheet. */
  const keys = useMemo(
    () => (sheet ? sheet.rows.map((row) => pkg.periods.map((p) => wb.keyOf(`${sheet.id}!${row.id}`, p.id)!)) : []),
    [sheet, pkg, wb],
  );

  // The selected place on this sheet: the view's selection, or on Checks the grid's own cursor.
  const selected: GridPlace | null = useMemo(() => {
    if (onChecks) return checks?.cursor ?? null;
    const a = view.selected ? wb.address(view.selected) : undefined;
    return a && a.sheet === sheet!.id ? { r: a.rowIndex, c: a.periodIndex } : null;
  }, [onChecks, checks?.cursor, view.selected, wb, sheet]);

  const [focus, setFocus] = useState<GridPlace>({ r: 0, c: 0 });
  const [editingAt, setEditingAt] = useState<GridPlace | null>(null);
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const viewport = useRef<HTMLDivElement>(null);
  const periodHeads = useRef(new Map<number, HTMLTableCellElement>());

  // The tab stop follows the selection, wherever it was made (a node, a bar, the name box).
  useEffect(() => {
    if (selected) setFocus(selected);
  }, [selected]);

  // D-S7: open with the latest reported quarter and the forecast in view, and a few quarters before them where
  // there is room; where there is not, the forecast comes before the earlier quarters, never before the latest.
  const latest = onChecks ? -1 : wb.periodIndex(pkg.meta.asOf.latestQuarter);
  useLayoutEffect(() => {
    const el = viewport.current;
    const first = periodHeads.current.get(0);
    const from = periodHeads.current.get(Math.max(0, latest - LIMITS.openColumnsBefore));
    const last = periodHeads.current.get(latest);
    if (!el || !first || !from || !last) return;
    const end = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(from.offsetLeft - first.offsetLeft, Math.min(end, last.offsetLeft - first.offsetLeft));
  }, [latest]);

  // An editor that closes takes its input away: the focus goes back to the cell, unless it went elsewhere.
  const refocus = useRef<GridPlace | null>(null);
  useEffect(() => {
    const at = refocus.current;
    if (editingAt || !at) return;
    refocus.current = null;
    if (!document.activeElement || document.activeElement === document.body) cells.current.get(placeId(at.r, at.c))?.focus();
  }, [editingAt]);

  // A jump (the name box, a check's cell): focus the place and scroll it into view.
  useEffect(() => {
    if (!reveal) return;
    setFocus(reveal);
    const el = cells.current.get(placeId(reveal.r, reveal.c));
    el?.focus({ preventScroll: true });
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [reveal]);

  const keyAt = (at: GridPlace): string | undefined => (onChecks ? checkRows[at.r]?.key : keys[at.r]?.[at.c]);
  const select = (at: GridPlace) => {
    setFocus(at);
    if (onChecks) checks?.onCursor(at);
    const key = keyAt(at);
    if (key) view.select(key);
  };
  const moveTo = (r: number, c: number) => {
    const at = { r: Math.max(0, Math.min(rowCount - 1, r)), c: Math.max(0, Math.min(colCount - 1, c)) };
    select(at);
    cells.current.get(placeId(at.r, at.c))?.focus();
  };
  const canEdit = (at: GridPlace) => {
    const key = keyAt(at);
    return !onChecks && !!key && !!editing?.canEdit(key);
  };
  const startEdit = (at: GridPlace) => {
    select(at);
    setEditingAt(at);
  };

  const actions = useRef<RowActions>(null as unknown as RowActions);
  actions.current = {
    select,
    activate: (at) => {
      if (onChecks) {
        const key = keyAt(at);
        if (key && CHECK_COLUMNS[at.c]?.id === 'cell') checks?.onOpen(key);
        else select(at);
      } else if (canEdit(at)) startEdit(at);
    },
    keyDown: (e, { r, c }) => {
      const moves: Record<string, [number, number]> = {
        ArrowRight: [r, c + 1],
        ArrowLeft: [r, c - 1],
        ArrowDown: [r + 1, c],
        ArrowUp: [r - 1, c],
        Home: [r, 0],
        End: [r, colCount - 1],
      };
      const to = moves[e.key];
      if (to) {
        e.preventDefault();
        moveTo(to[0], to[1]);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'F2') && canEdit({ r, c })) {
        e.preventDefault();
        startEdit({ r, c });
      }
    },
    editor: (at) => {
      const key = keyAt(at);
      if (!key || !editing) return null;
      return editing.editor(key, () => {
        refocus.current = at;
        setEditingAt(null);
      });
    },
  };
  const shared = useMemo<Shared>(() => ({ actions, cells }), []);

  const style = { '--fia-grid-scale': String(zoom / PERCENT) } as CSSProperties;
  const headers = onChecks ? checksHeader() : null;

  return (
    <div
      id="fia-sheet"
      ref={viewport}
      role="tabpanel"
      aria-labelledby={`fia-tab-${onChecks ? CHECKS_SHEET.id : sheet!.id}`}
      style={style}
      data-fia-grid
      className={cn(
        'relative max-h-[min(70vh,44rem)] overflow-auto overscroll-x-contain border-b border-border bg-card',
        'group-data-[full-screen]:max-h-none group-data-[full-screen]:min-h-0 group-data-[full-screen]:flex-1',
        '[--fia-col-a:9rem] [--fia-col-b:8rem] [--fia-col-num:2.5rem] [--fia-letters-h:1rem] sm:[--fia-col-a:14rem] lg:[--fia-col-b:10rem]',
        '[scroll-padding-left:calc(var(--fia-col-num)+var(--fia-col-a))] [scroll-padding-top:3.5rem] sm:[scroll-padding-left:calc(var(--fia-col-num)+var(--fia-col-a)+var(--fia-col-b))]',
      )}
    >
      <table role="grid" aria-label={`${sheetLabel} sheet`} className="w-max min-w-full border-separate border-spacing-0 text-[length:calc(0.8125rem*var(--fia-grid-scale))] tabular-nums">
        <thead>
          <tr aria-hidden="true">
            <th className={cn(CELL, LETTER, STICK_NUM, 'top-0 z-30', OFF)} />
            {heads.map((l, i) => {
              const frozen = i < FIRST_VALUE;
              const on = selected !== null && i === selected.c + FIRST_VALUE;
              const period = onChecks ? undefined : pkg.periods[i - FIRST_VALUE];
              return (
                <th
                  key={l}
                  className={cn(
                    CELL,
                    LETTER,
                    'sticky top-0',
                    i === 0 ? STICK_A : i === 1 ? STICK_B : '',
                    frozen ? 'z-30' : 'z-20',
                    on ? ON : OFF,
                    period && i - FIRST_VALUE === firstForecast && 'border-l-2 border-l-foreground/40 [border-left-style:dashed]',
                  )}
                >
                  <span data-fia-letter>{l}</span>
                  {/* The forecast and the year say so over their column; the header row says it to a screen reader. */}
                  {period?.forecast && <span className="font-sans text-[10px] uppercase tracking-wider"> forecast</span>}
                  {period?.kind === 'fy' && <span className="font-sans text-[10px] uppercase tracking-wider"> year</span>}
                </th>
              );
            })}
          </tr>
          <tr>
            <td aria-hidden="true" className={cn(CELL, NUMBER, STICK_NUM, HEAD_TOP, 'z-30', OFF)}>
              {ADDRESSING.headerRow}
            </td>
            <th scope="col" className={cn(CELL, STICK_A, HEAD_TOP, 'z-30 bg-card px-2 py-1 text-left font-semibold text-foreground')}>
              {onChecks ? headers![0] : pkg.meta.ticker}
            </th>
            <th scope="col" className={cn(CELL, STICK_B, HEAD_TOP, 'z-30 bg-card px-2 py-1 text-left font-medium text-muted-foreground')}>
              {onChecks ? headers![1] : 'Unit'}
            </th>
            {onChecks
              ? CHECK_COLUMNS.map((col) => (
                  <th key={col.id} scope="col" className={cn(CELL, HEAD_TOP, 'z-20 min-w-[calc(6rem*var(--fia-grid-scale))] bg-card px-2 py-1 text-left font-semibold text-foreground')}>
                    {col.label}
                  </th>
                ))
              : pkg.periods.map((p, i) => (
                  <th
                    key={p.id}
                    ref={(el) => (el ? periodHeads.current.set(i, el) : periodHeads.current.delete(i))}
                    scope="col"
                    className={cn(
                      CELL,
                      HEAD_TOP,
                      'z-20 min-w-[calc(5.5rem*var(--fia-grid-scale))] whitespace-nowrap bg-card px-2 py-1 text-right font-semibold text-foreground',
                      p.kind === 'fy' && 'bg-muted',
                      p.forecast && 'italic',
                      i === firstForecast && 'border-l-2 border-l-foreground/40 [border-left-style:dashed]',
                    )}
                  >
                    {p.label}
                    {p.forecast && <span className="sr-only"> forecast</span>}
                    {p.kind === 'fy' && <span className="sr-only"> year</span>}
                  </th>
                ))}
          </tr>
        </thead>
        <tbody>
          {onChecks
            ? checkRows.map((check, r) => (
                <ChecksRowView
                  key={check.key}
                  check={check}
                  r={r}
                  selectedCol={selected?.r === r ? selected.c : -1}
                  focusCol={focus.r === r ? focus.c : -1}
                  shared={shared}
                />
              ))
            : sheet!.rows.map((row, r) => (
                <SheetRow
                  key={row.id}
                  row={row}
                  r={r}
                  keys={keys[r]}
                  periods={pkg.periods}
                  firstForecast={firstForecast}
                  values={values}
                  selectedCol={selected?.r === r ? selected.c : -1}
                  focusCol={focus.r === r ? focus.c : -1}
                  editingCol={editingAt?.r === r && editing ? editingAt.c : -1}
                  decorate={decorate}
                  shared={shared}
                />
              ))}
        </tbody>
      </table>
      {onChecks && !checkRows.length && <p className="px-3 py-4 text-sm text-muted-foreground">{COPY.checksNone}</p>}
    </div>
  );
}
