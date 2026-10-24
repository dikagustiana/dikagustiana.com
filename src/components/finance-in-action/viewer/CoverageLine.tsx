/**
 * The coverage line under a sub-industry's companies (docs/prd/finance-restructure
 * §3): `4 of 11 modelled · 3 queued · 1 in review · 3 not started`, then the
 * companies not modelled yet, with where each stands, in a collapsed list.
 */
import { coverageLine, slateStatusLabel, type Coverage } from '@/lib/finance-in-action/coverage';

export function CoverageLine({ coverage }: { coverage: Coverage }) {
  if (coverage.total === 0) return null;
  return (
    <div className="mt-2 text-sm text-muted-foreground" data-fia-coverage>
      <p>{coverageLine(coverage)}</p>
      {coverage.pending.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer hover:text-foreground">Not modelled yet ({coverage.pending.length})</summary>
          <ul className="mt-1 space-y-0.5">
            {coverage.pending.map(({ company, status }) => (
              <li key={company.ticker}>
                <span className="font-mono text-foreground">{company.ticker}</span> {company.name} · {slateStatusLabel(status)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
