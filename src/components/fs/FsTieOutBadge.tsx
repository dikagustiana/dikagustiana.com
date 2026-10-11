import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFigure, tieOut, type FsCheck } from '@/lib/fs';

/**
 * The tie-out badge (PRD §A7), read from the latest run in fs_check: how many
 * checks the stored figures passed, over which PDF pages. A published period
 * cannot show a failure, since publishing refuses one; a draft can, and says
 * how many. The run itself opens underneath, rule by rule.
 */
export function FsTieOutBadge({ run, pages }: { run: FsCheck[]; pages: string }) {
  const t = tieOut(run);
  if (t.rules === 0) return null;
  const ok = t.failed === 0;
  const failures = run.filter((c) => !c.passed);
  const shown = ok ? run : [...failures, ...run.filter((c) => c.passed)];

  return (
    <div className="space-y-2">
      <p
        className={cn(
          'inline-flex items-start gap-2 rounded-md border px-3 py-1.5 text-sm',
          ok ? 'border-border bg-card text-foreground' : 'border-destructive/40 bg-destructive/5 text-foreground',
        )}
      >
        {ok ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-section-green" aria-hidden />
        ) : (
          <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        )}
        {ok ? (
          <span>
            Ties to audited FS — {t.rules} checks passed{pages && ` · ${pages}`}
          </span>
        ) : (
          <span>
            {t.failed} {t.failed === 1 ? 'check' : 'checks'} failing, of {t.rules}
          </span>
        )}
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">See the checks</summary>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Each check re-adds the printed figures on the database&rsquo;s own copy of the statements: every subtotal
          against its rows, the balance sheet against itself, profit or loss from revenue to its last line, and
          the statements against each other.
          {t.declared > 0 &&
            ` ${t.declared} of them record a difference the issuer printed between a subtotal and its rows; each passes at exactly that difference and no other.`}
        </p>
        <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">The latest tie-out run, one row per check</caption>
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2 font-semibold">Check</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Expected</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Actual</th>
                <th scope="col" className="px-3 py-2 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.rule_id} className="border-b border-border/60 align-top last:border-0">
                  <td className="px-3 py-1.5">{c.description}</td>
                  <td className="hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">{formatFigure(c.expected)}</td>
                  <td className="hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">{formatFigure(c.actual)}</td>
                  <td className="px-3 py-1.5">{c.passed ? 'Passed' : 'Failed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
