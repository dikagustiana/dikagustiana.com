/**
 * The link card (brief §5.2): what flows, the driver on each side, the
 * intensity, the cost share (disclosed and, where it can be, worked here,
 * with the difference), the demand share, the observed pass-through, the
 * caveat, one unit of the downstream product split along the chain, and a
 * what-if worked only from measured weights and published models. Anything
 * missing says so; nothing is filled in.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import { COPY } from '@/lib/finance-in-action/copy';
import { formatNumber, formatPercent, formatPointsDelta, parseHouseNumber } from '@/lib/finance-in-action/format';
import { PER_UNIT_DECIMALS } from '@/lib/finance-in-action/unitEconomics';
import { linkName } from '@/lib/finance-in-action/links';
import {
  commonPeriod,
  displayScale,
  sideEconomics,
  splitAlongChain,
  whatIf,
  workedCostShare,
} from '@/lib/finance-in-action/linkMath';
import type { Registry } from '@/lib/finance-in-action/registry';
import { cn } from '@/lib/utils';

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const UPSTREAM_COMPANY = 'Upstream company';
export const DOWNSTREAM_COMPANY = 'Downstream company';

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm font-medium text-muted-foreground">{term}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </>
  );
}

function Missing({ children = 'not yet measured' }: { children?: ReactNode }) {
  return <span className="italic text-muted-foreground">{children}</span>;
}

export function LinkCard({ reg, link, onClose }: { reg: Registry; link: IndustryLink; onClose: () => void }) {
  const from = reg.subIndustry(link.from);
  const to = reg.subIndustry(link.to);
  const upstreamNoun = from?.unitNoun ?? link.from;
  const downstreamNoun = to?.unitNoun ?? link.to;
  const published = (code: string) => reg.packages.filter((p) => p.meta.subIndustry === code && p.meta.status === 'published');
  const ups = published(link.from);
  const downs = published(link.to);
  const [upTicker, setUpTicker] = useState(ups[0]?.meta.ticker ?? '');
  const [downTicker, setDownTicker] = useState(downs[0]?.meta.ticker ?? '');
  const up = ups.find((p) => p.meta.ticker === upTicker) ?? null;
  const down = downs.find((p) => p.meta.ticker === downTicker) ?? null;
  const period = commonPeriod(link, up, down);
  const upSide = up && period ? sideEconomics(up, period) : null;
  const downSide = down && period ? sideEconomics(down, period) : null;
  const unit = down?.unitEconomics.unit ?? up?.unitEconomics.unit ?? to?.unit ?? from?.unit ?? 'unit';
  const scale = displayScale(down ?? up);
  const worked = workedCostShare(link, upSide, downSide);
  const split = splitAlongChain(link, upSide, downSide, { upstream: upstreamNoun, downstream: downstreamNoun, unit });
  const [priceText, setPriceText] = useState('');
  const priceChange = priceText.trim() === '' ? null : parseHouseNumber(priceText, true);
  const result = useMemo(() => whatIf(link, upSide, downSide, priceChange), [link, upSide, downSide, priceChange]);
  const inputId = useId();
  const pickerId = useId();
  const periodLabel = period ? (down ?? up)?.periods.find((p) => p.id === period)?.label ?? period : null;
  const show = (rp: number | null) => (rp === null ? <Missing>{COPY.notAvailable}</Missing> : formatNumber(rp / scale.divisor, PER_UNIT_DECIMALS));

  // Chain view §3.6: one company on each side, chosen among the published ones; never an average.
  const companyPicker = (side: 'up' | 'down', label: string, list: typeof ups, value: string, onChange: (t: string) => void) =>
    list.length ? (
      <span className="inline-flex items-center gap-2">
        <label htmlFor={`${pickerId}-${side}`} className="text-sm text-muted-foreground">
          {label}
        </label>
        <select
          id={`${pickerId}-${side}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {list.map((p) => (
            <option key={p.meta.ticker} value={p.meta.ticker}>
              {p.meta.ticker}: {p.meta.name}
            </option>
          ))}
        </select>
      </span>
    ) : null;

  return (
    <section id="links" aria-labelledby="fia-link-title" className="scroll-mt-24 rounded-md border border-foreground/30 bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 id="fia-link-title" className="text-lg font-semibold text-foreground">
          {linkName(reg, link)}: {link.whatFlows}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the link card"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <Row term="What flows">{link.whatFlows}</Row>
        <Row term={`Driver in ${upstreamNoun}`}>
          {link.driverFrom}
          {ups.length ? `, ${ups.map((p) => p.meta.ticker).join(' and ')}` : <Missing>, no published model yet</Missing>}
        </Row>
        <Row term={`Driver in ${downstreamNoun}`}>
          {link.driverTo}
          {downs.length ? `, ${downs.map((p) => p.meta.ticker).join(' and ')}` : <Missing>, no published model yet</Missing>}
        </Row>
        <Row term="Intensity">
          {link.intensity ? (
            <>
              {formatNumber(link.intensity.value, PER_UNIT_DECIMALS + 1)} {link.intensity.unit}, {link.intensity.period}. Source: {link.intensity.source}
            </>
          ) : (
            <Missing />
          )}
        </Row>
        <Row term="Cost share">
          {link.costShare ? (
            <>
              Disclosed: {formatPercent(link.costShare.value)} of {downstreamNoun} cost of revenue, {link.costShare.period}. Source: {link.costShare.source}
            </>
          ) : (
            <Missing />
          )}
          <span className="mt-1 block">
            Worked here:{' '}
            {worked === null ? (
              <Missing>{COPY.notAvailable}: needs the intensity and published unit economics on both sides</Missing>
            ) : (
              <>
                {formatPercent(worked)} ({upSide?.ticker} revenue per {unit} × intensity ÷ {downSide?.ticker} cost of revenue per {unit}, {periodLabel})
                {link.costShare && <>. Difference from the disclosed figure: {formatPointsDelta(worked - link.costShare.value)}</>}
              </>
            )}
          </span>
        </Row>
        <Row term="Demand share">
          {link.demandShare ? (
            <>
              {formatPercent(link.demandShare.value)} of {upstreamNoun} sales volume, {link.demandShare.period}. Source: {link.demandShare.source}
            </>
          ) : (
            <Missing />
          )}
        </Row>
        <Row term="Observed pass-through">
          {link.passThrough ? (
            <>
              {formatPercent(link.passThrough.estimate)}, range {formatPercent(link.passThrough.low)} to {formatPercent(link.passThrough.high)}, over{' '}
              {formatNumber(link.passThrough.quarters)} quarters. Source: {link.passThrough.source}
            </>
          ) : (
            <Missing />
          )}
        </Row>
        {link.caveat && <Row term="Caveat">{link.caveat}</Row>}
      </dl>

      <div className="mt-6">
        <h4 className="text-base font-semibold text-foreground">
          One {unit} of {downstreamNoun}, split along the chain
        </h4>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Companies to read the split from">
          {companyPicker('up', UPSTREAM_COMPANY, ups, upTicker, setUpTicker)}
          {companyPicker('down', DOWNSTREAM_COMPANY, downs, downTicker, setDownTicker)}
        </div>
        {upSide && downSide && (
          <p className="mt-2 text-sm font-medium text-foreground" data-split-pair>
            {upSide.ticker} to {downSide.ticker}: {upSide.ticker}'s {upstreamNoun} in one {unit} of {downSide.ticker}'s {downstreamNoun}. One company on each side, not an average.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {scale.label} per {unit} of {downstreamNoun}
          {periodLabel ? `, ${periodLabel}` : ''}. From the two sides' unit economics and the intensity.
        </p>
        <table className="mt-2 w-full max-w-2xl text-sm tabular-nums">
          <tbody>
            {split.map((l) => (
              <tr key={l.id} className="border-b border-border/60">
                <th scope="row" className={cn('py-2 pr-4 text-left font-normal text-foreground', l.within && 'pl-6 text-muted-foreground')}>
                  {capital(l.label)}
                </th>
                <td className="py-2 text-right">{show(l.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-md border border-border bg-background p-4">
        <h4 className="text-base font-semibold text-foreground">What if {upstreamNoun} moves?</h4>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label htmlFor={inputId} className="text-sm text-foreground">
            Change in the {upstreamNoun} price, %
          </label>
          <input
            id={inputId}
            value={priceText}
            inputMode="decimal"
            onChange={(e) => setPriceText(e.target.value)}
            className="h-11 w-28 rounded-md border border-input bg-background px-3 text-right tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <p className="mt-3 text-sm text-foreground" role="status">
          {result.ok ? (
            <>
              {capital(downstreamNoun)} gross margin, {downSide?.ticker}: <span className="font-semibold">{formatPointsDelta(result.grossMarginChange)}</span>, holding the{' '}
              {downstreamNoun} price; observed pass-through not applied.
            </>
          ) : (
            <>Not worked: {result.missing.join('; ')}.</>
          )}
        </p>
        <p className="mt-2 text-xs font-medium text-foreground">{COPY.viewerOnly}</p>
      </div>
    </section>
  );
}
