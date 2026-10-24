/**
 * The status line under the grid (sheet-first PRD R2.6): the selected cell's
 * row and period in words, and its sheet (the cell's own, wherever it was
 * selected from); with Connections on, how many cells feed it and how many
 * it feeds, at the lens's depth. On the Checks sheet, the check and the
 * column the cursor is on.
 */
import { SHEETS, byId } from '@/lib/finance-in-action/constants';
import { COPY } from '@/lib/finance-in-action/copy';
import type { ModelView } from './useModelView';

export function StatusLine({ view, sheetLabel, place }: { view: ModelView; sheetLabel: string; place?: { row: string; column: string } | null }) {
  const { wb, pkg, selected } = view;
  const a = !place && selected ? wb.address(selected) : undefined;
  const row = a ? pkg.sheets.find((s) => s.id === a.sheet)?.rows[a.rowIndex] : undefined;
  const words = place
    ? COPY.statusLine(place.row, place.column, sheetLabel)
    : a && row
      ? COPY.statusLine(row.label, pkg.periods[a.periodIndex].label, byId(SHEETS, a.sheet)?.label ?? sheetLabel)
      : COPY.statusNone(sheetLabel);
  const lens = view.lens && selected ? COPY.statusLens(wb.graph.precedents(selected, view.depth).length, wb.graph.dependents(selected, view.depth).length) : null;
  return (
    <p data-fia-status className="min-w-0 truncate text-xs text-muted-foreground">
      {words}
      {lens && <span className="text-foreground"> · {lens}</span>}
    </p>
  );
}
