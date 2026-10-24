/**
 * docs/prd/2026-10-fia-fixes item 7: rupiah to US dollars at the period's
 * JISDOR rate (fx.ts). The rates here are test numbers, not Bank Indonesia's.
 */
import { describe, expect, it } from 'vitest';
import { basisFor, fromRow, fxCaption, rateBetween, toUsd, usdRateRow, type FxRate } from '@/lib/finance-in-action/fx';

const rate = (periodId: string, r: number, basis: FxRate['basis'] = 'average'): FxRate => ({
  periodId,
  from: 'USD',
  to: 'IDR',
  rate: r,
  basis,
  source: 'TEST rate',
  sourceUrl: 'https://example.test/jisdor',
});
const RATES = [rate('FY25', 16_000), rate('FY25', 16_500, 'closing'), rate('26Q2', 16_400)];

describe('toUsd', () => {
  it('divides rupiah by the period average', () => {
    expect(toUsd(922_498, 'Rp', 'FY25', RATES)).toBeCloseTo(57.656, 3);
    expect(toUsd(16_400, 'IDR', '26Q2', RATES)).toBeCloseTo(1, 9);
  });

  it('leaves US dollars as they are, rate or none', () => {
    expect(toUsd(153.9, 'US$', 'FY25', [])).toBe(153.9);
    expect(toUsd(153.9, 'USD', 'ZZ99', RATES)).toBe(153.9);
  });

  it('uses the closing rate for balances and the average for flows', () => {
    expect(basisFor('flow')).toBe('average');
    expect(basisFor('balance')).toBe('closing');
    expect(toUsd(16_500, 'Rp', 'FY25', RATES, basisFor('balance'))).toBeCloseTo(1, 9);
    expect(toUsd(16_000, 'Rp', 'FY25', RATES, basisFor('flow'))).toBeCloseTo(1, 9);
  });

  it('is null without a rate for the period, never zero and never a neighbour', () => {
    expect(toUsd(922_498, 'Rp', '25Q3', RATES)).toBeNull();
    expect(toUsd(922_498, 'Rp', '26Q2', RATES, 'closing')).toBeNull();
    expect(toUsd(null, 'Rp', 'FY25', RATES)).toBeNull();
    expect(toUsd(Number.NaN, 'Rp', 'FY25', RATES)).toBeNull();
  });

  it('reads a stored pair in either direction and ignores a rate at or below zero', () => {
    const inverse: FxRate = { ...rate('FY25', 1 / 16_000), from: 'IDR', to: 'USD' };
    expect(rateBetween([inverse], 'FY25', 'Rp', 'US$')).toBeCloseTo(1 / 16_000, 12);
    expect(rateBetween([rate('FY25', 0)], 'FY25', 'Rp', 'US$')).toBeNull();
  });
});

describe('the rows and the caption', () => {
  it('maps a database row, the rate as a number', () => {
    expect(fromRow({ period_id: 'FY25', from_ccy: 'USD', to_ccy: 'IDR', rate: '16000.5', basis: 'average', source: 's', source_url: 'u' })).toEqual({
      periodId: 'FY25',
      from: 'USD',
      to: 'IDR',
      rate: 16000.5,
      basis: 'average',
      source: 's',
      sourceUrl: 'u',
    });
  });

  it('names the rate in the caption, or says there is none', () => {
    expect(usdRateRow(RATES, 'FY25', 'Rp')?.rate).toBe(16_000);
    expect(fxCaption('PTBA', 'Rp', 'FY25', 'FY 25', RATES)).toMatch(/^PTBA converted at BI JISDOR FY 25 average 16.000 IDR\/USD\.$|^PTBA converted at BI JISDOR FY 25 average 16,000 IDR\/USD\.$/);
    expect(fxCaption('PTBA', 'Rp', '25Q3', '3Q 25', RATES)).toMatch(/no BI JISDOR rate is loaded for 3Q 25/);
  });
});
