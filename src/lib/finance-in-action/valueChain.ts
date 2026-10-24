/**
 * "How the business makes money" as a value chain (docs/prd/2026-10-fia-fixes
 * item 3): the operation read left to right, Mine → Haul & process → Sell →
 * To the state → Result, with mining services as a branch of its own below
 * the flow. Each cell is a line by its canonical identity or a row by its role
 * (canonical.ts), so the same chain reads every company of the sub-industry
 * whatever its own ids. Coal production is mapped first; a sub-industry
 * without a chain here keeps the driver-tree grid (DriverRow).
 *
 * Every value is the model's own, read from the page's current values (so an
 * edit moves it), never stored here.
 */
import type { ModelPackage, Period } from './contract/types';
import { linesOf, rowRefsOf, type Canonical, type RowRole } from './canonical';
import { isNum, type Value } from './engine/engine';
import { periodById, yearAgo } from './model/periods';
import type { Workbook } from './model/workbook';

export type ChainSource = { line: Canonical } | { role: RowRole };

export interface ChainCellDef {
  id: string;
  label: string;
  source: ChainSource;
  /** Use the line's own label (gross profit: "Coal gross profit" for ADRO, "Gross profit" for PTBA). */
  ownLabel?: boolean;
}

export interface ChainStageDef {
  id: string;
  title: string;
  cells: ChainCellDef[];
}

export interface ValueChainDef {
  stages: ChainStageDef[];
  branch: ChainCellDef[];
}

/** By sub-industry code. */
export const VALUE_CHAINS: Record<string, ValueChainDef> = {
  // Coal production
  A121: {
    stages: [
      {
        id: 'mine',
        title: 'Mine',
        cells: [
          { id: 'ob', label: 'Overburden', source: { role: 'ob_removed' } },
          { id: 'strip', label: 'Strip ratio', source: { role: 'strip_ratio' } },
          { id: 'cost_bcm', label: 'Mining cost per bcm', source: { role: 'cost_per_bcm' } },
          { id: 'mining', label: 'Mining cost', source: { line: 'mining' } },
        ],
      },
      {
        id: 'haul',
        title: 'Haul & process',
        cells: [
          { id: 'processing', label: 'Processing and reclamation', source: { line: 'processing' } },
          { id: 'freight', label: 'Freight and handling', source: { line: 'freight' } },
        ],
      },
      {
        id: 'sell',
        title: 'Sell',
        cells: [
          { id: 'volume', label: 'Tonnes sold', source: { role: 'volume' } },
          { id: 'price', label: 'Realised price per tonne', source: { role: 'price' } },
          { id: 'coal_revenue', label: 'Coal revenue', source: { role: 'rev_coal' } },
        ],
      },
      {
        id: 'state',
        title: 'To the state',
        cells: [{ id: 'royalty', label: 'Royalty', source: { role: 'royalty_rate' } }],
      },
      {
        id: 'result',
        title: 'Result',
        cells: [
          { id: 'gross_profit', label: 'Gross profit', source: { line: 'gross_profit' }, ownLabel: true },
          { id: 'operating_income', label: 'Operating income', source: { role: 'operating_income' } },
          { id: 'owners', label: 'Profit to owners', source: { role: 'owners' } },
        ],
      },
    ],
    branch: [{ id: 'services', label: 'Mining services revenue', source: { role: 'rev_services' } }],
  },
};

/** ok: a value; missing: the row is there, the period's cell is not (in a quarter: not disclosed quarterly); absent: the company has no such line or row. */
export type ChainCellState = 'ok' | 'missing' | 'absent';

export interface ChainCell {
  def: ChainCellDef;
  label: string;
  state: ChainCellState;
  value: number | null;
  /** The same period a year earlier, when there is one with a value. */
  prior: number | null;
  /** The first row behind the cell: its unit and style format the value, its key selects it. */
  rowRef: string | null;
  key: string | null;
  /** The company's own label for the row, for the accessible name. */
  rowLabel: string | null;
}

export interface ValueChain {
  period: Period | undefined;
  priorPeriod: Period | undefined;
  /** True in a quarter: a missing cell reads "not disclosed quarterly". */
  quarterly: boolean;
  stages: { def: ChainStageDef; cells: ChainCell[] }[];
  branch: ChainCell[];
}

const num = (v: Value | undefined): number | null => (isNum(v) ? v : null);

function refsOf(pkg: ModelPackage, source: ChainSource): string[] {
  return 'line' in source ? linesOf(pkg, source.line).map((l) => l.rowRef) : rowRefsOf(pkg, source.role);
}

/** The cells' rows summed in a period, or null when any is not disclosed. */
function sumAt(wb: Workbook, values: Map<string, Value>, refs: string[], periodId: string): number | null {
  let sum = 0;
  for (const ref of refs) {
    const key = wb.keyOf(ref, periodId);
    const cell = key ? wb.cell(key) : undefined;
    const v = key ? num(values.get(key)) : null;
    if (!cell || cell.kind === 'missing' || v === null) return null;
    sum += v;
  }
  return sum;
}

export const hasValueChain = (pkg: ModelPackage): boolean => !!VALUE_CHAINS[pkg.meta.subIndustry];

export function valueChain(wb: Workbook, values: Map<string, Value>, periodId: string): ValueChain | null {
  const pkg = wb.pkg;
  const def = VALUE_CHAINS[pkg.meta.subIndustry];
  if (!def) return null;
  const period = periodById(pkg, periodId);
  const prior = yearAgo(pkg, periodId);
  const cellOf = (c: ChainCellDef): ChainCell => {
    const refs = refsOf(pkg, c.source).filter((r) => wb.row(r));
    const first = refs[0] ?? null;
    const row = first ? wb.row(first) : undefined;
    const lineLabel = 'line' in c.source ? linesOf(pkg, c.source.line)[0]?.label : undefined;
    const label = c.ownLabel && lineLabel ? lineLabel : c.label;
    if (!refs.length) return { def: c, label, state: 'absent', value: null, prior: null, rowRef: null, key: null, rowLabel: null };
    const value = sumAt(wb, values, refs, periodId);
    return {
      def: c,
      label,
      state: value === null ? 'missing' : 'ok',
      value,
      prior: prior ? sumAt(wb, values, refs, prior.id) : null,
      rowRef: first,
      key: first ? wb.keyOf(first, periodId) ?? null : null,
      rowLabel: lineLabel ?? row?.label ?? null,
    };
  };
  return {
    period,
    priorPeriod: prior,
    quarterly: period?.kind === 'quarter',
    stages: def.stages.map((s) => ({ def: s, cells: s.cells.map(cellOf) })),
    branch: def.branch.map(cellOf),
  };
}
