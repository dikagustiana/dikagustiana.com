import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';

const topicDetails: Record<string, { title: string; description: string }> = {
  'variance-analysis': { title: 'Variance Analysis', description: 'Learn to identify and explain differences between actual and budgeted figures.' },
  'profitability-analysis': { title: 'Profitability Analysis', description: 'Measure and analyze profit margins, returns on investment, and overall profitability.' },
  'liquidity-analysis': { title: 'Liquidity Analysis', description: 'Assess the ability to meet short-term obligations and manage working capital.' },
  'efficiency-analysis': { title: 'Efficiency Analysis', description: 'Evaluate how effectively resources are utilized to generate revenue.' },
  'financial-structure-analysis': { title: 'Financial Structure Analysis', description: 'Analyze capital structure, leverage ratios, and financial risk.' },
};

export default function FinancialAnalyticsDetail() {
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
              { label: 'Finance', path: '/finance-101' },
              { label: 'Financial Analytics', path: '/finance-101/financial-analytics' },
              { label: details?.title || 'Topic' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {details?.title || 'Analytics Topic'}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {details?.description || 'Detailed content for this analytics topic.'}
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
