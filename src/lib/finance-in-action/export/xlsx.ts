/**
 * Download .xlsx (brief §5.7): the model as the reader has it now, with live
 * formulas, the cell-kind colours, edited cells marked as edited, and a "Unit
 * economics" sheet whose per-unit figures are formulas over the exported rows.
 *
 * This module is imported only when the button is pressed, and it imports
 * ExcelJS only then too, so neither reaches a reader who never exports.
 * Sheet names are the sheet ids' labels; formulas are written exactly as the
 * package holds them, because the workbook keeps the package's addressing
 * (header on row 1, rows from row 2, label in A, unit in B, periods from C),
 * and Excel compares sheet names without regard to case.
 */
import type { Workbook as ExcelWorkbook, Worksheet, Cell as ExcelCell } from 'exceljs';
import { ADDRESSING, type ModelPackage, type Row } from '../contract/types';
import { CELL_KINDS, PROVENANCES, SHEETS, byId } from '../constants';
import { isNum, type Value } from '../engine/engine';
import { NUMBER_CONVENTION, isRatioRow } from '../format';
import type { Workbook } from '../model/workbook';
import { periodColumn, rowNumber } from '../model/workbook';
import { denominatorState, unitScale } from '../unitEconomics';
import { colLetter } from '../engine/address';
import { CHECKS_FIRST_COLUMN, CHECKS_SHEET, checksHeader, checksRows } from '../view/checksSheet';

export interface ExportInput {
  pkg: ModelPackage;
  wb: Workbook;
  values: Map<string, Value>;
  /** Edited cell keys with the package's value before the edit. */
  edits: { key: string; before: number | null; after: number }[];
}

/** Token name → ARGB, read from the page's own CSS so the workbook uses the site's colours. */
export type Palette = Partial<Record<'sourced' | 'assumptionBg' | 'assumptionFg' | 'missing' | 'edited' | 'fy', string>>;

const HUE_MAX = 360;
const PCT = 100;
const BYTE = 255;
const HEX = 16;

