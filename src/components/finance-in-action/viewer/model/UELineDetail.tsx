/**
 * In the inspector, when the selected cell is a unit-economics line in a
 * period with a volume: the line per unit, its physical driver, and the
 * driver's input rows with their own values and units (brief §5.4).
 */
import { formatForRow, isRatioRow } from '@/lib/finance-in-action/format';
import { barValue, type UEView } from '@/lib/finance-in-action/unitEconomics';
import type { ModelView } from './useModelView';

export function UELineDetail({ view, ue }: { view: ModelView; ue: UEView }) {
  const key = view.selected;
  const bar = key ? ue.bars.find((b) => b.key === key) : undefined;
  if (!bar || !ue.available) return null;
  const { pkg, wb } = view;
  return (
    <div className="mt-4 border-t border-border pt-4 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit economics</h3>
      <p className="mt-1 text-foreground">
        <span className="font-semibold tabular-nums">{barValue(bar)}</span> {ue.scale.label} per {pkg.unitEconomics.unit}: {bar.line.label} divided by{' '}
        {ue.denominator.label.toLowerCase()}.
      </p>
      {bar.line.contains && <p className="mt-1 text-muted-foreground">Not split in the note. Contains {bar.line.contains.join(', ')}.</p>}
      {bar.line.driver && (
        <>
          <p className="mt-1 text-foreground">
            Driver: {bar.line.driver.description} ({bar.line.driver.physicalUnit})
          </p>
          <ul className="mt-1 space-y-1">
            {bar.line.driver.inputRowRefs.map((ref) => {
              const row = wb.row(ref);
              const k = wb.keyOf(ref, ue.periodId);
              if (!row || !k) return null;
              return (
                <li key={ref}>
                  <button
                    type="button"
                    onClick={() => view.select(k)}
                    className="inline-flex min-h-11 items-center gap-2 text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row.label}
                    <span className="font-semibold tabular-nums">{formatForRow(view.valueOf(ref, ue.periodId), row)}</span>
                    {!isRatioRow(row) && <span className="text-xs text-muted-foreground">{row.unit}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
