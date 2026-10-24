/**
 * FinanceInMotion — Capital in Motion, under Finance in Action
 * (/finance/finance-in-action/capital-in-motion; docs/prd/finance-restructure §1 C).
 * View 1: Clean continuous editorial list of all 21 conditions.
 *
 * The h1 and its subtitle lead straight into the list. The premise block that
 * sat between them was removed on the owner's instruction (October 2026
 * sweep, D7); if the owner writes a new one it arrives as
 * docs/sweep-2026-10/copy/capital-in-motion-premise.md and is mounted here as
 * one prose block.
 */

import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { CapitalConditionCard } from '@/components/finance/CapitalConditionCard';
import { CONDITIONS, LAYER_ORDER } from '@/data/capitalConditions';
import { conditionHref } from '@/lib/finance-in-action/conditions';
import { INDEX_PATH } from '@/lib/finance-in-action/routes';
import { Separator } from '@/components/ui/separator';

/** Flat ordered list matching the spec display order */
const DISPLAY_ORDER = LAYER_ORDER.flatMap((l) => l.conditionNumbers);

export default function FinanceInMotion() {
  const navigate = useNavigate();

  const orderedConditions = DISPLAY_ORDER.map(
    (n) => CONDITIONS.find((c) => c.number === n)!
  );

  return (
    <PageLayout
      width="reading"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Finance in Action', path: INDEX_PATH },
        { label: 'Capital in Motion' },
      ]}
    >
      <SEO
        title="Capital in Motion"
        description="Twenty-one structural capital conditions observed in Indonesian markets. Institutional framework for allocators."
      />

      <div className="py-10 container max-w-3xl">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight leading-tight">
            Capital in Motion
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Twenty-one conditions I wish I understood earlier.
          </p>
        </div>

        {/* Condition List */}
        <div>
          {orderedConditions.map((condition, i) => (
            <div key={condition.id}>
              <CapitalConditionCard
                condition={condition}
                onClick={() => navigate(conditionHref(condition.number))}
              />
              {i < orderedConditions.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        {/* Closing */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Allocator credibility requires:</p>
          <p className="text-xs font-mono text-foreground">
            Condition → Equation → Stress scenario → Capital consequence.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
