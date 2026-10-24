/**
 * A working paper cell as the viewer shows it (PRD site sweep 2026-10, R4.4): Excel's number format read
 * for what it means, and written in the site's convention. Thousands `1.234`, decimals `1.234,5`, negatives
 * `(665)` and percentages through Finance in Action's formatter (src/lib/finance-in-action/format.ts), which
 * stays the one number formatter; this module only decides which of its calls a format asks for.
 *
 * The formats this file uses (tests/unit/workbookFormat.test.ts lists them all):
 *   - accounting, `_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)` and its `_-* … -* …` sibling, with 0–3
 *     decimals: zero is the en dash. A negative is bracketed even where the format writes a minus: the
 *     site has one convention for negatives.
 *   - number, `#,##0 ;(#,##0)`, `#,##0`, `#,##0.00`: zero is `0`.
 *   - percentage, `0%`, `0.0%`, `0.00%`.
 *   - date, `d-mmm-yy` → `31 Dec 2024`; `mmm-yy` → `Dec 2024`.
 *   - General: Excel never groups thousands under it, so a year or a note number reads as typed (`2024`);
 *     from five digits up the site's thousands point applies. At most ten significant digits.
 * Text shows as it is (the format's text section only pads it), an error as its code, an empty cell as
 * nothing. No Intl and no Date: the output depends on neither the machine's ICU data nor its time zone.
 *
 * A figure is rounded as Excel rounds it before the formatter writes it (excelRound): on its 15-digit
 * decimal, half away from zero, where JavaScript's toFixed would round the binary value just below a half.
 */
import { house } from '@/lib/finance-in-action/format';

const { formatNumber, formatPercent } = house;
import type { WorkbookCell } from './types';

/**
 * An accounting zero: Excel's `"-"`, set as the en dash R4.4 asks for. Not Finance in Action's EMPTY (an
 * em dash, for a value that is missing): an accounting zero is a value.
 */
export const ACCOUNTING_ZERO = '–';

export type NumFmtKind = 'general' | 'number' | 'accounting' | 'percent' | 'date';

/** What a number format asks for. */
export interface NumFmt {
  kind: NumFmtKind;
  /** Decimal places of a number or a percentage; 0 for General and dates. */
  decimals: number;
  /** A date format with a day in it (`d-mmm-yy`), against one with the month and year alone (`mmm-yy`). */
  day: boolean;
}

const GENERAL: NumFmt = { kind: 'general', decimals: 0, day: false };

