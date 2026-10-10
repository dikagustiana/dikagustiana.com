/**
 * The published working paper: public/consolidation/pt-dummy-psak-338.workbook.json, written by
 * scripts/consolidation/build-workbook.ts from the committed xlsx (PRD site sweep 2026-10, R4.1). The
 * viewer reads it as data; nothing in it is recalculated.
 *
 * Sanitised per D9 and R4.2: the hidden sheet and the empty ones are left out and listed in `excluded`,
 * and defined names are dropped. Values are Excel's cached values, unaltered.
 */

/** The Excel line style of a cell's top or bottom border, as the file names it ("thin", "double", …). */
export type BorderLine = string;

/**
 * One cell style, shared by every cell that carries it (the cells point at it by index, as an xlsx does).
 * A key is present only when it differs from Excel's default: General, regular weight, default alignment,
 * no border.
 */
export interface WorkbookStyle {
  /**
   * Excel's number format as exceljs reads it, which drops the backslash escapes (`\(` reads `(`). In this
   * file's formats the escaped characters are literals either way, so the display is unchanged.
   */
  numFmt?: string;
  bold?: true;
  /** The font colour, kept only when it is red or blue (D10: red is an adjustment or a reviewer's flag, blue a manual input). */
  color?: 'red' | 'blue';
  align?: {
    horizontal?: string;
    vertical?: string;
    indent?: number;
    wrap?: true;
  };
  /** The top and bottom borders only: the rules under subtotals and totals. */
  border?: { top?: BorderLine; bottom?: BorderLine };
}

export interface WorkbookCell {
  /** A1 address on its sheet. */
  a: string;
  /**
   * Excel's cached value: a number, text or boolean as is; a date as an ISO 8601 string (`t: 'd'`); an error
   * code such as `#REF!` (`t: 'e'`). Absent on a cell kept only for its border.
   */
  v?: number | string | boolean;
  t?: 'd' | 'e';
  /** The formula without its leading "=". A shared formula is written out as this cell's own formula. */
  f?: string;
  /** Index into `PublishedWorkbook.styles`; absent for the default style. */
  s?: number;
}

export interface WorkbookColumn {
  /** Column letter. */
  col: string;
  /** Width in Excel's character units. */
  width?: number;
  hidden?: true;
}

export interface WorkbookRow {
  row: number;
  /** Height in points. */
  height?: number;
  hidden?: true;
}

export interface WorkbookSheet {
  name: string;
  /** 1-based position in the source workbook, before sanitising. */
  order: number;
  hidden: boolean;
  /** The bounding range of the published cells and merges, e.g. `B3:AJ120`. */
  dimension: string;
  defaultColWidth: number | null;
  defaultRowHeight: number | null;
  /** Columns and rows with a width, height or hidden flag of their own, inside the dimension. */
  columns: WorkbookColumn[];
  rows: WorkbookRow[];
  /** Merged ranges, e.g. `B3:D3`, top-left first. */
  merges: string[];
  /**
   * The frozen panes: the rows above and the columns left of the split. Null when nothing is frozen. Excel
   * counts them from where the sheet's view starts, the viewer from A1; the two differ only on a sheet frozen
   * with its view scrolled, which docs/consolidation/build-report.md names.
   */
  freeze: { rows: number; cols: number } | null;
  /** Row by row, left to right. */
  cells: WorkbookCell[];
}

export interface PublishedWorkbook {
  format: 'workbook-json/1';
  source: {
    /** Repository path of the xlsx the file was built from. */
    path: string;
    sha256: string;
    bytes: number;
  };
  generator: string;
  /** Sheets in the source, before sanitising. */
  sourceSheets: number;
  /** Sheets left out per D9, with the rule that dropped each. */
  excluded: { name: string; order: number; reason: 'hidden' | 'empty' }[];
  /** Counts over the published sheets. */
  counts: {
    sheets: number;
    cells: number;
    formulas: number;
    errors: number;
    red: number;
    blue: number;
  };
  styles: WorkbookStyle[];
  sheets: WorkbookSheet[];
}
