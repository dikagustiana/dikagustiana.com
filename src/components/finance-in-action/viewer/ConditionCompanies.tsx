/**
 * "Companies exhibiting this condition" on a Capital in Motion condition page
 * (docs/prd/finance-restructure §1 C, §3): a row of company cards, ticker,
 * name, sub-industry and the period of the package, each linking to the
 * model page at its "Conditions present" line. Read from the published
 * packages' meta.conditionIds through the live registry (useLiveRegistry),
 * which imports no fixture, so the block is the same in every build.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRegistry } from '@/lib/finance-in-action/useLiveRegistry';
import { companiesByCondition, companiesFor } from '@/lib/finance-in-action/conditionIndex';
import { periodLabel } from '@/lib/finance-in-action/registry';
import { CONDITIONS_ANCHOR, modelPath } from '@/lib/finance-in-action/routes';
import { COPY } from '@/lib/finance-in-action/copy';

export const COMPANIES_EXHIBITING = 'Companies exhibiting this condition';

export function ConditionCompanies({ number }: { number: number }) {
  const { reg, published } = useLiveRegistry();
  const companies = useMemo(() => companiesFor(companiesByCondition(reg), number), [reg, number]);
  return (
    <section aria-labelledby="condition-companies" className="mt-16" data-condition-companies>
      <h2 id="condition-companies" className="text-2xl font-semibold text-foreground mb-6">
        {COMPANIES_EXHIBITING}
      </h2>
      {published === 'loading' ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : published === 'error' ? (
        <p className="text-sm text-muted-foreground">The company models could not be read just now.</p>
      ) : companies.length === 0 ? (
        <p className="text-sm text-muted-foreground">{COPY.noCompanyTagged}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((c) => {
            const period = periodLabel(c.pkg, c.latestQuarter);
            return (
              <li key={c.ticker}>
                <Link
                  to={`${modelPath(c.ticker)}#${CONDITIONS_ANCHOR}`}
                  className="block h-full rounded-lg border border-border p-4 hover:border-primary/40"
                >
                  <span className="font-mono text-sm font-semibold text-foreground">{c.ticker}</span>
                  <span className="mt-1 block font-medium text-foreground">{c.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {reg.subIndustry(c.subIndustry)?.name ?? c.subIndustry}
                    {period ? ` · As of ${period}` : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
