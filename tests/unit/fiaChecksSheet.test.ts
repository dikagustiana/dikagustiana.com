/**
 * Sheet-first model page, S7 (PRD D-S4): the Checks sheet is worked from the
 * package, one row per tie-out and per cell of a gap row, read-only, and
 * never stored in the package.
 */
import { describe, expect, it } from 'vitest';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { COPY } from '@/lib/finance-in-action/copy';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { CHECK_COLUMNS, checksAddress, checksHeader, checksRows, goTo } from '@/lib/finance-in-action/view/checksSheet';

const reg = previewRegistry();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const rowsOf = (p: ModelPackage) => {
  const wb = new Workbook(p);
  return { wb, rows: checksRows(p, wb, wb.values()) };
};

describe('checksRows', () => {
  it('makes one row per tie-out, with the cell, the model’s figure, the figure as filed, the difference and the status', () => {
    const { rows } = rowsOf(reg.company('XCOA')!.pkg!);
    expect(rows).toHaveLength(2);
    const [revenue, cost] = rows;
    expect(revenue.label).toBe('Revenue, FY 25');
    expect(revenue.unit).toBe('Rp bn');
    expect(revenue.cells.map((c) => c.text)).toEqual([
      'REPORTED!K2',
      '7,270',
      '7,270',
      '0',
      'Agrees',
      'SYNTHETIC IDX XBRL instance FY 25, syn:Revenue',
    ]);
    expect(revenue.cells[1].formula).toBe("='Reported'!K2");
    expect(cost.status).toBe('differs');
    expect(cost.cells[3]).toMatchObject({ text: '2', value: 2 });
    expect(cost.cells[4].text).toBe('Differs');
    expect(revenue.cells).toHaveLength(CHECK_COLUMNS.length);
  });

  it('adds every cell of a gap row, agreeing within the package’s rounding and differing outside it', () => {
    const p = clone(reg.company('XCOA')!.pkg!);
    const model = p.sheets.find((s) => s.id === 'model')!;
    const cells = p.periods.map((_, i) => ({ value: i === 0 ? 0.4 : i === 1 ? 3 : i === 2 ? null : 0, kind: 'sourced' as const }));
    model.rows.push({ id: 'gap_revenue', label: 'Revenue gap', unit: 'Rp bn', cells });
    const { rows } = rowsOf(p);
    const gap = rows.filter((r) => r.label.startsWith('Revenue gap'));
    expect(gap).toHaveLength(p.periods.length);
    expect(gap.map((g) => g.status).slice(0, 4)).toEqual(['agrees', 'differs', 'not_checked', 'agrees']);
    expect(gap[1].cells[5].text).toBe(COPY.checksGap);
    expect(gap[1].cells[2].text).toBe('—');
  });

  it('heads the sheet with the check, the unit and the columns', () => {
    expect(checksHeader()).toEqual(['Check', 'Unit', 'Cell', 'In the model', 'As filed', 'Difference', 'Status', 'Filed in']);
  });
});

describe('goTo on the Checks sheet', () => {
  it('reaches a check by its address, and refuses its label, unit, header and what lies past it', () => {
    const { wb, rows } = rowsOf(reg.company('XCOA')!.pkg!);
    expect(checksAddress(0, 0)).toBe('CHECKS!C2');
    expect(goTo(wb, 'checks!D3', 'model', rows.length)).toEqual({ ok: true, sheet: 'checks', r: 1, c: 1 });
    expect(goTo(wb, 'C2', 'checks', rows.length)).toEqual({ ok: true, sheet: 'checks', r: 0, c: 0 });
    expect(goTo(wb, 'A2', 'checks', rows.length)).toEqual({ ok: false, reason: 'label' });
    expect(goTo(wb, 'checks!B2', 'model', rows.length)).toEqual({ ok: false, reason: 'unit' });
    expect(goTo(wb, 'C1', 'checks', rows.length)).toEqual({ ok: false, reason: 'header' });
    expect(goTo(wb, 'C9', 'checks', rows.length)).toEqual({ ok: false, reason: 'outside' });
    expect(goTo(wb, 'I2', 'checks', rows.length)).toEqual({ ok: false, reason: 'outside' });
    // Any other sheet goes through the package's addresses; from Checks, a bare address is the Checks sheet's.
    expect(goTo(wb, 'model!C5', 'checks', rows.length)).toEqual({ ok: true, sheet: 'model', key: 'model!C5' });
  });
});
