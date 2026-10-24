/**
 * "Where a unit of [product] goes", in full (docs/prd/2026-10-fia-fixes item
 * 5): the income statement as a flow, in the reporting currency, for one
 * period. Four columns:
 *
 *   sources (coal revenue, mining services, other)  →  total revenue
 *     →  costs in the order of the value chain, and gross profit
 *     →  operating expenses, finance cost, tax, minorities, profit to owners
 *
 * Rows are read by their canonical identity or role (canonical.ts), never by
 * a package's own ids. Inventory movement is folded into "Other cost of
 * revenue", whose node lists its parts.
 *
 * A flow is never negative. Each step is a balance of what comes in and what
 * goes out: a figure that runs the other way (a cost that is a credit,
 * finance income, a share of joint-venture profit, a loss to owners) moves to
 * the other side of its step as a node of its own, so every ribbon is as wide
 * as a positive value and the two sides of every step add up.
 */
import type { ModelPackage } from './contract/types';
import { linesOf, rowRefsOf, type Canonical, type RowRole } from './canonical';
import { isNum, type Value } from './engine/engine';
import type { Workbook } from './model/workbook';
import { parseMoney } from './unitEconomics';

export type FlowNodeKind = 'source' | 'total' | 'cost' | 'profit' | 'income' | 'outflow' | 'owners' | 'credit' | 'loss';

export interface FlowPart {
  label: string;
  value: number;
}

export interface FlowNode {
  id: string;
  label: string;
  /** Positive: the node's width. */
  value: number;
  column: 0 | 1 | 2 | 3;
  kind: FlowNodeKind;
  /** What the node adds up, for its tooltip. */
  parts: FlowPart[];
}

export interface FlowLink {
  from: string;
  to: string;
  value: number;
}

export interface FlowSankeyModel {
  available: boolean;
  reason?: 'not-mapped' | 'missing';
  /** The money unit of the rows, for example "US$ thousand". */
  unit: string;
  nodes: FlowNode[];
  links: FlowLink[];
  revenue: number;
}

/** The cost nodes, in the order of the value chain. */
const COSTS: { id: string; label: string; line?: Canonical; role?: RowRole }[] = [
  { id: 'mining', label: 'Mining', line: 'mining' },
  { id: 'processing', label: 'Processing', line: 'processing' },
  { id: 'freight', label: 'Freight', line: 'freight' },
  { id: 'royalty', label: 'Royalty', line: 'royalty' },
  { id: 'da', label: 'D&A', line: 'da' },
  { id: 'services_cost', label: 'Mining services cost', role: 'cost_services' },
];
const OTHER_COST = { id: 'other_cost', label: 'Other cost of revenue' };

/** Below gross profit: each signed so that a positive value reduces profit. */
const BELOW: { id: string; label: string; role: RowRole; sign: 1 | -1; creditLabel: string }[] = [
  { id: 'opex', label: 'Operating expenses', role: 'opex', sign: 1, creditLabel: 'Operating expenses, a credit' },
  { id: 'other_net', label: 'Other expenses, net', role: 'other_net', sign: -1, creditLabel: 'Other income, net' },
  { id: 'finance_income', label: 'Finance income, a charge', role: 'finance_income', sign: -1, creditLabel: 'Finance income' },
  { id: 'finance', label: 'Finance cost', role: 'finance', sign: 1, creditLabel: 'Finance cost, a credit' },
  { id: 'jv_share', label: 'Share of joint-venture losses', role: 'jv_share', sign: -1, creditLabel: 'Share of joint-venture profit' },
  { id: 'tax', label: 'Tax', role: 'tax', sign: 1, creditLabel: 'Tax credit' },
  { id: 'minority', label: 'Minorities', role: 'minority', sign: 1, creditLabel: 'Minorities, a loss' },
];

const SOURCES: { id: string; label: string; role: RowRole }[] = [
  { id: 'rev_coal', label: 'Coal revenue', role: 'rev_coal' },
  { id: 'rev_services', label: 'Mining services', role: 'rev_services' },
  { id: 'rev_other', label: 'Other revenue', role: 'rev_other' },
];

