import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function ModelPlatform() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: "Dika's Tools", path: '/dikas-tools' },
              { label: 'Financial Model Platform' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-4">
            Financial Model Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Build, test, and deploy financial models with our comprehensive platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Model</CardTitle>
                <CardDescription>Start building a new financial model from scratch.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button>Create Model</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Suite</CardTitle>
                <CardDescription>Run tests on your existing models.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/model/test">
                  <Button variant="outline">Run Tests</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
