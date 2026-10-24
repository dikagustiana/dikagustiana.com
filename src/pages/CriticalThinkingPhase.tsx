import { Link, Navigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { CURRICULUM_CONTRACT } from '@/data/curriculumContract';
import { useAuth } from '@/contexts/AuthContext';
import { EssayEditLink, essayEditorUrl } from '@/components/EssayEditLink';
import { essayUrl } from '@/lib/essayUrl';
import { useFoundationsEssays } from '@/hooks/queries/useFoundationsEssays';
import {
  FOUNDATIONS_LABEL,
  FOUNDATIONS_PARTS,
  FOUNDATIONS_PATH,
  FOUNDATIONS_SECTION,
  foundationsPart,
  foundationsPartPath,
} from '@/config/foundationsOfKnowing';

/**
 * Foundations of Knowing — one part (/foundations-of-knowing/:part). The file
 * keeps its Critical Thinking name, as the section keeps its slug.
 *
 * The part's essays in reading order (sort_order). Planned essays are listed
 * as the Finance tracks list theirs: a published essay links to its
 * page for everyone, a draft links to the editor for admins only, and for
 * readers a draft is inert — no anchor, muted, labelled Planned.
 */
export default function CriticalThinkingPhase() {
  const { part: partId } = useParams<{ part: string }>();
  const part = foundationsPart(partId);
  const { isAdmin } = useAuth();
  const { data: essays, isLoading, isError, refetch } = useFoundationsEssays();

  // An unknown part (the four retired phases, clarify/analyze/construct/apply,
  // included) lands on the map rather than on an empty page.
  if (!part) return <Navigate to={FOUNDATIONS_PATH} replace />;

  const rows = (essays ?? []).filter((e) => e.phase === part.id);
  const index = FOUNDATIONS_PARTS.findIndex((p) => p.id === part.id);
  const prev = FOUNDATIONS_PARTS[index - 1];
  const next = FOUNDATIONS_PARTS[index + 1];

  return (
    <PageLayout
      variant="content"
      width="reading"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: FOUNDATIONS_LABEL, path: FOUNDATIONS_PATH },
        { label: `Part ${part.number}` },
      ]}
    >
      <SEO
        title={`Part ${part.number}: ${part.label} - ${FOUNDATIONS_LABEL}`}
        description={`Part ${part.number} of ${FOUNDATIONS_LABEL}: ${part.label}.`}
      />

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-2">
          Part {part.number}
        </p>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-8">{part.label}</h1>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            title="Couldn't load this part"
            message="The essays could not be fetched just now. This is a temporary failure, not an empty part."
            onRetry={() => refetch()}
          />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">Nothing planned in this part yet.</p>
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {rows.map((essay) => {
              const to = essay.published
                ? essayUrl({ slug: essay.slug, section: FOUNDATIONS_SECTION, phase: essay.phase })
                : isAdmin
                  ? essayEditorUrl(essay.slug, FOUNDATIONS_SECTION)
                  : null;
              const title = (
                <span className="block text-lg font-display font-semibold leading-snug">{essay.title}</span>
              );
              return (
                <li key={essay.id} className="flex items-start gap-2 py-5">
                  <div className="min-w-0 flex-1">
                    {to ? (
                      <Link to={to} className="block text-foreground hover:text-accent transition-colors">
                        {title}
                      </Link>
                    ) : (
                      <div className="cursor-default text-muted-foreground">{title}</div>
                    )}
                    {essay.snippet && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{essay.snippet}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {essay.published ? 'Published' : CURRICULUM_CONTRACT.plannedLabel}
                      {essay.published && essay.read_time ? ` · ${essay.read_time}` : ''}
                    </p>
                  </div>
                  <EssayEditLink slug={essay.slug} section={FOUNDATIONS_SECTION} className="mt-1" />
                </li>
              );
            })}
          </ol>
        )}

        <nav aria-label="Parts" className="mt-10 flex flex-col gap-3 text-sm sm:flex-row sm:justify-between">
          {prev ? (
            <Link to={foundationsPartPath(prev.id)} className="text-muted-foreground hover:text-foreground">
              ← Part {prev.number} · {prev.label}
            </Link>
          ) : (
            <Link to={FOUNDATIONS_PATH} className="text-muted-foreground hover:text-foreground">
              ← All parts
            </Link>
          )}
          {next && (
            <Link to={foundationsPartPath(next.id)} className="text-muted-foreground hover:text-foreground sm:text-right">
              Part {next.number} · {next.label} →
            </Link>
          )}
        </nav>
      </div>
    </PageLayout>
  );
}
