/**
 * Conditions present (docs/prd/finance-restructure §1 D), formerly Related
 * reading (docs/prd/2026-10-fia-fixes item 9), in place of "Why this link
 * matters": one line naming each Capital in Motion condition the company
 * exhibits, `Conditions present: 03 Commodity Windfall · 09 Strategic
 * Downstreaming`, each a link to its condition page under Finance in Action,
 * and the sub-industry's place on the chain map. It sits after the last
 * section, at #fia-conditions, which the condition pages' company cards
 * link to.
 */
import { Fragment, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { chainMapHref, positionOf } from '@/lib/finance-in-action/chain';
import { conditionCode, conditionHref, conditionOf } from '@/lib/finance-in-action/conditions';
import { CONDITIONS_ANCHOR } from '@/lib/finance-in-action/routes';
import type { SubIndustry } from '@/lib/finance-in-action/registry';

export const CONDITIONS_PRESENT = 'Conditions present';

const LINK = 'underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ConditionPanel({ pkg, subIndustry }: { pkg: ModelPackage; subIndustry: SubIndustry | undefined }) {
  const position = positionOf(pkg.meta.chainStage);
  const conditions = pkg.meta.conditionIds.filter((n) => conditionOf(n));
  const { hash } = useLocation();
  // Arriving from a condition page's company card: the line is drawn after the model, so scroll once it exists.
  useEffect(() => {
    if (hash !== `#${CONDITIONS_ANCHOR}`) return;
    const el = document.getElementById(CONDITIONS_ANCHOR);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView();
  }, [hash]);
  return (
    <div id={CONDITIONS_ANCHOR} className="scroll-mt-24 space-y-1 text-sm text-muted-foreground" data-fia-related>
      {conditions.length > 0 && (
        <p>
          {CONDITIONS_PRESENT}:{' '}
          {conditions.map((n, i) => (
            <Fragment key={n}>
              {i > 0 && ' · '}
              <Link to={conditionHref(n)} className={LINK}>
                {conditionCode(n)} {conditionOf(n)!.title}
              </Link>
            </Fragment>
          ))}
        </p>
      )}
      <p>
        <Link to={chainMapHref(pkg.meta.chainStage)} className={LINK}>
          Show {subIndustry?.unitNoun ?? subIndustry?.name ?? pkg.meta.subIndustry} on the chain map
          {position ? ` (${position.label})` : ''}
        </Link>
      </p>
    </div>
  );
}
