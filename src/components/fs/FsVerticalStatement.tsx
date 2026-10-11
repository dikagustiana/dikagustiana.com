import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFigure, rowAnchor, shortDate, type FsLine } from '@/lib/fs';

const INDENT = ['pl-0', 'pl-4', 'pl-8', 'pl-12'];

/**
 * One vertical statement (SoFP, P&L and OCI, cash flows) as the FS prints it
 * (PRD §A7): label in Indonesian with the English under it, notes, the two
 * years, negatives in parentheses, headers and totals in bold over a rule,
 * totals closed by a double rule. Hovering a row shows the PDF page its
 * figures were read from.
 *
 * Below `md` the table keeps three columns, label and the two years; a row's
 * English label, notes and page fold under its label and open on a tap, so a
 * 375px screen never scrolls sideways.
 */
export function FsVerticalStatement({
  lines,
  periodEnd,
  comparativeEnd,
  caption,
}: {
  lines: FsLine[];
  periodEnd: string;
  comparativeEnd: string;
  caption: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const declared = lines.filter((l) => l.printed_diff_note);
  const mark = new Map(declared.map((l, i) => [l.id, '†'.repeat(i + 1)]));

  return (
    <>
      <table className="w-full border-collapse text-left text-sm text-foreground md:text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-foreground/60">
            {/* Sticky under the site header (top-16), over the rows. */}
            <th scope="col" className="sticky top-16 z-10 bg-background py-2 pr-3 align-bottom text-sm font-semibold">
              <span className="sr-only">Line item</span>
            </th>
            <th scope="col" className="sticky top-16 z-10 hidden w-28 bg-background py-2 pr-3 align-bottom text-sm font-semibold md:table-cell">
              Notes
            </th>
            <th scope="col" className="sticky top-16 z-10 w-px whitespace-nowrap bg-background py-2 pl-2 text-right align-bottom text-sm font-semibold md:w-36">
              {shortDate(periodEnd)}
            </th>
            <th scope="col" className="sticky top-16 z-10 w-px whitespace-nowrap bg-background py-2 pl-2 text-right align-bottom text-sm font-semibold md:w-36">
              {shortDate(comparativeEnd)}
            </th>
            <th scope="col" className="sticky top-16 z-10 hidden w-14 bg-background py-2 pl-3 align-bottom md:table-cell">
              <span className="sr-only">PDF page</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const sum = line.line_type === 'subtotal' || line.line_type === 'total';
            const bold = sum || line.line_type === 'header';
            const isOpen = open.has(line.id);
            const detailId = `${rowAnchor(line)}-detail`;
            const label = line.fsli_slug ? (
              <Link lang="id" to={`/accounting/fsli/${line.fsli_slug}`} className="underline decoration-muted-foreground decoration-dotted underline-offset-4 hover:text-accent hover:decoration-solid">
                {line.label_id}
              </Link>
            ) : (
              <span lang="id">{line.label_id}</span>
            );
            const figureRule = sum ? 'border-t border-foreground/60' : '';
            const totalRule = line.line_type === 'total' ? 'border-b-4 border-double border-foreground/60' : '';
            return (
              <tr
                  key={line.id}
                  id={rowAnchor(line)}
                  className={cn(
                    'group scroll-mt-28 align-top transition-colors hover:bg-muted/30',
                    line.line_type === 'header' && 'border-t border-border',
                  )}
                >
                  <th scope="row" className={cn('py-2 pr-3 text-left', bold ? 'font-semibold' : 'font-normal')}>
                    {/* The tap target sits in the label's own line, so it
                        takes no column of its own at 375px. */}
                    <div className={cn('[overflow-wrap:anywhere]', INDENT[Math.min(line.indent, INDENT.length - 1)])}>
                      {label}
                      {mark.get(line.id) && <sup className="ml-0.5 text-muted-foreground">{mark.get(line.id)}</sup>}
                      <button
                        type="button"
                        onClick={() => toggle(line.id)}
                        aria-expanded={isOpen}
                        aria-controls={detailId}
                        aria-label={`${isOpen ? 'Hide' : 'Show'} English label, notes and page for ${line.label_id}`}
                        className="ml-1 inline-flex rounded align-middle text-muted-foreground hover:text-foreground md:hidden"
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} aria-hidden />
                      </button>
                      <div className="hidden text-sm font-normal text-muted-foreground md:block">{line.label_en}</div>
                    </div>
                    {isOpen && (
                      <div id={detailId} className={cn('mt-1 space-y-0.5 text-sm font-normal text-muted-foreground md:hidden', INDENT[Math.min(line.indent, INDENT.length - 1)])}>
                        <div>{line.label_en}</div>
                        {line.notes_ref && <div>Notes {line.notes_ref}</div>}
                        <div>p.{line.source_page}</div>
                      </div>
                    )}
                  </th>
                  <td className="hidden py-2 pr-3 pt-2.5 text-sm text-muted-foreground md:table-cell">{line.notes_ref}</td>
                  <td className={cn('whitespace-nowrap py-2 pl-2 text-right tabular-nums', bold && 'font-semibold')}>
                    <span className={cn('inline-block min-w-full pt-0.5', figureRule, totalRule)}>{formatFigure(line.value_cy)}</span>
                  </td>
                  <td className={cn('whitespace-nowrap py-2 pl-2 text-right tabular-nums', bold && 'font-semibold')}>
                    <span className={cn('inline-block min-w-full pt-0.5', figureRule, totalRule)}>{formatFigure(line.value_py)}</span>
                  </td>
                  <td className="hidden py-2 pl-3 text-right text-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:table-cell">
                    p.{line.source_page}
                  </td>
                </tr>
            );
          })}
        </tbody>
      </table>
      {declared.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {declared.map((l) => (
            <li key={l.id}>
              <span className="mr-1">{mark.get(l.id)}</span>
              {l.label_en}: {l.printed_diff_note}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
