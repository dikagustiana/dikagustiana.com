/**
 * The key-figure cards at the top of a model page (chain view, PRD D-M1,
 * PROMPT-site §3.2). Operating figures only, never market data (constraint 5):
 * volume sold, revenue per unit, cost of revenue per unit, the last profit
 * subtotal per unit, and profit to owners.
 *
 * Every figure is worked here from package rows (constraint 7): which rows
 * play which role is read from `unitEconomics` (the denominator row, the
 * revenue line, the cost and unsplit lines, the subtotal lines) and from the
 * driver tree's root, and per-unit figures are the row over the denominator
 * row through unitEconomicsAt, the same arithmetic as the waterfall. A role
 * that cannot be found says so; nothing stands in for it.
 */
import type { ModelPackage } from './contract/types';
import { splitRowRef } from './contract/types';
import { isNum, type Value } from './engine/engine';
import { latestReported, periodById, quarterPeriods, yearAgo } from './model/periods';
import type { Workbook } from './model/workbook';
import { denominatorState, noVolumeAnywhere, PER_UNIT_DECIMALS, plural, unitEconomicsAt, type UEView } from './unitEconomics';
import { decimalsFor } from './format';

export const KEY_FIGURE_ROLES = [
  { id: 'volume', title: 'Volume sold' },
  { id: 'revenue', title: 'Revenue per unit' },
  { id: 'cost', title: 'Cost of revenue per unit' },
  { id: 'profit', title: 'Profit per unit' },
  { id: 'owners', title: 'Profit to owners' },
] as const;

export type KeyFigureRole = (typeof KEY_FIGURE_ROLES)[number]['id'];

/** ok: a figure; not-in-model: the role has no row; no-volume: per unit, but no volume (constraint 9); missing: the row is there, the period's cell is not disclosed. */
export type KeyFigureState = 'ok' | 'not-in-model' | 'no-volume' | 'missing';

export const KEY_FIGURE_WORDS: Record<Exclude<KeyFigureState, 'ok'>, string> = {
  'not-in-model': 'Not in this model',
  'no-volume': 'Not available: volumes not disclosed',
  missing: 'Not disclosed for this period',
};

export interface KeyFigure {
  role: KeyFigureRole;
  title: string;
  state: KeyFigureState;
  value: number | null;
  decimals: number;
  /** The unit the value is stated in, for example "Mt" or "Rp thousand per tonne". */
  unit: string;
  periodLabel: string;
  /** Change on the same period a year earlier, as a fraction; null when there is none to compare with. */
  yearOnYear: number | null;
  yearAgoLabel: string | null;
}

export interface KeyFigureSet {
  periodId: string;
  periodLabel: string;
  figures: KeyFigure[];
}

const num = (v: Value | undefined): number | null => (isNum(v) ? v : null);

/**
 * The period the cards read: the latest reported quarter with note-level
 * detail, so the same quarter a year earlier exists to compare with; else the
 * latest reported period with detail; else, without unit economics, the
 * latest quarter with full statements.
 */
export function keyFigurePeriod(wb: Workbook, values: Map<string, Value>): string {
  const pkg = wb.pkg;
  const ids = pkg.unitEconomics.periods;
  if (!ids.length || noVolumeAnywhere(wb, values)) return pkg.meta.asOf.fullStatementsTo;
  const quarters = new Set(quarterPeriods(pkg).map((p) => p.id));
  const reportedQuarters = ids.filter((id) => quarters.has(id) && periodById(pkg, id)?.forecast === false);
  return reportedQuarters[reportedQuarters.length - 1] ?? latestReported(pkg, ids) ?? pkg.meta.asOf.fullStatementsTo;
}

/** A change as a fraction; none against a base at or below zero, where a percentage misleads. */
const change = (now: number | null, before: number | null): number | null =>
  now === null || before === null || before <= 0 ? null : now / before - 1;

/** The driver tree's root: the node no edge leaves. The last such node when there are several. */
export function driverTreeRoot(pkg: ModelPackage): ModelPackage['driverTree']['nodes'][number] | null {
  const leaving = new Set(pkg.driverTree.edges.map((e) => e.from));
  const roots = pkg.driverTree.nodes.filter((n) => !leaving.has(n.id));
  return roots[roots.length - 1] ?? null;
}

