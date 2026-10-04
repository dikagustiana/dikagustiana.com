/**
 * Finance in Action v3.1, Commit 2: the formula engine, the dependency graph
 * and recalculation with deltas (brief §4), and the engine against the
 * SYNTHETIC fixtures.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DependencyGraph,
  Engine,
  FormulaSyntaxError,
  colIndex,
  colLetter,
  formulaCell,
  isErr,
  normaliseKey,
  parse,
  recalcWithEdits,
  refsOf,
  type EngineCell,
  type Value,
} from '@/lib/finance-in-action/engine';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { checkFormulas, checkTreeEdges } from '@/lib/finance-in-action/model/checks';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';

/** A small workbook: cells by key, a value or a formula (leading "="). */
function engineOf(cells: Record<string, number | string | null>): Engine {
  const map = new Map<string, EngineCell>();
  for (const [key, v] of Object.entries(cells)) {
    const sheet = key.split('!')[0];
    map.set(key, typeof v === 'string' && v.startsWith('=') ? formulaCell(v, sheet) : { kind: 'value', value: v });
  }
  return new Engine(map);
}
const errOf = (v: Value) => (isErr(v) ? v.err : null);

describe('addresses', () => {
  it('convert between column letters and numbers', () => {
    expect([1, 26, 27, 52, 703].map(colLetter)).toEqual(['A', 'Z', 'AA', 'AZ', 'AAA']);
    expect(['A', 'Z', 'AA', 'AZ', 'AAA'].map(colIndex)).toEqual([1, 26, 27, 52, 703]);
  });

  it('compare sheet names without regard to case and drop $ anchors', () => {
    expect(normaliseKey('Model!$C$12')).toBe('model!C12');
    expect(normaliseKey("'Model'!C12")).toBe('model!C12');
  });
});

describe('the parser', () => {
  it('reads plain, anchored and sheet-qualified references', () => {
    expect(refsOf(parse('=A1+$B$2+Model!C3+\'Sheet name\'!$D4', 'model'))).toEqual([
      'model!A1',
      'model!B2',
      'model!C3',
      'sheet name!D4',
    ]);
  });

  it('expands ranges, an unqualified end staying on the start’s sheet', () => {
    expect(refsOf(parse('SUM(reported!C2:D3)', 'model'))).toEqual(['reported!C2', 'reported!C3', 'reported!D2', 'reported!D3']);
  });

  it('rejects malformed formulas', () => {
    for (const bad of ['1+', '(1', 'SUM(1', '1 2', '#', '"open']) expect(() => parse(bad, 's')).toThrow(FormulaSyntaxError);
  });
});

