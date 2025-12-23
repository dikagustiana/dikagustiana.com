import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Calculator, PieChart } from 'lucide-react';

const workspaceItems = [
  {
    title: 'Executive Dashboard',
    description: 'High-level overview of key financial metrics and KPIs',
    icon: BarChart3,
    path: '/executive-dashboard',
  },
  {
    title: 'Financial Analytics',
    description: 'Deep dive into financial data with advanced analytics',
    icon: TrendingUp,
    path: '/finance-101/financial-analytics',
  },
  {
    title: 'Forecasting',
    description: 'Financial planning and forecasting tools',
    icon: Calculator,
    path: '/forecasting/input',
  },
  {
    title: 'Budgeting',
    description: 'Budget management and tracking',
    icon: PieChart,
    path: '/finance-101/budgeting',
  },
];

export default function FinanceWorkspace() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Finance Workspace' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Finance Workspace
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your central hub for financial analysis, planning, and decision-making tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {workspaceItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <item.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
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
