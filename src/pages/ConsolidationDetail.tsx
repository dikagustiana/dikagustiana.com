import { useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { useEssaysByTopic } from '@/hooks/queries/useEssays';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { CONSOLIDATION_TOPIC_MAP } from '@/config/consolidationTopics';

export default function ConsolidationDetail() {
  const { topic } = useParams<{ topic: string }>();
  const details = topic ? CONSOLIDATION_TOPIC_MAP[topic] : null;
  const { data: essays, isLoading, isError, refetch } = useEssaysByTopic('accounting', topic || '');

  // An essay of the consolidation series is placed on a topic of its own
  // (topic = its slug), so /accounting/consolidation/<slug> is the essay's
  // page: its title is the page's, its deck the lede. The nine configured
  // topics keep their own title and list what is placed on them.
  const standalone =
    !details && essays?.length === 1 && essays[0].slug === topic ? essays[0] : null;
  const title = details?.title ?? standalone?.title ?? 'Consolidation Topic';
  const description = details?.description ?? standalone?.snippet ?? null;

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Accounting', path: '/accounting' },
        { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
        { label: details?.title ?? standalone?.title ?? 'Topic' },
      ]}
    >
      <SEO
        title={title}
        description={description || 'Consolidated reporting under PSAK.'}
      />

      <div className="container py-8">
        <div className="max-w-3xl">
          {/* Until the read settles, a page that is not a configured topic
              does not know its own title yet. */}
          {(details || !isLoading) && (
            <>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">{title}</h1>
              {description && (
                <p className="text-lg text-muted-foreground mb-8">{description}</p>
              )}
            </>
          )}

          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              title="Couldn't load this topic"
              message="The essays could not be fetched just now. This is a temporary failure, not an empty topic."
              onRetry={() => refetch()}
            />
          ) : standalone ? (
            standalone.content && <ArticleBody content={standalone.content} />
          ) : essays && essays.length > 0 ? (
            <div className="space-y-8">
              {essays.map((essay) => (
                <div key={essay.id}>
                  <h2 className="text-2xl font-display font-semibold mb-2">{essay.title}</h2>
                  {essay.snippet && (
                    <p className="text-muted-foreground mb-4">{essay.snippet}</p>
                  )}
                  {essay.content && <ArticleBody content={essay.content} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Not written yet.</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
