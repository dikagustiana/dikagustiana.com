import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';

export default function ForecastingInput() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Forecasting', path: '/forecasting/input' },
              { label: 'Input' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-8">Forecasting Input</h1>
          
          <div className="flex gap-4 mb-8">
            <Button variant="default">Input</Button>
            <Link to="/forecasting/assumptions">
              <Button variant="outline">Assumptions</Button>
            </Link>
            <Link to="/forecasting/output">
              <Button variant="outline">Output</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical Data Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Revenue (Year 1)</Label>
                  <Input type="number" placeholder="Enter revenue" />
                </div>
                <div>
                  <Label>Revenue (Year 2)</Label>
                  <Input type="number" placeholder="Enter revenue" />
                </div>
                <div>
                  <Label>COGS (Year 1)</Label>
                  <Input type="number" placeholder="Enter COGS" />
                </div>
                <div>
                  <Label>COGS (Year 2)</Label>
                  <Input type="number" placeholder="Enter COGS" />
                </div>
              </div>
              <Button className="mt-4">Save & Continue</Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