/** "212 85% 33%" → "FF1F4F9B". */
export function hslToArgb(triplet: string): string | undefined {
  const m = /^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(triplet);
  if (!m) return undefined;
  const h = Number(m[1]) % HUE_MAX;
  const s = Number(m[2]) / PCT;
  const l = Number(m[3]) / PCT;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * BYTE).toString(HEX).padStart(2, '0').toUpperCase();
  return `FF${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

export function paletteFromDocument(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): Palette {
  if (!doc) return {};
  const css = getComputedStyle(doc.documentElement);
  const read = (name: string) => hslToArgb(css.getPropertyValue(name));
  return {
    sourced: read('--fia-sourced'),
    assumptionBg: read('--fia-assumption-bg'),
    assumptionFg: read('--fia-assumption-fg'),
    missing: read('--fia-missing'),
    edited: read('--fia-edited'),
    fy: read('--muted'),
  };
}

const WIDTH = { label: 44, unit: 22, period: 12, driver: 40 };

function numFmt(row: Pick<Row, 'unit' | 'style'>): string {
  return isRatioRow(row) ? '0.0%;(0.0%)' : '#,##0.##;(#,##0.##)';
}

function setFill(cell: ExcelCell, argb: string | undefined) {
  if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function writeSheet(ws: Worksheet, input: ExportInput, sheetId: string, palette: Palette) {
  const { pkg, wb, values } = input;
  const sheet = pkg.sheets.find((s) => s.id === sheetId)!;
  const edited = new Map(input.edits.map((e) => [e.key, e]));
  const header = ws.getRow(ADDRESSING.headerRow);
  header.getCell(ADDRESSING.labelColumn).value = pkg.meta.ticker;
  header.getCell(ADDRESSING.unitColumn).value = 'Unit';
  pkg.periods.forEach((p, i) => {
    header.getCell(ADDRESSING.firstPeriodColumn + i).value = p.forecast ? `${p.label} (forecast)` : p.label;
  });
  header.font = { bold: true };
  ws.getColumn(ADDRESSING.labelColumn).width = WIDTH.label;
  ws.getColumn(ADDRESSING.unitColumn).width = WIDTH.unit;
  pkg.periods.forEach((_, i) => (ws.getColumn(ADDRESSING.firstPeriodColumn + i).width = WIDTH.period));
  ws.views = [{ state: 'frozen', xSplit: ADDRESSING.unitColumn, ySplit: ADDRESSING.headerRow }];

  sheet.rows.forEach((row, ri) => {
    const r = ws.getRow(rowNumber(ri));
    r.getCell(ADDRESSING.labelColumn).value = row.label;
    r.getCell(ADDRESSING.unitColumn).value = row.unit;
    if (row.style === 'total') r.font = { bold: true };
    row.cells.forEach((cell, pi) => {
      const key = wb.keyOf(`${sheet.id}!${row.id}`, pkg.periods[pi].id)!;
      const target: ExcelCell = r.getCell(ADDRESSING.firstPeriodColumn + pi);
      const v = values.get(key);
      const num = isNum(v) ? v : null;
      if (cell.kind === 'formula' && cell.formula) {
        target.value = { formula: cell.formula.replace(/^=/, ''), result: num ?? undefined } as ExcelCell['value'];
      } else {
        target.value = num;
      }
      target.numFmt = numFmt(row);
      const notes: string[] = [];
      if (cell.kind === 'sourced') {
        target.font = { color: palette.sourced ? { argb: palette.sourced } : undefined, bold: row.style === 'total' };
        if (cell.source) notes.push(`Source: ${[cell.source.issuer, cell.source.document, cell.source.note ? `note ${cell.source.note}` : '', cell.source.page ? `page ${cell.source.page}` : ''].filter(Boolean).join(', ')}`);
      } else if (cell.kind === 'assumption') {
        setFill(target, palette.assumptionBg);
        target.font = { color: palette.assumptionFg ? { argb: palette.assumptionFg } : undefined };
      } else if (cell.kind === 'missing') {
        target.font = { italic: true, color: palette.missing ? { argb: palette.missing } : undefined };
        notes.push(`Missing: ${cell.note ?? 'not disclosed'}`);
      } else if (pkg.periods[pi].kind === 'fy') {
        setFill(target, palette.fy);
      }
      const e = edited.get(key);
      if (e) {
        const style = { style: 'medium', color: palette.edited ? { argb: palette.edited } : undefined } as const;
        target.border = { top: style, left: style, bottom: style, right: style };
        notes.push(`Edited in the viewer: the published model holds ${e.before ?? 'nothing'}.`);
      }
      if (notes.length) target.note = notes.join('\n');
    });
  });
}

function writeReadMe(ws: Worksheet, input: ExportInput, palette: Palette) {
  const { pkg } = input;
  const lines: (string | [string, string])[] = [
    [`${pkg.meta.name} (${pkg.meta.ticker})`, ''],
    ['Model version', pkg.meta.version],
    ['Content hash', pkg.meta.contentHash],
    ['Provenance', byId(PROVENANCES, pkg.meta.provenance)?.note || 'Figures from filings.'],
    ['Numbers', `${NUMBER_CONVENTION} Excel shows them in your own locale's separators.`],
    ['Exported', 'From the Finance in Action viewer, in the state on screen. The published model is unchanged.'],
    ['Edits', input.edits.length ? `${input.edits.length} assumption cell(s) edited in the viewer, outlined in dark green, each with a note.` : 'None.'],
    '',
    'Cell kinds',
    ...CELL_KINDS.map((k) => [k.label, k.means] as [string, string]),
  ];
  ws.getColumn(1).width = WIDTH.unit;
  ws.getColumn(2).width = WIDTH.label * 2;
  lines.forEach((l, i) => {
    const row = ws.getRow(i + 1);
    if (typeof l === 'string') {
      row.getCell(1).value = l;
      row.font = { bold: true };
    } else {
      row.getCell(1).value = l[0];
      row.getCell(2).value = l[1];
    }
    if (i === 0) row.font = { bold: true, size: 14 };
  });
  const legendStart = lines.length - CELL_KINDS.length + 1;
  CELL_KINDS.forEach((k, i) => {
    const c = ws.getRow(legendStart + i).getCell(1);
    if (k.id === 'sourced') c.font = { color: palette.sourced ? { argb: palette.sourced } : undefined };
    if (k.id === 'assumption') {
      setFill(c, palette.assumptionBg);
      c.font = { color: palette.assumptionFg ? { argb: palette.assumptionFg } : undefined };
    }
    if (k.id === 'missing') c.font = { italic: true, color: palette.missing ? { argb: palette.missing } : undefined };
  });
}

