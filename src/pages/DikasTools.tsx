import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BarChart3, TestTube, Lock, Clock, Wallet } from 'lucide-react';

export default function DikasTools() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: "Dika's Tools" }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Dika's Tools
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced tools for financial modeling, analysis, and automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Personal Finance - Active */}
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Wallet className="h-10 w-10 text-primary" />
                <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">Active</span>
              </div>
              <CardTitle>Personal Finance</CardTitle>
              <CardDescription>
                Track assets, cash flow, and personal balance sheet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/personal-finance">
                <Button className="w-full">
                  Open Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Tool 1 - Active */}
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="h-10 w-10 text-primary" />
                <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">Active</span>
              </div>
              <CardTitle>Financial Model Platform</CardTitle>
              <CardDescription>
                Build, test, and deploy financial models with our comprehensive platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/model">
                <Button className="w-full">
                  Open Platform
                </Button>
              </Link>
              <Link to="/model/test">
                <Button variant="outline" className="w-full">
                  <TestTube className="h-4 w-4 mr-2" />
                  Run Test Suite
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Tool 2 - Coming Soon */}
          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Lock className="h-10 w-10 text-muted-foreground" />
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Coming Soon
                </span>
              </div>
              <CardTitle className="text-muted-foreground">Automation Engine</CardTitle>
              <CardDescription>
                Automate repetitive financial tasks and workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Tool 3 - Coming Soon */}
          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Lock className="h-10 w-10 text-muted-foreground" />
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Coming Soon
                </span>
              </div>
              <CardTitle className="text-muted-foreground">Report Generator</CardTitle>
              <CardDescription>
                Generate professional financial reports automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