/** General shows at most this many significant digits, as Excel does in a cell of standard width. */
const GENERAL_DIGITS = 10;
/** General groups thousands from this size up; below it a number reads as typed. */
const GENERAL_GROUPS_FROM = 10_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A format's sections (positive; negative; zero; text), each as its code and its literal text. Quoted
 * text and `\`-escaped characters are literal; `_x` (a space the width of x), `*x` (a fill) and `[…]`
 * (a colour or a condition) say nothing about the number and are dropped.
 */
function sections(numFmt: string): { code: string; literal: string }[] {
  const out = [{ code: '', literal: '' }];
  for (let i = 0; i < numFmt.length; i++) {
    const ch = numFmt[i];
    const cur = out[out.length - 1];
    if (ch === '"') {
      const close = numFmt.indexOf('"', i + 1);
      const end = close < 0 ? numFmt.length : close;
      cur.literal += numFmt.slice(i + 1, end);
      i = end;
    } else if (ch === '\\') {
      cur.literal += numFmt[++i] ?? '';
    } else if (ch === '_' || ch === '*') {
      i++;
    } else if (ch === '[') {
      const close = numFmt.indexOf(']', i);
      i = close < 0 ? numFmt.length : close;
    } else if (ch === ';') {
      out.push({ code: '', literal: '' });
    } else {
      cur.code += ch;
    }
  }
  return out;
}

function classify(numFmt: string): NumFmt {
  const [positive, , zero] = sections(numFmt);
  const code = positive.code;
  if (/general/i.test(code)) return GENERAL;
  if (!/[0#?]/.test(code) && /[dmy]/i.test(code)) return { kind: 'date', decimals: 0, day: /d/i.test(code) };
  const point = code.indexOf('.');
  const decimals = point < 0 ? 0 : (code.slice(point + 1).match(/[0#?]/g) ?? []).length;
  if (code.includes('%')) return { kind: 'percent', decimals, day: false };
  // Accounting: the zero section writes a dash instead of a digit.
  const accounting = zero !== undefined && zero.literal.trim() === '-' && !/[0#]/.test(zero.code);
  return { kind: accounting ? 'accounting' : 'number', decimals, day: false };
}

const read = new Map<string, NumFmt>();

/** What a number format asks for; no format is General. A style's format is read once. */
export function readNumFmt(numFmt: string | undefined): NumFmt {
  if (numFmt === undefined) return GENERAL;
  let fmt = read.get(numFmt);
  if (!fmt) {
    fmt = classify(numFmt);
    read.set(numFmt, fmt);
  }
  return fmt;
}

/** `2024-12-31T00:00:00.000Z` → `31 Dec 2024`, or `Dec 2024` without the day. Read from the text: no time zone. */
export function formatDate(iso: string, day = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return day ? `${Number(m[3])} ${month} ${m[1]}` : `${month} ${m[1]}`;
}

/**
 * `value` to `decimals` places as Excel shows it: Excel holds 15 significant digits and rounds that decimal
 * half away from zero. 52876483665.49999 is 52876483665.5000 to 15 digits and shows as 52,876,483,666;
 * -43168094.235, stored as -43168094.234999999…, shows as -43,168,094.24.
 */
export function excelRound(value: number, decimals: number): number {
  if (!Number.isFinite(value) || value === 0) return value;
  // The 15-digit decimal, shifted by `decimals` in its text, so no binary multiplication is involved.
  const [digits15, exponent] = Math.abs(value).toExponential(14).split('e');
  const shifted = Number(`${digits15}e${Number(exponent) + decimals}`);
  return (Math.sign(value) * Math.round(shifted)) / 10 ** decimals;
}

/** A number under General: `2024`, `17`, `10.891.649.906`, `0,08404541`, `(17.228.149.502)`. */
export function formatGeneral(value: number): string {
  const whole = Math.max(1, Math.floor(Math.log10(Math.abs(value))) + 1);
  let decimals = Math.max(0, GENERAL_DIGITS - whole);
  const shown = Number(value.toFixed(decimals));
  while (decimals > 0 && Number(value.toFixed(decimals - 1)) === shown) decimals--;
  const text = formatNumber(value, decimals);
  return Math.abs(value) < GENERAL_GROUPS_FROM ? text.replace(/\./g, '') : text;
}

/** A cell's cached value as the grid shows it, under its style's number format. */
export function formatCell(cell: Pick<WorkbookCell, 'v' | 't'>, numFmt?: string): string {
  const { v, t } = cell;
  if (v === undefined) return '';
  if (t === 'e') return String(v);
  const fmt = readNumFmt(numFmt);
  if (t === 'd') return formatDate(String(v), fmt.kind !== 'date' || fmt.day);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return v;
  switch (fmt.kind) {
    case 'accounting':
      return v === 0 ? ACCOUNTING_ZERO : formatNumber(excelRound(v, fmt.decimals), fmt.decimals);
    case 'number':
      return formatNumber(excelRound(v, fmt.decimals), fmt.decimals);
    case 'percent':
      return formatPercent(v, fmt.decimals);
    default:
      // General, and a number under a date format, which exceljs would have read as a date.
      return formatGeneral(v);
  }
}

/**
 * A cell's value as the file holds it, for the formula bar and the inspector's raw value: a number in full
 * (a decimal point, a minus, no grouping), a date as its ISO day, text as typed, an error as its code.
 */
export function rawValue(cell: Pick<WorkbookCell, 'v' | 't'>): string {
  const { v, t } = cell;
  if (v === undefined) return '';
  if (t === 'd') return String(v).slice(0, 10);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

/** What the formula bar shows for a cell: its formula with the leading "=", as Excel shows it, or its raw value. */
export const formulaBarText = (cell: Pick<WorkbookCell, 'v' | 't' | 'f'> | undefined): string =>
  cell?.f !== undefined ? `=${cell.f}` : cell ? rawValue(cell) : '';
