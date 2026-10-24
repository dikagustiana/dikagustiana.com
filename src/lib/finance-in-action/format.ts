/**
 * The one number formatter of Finance in Action (constraint 14).
 *
 * en-US, as the owner decided for the section on 2026-10-24
 * (docs/prd/2026-10-fia-fixes, defaults): a comma separates thousands, a
 * point marks decimals, negatives sit in brackets. `1,234.5`, `(665)`,
 * `15.5%`. Written without Intl so the output does not depend on the ICU data
 * of the machine it runs on.
 *
 * The site's older convention (a point for thousands, a comma for decimals,
 * from src/components/consolidation/WorkingPaperTable.tsx and FSRE's
 * shared/house_format.py) is kept as `HOUSE`, and `house` below formats in
 * it: the consolidation workbook and the Kawasan world, outside the section,
 * read it from here and are not changed by this batch.
 */
import type { Row } from './contract/types';

/** Stated once under the grid and once under the chart. */
export const NUMBER_CONVENTION = 'A comma separates thousands and a point marks decimals; negatives are in brackets.';

export interface NumberLocale {
  group: string;
  decimal: string;
}

export const EN_US: NumberLocale = { group: ',', decimal: '.' };
export const HOUSE: NumberLocale = { group: '.', decimal: ',' };

/** What an empty value shows. */
export const EMPTY = '—';

const PERCENT = 100;

function group(intPart: string, loc: NumberLocale): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, loc.group);
}

function digits(abs: number, decimals: number, loc: NumberLocale): string {
  const fixed = abs.toFixed(decimals);
  const [i, d] = fixed.split('.');
  return d ? `${group(i, loc)}${loc.decimal}${d}` : group(i, loc);
}

/** `1,234.5`; `(665)`; null → —. A value that rounds to zero is never bracketed. */
export function formatNumber(value: number | null | undefined, decimals = 0, loc: NumberLocale = EN_US): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  const body = digits(Math.abs(value), decimals, loc);
  const isZero = Number(Math.abs(value).toFixed(decimals)) === 0;
  return value < 0 && !isZero ? `(${body})` : body;
}

/** A fraction as a percentage: 0.155 → `15.5%`; −0.02 → `(2.0%)`. */
export function formatPercent(fraction: number | null | undefined, decimals = 1, loc: NumberLocale = EN_US): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return EMPTY;
  const body = `${digits(Math.abs(fraction * PERCENT), decimals, loc)}%`;
  const isZero = Number(Math.abs(fraction * PERCENT).toFixed(decimals)) === 0;
  return fraction < 0 && !isZero ? `(${body})` : body;
}

/** A change: `+12` or `(12)`, and `0` when it rounds away. */
export function formatDelta(value: number | null | undefined, decimals = 0, loc: NumberLocale = EN_US): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY;
  const s = formatNumber(value, decimals, loc);
  return value > 0 && Number(value.toFixed(decimals)) !== 0 ? `+${s}` : s;
}

/** A change in a ratio, in percentage points: `+1.2 pp` or `(1.2 pp)`. */
export function formatPointsDelta(fractionDelta: number | null | undefined, decimals = 1, loc: NumberLocale = EN_US): string {
  if (fractionDelta === null || fractionDelta === undefined || !Number.isFinite(fractionDelta)) return EMPTY;
  const pts = fractionDelta * PERCENT;
  const body = `${digits(Math.abs(pts), decimals, loc)} pp`;
  const isZero = Number(Math.abs(pts).toFixed(decimals)) === 0;
  if (isZero) return `0 pp`;
  return pts < 0 ? `(${body})` : `+${body}`;
}

const DECIMALS_LARGE = 0;
const DECIMALS_MEDIUM = 1;
const DECIMALS_SMALL = 2;
const LARGE = 100;
const MEDIUM = 10;

/** Decimals by size, so 7,270 has none, 72.7 has one and 2.40 has two. */
export function decimalsFor(value: number): number {
  const a = Math.abs(value);
  if (a >= LARGE) return DECIMALS_LARGE;
  if (a >= MEDIUM) return DECIMALS_MEDIUM;
  return DECIMALS_SMALL;
}

/** True when a row holds a multiple, such as a strip ratio in bcm per tonne: `3.55x`, never a percentage. */
export const isMultipleRow = (row: Pick<Row, 'unit'>): boolean => /^(x|bcm per tonne\b)/i.test(row.unit.trim());

/** True when a row holds fractions shown as percentages. A multiple styled `ratio` is not one. */
export const isRatioRow = (row: Pick<Row, 'style' | 'unit'>): boolean => !isMultipleRow(row) && (row.style === 'ratio' || row.unit.trim().startsWith('%'));

/** A multiple to two decimals: `3.55x`. */
export const formatMultiple = (value: number | null | undefined, loc: NumberLocale = EN_US): string =>
  value === null || value === undefined || !Number.isFinite(value) ? EMPTY : `${formatNumber(value, 2, loc)}x`;

/** A cell value, formatted for its row. */
export function formatForRow(value: number | null | undefined, row: Pick<Row, 'style' | 'unit'>, loc: NumberLocale = EN_US): string {
  if (value === null || value === undefined) return EMPTY;
  if (isMultipleRow(row)) return formatMultiple(value, loc);
  if (isRatioRow(row)) return formatPercent(value, undefined, loc);
  return formatNumber(value, decimalsFor(value), loc);
}

/** A change in a cell value, formatted for its row. */
export function formatDeltaForRow(delta: number | null | undefined, row: Pick<Row, 'style' | 'unit'>, loc: NumberLocale = EN_US): string {
  if (delta === null || delta === undefined) return EMPTY;
  if (isRatioRow(row)) return formatPointsDelta(delta, undefined, loc);
  return formatDelta(delta, decimalsFor(delta), loc);
}

/**
 * Reads a number typed in the section's format: `1,234.5`, `(665)`, `-665`,
 * `15.5%`. For a ratio row the result is a fraction (15.5 → 0.155). Returns
 * null when the input is not a number.
 */
export function parseHouseNumber(input: string, ratio: boolean, loc: NumberLocale = EN_US): number | null {
  let s = input.trim().replace(/\s+/g, '');
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = !negative;
    s = s.slice(1);
  }
  const percent = s.endsWith('%');
  if (percent) s = s.slice(0, -1);
  const g = loc.group === '.' ? '\\.' : loc.group;
  const d = loc.decimal === '.' ? '\\.' : loc.decimal;
  if (!new RegExp(`^\\d{1,3}(${g}\\d{3})*(${d}\\d+)?$|^\\d+(${d}\\d+)?$`).test(s)) return null;
  const n = Number(s.split(loc.group).join('').replace(loc.decimal, '.'));
  if (!Number.isFinite(n)) return null;
  const v = ratio ? n / PERCENT : n;
  return negative ? -v : v;
}

/** The site's older convention, for the callers outside the section (the consolidation workbook, the Kawasan world). */
export const house = {
  formatNumber: (value: number | null | undefined, decimals = 0) => formatNumber(value, decimals, HOUSE),
  formatPercent: (fraction: number | null | undefined, decimals = 1) => formatPercent(fraction, decimals, HOUSE),
  formatForRow: (value: number | null | undefined, row: Pick<Row, 'style' | 'unit'>) => formatForRow(value, row, HOUSE),
};
