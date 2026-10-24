/**
 * Subsection A of the Finance in Action index, Capital in Motion
 * (docs/prd/finance-restructure §1 B, §3): the 21 conditions in the order the
 * Capital in Motion page lists them, each with its number, its title (a link
 * to the condition), the Track 1-4 module chips it rests on (left out while
 * the owner has not named them), then the published companies tagged with it
 * as ticker chips linking to their models, or "No company tagged yet".
 */
import { Link } from 'react-router-dom';
import { CONDITIONS, CONDITION_ORDER } from '@/data/capitalConditions';
import { COPY } from '@/lib/finance-in-action/copy';
import { CAPITAL_IN_MOTION_PATH, conditionCode, conditionHref } from '@/lib/finance-in-action/conditions';
import { companiesFor, conditionRowAnchor, moduleChip, type CompaniesByCondition } from '@/lib/finance-in-action/conditionIndex';
import { CAPITAL_IN_MOTION_ANCHOR, modelPath } from '@/lib/finance-in-action/routes';

const ORDERED = CONDITION_ORDER.map((n) => CONDITIONS.find((c) => c.number === n)!);
const CHIP = 'inline-flex items-center rounded border border-border px-1.5 py-0.5 font-mono text-xs';

export function ConditionList({ index }: { index: CompaniesByCondition }) {
  const headingId = `${CAPITAL_IN_MOTION_ANCHOR}-heading`;
  return (
    <section id={CAPITAL_IN_MOTION_ANCHOR} aria-labelledby={headingId} className="mb-12 scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 id={headingId} className="text-xl font-semibold text-foreground">
          {COPY.capitalInMotion}
        </h2>
        <Link to={CAPITAL_IN_MOTION_PATH} className="text-sm text-accent underline-offset-4 hover:underline">
          {COPY.openCapitalInMotion}
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{COPY.capitalInMotionIntro}</p>
      <ol className="divide-y divide-border" data-fia-conditions>
        {ORDERED.map((c) => {
          const companies = companiesFor(index, c.number);
          return (
            <li key={c.number} id={conditionRowAnchor(c.number)} className="grid scroll-mt-24 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 py-3" data-condition={c.number}>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">{conditionCode(c.number)}</span>
              <Link to={conditionHref(c.number)} className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline">
                {c.title}
              </Link>
              {c.modules && c.modules.length > 0 && (
                <ul className="col-start-2 flex flex-wrap gap-1.5" aria-label="Modules">
                  {c.modules.map((m) => (
                    <li key={m} className={`${CHIP} text-muted-foreground`}>
                      {moduleChip(m)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="col-start-2">
                {companies.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Companies">
                    {companies.map((co) => (
                      <li key={co.ticker}>
                        <Link to={modelPath(co.ticker)} title={co.name} className={`${CHIP} font-semibold text-foreground hover:border-accent hover:text-accent`}>
                          {co.ticker}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{COPY.noCompanyTagged}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
