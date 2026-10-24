/**
 * "Where [ticker] sits in [sub-industry]" (brief §5.3). The shaded band is
 * the range of the published companies; this company's marker is solid, the
 * pair's dashed, each labelled with its ticker and value. With fewer than two
 * published companies, the empty state, never a band (constraint 11).
 */
import { COPY } from '@/lib/finance-in-action/copy';
import { formatForRow } from '@/lib/finance-in-action/format';
import { HALF, PEER_PAD, PERCENT } from '@/lib/finance-in-action/layout';
import type { PeerMetric } from '@/lib/finance-in-action/peers';
import { cn } from '@/lib/utils';

function position(v: number, lo: number, hi: number): number {
  return hi === lo ? PERCENT * HALF : ((v - lo) / (hi - lo)) * PERCENT;
}

export function PeerBand({
  metrics,
  ticker,
  subIndustryName,
  publishedCount,
}: {
  metrics: PeerMetric[] | null;
  ticker: string;
  subIndustryName: string;
  publishedCount: number;
}) {
  if (!metrics) return <p className="text-sm italic text-muted-foreground">{COPY.peerEmpty}</p>;
  const first = metrics[0];
  const pairs = first.points.filter((p) => p.pair).map((p) => p.ticker);
  const count = publishedCount;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {first.periodLabel}. The shaded band is the range of the {count} published companies in {subIndustryName}; the solid marker is {ticker}
        {pairs.length ? `, the dashed marker ${pairs.join(' and ')}` : ''}.
      </p>
      <ul className="space-y-5">
        {metrics.map((m) => {
          const span = m.max - m.min || Math.abs(m.max) || 1;
          const lo = m.min - span * PEER_PAD;
          const hi = m.max + span * PEER_PAD;
          const row = { unit: m.unit };
          return (
            <li key={m.metric}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-medium text-foreground">{m.metric}</span>
                <span className="text-xs text-muted-foreground">{m.unit}</span>
              </div>
              <div className="relative h-11" aria-hidden="true">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div
                  className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-muted-foreground/25"
                  style={{ left: `${position(m.min, lo, hi)}%`, width: `${position(m.max, lo, hi) - position(m.min, lo, hi)}%` }}
                />
                {m.points.map((p) => (
                  <div
                    key={p.ticker}
                    className={cn(
                      'absolute top-1/2 h-7 -translate-x-1/2 -translate-y-1/2 border-l-2',
                      p.self ? 'border-solid border-foreground' : 'border-dashed border-foreground/70',
                    )}
                    style={{ left: `${position(p.value, lo, hi)}%` }}
                  />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 text-xs tabular-nums text-foreground">
                {m.points.map((p) => (
                  <li key={p.ticker}>
                    <span className={cn('mr-1 inline-block h-3 w-0 border-l-2 align-middle', p.self ? 'border-solid border-foreground' : 'border-dashed border-foreground/70')} />
                    <span className="font-semibold">{p.ticker}</span> {formatForRow(p.value, row)}
                  </li>
                ))}
                <li className="text-muted-foreground">
                  Range {formatForRow(m.min, row)} to {formatForRow(m.max, row)}
                </li>
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
