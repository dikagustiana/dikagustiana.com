import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BarChart3, TestTube, Wallet, TrendingUp, Brain } from 'lucide-react';

const tools = [
  {
    id: 'personal-finance',
    title: 'Personal Finance',
    description: 'Track assets, liabilities, transactions. Calculate net worth. Monitor cash flow.',
    icon: Wallet,
    link: '/personal-finance',
    status: 'active',
    whatToCheck: 'Account balances, recurring transactions, spending categories.',
    decisionSupported: 'Is net worth growing? Is cash flow positive?',
  },
  {
    id: 'model-platform',
    title: 'Financial Model Platform',
    description: 'Build, test, and deploy financial models. Validate assumptions against actuals.',
    icon: BarChart3,
    link: '/model',
    testLink: '/model/test',
    status: 'active',
    whatToCheck: 'Model outputs, assumption sensitivity, forecast accuracy.',
    decisionSupported: 'Are projections reliable? Which assumptions matter most?',
  },
  {
    id: 'remora-trading',
    title: 'Remora Trading',
    description: 'Semi-automated trading signals for Indonesian equity markets using IDX data.',
    icon: TrendingUp,
    link: '/dikas-tools/remora-trading',
    status: 'active',
    whatToCheck: 'Signal freshness, data quality, position sizing.',
    decisionSupported: 'Which signals to act on? What size per position?',
  },
  {
    id: 'quant-engine',
    title: 'Dika Quant Engine',
    description: 'Regime-aware probabilistic signals with walk-forward backtesting.',
    icon: Brain,
    link: '/dikas-tools/quant-engine',
    status: 'active',
    whatToCheck: 'Regime state, signal probability, backtest metrics.',
    decisionSupported: 'Is current regime favorable? What edge exists?',
  },
];

export default function DikasTools() {
  return (
    <PageLayout
      variant="tool"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: "Dika's Tools" }
      ]}
      showManifesto
      manifesto="Tools exist to support decisions. If a tool doesn't inform a decision, it's entertainment."
    >
      <SEO
        title="Dika's Tools"
        description="Financial modeling, analysis, and automation tools. Personal finance tracking, trading signals, and quantitative analysis."
      />
      
      <div className="container py-8">
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Dika's Tools
          </h1>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>What These Do:</strong> Financial modeling, personal finance tracking, trading signal generation.</p>
            <p><strong>How to Use:</strong> Each tool answers specific questions. Pick the tool that matches your question.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {tools.map((tool) => (
            <Card key={tool.id} className="border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <tool.icon className="h-10 w-10 text-primary" />
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded capitalize">
                    {tool.status}
                  </span>
                </div>
                <CardTitle>{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2 border-t pt-4">
                  <p><span className="font-medium text-muted-foreground">What to Check:</span> {tool.whatToCheck}</p>
                  <p><span className="font-medium text-muted-foreground">Decision Supported:</span> {tool.decisionSupported}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={tool.link} className="flex-1">
                    <Button className="w-full">Open Tool</Button>
                  </Link>
                  {tool.testLink && (
                    <Link to={tool.testLink}>
                      <Button variant="outline">
                        <TestTube className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
