/**
 * The inspector (brief §5.3): the selected cell's value and kind, how it is
 * built in words, its tie-out, and the source of each sourced input (issuer,
 * document, period, note, page, XBRL concept). Later layers add the chain
 * breadcrumb and what changed below.
 *
 * On a wide screen it sits beside the page; on a narrow one it opens as a
 * panel along the bottom edge, with no animation, and closes with its button.
 */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { CELL_KINDS, SHEETS, TIE_OUT_STATUSES, byId } from '@/lib/finance-in-action/constants';
import { formatForRow, formatNumber, decimalsFor, isRatioRow } from '@/lib/finance-in-action/format';
import { explainFormula, sourceLine, sourcedInputs } from '@/lib/finance-in-action/model/explain';
import { cn } from '@/lib/utils';
import type { ModelView } from './useModelView';

const SOURCES_SHOWN = 8;
export const INSPECTOR_EMPTY = 'Select a cell, a node or a bar to see how it is built and where it comes from.';

export function Inspector({ view, children }: { view: ModelView; children?: ReactNode }) {
  const key = view.selected;
  const open = !!key;
  return (
    <aside
      aria-label="Inspector"
      className={cn(
        'border-border bg-popover text-popover-foreground',
        // Narrow screens: a panel on the bottom edge, only while something is selected.
        open ? 'fixed inset-x-0 bottom-0 z-40 max-h-[55vh] overflow-y-auto border-t p-4 shadow-lg' : 'hidden',
        // Wide screens: beside the page, always there.
        'xl:sticky xl:inset-auto xl:top-4 xl:z-auto xl:block xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:rounded-md xl:border xl:p-4 xl:shadow-none',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Inspector</h2>
        {open && (
          <button
            type="button"
            onClick={() => view.select(null)}
            aria-label="Close the inspector"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {key ? <CellDetail view={view} cellKey={key} /> : <p className="text-sm text-muted-foreground">{INSPECTOR_EMPTY}</p>}
      {children}
    </aside>
  );
}

function CellDetail({ view, cellKey }: { view: ModelView; cellKey: string }) {
  const { wb, values, pkg } = view;
  const a = wb.address(cellKey);
  const cell = wb.cell(cellKey);
  const row = view.rowOf(cellKey);
  if (!a || !cell || !row) return null;
  const period = pkg.periods[a.periodIndex];
  const kind = byId(CELL_KINDS, cell.kind);
  const v = values.get(cellKey);
  const value = typeof v === 'number' ? v : null;
  const explanation = cell.kind === 'formula' ? explainFormula(wb, cellKey, values) : null;
  const inputs = sourcedInputs(wb, cellKey);
  const tie = cell.tieOut;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-medium text-foreground">
          {row.label}, {period.label}
        </p>
        <p className="text-xs text-muted-foreground">{byId(SHEETS, a.sheet)?.label} sheet</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {formatForRow(value, row)}
          {!isRatioRow(row) && <span className="ml-1 text-sm font-normal text-muted-foreground">{row.unit}</span>}
        </p>
        <p className="mt-1">
          <span className={cn('mr-2 inline-flex rounded-sm border border-border px-1.5 py-0.5 text-xs font-medium', kind?.className)}>{kind?.label}</span>
          <span className="text-muted-foreground">{kind?.means}</span>
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it is built</h3>
        {explanation ? (
          <>
            <p className="mt-1 text-foreground">{explanation.words}</p>
            <p className="mt-0.5 tabular-nums text-muted-foreground">= {explanation.withValues}</p>
          </>
        ) : cell.kind === 'sourced' && cell.source ? (
          <p className="mt-1 text-foreground">Read out of {sourceLine(cell.source)}.</p>
        ) : (
          <p className="mt-1 text-foreground">{cell.note ?? kind?.means}</p>
        )}
        {cell.kind !== 'formula' && cell.note && cell.kind !== 'missing' && cell.kind !== 'assumption' && <p className="mt-1 text-muted-foreground">{cell.note}</p>}
      </div>

      {tie && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tie-out</h3>
          <p className="mt-1 text-foreground">
            <span className="font-semibold">{byId(TIE_OUT_STATUSES, tie.status)?.label}.</span> {tie.sourceText}:{' '}
            <span className="tabular-nums">{formatNumber(tie.externalValue, decimalsFor(tie.externalValue))}</span>. Difference{' '}
            <span className="tabular-nums">{formatNumber(tie.difference, decimalsFor(tie.externalValue))}</span>.
          </p>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inputs and their sources</h3>
        {inputs.length ? (
          <ul className="mt-1 space-y-1.5">
            {inputs.slice(0, SOURCES_SHOWN).map((i) => (
              <li key={i.key}>
                <span className="font-medium text-fia-sourced">
                  {i.label}, {i.period}
                </span>
                <span className="block text-muted-foreground">{sourceLine(i.source)}</span>
              </li>
            ))}
            {inputs.length > SOURCES_SHOWN && <li className="text-muted-foreground">and {inputs.length - SOURCES_SHOWN} more sourced inputs.</li>}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">No sourced input: this value is set or worked within the model.</p>
        )}
      </div>
    </div>
  );
}
