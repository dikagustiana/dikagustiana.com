/**
 * FundamentalDetail — Level 2 Module Page
 *
 * Route: /finance/fundamentals/:slug
 * Displays framing content + essay list for a single fundamental.
 */

import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useFinanceFundamentalBySlug, useFundamentalEssaysByFundamentalId } from '@/hooks/queries/useFinance';
import { format, parseISO } from 'date-fns';

function EssayListing({ fundamentalId }: { fundamentalId: string }) {
  const { data: essays, isLoading } = useFundamentalEssaysByFundamentalId(fundamentalId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!essays || essays.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No essays assigned to this fundamental yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {essays.map((essay) => (
        <Link
          key={essay.id}
          to={`/finance-101/essays/${essay.slug}`}
          className="block group"
        >
          <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
            {essay.title}
          </h3>
          {essay.snippet && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {essay.snippet}
            </p>
          )}
          {essay.date && (
            <time className="text-xs text-muted-foreground mt-1 block">
              {format(parseISO(essay.date), 'MMM d, yyyy')}
            </time>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function FundamentalDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: fundamental, isLoading } = useFinanceFundamentalBySlug(slug || '');

  if (isLoading) {
    return (
      <PageLayout role="manager" breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Fundamentals', path: '/finance/fundamentals' },
        { label: '…' },
      ]}>
        <div className="py-8 container max-w-3xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </PageLayout>
    );
  }

  if (!fundamental) {
    return (
      <PageLayout role="manager" breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Fundamentals', path: '/finance/fundamentals' },
      ]}>
        <div className="py-8 container max-w-3xl">
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-muted-foreground">This fundamental does not exist.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: 'Fundamentals', path: '/finance/fundamentals' },
        { label: fundamental.title },
      ]}
    >
      <SEO
        title={fundamental.title}
        description={fundamental.thesis || `Fundamental concept: ${fundamental.title}`}
      />

      <div className="py-8 container max-w-3xl">
        <span className="text-sm font-mono text-muted-foreground mb-2 block">
          {String(fundamental.number ?? fundamental.sort_order).padStart(2, '0')}
        </span>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-6">
          {fundamental.title}
        </h1>

        {fundamental.framing_content ? (
          <div
            className="prose prose-sm max-w-none text-foreground mb-8"
            dangerouslySetInnerHTML={{ __html: fundamental.framing_content }}
          />
        ) : (
          <p className="text-muted-foreground italic mb-8">
            Framing content coming soon.
          </p>
        )}

        <Separator className="my-8" />

        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          Essays
        </h2>

        <EssayListing fundamentalId={fundamental.id} />
      </div>
    </PageLayout>
  );
}