describe('the evaluator', () => {
  it('follows precedence: ^ before * and /, before + and -, before comparisons; unary minus', () => {
    const e = engineOf({ 's!A1': '=2+3*4', 's!A2': '=2^3^2', 's!A3': '=-2^2', 's!A4': '=(2+3)*4', 's!A5': '=1+1=2', 's!A6': '=10/4-1' });
    expect([e.get('s!A1'), e.get('s!A2'), e.get('s!A3'), e.get('s!A4'), e.get('s!A5'), e.get('s!A6')]).toEqual([14, 64, 4, 20, true, 1.5]);
  });

  it('compares numbers and strings', () => {
    const e = engineOf({ 's!A1': 3, 's!B1': '=A1>2', 's!B2': '=A1<=2', 's!B3': '=A1<>3', 's!B4': '="a"="a"', 's!B5': '=A1>=3' });
    expect(['s!B1', 's!B2', 's!B3', 's!B4', 's!B5'].map((k) => e.get(k))).toEqual([true, false, false, true, true]);
  });

  it('runs SUM, AVERAGE, MIN and MAX over ranges and scalars, skipping blanks in ranges', () => {
    const e = engineOf({
      's!A1': 1, 's!A2': 2, 's!A3': null, 's!A4': 4,
      's!B1': '=SUM(A1:A4)', 's!B2': '=AVERAGE(A1:A4)', 's!B3': '=MIN(A1:A4,0.5)', 's!B4': '=MAX(A1:A4,10)', 's!B5': '=SUM(A1,A2,5)',
    });
    expect(['s!B1', 's!B2', 's!B3', 's!B4', 's!B5'].map((k) => e.get(k))).toEqual([7, 7 / 3, 0.5, 10, 8]);
  });

  it('runs IF, IFERROR and ABS', () => {
    const e = engineOf({ 's!A1': -5, 's!B1': '=IF(A1<0,"neg","pos")', 's!B2': '=IFERROR(1/0,99)', 's!B3': '=ABS(A1)', 's!B4': '=IF(0,1)' });
    expect(['s!B1', 's!B2', 's!B3', 's!B4'].map((k) => e.get(k))).toEqual(['neg', 99, 5, false]);
  });

  it('treats a blank as zero in arithmetic and returns null for a bare reference to it', () => {
    const e = engineOf({ 's!A1': null, 's!B1': '=A1+1', 's!B2': '=A1' });
    expect([e.get('s!B1'), e.get('s!B2')]).toEqual([1, null]);
  });

  it('resolves sheet-qualified references across sheets, case-insensitively', () => {
    const e = engineOf({ 'model!C12': 7, "sheet name!C1": 3, 'out!A1': "=Model!C12*'Sheet name'!$C$1" });
    expect(e.get('out!A1')).toBe(21);
  });

  it('produces and propagates error values', () => {
    const e = engineOf({
      's!A1': '=1/0', 's!A2': '=A1+1', 's!A3': '=NOPE(1)', 's!A4': '=A1:A2', 's!A5': '=SUM(A1,1)', 's!A6': '="x"*2', 's!A7': '=AVERAGE(B9:B10)',
      's!A8': '=10^400',
    });
    expect(['s!A1', 's!A2', 's!A3', 's!A4', 's!A5', 's!A6', 's!A7', 's!A8'].map((k) => errOf(e.get(k)))).toEqual([
      '#DIV/0!', '#DIV/0!', '#NAME?', '#VALUE!', '#DIV/0!', '#VALUE!', '#DIV/0!', '#NUM!',
    ]);
  });

  it('detects circular references, direct and through other cells', () => {
    const e = engineOf({ 's!A1': '=A1+1', 's!B1': '=B2', 's!B2': '=B3', 's!B3': '=B1', 's!C1': '=B1+1' });
    expect(errOf(e.get('s!A1'))).toBe('#CIRC!');
    expect(errOf(e.get('s!B1'))).toBe('#CIRC!');
    expect(errOf(e.get('s!C1'))).toBe('#CIRC!');
  });

  it('keeps a syntax error as the cell’s value instead of throwing', () => {
    const e = engineOf({ 's!A1': '=1+' });
    expect(errOf(e.get('s!A1'))).toBe('#ERR!');
  });
});

describe('the dependency graph', () => {
  const e = engineOf({ 's!A1': 2, 's!A2': 3, 's!B1': '=A1*A2', 's!C1': '=B1+1', 's!D1': '=SUM(B1:C1)' });
  const g = new DependencyGraph(e);

  it('gives precedents one level and the full chain', () => {
    expect(g.precedents('s!C1').sort()).toEqual(['s!B1']);
    expect(g.precedents('s!C1', 'full').sort()).toEqual(['s!A1', 's!A2', 's!B1']);
  });

  it('gives dependents one level and the full chain', () => {
    expect(g.dependents('s!A1').sort()).toEqual(['s!B1']);
    expect(g.dependents('s!A1', 'full').sort()).toEqual(['s!B1', 's!C1', 's!D1']);
  });

  it('reports cycles and nothing else', () => {
    expect(g.cycles()).toEqual([]);
    const c = new DependencyGraph(engineOf({ 's!A1': '=B1', 's!B1': '=A1', 's!C1': '=C1', 's!D1': '=A1' }));
    expect(c.cycles().sort()).toEqual([['s!A1', 's!B1'], ['s!C1']]);
  });
});

describe('recalculation with deltas', () => {
  it('returns every changed cell with its delta, and nothing that did not move', () => {
    const e = engineOf({ 's!A1': 2, 's!A2': 3, 's!B1': '=A1*A2', 's!C1': '=A2+1' });
    const before = e.recalc();
    const { changed } = recalcWithEdits(e, before, [{ key: 's!A1', value: 5 }]);
    expect(changed.map((c) => [c.key, c.before, c.after, c.delta]).sort()).toEqual([
      ['s!A1', 2, 5, 3],
      ['s!B1', 6, 15, 9],
    ]);
  });

  it('refuses to overwrite a formula cell', () => {
    const e = engineOf({ 's!A1': 2, 's!B1': '=A1' });
    expect(() => e.setValue('s!B1', 1)).toThrow(/not a value cell/);
  });
});

