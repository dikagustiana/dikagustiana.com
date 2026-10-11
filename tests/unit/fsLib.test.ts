/**
 * The printing rules of the statements viewer (src/lib/fs.ts): figures as the
 * FS prints them, the FS's own date and unit lines, the latest check run, and
 * a line-item page's rows.
 */
import { describe, it, expect } from 'vitest';
import {
  formatFigure,
  latestRun,
  matchesSearch,
  pageRange,
  periodLine,
  rowsForSlug,
  shortDate,
  tieOut,
  unitLine,
  type FsCheck,
  type FsLine,
} from '@/lib/fs';

describe('formatFigure', () => {
  it('prints negatives in parentheses, nil as a dash, a blank cell blank', () => {
    expect(formatFigure(30434955)).toBe('30,434,955');
    expect(formatFigure(-3649862)).toBe('(3,649,862)');
    expect(formatFigure(0)).toBe('-');
    expect(formatFigure(null)).toBe('');
    expect(formatFigure(undefined)).toBe('');
  });
});

describe('dates', () => {
  it('reads the stored date as written, whatever the time zone', () => {
    // CI runs in America/Chicago: a Date parse of '2024-12-31' would print the 30th.
    expect(shortDate('2024-12-31')).toBe('31 Dec 2024');
    expect(periodLine('2024-12-31', true)).toEqual({ id: 'Tanggal 31 Desember 2024', en: 'As of December 31, 2024' });
    expect(periodLine('2024-12-31', false)).toEqual({
      id: 'Untuk Tahun yang Berakhir pada Tanggal 31 Desember 2024',
      en: 'For the Year Ended December 31, 2024',
    });
  });
});

describe('unitLine', () => {
  it('names the unit and currency in both languages', () => {
    expect(unitLine('thousands', 'USD')).toEqual({
      id: 'Disajikan dalam ribuan dolar Amerika Serikat, kecuali dinyatakan lain',
      en: 'Expressed in thousands of United States dollars, unless otherwise stated',
    });
    expect(unitLine('millions', 'IDR').en).toBe('Expressed in millions of Indonesian rupiah, unless otherwise stated');
  });
});

const check = (rule_id: string, passed: boolean, run_at: string): FsCheck => ({
  rule_id, statement: null, description: rule_id, expected: null, actual: null, diff: null, passed, run_at,
});

describe('the latest run', () => {
  it('is the rows of the most recent run_at, counted with its failures and declarations', () => {
    const checks = [
      check('A', false, '2026-10-11T10:00:00Z'),
      check('A', true, '2026-10-11T16:00:00Z'),
      check('DECLARED:cf:x:cy', true, '2026-10-11T16:00:00Z'),
      check('B', false, '2026-10-11T16:00:00Z'),
    ];
    const run = latestRun(checks);
    expect(run.map((c) => c.rule_id)).toEqual(['A', 'DECLARED:cf:x:cy', 'B']);
    expect(tieOut(run)).toEqual({ rules: 3, failed: 1, declared: 1, runAt: '2026-10-11T16:00:00Z' });
    expect(tieOut([])).toEqual({ rules: 0, failed: 0, declared: 0, runAt: null });
  });
});

describe('pageRange', () => {
  it('spans the pages read', () => {
    expect(pageRange([13, 11, 17, 16])).toBe('p.11–17');
    expect(pageRange([11])).toBe('p.11');
    expect(pageRange([])).toBe('');
  });
});

describe('matchesSearch', () => {
  it('matches either label or the notes, ignoring case', () => {
    const l = { label_id: 'Kas dan setara kas', label_en: 'Cash and cash equivalents', notes_ref: '3f,6' };
    expect(matchesSearch(l, 'KAS')).toBe(true);
    expect(matchesSearch(l, 'equivalents')).toBe(true);
    expect(matchesSearch(l, '3f')).toBe(true);
    expect(matchesSearch(l, '  ')).toBe(true);
    expect(matchesSearch(l, 'goodwill')).toBe(false);
  });
});

const fl = (sort_order: number, line_type: FsLine['line_type'], indent: number, fsli_slug: string | null = null): FsLine => ({
  id: String(sort_order), period_id: 'p', statement: 'sofp', parent_id: null, sort_order, line_type, indent,
  label_id: `id ${sort_order}`, label_en: `en ${sort_order}`, notes_ref: null, value_cy: 1, value_py: 1,
  source_page: 11, line_key: null, fsli_slug, printed_diff_cy: null, printed_diff_py: null, printed_diff_note: null,
});

describe('rowsForSlug', () => {
  const lines = [fl(40, 'header', 0, 'trade'), fl(30, 'item', 0, 'cash'), fl(50, 'item', 1), fl(60, 'item', 1), fl(70, 'item', 0)];
  it('is the linked row alone, or a heading with the rows printed under it', () => {
    expect(rowsForSlug(lines, 'cash').map((l) => l.sort_order)).toEqual([30]);
    expect(rowsForSlug(lines, 'trade').map((l) => l.sort_order)).toEqual([40, 50, 60]);
    expect(rowsForSlug(lines, 'nothing')).toEqual([]);
  });
});
