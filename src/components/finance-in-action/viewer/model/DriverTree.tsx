/**
 * The driver tree with its edges drawn (brief §5.5): operating drivers on the
 * left, through profit, to owners on the right. The edges are the package's
 * tree, each one checked against the formulas when the package loaded
 * (model/checks.ts); the marks on the nodes come from the dependency graph.
 * Edges are drawn here only, never across the grid or the waterfall.
 */
import { useMemo } from 'react';
import { formatForRow, isRatioRow } from '@/lib/finance-in-action/format';
import { TREE } from '@/lib/finance-in-action/layout';
import { treeLayout } from '@/lib/finance-in-action/model/treeLayout';
import type { Decoration } from '@/lib/finance-in-action/view/decorate';
import { cn } from '@/lib/utils';
import type { ModelView } from './useModelView';

const stepX = TREE.nodeWidth + TREE.columnGap;
const stepY = TREE.nodeHeight + TREE.rowGap;

export function DriverTree({
  view,
  periodId,
  decorate,
}: {
  view: ModelView;
  periodId: string;
  decorate: (key: string) => Decoration | null;
}) {
  const { pkg, wb } = view;
  const layout = useMemo(() => treeLayout(pkg.driverTree), [pkg.driverTree]);
  const width = layout.columns * stepX - TREE.columnGap + TREE.padding * 2;
  const height = layout.rows * stepY - TREE.rowGap + TREE.padding * 2;
  const x = (id: string) => TREE.padding + (layout.at.get(id)?.col ?? 0) * stepX;
  const y = (id: string) => TREE.padding + (layout.at.get(id)?.row ?? 0) * stepY;
  const selectedRow = view.selected ? wb.rowRefOf(view.selected) : null;
  const nodeRow = new Map(pkg.driverTree.nodes.map((n) => [n.id, n.rowRef]));

  return (
    <div className="overflow-x-auto rounded-md border border-border" role="region" aria-label="Driver tree, scrolls sideways">
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
          <defs>
            <marker id="fia-arrow" markerUnits="userSpaceOnUse" viewBox={`0 0 ${TREE.arrow} ${TREE.arrow}`} refX={TREE.arrow} refY={TREE.arrow / 2} markerWidth={TREE.arrow} markerHeight={TREE.arrow} orient="auto">
              <path d={`M0 0 L${TREE.arrow} ${TREE.arrow / 2} L0 ${TREE.arrow} Z`} className="fill-muted-foreground" />
            </marker>
          </defs>
          {pkg.driverTree.edges.map((e) => {
            const x1 = x(e.from) + TREE.nodeWidth;
            const y1 = y(e.from) + TREE.nodeHeight / 2;
            const x2 = x(e.to);
            const y2 = y(e.to) + TREE.nodeHeight / 2;
            const mid = (x1 + x2) / 2;
            const touches = selectedRow !== null && (nodeRow.get(e.from) === selectedRow || nodeRow.get(e.to) === selectedRow);
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={`M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                strokeWidth={touches ? TREE.edgeWidth * 2 : TREE.edgeWidth}
                className={touches ? 'stroke-foreground' : 'stroke-muted-foreground/60'}
                markerEnd="url(#fia-arrow)"
              />
            );
          })}
        </svg>
        <ol>
          {pkg.driverTree.nodes.map((node) => {
            const row = wb.row(node.rowRef);
            const key = wb.keyOf(node.rowRef, periodId);
            if (!row || !key) return null;
            const deco = decorate(key);
            const selected = view.selected === key;
            return (
              <li key={node.id} className="absolute" style={{ left: x(node.id), top: y(node.id), width: TREE.nodeWidth, height: TREE.nodeHeight }}>
                <button
                  type="button"
                  onClick={() => view.select(key)}
                  aria-pressed={selected}
                  aria-label={`${node.label}: ${formatForRow(view.valueOf(node.rowRef, periodId), row)}${deco?.label ? `, ${deco.label}` : ''}`}
                  className={cn(
                    'flex h-full w-full flex-col justify-center rounded-md border border-border bg-card px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    deco?.className,
                    selected && 'ring-2 ring-inset ring-ring',
                  )}
                >
                  <span className="truncate text-[11px] font-medium text-muted-foreground">
                    {deco?.glyph && <span aria-hidden="true" className="mr-1 text-foreground">{deco.glyph}</span>}
                    {node.label}
                  </span>
                  <span className="truncate text-sm font-semibold tabular-nums text-foreground">
                    {formatForRow(view.valueOf(node.rowRef, periodId), row)}
                    {!isRatioRow(row) && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{row.unit}</span>}
                  </span>
                  {deco?.note && <span className="text-[10px] tabular-nums text-foreground">{deco.note}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
