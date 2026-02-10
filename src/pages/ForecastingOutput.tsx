import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ForecastingOutput() {
  return (
    <PageLayout
      variant="content"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Forecasting', path: '/forecasting/input' },
        { label: 'Output' }
      ]}
    >
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-8">Forecasting Output</h1>

          <div className="flex gap-4 mb-8">
            <Link to="/forecasting/input">
              <Button variant="outline">Input</Button>
            </Link>
            <Link to="/forecasting/assumptions">
              <Button variant="outline">Assumptions</Button>
            </Link>
            <Button variant="default">Output</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forecast Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">
                Enter input data and assumptions to generate forecast results.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">$0</div>
                  <div className="text-sm text-muted-foreground">Year 3 Revenue</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">$0</div>
                  <div className="text-sm text-muted-foreground">Year 3 Net Income</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">0%</div>
                  <div className="text-sm text-muted-foreground">CAGR</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
