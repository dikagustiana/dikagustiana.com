/**
 * The grid's addresses, as the downloaded .xlsx has them (sheet-first PRD
 * R2.2, R2.3, K2): column A the label, B the unit, the first period in C,
 * the period header on row 1 and rows[n] on row n + 2 (contract/types.ts
 * ADDRESSING). The column letters, the row numbers, the name box and its Go
 * To all come from here, and through Workbook, which owns the convention.
 *
 * Also what the formula bar shows for a cell (R2.2, K3): a formula as the
 * engine and the workbook hold it, a sourced figure with its document, an
 * assumption's value (editable), or "Not disclosed".
 */
import { ADDRESSING } from '../contract/types';
import { SHEETS, type SheetId } from '../constants';
import { COPY } from '../copy';
import { colIndex, colLetter, normaliseSheet } from '../engine/address';
import { isNum, type Value } from '../engine/engine';
import { formatForRow } from '../format';
import { periodColumn, rowNumber, type Workbook } from '../model/workbook';
import { isEditable } from '../model/scenario';

export interface SheetAddress {
  sheet: SheetId;
  /** Column letter: "E". */
  col: string;
  /** Row number: 14. */
  row: number;
  /** As the name box shows it: "MODEL!E14". */
  text: string;
}

/** The name box's form of an address: the sheet in capitals, then the cell. */
export const addressText = (sheet: string, col: string, row: number): string => `${sheet.toUpperCase()}!${col}${row}`;

/** The address of a cell key on its sheet, or undefined when the key names no cell of the package. */
export function addressOf(wb: Workbook, key: string): SheetAddress | undefined {
  const a = wb.address(key);
  if (!a) return undefined;
  const col = periodColumn(a.periodIndex);
  const row = rowNumber(a.rowIndex);
  return { sheet: a.sheet, col, row, text: addressText(a.sheet, col, row) };
}

/** The letters over a grid of `columnCount` columns: A, B, C… */
export const letters = (columnCount: number): string[] => Array.from({ length: columnCount }, (_, i) => colLetter(i + 1));

/** The letters over a sheet: A (label), B (unit), then one per period. */
export const columnLetters = (periodCount: number): string[] => letters(ADDRESSING.firstPeriodColumn - 1 + periodCount);

export interface TypedAddress {
  /** As typed, without quotes; undefined when no sheet was given. */
  sheet?: string;
  /** 1-based column. */
  col: number;
  row: number;
}

const TYPED = /^(?:(?:'([^']+)'|([^'!]+))!)?\$?([A-Za-z]{1,3})\$?(\d+)$/;

/** Reads `E14`, `$E$14`, `model!e14`, `'Model'!E14`; null when it is not an address. */
export function parseTyped(text: string): TypedAddress | null {
  const m = TYPED.exec(text.trim());
  if (!m) return null;
  const row = Number(m[4]);
  if (!Number.isInteger(row) || row < 1) return null;
  const sheet = (m[1] ?? m[2])?.trim();
  return { sheet: sheet || undefined, col: colIndex(m[3].toUpperCase()), row };
}

/** A sheet named by its id or by its tab label, in any case: "model", "Model", "MODEL". */
export function sheetNamed(typed: string, ids: readonly string[]): string | undefined {
  const t = normaliseSheet(typed);
  return ids.find((id) => id === t || normaliseSheet(SHEETS.find((s) => s.id === id)?.label ?? id) === t);
}

/** Why an address names no value cell. */
export type AddressMiss = 'syntax' | 'sheet' | 'label' | 'unit' | 'header' | 'outside';

export type AddressLookup = { ok: true; key: string; sheet: SheetId } | { ok: false; reason: AddressMiss };

/**
 * The cell key a typed address names on the package's sheets, on `current`
 * when no sheet is typed. Columns A and B hold a row's label and unit, and
 * row 1 the period header: none of them is a value cell, so each is refused
 * with its reason, as is anything past the sheet's last row or period.
 */
export function keyFromAddress(wb: Workbook, text: string, current: SheetId): AddressLookup {
  const typed = parseTyped(text);
  if (!typed) return { ok: false, reason: 'syntax' };
  const ids = wb.pkg.sheets.map((s) => s.id);
  const sheet = (typed.sheet === undefined ? current : sheetNamed(typed.sheet, ids)) as SheetId | undefined;
  if (!sheet || !ids.includes(sheet)) return { ok: false, reason: 'sheet' };
  if (typed.col === ADDRESSING.labelColumn) return { ok: false, reason: 'label' };
  if (typed.col === ADDRESSING.unitColumn) return { ok: false, reason: 'unit' };
  if (typed.row === ADDRESSING.headerRow) return { ok: false, reason: 'header' };
  const rows = wb.pkg.sheets.find((s) => s.id === sheet)?.rows ?? [];
  const row = rows[typed.row - ADDRESSING.firstDataRow];
  const period = wb.pkg.periods[typed.col - ADDRESSING.firstPeriodColumn];
  const key = row && period ? wb.keyOf(`${sheet}!${row.id}`, period.id) : undefined;
  return key ? { ok: true, key, sheet } : { ok: false, reason: 'outside' };
}

/** The name box's sentence for an address that names no value cell. */
export const addressMissText = (typed: string, reason: AddressMiss): string =>
  reason === 'label' || reason === 'unit' ? COPY.nameBoxNotValue(typed.trim(), reason) : COPY.nameBoxNoCell(typed.trim());

export interface FormulaBarContent {
  kind: 'formula' | 'sourced' | 'assumption' | 'missing';
  text: string;
  /** True for an assumption: the bar can edit it in place. */
  editable: boolean;
}

/** What the formula bar shows for a cell, or null when the key names none. */
export function formulaBarContent(wb: Workbook, key: string, values: Map<string, Value>): FormulaBarContent | null {
  const cell = wb.cell(key);
  const ref = wb.rowRefOf(key);
  const row = ref ? wb.row(ref) : undefined;
  if (!cell || !row) return null;
  const v = values.get(key);
  const shown = formatForRow(isNum(v) ? v : null, row);
  switch (cell.kind) {
    case 'formula':
      return { kind: 'formula', text: cell.formula ? (cell.formula.startsWith('=') ? cell.formula : `=${cell.formula}`) : shown, editable: false };
    case 'sourced':
      return { kind: 'sourced', text: cell.source ? COPY.formulaBarSourced(shown, cell.source.document, cell.source.page) : shown, editable: false };
    case 'assumption':
      return { kind: 'assumption', text: shown, editable: isEditable(wb, key) };
    case 'missing':
    default:
      return { kind: 'missing', text: COPY.notDisclosed, editable: false };
  }
}
