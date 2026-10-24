/**
 * Related reading (docs/prd/2026-10-fia-fixes item 9), in place of "Why this
 * link matters": one line naming each section 05 condition the model informs,
 * each a link, `Related reading: Capital in Motion 03 · Commodity Windfall |
 * 09 · Strategic Downstreaming`, and the sub-industry's place on the chain
 * map. The decision rule and the note on what the model supplies were written
 * for the builder and are no longer drawn. It sits after the last section.
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { chainMapHref, positionOf } from '@/lib/finance-in-action/chain';
import { conditionCode, conditionHref, conditionOf, conditionShort } from '@/lib/finance-in-action/conditions';
import type { SubIndustry } from '@/lib/finance-in-action/registry';

export const RELATED_READING = 'Related reading';

const LINK = 'underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ConditionPanel({ pkg, subIndustry }: { pkg: ModelPackage; subIndustry: SubIndustry | undefined }) {
  const position = positionOf(pkg.meta.chainStage);
  const conditions = pkg.meta.conditionIds.filter((n) => conditionOf(n));
  return (
    <div className="space-y-1 text-sm text-muted-foreground" data-fia-related>
      {conditions.length > 0 && (
        <p>
          {RELATED_READING}:{' '}
          {conditions.map((n, i) => (
            <Fragment key={n}>
              {i > 0 && ' | '}
              <Link to={conditionHref(n)} className={LINK}>
                {i === 0 ? conditionShort(n) : conditionCode(n)} · {conditionOf(n)!.title}
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
