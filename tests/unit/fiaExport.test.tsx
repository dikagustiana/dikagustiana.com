/**
 * Finance in Action v3.1, Commit 8: Download .xlsx (brief §5.7). The workbook
 * keeps live formulas, the cell-kind colours and edit marks, and its Unit
 * economics sheet works every per-unit figure by formula over its own rows.
 * ExcelJS loads lazily, on click.
 */
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeQueryResult } from './helpers/renderWithProviders';
import { renderFiaPage } from './helpers/renderFiaPage';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import FiaModelRoute from '@/pages/finance-in-action/FiaModelRoute';
import { COPY } from '@/lib/finance-in-action/copy';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { runScenario } from '@/lib/finance-in-action/model/scenario';
import { buildWorkbook, exportFileName, hslToArgb, type Palette } from '@/lib/finance-in-action/export/xlsx';

const palette: Palette = {
  sourced: hslToArgb('212 85% 33%'),
  assumptionBg: hslToArgb('142 55% 92%'),
  assumptionFg: hslToArgb('145 70% 20%'),
  missing: hslToArgb('215 10% 36%'),
  edited: hslToArgb('145 70% 24%'),
  fy: hslToArgb('200 20% 92%'),
};

async function roundTrip(ticker: string, edit?: { rowRef: string; period: string; value: number }) {
  const pkg = previewRegistry().company(ticker)!.pkg!;
  const wb = new Workbook(pkg);
  const base = wb.values();
  let values = base;
  const edits: { key: string; before: number | null; after: number }[] = [];
  if (edit) {
    const key = wb.keyOf(edit.rowRef, edit.period)!;
    values = runScenario(wb, base, new Map([[key, edit.value]])).values;
    edits.push({ key, before: base.get(key) as number, after: edit.value });
  }
  const book = await buildWorkbook({ pkg, wb, values, edits }, palette);
  const buffer = await book.xlsx.writeBuffer();
  const back = new ExcelJS.Workbook();
  await back.xlsx.load(buffer as ArrayBuffer);
  return { pkg, back };
}

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult(null));
});

describe('colours', () => {
  it('turn a token triplet into ARGB', () => {
    expect(hslToArgb('0 0% 100%')).toBe('FFFFFFFF');
    expect(hslToArgb('0 100% 50%')).toBe('FFFF0000');
    expect(hslToArgb('212 85% 33%')).toMatch(/^FF[0-9A-F]{6}$/);
    expect(hslToArgb('nonsense')).toBeUndefined();
  });
});

describe('the exported workbook', () => {
  it('names its sheets and its file after the model version', async () => {
    const { back, pkg } = await roundTrip('XCOA');
    expect(back.worksheets.map((w) => w.name)).toEqual(['Read me', 'Reported', 'Model', 'Assumptions', 'Unit economics']);
    expect(exportFileName(pkg)).toBe('XCOA-2025Q4-r1-SYNTHETIC.xlsx');
    expect(back.getWorksheet('Read me')!.getCell('B4').value).toContain('SYNTHETIC');
  });

  it('keeps the package’s formulas live, at the package’s own addresses', async () => {
    const { back, pkg } = await roundTrip('XCOA');
    const model = back.getWorksheet('Model')!;
    const rev = pkg.sheets.find((s) => s.id === 'model')!.rows.findIndex((r) => r.id === 'revenue');
    const fy = pkg.periods.findIndex((p) => p.id === 'FY25');
    const cell = model.getRow(rev + 2).getCell(fy + 3);
    expect(cell.address).toBe('K4');
    expect(cell.formula).toBe(pkg.sheets.find((s) => s.id === 'model')!.rows[rev].cells[fy].formula!.slice(1));
    expect(cell.result).toBe(7270);
    expect(model.getCell('A4').value).toBe('Revenue');
    expect(model.getCell('B4').value).toBe('Rp bn');
  });

  it('colours cells by kind and notes their sources', async () => {
    const { back } = await roundTrip('XCOA');
    const reported = back.getWorksheet('Reported')!;
    expect(reported.getCell('C2').font?.color?.argb).toBe(palette.sourced);
    expect(String(reported.getCell('C2').note)).toContain('note 24');
    const missing = reported.getCell('C4'); // production, Q1 24: not disclosed
    expect(missing.value).toBeNull();
    expect(missing.font?.italic).toBe(true);
    expect(String(missing.note)).toContain('Missing');
    const assumptions = back.getWorksheet('Assumptions')!;
    const forecast = assumptions.getCell('M3');
    expect((forecast.fill as ExcelJS.FillPattern).fgColor?.argb).toBe(palette.assumptionBg);
  });

  it('exports the current state, edited cells outlined and noted', async () => {
    const { back } = await roundTrip('XCOA', { rowRef: 'assumptions!price', period: '26Q2E', value: 650 });
    const price = back.getWorksheet('Assumptions')!.getCell('M3');
    expect(price.value).toBe(650);
    expect(price.border?.top?.style).toBe('medium');
    expect(price.border?.top?.color?.argb).toBe(palette.edited);
    expect(String(price.note)).toContain('Edited in the viewer: the published model holds 720');
    const revenue = back.getWorksheet('Model')!.getCell('M4');
    expect(revenue.result).toBeCloseTo(2.8 * 650);
  });

  it('works per-unit figures by formula over the exported rows', async () => {
    const { back, pkg } = await roundTrip('XCOA');
    const ue = back.getWorksheet('Unit economics')!;
    expect(ue.getCell('A1').value).toBe('Unit economics, Rp thousand per tonne of coal sold');
    const lines = pkg.unitEconomics.lines.length;
    const denomRow = 5 + lines;
    // FY 25 is the fifth unit-economics period: its total and per-unit columns.
    const fyIndex = pkg.unitEconomics.periods.indexOf('FY25');
    const totalCol = 4 + fyIndex * 2;
    const letter = (n: number) => String.fromCharCode(64 + n);
    expect(ue.getRow(5).getCell(totalCol).formula).toBe("'Model'!K4");
    expect(ue.getRow(5).getCell(totalCol + 1).formula).toBe(`${letter(totalCol)}5/${letter(totalCol)}${denomRow}`);
    expect(ue.getRow(denomRow).getCell(totalCol).formula).toBe("'Model'!K2");
    expect(String(ue.getRow(denomRow).getCell(1).value)).toBe('Divided by coal sales volume (Mt)');
    expect(ue.getRow(5 + lines - 1).getCell(1).value).toBe('Operating profit');
  });

  it('says so when there is no volume', async () => {
    const { back } = await roundTrip('XCEM');
    expect(back.getWorksheet('Unit economics')!.getCell('A4').value).toBe('Not available: volumes not disclosed');
  });
});

describe('loading', () => {
  const walk = (p: string): string[] => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : [p]);
  const src = walk(path.resolve(__dirname, '../../src')).filter((f) => /\.(ts|tsx)$/.test(f));

  it('imports ExcelJS only dynamically, and the export module only on click', () => {
    for (const f of src) {
      const text = fs.readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/^import (?!type)[^;]*from 'exceljs'/m);
      if (!f.endsWith(path.join('export', 'xlsx.ts'))) {
        expect(text, f).not.toMatch(/import\('exceljs'\)/);
        expect(text, f).not.toMatch(/^import [^;]*export\/xlsx'/m);
      }
    }
  });

  it('downloads the workbook from the model page’s primary button', async () => {
    const user = userEvent.setup();
    const create = vi.fn(() => 'blob:fia');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: '/finance/finance-in-action/xcoa' });
    await user.click(await screen.findByRole('button', { name: COPY.download }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect((create.mock.calls[0] as unknown[])[0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
