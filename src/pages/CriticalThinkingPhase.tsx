import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEssays } from '@/hooks/queries/useEssays';
import { LoadingState, EmptyState } from '@/components/states';
import { ArrowRight } from 'lucide-react';

const phaseDetails: Record<string, { title: string; task: string; ignorance: string }> = {
  'clarify': { 
    title: 'Clarify', 
    task: 'Write one sentence defining the problem without jargon.',
    ignorance: 'The belief that understanding the question is the same as understanding the answer.'
  },
  'analyze': { 
    title: 'Analyze', 
    task: 'List 3 sources. Rate their reliability. Identify conflicts.',
    ignorance: 'The assumption that all information is equally valid.'
  },
  'construct': { 
    title: 'Construct', 
    task: 'Build a 3-point argument. Attack each point yourself.',
    ignorance: 'The tendency to build arguments without stress-testing them.'
  },
  'apply': { 
    title: 'Apply', 
    task: 'Define one action. Set one metric. Set a review date.',
    ignorance: 'The gap between knowing and doing.'
  },
};

export default function CriticalThinkingPhase() {
  const { phase } = useParams<{ phase: string }>();
  const details = phase ? phaseDetails[phase] : null;

  const { data: essays, isLoading } = useEssays({ 
    section: 'critical-thinking', 
    phase: phase 
  });

  return (
    <PageLayout
      variant="content"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Critical Thinking and Research', path: '/critical-thinking-research' },
        { label: details?.title || 'Phase' }
      ]}
      showManifesto
      manifesto={details ? `The ignorance this phase fights: ${details.ignorance}` : undefined}
    >
      <SEO
        title={`${details?.title || 'Phase'} - Critical Thinking`}
        description={details?.task || 'Critical thinking phase essays and resources.'}
      />
      
      <div className="container py-8">
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Phase: {details?.title || 'Unknown'}
          </h1>
          <div className="space-y-4 text-muted-foreground">
            <p><strong>Your Task:</strong> {details?.task}</p>
            <p><strong>The Ignorance This Fights:</strong> {details?.ignorance}</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : !essays || essays.length === 0 ? (
          <EmptyState
            title="No essays in this phase yet"
            message="Essays for this phase are being developed. Check back soon."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            {essays.map((essay) => (
              <Link key={essay.id} to={`/critical-thinking-research/${phase}/${essay.slug}`}>
                <Card className="h-full hover:border-primary/50 transition-all hover:-translate-y-1 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{essay.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {essay.snippet}
                    </CardDescription>
                    <span className="inline-flex items-center gap-1 text-sm text-primary mt-2">
                      Read <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
