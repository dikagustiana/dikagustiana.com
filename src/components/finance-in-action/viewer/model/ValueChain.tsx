/**
 * "How the business makes money" with the lens off, for a sub-industry with a
 * value chain (docs/prd/2026-10-fia-fixes item 3; lib valueChain.ts): five
 * stages left to right with an arrow between them, a branch below the flow,
 * and in each cell its label, its value and unit, and the same period a year
 * earlier in muted text. A cell the period does not disclose says so: in a
 * quarter, "not disclosed quarterly". Below 768px the stages stack and the
 * arrows turn downward. A cell selects its row in the model, as the grid did.
 */
import { Fragment } from 'react';
import { formatForRow, isMultipleRow, isRatioRow } from '@/lib/finance-in-action/format';
import type { ChainCell, ValueChain as Chain } from '@/lib/finance-in-action/valueChain';
import type { Decoration } from '@/lib/finance-in-action/view/decorate';
import { cn } from '@/lib/utils';
import type { ModelView } from './useModelView';

export const NOT_DISCLOSED_QUARTERLY = 'not disclosed quarterly';
const NOT_DISCLOSED = 'not disclosed';
const NOT_IN_MODEL = 'not in this model';

function Cell({ cell, chain, view, decorate }: { cell: ChainCell; chain: Chain; view: ModelView; decorate?: (key: string) => Decoration | null }) {
  const row = cell.rowRef ? view.wb.row(cell.rowRef) : undefined;
  const unit = row && !isRatioRow(row) && !isMultipleRow(row) ? row.unit : '';
  const words = cell.state === 'absent' ? NOT_IN_MODEL : chain.quarterly ? NOT_DISCLOSED_QUARTERLY : NOT_DISCLOSED;
  const value = cell.state === 'ok' && row ? formatForRow(cell.value, row) : null;
  const deco = cell.key ? decorate?.(cell.key) ?? null : null;
  const selected = !!cell.key && view.selected === cell.key;
  const body = (
    <>
      <span className="block text-xs font-medium text-muted-foreground">{cell.label}</span>
      {value !== null ? (
        <span className="mt-0.5 block font-semibold tabular-nums text-foreground">
          {value}
          {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
        </span>
      ) : (
        <span className="mt-0.5 block text-sm italic text-muted-foreground">{words}</span>
      )}
      {deco?.note && <span className="block text-xs font-semibold tabular-nums text-foreground">{deco.note}</span>}
      {chain.priorPeriod && cell.state !== 'absent' && row && (
        <span className="block text-xs tabular-nums text-muted-foreground">
          {chain.priorPeriod.label}: {cell.prior === null ? (chain.quarterly ? NOT_DISCLOSED_QUARTERLY : NOT_DISCLOSED) : formatForRow(cell.prior, row)}
        </span>
      )}
    </>
  );
  return (
    <li data-chain-cell={cell.def.id} className={cn('rounded-md', deco?.className, selected && 'ring-2 ring-inset ring-ring')}>
      {cell.key ? (
        <button
          type="button"
          onClick={() => view.select(cell.key)}
          aria-pressed={selected}
          aria-label={`${cell.label}${cell.rowLabel && cell.rowLabel !== cell.label ? ` (${cell.rowLabel})` : ''}: ${value ?? words}${deco?.label ? `, ${deco.label}` : ''}`}
          className="block min-h-11 w-full rounded-md px-2 py-1.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {body}
        </button>
      ) : (
        <div className="px-2 py-1.5">{body}</div>
      )}
    </li>
  );
}

export function ValueChain({ chain, view, decorate }: { chain: Chain; view: ModelView; decorate?: (key: string) => Decoration | null }) {
  return (
    <div className="space-y-3">
      <ol className="flex flex-col items-stretch gap-1 md:flex-row" aria-label="Value chain, from the mine to the result">
        {chain.stages.map((s, i) => (
          <Fragment key={s.def.id}>
            {i > 0 && (
              <li aria-hidden="true" className="flex shrink-0 items-center justify-center text-lg text-muted-foreground md:w-6">
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </li>
            )}
            <li className="min-w-0 flex-1 rounded-md border border-border bg-card p-2" data-chain-stage={s.def.id}>
              <h3 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-foreground">{s.def.title}</h3>
              <ul className="space-y-1">
                {s.cells.map((c) => (
                  <Cell key={c.def.id} cell={c} chain={chain} view={view} decorate={decorate} />
                ))}
              </ul>
            </li>
          </Fragment>
        ))}
      </ol>
      {chain.branch.some((c) => c.state !== 'absent') && (
        <div className="flex items-start gap-2 md:w-1/3" data-chain-branch>
          <span aria-hidden="true" className="pt-2 text-lg leading-none text-muted-foreground">
            └
          </span>
          <ul className="min-w-0 flex-1 rounded-md border border-dashed border-border bg-card p-2" aria-label="Beside the flow">
            {chain.branch.map((c) => (
              <Cell key={c.def.id} cell={c} chain={chain} view={view} decorate={decorate} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
