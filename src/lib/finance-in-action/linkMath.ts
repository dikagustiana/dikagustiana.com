/**
 * The link card's arithmetic (brief §3 and §5.2), worked in the viewer from
 * the two sides' unit economics and the register's intensity. Nothing here
 * is stored, nothing replaces a disclosed figure, and anything missing comes
 * back as missing, never as a stand-in.
 *
 * All per-unit money is handled in rupiah per base unit (per tonne), so two
 * packages that keep their rows at different scales still meet on one scale.
 * A package that reports in another currency (US$) is not converted: the
 * viewer holds no exchange rate, so its per-unit money here is missing.
 */
import type { ModelPackage } from './contract/types';
import { splitRowRef } from './contract/types';
import { isMeasured, type IndustryLink } from './contract/links';
import { parseMoney, unitScale, volumeFactor } from './unitEconomics';

/** Rupiah per one of `unit`, or undefined for an unrecognised or non-rupiah unit. */
function rupiahFactor(unit: string): number | undefined {
  const m = parseMoney(unit);
  return m && m.currency === 'Rp' ? m.magnitude : undefined;
}

function stored(pkg: ModelPackage, rowRef: string, periodId: string): { value: number | null; unit: string } {
  const r = splitRowRef(rowRef);
  const pi = pkg.periods.findIndex((p) => p.id === periodId);
  const row = r ? pkg.sheets.find((s) => s.id === r.sheet)?.rows.find((x) => x.id === r.rowId) : undefined;
  const cell = row && pi >= 0 ? row.cells[pi] : undefined;
  return { value: cell && cell.kind !== 'missing' ? cell.value : null, unit: row?.unit ?? '' };
}

/** A row over the volume, in rupiah per base unit, from the package as published. */
export function perUnitRp(pkg: ModelPackage, rowRef: string, periodId: string): number | null {
  const v = stored(pkg, rowRef, periodId);
  const vol = stored(pkg, pkg.unitEconomics.denominatorRowRef, periodId);
  const m = rupiahFactor(v.unit);
  const b = volumeFactor(vol.unit);
  if (v.value === null || vol.value === null || vol.value === 0 || !m || !b) return null;
  return (v.value * m) / (vol.value * b);
}

export interface SideEconomics {
  ticker: string;
  /** Revenue, cost of revenue, and the last subtotal (operating profit), per unit, in rupiah. */
  revenue: number | null;
  costOfRevenue: number | null;
  operatingProfit: number | null;
}

/** A package's revenue, cost of revenue and operating profit per unit in a period. */
export function sideEconomics(pkg: ModelPackage, periodId: string): SideEconomics {
  const lines = pkg.unitEconomics.lines;
  const revenue = lines.find((l) => l.role === 'revenue');
  const subtotals = lines.filter((l) => l.role === 'subtotal');
  const gross = subtotals[0];
  const op = subtotals[subtotals.length - 1];
  const rev = revenue ? perUnitRp(pkg, revenue.rowRef, periodId) : null;
  const gp = gross ? perUnitRp(pkg, gross.rowRef, periodId) : null;
  return {
    ticker: pkg.meta.ticker,
    revenue: rev,
    costOfRevenue: rev !== null && gp !== null ? rev - gp : null,
    operatingProfit: op ? perUnitRp(pkg, op.rowRef, periodId) : null,
  };
}

/** The period both sides can be read in: the intensity's own period when both have it, else the latest they share. */
export function commonPeriod(link: IndustryLink, up: ModelPackage | null, down: ModelPackage | null): string | null {
  const ids = (p: ModelPackage | null) => p?.unitEconomics.periods ?? [];
  const shared = ids(up).filter((id) => ids(down).includes(id));
  if (link.intensity && shared.includes(link.intensity.period)) return link.intensity.period;
  const reported = shared.filter((id) => up?.periods.find((p) => p.id === id)?.forecast === false);
  return reported[reported.length - 1] ?? null;
}

