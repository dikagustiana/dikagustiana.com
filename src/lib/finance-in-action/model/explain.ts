/**
 * How a cell is built, in words, for the inspector (brief §5.3): the formula
 * with each reference named by its row (and its period, where it differs
 * from the cell's own), then the same with the values in it.
 *
 * Also the sources behind a cell: every sourced cell on its chain of
 * precedents, found through the dependency graph and nothing else.
 */
import { CELL_KINDS, byId } from '../constants';
import type { CellSource } from '../contract/types';
import type { Ast } from '../engine/parser';
import { rangeKeys } from '../engine/parser';
import { isErr, isNum, type Value } from '../engine/engine';
import { formatForRow } from '../format';
import type { Workbook } from './workbook';

const OP_WORDS: Record<string, string> = {
  '+': 'plus',
  '-': 'less',
  '*': '×',
  '/': '÷',
  '^': 'to the power of',
  '=': 'equals',
  '<>': 'differs from',
  '<': 'is below',
  '>': 'is above',
  '<=': 'is at most',
  '>=': 'is at least',
};
const PRECEDENCE: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '+': 2, '-': 2, '*': 3, '/': 3, '^': 4 };
const FN_WORDS: Record<string, string> = {
  SUM: 'the sum of',
  AVERAGE: 'the average of',
  MIN: 'the lowest of',
  MAX: 'the highest of',
  ABS: 'the absolute value of',
  IF: 'if',
  IFERROR: 'unless it errs,',
};

export interface Explanation {
  words: string;
  withValues: string;
}

function refName(wb: Workbook, key: string, ownKey: string): string {
  const a = wb.address(key);
  const own = wb.address(ownKey);
  if (!a) return key;
  const row = wb.pkg.sheets.find((s) => s.id === a.sheet)?.rows[a.rowIndex];
  let name = row?.label ?? key;
  if (own && a.sheet !== own.sheet && a.sheet !== 'model') name = `${name} (${a.sheet})`;
  if (own && a.periodIndex !== own.periodIndex) name = `${name}, ${wb.pkg.periods[a.periodIndex]?.label}`;
  return name;
}

function refValue(wb: Workbook, key: string, values: Map<string, Value>): string {
  const a = wb.address(key);
  const row = a ? wb.pkg.sheets.find((s) => s.id === a.sheet)?.rows[a.rowIndex] : undefined;
  const v = values.get(key) ?? null;
  if (v === null) return 'nothing';
  if (isErr(v)) return v.err;
  if (!isNum(v)) return String(v);
  return row ? formatForRow(v, row) : String(v);
}

export function explainFormula(wb: Workbook, key: string, values: Map<string, Value>): Explanation | null {
  const cell = wb.engine.cells.get(key);
  if (!cell || cell.kind !== 'formula' || !cell.ast) return null;
  const render = (n: Ast, withValues: boolean, parentPrec = 0): string => {
    switch (n.t) {
      case 'num':
        return String(n.v).replace('.', ',');
      case 'str':
        return `“${n.v}”`;
      case 'ref':
        return withValues ? refValue(wb, n.key, values) : refName(wb, n.key, key);
      case 'range': {
        const keys = rangeKeys(n.a, n.b);
        if (withValues) return keys.map((k) => refValue(wb, k, values)).join(', ');
        const first = refName(wb, keys[0], key);
        const last = wb.address(keys[keys.length - 1]);
        return `${first} to ${last ? wb.pkg.periods[last.periodIndex]?.label : keys[keys.length - 1]}`;
      }
      case 'neg':
        return `minus ${render(n.e, withValues, PRECEDENCE['^'])}`;
      case 'bin': {
        const p = PRECEDENCE[n.op] ?? 0;
        const s = `${render(n.l, withValues, p)} ${OP_WORDS[n.op] ?? n.op} ${render(n.r, withValues, p + 1)}`;
        return p < parentPrec ? `(${s})` : s;
      }
      case 'fn':
        return `${FN_WORDS[n.name] ?? n.name} ${n.args.map((a) => render(a, withValues)).join(', ')}`;
      default:
        return '';
    }
  };
  return { words: render(cell.ast, false), withValues: render(cell.ast, true) };
}

export interface SourcedInput {
  key: string;
  label: string;
  period: string;
  source: CellSource;
}

/** Every sourced cell this cell is built from, the cell itself included when it is sourced. */
export function sourcedInputs(wb: Workbook, key: string): SourcedInput[] {
  const keys = [key, ...wb.graph.precedents(key, 'full')];
  const out: SourcedInput[] = [];
  for (const k of keys) {
    const c = wb.cell(k);
    const a = wb.address(k);
    if (!c || !a || c.kind !== 'sourced' || !c.source) continue;
    const row = wb.pkg.sheets.find((s) => s.id === a.sheet)?.rows[a.rowIndex];
    out.push({ key: k, label: row?.label ?? k, period: wb.pkg.periods[a.periodIndex]?.label ?? '', source: c.source });
  }
  return out;
}

export const kindLabel = (kind: string): string => byId(CELL_KINDS, kind)?.label ?? kind;

/** A source in one line: issuer, document, period, note, page, XBRL concept. */
export function sourceLine(s: CellSource): string {
  return [
    s.issuer,
    s.document,
    s.period,
    s.note ? `note ${s.note}` : null,
    s.page ? `page ${s.page}` : null,
    s.xbrlConcept ? `XBRL concept ${s.xbrlConcept}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}
