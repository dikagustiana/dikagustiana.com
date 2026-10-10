// @vitest-environment node
/**
 * The working paper's cells as the viewer shows them (PRD site sweep 2026-10, R4.4): every number format
 * the committed JSON uses, read for what it asks and written in the site's convention (`1.234`, `(665)`,
 * an accounting zero as the en dash, `31 Dec 2024`), General, text, errors, and dates in any time zone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACCOUNTING_ZERO, formatCell, formatDate, formatGeneral, readNumFmt, type NumFmt } from '@/lib/workbook/format';
import type { PublishedWorkbook, WorkbookCell } from '@/lib/workbook/types';

const book = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../public/consolidation/pt-dummy-psak-338.workbook.json'), 'utf8'),
) as PublishedWorkbook;
const numFmtOf = (c: WorkbookCell): string | undefined => (c.s === undefined ? undefined : book.styles[c.s].numFmt);
const CELLS = book.sheets.flatMap((s) => s.cells.map((cell) => ({ sheet: s.name, cell, numFmt: numFmtOf(cell) })));

function shown(sheet: string, a: string): string {
  const cell = book.sheets.find((s) => s.name === sheet)!.cells.find((c) => c.a === a)!;
  return formatCell(cell, numFmtOf(cell));
}

const show = (v: number, numFmt?: string) => formatCell({ v }, numFmt);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The file's formats as exceljs reads them, without Excel's backslash escapes.
const ACC_0 = '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)';
const ACC_0_DASH = '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)';
const ACC_1 = '_(* #,##0.0_);_(* (#,##0.0);_(* "-"??_);_(@_)';
const ACC_2 = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)';
const MINUS_0 = '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-';
const MINUS_0_PAD = '_-* #,##0_-;-* #,##0_-;_-* "-"??_-;_-@_-';
const MINUS_1 = '_-* #,##0.0_-;-* #,##0.0_-;_-* "-"?_-;_-@_-';
const MINUS_2 = '_-* #,##0.00_-;-* #,##0.00_-;_-* "-"??_-;_-@_-';
const MINUS_3 = '_-* #,##0.000_-;-* #,##0.000_-;_-* "-"???_-;_-@_-';
const BRACKETS = '#,##0 ;(#,##0)';

const accounting = (decimals: number): NumFmt => ({ kind: 'accounting', decimals, day: false });
const number = (decimals: number): NumFmt => ({ kind: 'number', decimals, day: false });
const percent = (decimals: number): NumFmt => ({ kind: 'percent', decimals, day: false });

/** Every format the file uses; no format at all is General. */
const IN_FILE = new Map<string | undefined, NumFmt>([
  [undefined, { kind: 'general', decimals: 0, day: false }],
  [ACC_0, accounting(0)],
  [ACC_0_DASH, accounting(0)],
  [ACC_1, accounting(1)],
  [ACC_2, accounting(2)],
  [MINUS_0, accounting(0)],
  [MINUS_0_PAD, accounting(0)],
  [MINUS_1, accounting(1)],
  [MINUS_2, accounting(2)],
  [MINUS_3, accounting(3)],
  [BRACKETS, number(0)],
  ['#,##0', number(0)],
  ['#,##0.00', number(2)],
  ['0%', percent(0)],
  ['0.0%', percent(1)],
  ['0.00%', percent(2)],
  ['d-mmm-yy', { kind: 'date', decimals: 0, day: true }],
  ['mmm-yy', { kind: 'date', decimals: 0, day: false }],
]);

