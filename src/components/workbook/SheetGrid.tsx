/**
 * One sheet of the working paper as a grid (PRD site sweep 2026-10, R4.3–R4.5): column letters and row
 * numbers stuck to the edges, the workbook's frozen panes, its column widths, row heights and merges, and
 * only the cells in view rendered, rows and columns both (the largest sheet is 399 rows by 28 columns,
 * another 226 by 43).
 *
 * The scroller holds three bands, each a row of panes: the column letters, the frozen rows and the rest.
 * The row numbers and the frozen columns are sticky to the left inside each band, and the first two bands
 * sticky to the top, so the browser keeps them in place while the cells scroll. A pane positions its cells
 * absolutely from its own first row and column, and renders the window the scroll position shows, plus a
 * margin. Frozen panes wider than 60 % of the grid, or taller than half of it, are let go, as on a phone.
 *
 * One tab stop: the scroller is the grid, and aria-activedescendant names the selected cell, which is
 * always rendered. Arrows, Home, End, Ctrl+Home, Ctrl+End, Page Up and Page Down move the selection; Enter,
 * or a click on the selected cell, opens the inspector.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import { colLetter } from '@/lib/finance-in-action/engine/address';
import { WORKBOOK_COPY as COPY } from '@/lib/workbook/copy';
import { formatCell } from '@/lib/workbook/format';
import { contains, decodeA1, encodeA1, type Area } from '@/lib/workbook/refs';
import { SPILL_MAX, indexAt, moveFrom, type Cell, type MoveKey, type SheetModel } from '@/lib/workbook/sheet';
import type { WorkbookStyle } from '@/lib/workbook/types';
import { cn } from '@/lib/utils';
import { LOOK, borderCss, kindOf, lookOf } from './look';

/** The column letters' band. */
const HEAD_H = 22;
/** The view assumed before the grid is measured, or where nothing can be (a test's DOM). */
const FALLBACK_VIEW = { w: 960, h: 540 };
/** Pixels rendered beyond each edge of the view, so a short scroll shows cells already there. */
const OVERSCAN = 160;
/** Excel's indent step. */
const INDENT_PX = 9;
const GRIDLINE = 'border-b border-r border-border';

export interface GridMarks {
  /** Ranges the selected cell's formula reads on this sheet. */
  precedents: Area[];
  /** Cells on this sheet whose formulas read the selected cell. */
  dependents: string[];
}

interface SheetGridProps {
  id: string;
  model: SheetModel;
  styles: WorkbookStyle[];
  selected: Cell;
  marks: GridMarks;
  onSelect: (cell: Cell) => void;
  /** Enter, or a click on the selected cell. */
  onActivate: () => void;
  gridRef?: Ref<HTMLDivElement>;
  className?: string;
}

const MOVES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

const cellDomId = (gridId: string, a: string): string => `${gridId}-${a}`;

/** The scroll position is kept in steps this size, so a scroll inside one step re-renders nothing. */
const SCROLL_STEP = OVERSCAN / 2;
const stepped = (px: number): number => Math.floor(px / SCROLL_STEP) * SCROLL_STEP;

/** The first and last index whose spans meet [from, to], within [first, last]. */
function span(edges: number[], first: number, last: number, from: number, to: number): [number, number] {
  if (first > last) return [first, first - 1];
  return [Math.max(first, indexAt(edges, from)), Math.min(last, indexAt(edges, to))];
}

/** One pane: a block of rows and columns placed from its own top-left. */
interface Pane {
  key: string;
  rows: [number, number];
  cols: [number, number];
  /** All the pane's rows and columns, in view or not: what an overlay is clipped to. */
  allRows: [number, number];
  allCols: [number, number];
  x0: number;
  y0: number;
}

