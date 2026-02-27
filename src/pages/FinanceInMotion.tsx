/**
 * FinanceInMotion — Section 05: Capital Allocation Under Structural Conditions
 *
 * Institutional, dark-themed, allocator-tier framework.
 * Route: /finance/finance-in-motion
 */

import { useState } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Accordion } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { CapitalConditionCard, type CapitalCondition } from '@/components/finance/CapitalConditionCard';

// ── Condition data ────────────────────────────────────────────────────────────

const CONDITIONS: CapitalCondition[] = [
  // Operational (1–3)
  {
    id: 'low-growth-idle',
    number: 1,
    title: 'Low Growth with Idle Capacity',
    case: 'Blue Bird — Fleet utilization dropped below 60% post-ride-hailing disruption. Revenue stagnated while fixed costs (depreciation, driver base) remained.',
    tension: 'Management instinct is to grow out of stagnation. But adding assets to a business with idle capacity destroys marginal returns.',
    implication: 'ROIC collapses when incremental capital is deployed into a business already running below breakeven utilization. Each additional unit of capex dilutes returns further.',
    rule: 'Fix productivity before expanding assets.',
    group: 'operational',
  },
  {
    id: 'aggressive-expansion',
    number: 2,
    title: 'Aggressive Expansion with Assumption Distortion',
    case: 'Garuda Indonesia — Fleet expansion justified by optimistic load factor and yield assumptions that never materialized.',
    tension: 'Expansion justified by optimistic demand and load factor assumptions. Fixed lease obligations remained while EBITDA collapsed.',
    implication: 'If projected utilization or yield misses by 10–15%, fixed obligations remain while EBITDA collapses. Debt-to-EBITDA can breach 6x within two quarters.',
    rule: 'Stress-test core assumptions before approving expansion.',
    group: 'operational',
  },
  {
    id: 'commodity-windfall',
    number: 3,
    title: 'Commodity Windfall',
    case: 'Adaro Energy Indonesia vs Bukit Asam — Both benefited from coal price surges. Adaro diversified into aluminum and green energy. Bukit Asam remained concentrated.',
    tension: 'Windfall cash creates an illusion of permanent earnings. Boards face pressure to distribute rather than redeploy into counter-cyclical assets.',
    implication: 'Commodity margins can compress 40–60% within 18 months. Companies that treat windfall as base-case are structurally fragile.',
    rule: 'Redeploy windfall to reduce cyclicality.',
    group: 'operational',
  },
  // Balance Sheet (4–7)
  {
    id: 'long-gestation-capex',
    number: 4,
    title: 'Long-Gestation Capex-Heavy Assets',
    case: 'Pertamina Geothermal Energy — Exploration-to-production timelines of 7–10 years. Revenue begins years after capital commitment.',
    tension: 'Short-tenor debt funding long-gestation assets creates a duration mismatch that compounds under rising rate environments.',
    implication: 'If funding tenor averages 5 years but asset payback is 12+ years, refinancing risk becomes the primary threat to project viability.',
    rule: 'Align funding duration with asset life.',
    group: 'balance-sheet',
  },
  {
    id: 'sovereign-risk',
    number: 5,
    title: 'Sovereign Risk Absorption',
    case: 'Indonesia Investment Authority (INA) — Mandated to channel sovereign capital into infrastructure, energy transition, and healthcare at sub-market returns.',
    tension: 'Sovereign wealth vehicles absorb risks that private capital will not price. The question is whether risk-adjusted returns justify the allocation or subsidize policy objectives.',
    implication: 'Blended return targets of 8–10% mask the reality that 30–40% of the portfolio carries policy-driven, sub-commercial risk profiles.',
    rule: 'Transition is achieved by repricing risk.',
    group: 'balance-sheet',
  },
  {
    id: 'overexpansion-debt',
    number: 6,
    title: 'Overexpansion Funded by Debt',
    case: 'Waskita Karya — Aggressive toll road expansion funded by short-term bank debt and receivable monetization. Leverage exceeded 4x net debt/EBITDA.',
    tension: 'State-owned enterprises face political pressure to build infrastructure. Balance sheet discipline conflicts with development mandates.',
    implication: 'At 4x+ leverage, a 15% EBITDA decline triggers covenant breaches. Refinancing becomes contingent on government guarantees rather than cash flow.',
    rule: 'Stress leverage under downside EBITDA.',
    group: 'balance-sheet',
  },
  {
    id: 'working-capital',
    number: 7,
    title: 'Working Capital Outpacing Revenue',
    case: 'Indofarma — Government pharmaceutical contracts created massive receivable balances. Cash conversion cycle exceeded 180 days while revenue grew modestly.',
    tension: 'Revenue growth looks healthy on the income statement. But if working capital grows faster than revenue, the business consumes cash even while "profitable."',
    implication: 'Every 30-day extension in CCC at Indofarma\'s scale traps ~IDR 200B in receivables. Operating cash flow turns negative despite positive EBITDA.',
    rule: 'Cash conversion discipline before scaling.',
    group: 'balance-sheet',
  },
  // Portfolio (8–10)
  {
    id: 'portfolio-diversification',
    number: 8,
    title: 'Portfolio Diversification for Resilience',
    case: 'Astra International — Portfolio spans automotive, financial services, heavy equipment, infrastructure, and healthcare. Counter-cyclical positioning across commodities and consumption.',
    tension: 'Conglomerates are penalized by markets for complexity discounts. But in emerging markets, diversification provides structural resilience that pure-play competitors lack.',
    implication: 'During the 2015 commodity downturn, Astra\'s financial services offset 35% of the heavy equipment decline. Correlation across segments was below 0.4.',
    rule: 'Allocate across cycles, not within one dependency.',
    group: 'portfolio',
  },
  {
    id: 'strategic-downstreaming',
    number: 9,
    title: 'Strategic Downstreaming',
    case: 'Vale Indonesia — Nickel ore export ban forced a strategic pivot to downstream processing (HPAL, smelting). Capital intensity increased 5–8x per ton of output.',
    tension: 'Downstreaming captures more value per unit but requires massive upfront capital with uncertain global nickel pricing. The option value of processing capability may exceed the IRR on paper.',
    implication: 'HPAL plant IRR at current nickel prices: 8–11%. But the strategic option value (EV supply chain positioning, government export approval) is unpriced in DCF models.',
    rule: 'Value optionality alongside IRR.',
    group: 'portfolio',
  },
  {
    id: 'blended-finance',
    number: 10,
    title: 'Blended Finance for Transition',
    case: 'Asian Development Bank — Indonesia Energy Transition Mechanism. Combines concessional lending, first-loss tranches, and commercial capital to accelerate coal plant retirement.',
    tension: 'Transition assets (renewable replacement, grid infrastructure) cannot generate market-rate returns on their own. The capital stack must be engineered to attract private participation.',
    implication: 'Without 20–30% first-loss absorption by development finance, private capital requires 300–500bps premium over comparable infrastructure — making projects unviable.',
    rule: 'Engineer the capital stack.',
    group: 'portfolio',
  },
  // Transition (11–12)
  {
    id: 'cost-of-capital-shift',
    number: 11,
    title: 'Cost of Capital Regime Shift',
    case: 'Lippo Karawaci — Property development model built on low-rate assumptions. When BI rate moved from 3.5% to 6%, project economics inverted.',
    tension: 'Projects approved at 12% hurdle rates become marginal at 15%. The entire pipeline must be repriced, but sunk costs create commitment bias.',
    implication: 'A 200bps rate increase compresses property developer margins by 15–25% and extends break-even timelines by 18+ months on levered projects.',
    rule: 'Reprice hurdle rate dynamically.',
    group: 'transition',
  },
  {
    id: 'duration-mismatch',
    number: 12,
    title: 'Duration Mismatch',
    case: 'PLN (Perusahaan Listrik Negara) — 25-year power purchase agreements funded by 5–7 year debt. Structural mismatch between asset cash flow duration and liability tenor.',
    tension: 'State utility cannot access 25-year debt markets domestically. International markets require sovereign guarantee or investment-grade rating.',
    implication: 'Refinancing risk materializes every 5 years. Each cycle exposes PLN to prevailing rates, currency movements, and sovereign credit conditions.',
    rule: 'Match tenor with asset life.',
    group: 'transition',
  },
  // Valuation (13–15)
  {
    id: 'optionality-efficiency',
    number: 13,
    title: 'Optionality vs Efficiency',
    case: 'Bank Central Asia — Maintains excess liquidity (LDR ~70%) and conservative provisioning. Sacrifices short-term ROE for optionality during stress periods.',
    tension: 'Excess capital looks like inefficiency in benign environments. But during crises (1998, 2008, 2020), BCA\'s balance sheet optionality becomes a competitive weapon.',
    implication: 'BCA\'s excess liquidity buffer (~IDR 100T+) generates sub-optimal returns in normal years but provides 200–400bps ROE advantage during stress periods vs. aggressive peers.',
    rule: 'Price optionality explicitly.',
    group: 'valuation',
  },
  {
    id: 'capital-recycling',
    number: 14,
    title: 'Capital Recycling Discipline',
    case: 'Saratoga Investama Sedaya — Systematic exit from mature holdings (Adaro, Tower Bersama) to redeploy into earlier-stage, higher-growth opportunities.',
    tension: 'Exiting successful investments feels counterintuitive. But holding mature assets with declining marginal returns traps capital below opportunity cost.',
    implication: 'Saratoga\'s redeployment from mature assets (expected return 8–12%) into growth-stage positions (target 18–25%) compounds portfolio IRR by 300–500bps over a 10-year horizon.',
    rule: 'Move capital to highest marginal return.',
    group: 'valuation',
  },
  {
    id: 'exit-multiple',
    number: 15,
    title: 'Exit Multiple Dependency',
    case: 'GoTo — Merged entity valued at $28B at IPO. Subsequent valuation compressed to $4–5B as market shifted from revenue multiples to profitability metrics.',
    tension: 'Growth-stage companies depend on exit multiple expansion to justify current burn rates. When multiples compress, the gap between operational reality and valuation becomes existential.',
    implication: 'GoTo\'s implied revenue multiple compressed from 12x to 1.5x. Without multiple expansion, the business needed to generate $2B+ EBITDA to justify IPO valuation — structurally unreachable.',
    rule: 'Separate operational value creation from multiple expansion.',
    group: 'valuation',
  },
];