describe('the number formats in the file', () => {
  it('reads every format the file uses for what it asks, and no other format is in the file', () => {
    const used = new Set(CELLS.map((c) => c.numFmt));
    expect([...used].map(String).sort()).toEqual([...IN_FILE.keys()].map(String).sort());
    for (const [numFmt, expected] of IN_FILE) expect(readNumFmt(numFmt), String(numFmt)).toEqual(expected);
    // As Excel writes them, escapes and all, and General by name.
    expect(readNumFmt('_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)')).toEqual(accounting(0));
    expect(readNumFmt('#,##0\\ ;\\(#,##0\\)')).toEqual(number(0));
    expect(readNumFmt('General')).toEqual(IN_FILE.get(undefined));
    expect(readNumFmt('[Red]#,##0.0;(#,##0.0)')).toEqual(number(1));
  });

  it('writes an accounting figure with a thousands point and its decimals, a negative in brackets even where Excel writes a minus, and zero as the en dash', () => {
    expect(ACCOUNTING_ZERO).toBe('–');
    const rows: [string, string, string][] = [
      [ACC_0, '1.234.568', '(665)'],
      [ACC_0_DASH, '1.234.568', '(665)'],
      [MINUS_0, '1.234.568', '(665)'],
      [MINUS_0_PAD, '1.234.568', '(665)'],
      [ACC_1, '1.234.567,9', '(665,4)'],
      [MINUS_1, '1.234.567,9', '(665,4)'],
      [ACC_2, '1.234.567,89', '(665,40)'],
      [MINUS_2, '1.234.567,89', '(665,40)'],
      [MINUS_3, '1.234.567,891', '(665,400)'],
    ];
    for (const [numFmt, positive, negative] of rows) {
      expect(show(1234567.891, numFmt), numFmt).toBe(positive);
      expect(show(-665.4, numFmt), numFmt).toBe(negative);
      expect(show(0, numFmt), numFmt).toBe('–');
    }
    // Excel's zero section is for zero itself: a rounding residue shows as 0, never bracketed.
    expect(show(0.08404541015625, ACC_0)).toBe('0');
    expect(show(-0.3, ACC_0)).toBe('0');
    expect(shown('Consol SoFP 24', 'D9')).toBe('–');
    expect(shown('Consol SoFP 24', 'P118')).toBe('(2.160.990.000)');
    expect(shown('Consol SoFP 24', 'H120')).toBe('0');
  });

  it('writes a plain number format with its decimals, and zero as 0', () => {
    expect(show(16, BRACKETS)).toBe('16');
    expect(show(-665, BRACKETS)).toBe('(665)');
    expect(show(0, BRACKETS)).toBe('0');
    expect(show(-0.4632568359375, BRACKETS)).toBe('0');
    expect(show(1234567, '#,##0')).toBe('1.234.567');
    expect(show(1234.5, '#,##0.00')).toBe('1.234,50');
    expect(show(0, '#,##0.00')).toBe('0,00');
  });

  it('writes a percentage with its decimals and a fall in brackets', () => {
    expect(show(0.51, '0.00%')).toBe('51,00%');
    expect(show(0.032765775643728276, '0%')).toBe('3%');
    expect(show(0.033000001027176, '0.0%')).toBe('3,3%');
    expect(show(-0.02, '0%')).toBe('(2%)');
    expect(show(0, '0%')).toBe('0%');
    expect(show(0, '0.0%')).toBe('0,0%');
    expect(show(0, '0.00%')).toBe('0,00%');
  });

  it('writes General as Excel does, with a year or a note number as typed and larger figures in the site convention', () => {
    expect(show(2024)).toBe('2024');
    expect(show(17)).toBe('17');
    expect(show(0)).toBe('0');
    expect(show(-3)).toBe('(3)');
    expect(show(1234.5)).toBe('1234,5');
    expect(show(12345.678)).toBe('12.345,678');
    expect(show(10891649906)).toBe('10.891.649.906');
    expect(show(-2677772539)).toBe('(2.677.772.539)');
    // Ten significant digits at most.
    expect(show(-17228149501.5)).toBe('(17.228.149.502)');
    expect(formatGeneral(0.08404541015625)).toBe('0,08404541');
    expect(formatGeneral(1 / 3)).toBe('0,333333333');
    expect(shown('SOPL', 'K10')).toBe('2024');
  });

  it('writes a date as 31 Dec 2024, or Dec 2024 for a month format, whatever the time zone', () => {
    const date = (v: string, numFmt?: string) => formatCell({ v, t: 'd' }, numFmt);
    expect(date('2024-12-31T00:00:00.000Z', 'd-mmm-yy')).toBe('31 Dec 2024');
    expect(date('2023-06-30T00:00:00.000Z', 'd-mmm-yy')).toBe('30 Jun 2023');
    expect(date('2024-12-31T00:00:00.000Z', 'mmm-yy')).toBe('Dec 2024');
    expect(date('2024-12-31T00:00:00.000Z')).toBe('31 Dec 2024');
    expect(formatDate('2024-01-05')).toBe('5 Jan 2024');
    expect(formatDate('not a date')).toBe('not a date');
    expect(shown('CF 24', 'G8')).toBe('31 Dec 2024');
    const zone = process.env.TZ;
    try {
      for (const tz of ['America/Chicago', 'Pacific/Pago_Pago', 'Pacific/Kiritimati', 'UTC']) {
        process.env.TZ = tz;
        for (const { cell, numFmt } of CELLS.filter((c) => c.cell.t === 'd')) {
          const [y, m, d] = String(cell.v).slice(0, 10).split('-').map(Number);
          expect(formatCell(cell, numFmt), `${tz} ${cell.v}`).toBe(`${d} ${MONTHS[m - 1]} ${y}`);
        }
      }
    } finally {
      process.env.TZ = zone;
    }
  });

  it('shows text as typed, an error as its code, an empty cell as nothing', () => {
    expect(formatCell({ v: '#REF!', t: 'e' }, ACC_0)).toBe('#REF!');
    expect(formatCell({ v: '#VALUE!', t: 'e' }, MINUS_2)).toBe('#VALUE!');
    expect(shown('CF 23 Restated', 'O8')).toBe('#REF!');
    expect(formatCell({ v: 'Oke' }, ACC_0)).toBe('Oke');
    expect(formatCell({ v: '28 Juni 2023' }, 'mmm-yy')).toBe('28 Juni 2023');
    expect(formatCell({ v: '' }, ACC_0)).toBe('');
    expect(formatCell({}, ACC_0)).toBe('');
    expect(formatCell({ v: true })).toBe('TRUE');
    expect(formatCell({ v: false })).toBe('FALSE');
  });

  it('writes every value cell of the file in the site convention: a figure, an en dash, a date, an error code or the text itself', () => {
    const FIGURE = /^(\((\d{1,3}(\.\d{3})*|\d{1,4})(,\d+)?%?\)|(\d{1,3}(\.\d{3})*|\d{1,4})(,\d+)?%?|–)$/;
    let figures = 0;
    for (const { sheet, cell, numFmt } of CELLS) {
      if (cell.v === undefined) continue;
      const text = formatCell(cell, numFmt);
      const where = `${sheet}!${cell.a} ${JSON.stringify(cell.v)} ${numFmt}`;
      if (cell.t === 'e') expect(text, where).toBe(cell.v);
      else if (cell.t === 'd') expect(text, where).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
      else if (typeof cell.v === 'string') expect(text, where).toBe(cell.v);
      else {
        figures++;
        expect(text, where).toMatch(FIGURE);
        if (text.startsWith('(')) expect(cell.v, where).toBeLessThan(0);
        if (text === '–') expect(cell.v, where).toBe(0);
      }
    }
    expect(figures).toBe(23238);
  });
});
