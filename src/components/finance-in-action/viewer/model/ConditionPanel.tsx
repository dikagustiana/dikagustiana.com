/**
 * "Why this link matters" (brief §5.3): each section 05 condition the model
 * informs, by name, with its decision rule as section 05 states it, one line
 * on what the model supplies, and the sub-industry's place on the chain map.
 */
import { Link } from 'react-router-dom';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { chainMapHref, positionOf } from '@/lib/finance-in-action/chain';
import { conditionHref, conditionOf, conditionShort } from '@/lib/finance-in-action/conditions';
import type { SubIndustry } from '@/lib/finance-in-action/registry';

const UNSTATED = 'The package does not yet say what this model supplies to this condition.';

export function ConditionPanel({ pkg, subIndustry }: { pkg: ModelPackage; subIndustry: SubIndustry | undefined }) {
  const position = positionOf(pkg.meta.chainStage);
  return (
    <div className="space-y-5">
      {pkg.meta.conditionIds.map((n) => {
        const c = conditionOf(n);
        if (!c) return null;
        return (
          <article key={n} className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              <Link to={conditionHref(n)} className="underline-offset-4 hover:text-accent hover:underline">
                {conditionShort(n)}: {c.title}
              </Link>
            </h3>
            <blockquote className="border-l-2 border-foreground/30 pl-3 text-sm text-foreground">{c.rule}</blockquote>
            <p className="text-sm text-muted-foreground">{pkg.meta.conditionNotes?.[String(n)] ?? UNSTATED}</p>
          </article>
        );
      })}
      <Link
        to={chainMapHref(pkg.meta.chainStage)}
        className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
      >
        Show {subIndustry?.unitNoun ?? subIndustry?.name ?? pkg.meta.subIndustry} on the chain map
        {position ? ` (${position.label})` : ''}
      </Link>
    </div>
  );
}
