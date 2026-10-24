/**
 * The Checks sheet (sheet-first PRD D-S4): a read-only sheet worked from the
 * package, never stored in it. One row per check: every cell that carries a
 * tie-out, then every cell of a `gap_*` row (a difference the model itself
 * works, nil when the model agrees with the filing). The grid draws it and
 * the export writes it from this same table, so its letters and numbers are
 * the workbook's (K2): A the check, B the unit, then the columns below, with
 * the header on row 1 and checks from row 2.
 *
 * The model's figure is a formula over the checked cell, as the workbook
 * writes it; the figure as filed, the difference and the status are the
 * package's own (a gap row's status is worked: nil within the package's
 * rounding agrees).
 */
import { ADDRESSING, type ModelPackage, type Row } from '../contract/types';
import { SHEETS, TIE_OUT_STATUSES, byId, type SheetId, type TieOutStatus } from '../constants';
import { COPY } from '../copy';
import { roundingTolerance } from '../contract/validate';
import { isNum, type Value } from '../engine/engine';
import { decimalsFor, formatForRow, formatNumber, isRatioRow } from '../format';
import { periodColumn, rowNumber, type Workbook } from '../model/workbook';
import { colLetter, normaliseSheet } from '../engine/address';
import { addressText, keyFromAddress, parseTyped, type AddressMiss } from './sheetAddress';

export const CHECKS_SHEET = { id: 'checks', label: COPY.checks, means: COPY.checksMeans } as const;
export type ChecksSheetId = typeof CHECKS_SHEET.id;

/** A row id that marks a gap row. */
export const GAP_PREFIX = 'gap_';

/** The columns after A (the check) and B (the unit), in order. */
export const CHECK_COLUMNS = [
  { id: 'cell', label: COPY.checksHeader.cell },
  { id: 'model', label: COPY.checksHeader.model },
  { id: 'filed', label: COPY.checksHeader.filed },
  { id: 'difference', label: COPY.checksHeader.difference },
  { id: 'status', label: COPY.checksHeader.status },
  { id: 'source', label: COPY.checksHeader.source },
] as const;

export interface CheckCell {
  /** As the grid shows it. */
  text: string;
  /** A number the workbook writes as a number; undefined for text. */
  value?: number | null;
  /** A formula the workbook writes, with its leading "=". */
  formula?: string;
}

export interface CheckRow {
  /** The checked cell. */
  key: string;
  label: string;
  unit: string;
  status: TieOutStatus;
  /** One per CHECK_COLUMNS entry. */
  cells: CheckCell[];
}

/** The workbook's name of a sheet: its tab label. */
export const sheetLabel = (id: string): string => byId(SHEETS, id)?.label ?? id;

function differenceText(difference: number | null, of: number | null, row: Pick<Row, 'unit' | 'style'>): string {
  if (difference === null || isRatioRow(row)) return formatForRow(difference, row);
  return formatNumber(difference, decimalsFor(of ?? difference));
}

function gapStatus(pkg: ModelPackage, v: number | null): TieOutStatus {
  if (v === null) return 'not_checked';
  return Math.abs(v) <= roundingTolerance(pkg) ? 'agrees' : 'differs';
}

/** Every check of the package, sheet by sheet in package order, row by row, period by period. */
export function checksRows(pkg: ModelPackage, wb: Workbook, values: Map<string, Value>): CheckRow[] {
  const out: CheckRow[] = [];
  for (const sheet of pkg.sheets) {
    sheet.rows.forEach((row, ri) => {
      const gap = row.id.startsWith(GAP_PREFIX);
      row.cells.forEach((cell, pi) => {
        if (!cell.tieOut && !gap) return;
        const key = wb.keyOf(`${sheet.id}!${row.id}`, pkg.periods[pi].id);
        if (!key) return;
        const v = values.get(key);
        const value = isNum(v) ? v : null;
        const col = periodColumn(pi);
        const rowNo = rowNumber(ri);
        const tie = cell.tieOut;
        const filed = tie ? tie.externalValue : null;
        const difference = tie ? tie.difference : value;
        const status = tie ? tie.status : gapStatus(pkg, value);
        out.push({
          key,
          label: `${row.label}, ${pkg.periods[pi].label}`,
          unit: row.unit,
          status,
          cells: [
            { text: addressText(sheet.id, col, rowNo) },
            { text: formatForRow(value, row), value, formula: `='${sheetLabel(sheet.id)}'!${col}${rowNo}` },
            { text: formatForRow(filed, row), value: filed },
            // In the decimals of the figure it is a difference of, as the inspector states it.
            { text: differenceText(difference, filed ?? value, row), value: difference },
            { text: byId(TIE_OUT_STATUSES, status)?.label ?? status },
            { text: tie ? tie.sourceText : COPY.checksGap },
          ],
        });
      });
    });
  }
  return out;
}

