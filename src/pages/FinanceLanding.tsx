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
import { useFeaturedFinanceEssay, useFinanceSections, useFinanceSettings } from '@/hooks/queries/useFinance';

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
  const { data: settings, isLoading: settingsLoading } = useFinanceSettings();

  const tagline = settings?.finance_tagline || '';

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
        {(settingsLoading || tagline) && (
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
            {settingsLoading ? <Skeleton className="h-5 w-64 inline-block" /> : tagline}
          </p>
        )}

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
                          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                            {domain.title}
                          </h3>
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
