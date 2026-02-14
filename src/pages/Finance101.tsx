/**
 * Finance101 — Finance landing page redesigned around fundamentals-first IA.
 *
 * Structure:
 *   1. Title + editorial "Before we go" essay block
 *   2. Roadmap entry points (Fundamentals / Applied Finance Lifecycle)
 *   3. Fundamentals: infinity-loop learning map + 12 foundational cards
 *   4. Applied lifecycle: Strategic Finance, Planning, Analytics
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Compass,
  Layers,
  Brain,
  TrendingUp,
  BarChart3,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Data: 12 Foundational Cards
// ---------------------------------------------------------------------------

interface FoundationCard {
  id: string;
  number: number;
  title: string;
  coreIdea: string;
  keyConcepts: string[];
  essaysToWrite: string[];
  blindSpot: string;
}

const foundationCards: FoundationCard[] = [
  {
    id: 'financial-management-creates-value',
    number: 1,
    title: 'Financial management creates value',
    coreIdea: 'Finance exists to increase the value of the firm — not to produce reports.',
    keyConcepts: ['Shareholder value', 'Agency problem', 'Stakeholder theory', 'Value creation vs. value transfer'],
    essaysToWrite: ['What does it mean to create value?', 'When financial management destroys value'],
    blindSpot: 'Confusing accounting profit with economic value creation.',
  },
  {
    id: 'time-value-of-money',
    number: 2,
    title: 'Time value of money is judgment',
    coreIdea: 'A dollar today is worth more than a dollar tomorrow — but by how much depends on the question you are answering.',
    keyConcepts: ['Present value', 'Discount rate', 'Compounding', 'Opportunity cost'],
    essaysToWrite: ['The discount rate is a worldview, not a formula', 'Why NPV beats IRR in real decisions'],
    blindSpot: 'Using a single discount rate for all situations without understanding what it represents.',
  },
  {
    id: 'valuation-is-expectation',
    number: 3,
    title: 'Valuation is expectation plus discipline',
    coreIdea: 'Valuation is not about finding the right number — it is about understanding what assumptions produce which prices.',
    keyConcepts: ['DCF', 'Multiples', 'Terminal value', 'Margin of safety'],
    essaysToWrite: ['Why every valuation is an argument', 'The terminal value problem in corporate valuation'],
    blindSpot: 'Treating valuation outputs as facts rather than as consequences of assumptions.',
  },
  {
    id: 'risk-is-uncertainty',
    number: 4,
    title: 'Risk is uncertainty that matters',
    coreIdea: 'Risk is not volatility. Risk is the probability of permanent loss or failure to meet an obligation.',
    keyConcepts: ['Systematic vs. idiosyncratic risk', 'Risk-return trade-off', 'Diversification', 'Tail risk'],
    essaysToWrite: ['Risk management is not risk elimination', 'Why corporations hedge differently than investors'],
    blindSpot: 'Equating measured volatility with actual business risk.',
  },
  {
    id: 'financial-statements-tell-story',
    number: 5,
    title: 'Financial statements tell a story',
    coreIdea: 'Statements are not just numbers — they are a structured narrative about what happened, why, and what it means.',
    keyConcepts: ['Income statement logic', 'Balance sheet identity', 'Cash flow reconciliation', 'Footnotes'],
    essaysToWrite: ['Reading the balance sheet as a strategy document', 'How the income statement hides operating reality'],
    blindSpot: 'Reading financial statements line-by-line instead of as an interconnected system.',
  },
  {
    id: 'cash-flow-is-reality',
    number: 6,
    title: 'Cash flow is reality',
    coreIdea: 'Profit is an opinion. Cash is a fact. The firm survives on cash, not on accounting income.',
    keyConcepts: ['Operating cash flow', 'Free cash flow', 'Cash conversion cycle', 'Accrual vs. cash'],
    essaysToWrite: ['Why profitable companies go bankrupt', 'Cash flow statement as a detective tool'],
    blindSpot: 'Using EBITDA as a proxy for cash flow without adjusting for capex and working capital.',
  },
  {
    id: 'working-capital-silent-value',
    number: 7,
    title: 'Working capital is silent value creation',
    coreIdea: 'Working capital management determines whether growth creates or destroys cash. It is the bridge between operations and finance.',
    keyConcepts: ['Days sales outstanding', 'Inventory turns', 'Payables management', 'Cash conversion cycle'],
    essaysToWrite: ['Working capital as competitive advantage', 'The hidden cash in your balance sheet'],
    blindSpot: 'Treating working capital as an accounting artifact instead of a strategic lever.',
  },
  {
    id: 'capital-budgeting',
    number: 8,
    title: 'Capital budgeting earns finance its salary',
    coreIdea: 'Capital budgeting is where finance adds the most value: deciding which investments to make and which to reject.',
    keyConcepts: ['NPV', 'IRR', 'Payback period', 'Hurdle rate', 'Real options'],
    essaysToWrite: ['Capital budgeting in practice: what textbooks omit', 'Why hurdle rates vary across divisions'],
    blindSpot: 'Reducing capital budgeting to a mechanical NPV calculation without questioning the assumptions.',
  },
  {
    id: 'cost-of-capital',
    number: 9,
    title: 'Cost of capital is the firm\'s gravity',
    coreIdea: 'The cost of capital sets the minimum return a firm must earn. Every investment below it destroys value.',
    keyConcepts: ['WACC', 'Cost of equity', 'Cost of debt', 'Capital structure irrelevance', 'Tax shield'],
    essaysToWrite: ['WACC is not a constant', 'How capital structure decisions affect firm value'],
    blindSpot: 'Treating WACC as a fixed number rather than a function of capital structure and risk.',
  },
  {
    id: 'payout-policy',
    number: 10,
    title: 'Payout policy signals who you are',
    coreIdea: 'Dividends and buybacks are not just returns to shareholders — they are signals about what management believes about the future.',
    keyConcepts: ['Dividend policy', 'Share buybacks', 'Signaling theory', 'Tax considerations'],
    essaysToWrite: ['When dividends signal confidence vs. lack of ideas', 'The buyback illusion'],
    blindSpot: 'Analyzing payout policy in isolation from investment opportunities and capital needs.',
  },
  {
    id: 'financing-choices',
    number: 11,
    title: 'Financing choices shape long-term control',
    coreIdea: 'How you fund the firm determines who controls it, how risky it is, and how much flexibility you have.',
    keyConcepts: ['Debt vs. equity', 'Financial leverage', 'Covenant restrictions', 'Dilution'],
    essaysToWrite: ['When debt is smart and when it is dangerous', 'The real cost of equity dilution'],
    blindSpot: 'Choosing financing based solely on cost without considering control and covenant implications.',
  },
  {
    id: 'special-situations',
    number: 12,
    title: 'Special situations expose real financial skill',
    coreIdea: 'Mergers, restructurings, and distressed situations test whether you understand finance — or just its formulas.',
    keyConcepts: ['M&A synergies', 'Restructuring', 'Distressed debt', 'Spin-offs', 'Cross-border complexity'],
    essaysToWrite: ['Why most mergers destroy value', 'Restructuring as a value creation strategy'],
    blindSpot: 'Assuming special situations follow the same rules as steady-state operations.',
  },
];

// ---------------------------------------------------------------------------
// Data: Applied Lifecycle Layers
// ---------------------------------------------------------------------------

interface LifecycleLayer {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
  frameworks: string[];
  link: string;
}

const lifecycleLayers: LifecycleLayer[] = [
  {
    id: 'strategic-finance',
    title: 'Strategic Finance',
    subtitle: 'Decision',
    icon: <Target className="h-6 w-6" />,
    description: 'Where finance meets strategy. Capital allocation, investment decisions, and long-term value creation.',
    frameworks: [
      'Capital allocation framework',
      'Investment committee process',
      'Portfolio management principles',
      'Strategic option analysis',
    ],
    link: '/finance-101/financial-analytics',
  },
  {
    id: 'financial-planning',
    title: 'Financial Planning & Forecasting',
    subtitle: 'Blueprint',
    icon: <BarChart3 className="h-6 w-6" />,
    description: 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.',
    frameworks: [
      'Driver-based planning',
      'Scenario modeling',
      'Rolling forecast methodology',
      'Sensitivity analysis',
    ],
    link: '/finance-101/financial-planning-forecasting',
  },
  {
    id: 'financial-analytics',
    title: 'Financial Analytics',
    subtitle: 'Review',
    icon: <TrendingUp className="h-6 w-6" />,
    description: 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.',
    frameworks: [
      'Variance analysis methodology',
      'Profitability waterfall',
      'Cash flow analytics',
      'Ratio analysis framework',
    ],
    link: '/finance-101/financial-analytics',
  },
];

// ---------------------------------------------------------------------------
// Infinity Loop Learning Map (SVG-based, clickable nodes)
// ---------------------------------------------------------------------------

interface LoopNode {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  isStart?: boolean;
}

const loopNodes: LoopNode[] = [
  { id: 'financial-management-creates-value', label: 'Value Creation', shortLabel: '1', x: 90, y: 70, isStart: true },
  { id: 'time-value-of-money', label: 'Time Value', shortLabel: '2', x: 210, y: 30 },
  { id: 'valuation-is-expectation', label: 'Valuation', shortLabel: '3', x: 330, y: 70 },
  { id: 'risk-is-uncertainty', label: 'Risk', shortLabel: '4', x: 440, y: 30 },
  { id: 'financial-statements-tell-story', label: 'Statements', shortLabel: '5', x: 550, y: 70 },
  { id: 'cash-flow-is-reality', label: 'Cash Flow', shortLabel: '6', x: 660, y: 30 },
  { id: 'working-capital-silent-value', label: 'Working Capital', shortLabel: '7', x: 660, y: 110 },
  { id: 'capital-budgeting', label: 'Capital Budgeting', shortLabel: '8', x: 550, y: 150 },
  { id: 'cost-of-capital', label: 'Cost of Capital', shortLabel: '9', x: 440, y: 110 },
  { id: 'payout-policy', label: 'Payout Policy', shortLabel: '10', x: 330, y: 150 },
  { id: 'financing-choices', label: 'Financing', shortLabel: '11', x: 210, y: 110 },
  { id: 'special-situations', label: 'Special Situations', shortLabel: '12', x: 90, y: 150 },
];

function InfinityLoopMap() {
  const scrollToCard = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <svg
        viewBox="0 0 750 200"
        className="w-full min-w-[600px] h-auto"
        role="img"
        aria-label="Finance fundamentals learning map"
      >
        {/* Infinity loop path */}
        <path
          d="M 90,90 C 90,30 330,30 375,90 C 420,150 660,150 660,90 C 660,30 420,30 375,90 C 330,150 90,150 90,90 Z"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeDasharray="6 4"
        />

        {/* Nodes */}
        {loopNodes.map((node) => (
          <g
            key={node.id}
            onClick={() => scrollToCard(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToCard(node.id);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${node.label} — click to scroll`}
            className="cursor-pointer"
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={node.isStart ? 18 : 15}
              fill={node.isStart ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
              stroke={node.isStart ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
              strokeWidth="2"
              className="transition-all hover:stroke-[hsl(var(--primary))]"
            />
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontWeight="600"
              fill={node.isStart ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
            >
              {node.shortLabel}
            </text>
            <text
              x={node.x}
              y={node.y + 28}
              textAnchor="middle"
              fontSize="8"
              fill="hsl(var(--muted-foreground))"
            >
              {node.label}
            </text>
            {node.isStart && (
              <text
                x={node.x}
                y={node.y - 26}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill="hsl(var(--primary))"
              >
                START HERE
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Foundational Card Component
// ---------------------------------------------------------------------------

function FoundationalCard({ card }: { card: FoundationCard }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id={card.id} className="scroll-mt-24">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full text-left border rounded-lg p-5 transition-all',
          isOpen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center mt-0.5">
              {card.number}
            </span>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.coreIdea}</p>
            </div>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border border-t-0 border-primary/20 rounded-b-lg p-5 space-y-4 bg-background">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Key Concepts</h4>
            <div className="flex flex-wrap gap-2">
              {card.keyConcepts.map((c) => (
                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Essays You Must Write</h4>
            <ul className="space-y-1">
              {card.essaysToWrite.map((e) => (
                <li key={e} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">—</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
            <h4 className="text-xs font-semibold uppercase text-destructive mb-1">Blind Spot to Avoid</h4>
            <p className="text-sm text-muted-foreground">{card.blindSpot}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Finance101() {
  return (
    <PageLayout
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance' }]}
    >
      <SEO
        title="Finance"
        description="Finance knowledge for decision-making. Fundamentals first, then applied finance lifecycle."
      />

      <div className="py-8 container max-w-4xl">
        {/* Title */}
        <h1 className="text-4xl font-display font-bold mb-4">Finance</h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          Finance exists to support decisions — not to produce reports. Every ratio, every
          forecast, every model should answer a question worth asking.
        </p>

        {/* ── Before We Go — editorial block ── */}
        <div className="bg-card border border-border rounded-lg p-8 mb-12">
          <Badge variant="outline" className="mb-4">Before We Go</Badge>
          <h2 className="text-2xl font-display font-semibold mb-4 text-foreground">
            How to Use This Section
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              This finance section is not a textbook. It is not organized by chapter number.
              It is organized by how finance actually works when you use it to make decisions.
            </p>
            <p>
              Start with <strong className="text-foreground">Fundamentals</strong>. These twelve ideas
              form the foundation of every financial decision you will ever make. They are not
              introductory — they are permanent. A CFO and an analyst both need them.
            </p>
            <p>
              Then move to the <strong className="text-foreground">Applied Finance Lifecycle</strong>:
              Strategic Finance for decisions, Financial Planning for blueprints, and Financial
              Analytics for review. Each layer uses the fundamentals differently.
            </p>
            <p>
              Write essays for each card. The essays are the thinking. The cards are the scaffolding.
            </p>
          </div>
        </div>

        {/* ── Roadmap Entry Points ── */}
        <div className="grid md:grid-cols-2 gap-4 mb-16">
          <a
            href="#fundamentals"
            className="group flex items-start gap-4 p-6 border border-border rounded-lg hover:border-primary/40 transition-colors"
          >
            <div className="p-3 rounded-lg bg-primary/10">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                Fundamentals
              </h3>
              <p className="text-sm text-muted-foreground">
                12 foundational ideas. Start here regardless of experience level.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1.5 flex-shrink-0" />
          </a>

          <a
            href="#applied-lifecycle"
            className="group flex items-start gap-4 p-6 border border-border rounded-lg hover:border-primary/40 transition-colors"
          >
            <div className="p-3 rounded-lg bg-primary/10">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                Applied Finance Lifecycle
              </h3>
              <p className="text-sm text-muted-foreground">
                Strategic Finance, Planning, Analytics. Where fundamentals meet action.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1.5 flex-shrink-0" />
          </a>
        </div>

        {/* ──────────────────────────────────────────────── */}
        {/* FUNDAMENTALS                                       */}
        {/* ──────────────────────────────────────────────── */}
        <section id="fundamentals" className="scroll-mt-24 mb-20">
          <div className="mb-8">
            <Badge className="mb-3">Fundamentals</Badge>
            <h2 className="text-3xl font-display font-bold mb-3 text-foreground">
              Twelve Ideas That Never Expire
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              These are the permanent concepts of finance. They are not introductory. They are
              foundational. Every applied technique rests on them.
            </p>
          </div>

          {/* Infinity Loop Map */}
          <div className="mb-10 bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Click any node to jump to that concept. Start at node 1.
            </p>
            <InfinityLoopMap />
          </div>

          {/* Foundation Cards */}
          <div className="space-y-3">
            {foundationCards.map((card) => (
              <FoundationalCard key={card.id} card={card} />
            ))}
          </div>
        </section>

        {/* ──────────────────────────────────────────────── */}
        {/* APPLIED LIFECYCLE                                  */}
        {/* ──────────────────────────────────────────────── */}
        <section id="applied-lifecycle" className="scroll-mt-24">
          <div className="mb-8">
            <Badge className="mb-3">Applied Finance Lifecycle</Badge>
            <h2 className="text-3xl font-display font-bold mb-3 text-foreground">
              From Decision to Review
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Finance operates in a loop: decide, plan, execute, review. Each layer has its own
              frameworks, but all depend on the fundamentals above.
            </p>
          </div>

          <div className="space-y-6">
            {lifecycleLayers.map((layer) => (
              <Link
                key={layer.id}
                to={layer.link}
                className="group block border border-border rounded-lg p-6 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-5">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {layer.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {layer.title}
                      </h3>
                      <Badge variant="outline" className="text-xs">{layer.subtitle}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{layer.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {layer.frameworks.map((f) => (
                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-2 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
