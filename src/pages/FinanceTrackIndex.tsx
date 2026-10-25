/**
 * FinanceTrackIndex — Unified track index page.
 *
 * Renders at /finance/:track.
 * Shows collapsible modules with nested essay rows when essays exist,
 * or simple module rows when no essays are linked.
 */

import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ErrorState } from '@/components/states';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFinanceSectionBySlug,
  useFinanceModulesByTrack,
  type FinanceModule,
  type EssayStructureRow,
} from '@/hooks/queries/useFinance';
import { useTrackEssayCounts, useTrackAllEssays } from '@/hooks/queries/useFinanceTrackEssays';
import { useAuth } from '@/contexts/AuthContext';
import { essayUrl } from '@/lib/essayUrl';
import {
  CollapsibleModuleRow,
  CurriculumHeader,
  type CurriculumEssay,
} from '@/components/curriculum/CurriculumModules';

/** A module's lessons as the shared row takes them: public address resolved here. */
function toCurriculumEssays(essays: EssayStructureRow[], mod: FinanceModule): CurriculumEssay[] {
  return essays.map((essay) => ({
    ...essay,
    href: essayUrl({
      slug: essay.slug,
      section: 'finance',
      track: mod.track_slug,
      moduleSlug: mod.slug,
    }),
  }));
}

/* ─── Simple module row (no essays) ─── */
const SimpleModuleRow = React.memo(function SimpleModuleRow({
  mod,
  track,
  lessonCount,
}: {
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
      {/* Both numbers derive from essay_structure, which every identity can
          count in full — the "0/0 lessons" era (counting rows RLS hid) is
          structurally over, because the view hides no structure. */}
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {lessonCount.total > 0
          ? `${lessonCount.published} of ${lessonCount.total} published`
          : 'Not yet planned'}
      </span>
    </Link>
  );
});

/* ─── Main ─── */
export default function FinanceTrackIndex() {
  const { track } = useParams<{ track: string }>();
  if (!track) return <Navigate to="/finance" replace />;
  return <TrackContent track={track} />;
}

function TrackContent({ track }: { track: string }) {
  const { isAdmin } = useAuth();
  const {
    data: section,
    isLoading: sectionLoading,
    isError: sectionError,
    refetch: refetchSection,
  } = useFinanceSectionBySlug(track);

  const { data: modules, isLoading: modulesLoading } = useFinanceModulesByTrack(track);
  const { data: essayCounts, isLoading: countsLoading } = useTrackEssayCounts(track);
  const { data: allEssays, isLoading: essaysLoading } = useTrackAllEssays(track);

  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  // A failed query is a failure, not a missing track: redirecting it to the
  // landing page made an outage look like the syllabus had vanished. Rendered
  // inside the layout so the header and footer stay reachable.
  if (!sectionLoading && sectionError) {
    return (
      <PageLayout
        role="manager"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Finance', path: '/finance' },
          { label: track },
        ]}
      >
        <div className="flex-1 container py-16">
          <ErrorState
            title="Couldn't load this track"
            message="The track's pages could not be fetched just now. This is a temporary failure, not an empty track."
            onRetry={() => refetchSection()}
          />
        </div>
      </PageLayout>
    );
  }

  const isLoading = sectionLoading || modulesLoading || countsLoading || essaysLoading;
  const title = section?.title ?? '';
  const description = section?.description ?? '';

  // Determine if this track uses essay-collapsible mode
  const totalEssays = Object.values(essayCounts || {}).reduce(
    (sum, c) => sum + c.total,
    0
  );
  const publishedEssays = Object.values(essayCounts || {}).reduce(
    (sum, c) => sum + c.published,
    0
  );
  const hasEssays = totalEssays > 0;

  const totalModules = modules?.length ?? 0;
  const modulesWithContent = Object.values(essayCounts || {}).filter(
    (c) => c.total > 0
  ).length;

  const toggle = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageLayout
      role="manager"
      width="reading"
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
            <CurriculumHeader
              title={title}
              description={description}
              summary={
                hasEssays
                  ? `${publishedEssays} written, ${totalEssays - publishedEssays} planned`
                  : `${modulesWithContent} of ${totalModules} modules have anything in them`
              }
            />
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
            {modules.map((mod) => {
              const counts = essayCounts?.[mod.id] || { published: 0, total: 0 };
              if (hasEssays) {
                return (
                  <CollapsibleModuleRow
                    key={mod.id}
                    number={String(mod.sort_order).padStart(2, '0')}
                    title={mod.title}
                    essays={toCurriculumEssays(allEssays?.[mod.id] || [], mod)}
                    counts={counts}
                    isOpen={openModules.has(mod.id)}
                    onToggle={() => toggle(mod.id)}
                    isAdmin={!!isAdmin}
                  />
                );
              }
              return (
                <SimpleModuleRow
                  key={mod.id}
                  mod={mod}
                  track={track}
                  lessonCount={counts}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No modules configured yet.</p>
        )}
      </div>
    </PageLayout>
  );
}
