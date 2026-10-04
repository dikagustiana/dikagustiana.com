/**
 * "Unit economics, per [unit] sold" (brief §5.4).
 *
 * One unit of the product split from price to profit: a waterfall in the
 * package's line order, every bar with its value on it, revenue and subtotals
 * in the primary colour, named cost lines in the cost colour, the unsplit
 * remainder hatched with a dashed edge (constraints 8 and 13). Under each bar
 * its label and the physical driver that moves it; the driver opens its own
 * inputs. A table below repeats every figure with its total, its source and
 * the pair's figure. No volume, no chart (constraint 9).
 */
import { useMemo, useState, type ReactNode } from 'react';
import type { ModelPackage, UELine } from '@/lib/finance-in-action/contract/types';
import { COPY } from '@/lib/finance-in-action/copy';
import { decimalsFor, formatForRow, formatNumber, isRatioRow } from '@/lib/finance-in-action/format';
import { PERCENT, WATERFALL } from '@/lib/finance-in-action/layout';
import { sourcedInputs, summariseSources } from '@/lib/finance-in-action/model/explain';
import { periodById } from '@/lib/finance-in-action/model/periods';
import type { Registry } from '@/lib/finance-in-action/registry';
import { PER_UNIT_DECIMALS, barValue, extent, perUnitInPackage, plural, sameBasis, type UEBar, type UEView } from '@/lib/finance-in-action/unitEconomics';
import { cn } from '@/lib/utils';
import { PeriodSelect } from './PeriodSelect';
import type { ModelView } from './useModelView';
import type { CellDecoration } from './ModelGrid';

const fill: Record<UELine['role'], string> = {
  revenue: 'bg-primary text-primary-foreground',
  subtotal: 'bg-primary text-primary-foreground',
  cost: 'bg-fia-cost text-primary-foreground',
  unsplit: 'fia-hatch text-foreground',
};

export function UnitEconomicsHeading({ pkg, view: ue }: { pkg: ModelPackage; view: UEView }) {
  const period = periodById(pkg, ue.periodId)?.label ?? ue.periodId;
  return (
    <span>
      {period}, {ue.scale.known ? `${ue.scale.label} ${pkg.unitEconomics.basisLabel}` : ue.scale.label}
    </span>
  );
}

function docsLine(view: ModelView, ue: UEView): string {
  const inputs = ue.bars.filter((b) => b.line.role !== 'subtotal').flatMap((b) => sourcedInputs(view.wb, b.key));
  return summariseSources(inputs).join('; ');
}

