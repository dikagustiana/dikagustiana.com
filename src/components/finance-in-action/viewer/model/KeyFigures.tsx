/**
 * The key-figure cards (chain view, PRD D-M1, PROMPT-site §3.2): operating
 * figures, never market data. Each card states its unit and its period; the
 * change on the same period a year earlier sits beside it as a pill, in words
 * as well as a sign. A role the model does not carry says so and shows no
 * number. Every figure comes from lib/finance-in-action/keyFigures.ts.
 */
import { formatNumber } from '@/lib/finance-in-action/format';
import { KEY_FIGURE_WORDS, yearOnYearText, type KeyFigure, type KeyFigureSet } from '@/lib/finance-in-action/keyFigures';

export const KEY_FIGURES_LABEL = 'Key figures';

function Card({ figure: f }: { figure: KeyFigure }) {
  const yoy = yearOnYearText(f);
  return (
    <li className="flex min-w-0 flex-col rounded-md border border-border bg-card p-3" data-key-figure={f.role}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.title}</span>
      {f.state === 'ok' ? (
        <span className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{formatNumber(f.value, f.decimals)}</span>
      ) : (
        <span className="mt-1 text-sm font-medium text-foreground">{KEY_FIGURE_WORDS[f.state]}</span>
      )}
      {f.unit && <span className="text-xs text-muted-foreground">{f.unit}</span>}
      <span className="mt-auto pt-2 text-xs text-muted-foreground">{f.periodLabel}</span>
      {yoy && (
        <span
          className="mt-1 inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium tabular-nums text-foreground"
          title={`Against ${f.yearAgoLabel}`}
        >
          {yoy}
          <span className="sr-only">, against {f.yearAgoLabel}</span>
        </span>
      )}
    </li>
  );
}

export function KeyFigures({ set }: { set: KeyFigureSet }) {
  return (
    <section aria-label={KEY_FIGURES_LABEL} className="mb-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {set.figures.map((f) => (
          <Card key={f.role} figure={f} />
        ))}
      </ul>
    </section>
  );
}
