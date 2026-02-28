import { PageLayout } from '@/components/layouts/PageLayout';
import { KeyConceptCard } from '@/components/consolidation/KeyConceptCard';
import { ProcessStep } from '@/components/consolidation/ProcessStep';
import { WorkingPaperTable } from '@/components/consolidation/WorkingPaperTable';

const CONCEPTS = [
  {
    title: 'Control',
    description:
      'You consolidate entities you control. Control usually means more than 50% voting rights but can exist with less if you have contractual power over key decisions.',
  },
  {
    title: 'Non-Controlling Interest',
    description:
      'If you own 51% of a subsidiary, you consolidate 100% of its results. The 49% you do not own is shown as NCI — a separate line in equity.',
  },
  {
    title: 'Goodwill',
    description:
      'The excess of what you paid over the fair value of net assets acquired at the acquisition date. Represents future economic benefits not separately identifiable.',
  },
];

const STEPS = [
  { number: 1, title: 'Individual Books', description: 'Each entity maintains its own complete set of financials independently.' },
  { number: 2, title: 'Combine', description: 'All entity books are added together column by column into one combined total.' },
  { number: 3, title: 'Eliminate Intercompany', description: 'Transactions between entities — loans, sales, dividends — are removed to avoid double counting.' },
  { number: 4, title: 'Calculate NCI', description: 'The portion of equity and profit attributable to minority shareholders is separated and labeled.' },
  { number: 5, title: 'Consolidated Output', description: 'The final statements show the group as a single economic entity.' },
];

export default function ConsolidatedReporting() {
  return (
    <PageLayout
      variant="content"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Accounting', path: '/accounting' },
        { label: 'Consolidated Reporting' },
      ]}
    >
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto">

          {/* ── SECTION 1 — What and Why ── */}
          <section className="mb-14">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Consolidated Reporting
            </h1>
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed mb-8">
              When a group has multiple legal entities, you need one set of financials that shows
              the whole picture — as if it were a single economic entity. This working paper shows
              how that is done, step by step, using a real multi-entity group under PSAK 338.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CONCEPTS.map((c) => (
                <KeyConceptCard key={c.title} title={c.title} description={c.description} />
              ))}
            </div>
          </section>

          {/* ── SECTION 2 — Five-Step Process ── */}
          <section className="mb-14">
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-accent mb-6">
              How Consolidation Works
            </p>

            {/* Desktop: horizontal */}
            <div className="hidden md:flex items-start gap-0">
              {STEPS.map((s, i) => (
                <div key={s.number} className="flex items-start flex-1">
                  <ProcessStep {...s} />
                  {i < STEPS.length - 1 && (
                    <div className="flex items-center pt-5 px-1">
                      <div className="w-8 h-px bg-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: vertical */}
            <div className="flex flex-col md:hidden gap-0">
              {STEPS.map((s, i) => (
                <div key={s.number}>
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full border-2 border-accent flex items-center justify-center text-accent text-sm font-semibold shrink-0">
                        {String(s.number).padStart(2, '0')}
                      </div>
                      {i < STEPS.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
                    </div>
                    <div className="pt-1.5">
                      <h4 className="font-semibold text-foreground text-sm mb-0.5">{s.title}</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SECTION 3 — Working Paper ── */}
          <section className="mb-14">
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-accent mb-2">
              The Working Paper
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              PT Dummy C and Subsidiaries — Consolidated Statement of Financial Position — December 31, 2024
            </p>

            <WorkingPaperTable />
          </section>

          {/* ── Closing ── */}
          <p className="text-sm text-muted-foreground">
            Consolidation is not a formula. It is a judgment about control, structure, and what the numbers are actually saying.
          </p>
        </div>
      </main>
    </PageLayout>
  );
}
