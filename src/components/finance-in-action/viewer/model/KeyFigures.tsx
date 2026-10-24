/**
 * The key-figure cards (chain view, PRD D-M1, PROMPT-site §3.2): operating
 * figures, never market data. Each card states its unit and its period; the
 * change on the same period a year earlier sits beside it as a pill, in words
 * as well as a sign. A role the model does not carry says so and shows no
 * number. Every figure comes from lib/finance-in-action/keyFigures.ts. One
 * low row from 1024px up (sheet-first PRD D-S9), so the model fits the first
 * screen.
 */
import { formatNumber } from '@/lib/finance-in-action/format';
import { KEY_FIGURE_WORDS, yearOnYearText, type KeyFigure, type KeyFigureSet } from '@/lib/finance-in-action/keyFigures';

export const KEY_FIGURES_LABEL = 'Key figures';

function Card({ figure: f }: { figure: KeyFigure }) {
  const yoy = yearOnYearText(f);
  return (
    <li className="flex min-w-0 flex-col rounded-md border border-border bg-card px-3 py-0.5" data-key-figure={f.role}>
      <span className="flex items-baseline justify-between gap-2 text-[11px] leading-4">
        <span className="truncate font-semibold uppercase tracking-wider text-muted-foreground" title={f.title}>
          {f.title}
        </span>
        <span className="shrink-0 text-muted-foreground">{f.periodLabel}</span>
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 leading-6">
        {f.state === 'ok' ? (
          <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">{formatNumber(f.value, f.decimals)}</span>
        ) : (
          <span className="truncate text-sm font-medium text-foreground">{KEY_FIGURE_WORDS[f.state]}</span>
        )}
        {f.unit && (
          <span className="min-w-0 max-w-full truncate text-xs text-muted-foreground" title={f.unit}>
            {f.unit}
          </span>
        )}
        {yoy && (
          <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-border px-2 text-[11px] font-medium leading-4 tabular-nums text-foreground" title={`Against ${f.yearAgoLabel}`}>
            {yoy}
            <span className="sr-only">, against {f.yearAgoLabel}</span>
          </span>
        )}
      </span>
    </li>
  );
}

export function KeyFigures({ set }: { set: KeyFigureSet }) {
  return (
    <section aria-label={KEY_FIGURES_LABEL} className="mb-1.5">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {set.figures.map((f) => (
          <Card key={f.role} figure={f} />
        ))}
      </ul>
    </section>
  );
}
