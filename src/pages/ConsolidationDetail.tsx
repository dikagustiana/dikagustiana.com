import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SEO } from '@/components/SEO';
import { useEssaysByTopic } from '@/hooks/queries/useEssays';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { CONSOLIDATION_TOPIC_MAP } from '@/config/consolidationTopics';

export default function ConsolidationDetail() {
  const { topic } = useParams<{ topic: string }>();
  const details = topic ? CONSOLIDATION_TOPIC_MAP[topic] : null;
  const { data: essays } = useEssaysByTopic('accounting', topic || '');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={details?.title || 'Consolidation Topic'}
        description={details?.description || 'Consolidated reporting under PSAK.'}
      />
      <Header />

      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb
            items={[
              { label: 'Home', path: '/' },
              { label: 'Accounting', path: '/accounting' },
              { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
              { label: details?.title || 'Topic' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {details?.title || 'Consolidation Topic'}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {details?.description || 'Detailed content for this consolidation topic.'}
          </p>

          {essays && essays.length > 0 ? (
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
            <div className="bg-card rounded-lg border border-border p-8">
              <p className="text-muted-foreground italic">
                Detailed content for this topic is being developed. Check back soon for comprehensive guides and examples.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
