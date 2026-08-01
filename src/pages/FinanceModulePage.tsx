/**
 * FinanceModulePage — Level 2 Module Page
 *
 * Route: /finance/:track/:moduleSlug
 * Unified replacement for FundamentalDetail.tsx — works for any track.
 *
 * Renders framing content and an essay list for a single finance module.
 */

import { useParams, Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ModuleHeaderFactory } from '@/components/finance/ModuleHeaderFactory';
import { FinanceCycleMap } from '@/components/finance/FinanceCycleMap';
import {
  useFinanceSectionBySlug,
  useFinanceModuleBySlug,
  useEssaysByModuleId,
} from '@/hooks/queries/useFinance';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

// ── Essay listing sub-component ──────────────────────────────────────────────

function EssayListing({
  moduleId,
  moduleSortOrder,
  track,
  moduleSlug,
}: {
  moduleId: string;
  moduleSortOrder: number;
  track: string;
  moduleSlug: string;
}) {
  const { isAdmin } = useAuth();
  const { data: essays, isLoading } = useEssaysByModuleId(moduleId, !!isAdmin);

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
No lessons assigned to this module yet.
      </p>
    );
  }

  return (
    <div>
      {essays.map((essay, index) => (
        <Link
          key={essay.id}
          // A draft has no public page worth landing on; for the admin who can
          // see it, the editor is the useful destination. Published essays go
          // to their canonical URL for everyone.
          to={!essay.published && isAdmin
            ? `/admin/writer/finance/${essay.slug}`
            : `/finance/${track}/${moduleSlug}/${essay.slug}`}
          className="flex items-start gap-4 py-4 group border-b border-border last:border-b-0"
        >
          <span className="text-sm font-mono text-muted-foreground tabular-nums shrink-0 mt-0.5">
            {String(moduleSortOrder).padStart(2, '0')}.{String(index + 1).padStart(2, '0')}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                {essay.title}
              </h3>
              {essay.lesson_type && essay.lesson_type !== 'concept' && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  {essay.lesson_type}
                </span>
              )}
              {isAdmin && !essay.published && (
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  Draft
                </Badge>
              )}
            </div>
            {essay.snippet && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{essay.snippet}</p>
            )}
          </div>

          {essay.read_time && (
            <span className="text-xs text-muted-foreground shrink-0 mt-1">{essay.read_time}</span>
          )}
          {isAdmin && (
            <span
              role="link"
              aria-label={`Edit ${essay.title}`}
              title="Edit in writer"
              onClick={(e) => {
                // The row itself is a Link; this must not double-navigate.
                e.preventDefault();
                e.stopPropagation();
                window.location.assign(`/admin/writer/finance/${essay.slug}`);
              }}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted hover:text-foreground transition-all shrink-0 -my-2"
            >
              <Pencil className="h-4 w-4" />
            </span>
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

  const variant = ((module.module_meta as { variant?: string } | null)?.variant) || 'standard';

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
        {variant === 'narrative' && <FinanceCycleMap />}

        <ModuleHeaderFactory
          variant={variant}
          title={module.title}
          thesis={module.thesis}
          sortOrder={module.sort_order}
        />

        {module.framing_content ? (
          <div
            className="prose prose-sm max-w-none text-foreground mb-8"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(module.framing_content) }}
          />
        ) : (
          <p className="text-muted-foreground italic mb-8">
            Framing content coming soon.
          </p>
        )}

        <Separator className="my-8" />

        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          Lessons
        </h2>

        <EssayListing
          moduleId={module.id}
          moduleSortOrder={module.sort_order}
          track={track!}
          moduleSlug={moduleSlug!}
        />
      </div>
    </PageLayout>
  );
}
