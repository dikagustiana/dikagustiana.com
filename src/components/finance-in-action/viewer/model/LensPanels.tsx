/**
 * The inspector's two later blocks: the chain through the selection, as a
 * clickable breadcrumb from the source filing to profit to owners (brief
 * §5.5), and what changed after an edit, in total and per unit, with Reset
 * (§5.6).
 */
import { Fragment } from 'react';
import { COPY } from '@/lib/finance-in-action/copy';
import { SHEETS, byId } from '@/lib/finance-in-action/constants';
import { formatDeltaForRow, formatForRow, formatPointsDelta, isRatioRow } from '@/lib/finance-in-action/format';
import { chainThrough } from '@/lib/finance-in-action/model/chainPath';
import { PER_UNIT_DECIMALS, perUnitDelta } from '@/lib/finance-in-action/unitEconomics';
import { formatDelta } from '@/lib/finance-in-action/format';
import { LIMITS } from '@/lib/finance-in-action/layout';
import type { ModelView } from './useModelView';

const CHANGES_SHOWN = LIMITS.changes;

export function ChainBreadcrumb({ view }: { view: ModelView }) {
  const { wb, pkg } = view;
  if (!view.lens || !view.selected) return null;
  const keys = chainThrough(wb, view.selected);
  const own = wb.address(view.selected);
  return (
    <nav aria-label="Chain through the selection" className="mt-4 border-t border-border pt-4 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From the filing to profit to owners</h3>
      <ol className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
        {keys.map((k, i) => {
          const a = wb.address(k);
          const row = view.rowOf(k);
          const cell = wb.cell(k);
          const period = a && own && a.periodIndex !== own.periodIndex ? `, ${pkg.periods[a.periodIndex].label}` : '';
          const sheet = a && a.sheet !== 'model' ? ` (${byId(SHEETS, a.sheet)?.label.toLowerCase()})` : '';
          const label = cell?.kind === 'sourced' && cell.source ? `${cell.source.document}: ${row?.label}` : `${row?.label ?? k}${sheet}${period}`;
          return (
            <Fragment key={k}>
              {i > 0 && (
                <li aria-hidden="true" className="text-muted-foreground">
                  →
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => view.select(k)}
                  aria-current={k === view.selected ? 'true' : undefined}
                  className="min-h-11 rounded px-1 text-left text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:font-semibold aria-[current=true]:text-foreground"
                >
                  {label}
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function WhatChanged({ view }: { view: ModelView }) {
  const { wb, pkg } = view;
  if (!view.edits.length) return null;
  const edited = new Set(view.edits.map((e) => e.key));
  const sheetOrder = pkg.sheets.map((s) => s.id);
  const changes = Array.from(view.changed.values())
    .filter((c) => !edited.has(c.key))
    .sort((a, b) => {
      const x = wb.address(a.key)!;
      const y = wb.address(b.key)!;
      return sheetOrder.indexOf(x.sheet) - sheetOrder.indexOf(y.sheet) || x.rowIndex - y.rowIndex || x.periodIndex - y.periodIndex;
    });
  const unit = pkg.unitEconomics.unit;
  return (
    <div className="mt-4 border-t border-border pt-4 text-sm" aria-label={COPY.whatChanged} role="region">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{COPY.whatChanged}</h3>
        <button type="button" onClick={view.reset} className="min-h-11 text-sm text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {COPY.reset}
        </button>
      </div>
      <ul className="mt-1 space-y-1">
        {view.edits.map((e) => {
          const row = view.rowOf(e.key);
          const a = wb.address(e.key);
          if (!row || !a) return null;
          return (
            <li key={e.key} className="text-foreground">
              Your edit: {row.label}, {pkg.periods[a.periodIndex].label}: {formatForRow(e.before, row)} → <span className="font-semibold">{formatForRow(e.after, row)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">It stays in this page; the published model does not change.</p>
      {changes.length ? (
        <table className="mt-2 w-full text-xs tabular-nums">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col" className="py-1 font-medium">Row</th>
              <th scope="col" className="py-1 text-right font-medium">Change</th>
              <th scope="col" className="py-1 text-right font-medium">Per {unit}</th>
            </tr>
          </thead>
          <tbody>
            {changes.slice(0, CHANGES_SHOWN).map((c) => {
              const row = view.rowOf(c.key);
              const a = wb.address(c.key);
              if (!row || !a) return null;
              const per = isRatioRow(row) ? null : perUnitDelta(wb, view.base, view.values, c.key);
              return (
                <tr key={c.key} className="border-t border-border/60">
                  <th scope="row" className="py-1 text-left font-normal">
                    <button
                      type="button"
                      onClick={() => view.select(c.key)}
                      className="min-h-11 text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {row.label}, {pkg.periods[a.periodIndex].label}
                    </button>
                  </th>
                  <td className="py-1 text-right">{isRatioRow(row) ? formatPointsDelta(c.delta) : formatDeltaForRow(c.delta, row)}</td>
                  <td className="py-1 text-right">{per === null ? '—' : formatDelta(per, PER_UNIT_DECIMALS)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="mt-2 text-muted-foreground">Nothing else moved.</p>
      )}
      {changes.length > CHANGES_SHOWN && <p className="mt-1 text-xs text-muted-foreground">and {changes.length - CHANGES_SHOWN} more cells.</p>}
    </div>
  );
}