export function SheetGrid({ id, model, styles, selected, marks, onSelect, onActivate, gridRef, className }: SheetGridProps) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState(FALLBACK_VIEW);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const follow = useCallback((left: number, top: number) => {
    const next = { left: stepped(left), top: stepped(top) };
    setScroll((was) => (was.left === next.left && was.top === next.top ? was : next));
  }, []);
  const { colLeft, rowTop, lastCol, lastRow } = model;

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      scroller.current = el;
      if (typeof gridRef === 'function') gridRef(el);
      else if (gridRef) (gridRef as { current: HTMLDivElement | null }).current = el;
    },
    [gridRef],
  );

  // The view's size, as the layout gives it.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setView(el.clientWidth && el.clientHeight ? { w: el.clientWidth, h: el.clientHeight } : FALLBACK_VIEW);
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowHeadW = Math.max(36, String(lastRow).length * 8 + 16);
  /** The panes in a view of w × h: the frozen columns and rows kept, and the size left to scroll. */
  const frame = (w: number, h: number) => {
    // Frozen panes that would leave too little to scroll are let go.
    const fc = rowHeadW + colLeft[model.freeze.cols + 1] <= w * 0.6 ? model.freeze.cols : 0;
    const fr = HEAD_H + rowTop[model.freeze.rows + 1] <= h * 0.5 ? model.freeze.rows : 0;
    const frozenW = colLeft[fc + 1];
    const frozenH = rowTop[fr + 1];
    return { fc, fr, frozenW, frozenH, mainW: Math.max(0, w - rowHeadW - frozenW), mainH: Math.max(0, h - HEAD_H - frozenH) };
  };
  const { fc, fr, frozenW, frozenH, mainW, mainH } = frame(view.w, view.h);
  const sheetW = colLeft[lastCol + 1];
  const sheetH = rowTop[lastRow + 1];

  const cols = span(colLeft, fc + 1, lastCol, frozenW + scroll.left - OVERSCAN, frozenW + scroll.left + mainW + OVERSCAN);
  const rows = span(rowTop, fr + 1, lastRow, frozenH + scroll.top - OVERSCAN, frozenH + scroll.top + mainH + OVERSCAN);
  const frozenCols: [number, number] = [1, fc];
  const frozenRows: [number, number] = [1, fr];

  // A new sheet opens at its top-left.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
    follow(0, 0);
  }, [model, follow]);

  // The selection is scrolled into view, past the frozen panes: just into view after a key, as Excel
  // scrolls; to the middle of the view after a jump from elsewhere (a link, a chip, Go To, Back), so the
  // cells around it show.
  const keyed = useRef(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    const centre = !keyed.current;
    keyed.current = false;
    if (!el) return;
    const box = model.mergeOf.get(encodeA1(selected.col, selected.row)) ?? { top: selected.row, left: selected.col, bottom: selected.row, right: selected.col };
    // Measured now: on the first render the view is still the fallback.
    const { fc, fr, frozenW, frozenH, mainW, mainH } = frame(el.clientWidth || view.w, el.clientHeight || view.h);
    let { scrollLeft: left, scrollTop: top } = el;
    if (box.left > fc) {
      const x0 = colLeft[box.left] - frozenW;
      const x1 = colLeft[box.right + 1] - frozenW;
      if (x0 < left || x1 > left + mainW) left = centre ? Math.max(0, x0 - Math.max(0, mainW - (x1 - x0)) / 2) : x0 < left ? x0 : Math.min(x0, x1 - mainW);
    }
    if (box.top > fr) {
      const y0 = rowTop[box.top] - frozenH;
      const y1 = rowTop[box.bottom + 1] - frozenH;
      if (y0 < top || y1 > top + mainH) top = centre ? Math.max(0, y0 - Math.max(0, mainH - (y1 - y0)) / 2) : y0 < top ? y0 : Math.min(y0, y1 - mainH);
    }
    if (left !== el.scrollLeft || top !== el.scrollTop) {
      el.scrollLeft = left;
      el.scrollTop = top;
      follow(el.scrollLeft, el.scrollTop);
    }
    // Only a new selection scrolls; the view's size changing does not pull it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.col, selected.row, model]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) follow(el.scrollLeft, el.scrollTop);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ctrl = e.ctrlKey || e.metaKey;
    let key: MoveKey | null = null;
    if (ctrl && e.key === 'Home') key = 'CtrlHome';
    else if (ctrl && e.key === 'End') key = 'CtrlEnd';
    else if (!ctrl && !e.altKey && MOVES.has(e.key)) key = e.key as MoveKey;
    if (key) {
      e.preventDefault();
      const to = moveFrom(model, selected, key, Math.max(1, Math.floor(mainH / 22)));
      if (to.col === selected.col && to.row === selected.row) return;
      keyed.current = true;
      onSelect(to);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onActivate();
    }
  };

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
    const at = a ? decodeA1(a) : null;
    if (!at) return;
    if (at.col === selected.col && at.row === selected.row) onActivate();
    else onSelect(at);
  };

  const selectedA = encodeA1(selected.col, selected.row);
  const dependents = useMemo(() => new Set(marks.dependents), [marks.dependents]);

  /** The pane's cells, row by row: every cell in view, a merge from its top-left, a label running on. */
  function cellsOf(p: Pane): ReactNode[] {
    const out: ReactNode[] = [];
    const [r0, r1] = p.rows;
    const [c0, c1] = p.cols;
    if (r0 > r1 || c0 > c1) return out;
    const anchors = new Set<string>();
    // Merges and the selection reaching into the window from outside it are drawn from their top-left.
    for (const m of model.merges) {
      const meets = m.bottom >= r0 && m.top <= r1 && m.right >= c0 && m.left <= c1;
      if (meets && (m.top < r0 || m.left < c0) && inPane(p, m.top, m.left)) anchors.add(encodeA1(m.left, m.top));
    }
    if (inPane(p, selected.row, selected.col) && !(selected.row >= r0 && selected.row <= r1 && selected.col >= c0 && selected.col <= c1)) anchors.add(selectedA);
    const byRow = new Map<number, string[]>();
    for (const a of anchors) {
      const at = decodeA1(a)!;
      byRow.set(at.row, [...(byRow.get(at.row) ?? []), a]);
    }
    const first = Math.min(r0, ...[...byRow.keys()]);
    const last = Math.max(r1, ...[...byRow.keys()]);
    for (let r = first; r <= last; r++) {
      const inRows = r >= r0 && r <= r1;
      const list: string[] = [...(byRow.get(r) ?? [])];
      if (inRows) {
        // A label in a column left of the window may run on into it.
        for (let c = Math.max(p.allCols[0], c0 - SPILL_MAX); c < c0; c++) {
          const a = encodeA1(c, r);
          if ((model.spill.get(a) ?? 0) >= c0) list.push(a);
        }
        for (let c = c0; c <= c1; c++) {
          const a = encodeA1(c, r);
          const m = model.mergeOf.get(a);
          if (m && (m.top !== r || m.left !== c)) continue;
          list.push(a);
        }
      }
      if (!list.length) continue;
      out.push(
        <div key={r} role="row" aria-rowindex={r} className="absolute left-0" style={{ top: rowTop[r] - p.y0, height: rowTop[r + 1] - rowTop[r], width: 0 }}>
          {[...new Set(list)].map((a) => cellAt(p, a, r))}
        </div>,
      );
    }
    return out;
  }

  function cellAt(p: Pane, a: string, r: number): ReactNode {
    const { col: c } = decodeA1(a)!;
    const cell = model.cells.get(a);
    const style = cell?.s === undefined ? undefined : styles[cell.s];
    const merge = model.mergeOf.get(a);
    const right = merge?.right ?? c;
    const bottom = merge?.bottom ?? r;
    const w = colLeft[right + 1] - colLeft[c];
    const h = rowTop[bottom + 1] - rowTop[r];
    const kind = kindOf(cell);
    const text = cell ? formatCell(cell, style?.numFmt) : '';
    const spillTo = model.spill.get(a);
    const align = style?.align;
    const horizontal =
      align?.horizontal ??
      (kind === 'error' || typeof cell?.v === 'boolean' ? 'center' : typeof cell?.v === 'number' || cell?.t === 'd' ? 'right' : 'left');
    const indent = (align?.indent ?? 0) * INDENT_PX;
    const box: CSSProperties = {
      left: colLeft[c] - p.x0,
      top: 0,
      width: w,
      height: h,
      paddingLeft: 4 + (horizontal === 'left' ? indent : 0),
      paddingRight: 4 + (horizontal === 'right' ? indent : 0),
    };
    if (style?.border?.top) box.borderTop = borderCss(style.border.top);
    if (style?.border?.bottom) box.borderBottom = borderCss(style.border.bottom);
    // A screen reader hears what the colours say: the cell's kind and the workbook's own red or blue type.
    const kindWord = kind === 'formula' ? COPY.legendFormula : kind === 'error' ? COPY.legendError : kind === 'constant' && typeof cell?.v === 'number' ? COPY.legendConstant : null;
    const colourWord = kind === 'error' ? null : style?.color === 'red' ? COPY.legendRed : style?.color === 'blue' ? COPY.legendBlue : null;
    const label = [a, text || COPY.empty, kindWord, colourWord].filter(Boolean).join(', ');
    return (
      <div
        key={a}
        id={cellDomId(id, a)}
        role="gridcell"
        aria-colindex={c}
        aria-selected={a === selectedA}
        aria-label={label}
        data-a={a}
        data-kind={kind}
        className={cn(
          'absolute flex',
          GRIDLINE,
          lookOf(cell, style),
          style?.bold && 'font-semibold',
          align?.vertical === 'top' ? 'items-start' : align?.vertical === 'middle' || align?.vertical === 'center' ? 'items-center' : 'items-end',
          horizontal === 'right' ? 'justify-end' : horizontal === 'center' || horizontal === 'centerContinuous' ? 'justify-center' : 'justify-start',
        )}
        style={box}
      >
        {text &&
          (spillTo ? (
            // A label running on hides the gridlines it crosses, as Excel's does; it does not shrink to its cell.
            <span className="relative z-[1] flex-none overflow-hidden whitespace-nowrap bg-popover pr-1" style={{ maxWidth: colLeft[spillTo + 1] - colLeft[c] - 4 - indent }}>
              {text}
            </span>
          ) : (
            <span className={cn('min-w-0', align?.wrap ? 'whitespace-pre-line break-words leading-tight' : 'truncate')}>{text}</span>
          ))}
      </div>
    );
  }

  /** The selection, the precedents and the dependents, over the pane's cells. */
  function overlaysOf(p: Pane): ReactNode[] {
    const out: ReactNode[] = [];
    const clip = (area: Area): CSSProperties | null => {
      const top = Math.max(area.top, p.allRows[0], p.rows[0] - 1);
      const bottom = Math.min(area.bottom, p.allRows[1], p.rows[1] + 1);
      const left = Math.max(area.left, p.allCols[0], p.cols[0] - 1);
      const right = Math.min(area.right, p.allCols[1], p.cols[1] + 1);
      if (top > bottom || left > right) return null;
      return { left: colLeft[left] - p.x0, top: rowTop[top] - p.y0, width: colLeft[right + 1] - colLeft[left], height: rowTop[bottom + 1] - rowTop[top] };
    };
    marks.precedents.forEach((area, i) => {
      const at = clip(area);
      if (at)
        out.push(
          <div
            key={`p${i}`}
            aria-hidden="true"
            data-precedent={encodeA1(area.left, area.top) + (area.bottom > area.top || area.right > area.left ? `:${encodeA1(area.right, area.bottom)}` : '')}
            className={cn('pointer-events-none absolute z-[2] mix-blend-multiply', LOOK.precedent.className, LOOK.precedentOutline)}
            style={at}
          />,
        );
    });
    for (const a of dependents) {
      const at = decodeA1(a);
      const style = at && clip({ top: at.row, left: at.col, bottom: at.row, right: at.col });
      if (style) out.push(<div key={`d${a}`} aria-hidden="true" data-dependent={a} className={cn('pointer-events-none absolute z-[2] mix-blend-multiply', LOOK.dependent.className)} style={style} />);
    }
    const sel = model.mergeOf.get(selectedA) ?? { top: selected.row, left: selected.col, bottom: selected.row, right: selected.col };
    if (inPane(p, sel.top, sel.left)) {
      const style = clip(sel);
      if (style) out.push(<div key="sel" aria-hidden="true" data-selected={selectedA} className="pointer-events-none absolute z-[3] outline outline-2 -outline-offset-2 outline-foreground" style={style} />);
    }
    return out;
  }

  const pane = (key: string, r: [number, number], c: [number, number], allRows: [number, number], allCols: [number, number]): Pane => ({
    key,
    rows: r,
    cols: c,
    allRows,
    allCols,
    x0: colLeft[allCols[0]],
    y0: rowTop[allRows[0]],
  });
  const allFrozenRows: [number, number] = [1, fr];
  const allMainRows: [number, number] = [fr + 1, lastRow];
  const allFrozenCols: [number, number] = [1, fc];
  const allMainCols: [number, number] = [fc + 1, lastCol];
  const panes = {
    corner: pane('corner', frozenRows, frozenCols, allFrozenRows, allFrozenCols),
    top: pane('top', frozenRows, cols, allFrozenRows, allMainCols),
    left: pane('left', rows, frozenCols, allMainRows, allFrozenCols),
    main: pane('main', rows, cols, allMainRows, allMainCols),
  };

  const letters = (range: [number, number], x0: number) => {
    const out: ReactNode[] = [];
    for (let c = range[0]; c <= range[1]; c++) {
      const hidden = model.hiddenCols.has(c);
      const name = colLetter(c);
      out.push(
        <div
          key={c}
          title={hidden ? COPY.hiddenHeader(name) : undefined}
          className={cn(
            'absolute top-0 flex h-full items-center justify-center border-b border-r border-border text-[11px]',
            c === selected.col ? 'bg-border font-semibold text-foreground' : 'bg-background text-muted-foreground',
            hidden && 'wb-hidden italic',
          )}
          style={{ left: colLeft[c] - x0, width: colLeft[c + 1] - colLeft[c] }}
        >
          {name}
        </div>,
      );
    }
    return out;
  };
  const numbers = (range: [number, number], y0: number) => {
    const out: ReactNode[] = [];
    for (let r = range[0]; r <= range[1]; r++) {
      const hidden = model.hiddenRows.has(r);
      out.push(
        <div
          key={r}
          title={hidden ? COPY.hiddenHeader(String(r)) : undefined}
          className={cn(
            'absolute left-0 flex w-full items-center justify-center border-b border-r border-border text-[11px]',
            r === selected.row ? 'bg-border font-semibold text-foreground' : 'bg-background text-muted-foreground',
            hidden && 'wb-hidden italic',
          )}
          style={{ top: rowTop[r] - y0, height: rowTop[r + 1] - rowTop[r] }}
        >
          {r}
        </div>,
      );
    }
    return out;
  };

  const block = (p: Pane, extra?: string, style?: CSSProperties) => (
    <div className={cn('relative flex-none', extra)} style={{ width: colLeft[p.allCols[1] + 1] - colLeft[p.allCols[0]], ...style }}>
      {cellsOf(p)}
      {overlaysOf(p)}
    </div>
  );

  return (
    <div
      ref={setRefs}
      id={id}
      role="grid"
      tabIndex={0}
      aria-label={`${COPY.sheetLabel(model.name)}. ${COPY.gridKeys}`}
      aria-rowcount={lastRow}
      aria-colcount={lastCol}
      aria-activedescendant={cellDomId(id, selectedA)}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className={cn(
        'relative overflow-auto overscroll-contain bg-popover font-sans text-[12px] leading-4 tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        className,
      )}
    >
      <div className="relative" style={{ width: rowHeadW + sheetW, height: HEAD_H + sheetH }}>
        {/* The column letters */}
        <div aria-hidden="true" className="sticky top-0 z-[6] flex" style={{ height: HEAD_H }}>
          <div className="sticky left-0 z-[2] flex-none border-b border-r border-border bg-background" style={{ width: rowHeadW }} />
          <div className="sticky z-[1] flex-none" style={{ left: rowHeadW, width: frozenW }}>
            {letters(frozenCols, 0)}
          </div>
          <div className="relative flex-none" style={{ width: sheetW - frozenW }}>
            {letters(cols, frozenW)}
          </div>
        </div>
        {/* The frozen rows */}
        {fr > 0 && (
          <div className="sticky z-[5] flex" style={{ top: HEAD_H, height: frozenH }}>
            <div aria-hidden="true" className="sticky left-0 z-[2] flex-none" style={{ width: rowHeadW }}>
              {numbers(frozenRows, 0)}
            </div>
            {block(panes.corner, 'sticky z-[1] bg-popover border-b-2 border-r-2 border-border', { left: rowHeadW, height: frozenH })}
            {block(panes.top, 'bg-popover border-b-2 border-border', { height: frozenH })}
          </div>
        )}
        {/* The rest */}
        <div className="flex" style={{ height: sheetH - frozenH }}>
          <div aria-hidden="true" className="sticky left-0 z-[4] flex-none" style={{ width: rowHeadW }}>
            {numbers(rows, frozenH)}
          </div>
          {fc > 0 && block(panes.left, 'sticky z-[3] bg-popover border-r-2 border-border', { left: rowHeadW })}
          {block(panes.main)}
        </div>
      </div>
    </div>
  );
}

function inPane(p: Pane, row: number, col: number): boolean {
  return contains({ top: p.allRows[0], bottom: p.allRows[1], left: p.allCols[0], right: p.allCols[1] }, col, row);
}
