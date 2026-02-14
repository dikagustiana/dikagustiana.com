/**
 * FinanceLifecyclePage — Publication-style essay index for a finance section.
 *
 * Noahpinion-inspired: headline-led listing, no full essay rendering.
 * Reused for strategic-finance, planning-forecasting, financial-analytics.
 */

import { Link, useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceSectionEssays } from '@/hooks/queries/useFinance';
import { format, parseISO } from 'date-fns';

const sectionMeta: Record<string, { title: string; description: string; dbKey: string }> = {
  'strategic-finance': {
    title: 'Strategic Finance',
    description: 'Where finance meets strategy. Capital allocation, investment decisions, and long-term value creation.',
    dbKey: 'strategic',
  },
  'planning-forecasting': {
    title: 'Planning & Forecasting',
    description: 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.',
    dbKey: 'planning',
  },
  'financial-analytics': {
    title: 'Financial Analytics',
    description: 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.',
    dbKey: 'analytics',
  },
};

export default function FinanceLifecyclePage() {
  const { section } = useParams<{ section: string }>();

  const meta = section ? sectionMeta[section] : null;
  if (!meta) return <Navigate to="/finance" replace />;

  const { data: essays, isLoading } = useFinanceSectionEssays(meta.dbKey);

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: meta.title },
      ]}
    >
      <SEO title={meta.title} description={meta.description} />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">{meta.title}</h1>
        <p className="text-lg text-muted-foreground mb-10">{meta.description}</p>

        {isLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : essays && essays.length > 0 ? (
          <div className="divide-y divide-border">
            {essays.map((essay) => (
              <Link
                key={essay.id}
                to={`/finance-101/essays/${essay.slug}`}
                className="block py-6 first:pt-0 group"
              >
                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2 leading-tight">
                      {essay.title}
                    </h2>
                    {essay.snippet && (
                      <p className="text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                        {essay.snippet}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {essay.date && (
                        <time>{format(parseISO(essay.date), 'MMM d, yyyy')}</time>
                      )}
                      {essay.read_time && <span>{essay.read_time}</span>}
                    </div>
                  </div>
                  {essay.thumbnail_url && (
                    <img
                      src={essay.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="w-24 h-24 object-cover rounded flex-shrink-0"
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No essays published yet in this section.</p>
        )}
      </div>
    </PageLayout>
  );
}
