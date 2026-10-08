/**
 * The peer band as the PRD defines it (§8.3), separate from the model page's
 * rule in src/lib/finance-in-action/peers.ts (which draws a band from two):
 * per sub-industry, over companies with a published model for the SAME
 * period. One comparator: two marks on one scale, headed "vs one
 * comparator". Three or more companies: a band from min to max with the
 * company's mark and the median marked. Never a band from two points.
 */
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { splitRowRef } from '@/lib/finance-in-action/contract/types';

export interface PeerPoint { ticker: string; value: number; self: boolean }
export type PeerResult =
  | { kind: 'none'; metric: string; unit: string; period: string; reason: 'no-peer' | 'no-value' }
  | { kind: 'comparator'; metric: string; unit: string; period: string; self: PeerPoint; other: PeerPoint }
  | { kind: 'band'; metric: string; unit: string; period: string; min: number; max: number; median: number; self: PeerPoint; points: PeerPoint[] };

export const COMPARATOR_HEADING = 'vs one comparator';

function readValue(pkg: ModelPackage, metric: string, period: string): number | null {
  const entry = pkg.peerBand.find((e) => e.metric === metric && e.period === period);
  if (!entry) return null;
  if (!entry.rowRef) return entry.value;
  const ref = splitRowRef(entry.rowRef);
  const pi = pkg.periods.findIndex((p) => p.id === period);
  const row = ref ? pkg.sheets.find((s) => s.id === ref.sheet)?.rows.find((r) => r.id === ref.rowId) : undefined;
  return row && pi >= 0 ? row.cells[pi].value : null;
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** The band per metric of the package, from the published packages of the same sub-industry and period. */
export function worldPeerBand(pkg: ModelPackage, published: readonly ModelPackage[]): PeerResult[] {
  const peers = published.filter((p) => p.meta.subIndustry === pkg.meta.subIndustry && p.meta.status === 'published' && p.meta.ticker !== pkg.meta.ticker);
  return pkg.peerBand.map((entry) => {
    const { metric, unit, period } = entry;
    const own = readValue(pkg, metric, period);
    if (own === null) return { kind: 'none', metric, unit, period, reason: 'no-value' };
    const self: PeerPoint = { ticker: pkg.meta.ticker, value: own, self: true };
    const others: PeerPoint[] = peers.flatMap((p) => { const v = readValue(p, metric, period); return v === null ? [] : [{ ticker: p.meta.ticker, value: v, self: false }]; });
    if (others.length === 0) return { kind: 'none', metric, unit, period, reason: 'no-peer' };
    if (others.length === 1) return { kind: 'comparator', metric, unit, period, self, other: others[0] };
    const points = [self, ...others], values = points.map((p) => p.value);
    return { kind: 'band', metric, unit, period, min: Math.min(...values), max: Math.max(...values), median: median(values), self, points };
  });
}
