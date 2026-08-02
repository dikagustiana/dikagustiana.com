import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/formatDate';

describe('formatDate (editorial short format)', () => {
  it('omits the year for dates in the current year', () => {
    const now = new Date();
    // UTC construction: a local-midnight Date shifts across the date line
    // depending on the machine's zone, which made this test's answer depend
    // on where it ran. The machine's timezone must never change the result.
    const iso = new Date(Date.UTC(now.getUTCFullYear(), 5, 15)).toISOString(); // Jun 15
    const out = formatDate(iso);
    expect(out).toBe('Jun 15');
    expect(out).not.toMatch(/,/);
  });

  it('includes the year for prior-year dates', () => {
    const out = formatDate('2000-03-09T00:00:00.000Z');
    expect(out).toMatch(/Mar 9, 2000/);
  });

  it('falls back to the raw input on a malformed date', () => {
    // new Date('garbage') is Invalid; getFullYear -> NaN -> not current year
    // branch returns "Invalid Date NaN" style — assert it never throws.
    expect(() => formatDate('garbage')).not.toThrow();
  });

  it('handles empty string without throwing', () => {
    expect(() => formatDate('')).not.toThrow();
  });
});