const GROUP_LABELS: Record<CapitalCondition['group'], string> = {
  operational: 'Operational',
  'balance-sheet': 'Balance Sheet',
  portfolio: 'Portfolio',
  transition: 'Transition',
  valuation: 'Valuation',
};

const GROUP_ORDER: CapitalCondition['group'][] = [
  'operational',
  'balance-sheet',
  'portfolio',
  'transition',
  'valuation',
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinanceInMotion() {
  const [showQuantitative, setShowQuantitative] = useState(false);

  const groupedConditions = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    conditions: CONDITIONS.filter((c) => c.group === group),
  }));

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
        title="Capital Allocation Under Structural Conditions"
        description="15 recurring capital allocation conditions observed in Indonesian markets. Institutional framework for allocators."
      />

      {/* Dark wrapper */}
      <div className="bg-[hsl(215_28%_10%)] text-[hsl(0_0%_90%)] min-h-screen -mt-4">
        <div className="container max-w-3xl py-16 px-4">
          {/* Header */}
          <div className="mb-16">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[hsl(215_12%_45%)] block mb-6">
              Section 05
            </span>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-[hsl(0_0%_96%)] tracking-tight leading-tight mb-0">
              Capital Allocation Under Structural Conditions
            </h1>
          </div>

          {/* Opening text */}
          <div className="mb-20 space-y-6 border-l-2 border-[hsl(215_20%_22%)] pl-6">
            <p className="text-[15px] leading-[1.8] text-[hsl(0_0%_78%)] italic">
              "If I could speak to my 22-year-old self, I would not tell him to slow down. I would tell him to increase intensity 5x. Raise the quality bar. Go deeper into fundamentals.
            </p>
            <p className="text-[15px] leading-[1.8] text-[hsl(0_0%_78%)] italic">
              But I would correct one misconception."
            </p>

            <div className="space-y-3 pt-2">
              <p className="text-[15px] leading-[1.8] text-[hsl(0_0%_82%)]">
                I believed finance was about mastering numbers.
              </p>
              <p className="text-[15px] leading-[1.8] text-[hsl(0_0%_90%)] font-semibold">
                It is not.
              </p>
              <p className="text-[15px] leading-[1.8] text-[hsl(0_0%_82%)]">
                It is about deciding where the next rupiah goes when the numbers are incomplete.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <p className="text-sm text-[hsl(0_0%_60%)]">
                Accounting tells you what happened.
              </p>
              <p className="text-sm text-[hsl(0_0%_82%)] font-medium">
                Finance decides what will happen.
              </p>
            </div>

            <p className="text-base text-[hsl(0_0%_95%)] font-semibold pt-4">
              Finance is capital allocation under recurring structural conditions.
            </p>
          </div>

          {/* Quantitative toggle */}
          <div className="flex items-center justify-between mb-10 py-3 border-y border-[hsl(215_20%_18%)]">
            <span className="text-xs font-mono uppercase tracking-[0.15em] text-[hsl(215_12%_45%)]">
              15 Capital Conditions
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[hsl(215_12%_45%)]">Show Quantitative Lens</span>
              <Switch
                checked={showQuantitative}
                onCheckedChange={setShowQuantitative}
                className="data-[state=checked]:bg-[hsl(142_71%_45%)]"
              />
            </div>
          </div>

          {/* Grouped conditions */}
          {groupedConditions.map(({ group, label, conditions }) => (
            <div key={group} className="mb-12">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[hsl(142_71%_45%_/_0.5)]">
                  {label}
                </span>
                <div className="flex-1 h-px bg-[hsl(215_20%_18%)]" />
              </div>

              <Accordion type="multiple" className="w-full">
                {conditions.map((condition) => (
                  <CapitalConditionCard
                    key={condition.id}
                    condition={condition}
                    showQuantitative={showQuantitative}
                  />
                ))}
              </Accordion>
            </div>
          ))}

          {/* Closing statement */}
          <div className="mt-20 pt-10 border-t border-[hsl(215_20%_18%)]">
            <p className="text-sm text-[hsl(0_0%_70%)] leading-relaxed mb-4">
              Allocator credibility requires:
            </p>
            <p className="text-sm font-mono text-[hsl(0_0%_85%)] tracking-wide">
              Condition → Equation → Stress scenario → Capital consequence.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
