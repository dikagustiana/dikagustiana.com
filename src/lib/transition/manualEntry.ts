/**
 * Manual entry for the transition data layer (PRD, Fase 2): one value or a
 * pasted CSV, checked here before it is staged, so the admin sees a row's
 * problem beside the row. The database's rules (R1–R8, ds_stage_checks) run
 * again at publish and are the ones that count; these only save a round trip.
 */

import type { Frequency } from './model';

export interface ManualSeries {
  id: string;
  unit: string;
  frequency: Frequency;
}

export interface ManualRow {
  member: string;
  period_start: string;
  period_label: string | null;
  value: number;
  unit: string;
  vintage: string;
  source_url: string;
  source_locator: string;
}

export interface ParsedRow {
  line: number;
  row: ManualRow | null;
  errors: string[];
}

export const MANUAL_CSV_COLUMNS = ['period_start', 'value', 'vintage', 'source_url', 'source_locator'] as const;
export const MANUAL_CSV_OPTIONAL = ['member', 'period_label', 'unit'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** R3 on the client: the period starts on the series' grid. */
export function onGrid(period: string, frequency: Frequency): boolean {
  const month = Number(period.slice(5, 7));
  const day = Number(period.slice(8, 10));
  switch (frequency) {
    case 'A':
      return month === 1 && day === 1;
    case 'Q':
      return [1, 4, 7, 10].includes(month) && day === 1;
    case 'M':
      return day === 1;
    default:
      return true;
  }
}

/** A number as people type it: 690675, 690,675 or 1 234.5. Not 1.234,5. */
export function parseNumber(text: string): number | null {
  const s = text.trim().replace(/[\s_]/g, '');
  if (!/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(s)) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function checkRow(input: Partial<Record<keyof ManualRow, string>>, series: ManualSeries): { row: ManualRow | null; errors: string[] } {
  const errors: string[] = [];
  const period = (input.period_start ?? '').trim();
  const vintage = (input.vintage ?? '').trim();
  const url = (input.source_url ?? '').trim();
  const locator = (input.source_locator ?? '').trim();
  const unit = (input.unit ?? '').trim() || series.unit;
  const value = parseNumber(input.value ?? '');

  if (!validDate(period)) errors.push('period_start is not a date (YYYY-MM-DD)');
  else if (!onGrid(period, series.frequency)) errors.push(`period_start is not on the ${series.frequency} grid (R3)`);
  if (value === null) errors.push('value is not a number');
  if (!validDate(vintage)) errors.push('vintage is the source document’s date (YYYY-MM-DD)');
  if (!/^https:\/\/\S+$/.test(url)) errors.push('source_url must be an https link to the source document (R1)');
  if (!locator) errors.push('source_locator names the page, table or paragraph (R2)');
  if (unit !== series.unit) errors.push(`unit ${unit} is not the series’ unit ${series.unit} (R5)`);

  if (errors.length) return { row: null, errors };
  return {
    row: {
      member: (input.member ?? '').trim(),
      period_start: period,
      period_label: (input.period_label ?? '').trim() || null,
      value: value!,
      unit,
      vintage,
      source_url: url,
      source_locator: locator,
    },
    errors,
  };
}

/** Split one CSV line, honouring double quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === '\t' || c === ';') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/**
 * A pasted CSV with a header row naming at least MANUAL_CSV_COLUMNS. Tabs and
 * semicolons separate too, so a paste from a spreadsheet works.
 */
export function parseManualCsv(text: string, series: ManualSeries): { rows: ParsedRow[]; headerErrors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd());
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first < 0) return { rows: [], headerErrors: ['nothing pasted'] };
  const header = splitCsvLine(lines[first]).map((h) => h.trim().toLowerCase());
  const missing = MANUAL_CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], headerErrors: [`the header lacks ${missing.join(', ')}`] };

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (let i = first + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitCsvLine(lines[i]);
    const rec: Record<string, string> = {};
    header.forEach((h, j) => (rec[h] = cells[j] ?? ''));
    const { row, errors } = checkRow(rec, series);
    if (row) {
      const key = `${row.member}|${row.period_start}|${row.vintage}`;
      if (seen.has(key)) errors.push('the same member, period and vintage appear twice (R4)');
      seen.add(key);
    }
    rows.push({ line: i + 1, row: errors.length ? null : row, errors });
  }
  return { rows, headerErrors: [] };
}
