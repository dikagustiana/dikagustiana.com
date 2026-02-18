/**
 * FinanceModulePage — Level 2 Module Page
 *
 * Route: /finance/:track/:moduleSlug
 * Unified replacement for FundamentalDetail.tsx — works for any track.
 *
 * Renders framing content and an essay list for a single finance module.
 */

import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useFinanceSectionBySlug,
  useFinanceModuleBySlug,
  useEssaysByModuleId,
} from '@/hooks/queries/useFinance';
import { format, parseISO } from 'date-fns';

// ── Essay listing sub-component ──────────────────────────────────────────────

function EssayListing({
  moduleId,
  track,
  moduleSlug,
}: {
  moduleId: string;
  track: string;
  moduleSlug: string;
}) {
  const { data: essays, isLoading } = useEssaysByModuleId(moduleId);

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
        No essays assigned to this module yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {essays.map((essay) => (
        <Link
          key={essay.id}
          to={`/finance/${track}/${moduleSlug}/${essay.slug}`}
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

// ── Page component ────────────────────────────────────────────────────────────

export default function FinanceModulePage() {
  const { track, moduleSlug } = useParams<{ track: string; moduleSlug: string }>();

  const { data: section, isLoading: sectionLoading } = useFinanceSectionBySlug(track || '');
  const { data: module, isLoading: moduleLoading } = useFinanceModuleBySlug(moduleSlug || '');

  const isLoading = sectionLoading || moduleLoading;
  const trackTitle = section?.title ?? track ?? '';

  if (isLoading) {
    return (
      <PageLayout
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Finance', path: '/finance' },
          { label: trackTitle || '…', path: track ? `/finance/${track}` : undefined },
          { label: '…' },
        ]}
      >
        <div className="py-8 container max-w-3xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </PageLayout>
    );
  }

  if (!module) {
    return (
      <PageLayout
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Finance', path: '/finance' },
          { label: trackTitle, path: track ? `/finance/${track}` : undefined },
        ]}
      >
        <div className="py-8 container max-w-3xl">
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-muted-foreground">This module does not exist.</p>
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
        { label: trackTitle, path: track ? `/finance/${track}` : undefined },
        { label: module.title },
      ]}
    >
      <SEO
        title={module.title}
        description={module.thesis || `Module: ${module.title}`}
      />

      <div className="py-8 container max-w-3xl">
        <span className="text-sm font-mono text-muted-foreground mb-2 block">
          {String(module.sort_order).padStart(2, '0')}
        </span>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-6">
          {module.title}
        </h1>

        {module.framing_content ? (
          <div
            className="prose prose-sm max-w-none text-foreground mb-8"
            dangerouslySetInnerHTML={{ __html: module.framing_content }}
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

        <EssayListing
          moduleId={module.id}
          track={track!}
          moduleSlug={moduleSlug!}
        />
      </div>
    </PageLayout>
  );
}