/**
 * The Unit economics sheet: for each unit-economics period with a volume, the
 * line's total read from the Model sheet by formula, and its per-unit figure
 * as a formula over that total and the exported volume.
 */
function writeUnitEconomics(ws: Worksheet, input: ExportInput, sheetName: (id: string) => string) {
  const { pkg, wb, values } = input;
  const ue = pkg.unitEconomics;
  const denomRow = wb.row(ue.denominatorRowRef);
  const revenueRow = wb.row(ue.lines[0]?.rowRef ?? '');
  const scale = unitScale(revenueRow?.unit ?? '', denomRow?.unit ?? '');
  const periods = ue.periods.filter((p) => denominatorState(wb, values, p).ok);
  ws.getRow(1).getCell(1).value = `Unit economics, ${scale.known ? `${scale.label} ${ue.basisLabel}` : scale.label}`;
  ws.getRow(1).font = { bold: true, size: 13 };
  ws.getRow(2).getCell(1).value = 'Per-unit figures are formulas over the rows of this workbook: each line divided by the volume below. Costs are positive here.';
  if (!periods.length) {
    ws.getRow(4).getCell(1).value = 'Not available: volumes not disclosed';
    return;
  }
  const HEAD = 4;
  const FIRST = HEAD + 1;
  const LINE_COL = 1;
  const ROLE_COL = 2;
  const DRIVER_COL = 3;
  const FIRST_VALUE_COL = 4;
  const PER_PERIOD = 2;
  const head = ws.getRow(HEAD);
  head.getCell(LINE_COL).value = 'Line';
  head.getCell(ROLE_COL).value = 'Role';
  head.getCell(DRIVER_COL).value = 'Physical driver';
  head.font = { bold: true };
  ws.getColumn(LINE_COL).width = WIDTH.label;
  ws.getColumn(ROLE_COL).width = WIDTH.period;
  ws.getColumn(DRIVER_COL).width = WIDTH.driver;
  const denomAt = FIRST + ue.lines.length;
  const quote = (name: string) => `'${name}'`;

  periods.forEach((pid, k) => {
    const label = pkg.periods.find((p) => p.id === pid)?.label ?? pid;
    const totalCol = FIRST_VALUE_COL + k * PER_PERIOD;
    const perCol = totalCol + 1;
    head.getCell(totalCol).value = `${label}, ${revenueRow?.unit ?? ''}`;
    head.getCell(perCol).value = `${label}, ${scale.label} per ${ue.unit}`;
    ws.getColumn(totalCol).width = WIDTH.period;
    ws.getColumn(perCol).width = WIDTH.period;
    const pi = wb.periodIndex(pid);
    const refTo = (rowRef: string) => {
      const ri = wb.rowIndexOf(rowRef);
      const sheet = rowRef.split('!')[0];
      return `${quote(sheetName(sheet))}!${periodColumn(pi)}${rowNumber(ri ?? 0)}`;
    };
    ue.lines.forEach((line, i) => {
      const r = ws.getRow(FIRST + i);
      const key = wb.keyOf(line.rowRef, pid)!;
      const total = values.get(key);
      r.getCell(totalCol).value = { formula: refTo(line.rowRef), result: isNum(total) ? total : undefined } as ExcelCell['value'];
      r.getCell(totalCol).numFmt = '#,##0;(#,##0)';
      const multiplier = scale.multiplier === 1 ? '' : `*${scale.multiplier}`;
      r.getCell(perCol).value = {
        formula: `${colLetter(totalCol)}${FIRST + i}/${colLetter(totalCol)}${denomAt}${multiplier}`,
      } as ExcelCell['value'];
      r.getCell(perCol).numFmt = '#,##0.0;(#,##0.0)';
    });
    const d = ws.getRow(denomAt).getCell(totalCol);
    const vol = values.get(wb.keyOf(ue.denominatorRowRef, pid)!);
    d.value = { formula: refTo(ue.denominatorRowRef), result: isNum(vol) ? vol : undefined } as ExcelCell['value'];
  });
  ue.lines.forEach((line, i) => {
    const r = ws.getRow(FIRST + i);
    r.getCell(LINE_COL).value = line.label;
    r.getCell(ROLE_COL).value = line.role;
    r.getCell(DRIVER_COL).value = line.role === 'unsplit' ? `Contains: ${line.contains?.join(', ')}` : line.driver?.description ?? '';
    if (line.role === 'subtotal') r.font = { bold: true };
  });
  ws.getRow(denomAt).getCell(LINE_COL).value = `Divided by ${denomRow?.label.toLowerCase() ?? 'volume'} (${denomRow?.unit ?? ''})`;
  ws.getRow(denomAt).font = { italic: true };
}

