import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

export default function ExecutiveDashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Executive Dashboard' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Executive Dashboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            High-level overview of key financial metrics and KPIs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-2xl">$12.5M</CardTitle>
              <CardDescription>Total Revenue</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-accent mb-2" />
              <CardTitle className="text-2xl">+15.3%</CardTitle>
              <CardDescription>Growth Rate</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <PieChart className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-2xl">23.4%</CardTitle>
              <CardDescription>Profit Margin</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Activity className="h-8 w-8 text-accent mb-2" />
              <CardTitle className="text-2xl">1.8x</CardTitle>
              <CardDescription>Asset Turnover</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