const FIXTURES = path.resolve(__dirname, '../../src/data/finance-in-action/fixtures');
const load = (t: string): ModelPackage => JSON.parse(fs.readFileSync(path.join(FIXTURES, `${t}.SYNTHETIC.json`), 'utf8'));
const TICKERS = ['XCOA', 'SCOA', 'SCEM', 'XCEM'];

describe('the engine on the SYNTHETIC fixtures', () => {
  it.each(TICKERS)('%s: formulas parse, read only its own cells, are acyclic, and agree with every stored value', (t) => {
    expect(checkFormulas(new Workbook(load(t)))).toEqual([]);
  });

  it.each(TICKERS)('%s: every driver-tree edge is backed by the formulas', (t) => {
    expect(checkTreeEdges(new Workbook(load(t)))).toEqual([]);
  });

  it('reports a tree edge the formulas do not support', () => {
    const pkg = load('XCOA');
    pkg.driverTree.edges.push({ from: 'sga', to: 'revenue' });
    expect(checkTreeEdges(new Workbook(pkg)).map((i) => i.message)).toEqual(['sga → revenue is not backed by any formula']);
  });

  it('reports a stored value the engine does not reproduce', () => {
    const pkg = load('XCOA');
    const gp = pkg.sheets.find((s) => s.id === 'model')!.rows.find((r) => r.id === 'gross_profit')!;
    gp.cells[0].value = (gp.cells[0].value as number) + 1;
    expect(checkFormulas(new Workbook(pkg)).map((i) => i.path)).toEqual(['model!gross_profit[24Q1]']);
  });

  it('maps rows and periods to addresses and back', () => {
    const wb = new Workbook(load('XCOA'));
    const key = wb.keyOf('model!revenue', 'FY25')!;
    expect(key).toBe('model!K4');
    expect(wb.address(key)).toMatchObject({ sheet: 'model', rowId: 'revenue', periodIndex: 8 });
    expect(wb.rowRefOf('MODEL!$K$4')).toBe('model!revenue');
  });

  it('recalculates a forecast price edit through revenue to profit to owners, with exact deltas', () => {
    const wb = new Workbook(load('XCOA'));
    const before = wb.values();
    const priceKey = wb.keyOf('assumptions!price', '26Q2E')!;
    const old = before.get(priceKey) as number;
    const { changed } = recalcWithEdits(wb.engine, before, [{ key: priceKey, value: old + 10 }]);
    const byRow = Object.fromEntries(changed.map((c) => [wb.rowRefOf(c.key), c]));
    const vol = before.get(wb.keyOf('model!vol_sold', '26Q2E')!) as number;
    expect(byRow['assumptions!price'].delta).toBeCloseTo(10);
    expect(byRow['model!revenue'].delta).toBeCloseTo(vol * 10);
    expect(byRow['model!cor_royalty'].delta).toBeCloseTo(vol * 10 * 0.1);
    expect(Object.keys(byRow)).toEqual(expect.arrayContaining(['model!gross_profit', 'model!operating_profit', 'model!owners_profit']));
    // Only the edited period moves; FY 25 and the other forecast quarter do not.
    expect(changed.every((c) => wb.address(c.key)!.periodIndex === wb.periodIndex('26Q2E'))).toBe(true);
    // Nothing reported moves.
    expect(changed.some((c) => wb.address(c.key)!.sheet === 'reported')).toBe(false);
  });

  it('finds the sources behind a unit-economics line through the graph alone', () => {
    const wb = new Workbook(load('XCOA'));
    const key = wb.keyOf('model!cor_contractor', 'FY25')!;
    const sourced = wb.graph
      .precedents(key, 'full')
      .filter((k) => wb.cell(k)?.kind === 'sourced')
      .map((k) => wb.rowRefOf(k));
    expect(new Set(sourced)).toEqual(new Set(['reported!cor_contractor']));
  });
});
