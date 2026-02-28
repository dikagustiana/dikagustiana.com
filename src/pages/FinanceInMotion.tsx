/**
 * FinanceInMotion — Section 05: Capital in Motion
 *
 * Institutional. Light theme. 21 conditions across 6 layers.
 * Route: /finance/finance-in-motion
 */

import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { CapitalConditionCard } from '@/components/finance/CapitalConditionCard';
import { CapitalLayerCard } from '@/components/finance/CapitalLayerCard';
import { CONDITIONS, LAYERS, LAYER_ORDER, INDEX_TABLE } from '@/data/capitalConditions';

export default function FinanceInMotion() {
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

      <div className="py-10 container max-w-3xl">
        {/* Header */}
        <div className="mb-6">
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
        <div className="mb-8 pb-6 border-b border-border">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mb-3">
            Premise
          </span>
          <div className="space-y-2.5 text-sm text-foreground leading-snug">
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

        {/* Condition Index */}
        <div className="mb-10">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mb-3">
            Index
          </span>
          <div className="border border-border rounded-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground w-12">No</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Condition</th>
                  <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary/70 w-40">Layer</th>
                </tr>
              </thead>
              <tbody>
                {INDEX_TABLE.map((row) => (
                  <tr
                    key={row.number}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => {
                      document.getElementById(`condition-${row.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums">
                      {String(row.number).padStart(2, '0')}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">{row.title}</td>
                    <td className="px-3 py-1.5 text-primary/70 font-mono">{row.layer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Layers + Conditions */}
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
              {layerConditions.map((condition) => (
                <CapitalConditionCard key={condition.id} condition={condition} />
              ))}
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
