/**
 * Unit economics (brief §5.4), worked in the viewer from package rows divided
 * by the package's denominator row (constraint 7). The package stores no
 * per-unit figure; every one here is a row value over the volume, in full
 * precision, and only rounded for display. Subtotals are their own rows over
 * the volume, never a sum of rounded bars.
 *
 * No volume, no unit economics (constraint 9): a missing denominator row, or
 * a missing cell in it, makes the period unavailable, and nothing is drawn.
 */
import type { ModelPackage, UELine } from './contract/types';
import { splitRowRef } from './contract/types';
import { isNum, type Value } from './engine/engine';
import { formatNumber } from './format';
import type { Workbook } from './model/workbook';

// A money unit is a currency and an optional magnitude: "Rp million", "US$ thousand".
// Companies that report in US dollars keep their own currency; nothing is converted.
const CURRENCY: Record<string, string> = { Rp: 'Rp', IDR: 'Rp', US$: 'US$', USD: 'US$' };
const MAGNITUDE: Record<string, number> = {
  '': 1,
  thousand: 1e3,
  mn: 1e6,
  million: 1e6,
  bn: 1e9,
  billion: 1e9,
  tn: 1e12,
  trillion: 1e12,
};
// Volumes relative to their family's base unit (tonne, MWh).
const VOLUME: Record<string, number> = {
  t: 1,
  tonne: 1,
  tonnes: 1,
  kt: 1e3,
  'thousand tonne': 1e3,
  'thousand tonnes': 1e3,
  Mt: 1e6,
  'million tonne': 1e6,
  'million tonnes': 1e6,
  MWh: 1,
  GWh: 1e3,
  TWh: 1e6,
};
const SCALE_LABEL: [number, string][] = [
  [1e12, ' trillion'],
  [1e9, ' billion'],
  [1e6, ' million'],
  [1e3, ' thousand'],
  [1, ''],
];

/** A volume unit as a multiple of its family's base unit, or undefined when not recognised. */
export const volumeFactor = (unit: string): number | undefined => VOLUME[unit.trim()];

/** A money unit's currency ("Rp", "US$") and magnitude, or null when not recognised. */
export function parseMoney(unit: string): { currency: string; magnitude: number } | null {
  const match = /^(Rp|IDR|US\$|USD)(?:\s+(thousand|mn|million|bn|billion|tn|trillion))?$/.exec(unit.trim());
  if (!match) return null;
  return { currency: CURRENCY[match[1]], magnitude: MAGNITUDE[match[2] ?? ''] };
}

export interface UnitScale {
  /** Multiply row ÷ volume by this to land in `label` per unit. */
  multiplier: number;
  /** "Rp thousand" */
  label: string;
  /** False when the units were not recognised; the label then names both. */
  known: boolean;
}

/**
 * The money scale of a per-unit figure: Rp bn ÷ Mt is Rp thousand per tonne.
 * Unknown units keep their own names and a multiplier of one.
 */
export function unitScale(moneyUnit: string, volumeUnit: string): UnitScale {
  const m = parseMoney(moneyUnit);
  const v = VOLUME[volumeUnit.trim()];
  if (!m || !v) return { multiplier: 1, label: `${moneyUnit} per ${volumeUnit}`, known: false };
  const ratio = m.magnitude / v;
  // Dollar figures per unit are small (tens of dollars a tonne), so they are always stated in whole dollars.
  const scales = m.currency === 'Rp' ? SCALE_LABEL : SCALE_LABEL.slice(-1);
  const [base, suffix] = scales.find(([b]) => ratio >= b) ?? scales[scales.length - 1];
  return { multiplier: ratio / base, label: `${m.currency}${suffix}`, known: true };
}

export const plural = (unit: string): string => (unit.endsWith('s') ? unit : `${unit}s`);

export interface UEBar {
  line: UELine;
  key: string;
  /** The row's value in the period, in its own unit. */
  total: number | null;
  /** Worked per unit, full precision. */
  perUnit: number | null;
  /** Where the bar starts and ends on the per-unit scale. */
  from: number | null;
  to: number | null;
}

export type UEUnavailable = 'no-denominator-row' | 'volume-missing';

export interface UEView {
  periodId: string;
  available: boolean;
  reason?: UEUnavailable;
  scale: UnitScale;
  denominator: { rowRef: string; key: string | null; value: number | null; label: string; unit: string };
  bars: UEBar[];
}

const num = (v: Value | undefined): number | null => (isNum(v) ? v : null);

/** Whether a package can show unit economics in a period. */
export function denominatorState(wb: Workbook, values: Map<string, Value>, periodId: string): { ok: boolean; reason?: UEUnavailable; value: number | null; key: string | null } {
  const ref = wb.pkg.unitEconomics.denominatorRowRef;
  const row = wb.row(ref);
  if (!row) return { ok: false, reason: 'no-denominator-row', value: null, key: null };
  const key = wb.keyOf(ref, periodId) ?? null;
  const cell = key ? wb.cell(key) : undefined;
  const value = key ? num(values.get(key)) : null;
  if (!cell || cell.kind === 'missing' || value === null || value === 0) return { ok: false, reason: 'volume-missing', value: null, key };
  return { ok: true, value, key };
}

