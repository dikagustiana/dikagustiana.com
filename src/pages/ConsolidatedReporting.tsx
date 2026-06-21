import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ConceptPanel } from '@/components/consolidation/ConceptPanel';
import { ConsolidationProcessStep } from '@/components/consolidation/ConsolidationProcessStep';
import { AccountRow } from '@/components/consolidation/AccountRow';
import { Network, Users, TrendingUp, BookOpen, Layers, MinusCircle, Calculator, FileCheck } from 'lucide-react';

const PROCESS_STEPS = [
  { icon: BookOpen, title: 'Individual Books', description: 'Each entity maintains its own complete set of financials.' },
  { icon: Layers, title: 'Combine', description: 'All entity books are added together column by column.' },
  { icon: MinusCircle, title: 'Eliminate Intercompany', description: 'Loans, sales, dividends between entities are removed.' },
  { icon: Calculator, title: 'Calculate NCI', description: 'Minority shareholders\' share of equity and profit is separated.' },
  { icon: FileCheck, title: 'Consolidated Output', description: 'The group is presented as a single economic entity.' },
];

const TABLE_DATA = [
  { label: 'ASSET', isHeader: true },
  { label: 'CURRENT ASSET', isHeader: true },
  { label: 'Cash and cash equivalents', values: [125000, 45000, 32000, 18000], combined: 220000, elimination: 0, consolidated: 220000, indent: 1 },
  { label: 'Trade Receivables — Third Parties', values: [89000, 23000, 15000, 8000], combined: 135000, elimination: 0, consolidated: 135000, indent: 1 },
  { label: 'Trade Receivables — Related Parties', values: [45000, 12000, 0, 5000], combined: 62000, elimination: -62000, consolidated: 0, indent: 1 },
  { label: 'Unbilled — Third Parties', values: [34000, 8000, 6000, 0], combined: 48000, elimination: 0, consolidated: 48000, indent: 1 },
  { label: 'Current portion of Lease receivables', values: [0, 0, 4500, 0], combined: 4500, elimination: 0, consolidated: 4500, indent: 1 },
  { label: 'Employee Receivables', values: [2300, 800, 400, 200], combined: 3700, elimination: 0, consolidated: 3700, indent: 1 },
  { label: 'Loan Receivable — Third Parties', values: [15000, 0, 0, 0], combined: 15000, elimination: 0, consolidated: 15000, indent: 1 },
  { label: 'Loan Receivable — Related Parties', values: [30000, 10000, 0, 0], combined: 40000, elimination: -40000, consolidated: 0, indent: 1 },
  { label: 'Other Receivable — Third Parties', values: [5600, 1200, 900, 300], combined: 8000, elimination: 0, consolidated: 8000, indent: 1 },
  { label: 'Other Receivable — Related Parties', values: [8000, 0, 3000, 0], combined: 11000, elimination: -11000, consolidated: 0, indent: 1 },
  { label: 'Inventories', values: [67000, 22000, 18000, 9000], combined: 116000, elimination: 0, consolidated: 116000, indent: 1 },
  { label: 'Prepaid Tax', values: [12000, 4000, 2500, 1500], combined: 20000, elimination: 0, consolidated: 20000, indent: 1 },
  { label: 'Prepayment and Advances', values: [9800, 3200, 1800, 600], combined: 15400, elimination: 0, consolidated: 15400, indent: 1 },
  { label: 'Restricted Cash and Time Deposits', values: [0, 0, 0, 5000], combined: 5000, elimination: 0, consolidated: 5000, indent: 1 },
  { label: 'Other Current Assets', values: [3400, 1100, 700, 200], combined: 5400, elimination: 0, consolidated: 5400, indent: 1 },
  { label: 'TOTAL CURRENT ASSETS', values: [446100, 130300, 84800, 47800], combined: 709000, elimination: -113000, consolidated: 596000, isSubtotal: true },
  { label: 'NON-CURRENT ASSET', isHeader: true },
  { label: 'Investment in Subsidiaries', values: [250000, 0, 0, 0], combined: 250000, elimination: -250000, consolidated: 0, indent: 1 },
  { label: 'Deemed Investment', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 0, indent: 1 },
  { label: 'Fixed Assets', values: [380000, 120000, 95000, 45000], combined: 640000, elimination: 0, consolidated: 640000, indent: 1 },
  { label: 'Intangible Assets', values: [25000, 5000, 3000, 0], combined: 33000, elimination: 0, consolidated: 33000, indent: 1 },
  { label: 'Right of Use of Asset', values: [18000, 6000, 4500, 2000], combined: 30500, elimination: 0, consolidated: 30500, indent: 1 },
  { label: 'Goodwill', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 85000, indent: 1 },
  { label: 'Shareholder Receivable', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 0, indent: 1 },
  { label: 'Other Non-Current Assets', values: [7500, 2200, 1800, 500], combined: 12000, elimination: 0, consolidated: 12000, indent: 1 },
  { label: 'TOTAL NON-CURRENT ASSETS', values: [680500, 133200, 104300, 47500], combined: 965500, elimination: -250000, consolidated: 800500, isSubtotal: true },
  { label: 'TOTAL ASSETS', values: [1126600, 263500, 189100, 95300], combined: 1674500, elimination: -363000, consolidated: 1396500, isSubtotal: true },
  { label: 'LIABILITIES', isHeader: true },
  { label: 'CURRENT LIABILITIES', isHeader: true },
  { label: 'Trade Payables — Third Parties', values: [78000, 19000, 14000, 7000], combined: 118000, elimination: 0, consolidated: 118000, indent: 1 },
  { label: 'Trade Payables — Related Parties', values: [12000, 5000, 3000, 2000], combined: 22000, elimination: -22000, consolidated: 0, indent: 1 },
  { label: 'Accrued Expenses', values: [15000, 4500, 3200, 1800], combined: 24500, elimination: 0, consolidated: 24500, indent: 1 },
  { label: 'Taxes Payable', values: [9000, 3000, 2000, 1000], combined: 15000, elimination: 0, consolidated: 15000, indent: 1 },
  { label: 'Short-term Borrowings', values: [50000, 15000, 10000, 5000], combined: 80000, elimination: 0, consolidated: 80000, indent: 1 },
  { label: 'Current portion of Long-term Debt', values: [20000, 8000, 5000, 3000], combined: 36000, elimination: 0, consolidated: 36000, indent: 1 },
  { label: 'TOTAL CURRENT LIABILITIES', values: [184000, 54500, 37200, 19800], combined: 295500, elimination: -22000, consolidated: 273500, isSubtotal: true },
  { label: 'NON-CURRENT LIABILITIES', isHeader: true },
  { label: 'Long-term Borrowings', values: [200000, 60000, 45000, 20000], combined: 325000, elimination: 0, consolidated: 325000, indent: 1 },
  { label: 'Lease Liabilities', values: [15000, 5000, 3500, 1500], combined: 25000, elimination: 0, consolidated: 25000, indent: 1 },
  { label: 'Employee Benefits Obligation', values: [18000, 6000, 4000, 2000], combined: 30000, elimination: 0, consolidated: 30000, indent: 1 },
  { label: 'Deferred Tax Liabilities', values: [8000, 2500, 1800, 800], combined: 13100, elimination: 0, consolidated: 13100, indent: 1 },
  { label: 'TOTAL NON-CURRENT LIABILITIES', values: [241000, 73500, 54300, 24300], combined: 393100, elimination: 0, consolidated: 393100, isSubtotal: true },
  { label: 'TOTAL LIABILITIES', values: [425000, 128000, 91500, 44100], combined: 688600, elimination: -22000, consolidated: 666600, isSubtotal: true },
  { label: 'EQUITY', isHeader: true },
  { label: 'Share Capital', values: [400000, 80000, 60000, 30000], combined: 570000, elimination: -170000, consolidated: 400000, indent: 1 },
  { label: 'Retained Earnings', values: [250000, 45000, 30000, 18000], combined: 343000, elimination: -86000, consolidated: 257000, indent: 1 },
  { label: 'Current Year Income', values: [48600, 10500, 7600, 3200], combined: 69900, elimination: 0, consolidated: 69900, indent: 1 },
  { label: 'ESOP Reserve', values: [3000, 0, 0, 0], combined: 3000, elimination: 0, consolidated: 3000, indent: 1 },
  { label: 'OCI', values: [0, 0, 0, 0], combined: 0, elimination: 0, consolidated: 0, indent: 1 },
  { label: 'Non-Controlling Interest', values: [null, null, null, null], combined: null, elimination: -85000, consolidated: null, indent: 1 },
  { label: 'TOTAL EQUITY', values: [701600, 135500, 97600, 51200], combined: 985900, elimination: -341000, consolidated: 729900, isSubtotal: true },
  { label: 'TOTAL LIABILITIES AND EQUITY', values: [1126600, 263500, 189100, 95300], combined: 1674500, elimination: -363000, consolidated: 1396500, isSubtotal: true },
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
              how that is done, step by step, using a real multi-entity group under PSAK 338.
            </p>
            <div className="w-full h-px bg-border mt-6" />
          </section>

          {/* ── SECTION 2 — Concept Framework ── */}
          <section className="mb-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ConceptPanel
                icon={Network}
                title="Control"
                definition="You consolidate entities you control. Control usually means more than 50% voting rights but can exist with less if you have contractual power over key decisions."
              />
              <ConceptPanel
                icon={Users}
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
                icon={TrendingUp}
                title="Goodwill"
                definition="The excess of what you paid over the fair value of net assets acquired at the acquisition date. Represents future economic benefits not separately identifiable."
              >
                <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 border border-border text-center">
                  Price Paid − Net Assets = Goodwill
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
                    icon={step.icon}
                    title={step.title}
                    description={step.description}
                    showArrow={i < PROCESS_STEPS.length - 1}
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
                      {['Dummy C', 'Dummy D', 'Dummy E', 'Dummy F'].map((name) => (
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
                    {TABLE_DATA.map((row, i) => (
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
          </section>

          {/* ── Closing ── */}
          <p className="text-sm text-muted-foreground">
            Consolidation is not a formula. It is a judgment about control, structure, and what the numbers are actually saying.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
