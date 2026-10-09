import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ConceptPanel } from '@/components/consolidation/ConceptPanel';
import { ConsolidationProcessStep } from '@/components/consolidation/ConsolidationProcessStep';
import { AccountRow } from '@/components/consolidation/AccountRow';
import { Link } from 'react-router-dom';
import { ENTITY_NAMES, WORKING_PAPER_ROWS } from '@/data/consolidationWorkingPaper';
import { CONSOLIDATION_TOPICS } from '@/config/consolidationTopics';
import { useTopicCounts } from '@/hooks/queries/useTopicCounts';
import { sectionStanding } from '@/lib/sectionStanding';

const PROCESS_STEPS = [
  { title: 'Individual Books', description: 'Each entity maintains its own complete set of financials.' },
  { title: 'Combine', description: 'All entity books are added together column by column.' },
  { title: 'Eliminate Intercompany', description: 'Loans, sales, dividends between entities are removed.' },
  { title: 'Calculate NCI', description: 'Minority shareholders\' share of equity and profit is separated.' },
  { title: 'Consolidated Output', description: 'The group is presented as a single economic entity.' },
];

export default function ConsolidatedReporting() {
  const { data: topicCounts, isSuccess: countsLoaded } = useTopicCounts('accounting');

  return (
    <PageLayout
      variant="content"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Accounting', path: '/accounting' },
        { label: 'Consolidated Reporting' },
      ]}
    >
      <SEO title="Consolidated Reporting" description="How a parent and its subsidiaries combine into one set of financial statements under PSAK — elimination entries, non-controlling interests, and control procedures." />
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">

          {/* ── SECTION 1 — Hero ── */}
          <section className="mb-14">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
              Consolidated Reporting
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-3xl">
              When a group has multiple legal entities, you need one set of financials that shows
              the whole picture — as if it were a single economic entity. This working paper shows
              how that is done, step by step, on an illustrative four-entity group under PSAK 110.
              The figures are round numbers, not a company's accounts.
            </p>
            <div className="w-full h-px bg-border mt-6" />
          </section>

          {/* ── SECTION 2 — Concept Framework ── */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-foreground mb-6">Three terms the working paper uses</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ConceptPanel
                title="Control"
                definition="You consolidate entities you control. Control usually means more than 50% voting rights but can exist with less if you have contractual power over key decisions."
              />
              <ConceptPanel
                title="Non-Controlling Interest"
                definition="If you own 51% of a subsidiary, you consolidate 100% of its results. The 49% you do not own is shown as NCI — a separate line in equity."
              >
                <div className="flex h-5 rounded overflow-hidden border border-border">
                  <div className="bg-foreground flex items-center justify-center" style={{ width: '51%' }}>
                    <span className="text-[10px] font-mono text-background">51%</span>
                  </div>
                  <div className="bg-muted flex items-center justify-center" style={{ width: '49%' }}>
                    <span className="text-[10px] font-mono text-muted-foreground">49%</span>
                  </div>
                </div>
              </ConceptPanel>
              <ConceptPanel
                title="Goodwill"
                definition="The excess of what you paid, plus the non-controlling interest, over the fair value of the net assets acquired at the acquisition date. It stands for future economic benefits that cannot be identified separately."
              >
                <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 border border-border text-center">
                  Price Paid + NCI − Net Assets = Goodwill
                </p>
              </ConceptPanel>
            </div>
          </section>

          {/* ── SECTION 3 — Process Architecture ── */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-foreground mb-1">Process Architecture</h2>
            <p className="text-sm text-muted-foreground mb-6">
              How consolidation works — from individual books to the final consolidated output.
            </p>
            <div className="bg-card border border-border p-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 lg:gap-8">
                {PROCESS_STEPS.map((step, i) => (
                  <ConsolidationProcessStep
                    key={step.title}
                    stepNumber={i + 1}
                    title={step.title}
                    description={step.description}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── SECTION 4 — Working Paper ── */}
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-foreground mb-1">Working Paper Simulation</h2>
            <p className="text-sm text-muted-foreground mb-6">
              PT Dummy C and Subsidiaries — Consolidated Statement of Financial Position — December 31, 2024
            </p>
            <div className="bg-card border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider w-[220px]">
                        Account
                      </th>
                      <th colSpan={4} className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-l border-border">
                        Individual Entities
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-l border-border bg-muted/30">
                        Combined
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-l border-border bg-amber-50/30">
                        Eliminations
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider border-l border-border bg-accent/[0.07]">
                        Consolidated
                      </th>
                    </tr>
                    <tr className="border-b border-border bg-card">
                      <th className="px-4 py-2" />
                      {ENTITY_NAMES.map((name) => (
                        <th key={name} className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground border-l border-border/50">
                          {name}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground border-l border-border bg-muted/30">
                        Total
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground border-l border-border bg-amber-50/30">
                        Adj.
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground border-l border-border bg-accent/[0.07]">
                        Final
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {WORKING_PAPER_ROWS.map((row, i) => (
                      <AccountRow
                        key={`${row.label}-${i}`}
                        label={row.label}
                        values={row.values || []}
                        combined={row.combined}
                        elimination={row.elimination}
                        consolidated={row.consolidated}
                        isHeader={row.isHeader}
                        isSubtotal={row.isSubtotal}
                        indent={row.indent}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm text-muted-foreground leading-relaxed">
              Intragroup balances come out on both sides: 113,000 of related-party receivables, loans
              and other receivables against 113,000 of payables and borrowings. The 250,000
              investment is set against 256,000 of subsidiary net assets at acquisition (170,000
              share capital and 86,000 retained earnings). Goodwill is the difference once NCI is
              counted: 250,000 + 91,000 − 256,000 = 85,000. NCI is shown at its acquisition-date
              value; its share of earnings since is not allocated in this example.
            </p>
          </section>

          {/* The nine topic pages essays are placed on. They were reachable
              only by typing the URL; listed here with what each holds. */}
          <section className="mb-14 max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground mb-4">Topics</h2>
            <ul className="divide-y divide-border border-y border-border">
              {CONSOLIDATION_TOPICS.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    to={`/accounting/consolidation/${topic.slug}`}
                    className="group flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <span className="font-medium text-foreground group-hover:text-accent transition-colors">
                      {topic.title}
                    </span>
                    <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                      {sectionStanding(countsLoaded, topicCounts?.[topic.slug])}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

        </div>
      </div>
    </PageLayout>
  );
}
