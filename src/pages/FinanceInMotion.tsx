/**
 * FinanceInMotion — Section 05: Capital Allocation Framework
 *
 * Institutional. Light theme. Structured layers. No decoration.
 * Route: /finance/finance-in-motion
 */

import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { CapitalConditionCard, type CapitalCondition } from '@/components/finance/CapitalConditionCard';

// ── Condition data ────────────────────────────────────────────────────────────

const CONDITIONS: CapitalCondition[] = [
  {
    id: 'low-growth-idle', number: 1, layer: 'operational',
    title: 'Low Growth with Idle Capacity',
    case: 'Blue Bird',
    tension: 'Idle capacity vs expansion instinct.',
    quantitative: 'Utilization ↓ → Asset Turnover ↓ → ROIC ↓',
    rule: 'Fix productivity before expanding assets.',
  },
  {
    id: 'aggressive-expansion', number: 2, layer: 'operational',
    title: 'Aggressive Expansion with Assumption Distortion',
    case: 'Garuda Indonesia',
    tension: 'Expansion justified by optimistic demand and load factor assumptions.',
    quantitative: 'If utilization or yield misses by 10–15%, fixed obligations remain while EBITDA collapses. Debt/EBITDA can breach 6x within two quarters.',
    rule: 'Stress-test core assumptions before approving expansion.',
  },
  {
    id: 'commodity-windfall', number: 3, layer: 'operational',
    title: 'Commodity Windfall',
    case: 'Adaro Energy Indonesia vs Bukit Asam',
    tension: 'Windfall cash creates illusion of permanent earnings.',
    quantitative: 'Commodity margins can compress 40–60% within 18 months.',
    rule: 'Redeploy windfall to reduce cyclicality.',
  },
  {
    id: 'long-gestation-capex', number: 4, layer: 'balance-sheet',
    title: 'Long-Gestation Capex-Heavy Assets',
    case: 'Pertamina Geothermal Energy',
    tension: 'Short-tenor debt funding long-gestation assets.',
    quantitative: 'Funding tenor avg 5y, asset payback 12y+. Refinancing risk is the primary threat.',
    rule: 'Align funding duration with asset life.',
  },
  {
    id: 'sovereign-risk', number: 5, layer: 'balance-sheet',
    title: 'Sovereign Risk Absorption',
    case: 'Indonesia Investment Authority',
    tension: 'Sovereign vehicles absorb risks private capital will not price.',
    quantitative: 'Blended return targets of 8–10% mask 30–40% sub-commercial risk profiles.',
    rule: 'Transition is achieved by repricing risk.',
  },
  {
    id: 'overexpansion-debt', number: 6, layer: 'balance-sheet',
    title: 'Overexpansion Funded by Debt',
    case: 'Waskita Karya',
    tension: 'Political pressure to build vs balance sheet discipline.',
    quantitative: 'At 4x+ leverage, 15% EBITDA decline triggers covenant breaches.',
    rule: 'Stress leverage under downside EBITDA.',
  },
  {
    id: 'working-capital', number: 7, layer: 'balance-sheet',
    title: 'Working Capital Outpacing Revenue',
    case: 'Indofarma',
    tension: 'Revenue grows on P&L while cash is trapped in receivables.',
    quantitative: 'Every 30-day CCC extension traps ~IDR 200B. Operating cash flow turns negative despite positive EBITDA.',
    rule: 'Cash conversion discipline before scaling.',
  },
  {
    id: 'portfolio-diversification', number: 8, layer: 'portfolio',
    title: 'Portfolio Diversification for Resilience',
    case: 'Astra International',
    tension: 'Conglomerate complexity discount vs structural resilience.',
    quantitative: 'During 2015 commodity downturn, financial services offset 35% of heavy equipment decline. Cross-segment correlation < 0.4.',
    rule: 'Allocate across cycles, not within one dependency.',
  },
  {
    id: 'strategic-downstreaming', number: 9, layer: 'portfolio',
    title: 'Strategic Downstreaming',
    case: 'Vale Indonesia',
    tension: 'Higher value capture per unit but massive upfront capital with uncertain pricing.',
    quantitative: 'HPAL plant IRR at current nickel prices: 8–11%. Strategic option value (EV supply chain positioning) is unpriced in DCF.',
    rule: 'Value optionality alongside IRR.',
  },
  {
    id: 'blended-finance', number: 10, layer: 'portfolio',
    title: 'Blended Finance for Transition',
    case: 'Asian Development Bank — Indonesia Energy Transition Mechanism',
    tension: 'Transition assets cannot generate market-rate returns alone.',
    quantitative: 'Without 20–30% first-loss absorption, private capital requires 300–500bps premium — making projects unviable.',
    rule: 'Engineer the capital stack.',
  },
  {
    id: 'cost-of-capital-shift', number: 11, layer: 'transition',
    title: 'Cost of Capital Regime Shift',
    case: 'Lippo Karawaci',
    tension: 'Projects approved at 12% hurdle become marginal at 15%.',
    quantitative: '200bps rate increase compresses property margins by 15–25%. Break-even extends 18+ months on levered projects.',
    rule: 'Reprice hurdle rate dynamically.',
  },
  {
    id: 'duration-mismatch', number: 12, layer: 'transition',
    title: 'Duration Mismatch',
    case: 'PLN',
    tension: '25-year PPAs funded by 5–7 year debt.',
    quantitative: 'Refinancing risk materializes every 5 years. Each cycle exposes to prevailing rates, currency, and sovereign credit conditions.',
    rule: 'Match tenor with asset life.',
  },
  {
    id: 'optionality-efficiency', number: 13, layer: 'valuation',
    title: 'Optionality vs Efficiency',
    case: 'Bank Central Asia',
    tension: 'Excess liquidity looks inefficient in benign environments. During crises, it becomes a competitive weapon.',
    quantitative: 'Excess liquidity buffer (~IDR 100T+) generates sub-optimal returns normally but provides 200–400bps ROE advantage during stress.',
    rule: 'Price optionality explicitly.',
  },
  {
    id: 'capital-recycling', number: 14, layer: 'valuation',
    title: 'Capital Recycling Discipline',
    case: 'Saratoga Investama Sedaya',
    tension: 'Holding mature assets with declining marginal returns traps capital below opportunity cost.',
    quantitative: 'Redeployment from mature (8–12% expected) into growth-stage (18–25% target) compounds portfolio IRR by 300–500bps over 10 years.',
    rule: 'Move capital to highest marginal return.',
  },
  {
    id: 'exit-multiple', number: 15, layer: 'valuation',
    title: 'Exit Multiple Dependency',
    case: 'GoTo',
    tension: 'Growth-stage valuation depends on multiple expansion, not operational performance.',
    quantitative: 'Revenue multiple compressed from 12x to 1.5x. Without expansion, business needed $2B+ EBITDA to justify IPO valuation.',
    rule: 'Separate operational value creation from multiple expansion.',
  },
];

