/**
 * "Where a unit of [product] goes" (chain view, PROMPT-site §3.5): the flows
 * and nodes of the cost sankey, worked from the same UEView as the waterfall
 * (constraint 7), so every flow is the waterfall's per-unit value for the same
 * period, not a second calculation.
 *
 * Revenue per unit splits into each cost and unsplit line and the last profit
 * subtotal, in `lines` order. A negative profit is not a negative width: it is
 * a separate loss, stacked under revenue, that the costs also draw on. A line
 * that a register link names in `downstreamLines` for this company gets the
 * upstream sub-industry as a node joined to it (PRD D-C1); an entry that does
 * not resolve is ignored (downstreamLine).
 */
import type { IndustryLink } from './contract/links';
import type { ModelPackage, UELine } from './contract/types';
import { downstreamLine, linksTo } from './links';
import type { CompanyEntry, Registry } from './registry';
import type { UEView } from './unitEconomics';
import { SANKEY } from './layout';

export type FlowKind = 'cost' | 'unsplit' | 'profit';

export interface SankeyUpstream {
  link: IndustryLink;
  code: string;
  name: string;
  /** Published companies of the upstream sub-industry. */
  published: CompanyEntry[];
  /** The line of this company the input sits on. */
  lineId: string;
}

export interface SankeyFlow {
  line: UELine;
  key: string;
  kind: FlowKind;
  /** Per unit, the waterfall's own value; zero or more. */
  value: number;
  upstream: SankeyUpstream[];
}

export interface SankeyModel {
  available: boolean;
  /** Revenue per unit. */
  revenue: number;
  revenueLine: UELine | null;
  /** The loss per unit when the profit subtotal is negative, else 0. */
  loss: number;
  lossLine: UELine | null;
  flows: SankeyFlow[];
  upstream: SankeyUpstream[];
}

const EMPTY: SankeyModel = { available: false, revenue: 0, revenueLine: null, loss: 0, lossLine: null, flows: [], upstream: [] };

/** The register's upstream inputs for this company, each joined to the line it sits on. */
export function upstreamInputs(reg: Registry, pkg: ModelPackage): SankeyUpstream[] {
  const out: SankeyUpstream[] = [];
  for (const link of linksTo(reg, pkg.meta.subIndustry)) {
    const line = downstreamLine(reg, link, pkg.meta.ticker);
    if (!line) continue;
    out.push({
      link,
      code: link.from,
      name: reg.subIndustry(link.from)?.name ?? link.from,
      published: reg.companies.filter((c) => c.subIndustry === link.from && c.status === 'published'),
      lineId: line.id,
    });
  }
  return out;
}

export function sankeyModel(reg: Registry, pkg: ModelPackage, ue: UEView): SankeyModel {
  if (!ue.available) return EMPTY;
  const revenueBar = ue.bars.find((b) => b.line.role === 'revenue');
  if (!revenueBar || revenueBar.perUnit === null) return EMPTY;
  const upstream = upstreamInputs(reg, pkg);
  const subtotals = ue.bars.filter((b) => b.line.role === 'subtotal');
  const profit = subtotals[subtotals.length - 1];
  const flows: SankeyFlow[] = [];
  for (const bar of ue.bars) {
    if ((bar.line.role !== 'cost' && bar.line.role !== 'unsplit') || bar.perUnit === null) continue;
    flows.push({
      line: bar.line,
      key: bar.key,
      kind: bar.line.role,
      value: bar.perUnit,
      upstream: upstream.filter((u) => u.lineId === bar.line.id),
    });
  }
  let loss = 0;
  if (profit && profit.perUnit !== null) {
    if (profit.perUnit >= 0) flows.push({ line: profit.line, key: profit.key, kind: 'profit', value: profit.perUnit, upstream: [] });
    else loss = -profit.perUnit;
  }
  return { available: true, revenue: revenueBar.perUnit, revenueLine: revenueBar.line, loss, lossLine: loss ? profit?.line ?? null : null, flows, upstream };
}

/** A flow's share of revenue per unit, as a fraction. */
export const shareOfRevenue = (m: SankeyModel, value: number): number | null => (m.revenue ? value / m.revenue : null);

export interface PlacedFlow {
  flow: SankeyFlow;
  /** Where the ribbon leaves the revenue-and-loss stack. */
  y0: number;
  /** Its thickness, at both ends. */
  h: number;
  /** The line's slot in the middle column, and the ribbon's top within it. */
  slotTop: number;
  slotHeight: number;
  y1: number;
}

export interface PlacedUpstream {
  up: SankeyUpstream;
  top: number;
  height: number;
  /** The line node it joins: the ribbon's top and thickness there. */
  toY: number;
  toH: number;
}

export interface SankeyLayout {
  height: number;
  revenue: { top: number; height: number };
  loss: { top: number; height: number } | null;
  flows: PlacedFlow[];
  upstream: PlacedUpstream[];
}

/** Every node and ribbon placed on the viewBox: widths proportional to the per-unit values. */
export function layoutSankey(m: SankeyModel): SankeyLayout {
  const base = m.revenue + m.loss || 1;
  const k = SANKEY.stack / base;
  let stackY = SANKEY.top;
  let slotY = SANKEY.top;
  const flows: PlacedFlow[] = m.flows.map((flow) => {
    const h = flow.value * k;
    // Room for the line's own label (wrapped, plus its value) and for any upstream label beside it.
    const lines = Math.max(
      wrapLabel(flow.line.label).length + 1,
      ...flow.upstream.map((u) => wrapLabel(u.name).length + 1),
    );
    const slotHeight = Math.max(h, SANKEY.minSlot, lines * SANKEY.lineHeight + SANKEY.slotPad);
    const placed = { flow, y0: stackY, h, slotTop: slotY, slotHeight, y1: slotY + (slotHeight - h) / 2 };
    stackY += h;
    slotY += slotHeight + SANKEY.gap;
    return placed;
  });
  const revenue = { top: SANKEY.top, height: m.revenue * k };
  const loss = m.loss ? { top: SANKEY.top + revenue.height, height: m.loss * k } : null;
  const upstream: PlacedUpstream[] = [];
  for (const f of flows) {
    for (const up of f.flow.upstream) {
      upstream.push({ up, top: f.slotTop, height: f.slotHeight, toY: f.y1, toH: f.h });
    }
  }
  const height = Math.max(slotY - SANKEY.gap, SANKEY.top + SANKEY.stack) + SANKEY.bottom;
  return { height, revenue, loss, flows, upstream };
}

/** A ribbon between two vertical edges: from (x0, y0..y0+h0) to (x1, y1..y1+h1). */
export function ribbon(x0: number, y0: number, h0: number, x1: number, y1: number, h1: number): string {
  const mid = (x0 + x1) / 2;
  return [
    `M ${x0} ${y0}`,
    `C ${mid} ${y0}, ${mid} ${y1}, ${x1} ${y1}`,
    `L ${x1} ${y1 + h1}`,
    `C ${mid} ${y1 + h1}, ${mid} ${y0 + h0}, ${x0} ${y0 + h0}`,
    'Z',
  ].join(' ');
}

/** A label cut into lines of at most `width` characters, on word boundaries. */
export function wrapLabel(text: string, width: number = SANKEY.wrapAt): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
