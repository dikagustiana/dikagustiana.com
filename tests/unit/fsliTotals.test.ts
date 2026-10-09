import { describe, expect, it } from 'vitest';
import { parseFsliAmount, sumLineItems, type FsliAmountRow } from '@/lib/fsliTotals';

const row = (dec_2024: string | null, extra: Partial<FsliAmountRow> = {}): FsliAmountRow => ({
  category: 'current_assets',
  dec_2024,
  dec_2023: null,
  ...extra,
});

describe('FSLI statement subtotals', () => {
  it('parses comma-grouped figures and treats blanks as zero', () => {
    expect(parseFsliAmount('2,614,318')).toBe(2614318);
    expect(parseFsliAmount('')).toBe(0);
    expect(parseFsliAmount(null)).toBe(0);
    expect(parseFsliAmount('n/a')).toBe(0);
  });

  it('leaves component rows out of the subtotal so a breakdown is not counted twice', () => {
    const rows = [
      row('2,203,018'), // trade receivables, net
      row('520,885', { is_component: true }), // of which third parties
      row('823,348', { is_component: true }), // of which related parties
      row('2,614,318'), // cash
    ];
    expect(sumLineItems(rows, 'dec_2024')).toBe(2203018 + 2614318);
  });

  it('counts every row when the flag is absent or null, as before the column existed', () => {
    const rows = [row('100'), row('200', { is_component: null }), row('300', { is_component: false })];
    expect(sumLineItems(rows, 'dec_2024')).toBe(600);
  });
});