/**
 * The Checks sheet (sheet-first PRD D-S4), written from the table the grid
 * draws, at the same addresses: the model's figure is a live formula over the
 * checked cell, the rest the package's own figures and words.
 */
function writeChecks(ws: Worksheet, input: ExportInput) {
  const { pkg, wb, values } = input;
  const header = ws.getRow(ADDRESSING.headerRow);
  checksHeader().forEach((h, i) => (header.getCell(ADDRESSING.labelColumn + i).value = h));
  header.font = { bold: true };
  ws.getColumn(ADDRESSING.labelColumn).width = WIDTH.label;
  ws.getColumn(ADDRESSING.unitColumn).width = WIDTH.unit;
  ws.views = [{ state: 'frozen', xSplit: ADDRESSING.unitColumn, ySplit: ADDRESSING.headerRow }];
  checksRows(pkg, wb, values).forEach((check, ri) => {
    const r = ws.getRow(rowNumber(ri));
    r.getCell(ADDRESSING.labelColumn).value = check.label;
    r.getCell(ADDRESSING.unitColumn).value = check.unit;
    check.cells.forEach((c, ci) => {
      const target = r.getCell(CHECKS_FIRST_COLUMN + ci);
      ws.getColumn(CHECKS_FIRST_COLUMN + ci).width = ci === check.cells.length - 1 ? WIDTH.driver : WIDTH.period;
      if (c.formula) target.value = { formula: c.formula.replace(/^=/, ''), result: c.value ?? undefined } as ExcelCell['value'];
      else target.value = c.value !== undefined ? c.value : c.text;
      if (c.value !== undefined) target.numFmt = numFmt({ unit: check.unit });
    });
  });
}

/** Builds the workbook. ExcelJS arrives here, on demand. */
export async function buildWorkbook(input: ExportInput, palette: Palette = paletteFromDocument()): Promise<ExcelWorkbook> {
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = 'dikagustiana.com Finance in Action viewer';
  book.calcProperties = { fullCalcOnLoad: true };
  const sheetName = (id: string) => byId(SHEETS, id)?.label ?? id;
  writeReadMe(book.addWorksheet('Read me'), input, palette);
  for (const s of SHEETS) {
    if (!input.pkg.sheets.some((x) => x.id === s.id)) continue;
    writeSheet(book.addWorksheet(s.label), input, s.id, palette);
  }
  writeUnitEconomics(book.addWorksheet('Unit economics'), input, sheetName);
  writeChecks(book.addWorksheet(CHECKS_SHEET.label), input);
  return book;
}

export const exportFileName = (pkg: ModelPackage): string => `${pkg.meta.version}.xlsx`;

/** Builds the workbook and hands it to the browser as a download. Nothing is uploaded. */
export async function downloadWorkbook(input: ExportInput): Promise<void> {
  const book = await buildWorkbook(input);
  const buffer = await book.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(input.pkg);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
