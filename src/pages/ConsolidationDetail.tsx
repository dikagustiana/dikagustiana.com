import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';

const topicDetails: Record<string, { title: string; description: string }> = {
  'psak-principles': { title: 'PSAK Principles', description: 'Understanding PSAK consolidation principles and their application.' },
  'equity-adjustment-parent': { title: 'Equity Adjustment - Parent', description: 'Parent company equity adjustments in consolidated statements.' },
  'elimination-equity': { title: 'Elimination of Equity', description: 'Intercompany equity elimination entries and procedures.' },
  'elimination-balance-sheet': { title: 'Elimination - Balance Sheet', description: 'Balance sheet elimination entries for intercompany transactions.' },
  'elimination-pnl': { title: 'Elimination - P&L', description: 'Income statement elimination entries for intercompany transactions.' },
  'control-soce': { title: 'Control - SOCE', description: 'Statement of Changes in Equity control procedures.' },
  'control-nci-movement': { title: 'Control - NCI Movement', description: 'Non-controlling interest movement tracking and reporting.' },
  'control-bs-schedule': { title: 'Control - BS Schedule', description: 'Balance sheet schedule controls and reconciliation.' },
  'control-segment-info': { title: 'Control - Segment Info', description: 'Segment information reporting and disclosure.' },
};

export default function ConsolidationDetail() {
  const { topic } = useParams<{ topic: string }>();
  const details = topic ? topicDetails[topic] : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Accounting', path: '/accounting' },
              { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
              { label: details?.title || 'Topic' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {details?.title || 'Consolidation Topic'}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {details?.description || 'Detailed content for this consolidation topic.'}
          </p>

          <div className="bg-card rounded-lg border border-border p-8">
            <p className="text-muted-foreground italic">
              Detailed content for this topic is being developed. Check back soon for comprehensive guides and examples.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
