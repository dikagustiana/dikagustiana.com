/**
 * "Where a unit of [product] goes" (chain view, PROMPT-site §3.5): a
 * hand-built SVG sankey, no chart library (constraint 9 of the prompt).
 *
 * Right: revenue per unit, with any loss stacked under it as its own marked
 * node. Middle: each cost and unsplit line and the profit subtotal, in the
 * package's line order, each ribbon as thick as its per-unit value. Left: the
 * upstream sub-industries the link register joins to a line, with their
 * published companies; one published company is a link to its model, several
 * (or none) open the link card. The unsplit ribbon is hatched and lists what
 * it contains on hover and focus. Every flow carries its label and value as
 * text, every node and flow can be reached with Tab, and a table under the
 * chart gives the same figures. No volume, nothing drawn (constraint 9).
 */
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { COPY } from '@/lib/finance-in-action/copy';
import { formatNumber, formatPercent } from '@/lib/finance-in-action/format';
import { HALF, SANKEY } from '@/lib/finance-in-action/layout';
import type { Registry } from '@/lib/finance-in-action/registry';
import { modelPath } from '@/lib/finance-in-action/routes';
import {
  layoutSankey,
  ribbon,
  sankeyModel,
  shareOfRevenue,
  wrapLabel,
  type FlowKind,
  type SankeyFlow,
  type SankeyUpstream,
} from '@/lib/finance-in-action/sankey';
import { PER_UNIT_DECIMALS, type UEView } from '@/lib/finance-in-action/unitEconomics';
import { periodById } from '@/lib/finance-in-action/model/periods';
import { cn } from '@/lib/utils';

export const SANKEY_TITLE = (noun: string) => `Where a ${SANKEY_UNIT_WORD} of ${noun} goes`;
const SANKEY_UNIT_WORD = 'unit';

const FILL: Record<FlowKind, string> = {
  cost: 'hsl(var(--fia-cost))',
  unsplit: '',
  profit: 'hsl(var(--primary))',
};
const KIND_WORD: Record<FlowKind, string> = {
  cost: 'Named cost line',
  unsplit: 'Not split in the note',
  profit: 'Profit',
};

const show = (v: number) => formatNumber(v, PER_UNIT_DECIMALS);

function activate(e: KeyboardEvent, run: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    run();
  }
}

