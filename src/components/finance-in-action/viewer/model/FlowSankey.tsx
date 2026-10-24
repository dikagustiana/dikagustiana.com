/**
 * "Where a unit of [product] goes", in full (docs/prd/2026-10-fia-fixes item
 * 5; lib flowSankey.ts): revenue sources → total revenue → costs in the order
 * of the value chain, and gross profit → operating expenses, finance, tax,
 * minorities and profit to owners, in the reporting currency. A hand-built
 * SVG, as the per-unit flow it replaces for a mapped company.
 *
 * Labels sit outside the ribbons: left of a node nothing flows into, right of
 * a node nothing flows out of, and above total revenue and gross profit. No
 * text is drawn over a ribbon. Every node can be reached with Tab and names
 * its value; "Other cost of revenue" lists its parts. A table under the chart
 * gives the same figures.
 */
import { useState } from 'react';
import { formatNumber, formatPercent } from '@/lib/finance-in-action/format';
import { FLOW, flowCaption, labelSide, layoutFlow, type FlowNode, type FlowNodeKind, type FlowSankeyModel } from '@/lib/finance-in-action/flowSankey';
import { ribbon } from '@/lib/finance-in-action/sankey';
import { cn } from '@/lib/utils';

const FILL: Record<FlowNodeKind, string> = {
  source: 'hsl(var(--primary))',
  total: 'hsl(var(--primary))',
  cost: 'hsl(var(--fia-cost))',
  profit: 'hsl(var(--primary))',
  income: 'hsl(var(--primary))',
  credit: 'hsl(var(--primary))',
  outflow: 'hsl(var(--muted-foreground))',
  owners: 'hsl(var(--primary))',
  loss: 'hsl(var(--destructive))',
};

const show = (v: number) => formatNumber(v, 0);

function nodeText(n: FlowNode, revenue: number): string {
  const parts = n.parts.length ? `. Of which: ${n.parts.map((p) => `${p.label} ${formatNumber(p.value, 0)}`).join('; ')}` : '';
  return `${n.label}: ${show(n.value)}, ${formatPercent(n.value / revenue)} of revenue${parts}`;
}

export function FlowSankey({ model: m, periodLabel, title }: { model: FlowSankeyModel; periodLabel: string; title: string }) {
  const [active, setActive] = useState<string | null>(null);
  const L = layoutFlow(m);
  const byId = new Map(L.nodes.map((p) => [p.node.id, p]));
  const activeNode = active ? byId.get(active)?.node ?? null : null;
  const W = FLOW.nodeWidth;

  const label = (x: number, y: number, lines: string[], anchor: 'start' | 'end', bold: boolean) => (
    <text x={x} y={y} textAnchor={anchor} className={cn('fill-foreground', bold && 'font-semibold')} style={{ fontSize: FLOW.fontSize }}>
      {lines.map((t, i) => (
        <tspan key={i} x={x} dy={i ? FLOW.lineHeight : 0} className={i ? 'fill-muted-foreground' : undefined}>
          {t}
        </tspan>
      ))}
    </text>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" data-flow-caption>
        {flowCaption(periodLabel, m.unit)}
      </p>
      <div className="fia-scroll-row rounded-md border border-border" role="region" aria-label={`${title}, ${periodLabel}, scrolls sideways`}>
        <svg
          viewBox={`0 0 ${L.width} ${L.height}`}
          className="block h-auto w-full min-w-[44rem] tabular-nums"
          role="group"
          aria-label={`${title}: revenue to profit to owners, ${periodLabel}, ${m.unit}. The table below gives the same figures.`}
          data-flow-sankey
        >
          {L.links.map((p) => {
            const to = byId.get(p.link.to)!.node;
            const from = byId.get(p.link.from)!.node;
            const tint = to.kind === 'cost' || to.kind === 'outflow' ? FILL[to.kind] : FILL[from.kind];
            const lit = active === from.id || active === to.id;
            return (
              <path
                key={`${p.link.from}>${p.link.to}`}
                d={ribbon(p.x0, p.y0, p.h, p.x1, p.y1, p.h)}
                fill={tint}
                fillOpacity={lit ? FLOW.ribbonOpacityLit : FLOW.ribbonOpacity}
                data-flow-link={`${p.link.from}>${p.link.to}`}
              >
                <title>{`${from.label} to ${to.label}: ${show(p.link.value)}`}</title>
              </path>
            );
          })}
          {L.nodes.map((p) => {
            const n = p.node;
            const side = labelSide(m, n.id);
            const lines = [n.label, show(n.value)];
            const bold = n.kind === 'total' || n.kind === 'profit' || n.kind === 'owners';
            const text =
              side === 'left'
                ? label(p.x - FLOW.labelPad, p.y + FLOW.fontSize, lines, 'end', bold)
                : side === 'right'
                  ? label(p.x + W + FLOW.labelPad, p.y + FLOW.fontSize, lines, 'start', bold)
                  : label(p.x + W + FLOW.labelPad, p.y - FLOW.lineHeight - FLOW.labelRaise, lines, 'start', bold);
            return (
              <g
                key={n.id}
                tabIndex={0}
                role="img"
                aria-label={nodeText(n, m.revenue)}
                onFocus={() => setActive(n.id)}
                onBlur={() => setActive((a) => (a === n.id ? null : a))}
                onMouseEnter={() => setActive(n.id)}
                onMouseLeave={() => setActive((a) => (a === n.id ? null : a))}
                className="focus-visible:outline-none [&:focus-visible>rect]:stroke-ring [&:focus-visible>rect]:stroke-[3px]"
                data-flow-node={n.id}
                data-kind={n.kind}
              >
                <title>{nodeText(n, m.revenue)}</title>
                <rect x={p.x} y={p.y} width={W} height={p.h} fill={FILL[n.kind]} stroke={n.kind === 'loss' ? 'hsl(var(--destructive))' : 'none'} />
                {text}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="min-h-[1.25rem] text-sm text-foreground" aria-live="polite" data-flow-detail>
        {activeNode ? nodeText(activeNode, m.revenue) : ''}
      </p>
      <div className="fia-scroll-row rounded-md border border-border">
        <table className="w-full min-w-[32rem] border-collapse text-sm tabular-nums" data-flow-table>
          <caption className="sr-only">
            {title}, {periodLabel}: the same figures as the chart
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-3 py-2 font-semibold">Line</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{m.unit}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Share of revenue</th>
            </tr>
          </thead>
          <tbody>
            {L.nodes
              .slice()
              .sort((a, b) => a.node.column - b.node.column)
              .map(({ node: n }) => {
                const reduces = n.kind === 'cost' || n.kind === 'outflow' || n.kind === 'loss';
                return (
                  <tr key={n.id} className={cn('border-b border-border/60 align-top', (n.kind === 'total' || n.kind === 'profit' || n.kind === 'owners') && 'font-semibold')}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      {n.label}
                      {n.parts.length > 0 && (
                        <span className="block text-xs text-muted-foreground">Of which: {n.parts.map((x) => `${x.label} ${formatNumber(x.value, 0)}`).join('; ')}</span>
                      )}
                    </th>
                    <td className="px-3 py-2 text-right">{formatNumber(reduces ? -n.value : n.value, 0)}</td>
                    <td className="px-3 py-2 text-right">{formatPercent(n.value / m.revenue)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
