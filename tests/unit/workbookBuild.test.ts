// @vitest-environment node
/**
 * The working paper's data (PRD site sweep 2026-10, R4.1, R4.2, R4.8): the committed JSON and build
 * report are what the builder makes of the committed xlsx, byte for byte; the JSON's cached values are
 * the ones Excel stored; and the sanitising is D9's, no more. The xlsx is parsed once for the file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  D9_EXCLUDED,
  OUTPUT_PATH,
  REPORT_PATH,
  SOURCE_PATH,
  buildWorkbook,
  loadSource,
  resolveColor,
  themeColors,
  type Built,
  type Loaded,
} from '../../scripts/consolidation/workbook';
import type { PublishedWorkbook } from '@/lib/workbook/types';
import { seeded } from './helpers/seeded';

const ROOT = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH));
const committedJson = fs.readFileSync(path.join(ROOT, OUTPUT_PATH), 'utf8');
const committed = JSON.parse(committedJson) as PublishedWorkbook;

let loaded: Loaded;
let built: Built;
beforeAll(async () => {
  loaded = await loadSource(source);
  built = buildWorkbook(loaded, { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length });
}, 60_000);

describe('the working paper build', () => {
  it('rebuilds the committed JSON and build report byte for byte', () => {
    expect(built.json === committedJson, `${OUTPUT_PATH} is stale: run npm run build:workbook`).toBe(true);
    expect(built.report).toBe(fs.readFileSync(path.join(ROOT, REPORT_PATH), 'utf8'));
    expect(JSON.parse(built.json)).toEqual(built.book);
    // R4.2's work notes, the PRD's own example among them.
    expect(built.report).toContain('| `Consol SoFP 24!L7` | oke |');
  });

  it("records the committed xlsx's sha256 and size in the JSON header", () => {
    expect(committed.source).toEqual({
      path: SOURCE_PATH,
      sha256: createHash('sha256').update(source).digest('hex'),
      bytes: source.length,
    });
  });

  it("holds Excel's cached value and the formula of 300 formula cells picked by a fixed seed, as exceljs re-reads them", () => {
    const formulas = committed.sheets.flatMap((sheet) => sheet.cells.filter((c) => c.f !== undefined).map((cell) => ({ sheet: sheet.name, cell })));
    const random = seeded(20261010);
    const picked = new Set<number>();
    while (picked.size < 300) picked.add(Math.floor(random() * formulas.length));
    for (const i of picked) {
      const { sheet, cell } = formulas[i];
      const xl = loaded.workbook.getWorksheet(sheet)!.getCell(cell.a);
      const where = `${sheet}!${cell.a}`;
      expect(xl.type, where).toBe(ExcelJS.ValueType.Formula);
      expect(cell.f, where).toBe(xl.formula);
      // cell.result, not cell.value.result: exceljs drops a cached 0 from the latter.
      const result = xl.result as unknown;
      if (result instanceof Date) expect({ v: cell.v, t: cell.t }, where).toEqual({ v: result.toISOString(), t: 'd' });
      else if (result !== null && typeof result === 'object' && 'error' in result) expect({ v: cell.v, t: cell.t }, where).toEqual({ v: result.error, t: 'e' });
      else expect({ v: cell.v, t: cell.t }, where).toEqual({ v: result, t: undefined });
    }
  });

  it('counts 33 sheets and 15,485 formulas before sanitising, as the PRD profiles the workbook', () => {
    expect(loaded.workbook.worksheets).toHaveLength(33);
    expect(committed.sourceSheets).toBe(33);
    let formulas = 0;
    for (const ws of loaded.workbook.worksheets) {
      ws.eachRow((row) => row.eachCell((c) => void (c.type === ExcelJS.ValueType.Formula && formulas++)));
    }
    expect(formulas).toBe(15485);
    // The hidden sheet's 9 formulas are the difference.
    const published = committed.sheets.reduce((n, s) => n + s.cells.filter((c) => c.f !== undefined).length, 0);
    expect(published).toBe(committed.counts.formulas);
    expect(published).toBe(15476);
  });

  it("reads where a sheet's view starts, and names the one sheet frozen while scrolled as a known difference", () => {
    // exceljs reads the frozen pane's scroll position, not the sheet view's own start.
    expect([...loaded.viewStarts]).toEqual([
      ['CF 23 as Restated', 'A5'],
      ['Supplementary CF 24', 'B33'],
      ['Supplementary CF 23', 'B24'],
      ['Elimination 2024', 'F35'],
      ['WP Investment', 'D18'],
    ]);
    // Of those, only CF 23 as Restated is frozen: Excel's split is kept, and the report says where it starts.
    const frozen = committed.sheets.filter((s) => s.freeze).map((s) => [s.name, s.freeze]);
    expect(frozen).toEqual([
      ['SOCE', { rows: 7, cols: 3 }],
      ['CF 24', { rows: 9, cols: 5 }],
      ['CF 23 as Restated', { rows: 8, cols: 5 }],
      ['Consol SoFP 24', { rows: 11, cols: 3 }],
      ['Proforma Adjustment', { rows: 8, cols: 2 }],
    ]);
    expect(built.report).toContain('A known difference, CF 23 as Restated: Excel freezes 8 rows and 5 columns with the view starting at A5');
    expect(built.report.match(/A known difference/g)).toHaveLength(1);
  });

  it('leaves out exactly the hidden sheet and the two empty ones D9 names', () => {
    const names = committed.sheets.map((s) => s.name);
    for (const name of D9_EXCLUDED) expect(names).not.toContain(name);
    expect(committed.excluded).toEqual([
      { name: 'Face Report', order: 1, reason: 'empty' },
      { name: 'WP Consol', order: 7, reason: 'empty' },
      { name: 'Adjustment Consolaa', order: 21, reason: 'hidden' },
    ]);
    expect(committed.sheets).toHaveLength(30);
    for (const s of committed.sheets) {
      expect(s.hidden, s.name).toBe(false);
      expect(s.cells.some((c) => c.v !== undefined), s.name).toBe(true);
    }
  });

  it("keeps D8's 49 error cells as errors, sheet by sheet", () => {
    const bySheet: Record<string, number> = {};
    for (const s of committed.sheets) {
      const errors = s.cells.filter((c) => c.t === 'e');
      if (errors.length) bySheet[s.name] = errors.length;
      for (const c of errors) expect(c.v, `${s.name}!${c.a}`).toMatch(/^#(REF!|VALUE!)$/);
    }
    expect(bySheet).toEqual({ 'CF 23 Restated': 35, 'BS RP Disclosure 2024': 8, 'Detail Elimination BS': 6 });
    expect(committed.counts.errors).toBe(49);
  });

  it("resolves D10's red and blue however the file writes a colour: argb, the indexed palette or a tinted theme colour", () => {
    const theme = themeColors(
      '<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
        '<a:dk2><a:srgbClr val="0E2841"/></a:dk2><a:lt2><a:srgbClr val="E8E8E8"/></a:lt2><a:accent1><a:srgbClr val="156082"/></a:accent1></a:clrScheme>',
    );
    expect(resolveColor({ argb: 'FFFF0000' }, theme)).toBe('FF0000');
    expect(resolveColor({ indexed: 10 }, theme)).toBe('FF0000');
    expect(resolveColor({ indexed: 12 }, theme)).toBe('0000FF');
    // Excel counts the theme light-first: 0 is lt1, 1 is dk1, 4 is accent1.
    expect(resolveColor({ theme: 0 }, theme)).toBe('FFFFFF');
    expect(resolveColor({ theme: 1 }, theme)).toBe('000000');
    expect(resolveColor({ theme: 4 }, theme)).toBe('156082');
    expect(resolveColor({ theme: 1, tint: 0.5 }, theme)).toBe('808080');
    expect(resolveColor({ theme: 0, tint: -0.5 }, theme)).toBe('808080');
    expect(resolveColor(undefined, theme)).toBeNull();
    expect(committed.counts).toMatchObject({ red: 1532, blue: 32 });
    const styled = (color: 'red' | 'blue') => committed.sheets.reduce((n, s) => n + s.cells.filter((c) => c.s !== undefined && committed.styles[c.s].color === color).length, 0);
    expect(styled('red')).toBe(1532);
    expect(styled('blue')).toBe(32);
  });
});