export function CostSankey({
  reg,
  pkg,
  ue,
  onlyMessage = false,
  onOpenLink,
}: {
  reg: Registry;
  pkg: ModelPackage;
  ue: UEView;
  /** No period has a volume (constraint 9). */
  onlyMessage?: boolean;
  onOpenLink: (linkId: string) => void;
}) {
  const navigate = useNavigate();
  const ids = useId();
  const hatchId = `${ids}-hatch`;
  const lossId = `${ids}-loss`;
  const [active, setActive] = useState<string | null>(null);
  const unit = pkg.unitEconomics.unit;
  const noun = reg.subIndustry(pkg.meta.subIndustry)?.unitNoun ?? unit;
  const periodLabel = periodById(pkg, ue.periodId)?.label ?? ue.periodId;
  const scale = `${ue.scale.label} per ${unit}`;

  if (onlyMessage || !ue.available) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm font-medium text-foreground" role="status" data-sankey-unavailable>
        {COPY.ueNotAvailable}
      </p>
    );
  }
  const m = sankeyModel(reg, pkg, ue);
  if (!m.available) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm font-medium text-foreground" role="status" data-sankey-unavailable>
        {COPY.ueNotAvailable}
      </p>
    );
  }
  const L = layoutSankey(m);
  const nodeW = SANKEY.nodeWidth;
  const midRight = SANKEY.lineX + nodeW;
  const share = (v: number) => formatPercent(shareOfRevenue(m, v));
  const flowName = (f: SankeyFlow) => `${f.line.label}: ${show(f.value)} ${scale}, ${share(f.value)} of revenue`;
  const goUpstream = (u: SankeyUpstream) => {
    if (u.published.length === 1) navigate(modelPath(u.published[0].ticker));
    else onOpenLink(u.link.id);
  };
  const upstreamName = (u: SankeyUpstream) =>
    u.published.length === 1
      ? `${u.name}, ${u.published[0].ticker}: open its model`
      : `${u.name}, ${u.published.length ? u.published.map((c) => c.ticker).join(', ') : 'no published model yet'}: open the link card`;
  const activeFlow = m.flows.find((f) => f.line.id === active) ?? null;
  const focusProps = (id: string) => ({
    onFocus: () => setActive(id),
    onBlur: () => setActive((a) => (a === id ? null : a)),
    onMouseEnter: () => setActive(id),
    onMouseLeave: () => setActive((a) => (a === id ? null : a)),
  });

  const label = (x: number, y: number, lines: ReactNode[], anchor: 'start' | 'end' = 'start', bold = false) => (
    <text x={x} y={y} textAnchor={anchor} className={cn('fill-foreground', bold && 'font-semibold')} style={{ fontSize: SANKEY.fontSize, paintOrder: 'stroke' }} stroke="hsl(var(--background))" strokeWidth={SANKEY.labelPad * HALF}>
      {lines.map((t, i) => (
        <tspan key={i} x={x} dy={i ? SANKEY.lineHeight : 0}>
          {t}
        </tspan>
      ))}
    </text>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {periodLabel}, {scale}. Each ribbon is a line of the waterfall above, as wide as its share of revenue.
      </p>
      <div className="overflow-x-auto rounded-md border border-border" role="region" aria-label={`${SANKEY_TITLE(noun)}, ${periodLabel}, scrolls sideways`}>
        <svg
          viewBox={`0 0 ${SANKEY.width} ${L.height}`}
          className="block h-auto w-full min-w-[40rem] tabular-nums"
          role="group"
          aria-label={`${SANKEY_TITLE(noun)}: revenue per ${unit} split into its lines, ${periodLabel}. The table below gives the same figures.`}
          data-sankey
        >
          <defs>
            <pattern id={hatchId} width={SANKEY.hatch} height={SANKEY.hatch} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={SANKEY.hatch} height={SANKEY.hatch} fill="hsl(var(--background))" />
              <line x1={0} y1={0} x2={0} y2={SANKEY.hatch} stroke="hsl(var(--fia-unsplit))" strokeWidth={SANKEY.hatch * HALF} />
            </pattern>
            <pattern id={lossId} width={SANKEY.hatch} height={SANKEY.hatch} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <rect width={SANKEY.hatch} height={SANKEY.hatch} fill="hsl(var(--background))" />
              <line x1={0} y1={0} x2={0} y2={SANKEY.hatch} stroke="hsl(var(--destructive))" strokeWidth={SANKEY.hatch * HALF} />
            </pattern>
          </defs>

          {/* Revenue, then any loss under it: the right-hand stack. */}
          <g tabIndex={0} role="img" aria-label={`${m.revenueLine?.label ?? 'Revenue'}: ${show(m.revenue)} ${scale}`} className="focus-visible:outline-none [&:focus-visible>rect]:stroke-ring [&:focus-visible>rect]:stroke-[3px]" data-sankey-node="revenue">
            <rect x={SANKEY.revenueX} y={L.revenue.top} width={nodeW} height={L.revenue.height} fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" />
            {label(SANKEY.revenueX + nodeW + SANKEY.labelPad, L.revenue.top + SANKEY.fontSize, [m.revenueLine?.label ?? 'Revenue', `${show(m.revenue)}`], 'start', true)}
          </g>
          {L.loss && (
            <g tabIndex={0} role="img" aria-label={`Loss: ${show(m.loss)} ${scale}, paid for outside revenue`} className="focus-visible:outline-none [&:focus-visible>rect]:stroke-ring" data-sankey-node="loss">
              <rect x={SANKEY.revenueX} y={L.loss.top} width={nodeW} height={L.loss.height} fill={`url(#${lossId})`} stroke="hsl(var(--destructive))" strokeDasharray={`${SANKEY.hatch} ${SANKEY.hatch * HALF}`} />
              {label(SANKEY.revenueX + nodeW + SANKEY.labelPad, L.loss.top + SANKEY.fontSize, [`${m.lossLine?.label ?? 'Profit'} is a loss`, `(${show(m.loss)}), paid outside revenue`])}
            </g>
          )}

          {L.flows.map((p) => {
            const f = p.flow;
            const fill = f.kind === 'unsplit' ? `url(#${hatchId})` : FILL[f.kind];
            const contains = f.kind === 'unsplit' ? `Contains: ${f.line.contains?.join(', ')}` : '';
            return (
              <g key={f.line.id} data-sankey-flow={f.line.id} data-kind={f.kind}>
                <g
                  tabIndex={0}
                  role="img"
                  aria-label={`${flowName(f)}${contains ? `. ${contains}` : ''}`}
                  className="focus-visible:outline-none [&:focus-visible>path]:stroke-ring [&:focus-visible>path]:stroke-[3px]"
                  {...focusProps(f.line.id)}
                >
                  <title>{`${flowName(f)}${contains ? `. ${contains}` : ''}`}</title>
                  <path
                    d={ribbon(SANKEY.revenueX, p.y0, p.h, midRight, p.y1, p.h)}
                    fill={fill}
                    fillOpacity={f.kind === 'unsplit' ? undefined : SANKEY.ribbonOpacity}
                    stroke={f.kind === 'unsplit' ? 'hsl(var(--fia-unsplit))' : 'none'}
                    strokeDasharray={f.kind === 'unsplit' ? `${SANKEY.hatch} ${SANKEY.hatch * HALF}` : undefined}
                  />
                  <rect x={SANKEY.lineX} y={p.y1} width={nodeW} height={Math.max(p.h, 1)} fill={fill} stroke="hsl(var(--foreground))" />
                  {label(midRight + SANKEY.labelPad, p.slotTop + SANKEY.fontSize, [f.line.label, `${show(f.value)} · ${share(f.value)}`], 'start', f.kind === 'profit')}
                </g>
                {/* The upstream sub-industries that feed this line. */}
                {L.upstream
                  .filter((u) => u.up.lineId === f.line.id)
                  .map((u) => {
                    const lines = [...wrapLabel(u.up.name), u.up.published.length ? u.up.published.map((c) => c.ticker).join(', ') : COPY.notYetModelled];
                    return (
                      <g
                        key={u.up.link.id}
                        tabIndex={0}
                        role="link"
                        aria-label={upstreamName(u.up)}
                        onClick={() => goUpstream(u.up)}
                        onKeyDown={(e) => activate(e, () => goUpstream(u.up))}
                        className="cursor-pointer focus-visible:outline-none [&:focus-visible>rect]:stroke-ring [&:focus-visible>rect]:stroke-[3px]"
                        data-sankey-upstream={u.up.code}
                      >
                        <title>{`${u.up.link.whatFlows}. ${upstreamName(u.up)}`}</title>
                        <path d={ribbon(SANKEY.upstreamX + nodeW, u.toY, u.toH, SANKEY.lineX, u.toY, u.toH)} fill="hsl(var(--muted-foreground))" fillOpacity={SANKEY.ribbonOpacity} />
                        <rect x={SANKEY.upstreamX} y={u.toY} width={nodeW} height={Math.max(u.toH, 1)} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeDasharray={u.up.published.length ? undefined : `${SANKEY.hatch} ${SANKEY.hatch * HALF}`} />
                        {label(SANKEY.upstreamX - SANKEY.labelPad, u.top + SANKEY.fontSize, lines, 'end')}
                      </g>
                    );
                  })}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="min-h-[1.25rem] text-sm text-foreground" aria-live="polite" data-sankey-detail>
        {activeFlow ? `${flowName(activeFlow)}${activeFlow.kind === 'unsplit' ? `. Contains: ${activeFlow.line.contains?.join(', ')}` : ''}` : ''}
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground" aria-label="Cost flow legend">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-4 rounded-sm bg-fia-cost" aria-hidden="true" /> {KIND_WORD.cost}
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="fia-hatch inline-block h-3 w-4 rounded-sm" aria-hidden="true" /> {KIND_WORD.unsplit}: hatched
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-4 rounded-sm bg-primary" aria-hidden="true" /> {KIND_WORD.profit}
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-4 rounded-sm border border-dashed border-foreground" aria-hidden="true" /> Upstream sub-industry from the link register, dashed when none is published
        </li>
      </ul>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-sm tabular-nums" data-sankey-table>
          <caption className="sr-only">
            {SANKEY_TITLE(noun)}, {periodLabel}: the same figures as the chart
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-3 py-2 font-semibold">Line</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{scale}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Share of revenue</th>
              <th scope="col" className="px-3 py-2 font-semibold">Upstream, from the link register</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60 font-semibold">
              <th scope="row" className="px-3 py-2 text-left">{m.revenueLine?.label ?? 'Revenue'}</th>
              <td className="px-3 py-2 text-right">{show(m.revenue)}</td>
              <td className="px-3 py-2 text-right">{formatPercent(1)}</td>
              <td className="px-3 py-2" />
            </tr>
            {m.flows.map((f) => (
              <tr key={f.line.id} className={cn('border-b border-border/60 align-top', f.kind === 'profit' && 'font-semibold')}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {f.line.label}
                  <span className="block text-xs text-muted-foreground">
                    {KIND_WORD[f.kind]}
                    {f.kind === 'unsplit' ? `. Contains: ${f.line.contains?.join(', ')}` : ''}
                  </span>
                </th>
                <td className="px-3 py-2 text-right">{show(f.value)}</td>
                <td className="px-3 py-2 text-right">{share(f.value)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {f.upstream.length ? f.upstream.map((u) => `${u.name} (${u.published.length ? u.published.map((c) => c.ticker).join(', ') : COPY.notYetModelled})`).join('; ') : '–'}
                </td>
              </tr>
            ))}
            {m.loss > 0 && (
              <tr className="border-b border-border/60 font-semibold">
                <th scope="row" className="px-3 py-2 text-left">{m.lossLine?.label ?? 'Profit'}: a loss, paid outside revenue</th>
                <td className="px-3 py-2 text-right">{formatNumber(-m.loss, PER_UNIT_DECIMALS)}</td>
                <td className="px-3 py-2 text-right">{formatPercent(shareOfRevenue(m, -m.loss))}</td>
                <td className="px-3 py-2" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
