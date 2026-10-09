import { describe, expect, it } from 'vitest';
import { WORKING_PAPER_ROWS, type WorkingPaperRow } from '@/data/consolidationWorkingPaper';

// The page is a teaching example for readers who will check the arithmetic, so
// the arithmetic is a test, not a review comment. A null cell is a blank, not a
// number, and counts as zero.

const n = (v: number | null | undefined) => v ?? 0;
const dataRows = WORKING_PAPER_ROWS.filter((r) => r.values);
const byLabel = (label: string): WorkingPaperRow => {
  const row = WORKING_PAPER_ROWS.find((r) => r.label === label);
  if (!row) throw new Error(`no row labelled ${label}`);
  return row;
};

// The seven numeric columns of a row, as one array: four entities, combined,
// elimination, consolidated.
const columns = (r: WorkingPaperRow) => [
  ...(r.values ?? []).map(n),
  n(r.combined),
  n(r.elimination),
  n(r.consolidated),
];
const addColumns = (rows: WorkingPaperRow[]) =>
  rows.map(columns).reduce((acc, c) => acc.map((v, i) => v + c[i]), new Array(7).fill(0));

// Line items between a section header and the subtotal that closes it.
const section = (header: string, subtotal: string) => {
  const from = WORKING_PAPER_ROWS.findIndex((r) => r.label === header);
  const to = WORKING_PAPER_ROWS.findIndex((r) => r.label === subtotal);
  expect(from, `header ${header}`).toBeGreaterThanOrEqual(0);
  expect(to, `subtotal ${subtotal}`).toBeGreaterThan(from);
  return WORKING_PAPER_ROWS.slice(from + 1, to).filter((r) => r.values);
};

describe('consolidation working paper', () => {
  it('cross-foots every line: entities add to combined, combined plus eliminations is consolidated', () => {
    for (const r of dataRows) {
      const entities = (r.values ?? []).map(n).reduce((a, b) => a + b, 0);
      expect(entities, `${r.label}: entities → combined`).toBe(n(r.combined));
      expect(n(r.combined) + n(r.elimination), `${r.label}: combined + elimination`).toBe(n(r.consolidated));
    }
  });

  it('foots every subtotal in all seven columns', () => {
    const groups: [string, string, string][] = [
      ['CURRENT ASSET', 'TOTAL CURRENT ASSETS', 'TOTAL CURRENT ASSETS'],
      ['NON-CURRENT ASSET', 'TOTAL NON-CURRENT ASSETS', 'TOTAL NON-CURRENT ASSETS'],
      ['CURRENT LIABILITIES', 'TOTAL CURRENT LIABILITIES', 'TOTAL CURRENT LIABILITIES'],
      ['NON-CURRENT LIABILITIES', 'TOTAL NON-CURRENT LIABILITIES', 'TOTAL NON-CURRENT LIABILITIES'],
      ['EQUITY', 'TOTAL EQUITY', 'TOTAL EQUITY'],
    ];
    for (const [header, subtotal] of groups) {
      expect(addColumns(section(header, subtotal)), subtotal).toEqual(columns(byLabel(subtotal)));
    }
    const sumOf = (a: string, b: string) => addColumns([byLabel(a), byLabel(b)]);
    expect(sumOf('TOTAL CURRENT ASSETS', 'TOTAL NON-CURRENT ASSETS'), 'TOTAL ASSETS').toEqual(columns(byLabel('TOTAL ASSETS')));
    expect(sumOf('TOTAL CURRENT LIABILITIES', 'TOTAL NON-CURRENT LIABILITIES'), 'TOTAL LIABILITIES').toEqual(columns(byLabel('TOTAL LIABILITIES')));
    expect(sumOf('TOTAL LIABILITIES', 'TOTAL EQUITY'), 'TOTAL LIABILITIES AND EQUITY').toEqual(columns(byLabel('TOTAL LIABILITIES AND EQUITY')));
  });

  it('balances: assets equal liabilities plus equity in every column, eliminations included', () => {
    expect(columns(byLabel('TOTAL ASSETS'))).toEqual(columns(byLabel('TOTAL LIABILITIES AND EQUITY')));
  });

  it('eliminates intragroup receivables against intragroup payables, to the unit', () => {
    const receivables = ['Trade Receivables — Related Parties', 'Loan Receivable — Related Parties', 'Other Receivable — Related Parties'];
    const payables = ['Trade Payables — Related Parties', 'Short-term Borrowings', 'Accrued Expenses and Other Payables'];
    const out = (labels: string[]) => labels.reduce((s, l) => s - n(byLabel(l).elimination), 0);
    expect(out(receivables)).toBe(113000);
    expect(out(payables)).toBe(113000);
  });

  it('derives goodwill from the investment elimination', () => {
    const investment = -n(byLabel('Investment in Subsidiaries').elimination);
    const netAssets = -n(byLabel('Share Capital').elimination) - n(byLabel('Retained Earnings').elimination);
    const nci = n(byLabel('Non-Controlling Interest').consolidated);
    expect(investment + nci - netAssets).toBe(n(byLabel('Goodwill').consolidated));
    // The investment is eliminated in full: nothing left on the parent's line.
    expect(n(byLabel('Investment in Subsidiaries').consolidated)).toBe(0);
  });
});
