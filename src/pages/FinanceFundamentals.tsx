/**
 * FinanceFundamentals — Level 1 Index
 *
 * Displays the 12 DB-managed fundamentals as a clean, sequential listing.
 * Each item links to /finance/fundamentals/:slug.
 */

import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceFundamentals } from '@/hooks/queries/useFinance';

export default function FinanceFundamentals() {
  const { data: fundamentals, isLoading } = useFinanceFundamentals();

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Fundamentals' },
      ]}
    >
      <SEO
        title="Fundamentals"
        description="The 12 foundational ideas that everything else in finance builds on."
      />

      <div className="py-8 container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
          Fundamentals
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          The 12 foundational ideas that everything else builds on.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : fundamentals && fundamentals.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {fundamentals.map((f) => (
              <Link
                key={f.id}
                to={`/finance/fundamentals/${f.slug}`}
                className="flex items-baseline gap-4 py-5 group"
              >
                <span className="text-sm font-mono text-muted-foreground tabular-nums shrink-0">
                  {String(f.number ?? f.sort_order).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors block leading-snug">
                    {f.title}
                  </span>
                  {f.thesis && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {f.thesis}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            No fundamentals configured yet.
          </p>
        )}
      </div>
    </PageLayout>
  );
}
