import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { essayUrl } from '@/lib/essayUrl';
import { scrollBehavior } from '@/lib/motion';
import { useSection } from '@/hooks/queries/useSections';
import { countByPart, useFoundationsEssays } from '@/hooks/queries/useFoundationsEssays';
import {
  CollapsibleModuleRow,
  CurriculumHeader,
  type CurriculumEssay,
} from '@/components/curriculum/CurriculumModules';
import {
  FOUNDATIONS_LABEL,
  FOUNDATIONS_PARTS,
  FOUNDATIONS_PATH,
  FOUNDATIONS_SECTION,
  foundationsPart,
  foundationsPartAnchor,
} from '@/config/foundationsOfKnowing';

/**
 * Foundations of Knowing — the section page, laid out as a Finance track is
 * (FinanceTrackIndex): the ten parts as collapsible rows, each with its
 * number, name, thesis and essay count, and its essays inside in reading
 * order (sort_order). The file keeps its Critical Thinking name: the
 * section's slug is still `critical-thinking`, and only its display name moved.
 *
 * Serves /foundations-of-knowing and /foundations-of-knowing/:part. A part's
 * address opens that part's row and scrolls to it; an unknown part (the four
 * retired phases, clarify/analyze/construct/apply, included) lands on the
 * section page.
 */
export default function CriticalThinkingResearch() {
  const { part: partId } = useParams<{ part?: string }>();
  const part = foundationsPart(partId);
  if (partId && !part) return <Navigate to={FOUNDATIONS_PATH} replace />;
  return <SectionContent partId={part?.id} />;
}

function SectionContent({ partId }: { partId?: string }) {
  const { isAdmin } = useAuth();
  const { data: section, isLoading: sectionLoading } = useSection(FOUNDATIONS_SECTION);
  const { data: essays, isLoading, isError, refetch } = useFoundationsEssays();
  const counts = countByPart(essays);
  const total = essays?.length ?? 0;
  const published = essays?.filter((e) => e.published).length ?? 0;

  const [openParts, setOpenParts] = useState<Set<string>>(() => new Set(partId ? [partId] : []));

  // A part's address opens its row (staying mounted from one part's address
  // to the next) and, once the rows are drawn, brings it under the header.
  useEffect(() => {
    if (!partId) return;
    setOpenParts((prev) => (prev.has(partId) ? prev : new Set(prev).add(partId)));
  }, [partId]);
  useEffect(() => {
    if (!partId || isLoading || isError) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(foundationsPartAnchor(partId));
      if (!target) return;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header, behavior: scrollBehavior() });
    });
    return () => cancelAnimationFrame(frame);
  }, [partId, isLoading, isError]);

  const toggle = (id: string) => {
    setOpenParts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rowsFor = (id: string): CurriculumEssay[] =>
    (essays ?? [])
      .filter((e) => e.phase === id)
      .map((e) => ({
        ...e,
        href: essayUrl({ slug: e.slug, section: FOUNDATIONS_SECTION, phase: e.phase }),
      }));

  return (
    <PageLayout
      role="manager"
      width="reading"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: FOUNDATIONS_LABEL },
      ]}
    >
      <SEO
        title={FOUNDATIONS_LABEL}
        description="Ten parts, from what it means to know something to strategic finance as applied judgment."
      />

      <div className="py-8 container max-w-3xl">
        {sectionLoading || isLoading ? (
          <>
            <Skeleton className="h-10 w-64 mb-3" />
            <Skeleton className="h-5 w-full mb-10" />
          </>
        ) : (
          <CurriculumHeader
            title={FOUNDATIONS_LABEL}
            description={section?.manifesto}
            summary={`${published} written, ${total - published} planned`}
          />
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load the parts"
            message="The essays could not be fetched just now. This is a temporary failure, not an empty section."
            onRetry={() => refetch()}
          />
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {FOUNDATIONS_PARTS.map((p) => (
              <CollapsibleModuleRow
                key={p.id}
                anchorId={foundationsPartAnchor(p.id)}
                number={String(p.number).padStart(2, '0')}
                title={p.label}
                thesis={p.thesis}
                essays={rowsFor(p.id)}
                counts={counts[p.id] ?? { published: 0, total: 0 }}
                isOpen={openParts.has(p.id)}
                onToggle={() => toggle(p.id)}
                isAdmin={!!isAdmin}
                editSection={FOUNDATIONS_SECTION}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
