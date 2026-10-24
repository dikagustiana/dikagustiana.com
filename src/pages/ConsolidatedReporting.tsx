import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ConceptPanel } from '@/components/consolidation/ConceptPanel';
import { ConsolidationProcessStep } from '@/components/consolidation/ConsolidationProcessStep';
import { Link } from 'react-router-dom';
import { WorkingPaperSection } from '@/components/workbook/WorkingPaperSection';
import { useConsolidationSeries } from '@/hooks/queries/useEssays';
import { essayUrl } from '@/lib/essayUrl';

const PROCESS_STEPS = [
  { title: 'Individual Books', description: 'Each entity maintains its own complete set of financials.' },
  { title: 'Combine', description: 'All entity books are added together column by column.' },
  { title: 'Eliminate Intercompany', description: 'Loans, sales, dividends between entities are removed.' },
  { title: 'Calculate NCI', description: 'Minority shareholders\' share of equity and profit is separated.' },
  { title: 'Consolidated Output', description: 'The group is presented as a single economic entity.' },
];

export default function ConsolidatedReporting() {
  const { data: series = [] } = useConsolidationSeries();

  return (
    <PageLayout
      variant="content"
      width="wide"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Accounting', path: '/accounting' },
        { label: 'Consolidated Reporting' },
      ]}
    >
      <SEO title="Consolidated Reporting" description="How a parent and its subsidiaries combine into one set of financial statements under PSAK — elimination entries, non-controlling interests, and control procedures." />
      <div className={`${PAGE_COLUMN.wide} py-8`}>
        <div>

          {/* ── SECTION 1 — Hero ── */}
          <section className="mb-14">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
              Consolidated Reporting
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-3xl">
              When a group has multiple legal entities, you need one set of financials that shows
              the whole picture — as if it were a single economic entity.
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
                    <span className="text-[11px] font-mono text-background">51%</span>
                  </div>
                  <div className="bg-muted flex items-center justify-center" style={{ width: '49%' }}>
                    <span className="text-[11px] font-mono text-muted-foreground">49%</span>
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

          {/* ── SECTION 4 — Working Paper: the owner's PSAK 338 workbook, sheet by sheet ── */}
          <WorkingPaperSection />

          {/* The consolidation series, in part order: each essay is its own
              page. Hidden until one is published. */}
          {series.length > 0 && (
            <section className="mb-14">
              <h2 className="text-2xl font-bold text-foreground mb-4">Consolidation series</h2>
              <ol className="divide-y divide-border border-y border-border">
                {series.map((essay) => (
                  <li key={essay.id}>
                    <Link
                      to={essayUrl(essay) ?? `/accounting/consolidation/${essay.slug}`}
                      className="group flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    >
                      <span className="font-medium text-foreground group-hover:text-accent transition-colors">
                        {essay.title}
                      </span>
                      <span className="shrink-0 text-xs font-mono text-muted-foreground sm:text-right">
                        Part {essay.sort_order}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
