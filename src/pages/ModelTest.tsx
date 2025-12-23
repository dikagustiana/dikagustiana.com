import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const testResults = [
  { name: 'Balance Sheet Validation', status: 'passed' },
  { name: 'Income Statement Check', status: 'passed' },
  { name: 'Cash Flow Reconciliation', status: 'pending' },
  { name: 'Ratio Calculations', status: 'failed' },
];

export default function ModelTest() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: "Dika's Tools", path: '/dikas-tools' },
              { label: 'Model Platform', path: '/model' },
              { label: 'Test Suite' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-display font-bold">
              Model Test Suite
            </h1>
            <Button>Run All Tests</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((test) => (
                  <div key={test.name} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <span>{test.name}</span>
                    {test.status === 'passed' && <CheckCircle className="h-5 w-5 text-accent" />}
                    {test.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                    {test.status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