const EMPTY = (reason: FlowSankeyModel['reason'], unit = ''): FlowSankeyModel => ({ available: false, reason, unit, nodes: [], links: [], revenue: 0 });

/** Rounding left over when the two sides of a step are compared, as a share of revenue. */
const TOLERANCE = 1e-6;

/** Links between the two sides of a step: each side stacked in order, a link wherever two intervals overlap. */
export function matchSides(ins: FlowNode[], outs: FlowNode[]): FlowLink[] {
  const links: FlowLink[] = [];
  let i = 0;
  let j = 0;
  let a = ins[0]?.value ?? 0;
  let b = outs[0]?.value ?? 0;
  while (i < ins.length && j < outs.length) {
    const v = Math.min(a, b);
    if (v > 0) links.push({ from: ins[i].id, to: outs[j].id, value: v });
    a -= v;
    b -= v;
    if (a <= 0) a = ins[++i]?.value ?? 0;
    if (b <= 0) b = outs[++j]?.value ?? 0;
  }
  return links;
}

/**
 * The flow for one period, from the page's current values. Null figures: a
 * required row (revenue, gross profit, profit to owners) not disclosed for
 * the period makes it unavailable; an optional row the company does not carry
 * counts as nothing.
 */
export function flowSankey(wb: Workbook, values: Map<string, Value>, periodId: string): FlowSankeyModel {
  const pkg: ModelPackage = wb.pkg;
  const totalRefs = rowRefsOf(pkg, 'revenue_total');
  if (!totalRefs.length || !rowRefsOf(pkg, 'gross_profit_total').length || !rowRefsOf(pkg, 'owners').length) return EMPTY('not-mapped');
  const unit = wb.row(totalRefs[0])?.unit ?? '';
  if (!parseMoney(unit)) return EMPTY('not-mapped');

  /** null: a listed row not disclosed in the period; 0: nothing listed. */
  const sum = (refs: string[]): number | null => {
    let s = 0;
    for (const ref of refs) {
      const key = wb.keyOf(ref, periodId);
      const cell = key ? wb.cell(key) : undefined;
      const v = key ? values.get(key) : undefined;
      if (!cell || cell.kind === 'missing' || !isNum(v)) return null;
      s += v;
    }
    return s;
  };
  const role = (r: RowRole) => sum(rowRefsOf(pkg, r));
  const line = (c: Canonical) => sum(linesOf(pkg, c).map((l) => l.rowRef));

  const revenue = role('revenue_total');
  const gross = role('gross_profit_total');
  const owners = role('owners');
  if (revenue === null || gross === null || owners === null || revenue <= 0) return EMPTY('missing', unit);

  const nodes: FlowNode[] = [];
  const add = (n: FlowNode) => (nodes.push(n), n);

  // Step 1: sources → total revenue. What the sources leave unexplained is "Other revenue".
  const sources: FlowNode[] = [];
  let explained = 0;
  for (const s of SOURCES) {
    const v = role(s.role);
    if (v === null) return EMPTY('missing', unit);
    if (!rowRefsOf(pkg, s.role).length || v === 0) continue;
    explained += v;
    sources.push({ id: s.id, label: s.label, value: v, column: 0, kind: 'source', parts: [] });
  }
  const rest = revenue - explained;
  if (Math.abs(rest) > revenue * TOLERANCE) {
    const other = sources.find((s) => s.id === 'rev_other');
    if (other) other.value += rest;
    else sources.push({ id: 'rev_other', label: 'Other revenue', value: rest, column: 0, kind: 'source', parts: [] });
  }
  if (sources.some((s) => s.value < 0)) return EMPTY('missing', unit);
  sources.forEach(add);
  const total = add({ id: 'revenue', label: 'Total revenue', value: revenue, column: 1, kind: 'total', parts: [] });

  // Step 2: total revenue → costs and gross profit.
  const costs: FlowNode[] = [];
  let named = 0;
  for (const c of COSTS) {
    const listed = c.line ? linesOf(pkg, c.line).length > 0 : rowRefsOf(pkg, c.role!).length > 0;
    if (!listed) continue;
    const v = c.line ? line(c.line) : role(c.role!);
    if (v === null) return EMPTY('missing', unit);
    named += v;
    costs.push({ id: c.id, label: c.label, value: v, column: 2, kind: 'cost', parts: [] });
  }
  // Other cost of revenue: the canonical other lines (inventory movement among them), the "others" rows, and what is left.
  const otherParts: FlowPart[] = [];
  for (const l of linesOf(pkg, 'other_cost')) {
    const v = sum([l.rowRef]);
    if (v === null) return EMPTY('missing', unit);
    otherParts.push({ label: l.label, value: v });
  }
  for (const ref of rowRefsOf(pkg, 'cost_others')) {
    const v = sum([ref]);
    if (v === null) return EMPTY('missing', unit);
    otherParts.push({ label: wb.row(ref)?.label ?? ref, value: v });
  }
  const costOfRevenue = revenue - gross;
  const listedOther = otherParts.reduce((s, p) => s + p.value, 0);
  const unexplained = costOfRevenue - named - listedOther;
  if (Math.abs(unexplained) > revenue * TOLERANCE) otherParts.push({ label: 'Not split by the issuer', value: unexplained });
  const otherCost = costOfRevenue - named;
  if (otherParts.length && Math.abs(otherCost) > revenue * TOLERANCE) costs.push({ id: OTHER_COST.id, label: OTHER_COST.label, value: otherCost, column: 2, kind: 'cost', parts: otherParts });

  const step2In: FlowNode[] = [total];
  const step2Out: FlowNode[] = [];
  for (const c of costs) {
    if (c.value >= 0) step2Out.push(add(c));
    else step2In.push(add({ ...c, id: `${c.id}_credit`, label: `${c.label}, a credit`, value: -c.value, column: 1, kind: 'credit' }));
  }
  let profitNode: FlowNode | null = null;
  if (gross >= 0) profitNode = add({ id: 'gross_profit', label: 'Gross profit', value: gross, column: 2, kind: 'profit', parts: [] });
  else step2In.push(add({ id: 'gross_loss', label: 'Gross loss', value: -gross, column: 1, kind: 'loss', parts: [] }));
  if (profitNode) step2Out.push(profitNode);

  // Step 3: gross profit, and what adds to it, → the lines below it and profit to owners.
  const step3In: FlowNode[] = profitNode ? [profitNode] : [];
  const step3Out: FlowNode[] = [];
  let below = 0;
  for (const b of BELOW) {
    const raw = role(b.role);
    if (raw === null) return EMPTY('missing', unit);
    const v = raw * b.sign;
    below += v;
    if (!rowRefsOf(pkg, b.role).length || v === 0) continue;
    if (v > 0) step3Out.push(add({ id: b.id, label: b.label, value: v, column: 3, kind: 'outflow', parts: [] }));
    else step3In.push(add({ id: `${b.id}_in`, label: b.creditLabel, value: -v, column: 2, kind: 'income', parts: [] }));
  }
  // What the listed lines leave between gross profit and profit to owners (a line a company reports on its own).
  const gap = gross - below - owners;
  if (Math.abs(gap) > revenue * TOLERANCE) {
    if (gap > 0) step3Out.unshift(add({ id: 'other_below', label: 'Other items, net', value: gap, column: 3, kind: 'outflow', parts: [] }));
    else step3In.push(add({ id: 'other_below_in', label: 'Other items, net', value: -gap, column: 2, kind: 'income', parts: [] }));
  }
  if (owners >= 0) step3Out.push(add({ id: 'owners', label: 'Profit to owners', value: owners, column: 3, kind: 'owners', parts: [] }));
  else step3In.push(add({ id: 'owners_loss', label: 'Loss to owners', value: -owners, column: 2, kind: 'loss', parts: [] }));

  const links = [...matchSides(sources, [total]), ...matchSides(step2In, step2Out), ...matchSides(step3In, step3Out)];
  return { available: true, unit, nodes, links, revenue };
}

