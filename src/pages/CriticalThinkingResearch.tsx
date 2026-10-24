import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { CURRICULUM_CONTRACT } from '@/data/curriculumContract';
import { countByPart, useFoundationsEssays } from '@/hooks/queries/useFoundationsEssays';
import {
  FOUNDATIONS_LABEL,
  FOUNDATIONS_PARTS,
  foundationsPartPath,
} from '@/config/foundationsOfKnowing';

/**
 * Foundations of Knowing — the section page (/foundations-of-knowing): the map
 * of the ten parts. The file keeps its Critical Thinking name: the section's
 * slug is still `critical-thinking`, and only its display name moved. Each row links to its part and
 * says how much of it is written, counted over every planned essay (drafts
 * included), the way a Finance track counts its modules.
 */
export default function CriticalThinkingResearch() {
  const { data: essays, isLoading, isError, refetch } = useFoundationsEssays();
  const counts = countByPart(essays);
  const total = essays?.length ?? 0;
  const published = essays?.filter((e) => e.published).length ?? 0;

  return (
    <PageLayout
      variant="content"
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

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">{FOUNDATIONS_LABEL}</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {total > 0 ? `${published} of ${total} essays published. ` : ''}
          {CURRICULUM_CONTRACT.standfirst}
        </p>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            title="Couldn't load the parts"
            message="The essays could not be fetched just now. This is a temporary failure, not an empty section."
            onRetry={() => refetch()}
          />
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {FOUNDATIONS_PARTS.map((part) => {
              const c = counts[part.id] ?? { total: 0, published: 0 };
              return (
                <li key={part.id}>
                  <Link
                    to={foundationsPartPath(part.id)}
                    className="group grid grid-cols-[4.5rem_1fr] items-baseline gap-x-3 gap-y-1 py-5 sm:grid-cols-[4.5rem_1fr_auto] sm:gap-4"
                  >
                    <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground tabular-nums">
                      Part {part.number}
                    </span>
                    <span className="text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                      {part.label}
                    </span>
                    <span className="col-start-2 text-xs font-mono text-muted-foreground tabular-nums sm:col-start-auto sm:text-right">
                      {c.total > 0 ? `${c.published} of ${c.total} published` : 'Nothing planned yet'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </PageLayout>
  );
}