/** The header row of the Checks sheet: A, B, then CHECK_COLUMNS. */
export const checksHeader = (): string[] => [COPY.checksHeader.check, COPY.checksHeader.unit, ...CHECK_COLUMNS.map((c) => c.label)];

/** The first column after the check and its unit, as the grid and the workbook number it. */
export const CHECKS_FIRST_COLUMN = ADDRESSING.firstPeriodColumn;

/** The name box's address of a cell of the Checks sheet, by its place in the grid. */
export const checksAddress = (r: number, c: number): string => addressText(CHECKS_SHEET.id, colLetter(CHECKS_FIRST_COLUMN + c), rowNumber(r));

/** A sheet the grid shows: one of the package's, or the Checks sheet. */
export type ViewSheetId = SheetId | ChecksSheetId;

export type GoTo =
  | { ok: true; sheet: SheetId; key: string }
  | { ok: true; sheet: ChecksSheetId; r: number; c: number }
  | { ok: false; reason: AddressMiss };

/**
 * Where a typed address goes: a value cell of a package sheet (keyFromAddress),
 * or a cell of the Checks sheet, named as `checks!C2` or, while the Checks
 * sheet is open, as `C2`. Its columns A and B, and its header row, are
 * refused as on any sheet.
 */
export function goTo(wb: Workbook, text: string, current: ViewSheetId, checkCount: number): GoTo {
  const typed = parseTyped(text);
  if (!typed) return { ok: false, reason: 'syntax' };
  const onChecks = typed.sheet === undefined ? current === CHECKS_SHEET.id : normaliseSheet(typed.sheet) === CHECKS_SHEET.id || normaliseSheet(typed.sheet) === normaliseSheet(CHECKS_SHEET.label);
  if (!onChecks) return keyFromAddress(wb, text, current === CHECKS_SHEET.id ? 'model' : current);
  if (typed.col === ADDRESSING.labelColumn) return { ok: false, reason: 'label' };
  if (typed.col === ADDRESSING.unitColumn) return { ok: false, reason: 'unit' };
  if (typed.row === ADDRESSING.headerRow) return { ok: false, reason: 'header' };
  const r = typed.row - ADDRESSING.firstDataRow;
  const c = typed.col - CHECKS_FIRST_COLUMN;
  if (r < 0 || r >= checkCount || c < 0 || c >= CHECK_COLUMNS.length) return { ok: false, reason: 'outside' };
  return { ok: true, sheet: CHECKS_SHEET.id, r, c };
}

/** The order the sheet tabs stand in: the model first, as the page opens on it (PRD R2.4). */
const TAB_ORDER: SheetId[] = ['model', 'reported', 'assumptions'];

/** The sheets the grid can show, in tab order: the package's own, then Checks. */
export function viewSheets(pkg: ModelPackage): { id: ViewSheetId; label: string; means: string }[] {
  const own = TAB_ORDER.flatMap((id) => {
    const s = byId(SHEETS, id);
    return s && pkg.sheets.some((x) => x.id === id) ? [{ id: s.id as ViewSheetId, label: s.label as string, means: s.means as string }] : [];
  });
  return [...own, { id: CHECKS_SHEET.id, label: CHECKS_SHEET.label, means: CHECKS_SHEET.means }];
}
