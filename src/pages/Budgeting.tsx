import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Budgeting() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Finance', path: '/finance-101' },
              { label: 'Budgeting' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Budgeting
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master the art of budget creation, management, and variance analysis.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Comprehensive budgeting content is being developed.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
