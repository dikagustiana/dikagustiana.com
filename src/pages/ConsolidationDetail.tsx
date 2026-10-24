import { useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { PAGE_COLUMN } from '@/components/layouts/pageColumn';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { useConsolidationSeries, useEssaysByTopic, type TopicEssay } from '@/hooks/queries/useEssays';
import { ArticleBody, ArticleLayout, ArticleShell } from '@/components/editorial';
import { CONSOLIDATION_TOPIC_MAP } from '@/config/consolidationTopics';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { resolvePresentation } from '@/lib/presentation';
import { essayUrl } from '@/lib/essayUrl';

const SERIES_HOME = '/accounting/consolidated-reporting';

/** A series essay's own page, in a series essay's own placement. */
const seriesEssayUrl = (slug: string) =>
  essayUrl({ slug, section: 'accounting', phase: 'consolidated-reporting', topic: slug }) ??
  `/accounting/consolidation/${slug}`;

/**
 * An essay of the consolidation series, on its own page. It is an essay, so
 * it wears the essay layout every other essay page wears (ArticleShell): the
 * centred 728px measure, the editorial title and deck, the byline, the
 * "On this page" rail, the presentation's end matter and prev/next in part
 * order. It used to be dropped into the topic template below, a left-pinned
 * max-w-3xl box with a display-font h1 and no table of contents, so on a
 * desktop it sat against the left edge beside an empty half page.
 *
 * Key takeaways are left out: the import copies them from the essay's own
 * opening "In brief" (scripts/accounting-import/convert.ts, keyTakeaways),
 * so the end-matter box would print the same bullets a second time. The
 * FSLI page, which renders the batch's other essays, shows none either.
 */
function ConsolidationSeriesEssay({ essay }: { essay: TopicEssay }) {
  const { data: series = [] } = useConsolidationSeries();
  const index = series.findIndex((part) => part.slug === essay.slug);
  const previous = index > 0 ? series[index - 1] : null;
  const next = index >= 0 && index < series.length - 1 ? series[index + 1] : null;

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;

  return (
    <ArticleShell
      seoTitle={essay.title}
      slug={essay.slug}
      seoDescription={deck || 'Consolidated reporting under PSAK.'}
      seoAuthor={essay.author || undefined}
      backLink={{ label: 'Back to Consolidated Reporting', path: SERIES_HOME }}
      title={essay.title}
      deck={deck}
      author={essay.author}
      publishedAt={essay.date}
      updatedAt={essay.updated_at}
      createdAt={essay.created_at}
      readTime={essay.read_time}
      topic="Consolidated Reporting"
      heroImage={essay.thumbnail_url}
      heroCaption={presentation.hero_caption}
      content={essay.content || ''}
      htmlContent={contentToHtml(essay.content || '')}
      brief={essay.brief_json}
      references={presentation.references}
      authorBio={presentation.author_bio}
      genre={presentation.genre}
      revisionNote={presentation.revision_note}
      previous={previous}
      next={next}
      getEssayUrl={seriesEssayUrl}
      currentEssayId={essay.id}
      section={essay.section}
    />
  );
}

export default function ConsolidationDetail() {
  const { topic } = useParams<{ topic: string }>();
  const details = topic ? CONSOLIDATION_TOPIC_MAP[topic] : null;
  const { data: essays, isLoading, isError, refetch } = useEssaysByTopic('accounting', topic || '');

  // An essay of the consolidation series is placed on a topic of its own
  // (topic = its slug), so /accounting/consolidation/<slug> is the essay's
  // page. The nine configured topics keep their own title and list what is
  // placed on them.
  const standalone =
    !details && essays?.length === 1 && essays[0].slug === topic ? essays[0] : null;

  if (standalone) return <ConsolidationSeriesEssay essay={standalone} />;

  // Every address here that is not a configured topic is a series essay's,
  // so while the read is out it waits in the essay layout rather than in the
  // topic page's chrome it would then jump out of.
  if (!details && isLoading) {
    return (
      <ArticleLayout>
        <LoadingState variant="article" />
      </ArticleLayout>
    );
  }

  const title = details?.title ?? 'Consolidation Topic';
  const description = details?.description ?? null;

  return (
    <PageLayout
      width="reading"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Accounting', path: '/accounting' },
        { label: 'Consolidated Reporting', path: SERIES_HOME },
        { label: details?.title ?? 'Topic' },
      ]}
    >
      <SEO
        title={title}
        description={description || 'Consolidated reporting under PSAK.'}
      />

      <div className={`${PAGE_COLUMN.reading} py-8`}>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">{title}</h1>
          {description && (
            <p className="text-lg text-muted-foreground mb-8">{description}</p>
          )}

          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState
              title="Couldn't load this topic"
              message="The essays could not be fetched just now. This is a temporary failure, not an empty topic."
              onRetry={() => refetch()}
            />
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
