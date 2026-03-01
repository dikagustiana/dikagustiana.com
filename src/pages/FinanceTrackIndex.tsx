/**
 * FinanceTrackIndex — Unified track index page.
 *
 * Renders at /finance/:track.
 * Shows collapsible modules with nested essay rows when essays exist,
 * or simple module rows when no essays are linked.
 */

import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useFinanceSectionBySlug,
  useFinanceModulesByTrack,
  type FinanceModule,
  type FinanceModuleEssay,
} from '@/hooks/queries/useFinance';
import { useTrackEssayCounts, useTrackAllEssays } from '@/hooks/queries/useFinanceTrackEssays';

/* ─── Essay title split helper ─── */
function splitTitle(title: string) {
  const colonIdx = title.indexOf(':');
  if (colonIdx === -1) return { line1: title, line2: null };
  return {
    line1: title.slice(0, colonIdx).trim(),
    line2: title.slice(colonIdx + 1).trim(),
  };
}

/* ─── Essay row ─── */
const EssayRow = React.memo(function EssayRow({ essay }: { essay: FinanceModuleEssay }) {
  const { line1, line2 } = splitTitle(essay.title);

  return (
    <div className="py-4 pl-[3rem] ml-4 border-l border-border/50">
      <div className="flex items-start justify-between gap-4 pl-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground leading-snug">
            {line1}
          </p>
          {line2 && (
            <p className="text-[14px] text-muted-foreground leading-snug mt-0.5">
              {line2}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            Essay not yet published.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 mt-0.5">
          Draft
        </span>
      </div>
    </div>
  );
});

/* ─── Collapsible module row ─── */
const CollapsibleModuleRow = React.memo(function CollapsibleModuleRow({
  mod,
  essays,
  essayCount,
  isOpen,
  onToggle,
}: {
  mod: FinanceModule;
  essays: FinanceModuleEssay[];
  essayCount: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[3rem_1fr_auto_1.5rem] items-baseline gap-4 py-5 group hover:bg-muted/30 transition-colors -mx-3 px-3 rounded text-left"
      >
        <span className="text-sm font-mono text-muted-foreground tabular-nums">
          {String(mod.sort_order).padStart(2, '0')}
        </span>
        <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {mod.title}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {essayCount} {essayCount === 1 ? 'essay' : 'essays'}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && essays.length > 0 && (
        <div className="divide-y divide-border/40 mb-2">
          {essays.map((essay) => (
            <EssayRow key={essay.id} essay={essay} />
          ))}
        </div>
      )}
    </div>
  );
});

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
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {lessonCount.published}/{lessonCount.total} lessons
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
  const {
    data: section,
    isLoading: sectionLoading,
    isError: sectionError,
  } = useFinanceSectionBySlug(track);

  const { data: modules, isLoading: modulesLoading } = useFinanceModulesByTrack(track);
  const { data: essayCounts, isLoading: countsLoading } = useTrackEssayCounts(track);
  const { data: allEssays, isLoading: essaysLoading } = useTrackAllEssays(track);

  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  if (!sectionLoading && sectionError) {
    return <Navigate to="/finance" replace />;
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
              {hasEssays ? (
                <span>
                  {publishedEssays} of {totalEssays} essays published
                </span>
              ) : (
                <span>
                  {modulesWithContent} of {totalModules} modules have content
                </span>
              )}
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
            {modules.map((mod) => {
              const counts = essayCounts?.[mod.id] || { published: 0, total: 0 };
              if (hasEssays) {
                return (
                  <CollapsibleModuleRow
                    key={mod.id}
                    mod={mod}
                    essays={allEssays?.[mod.id] || []}
                    essayCount={counts.total}
                    isOpen={openModules.has(mod.id)}
                    onToggle={() => toggle(mod.id)}
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
