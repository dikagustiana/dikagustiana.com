/**
 * The companies side by side under the unit-economics table
 * (docs/prd/2026-10-fia-fixes item 4; lib canonical.ts groupedBars): one group
 * per line, revenue to the strip ratio, a bar per company in ticker order,
 * the same on every page of the sub-industry, in fixed neutral shades with the
 * subject darkest. Each group has its own scale, since a price and a strip
 * ratio share no axis. Every bar carries its value; costs read in brackets. A
 * company without the figure leaves a gap with a dotted outline, never a zero.
 */
import { fxCaption, type FxRate } from '@/lib/finance-in-action/fx';
import { formatMultiple, formatNumber } from '@/lib/finance-in-action/format';
import { GROUPED_BAR, PERCENT } from '@/lib/finance-in-action/layout';
import type { GroupedBars } from '@/lib/finance-in-action/canonical';
import { COPY } from '@/lib/finance-in-action/copy';
import { cn } from '@/lib/utils';

export function GroupedBar({ bars, periodId, periodLabel, rates }: { bars: GroupedBars; periodId: string; periodLabel: string; rates: FxRate[] }) {
  const others = bars.companies.filter((c) => !c.self);
  const shade = (i: number) => {
    const c = bars.companies[i];
    return c.self ? GROUPED_BAR.shades[0] : GROUPED_BAR.shades[others.indexOf(c) + 1] ?? GROUPED_BAR.shades[GROUPED_BAR.shades.length - 1];
  };
  return (
    <figure className="space-y-3" data-fia-grouped-bar>
      <figcaption className="text-sm font-medium text-foreground">
        {periodLabel}, per tonne, {bars.companies.map((c) => c.ticker).join(', ')}
      </figcaption>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground" aria-label="Companies">
        {bars.companies.map((c, i) => (
          <li key={c.ticker} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('inline-block h-3 w-4 rounded-sm', shade(i))} />
            <span className={cn(c.self && 'font-semibold')}>{c.ticker}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {bars.groups.map((g) => {
          const max = Math.max(...g.values.map((v) => Math.abs(v ?? 0))) || 1;
          return (
            <div key={g.canonical} role="group" aria-label={`${g.label}, ${g.unit}`} data-fia-bar-group={g.canonical}>
              <p className="mb-1 text-xs font-semibold text-foreground">
                {g.label} <span className="font-normal text-muted-foreground">{g.unit}</span>
              </p>
              <ul className="space-y-1">
                {g.values.map((v, i) => {
                  const c = bars.companies[i];
                  const text =
                    v === null ? COPY.notComparable : g.canonical === 'strip_ratio' ? formatMultiple(v) : formatNumber(g.reduces ? -v : v, GROUPED_BAR.moneyDecimals);
                  return (
                    <li key={c.ticker} className="flex h-5 items-center gap-2 text-xs tabular-nums" aria-label={`${c.ticker}: ${text}`}>
                      <span className={cn('w-10 shrink-0 text-muted-foreground', c.self && 'font-semibold text-foreground')}>{c.ticker}</span>
                      <span className="relative h-4 min-w-0 flex-1">
                        {v === null ? (
                          <span className="absolute inset-0 flex items-center rounded-sm border border-dotted border-muted-foreground/60 px-1 text-[11px] italic leading-none text-muted-foreground" data-gap>
                            {text}
                          </span>
                        ) : (
                          <span className={cn('absolute inset-y-0 left-0 rounded-sm', shade(i))} style={{ width: `${(Math.abs(v) / max) * PERCENT}%` }} />
                        )}
                      </span>
                      <span className="w-16 shrink-0 text-right text-foreground">{v === null ? '' : text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {bars.companies
        .filter((c) => c.converted)
        .map((c) => (
          <p key={c.ticker} className="text-xs text-muted-foreground" data-fia-fx-caption>
            {fxCaption(c.ticker, c.converted!, periodId, periodLabel, rates)}
          </p>
        ))}
    </figure>
  );
}
