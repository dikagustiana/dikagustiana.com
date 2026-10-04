/**
 * "How the business makes money" with the lens off (brief §5.3): the driver
 * tree's nodes in a row, for one quarter, each with the same quarter a year
 * earlier beside it. A node whose row is what a sub-industry sells on to
 * another carries a "Feeds X" link to that link's card.
 */
import { Link } from 'react-router-dom';
import type { IndustryLink } from '@/lib/finance-in-action/contract/links';
import { COPY } from '@/lib/finance-in-action/copy';
import { formatForRow, isRatioRow } from '@/lib/finance-in-action/format';
import { linkCardPath } from '@/lib/finance-in-action/links';
import { yearAgo } from '@/lib/finance-in-action/model/periods';
import type { Registry } from '@/lib/finance-in-action/registry';
import type { Decoration } from '@/lib/finance-in-action/view/decorate';
import { cn } from '@/lib/utils';
import type { ModelView } from './useModelView';

export function DriverRow({
  view,
  periodId,
  feeds,
  reg,
  decorate,
}: {
  view: ModelView;
  periodId: string;
  /** Links leaving this company's sub-industry, by the node they attach to. */
  feeds: Map<string, IndustryLink[]>;
  reg: Registry;
  decorate?: (key: string) => Decoration | null;
}) {
  const { pkg, wb } = view;
  const prior = yearAgo(pkg, periodId);
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {pkg.driverTree.nodes.map((node) => {
        const row = wb.row(node.rowRef);
        const key = wb.keyOf(node.rowRef, periodId);
        if (!row || !key) return null;
        const value = view.valueOf(node.rowRef, periodId);
        const before = prior ? view.valueOf(node.rowRef, prior.id) : null;
        const selected = view.selected === key;
        const links = feeds.get(node.id) ?? [];
        const deco = decorate?.(key) ?? null;
        return (
          <li key={node.id} className={cn('rounded-md border border-border bg-card', deco?.className, selected && 'ring-2 ring-inset ring-ring')}>
            <button
              type="button"
              onClick={() => view.select(key)}
              aria-pressed={selected}
              aria-label={`${node.label}: ${formatForRow(value, row)}${deco?.label ? `, ${deco.label}` : ''}`}
              className="block min-h-11 w-full rounded-md p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-xs font-medium text-muted-foreground">{node.label}</span>
              <span className="mt-1 block font-semibold tabular-nums text-foreground">
                {formatForRow(value, row)}
                {!isRatioRow(row) && <span className="ml-1 text-xs font-normal text-muted-foreground">{row.unit}</span>}
              </span>
              {deco?.note && <span className="block text-xs font-semibold tabular-nums text-foreground">{deco.note}</span>}
              <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                {prior ? `${prior.label}: ${formatForRow(before, row)}` : COPY.noComparator}
              </span>
            </button>
            {links.map((l) => (
              <Link
                key={l.id}
                to={linkCardPath(l)}
                className="flex min-h-11 items-center border-t border-border px-3 text-xs font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {COPY.feeds} {reg.subIndustry(l.to)?.name ?? l.to}
              </Link>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
