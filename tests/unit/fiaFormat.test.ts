/** The one number formatter (constraint 14): point for thousands, comma for decimals, negatives in brackets. */
import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  NUMBER_CONVENTION,
  decimalsFor,
  formatDelta,
  formatForRow,
  formatNumber,
  formatPercent,
  formatPointsDelta,
  parseHouseNumber,
} from '@/lib/finance-in-action/format';

describe('formatNumber', () => {
  it('writes the house format', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(-665)).toBe('(665)');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(0.25, 2)).toBe('0,25');
    expect(formatNumber(999.96, 1)).toBe('1.000,0');
  });

  it('never brackets a value that rounds to zero, and shows an empty value as a dash', () => {
    expect(formatNumber(-0.004, 2)).toBe('0,00');
    expect(formatNumber(null)).toBe(EMPTY);
    expect(formatNumber(Number.NaN)).toBe(EMPTY);
  });
});

describe('percentages and changes', () => {
  it('formats fractions as percentages', () => {
    expect(formatPercent(0.155)).toBe('15,5%');
    expect(formatPercent(-0.02)).toBe('(2,0%)');
  });

  it('signs a change and brackets a fall', () => {
    expect(formatDelta(12)).toBe('+12');
    expect(formatDelta(-12)).toBe('(12)');
    expect(formatDelta(0.2)).toBe('0');
    expect(formatPointsDelta(0.012)).toBe('+1,2 pp');
    expect(formatPointsDelta(-0.012)).toBe('(1,2 pp)');
    expect(formatPointsDelta(0.00001)).toBe('0 pp');
  });

  it('picks decimals by size and formats a value for its row', () => {
    expect([decimalsFor(7270), decimalsFor(72.7), decimalsFor(2.4)]).toEqual([0, 1, 2]);
    expect(formatForRow(7270, { unit: 'Rp bn' })).toBe('7.270');
    expect(formatForRow(2.4, { unit: 'Mt' })).toBe('2,40');
    expect(formatForRow(0.2067, { unit: '%', style: 'ratio' })).toBe('20,7%');
    expect(formatForRow(0.1, { unit: '% of revenue' })).toBe('10,0%');
  });

  it('states the convention in words', () => {
    expect(NUMBER_CONVENTION).toBe('A point separates thousands and a comma marks decimals; negatives are in brackets.');
  });
});

describe('parseHouseNumber', () => {
  it('reads what the formatter writes', () => {
    expect(parseHouseNumber('1.234,5', false)).toBe(1234.5);
    expect(parseHouseNumber('(665)', false)).toBe(-665);
    expect(parseHouseNumber('-665', false)).toBe(-665);
    expect(parseHouseNumber('720', false)).toBe(720);
    expect(parseHouseNumber('15,5%', true)).toBeCloseTo(0.155);
    expect(parseHouseNumber('22', true)).toBeCloseTo(0.22);
  });

  it('refuses what it cannot read', () => {
    for (const bad of ['', 'abc', '1,234.5', '12..3', '1.23']) expect(parseHouseNumber(bad, false), bad).toBeNull();
  });
});
