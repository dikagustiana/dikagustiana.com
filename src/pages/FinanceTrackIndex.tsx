/**
 * FinanceTrackIndex — Unified track index page.
 *
 * Renders at /finance/:track.
 * Replaces both FinanceFundamentals.tsx and FinanceLifecyclePage.tsx.
 *
 * Fetches track metadata from finance_sections and modules from finance_modules,
 * both keyed by the :track route param (slug).
 * Redirects to /finance if the track slug is not found in the DB.
 */

import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceSectionBySlug, useFinanceModulesByTrack, useModuleLessonCounts, type FinanceModule } from '@/hooks/queries/useFinance';

const ModuleRow = React.memo(function ModuleRow({ mod, track, lessonCount }: {
  mod: FinanceModule;
  track: string;
  lessonCount: { published: number; total: number };
}) {
  return (
    <Link
      to={`/finance/${track}/${mod.slug}`}
      className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-5 group hover:bg-muted/30 transition-colors -mx-3 px-3 rounded"
    >
      <span className="text-sm font-mono text-muted-foreground tabular-nums">
        {String(mod.sort_order).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors block leading-snug">
          {mod.title}
        </span>
        {mod.thesis && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {mod.thesis}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {lessonCount.published}/{lessonCount.total} lessons
      </span>
    </Link>
  );
});

export default function FinanceTrackIndex() {
  const { track } = useParams<{ track: string }>();

  if (!track) {
    return <Navigate to="/finance" replace />;
  }

  return <TrackContent track={track} />;
}

function TrackContent({ track }: { track: string }) {
  const {
    data: section,
    isLoading: sectionLoading,
    isError: sectionError,
  } = useFinanceSectionBySlug(track);

  const { data: modules, isLoading: modulesLoading } = useFinanceModulesByTrack(track);
  const { data: lessonCounts, isLoading: countsLoading } = useModuleLessonCounts(track);

  // Redirect once we confirm the slug doesn't exist in the DB
  if (!sectionLoading && sectionError) {
    return <Navigate to="/finance" replace />;
  }

  const isLoading = sectionLoading || modulesLoading || countsLoading;
  const title = section?.title ?? '';
  const description = section?.description ?? '';
  const totalModules = modules?.length ?? 0;
  const modulesWithContent = Object.values(lessonCounts || {}).filter((c) => c.total > 0).length;

  return (
    <PageLayout
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Finance', path: '/finance' },
        { label: title || track },
      ]}
    >
      <SEO title={title || track} description={description} />

      <div className="py-8 container max-w-3xl">
        {sectionLoading ? (
          <>
            <Skeleton className="h-10 w-64 mb-3" />
            <Skeleton className="h-5 w-full mb-10" />
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              {title}
            </h1>
            {description && (
              <p className="text-lg text-muted-foreground mb-4">{description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <span>{modulesWithContent} of {totalModules} modules have content</span>
            </div>
          </>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : modules && modules.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {modules.map((mod) => (
              <ModuleRow
                key={mod.id}
                mod={mod}
                track={track}
                lessonCount={lessonCounts?.[mod.slug] || { published: 0, total: 0 }}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No modules configured yet.</p>
        )}
      </div>
    </PageLayout>
  );
}
