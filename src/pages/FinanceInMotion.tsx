/**
 * FinanceInMotion — Section 05: Capital in Motion
 * View 1: Premise → Layer Cards → 3-column Condition Grid
 */

import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { CapitalConditionCard } from '@/components/finance/CapitalConditionCard';
import { CapitalLayerCard } from '@/components/finance/CapitalLayerCard';
import { CONDITIONS, LAYERS, LAYER_ORDER } from '@/data/capitalConditions';

export default function FinanceInMotion() {
  const navigate = useNavigate();

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Capital in Motion' },
      ]}
    >
      <SEO
        title="Capital in Motion"
        description="Twenty-one structural capital conditions observed in Indonesian markets. Institutional framework for allocators."
      />

      <div className="py-10 container max-w-5xl">
        {/* Header */}
        <div className="mb-5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground block mb-3">
            Section 05
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight leading-tight">
            Capital in Motion
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Twenty-one conditions I wish I understood earlier.
          </p>
        </div>

        {/* Premise */}
        <div className="mb-10 pb-6 border-b border-border">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mb-3">
            Premise
          </span>
          <div className="space-y-2.5 text-sm text-foreground leading-snug max-w-2xl">
            <p>
              If I could speak to my 22-year-old self, I would not tell him to slow down. I would tell him to increase intensity 5x.
            </p>
            <p>
              At 22, I optimized for technical mastery.<br />
              Today, I optimize for capital deployment quality.
            </p>
            <p className="text-muted-foreground">
              Accounting tells you what happened.<br />
              Finance decides what will happen.
            </p>
            <p className="font-medium">
              Finance is capital allocation under structural conditions.
            </p>
          </div>
        </div>

        {/* Layers + Condition Grids */}
        {LAYER_ORDER.map(({ layer, conditionNumbers }) => {
          const layerDef = LAYERS.find((l) => l.key === layer)!;
          const layerConditions = conditionNumbers.map(
            (n) => CONDITIONS.find((c) => c.number === n)!
          );

          return (
            <div key={layer} className="mb-8">
              <CapitalLayerCard
                layerNumber={layerDef.number}
                layerName={layerDef.label}
                narrative={layerDef.narrative}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {layerConditions.map((condition) => (
                  <CapitalConditionCard
                    key={condition.id}
                    condition={condition}
                    onClick={() => navigate(`/finance/capital-in-motion/${condition.number}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Closing */}
        <div className="mt-4 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Allocator credibility requires:</p>
          <p className="text-xs font-mono text-foreground">
            Condition → Equation → Stress scenario → Capital consequence.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
