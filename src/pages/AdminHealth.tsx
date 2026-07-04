import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

const healthChecks = [
  { name: 'Database Connection', status: true },
  { name: 'Authentication Service', status: true },
  { name: 'Storage Service', status: true },
  { name: 'API Gateway', status: true },
];

export default function AdminHealth() {
  return (
    <PageLayout
      variant="content"
      role="hybrid"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Admin', path: '/admin/health' },
        { label: 'Health Check' }
      ]}
    >
      <div className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-8">System Health</h1>

          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthChecks.map((check) => (
                  <div key={check.name} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <span>{check.name}</span>
                    {check.status ? (
                      <CheckCircle className="h-5 w-5 text-accent" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