export function keyFigures(wb: Workbook, values: Map<string, Value>): KeyFigureSet {
  const pkg = wb.pkg;
  const ueDef = pkg.unitEconomics;
  const periodId = keyFigurePeriod(wb, values);
  const periodLabel = periodById(pkg, periodId)?.label ?? periodId;
  const ago = yearAgo(pkg, periodId);
  const agoLabel = ago?.label ?? null;
  const ue = unitEconomicsAt(wb, values, periodId);
  // A year-earlier per-unit figure is read only where that period has note-level detail.
  const ueAgo: UEView | null = ago && ueDef.periods.includes(ago.id) ? unitEconomicsAt(wb, values, ago.id) : null;
  const perUnit = `${ue.scale.label} per ${ueDef.unit}`;
  const base = { periodLabel, yearOnYear: null, yearAgoLabel: null } as const;

  // 1. Volume: the denominator row.
  const denomRow = wb.row(ueDef.denominatorRowRef);
  const vol = denominatorState(wb, values, periodId);
  const volAgo = ago ? denominatorState(wb, values, ago.id) : null;
  const volume: KeyFigure = !denomRow
    ? { ...base, role: 'volume', title: KEY_FIGURE_ROLES[0].title, state: 'not-in-model', value: null, decimals: 0, unit: '' }
    : {
        ...base,
        role: 'volume',
        title: `${plural(ueDef.unit).replace(/^./, (c) => c.toUpperCase())} sold`,
        state: vol.ok ? 'ok' : 'no-volume',
        value: vol.value,
        decimals: vol.value === null ? 0 : decimalsFor(vol.value),
        unit: denomRow.unit,
        yearOnYear: vol.ok && volAgo?.ok ? change(vol.value, volAgo.value) : null,
        yearAgoLabel: vol.ok && volAgo?.ok ? agoLabel : null,
      };

  // 2–4. Per unit, from the waterfall's own bars.
  const perUnitFigure = (role: KeyFigureRole, title: string, pick: (v: UEView) => { found: boolean; value: number | null }): KeyFigure => {
    const now = pick(ue);
    if (!now.found) return { ...base, role, title, state: 'not-in-model', value: null, decimals: PER_UNIT_DECIMALS, unit: perUnit };
    if (!ue.available) return { ...base, role, title, state: 'no-volume', value: null, decimals: PER_UNIT_DECIMALS, unit: perUnit };
    const before = ueAgo?.available ? pick(ueAgo).value : null;
    const yoy = change(now.value, before);
    return {
      role,
      title,
      state: now.value === null ? 'missing' : 'ok',
      value: now.value,
      decimals: PER_UNIT_DECIMALS,
      unit: perUnit,
      periodLabel,
      yearOnYear: yoy,
      yearAgoLabel: yoy === null ? null : agoLabel,
    };
  };

  const revenueLine = ueDef.lines.find((l) => l.role === 'revenue');
  const firstSubtotal = ueDef.lines.findIndex((l) => l.role === 'subtotal');
  // Cost of revenue: the cost and unsplit lines above the first subtotal (all of them when there is no subtotal).
  const costIds = ueDef.lines
    .slice(0, firstSubtotal < 0 ? undefined : firstSubtotal)
    .filter((l) => l.role === 'cost' || l.role === 'unsplit')
    .map((l) => l.id);
  const subtotals = ueDef.lines.filter((l) => l.role === 'subtotal');
  const profitLine = subtotals[subtotals.length - 1];

  const revenue = perUnitFigure('revenue', `Revenue per ${ueDef.unit}`, (v) => {
    const bar = v.bars.find((b) => b.line.id === revenueLine?.id);
    return { found: !!revenueLine, value: bar?.perUnit ?? null };
  });
  const cost = perUnitFigure('cost', `Cost of revenue per ${ueDef.unit}`, (v) => {
    const bars = v.bars.filter((b) => costIds.includes(b.line.id));
    const value = bars.length && bars.every((b) => b.perUnit !== null) ? bars.reduce((s, b) => s + (b.perUnit ?? 0), 0) : null;
    return { found: costIds.length > 0, value };
  });
  const profit = perUnitFigure('profit', profitLine ? `${profitLine.label} per ${ueDef.unit}` : KEY_FIGURE_ROLES[3].title, (v) => {
    const bar = v.bars.find((b) => b.line.id === profitLine?.id);
    return { found: !!profitLine, value: bar?.perUnit ?? null };
  });

  // 5. Profit to owners: the driver tree's root, when it is a row of the model sheet.
  const root = driverTreeRoot(pkg);
  const rootRef = root ? splitRowRef(root.rowRef) : null;
  const rootRow = root && rootRef?.sheet === 'model' ? wb.row(root.rowRef) : undefined;
  let owners: KeyFigure;
  if (!root || !rootRow) {
    owners = { ...base, role: 'owners', title: KEY_FIGURE_ROLES[4].title, state: 'not-in-model', value: null, decimals: 0, unit: '' };
  } else {
    const key = wb.keyOf(root.rowRef, periodId);
    const value = key ? num(values.get(key)) : null;
    const keyAgo = ago ? wb.keyOf(root.rowRef, ago.id) : undefined;
    const yoy = change(value, keyAgo ? num(values.get(keyAgo)) : null);
    owners = {
      role: 'owners',
      title: rootRow.label,
      state: value === null ? 'missing' : 'ok',
      value,
      decimals: value === null ? 0 : decimalsFor(value),
      unit: rootRow.unit,
      periodLabel,
      yearOnYear: yoy,
      yearAgoLabel: yoy === null ? null : agoLabel,
    };
  }

  return { periodId, periodLabel, figures: [volume, revenue, cost, profit, owners] };
}
