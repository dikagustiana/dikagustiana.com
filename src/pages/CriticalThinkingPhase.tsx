import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { useEssays } from '@/hooks/queries/useEssays';
import { ErrorState, LoadingState } from '@/components/states';

const phaseDetails: Record<string, { title: string; task: string }> = {
  'clarify': {
    title: 'Clarify',
    task: 'Write one sentence defining the problem without jargon.',
  },
  'analyze': {
    title: 'Analyze',
    task: 'List 3 sources. Rate their reliability. Identify conflicts.',
  },
  'construct': {
    title: 'Construct',
    task: 'Build a 3-point argument. Attack each point yourself.',
  },
  'apply': {
    title: 'Apply',
    task: 'Define one action. Set one metric. Set a review date.',
  },
};

export default function CriticalThinkingPhase() {
  const { phase } = useParams<{ phase: string }>();
  const details = phase ? phaseDetails[phase] : null;

  const { data: essays, isLoading, isError, refetch } = useEssays({
    section: 'critical-thinking',
    phase: phase
  });

  return (
    <PageLayout
      variant="content"
      width="reading"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Critical Thinking', path: '/critical-thinking-research' },
        { label: details?.title || 'Phase' }
      ]}
    >
      <SEO
        title={`${details?.title || 'Phase'} - Critical Thinking`}
        description={details?.task || 'Critical thinking phase essays and resources.'}
      />

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {details?.title || 'Unknown phase'}
          </h1>
          {details?.task && (
            <p className="text-muted-foreground mb-8">{details.task}</p>
          )}

          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              title="Couldn't load this phase"
              message="The essays could not be fetched just now. This is a temporary failure, not an empty phase."
              onRetry={() => refetch()}
            />
          ) : !essays || essays.length === 0 ? (
            <p className="text-muted-foreground">Nothing written in this phase yet.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {essays.map((essay) => (
                <li key={essay.id}>
                  <Link
                    to={`/critical-thinking-research/${phase}/${essay.slug}`}
                    className="group block py-5"
                  >
                    <span className="block text-lg font-display font-semibold text-foreground group-hover:text-accent transition-colors">
                      {essay.title}
                    </span>
                    {essay.snippet && (
                      <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">{essay.snippet}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
