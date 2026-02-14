/**
 * FinanceLanding — Publication-style finance landing page.
 *
 * Structure:
 *   1. Featured Essay (DB-driven)
 *   2. Four equal domain entry points
 */

import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Landmark, Target, BarChart3, TrendingUp } from 'lucide-react';
import { useFeaturedFinanceEssay } from '@/hooks/queries/useFinance';

const domains = [
  {
    id: 'fundamentals',
    title: 'Fundamentals',
    description: 'The 12 foundational ideas that everything else builds on.',
    icon: Landmark,
    href: '/finance/fundamentals',
  },
  {
    id: 'strategic-finance',
    title: 'Strategic Finance',
    description: 'Where finance meets strategy. Capital allocation, investment decisions, and long-term value creation.',
    icon: Target,
    href: '/finance/strategic-finance',
  },
  {
    id: 'planning-forecasting',
    title: 'Planning & Forecasting',
    description: 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.',
    icon: BarChart3,
    href: '/finance/planning-forecasting',
  },
  {
    id: 'financial-analytics',
    title: 'Financial Analytics',
    description: 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.',
    icon: TrendingUp,
    href: '/finance/financial-analytics',
  },
];

export default function FinanceLanding() {
  const { data: featured, isLoading: featuredLoading } = useFeaturedFinanceEssay();

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Finance' }]}
    >
      <SEO
        title="Finance"
        description="Finance knowledge for decision-making. Fundamentals first, then applied finance lifecycle."
      />

      <div className="py-8 container max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-2">Finance</h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
          Finance exists to support decisions — not to produce reports.
        </p>

        {/* Featured Essay */}
        {featuredLoading ? (
          <div className="border border-border rounded-lg p-8 mb-12">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : featured ? (
          <Link
            to={`/finance-101/essays/${featured.slug}`}
            className="block border border-border rounded-lg p-8 mb-12 hover:border-primary/40 transition-colors group"
          >
            <Badge variant="outline" className="mb-4 text-xs">Featured</Badge>
            <h2 className="text-2xl md:text-3xl font-display font-semibold mb-3 group-hover:text-primary transition-colors">
              {featured.title}
            </h2>
            {featured.snippet && (
              <p className="text-muted-foreground text-lg leading-relaxed">
                {featured.snippet}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              {featured.author && <span>{featured.author}</span>}
              {featured.read_time && <span>{featured.read_time}</span>}
            </div>
          </Link>
        ) : null}

        {/* Domain Entry Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((domain) => (
            <Link key={domain.id} to={domain.href}>
              <Card className="h-full hover:border-primary/40 transition-all group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <domain.icon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {domain.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {domain.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
