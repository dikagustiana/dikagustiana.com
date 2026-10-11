import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFsLinesForSlug } from '@/hooks/queries/useFs';
import { FS_TABS, formatFigure, rowAnchor, rowsForSlug, shortDate, unitLine } from '@/lib/fs';

/**
 * A line-item page's figures, read from the audited statement row linked to it
 * (discovery §19 item 2): the row the tie-out checks passed, not the old
 * fsli_pages figures. A heading brings the rows printed under it. A page no
 * published statement row links to shows no figures.
 */
export function FsliStatementRows({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useFsLinesForSlug(slug);

  if (isLoading) {
    return (
      <div className="mb-6 max-w-2xl space-y-2" aria-hidden>
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        The figures could not be loaded just now.{' '}
        <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </p>
    );
  }
  if (!data) return null;

  const rows = rowsForSlug(data.lines, slug);
  if (rows.length === 0) return null;
  const { period } = data;
  const first = rows[0];
  const statement = FS_TABS.find((t) => t.key === first.statement)!;
  const unit = unitLine(period.unit, period.currency);
  const pages = [...new Set(rows.map((r) => r.source_page))].sort((a, b) => a - b);
  const viewer = `/accounting/fsli/${period.company_id}/${period.period_key}${first.statement === 'sofp' ? '' : `?statement=${first.statement}`}#${rowAnchor(first)}`;

  return (
    <figure className="mb-6 max-w-2xl">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/60">
            <th scope="col" className="py-2 pr-3 font-semibold">
              <span className="sr-only">Line item</span>
            </th>
            <th scope="col" className="hidden py-2 pr-3 font-semibold sm:table-cell">Notes</th>
            <th scope="col" className="py-2 pl-2 text-right font-semibold">{shortDate(period.period_end)}</th>
            <th scope="col" className="py-2 pl-2 text-right font-semibold">{shortDate(period.comparative_end)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 align-top last:border-0">
              <th scope="row" className={r.line_type === 'item' ? 'py-2 pr-3 font-normal' : 'py-2 pr-3 font-semibold'}>
                <div className={r.indent > first.indent ? 'pl-4' : ''}>
                  <span lang="id">{r.label_id}</span>
                  <div className="font-normal text-muted-foreground">{r.label_en}</div>
                </div>
              </th>
              <td className="hidden py-2 pr-3 text-muted-foreground sm:table-cell">{r.notes_ref}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{formatFigure(r.value_cy)}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{formatFigure(r.value_py)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        {period.fs_company.short_name}&rsquo;s audited {statement.titleEn.toLowerCase()},{' '}
        {pages.length === 1 ? `p.${pages[0]}` : `pp.${pages[0]}–${pages[pages.length - 1]}`}. {unit.en}.{' '}
        <Link to={viewer} className="text-accent underline-offset-2 hover:underline">
          See it in the statement
        </Link>
      </figcaption>
    </figure>
  );
}
