import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';

export default function ForecastingAssumptions() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Forecasting', path: '/forecasting/input' },
              { label: 'Assumptions' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-8">Forecasting Assumptions</h1>
          
          <div className="flex gap-4 mb-8">
            <Link to="/forecasting/input">
              <Button variant="outline">Input</Button>
            </Link>
            <Button variant="default">Assumptions</Button>
            <Link to="/forecasting/output">
              <Button variant="outline">Output</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Growth Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Revenue Growth Rate (%)</Label>
                  <Input type="number" placeholder="e.g., 10" />
                </div>
                <div>
                  <Label>COGS as % of Revenue</Label>
                  <Input type="number" placeholder="e.g., 60" />
                </div>
                <div>
                  <Label>OpEx Growth Rate (%)</Label>
                  <Input type="number" placeholder="e.g., 5" />
                </div>
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" placeholder="e.g., 25" />
                </div>
              </div>
              <Button className="mt-4">Save & Generate Forecast</Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
