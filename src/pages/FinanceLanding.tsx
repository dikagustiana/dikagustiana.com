/**
 * FinanceLanding — Publication-style finance landing page.
 *
 * Structure:
 *   1. Featured Essay (DB-driven via finance_settings)
 *   2. Four equal domain entry points (DB-driven via finance_sections)
 *
 * All content is DB-backed and admin-editable.
 */

import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Landmark, Target, BarChart3, TrendingUp, type LucideIcon } from 'lucide-react';
import { useFeaturedFinanceEssay, useFinanceSections } from '@/hooks/queries/useFinance';

/**
 * Map DB icon name → Lucide component.
 * Icons stored in finance_sections.icon column.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Landmark,
  Target,
  BarChart3,
  TrendingUp,
};

/**
 * Map section slug → route path.
 */
function sectionHref(slug: string): string {
  return `/finance/${slug}`;
}

export default function FinanceLanding() {
  const { data: featured, isLoading: featuredLoading } = useFeaturedFinanceEssay();
  const { data: sections, isLoading: sectionsLoading } = useFinanceSections();

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
        <div className="mb-10 max-w-2xl">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Finance exists to support decisions — not to produce reports.
            This section covers the ideas, the strategy, the planning, and the analysis.
          </p>
          <p className="text-base text-muted-foreground mt-3">
            Start with Fundamentals if you are building from scratch.
          </p>
        </div>

        {/* Featured Essay */}
        {featuredLoading ? (
          <div className="border border-border rounded-lg p-8 mb-12">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-8 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : featured ? (
          (() => {
            const trackSlug = featured.finance_section || 'fundamentals';
            const featuredHref = `/finance/${trackSlug}`;

            return (
              <Link
                to={featuredHref}
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
            );
          })()
        ) : null}

        {/* Domain Entry Points — DB-driven */}
        {sectionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : sections && sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((domain) => {
              const Icon = (domain.icon && ICON_MAP[domain.icon]) || Landmark;
              return (
                <Link key={domain.id} to={sectionHref(domain.slug)}>
                  <Card className="h-full hover:border-primary/40 transition-all group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {domain.title}
                            </h3>
                            {domain.slug === 'fundamentals' && (
                              <Badge variant="secondary" className="text-xs">Start here</Badge>
                            )}
                          </div>
                          {domain.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {domain.description}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
