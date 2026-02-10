import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const consolidationTopics = [
  { 
    title: 'PSAK Principles', 
    path: '/accounting/consolidation/psak-principles', 
    description: 'Control-based consolidation and when it applies' 
  },
  { 
    title: 'Equity Adjustment - Parent', 
    path: '/accounting/consolidation/equity-adjustment-parent', 
    description: 'Revaluing subsidiary equity to fair value at acquisition' 
  },
  { 
    title: 'Elimination of Equity', 
    path: '/accounting/consolidation/elimination-equity', 
    description: 'Removing investment vs subsidiary equity to avoid double-counting' 
  },
  { 
    title: 'Elimination - Balance Sheet', 
    path: '/accounting/consolidation/elimination-balance-sheet', 
    description: 'Intercompany receivables, payables, and loans' 
  },
  { 
    title: 'Elimination - P&L', 
    path: '/accounting/consolidation/elimination-pnl', 
    description: 'Intercompany sales, management fees, and dividends' 
  },
  { 
    title: 'Control - SOCE', 
    path: '/accounting/consolidation/control-soce', 
    description: 'Statement of Changes in Equity under consolidation' 
  },
  { 
    title: 'Control - NCI Movement', 
    path: '/accounting/consolidation/control-nci-movement', 
    description: 'Tracking non-controlling interest through transactions' 
  },
  { 
    title: 'Control - BS Schedule', 
    path: '/accounting/consolidation/control-bs-schedule', 
    description: 'Supporting schedules for consolidated balance sheet' 
  },
  { 
    title: 'Control - Segment Info', 
    path: '/accounting/consolidation/control-segment-info', 
    description: 'IFRS 8 / PSAK 5 segment reporting requirements' 
  },
];

export default function ConsolidatedReporting() {
  return (
    <PageLayout variant="content" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Accounting', path: '/accounting' }, { label: 'Consolidated Reporting' }]}>
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Consolidated Reporting
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              When a group has multiple legal entities, you need one set of financials that 
              shows the whole picture—as if it were a single economic entity.
            </p>
          </div>

          {/* Core Insight */}
          <Card className="mb-12 bg-secondary/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-3">Why Consolidation Gets Complicated</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                Imagine three companies in a group. Company A sells to Company B, which sells to Company C. 
                Each records revenue. If you just add them up, you've counted the same economic transaction 
                three times. Consolidation eliminates these intercompany transactions to show what the 
                group actually earned from external customers.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Add in partial ownership, foreign currencies, different year-ends, and acquisitions 
                mid-year—and you understand why consolidation is where accountants earn their fees.
              </p>
            </CardContent>
          </Card>

          {/* Key Concepts Before Diving In */}
          <div className="mb-12">
            <h2 className="text-xl font-display font-semibold text-foreground mb-6">Key Concepts</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-5">
                  <h4 className="font-semibold text-foreground mb-2">Control</h4>
                  <p className="text-muted-foreground text-sm">
                    You consolidate entities you control. Control usually means &gt;50% voting rights, 
                    but can exist with less if you have contractual power over key decisions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h4 className="font-semibold text-foreground mb-2">Non-Controlling Interest</h4>
                  <p className="text-muted-foreground text-sm">
                    If you own 70% of a subsidiary, you consolidate 100% of its results. 
                    The 30% you don't own is shown as NCI—a separate line in equity.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <h4 className="font-semibold text-foreground mb-2">Goodwill</h4>
                  <p className="text-muted-foreground text-sm">
                    The excess of what you paid over the fair value of net assets acquired. 
                    It represents future economic benefits not separately identifiable.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Topic Cards */}
          <div className="mb-12">
            <h2 className="text-xl font-display font-semibold text-foreground mb-6">Consolidation Topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {consolidationTopics.map((topic) => (
                <Link key={topic.path} to={topic.path}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">{topic.title}</CardTitle>
                      <CardDescription>{topic.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Practical Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Practical Consolidation Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>
                    <strong className="text-foreground">Match before you consolidate</strong> — 
                    Intercompany balances should agree to zero before elimination entries. 
                    Chasing differences during close wastes time.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>
                    <strong className="text-foreground">Document your adjustments</strong> — 
                    Every elimination entry should have a clear trail. Auditors will ask.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>
                    <strong className="text-foreground">Standardize accounting policies</strong> — 
                    Subsidiaries using different policies create reconciliation work. 
                    Align policies at acquisition.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>
                    <strong className="text-foreground">Handle FX systematically</strong> — 
                    Decide upfront on rate sources, timing, and how to handle intercompany loans in foreign currency.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

    </PageLayout>
  );
}
