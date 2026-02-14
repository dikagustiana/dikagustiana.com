/**
 * FinanceLifecyclePage — Publication-style essay index for a finance section.
 *
 * Noahpinion-inspired: headline-led listing, no full essay rendering.
 * Reused for strategic-finance, planning-forecasting, financial-analytics.
 *
 * Route: /finance/:section
 *
 * Section metadata (title, description) is DB-backed via finance_sections table.
 * Essays filtered by finance_section field, ordered by finance_order then date.
 */

import { Link, useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceSectionBySlug, useFinanceSectionEssays } from '@/hooks/queries/useFinance';
import { format, parseISO } from 'date-fns';

const VALID_SECTIONS = new Set(['strategic-finance', 'planning-forecasting', 'financial-analytics']);

export default function FinanceLifecyclePage() {
  const { section } = useParams<{ section: string }>();

  // Redirect invalid sections back to finance landing
  if (!section || !VALID_SECTIONS.has(section)) {
    return <Navigate to="/finance" replace />;
  }

  return <LifecycleContent section={section} />;
}

function LifecycleContent({ section }: { section: string }) {
  const { data: meta, isLoading: metaLoading } = useFinanceSectionBySlug(section);
  const { data: essays, isLoading: essaysLoading } = useFinanceSectionEssays(section);

  const isLoading = metaLoading || essaysLoading;

  const title = meta?.title || section;
  const description = meta?.description || '';

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: title },
      ]}
    >
      <SEO title={title} description={description} />

      <div className="py-8 container max-w-3xl">
        {metaLoading ? (
          <>
            <Skeleton className="h-10 w-64 mb-3" />
            <Skeleton className="h-5 w-full mb-10" />
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">{title}</h1>
            {description && (
              <p className="text-lg text-muted-foreground mb-10">{description}</p>
            )}
          </>
        )}

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
