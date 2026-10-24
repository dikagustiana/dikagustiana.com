/**
 * Sheet-first model page, S2 (PRD K2, K3, K4): the grid's addresses are the
 * workbook's. Column letters, row numbers and the name box come from
 * view/sheetAddress.ts, worked through ADDRESSING; the same cells are read
 * back out of the exported .xlsx, ten a sheet, on every sheet of every
 * fixture. The formula bar shows a formula exactly as the package holds it.
 */
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { ADDRESSING, type ModelPackage } from '@/lib/finance-in-action/contract/types';
import { SHEETS } from '@/lib/finance-in-action/constants';
import { COPY } from '@/lib/finance-in-action/copy';
import { colLetter, parseKey } from '@/lib/finance-in-action/engine/address';
import { isNum } from '@/lib/finance-in-action/engine/engine';
import { buildWorkbook } from '@/lib/finance-in-action/export/xlsx';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import {
  addressMissText,
  addressOf,
  columnLetters,
  formulaBarContent,
  keyFromAddress,
  parseTyped,
} from '@/lib/finance-in-action/view/sheetAddress';

const reg = previewRegistry();
const packages = reg.packages;
const open = (p: ModelPackage) => {
  const wb = new Workbook(p);
  return { wb, values: wb.values() };
};

/** Ten cells spread over a list, deterministic so a failure reproduces. */
function sample<T>(list: T[], n = 10): T[] {
  if (list.length <= n) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step + step / 2)]);
}

describe('addressOf', () => {
  it('gives every cell its column letter and row number by ADDRESSING, and the key the engine uses', () => {
    for (const p of packages) {
      const { wb } = open(p);
      for (const sheet of p.sheets) {
        sheet.rows.forEach((row, ri) => {
          p.periods.forEach((period, pi) => {
            const key = wb.keyOf(`${sheet.id}!${row.id}`, period.id)!;
            const a = addressOf(wb, key)!;
            expect(a.col).toBe(colLetter(ADDRESSING.firstPeriodColumn + pi));
            expect(a.row).toBe(ADDRESSING.firstDataRow + ri);
            expect(a.sheet).toBe(sheet.id);
            expect(a.text).toBe(`${sheet.id.toUpperCase()}!${a.col}${a.row}`);
            expect(parseKey(key)).toEqual({ sheet: sheet.id, col: a.col, row: a.row });
          });
        });
      }
    }
  });

  it('knows no address for a key outside the package', () => {
    const { wb } = open(packages[0]);
    expect(addressOf(wb, 'model!ZZ999')).toBeUndefined();
    expect(addressOf(wb, 'nonsense')).toBeUndefined();
  });
});

describe('columnLetters', () => {
  it('runs A, B, then one letter per period', () => {
    expect(columnLetters(11)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);
    expect(columnLetters(25).slice(-2)).toEqual(['Z', 'AA']);
    expect(columnLetters(0)).toEqual(['A', 'B']);
  });
});

describe('keyFromAddress (K4)', () => {
  const p = reg.company('XCOA')!.pkg!;
  const { wb } = open(p);

  it('reads model!C5 and its other spellings to the same key', () => {
    for (const typed of ['model!C5', 'MODEL!C5', 'Model!c5', "'Model'!$C$5", ' model!C5 ']) {
      expect(keyFromAddress(wb, typed, 'reported'), typed).toEqual({ ok: true, key: 'model!C5', sheet: 'model' });
    }
  });

  it('reads an address without a sheet on the sheet in view', () => {
    expect(keyFromAddress(wb, 'E14', 'model')).toEqual({ ok: true, key: 'model!E14', sheet: 'model' });
    expect(keyFromAddress(wb, 'C2', 'reported')).toEqual({ ok: true, key: 'reported!C2', sheet: 'reported' });
  });

  it('turns every address the name box shows back into its own key', () => {
    for (const key of wb.allKeys()) {
      const a = addressOf(wb, key)!;
      expect(keyFromAddress(wb, a.text, 'model')).toEqual({ ok: true, key, sheet: a.sheet });
    }
  });

  it('refuses a label, a unit, the header, a cell past the sheet, an unknown sheet and words, each with its reason', () => {
    expect(keyFromAddress(wb, 'A5', 'model')).toEqual({ ok: false, reason: 'label' });
    expect(keyFromAddress(wb, 'model!B5', 'reported')).toEqual({ ok: false, reason: 'unit' });
    expect(keyFromAddress(wb, 'C1', 'model')).toEqual({ ok: false, reason: 'header' });
    expect(keyFromAddress(wb, 'C99', 'model')).toEqual({ ok: false, reason: 'outside' });
    expect(keyFromAddress(wb, 'Z5', 'model')).toEqual({ ok: false, reason: 'outside' });
    expect(keyFromAddress(wb, 'ledger!C5', 'model')).toEqual({ ok: false, reason: 'sheet' });
    expect(keyFromAddress(wb, 'revenue', 'model')).toEqual({ ok: false, reason: 'syntax' });
    expect(keyFromAddress(wb, 'C0', 'model')).toEqual({ ok: false, reason: 'syntax' });
  });

  it('says why in words', () => {
    expect(addressMissText('A5', 'label')).toBe(COPY.nameBoxNotValue('A5', 'label'));
    expect(addressMissText(' Q9 ', 'outside')).toBe('No cell at Q9. Use a value cell such as C5.');
  });

  it('parses the forms Excel writes', () => {
    expect(parseTyped("'Model'!$AA$12")).toEqual({ sheet: 'Model', col: 27, row: 12 });
    expect(parseTyped('b7')).toEqual({ sheet: undefined, col: 2, row: 7 });
    expect(parseTyped('!C5')).toBeNull();
  });
});