export function UnitEconomics({
  view,
  reg,
  ue,
  periodId,
  onPeriod,
  decorate,
  barNote,
  onlyMessage = false,
}: {
  view: ModelView;
  reg: Registry;
  ue: UEView;
  periodId: string;
  onPeriod: (id: string) => void;
  /** The lens and edits: marks on a bar and its table row. */
  decorate?: (key: string) => CellDecoration | null;
  /** A delta under a bar's value, after an edit. */
  barNote?: (bar: UEBar) => ReactNode;
  /** No period has a volume: show the one line and nothing else (constraint 9). */
  onlyMessage?: boolean;
}) {
  const { pkg, wb } = view;
  const units = plural(pkg.unitEconomics.unit);
  const periods = pkg.unitEconomics.periods.map((id) => periodById(pkg, id)).filter((p): p is NonNullable<typeof p> => !!p);
  const [driverOf, setDriverOf] = useState<string | null>(null);
  const { lo, hi } = useMemo(() => extent(ue.bars), [ue.bars]);
  const range = hi - lo || 1;
  const y = (v: number) => ((hi - v) / range) * PERCENT;
  const pairs = pkg.meta.pair.map((t) => reg.company(t)).map((c, i) => ({ ticker: pkg.meta.pair[i], pkg: c?.pkg ?? null }));
  const revenueRow = wb.row(pkg.unitEconomics.lines[0]?.rowRef ?? '');
  const periodLabel = periodById(pkg, periodId)?.label ?? periodId;
  const denomCell = ue.denominator.key ? wb.cell(ue.denominator.key) : undefined;
  const openLine = ue.bars.find((b) => b.line.id === driverOf)?.line;

  if (onlyMessage) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm font-medium text-foreground" role="status">
        {COPY.ueNotAvailable}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          <UnitEconomicsHeading pkg={pkg} view={ue} />
        </p>
        <PeriodSelect label="Period" periods={periods} value={periodId} onChange={onPeriod} />
      </div>

      {!ue.available ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm font-medium text-foreground" role="status">
          {COPY.ueNotAvailable}
        </p>
      ) : (
        <>
          <p className="max-w-3xl text-sm text-muted-foreground">{COPY.ueIntro(units)}</p>
          {pkg.meta.provenance !== 'filings' && (
            <p role="note" className="rounded-md border border-dashed border-foreground/40 bg-muted/60 px-3 py-2 text-xs text-foreground">
              These lines are not from filings. Their sources: {docsLine(view, ue) || 'none named'}. They are{' '}
              {pkg.meta.provenance === 'synthetic' ? 'SYNTHETIC, invented for the viewer' : 'a development fixture'}. The hatched bar is a remainder worked here, not a
              reported line.
            </p>
          )}

          <div className="overflow-x-auto rounded-md border border-border" role="region" aria-label={`Unit economics chart, ${periodLabel}, scrolls sideways`}>
            <ol className="flex min-w-max gap-0.5 px-2 pb-2 pt-3">
              {ue.bars.map((bar) => {
                const top = bar.from === null || bar.to === null ? null : y(Math.max(bar.from, bar.to));
                const height = bar.from === null || bar.to === null ? null : (Math.abs(bar.from - bar.to) / range) * PERCENT;
                const deco = decorate?.(bar.key) ?? null;
                const selected = view.selected === bar.key;
                return (
                  <li key={bar.line.id} className={cn('flex flex-col rounded-sm', deco?.className, deco?.flash && 'fia-flash')} style={{ width: `${WATERFALL.columnRem}rem` }}>
                    <button
                      type="button"
                      onClick={() => view.select(bar.key)}
                      aria-pressed={selected}
                      aria-label={`${bar.line.label}: ${barValue(bar)} ${ue.scale.label} per ${pkg.unitEconomics.unit}${deco?.label ? `, ${deco.label}` : ''}`}
                      className={cn('relative block w-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected && 'ring-2 ring-ring')}
                      style={{ height: WATERFALL.plotHeight }}
                    >
                      {top !== null && height !== null && (
                        <span
                          className={cn('absolute left-1/2 flex -translate-x-1/2 items-start justify-center rounded-t-[4px] pt-1 text-xs font-semibold tabular-nums', fill[bar.line.role])}
                          style={{ top: `${top}%`, height: `${height}%`, width: `${WATERFALL.barWidthPct}%`, minHeight: '1.5rem' }}
                        >
                          <span className={cn(bar.line.role === 'unsplit' && 'rounded-sm bg-background px-1')}>{barValue(bar)}</span>
                        </span>
                      )}
                      {deco?.glyph && (
                        <span aria-hidden="true" className="absolute left-1 top-0 text-xs text-foreground">
                          {deco.glyph}
                        </span>
                      )}
                    </button>
                    {barNote?.(bar)}
                    <span className="mt-2 px-1 text-xs font-semibold leading-snug text-foreground">{bar.line.label}</span>
                    {bar.line.role === 'unsplit' ? (
                      <span className="px-1 text-[11px] leading-snug text-muted-foreground">Contains: {bar.line.contains?.join(', ')}</span>
                    ) : bar.line.driver ? (
                      <button
                        type="button"
                        onClick={() => setDriverOf(driverOf === bar.line.id ? null : bar.line.id)}
                        aria-expanded={driverOf === bar.line.id}
                        className="min-h-11 px-1 text-left text-[11px] leading-snug text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {bar.line.driver.description}
                      </button>
                    ) : (
                      <span className="px-1 text-[11px] text-muted-foreground">{bar.line.role === 'subtotal' ? 'Subtotal' : ''}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground" aria-label="Unit economics legend">
            <li className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-4 rounded-sm bg-primary" aria-hidden="true" /> Revenue and subtotals
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-4 rounded-sm bg-fia-cost" aria-hidden="true" /> Cost line, named in the note
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="fia-hatch inline-block h-3 w-4 rounded-sm" aria-hidden="true" /> Not split in the note: hatched, never shared out across the named lines
            </li>
            <li className="text-muted-foreground">
              {COPY.ueRounding} Costs are in brackets. {ue.scale.known ? `${ue.scale.label} per ${pkg.unitEconomics.unit}.` : ''}
            </li>
          </ul>

          {openLine?.driver && (
            <div className="rounded-md border border-border bg-card p-3" role="region" aria-label={`Driver inputs: ${openLine.label}`}>
              <p className="text-sm font-semibold text-foreground">
                {openLine.label}: {openLine.driver.description}
              </p>
              <p className="text-xs text-muted-foreground">Physical unit: {openLine.driver.physicalUnit}</p>
              {openLine.driver.inputRowRefs.length ? (
                <ul className="mt-2 space-y-1">
                  {openLine.driver.inputRowRefs.map((ref) => {
                    const row = wb.row(ref);
                    const key = wb.keyOf(ref, periodId);
                    const v = view.valueOf(ref, periodId);
                    if (!row || !key) return null;
                    return (
                      <li key={ref}>
                        <button
                          type="button"
                          onClick={() => view.select(key)}
                          className="inline-flex min-h-11 items-center gap-2 text-sm text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span>{row.label}</span>
                          <span className="font-semibold tabular-nums">{formatForRow(v, row)}</span>
                          {!isRatioRow(row) && <span className="text-xs text-muted-foreground">{row.unit}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No physical input row: the line is held as a sum per quarter.</p>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[44rem] border-collapse text-sm tabular-nums">
              <caption className="sr-only">Unit economics, {periodLabel}, with totals, drivers, sources and the pair</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="px-3 py-2 font-semibold">Line</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {periodLabel}, {revenueRow?.unit}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {ue.scale.label} per {pkg.unitEconomics.unit}
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">Physical driver</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Source</th>
                  {pairs.map((p) => (
                    <th key={p.ticker} scope="col" className="px-3 py-2 text-right font-semibold">
                      {p.ticker} per {pkg.unitEconomics.unit}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ue.bars.map((bar) => {
                  const row = wb.row(bar.line.rowRef);
                  const docs = bar.line.role === 'subtotal' ? [] : summariseSources(sourcedInputs(wb, bar.key));
                  const deco = decorate?.(bar.key) ?? null;
                  return (
                    <tr
                      key={bar.line.id}
                      className={cn('cursor-pointer border-b border-border/60 align-top hover:bg-muted/40', bar.line.role === 'subtotal' && 'font-semibold', deco?.className)}
                      onClick={() => view.select(bar.key)}
                    >
                      <th scope="row" className="px-3 py-2 text-left font-normal">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            view.select(bar.key);
                          }}
                          className={cn('min-h-11 text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', bar.line.role === 'subtotal' && 'font-semibold')}
                        >
                          {deco?.glyph && <span aria-hidden="true" className="mr-1 text-xs">{deco.glyph}</span>}
                          {bar.line.label}
                        </button>
                      </th>
                      <td className="px-3 py-2 text-right">{row ? formatForRow(bar.total, row) : '—'}</td>
                      <td className="px-3 py-2 text-right">{barValue(bar)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {bar.line.role === 'unsplit' ? `Remainder: ${bar.line.contains?.join(', ')}` : bar.line.driver?.description ?? (bar.line.role === 'subtotal' ? 'Subtotal' : '–')}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {bar.line.role === 'subtotal' ? 'Worked from the lines above' : docs.length ? docs.join('; ') : 'Worked in the model'}
                      </td>
                      {pairs.map((p) => {
                        const v = p.pkg && p.pkg.meta.status === 'published' && sameBasis(pkg, p.pkg, bar.line.id) ? perUnitInPackage(p.pkg, bar.line.id, periodId) : null;
                        const reduces = bar.line.role === 'cost' || bar.line.role === 'unsplit';
                        return (
                          <td key={p.ticker} className="px-3 py-2 text-right">
                            {v === null ? <span className="text-muted-foreground">{COPY.notYetModelled}</span> : formatNumber(reduces ? -v : v, PER_UNIT_DECIMALS)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="bg-muted/40">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    Divided by {ue.denominator.label.toLowerCase()}
                  </th>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(ue.denominator.value, ue.denominator.value === null ? 0 : decimalsFor(ue.denominator.value))} {ue.denominator.unit}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-muted-foreground">
                    {ue.denominator.key ? summariseSources(sourcedInputs(wb, ue.denominator.key)).join('; ') || (denomCell?.kind ?? '') : ''}
                  </td>
                  {pairs.map((p) => (
                    <td key={p.ticker} className="px-3 py-2" />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
