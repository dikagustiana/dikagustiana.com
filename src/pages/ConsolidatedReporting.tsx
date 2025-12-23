import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const consolidationTopics = [
  { title: 'PSAK Principles', path: '/accounting/consolidation/psak-principles', description: 'Understanding PSAK consolidation principles' },
  { title: 'Equity Adjustment - Parent', path: '/accounting/consolidation/equity-adjustment-parent', description: 'Parent company equity adjustments' },
  { title: 'Elimination of Equity', path: '/accounting/consolidation/elimination-equity', description: 'Intercompany equity elimination entries' },
  { title: 'Elimination - Balance Sheet', path: '/accounting/consolidation/elimination-balance-sheet', description: 'Balance sheet elimination entries' },
  { title: 'Elimination - P&L', path: '/accounting/consolidation/elimination-pnl', description: 'Income statement elimination entries' },
  { title: 'Control - SOCE', path: '/accounting/consolidation/control-soce', description: 'Statement of Changes in Equity control' },
  { title: 'Control - NCI Movement', path: '/accounting/consolidation/control-nci-movement', description: 'Non-controlling interest movement' },
  { title: 'Control - BS Schedule', path: '/accounting/consolidation/control-bs-schedule', description: 'Balance sheet schedule controls' },
  { title: 'Control - Segment Info', path: '/accounting/consolidation/control-segment-info', description: 'Segment information reporting' },
];

export default function ConsolidatedReporting() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Accounting', path: '/accounting' },
              { label: 'Consolidated Reporting' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Consolidated Reporting
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master the art of consolidated financial statements and group reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
      </main>

      <Footer />
    </div>
  );
}