/** The caption under the section title (item 5). */
export const flowCaption = (periodLabel: string, unit: string): string =>
  `${periodLabel}, ${unit}. Ribbons are proportional to value. Costs follow the order of the value chain above.`;

/** True when the company's rows are mapped for the full flow (canonical.ts); else the per-unit flow stands. */
export const hasFlowMap = (pkg: ModelPackage): boolean => rowRefsOf(pkg, 'revenue_total').length > 0 && rowRefsOf(pkg, 'owners').length > 0;

export interface PlacedNode {
  node: FlowNode;
  x: number;
  y: number;
  h: number;
}

export interface PlacedLink {
  link: FlowLink;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  h: number;
}

export interface FlowLayout {
  width: number;
  height: number;
  nodes: PlacedNode[];
  links: PlacedLink[];
}

export const FLOW = {
  width: 1040,
  /** Height the largest column's values take. */
  stack: 440,
  top: 44,
  bottom: 16,
  nodeWidth: 12,
  columnX: [190, 340, 560, 790] as const,
  gap: 8,
  /** A node's slot never shrinks below its two label lines. */
  minSlot: 34,
  /** Room above gross profit for its label. */
  labelGap: 40,
  labelPad: 8,
  lineHeight: 15,
  fontSize: 12,
  ribbonOpacity: 0.35,
  /** A node in focus or under the pointer lights its ribbons. */
  ribbonOpacityLit: 0.7,
  /** The gap between a label above its node and the node. */
  labelRaise: 4,
};

