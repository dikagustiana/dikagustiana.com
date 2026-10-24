/**
 * The peer band (brief §5.3, constraint 11): drawn only from two or more
 * published companies in the sub-industry, never from invented positions.
 * Each company's value is read from its own row, as published.
 */
import type { ModelPackage } from './contract/types';
import { splitRowRef } from './contract/types';
import type { Registry } from './registry';
import { toUsd, type FxRate } from './fx';
import { parseMoney } from './unitEconomics';

export const MIN_PUBLISHED_FOR_BAND = 2;

export interface PeerPoint {
  ticker: string;
  value: number;
  self: boolean;
  pair: boolean;
}

export interface PeerMetric {
  metric: string;
  unit: string;
  period: string;
  periodLabel: string;
  min: number;
  max: number;
  points: PeerPoint[];
}

/** A money unit per something ("Rp per tonne"): its currency, or null for a physical ratio. */
const currencyOfUnit = (unit: string): string | null => parseMoney(unit.split(/\s+per\s+/)[0] ?? '')?.currency ?? null;

/** The unit a metric is compared in: a rupiah figure is drawn in US dollars (fx.ts). */
export const comparedUnit = (unit: string): string => (currencyOfUnit(unit) === 'Rp' ? unit.replace(/^(Rp|IDR)\b/, 'US$') : unit);

function readValue(pkg: ModelPackage, metric: string, rates: FxRate[]): number | null {
  const entry = pkg.peerBand.find((e) => e.metric === metric);
  if (!entry) return null;
  let value: number | null;
  if (!entry.rowRef) value = entry.value;
  else {
    const ref = splitRowRef(entry.rowRef);
    const pi = pkg.periods.findIndex((p) => p.id === entry.period);
    const row = ref ? pkg.sheets.find((s) => s.id === ref.sheet)?.rows.find((r) => r.id === ref.rowId) : undefined;
    value = row && pi >= 0 ? row.cells[pi].value : null;
  }
  // The same conversion as the unit-economics comparison: rupiah to US dollars, or nothing.
  const currency = currencyOfUnit(entry.unit);
  return currency && currency !== 'US$' ? toUsd(value, currency, entry.period, rates) : value;
}

export const publishedPeers = (reg: Registry, pkg: ModelPackage): ModelPackage[] =>
  reg.packages.filter((p) => p.meta.subIndustry === pkg.meta.subIndustry && p.meta.status === 'published');

/** The band per metric, or null when fewer than two published companies stand behind it. */
export function peerBand(reg: Registry, pkg: ModelPackage, rates: FxRate[] = []): PeerMetric[] | null {
  const peers = publishedPeers(reg, pkg);
  if (peers.length < MIN_PUBLISHED_FOR_BAND) return null;
  const metrics = pkg.peerBand.map((entry) => {
    const points: PeerPoint[] = [];
    for (const p of peers) {
      const v = readValue(p, entry.metric, rates);
      if (v === null) continue;
      points.push({ ticker: p.meta.ticker, value: v, self: p.meta.ticker === pkg.meta.ticker, pair: pkg.meta.pair.includes(p.meta.ticker) });
    }
    // A company that is not itself published still gets its marker, outside the band.
    if (!points.some((x) => x.self)) {
      const own = readValue(pkg, entry.metric, rates);
      if (own !== null) points.push({ ticker: pkg.meta.ticker, value: own, self: true, pair: false });
    }
    const banded = points.filter((x) => peers.some((p) => p.meta.ticker === x.ticker)).map((x) => x.value);
    if (banded.length < MIN_PUBLISHED_FOR_BAND) return null;
    return {
      metric: entry.metric,
      unit: comparedUnit(entry.unit),
      period: entry.period,
      periodLabel: pkg.periods.find((p) => p.id === entry.period)?.label ?? entry.period,
      min: Math.min(...banded),
      max: Math.max(...banded),
      points,
    };
  });
  const drawn = metrics.filter((m): m is PeerMetric => m !== null);
  return drawn.length ? drawn : null;
}