const LAYERS: { key: CapitalCondition['layer']; number: string; label: string }[] = [
  { key: 'operational', number: 'I', label: 'Operational' },
  { key: 'balance-sheet', number: 'II', label: 'Balance Sheet' },
  { key: 'portfolio', number: 'III', label: 'Portfolio' },
  { key: 'transition', number: 'IV', label: 'Transition' },
  { key: 'valuation', number: 'V', label: 'Valuation' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinanceInMotion() {
  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Capital Allocation' },
      ]}
    >
      <SEO
        title="Capital Allocation Framework"
        description="Fifteen structural capital conditions observed in Indonesian markets. Institutional framework for allocators."
      />

      <div className="py-10 container max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground block mb-3">
            Section 05
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight leading-tight">
            Capital Allocation Framework
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Fifteen Structural Capital Conditions
          </p>
        </div>

        {/* Premise */}
        <div className="mb-10 pb-8 border-b border-border">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mb-3">
            Premise
          </span>
          <div className="space-y-3 text-sm text-foreground leading-relaxed">
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

        {/* Layers */}
        {LAYERS.map(({ key, number, label }) => {
          const layerConditions = CONDITIONS.filter((c) => c.layer === key);
          return (
            <div key={key} className="mb-10">
              {/* Layer header */}
              <div className="flex items-center gap-3 mb-1 pb-2 border-b border-border">
                <span className="text-[10px] font-mono text-muted-foreground tracking-wide">
                  Layer {number}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
                  {label}
                </span>
              </div>

              {/* Conditions */}
              {layerConditions.map((condition) => (
                <CapitalConditionCard key={condition.id} condition={condition} />
              ))}
            </div>
          );
        })}

        {/* Closing */}
        <div className="mt-6 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Allocator credibility requires:</p>
          <p className="text-xs font-mono text-foreground">
            Condition → Equation → Stress scenario → Capital consequence.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
