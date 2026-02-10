import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3, Droplet, Gauge, PieChart } from 'lucide-react';

const analyticsTopics = [
  { id: 'variance-analysis', title: 'Variance Analysis', description: 'Identify and explain differences between actual and budgeted figures.', icon: TrendingUp },
  { id: 'profitability-analysis', title: 'Profitability Analysis', description: 'Measure and analyze profit margins and returns.', icon: BarChart3 },
  { id: 'liquidity-analysis', title: 'Liquidity Analysis', description: 'Assess ability to meet short-term obligations.', icon: Droplet },
  { id: 'efficiency-analysis', title: 'Efficiency Analysis', description: 'Evaluate how effectively resources are utilized.', icon: Gauge },
  { id: 'financial-structure-analysis', title: 'Financial Structure Analysis', description: 'Analyze capital structure and leverage ratios.', icon: PieChart },
];

export default function FinancialAnalytics() {
  return (
    <PageLayout variant="content" role="manager" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance', path: '/finance-101' }, { label: 'Financial Analytics' }]}>
      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Financial Analytics
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deep dive into financial data with advanced analytics techniques.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {analyticsTopics.map((topic) => (
            <Link key={topic.id} to={`/finance-101/financial-analytics/${topic.id}`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <topic.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>

    </PageLayout>
  );
}