/** True when no period of the package has a volume: the section then shows only the not-available line. */
export function noVolumeAnywhere(wb: Workbook, values: Map<string, Value>): boolean {
  return wb.pkg.unitEconomics.periods.every((p) => !denominatorState(wb, values, p).ok);
}

export function unitEconomicsAt(wb: Workbook, values: Map<string, Value>, periodId: string): UEView {
  const ue = wb.pkg.unitEconomics;
  const denomRow = wb.row(ue.denominatorRowRef);
  const state = denominatorState(wb, values, periodId);
  const revenueRow = wb.row(ue.lines.find((l) => l.role === 'revenue')?.rowRef ?? '');
  const scale = unitScale(revenueRow?.unit ?? '', denomRow?.unit ?? '');
  const denominator = {
    rowRef: ue.denominatorRowRef,
    key: state.key,
    value: state.value,
    label: denomRow?.label ?? ue.denominatorRowRef,
    unit: denomRow?.unit ?? '',
  };
  if (!state.ok || state.value === null) return { periodId, available: false, reason: state.reason, scale, denominator, bars: [] };

  const vol = state.value;
  let running: number | null = null;
  const bars: UEBar[] = ue.lines.map((line) => {
    const key = wb.keyOf(line.rowRef, periodId) ?? '';
    const total = num(values.get(key));
    const perUnit = total === null ? null : (total / vol) * scale.multiplier;
    let from: number | null = null;
    let to: number | null = null;
    if (perUnit !== null) {
      if (line.role === 'revenue' || line.role === 'subtotal') {
        from = 0;
        to = perUnit;
        running = perUnit;
      } else if (running !== null) {
        from = running;
        to = running - perUnit;
        running = to;
      }
    }
    return { line, key, total, perUnit, from, to };
  });
  return { periodId, available: true, scale, denominator, bars };
}

/** The bars' extent, for the chart's scale: zero always included. */
export function extent(bars: UEBar[]): { lo: number; hi: number } {
  const ends = bars.flatMap((b) => [b.from, b.to]).filter((x): x is number => x !== null);
  return { lo: Math.min(0, ...ends), hi: Math.max(0, ...ends) };
}

/**
 * A line's per-unit value in another package, read from its stored rows, or
 * null. `convert` turns the package's own currency into the comparison's
 * (canonical.ts `comparable`); without it the value is in the package's own.
 */
export function perUnitInPackage(
  pkg: ModelPackage,
  lineId: string,
  periodId: string,
  convert: (value: number | null, periodId: string) => number | null = (v) => v,
): number | null {
  const ue = pkg.unitEconomics;
  const line = ue.lines.find((l) => l.id === lineId);
  const pi = pkg.periods.findIndex((p) => p.id === periodId);
  if (!line || pi < 0) return null;
  const read = (rowRef: string) => {
    const r = splitRowRef(rowRef);
    const row = r ? pkg.sheets.find((s) => s.id === r.sheet)?.rows.find((x) => x.id === r.rowId) : undefined;
    const cell = row?.cells[pi];
    return { row, value: cell && cell.kind !== 'missing' ? cell.value : null };
  };
  const vol = read(ue.denominatorRowRef);
  const v = read(line.rowRef);
  if (vol.value === null || vol.value === 0 || v.value === null || !v.row || !vol.row) return null;
  return convert((v.value / vol.value) * unitScale(v.row.unit, vol.row.unit).multiplier, periodId);
}

/** Per-unit figures are shown to one decimal; they are worked in full precision. */
export const PER_UNIT_DECIMALS = 1;

/** Costs are reductions, so they read in brackets on the bar. */
export function barValue(bar: UEBar): string {
  if (bar.perUnit === null) return '—';
  const reduces = bar.line.role === 'cost' || bar.line.role === 'unsplit';
  return formatNumber(reduces ? -bar.perUnit : bar.perUnit, PER_UNIT_DECIMALS);
}

/**
 * How much a money cell moved per unit after an edit: its value over the
 * period's volume after, less the same before. Null for a row that is not
 * money, or a period without a volume.
 */
export function perUnitDelta(wb: Workbook, base: Map<string, Value>, now: Map<string, Value>, key: string): number | null {
  const a = wb.address(key);
  const rowRef = wb.rowRefOf(key);
  const row = rowRef ? wb.row(rowRef) : undefined;
  const denomRow = wb.row(wb.pkg.unitEconomics.denominatorRowRef);
  if (!a || !row || !denomRow) return null;
  const scale = unitScale(row.unit, denomRow.unit);
  if (!scale.known) return null;
  const period = wb.pkg.periods[a.periodIndex].id;
  const before = denominatorState(wb, base, period);
  const after = denominatorState(wb, now, period);
  const v0 = num(base.get(key));
  const v1 = num(now.get(key));
  if (!before.ok || !after.ok || v0 === null || v1 === null || !before.value || !after.value) return null;
  return (v1 / after.value - v0 / before.value) * scale.multiplier;
}