/**
 * Cost share worked in the viewer: upstream revenue per unit × intensity ÷
 * downstream cost of revenue per unit. Shown beside the disclosed figure,
 * never instead of it.
 */
export function workedCostShare(link: IndustryLink, up: SideEconomics | null, down: SideEconomics | null): number | null {
  if (!link.intensity || !up?.revenue || !down?.costOfRevenue) return null;
  return (up.revenue * link.intensity.value) / down.costOfRevenue;
}

export interface SplitLine {
  id: 'price' | 'input' | 'upstreamMargin' | 'otherCosts' | 'ownMargin';
  label: string;
  /** Rupiah per downstream unit, or null when not yet available. */
  value: number | null;
  /** True for the line nested inside the input. */
  within?: boolean;
}

/** One unit of the downstream product, split along the chain. */
export function splitAlongChain(
  link: IndustryLink,
  up: SideEconomics | null,
  down: SideEconomics | null,
  names: { upstream: string; downstream: string; unit: string },
): SplitLine[] {
  const k = link.intensity?.value ?? null;
  const input = up?.revenue != null && k !== null ? up.revenue * k : null;
  const upMargin = up?.operatingProfit != null && k !== null ? up.operatingProfit * k : null;
  const price = down?.revenue ?? null;
  const ownMargin = down?.operatingProfit ?? null;
  const other = price !== null && ownMargin !== null && input !== null ? price - ownMargin - input : null;
  return [
    { id: 'price', label: `${names.downstream} price per ${names.unit}`, value: price },
    { id: 'input', label: `${names.upstream} burnt or used: ${names.upstream} price per ${names.unit} × intensity`, value: input },
    { id: 'upstreamMargin', label: `of which the ${names.upstream} producer's margin: its operating profit per ${names.unit} × intensity`, value: upMargin, within: true },
    { id: 'otherCosts', label: `Other ${names.downstream} costs per ${names.unit}`, value: other },
    { id: 'ownMargin', label: `${names.downstream} producer's margin per ${names.unit}`, value: ownMargin },
  ];
}

export type WhatIf = { ok: true; grossMarginChange: number } | { ok: false; missing: string[] };

/**
 * The what-if: a change in the upstream price, as a fraction, worked only
 * from measured weights and a published downstream model. Holding the
 * downstream price, the downstream gross margin moves by
 * −(cost share × price change × cost of revenue ÷ revenue).
 */
export function whatIf(link: IndustryLink, up: SideEconomics | null, down: SideEconomics | null, priceChange: number | null): WhatIf {
  const missing: string[] = [];
  if (!link.costShare) missing.push('the cost share is not measured');
  if (!link.demandShare) missing.push('the demand share is not measured');
  if (!up) missing.push('no upstream company is published');
  if (!down) missing.push('no downstream company is published with volumes');
  else if (down.revenue === null || down.costOfRevenue === null) missing.push("the downstream model's revenue or cost of revenue per unit");
  if (priceChange === null) missing.push('a price change to apply');
  if (missing.length || !isMeasured(link) || !down || down.revenue === null || down.costOfRevenue === null || priceChange === null || !link.costShare) {
    return { ok: false, missing };
  }
  return { ok: true, grossMarginChange: -(link.costShare.value * priceChange * down.costOfRevenue) / down.revenue };
}

/** The display scale of a downstream package's per-unit money. */
export function displayScale(pkg: ModelPackage | null): { divisor: number; label: string } {
  if (!pkg) return { divisor: 1e3, label: 'Rp thousand' };
  const revenue = pkg.unitEconomics.lines.find((l) => l.role === 'revenue');
  const v = revenue ? stored(pkg, revenue.rowRef, pkg.periods[0].id) : { unit: '' };
  const vol = stored(pkg, pkg.unitEconomics.denominatorRowRef, pkg.periods[0].id);
  const scale = unitScale(v.unit, vol.unit);
  const base = (parseMoney(v.unit)?.magnitude ?? 1) / (volumeFactor(vol.unit) ?? 1) / scale.multiplier;
  return { divisor: base, label: scale.label };
}
