/**
 * What the in-world whiteboard says (PRD §7.7; mega prompt §9.3), computed
 * on the shell's side of the boundary from a published package: the top
 * three cost drivers by share of cost of revenue, the miniature waterfall
 * at the latest reported period, and the peer position by the PRD's rule.
 * Every figure is written here by the house formatter; labels are cut to
 * twelve characters; the engine draws the strings as they are.
 */
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { latestReported } from '@/lib/finance-in-action/model/periods';
import { unitEconomicsAt, extent } from '@/lib/finance-in-action/unitEconomics';
import { formatForRow, formatNumber } from '@/lib/finance-in-action/format';
import { COMPARATOR_HEADING, worldPeerBand } from '@/lib/world/peerBand';
import type { WhiteboardContent } from '@/world/data/types';

export const LABEL_CHARS = 12;
/** A label of at most twelve characters: cut with an ellipsis when longer. */
export const shortLabel = (s: string): string => (s.length <= LABEL_CHARS ? s : `${s.slice(0, LABEL_CHARS - 1).trimEnd()}…`);

export function whiteboardFor(pkg: ModelPackage, published: readonly ModelPackage[]): WhiteboardContent {
  const wb = new Workbook(pkg), values = wb.values();
  const periodId = latestReported(pkg, pkg.unitEconomics.periods) ?? pkg.meta.asOf.fullStatementsTo;
  const periodLabel = pkg.periods.find((p) => p.id === periodId)?.label ?? periodId;
  const ue = unitEconomicsAt(wb, values, periodId);
  const lines = pkg.unitEconomics.lines;
  const totalOf = (rowRef: string) => { const k = wb.keyOf(rowRef, periodId); const v = k ? values.get(k) : undefined; return typeof v === 'number' ? v : null; };
  const rowOf = (rowRef: string) => wb.row(rowRef);
  // cost of revenue: every cost line and the unsplit remainder; shares against it
  const costLines = lines.filter((l) => l.role === 'cost' || l.role === 'unsplit').map((l) => ({ l, total: totalOf(l.rowRef) }));
  const cor = costLines.reduce((s, x) => s + Math.abs(x.total ?? 0), 0);
  const drivers = costLines.filter((x) => x.l.role === 'cost' && x.total !== null).sort((a, b) => Math.abs(b.total!) - Math.abs(a.total!)).slice(0, 3)
    .map((x) => { const row = rowOf(x.l.rowRef); const share = cor > 0 ? Math.abs(x.total!) / cor : 0; return { label: shortLabel(x.l.label), figure: `${formatNumber(share * 100, 0)}% · ${row ? formatForRow(x.total, row) : formatNumber(x.total)}` }; });
  // the waterfall: the unit-economics bars on their scale when a volume exists, else the lines' totals on the revenue scale
  let waterfall: WhiteboardContent['waterfall'];
  if (ue.available && ue.bars.length) {
    const { lo, hi } = extent(ue.bars), span = hi - lo || 1;
    waterfall = ue.bars.filter((b) => b.from !== null && b.to !== null).map((b) => ({ label: shortLabel(b.line.label), figure: formatNumber(b.perUnit, 0), from: (b.from! - lo) / span, to: (b.to! - lo) / span, role: b.line.role === 'revenue' ? 'revenue' : b.line.role === 'subtotal' ? 'subtotal' : b.line.role === 'unsplit' ? 'unsplit' : 'cost' }));
  } else {
    const revenue = lines.find((l) => l.role === 'revenue'); const rt = revenue ? totalOf(revenue.rowRef) : null;
    const scale = rt && rt !== 0 ? Math.abs(rt) : 1; let running = 1;
    waterfall = lines.filter((l) => l.role !== 'subtotal').flatMap((l): WhiteboardContent['waterfall'] => { const t = totalOf(l.rowRef); if (t === null) return []; const row = rowOf(l.rowRef); const f = Math.abs(t) / scale;
      if (l.role === 'revenue') { running = 1; return [{ label: shortLabel(l.label), figure: row ? formatForRow(t, row) : formatNumber(t), from: 0, to: 1, role: 'revenue' as const }]; }
      const from = running, to = Math.max(0, running - f); running = to;
      return [{ label: shortLabel(l.label), figure: row ? formatForRow(t, row) : formatNumber(t), from, to, role: l.role === 'unsplit' ? 'unsplit' as const : 'cost' as const }]; });
  }
  // the peer position: the first metric with a peer
  const peers = worldPeerBand(pkg, published);
  const first = peers.find((r) => r.kind !== 'none');
  let peer: WhiteboardContent['peer'] = null;
  if (first && first.kind === 'comparator') {
    const lo = Math.min(first.self.value, first.other.value), hi = Math.max(first.self.value, first.other.value), span = hi - lo || 1;
    peer = { heading: `${COMPARATOR_HEADING} · ${shortLabel(first.metric)}`, metric: first.metric, self: (first.self.value - lo) / span * 0.8 + 0.1, other: (first.other.value - lo) / span * 0.8 + 0.1 };
  } else if (first && first.kind === 'band') {
    const span = first.max - first.min || 1, at = (v: number) => (v - first.min) / span * 0.8 + 0.1;
    peer = { heading: `peer band · ${shortLabel(first.metric)}`, metric: first.metric, self: at(first.self.value), min: at(first.min), max: at(first.max), median: at(first.median) };
  }
  return { ticker: pkg.meta.ticker, period: periodLabel, drivers, waterfall, peer };
}
