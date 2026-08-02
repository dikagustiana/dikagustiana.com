/**
 * FinanceLanding — Publication-style finance landing page.
 *
 * Structure:
 *   1. Featured Essay (essays.is_selected — the ONE featuring mechanism)
 *   2. Four equal domain entry points (DB-driven via finance_sections)
 *
 * All content is DB-backed and admin-editable.
 */

import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { useFeaturedFinanceEssay, useFinanceSections } from '@/hooks/queries/useFinance';
import { essayUrl, essayUrlInputFromRow, universalEssayUrl } from '@/lib/essayUrl';

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

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Finance</h1>
        <div className="mb-10 max-w-2xl">
          <p className="text-base text-muted-foreground leading-relaxed">
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
            // The old hand-built `/essay/${slug}` (singular) matched no route
            // at all — a dead link behind a Featured banner. The canonical
            // builder cannot emit a URL that is not in the route table.
            const featuredHref =
              essayUrl(essayUrlInputFromRow(featured)) ?? universalEssayUrl(featured.slug);

            return (
              <Link
                to={featuredHref}
                className="block border border-border rounded-lg p-8 mb-12 hover:border-primary/40 transition-colors group"
              >
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5 mb-4 inline-block">Featured</span>
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
            {sections.map((domain) => (
              <Link key={domain.id} to={sectionHref(domain.slug)} className="group">
                <div className="flex items-start gap-4 rounded-lg border border-border p-5 hover:border-primary/40 transition-all h-full">
                  <span className="text-lg font-mono font-bold text-muted-foreground tabular-nums shrink-0">
                    {String(domain.sort_order).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {domain.title}
                      </h3>
                      {domain.slug === 'fundamentals' && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5">
                          Start here
                        </span>
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
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