describe('the formula bar (K3)', () => {
  it('shows "=" and the formula exactly as the package holds it, for every formula cell', () => {
    let n = 0;
    for (const p of packages) {
      const { wb, values } = open(p);
      for (const key of wb.allKeys()) {
        const cell = wb.cell(key)!;
        if (cell.kind !== 'formula') continue;
        const bar = formulaBarContent(wb, key, values)!;
        expect(bar.kind).toBe('formula');
        expect(bar.text).toBe(`=${cell.formula!.replace(/^=/, '')}`);
        expect(bar.editable).toBe(false);
        n++;
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it('shows a sourced figure with its document and page, an assumption as editable, a missing cell as not disclosed', () => {
    const p = reg.company('XCOA')!.pkg!;
    const { wb, values } = open(p);
    expect(formulaBarContent(wb, 'reported!C2', values)).toEqual({
      kind: 'sourced',
      text: '1.600, from SYNTHETIC interim financial statements Q1 24, p. 12',
      editable: false,
    });
    const assumption = formulaBarContent(wb, wb.keyOf('assumptions!price', '26Q2E')!, values)!;
    expect(assumption).toEqual({ kind: 'assumption', text: '720', editable: true });
    expect(formulaBarContent(wb, 'reported!C4', values)).toEqual({ kind: 'missing', text: COPY.notDisclosed, editable: false });
    expect(formulaBarContent(wb, 'model!ZZ1', values)).toBeNull();
  });
});

describe('the exported workbook has the same addresses (K2)', () => {
  it('holds each sampled cell at the address the grid shows, ten a sheet, on every sheet', async () => {
    for (const p of packages) {
      const { wb, values } = open(p);
      const book = await buildWorkbook({ pkg: p, wb, values, edits: [] }, {});
      const back = new ExcelJS.Workbook();
      await back.xlsx.load((await book.xlsx.writeBuffer()) as ArrayBuffer);
      for (const sheet of p.sheets) {
        const ws = back.getWorksheet(SHEETS.find((s) => s.id === sheet.id)!.label)!;
        const keys = wb.allKeys().filter((k) => wb.address(k)!.sheet === sheet.id);
        for (const key of sample(keys)) {
          const a = addressOf(wb, key)!;
          const cell = ws.getCell(`${a.col}${a.row}`);
          const own = wb.cell(key)!;
          if (own.kind === 'formula') expect(`=${cell.formula}`, `${p.meta.ticker} ${a.text}`).toBe(own.formula);
          else expect(cell.value, `${p.meta.ticker} ${a.text}`).toBe(isNum(values.get(key)) ? values.get(key) : null);
          // Column A of the same row is the row's label, row 1 of the same column the period.
          expect(ws.getCell(`A${a.row}`).value).toBe(sheet.rows[a.row - ADDRESSING.firstDataRow].label);
          expect(String(ws.getCell(`${a.col}${ADDRESSING.headerRow}`).value)).toContain(p.periods[wb.address(key)!.periodIndex].label);
        }
      }
    }
  });
});
