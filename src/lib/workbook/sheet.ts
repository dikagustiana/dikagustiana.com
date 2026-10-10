/**
 * One sheet of the working paper as the viewer lays it out (PRD site sweep 2026-10, R4.3, R4.4): where every
 * column and row sits, which cells a merge covers, how far a label runs on into the empty cells beside it,
 * and where a key press or a typed address moves the selection. Pure, so the grid only reads it.
 *
 * Geometry is Excel's, scaled once: a column of width w (Excel's character units, Calibri 11's maximum digit
 * width of 7 px) is w × 7 × ZOOM pixels wide; a row of h points is h × 4/3 × ZOOM pixels tall. ZOOM sets the
 * file's default 12.5 pt row at 22 px and its 8.27-character column at 75 px, the reference grid's
 * measures, so the site's 12 px figures fit where Excel's fit. Rows and columns the workbook hides are laid
 * out at their stored size and marked: the viewer shows every cell a formula can read.
 */
import { MAX_COL, MAX_ROW, decodeA1, encodeA1, parseRefs, type Area } from './refs';
import type { WorkbookCell, WorkbookSheet, WorkbookStyle } from './types';

export const ZOOM = 1.3;
/** Excel's maximum digit width for Calibri 11, the unit a column width counts. */
const PX_PER_CHAR = 7;
const PX_PER_POINT = 4 / 3;
/** Excel's defaults, for a sheet that stores none. */
const DEFAULT_COL_WIDTH = 8.43;
const DEFAULT_ROW_HEIGHT = 15;
/** How many empty cells a label may run on into, as Excel lets it; bounds the grid's look-behind. */
export const SPILL_MAX = 12;

export const colWidthPx = (width: number): number => Math.round(width * PX_PER_CHAR * ZOOM);
export const rowHeightPx = (points: number): number => Math.round(points * PX_PER_POINT * ZOOM);

export interface Cell {
  col: number;
  row: number;
}

export interface SheetModel {
  name: string;
  /**
   * The grid runs from A1 to the dimension's bottom-right, as Excel shows it, or further when a formula
   * names a cell beyond it (the graph's used part), so a jump lands on that cell.
   */
  lastCol: number;
  lastRow: number;
  /** colLeft[c] is column c's left edge (1-based); colLeft[lastCol + 1] is the sheet's width. */
  colLeft: number[];
  /** rowTop[r] is row r's top edge; rowTop[lastRow + 1] is the sheet's height. */
  rowTop: number[];
  hiddenCols: Set<number>;
  hiddenRows: Set<number>;
  cells: Map<string, WorkbookCell>;
  merges: Area[];
  /** Every cell a merge covers, its top-left included, to its merge. */
  mergeOf: Map<string, Area>;
  /** A label's last column when its text runs on into the empty cells to its right. */
  spill: Map<string, number>;
  /** The frozen panes, 0 when nothing is frozen. */
  freeze: { rows: number; cols: number };
}

/** An A1 range as an area; a single cell is a one-cell area. */
export function decodeArea(range: string): Area | null {
  const [a, b = a] = range.split(':');
  const p = decodeA1(a);
  const q = decodeA1(b);
  if (!p || !q) return null;
  return { top: Math.min(p.row, q.row), left: Math.min(p.col, q.col), bottom: Math.max(p.row, q.row), right: Math.max(p.col, q.col) };
}

/** Excel's general alignment and an explicit left both let text run on to the right. */
const runsOn = (cell: WorkbookCell, style: WorkbookStyle | undefined): boolean =>
  typeof cell.v === 'string' && cell.t === undefined && !style?.align?.wrap && (style?.align?.horizontal ?? 'left') === 'left';

export function buildSheetModel(sheet: WorkbookSheet, styles: WorkbookStyle[], used?: Area): SheetModel {
  const end = decodeA1(sheet.dimension.split(':').pop() ?? '') ?? { col: 1, row: 1 };
  const lastCol = Math.max(end.col, used?.right ?? 0);
  const lastRow = Math.max(end.row, used?.bottom ?? 0);

  const widths = new Map<number, number>();
  const hiddenCols = new Set<number>();
  for (const c of sheet.columns) {
    const at = decodeA1(`${c.col}1`)?.col;
    if (at === undefined) continue;
    if (c.width !== undefined) widths.set(at, c.width);
    if (c.hidden) hiddenCols.add(at);
  }
  const heights = new Map<number, number>();
  const hiddenRows = new Set<number>();
  for (const r of sheet.rows) {
    if (r.height !== undefined) heights.set(r.row, r.height);
    if (r.hidden) hiddenRows.add(r.row);
  }

  const colLeft = [0, 0];
  for (let c = 1; c <= lastCol; c++) colLeft[c + 1] = colLeft[c] + colWidthPx(widths.get(c) ?? sheet.defaultColWidth ?? DEFAULT_COL_WIDTH);
  const rowTop = [0, 0];
  for (let r = 1; r <= lastRow; r++) rowTop[r + 1] = rowTop[r] + rowHeightPx(heights.get(r) ?? sheet.defaultRowHeight ?? DEFAULT_ROW_HEIGHT);

  const cells = new Map<string, WorkbookCell>();
  for (const cell of sheet.cells) cells.set(cell.a, cell);

  const merges: Area[] = [];
  const mergeOf = new Map<string, Area>();
  for (const range of sheet.merges) {
    const area = decodeArea(range);
    if (!area) continue;
    merges.push(area);
    for (let r = area.top; r <= area.bottom; r++) for (let c = area.left; c <= area.right; c++) mergeOf.set(encodeA1(c, r), area);
  }

  const spill = new Map<string, number>();
  for (const cell of sheet.cells) {
    if (mergeOf.has(cell.a) || !runsOn(cell, cell.s === undefined ? undefined : styles[cell.s])) continue;
    const at = decodeA1(cell.a)!;
    let to = at.col;
    while (to < lastCol && to - at.col < SPILL_MAX) {
      const next = encodeA1(to + 1, at.row);
      if (cells.get(next)?.v !== undefined || mergeOf.has(next)) break;
      to++;
    }
    if (to > at.col) spill.set(cell.a, to);
  }

  const freeze = {
    rows: Math.min(sheet.freeze?.rows ?? 0, lastRow),
    cols: Math.min(sheet.freeze?.cols ?? 0, lastCol),
  };
  return { name: sheet.name, lastCol, lastRow, colLeft, rowTop, hiddenCols, hiddenRows, cells, merges, mergeOf, spill, freeze };
}