/** Nodes stacked per column, heights proportional to value; links attached in order on both sides. */
export function layoutFlow(m: FlowSankeyModel): FlowLayout {
  const columns = [0, 1, 2, 3].map((c) => m.nodes.filter((n) => n.column === c));
  const most = Math.max(...columns.map((col) => col.reduce((s, n) => s + n.value, 0)), 1);
  const k = FLOW.stack / most;
  const placed = new Map<string, PlacedNode>();
  columns.forEach((col, c) => {
    let y = FLOW.top;
    // The last column starts level with gross profit, so its ribbons run flat under the cost labels.
    if (c === 3) y = placed.get('gross_profit')?.y ?? FLOW.top;
    for (const n of col) {
      if (n.kind === 'profit') y += FLOW.labelGap - FLOW.gap;
      const h = Math.max(n.value * k, 1);
      placed.set(n.id, { node: n, x: FLOW.columnX[c], y, h });
      y += Math.max(h, FLOW.minSlot) + FLOW.gap;
    }
  });
  const outUsed = new Map<string, number>();
  const inUsed = new Map<string, number>();
  const links: PlacedLink[] = m.links.map((link) => {
    const a = placed.get(link.from)!;
    const b = placed.get(link.to)!;
    const h = link.value * k;
    const y0 = a.y + (outUsed.get(a.node.id) ?? 0);
    const y1 = b.y + (inUsed.get(b.node.id) ?? 0);
    outUsed.set(a.node.id, (outUsed.get(a.node.id) ?? 0) + h);
    inUsed.set(b.node.id, (inUsed.get(b.node.id) ?? 0) + h);
    return { link, x0: a.x + FLOW.nodeWidth, y0, x1: b.x, y1, h };
  });
  const nodes = Array.from(placed.values());
  const height = Math.max(...nodes.map((n) => n.y + Math.max(n.h, FLOW.minSlot)), FLOW.top + FLOW.stack) + FLOW.bottom;
  return { width: FLOW.width, height, nodes, links };
}

/** Where a node's label sits: left of a node nothing flows into, right of one nothing flows out of, else above it on the right. */
export function labelSide(m: FlowSankeyModel, id: string): 'left' | 'right' | 'above' {
  const ins = m.links.some((l) => l.to === id);
  const outs = m.links.some((l) => l.from === id);
  if (!ins) return 'left';
  if (!outs) return 'right';
  return 'above';
}