/**
 * The 1-based index whose span holds `pos` in a list of edges (colLeft, rowTop): the last index whose edge
 * is at or before it, kept between 1 and the last.
 */
export function indexAt(edges: number[], pos: number): number {
  const last = edges.length - 2;
  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (edges[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** A cell inside a merge is selected as the merge's top-left, as Excel does. */
export function snap(model: SheetModel, at: Cell): Cell {
  const col = Math.max(1, Math.min(model.lastCol, at.col));
  const row = Math.max(1, Math.min(model.lastRow, at.row));
  const merge = model.mergeOf.get(encodeA1(col, row));
  return merge ? { col: merge.left, row: merge.top } : { col, row };
}

/** Where a sheet opens: the top-left of what it holds. */
export function firstCell(sheet: WorkbookSheet, model: SheetModel): Cell {
  const start = decodeA1(sheet.dimension.split(':')[0]) ?? { col: 1, row: 1 };
  return snap(model, start);
}

export type MoveKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End' | 'PageUp' | 'PageDown' | 'CtrlHome' | 'CtrlEnd';

/**
 * Where a key takes the selection. Arrows step one cell and step over a merge; Home and End go to the start
 * and end of the row; Ctrl+Home to the first cell past the frozen panes (A1 when nothing is frozen) and
 * Ctrl+End to the sheet's last cell; Page Up and Page Down move by `pageRows`.
 */
export function moveFrom(model: SheetModel, at: Cell, key: MoveKey, pageRows = 20): Cell {
  const merge = model.mergeOf.get(encodeA1(at.col, at.row));
  const box = merge ?? { top: at.row, left: at.col, bottom: at.row, right: at.col };
  const to = { ...at };
  switch (key) {
    case 'ArrowUp':
      to.row = box.top - 1;
      break;
    case 'ArrowDown':
      to.row = box.bottom + 1;
      break;
    case 'ArrowLeft':
      to.col = box.left - 1;
      break;
    case 'ArrowRight':
      to.col = box.right + 1;
      break;
    case 'Home':
      to.col = 1;
      break;
    case 'End':
      to.col = model.lastCol;
      break;
    case 'PageUp':
      to.row = at.row - pageRows;
      break;
    case 'PageDown':
      to.row = at.row + pageRows;
      break;
    case 'CtrlHome':
      return snap(model, { col: model.freeze.cols + 1, row: model.freeze.rows + 1 });
    case 'CtrlEnd':
      return snap(model, { col: model.lastCol, row: model.lastRow });
  }
  return snap(model, to);
}

/**
 * What the name box was given: `D9`, `$D$9`, a range (its top-left is selected; not a whole column or row), or a cell on another sheet,
 * `'Consol SoFP 24'!D9` as Excel writes it or `Consol SoFP 24!D9` as a person types it. The sheet is
 * returned as typed; null when there is no cell to go to.
 */
export function readGoTo(text: string): { sheet: string | null; cell: Cell } | null {
  const typed = text.trim();
  if (!typed) return null;
  const [ref] = parseRefs(typed);
  const whole = ref && ((ref.top === 1 && ref.bottom === MAX_ROW) || (ref.left === 1 && ref.right === MAX_COL));
  if (ref && !whole && ref.start === 0 && ref.end === typed.length) {
    return { sheet: ref.sheet, cell: { col: ref.left, row: ref.top } };
  }
  // An unquoted sheet name with spaces: the address is what follows the last "!".
  const bang = typed.lastIndexOf('!');
  if (bang <= 0) return null;
  const area = decodeArea(typed.slice(bang + 1).replace(/\$/g, ''));
  const sheet = typed.slice(0, bang).replace(/^'(.*)'$/, '$1');
  return area && sheet ? { sheet, cell: { col: area.left, row: area.top } } : null;
}
