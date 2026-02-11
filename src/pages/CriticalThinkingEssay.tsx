import { useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useEssay } from '@/hooks/queries/useEssays';
import { RelatedContent } from '@/components/RelatedContent';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { LoadingState, ErrorState } from '@/components/states';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Clock, User, Calendar } from 'lucide-react';

const phaseNames: Record<string, string> = {
  'clarify': 'Clarify',
  'analyze': 'Analyze',
  'construct': 'Construct',
  'apply': 'Apply',
};

export default function CriticalThinkingEssay() {
  const { phase, essayId } = useParams<{ phase: string; essayId: string }>();
  const { isAdmin } = useAuth();
  const { data: essay, isLoading, error, refetch } = useEssay(essayId || '');

  const formatTitle = (s: string) => 
    s?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Essay';

  if (isLoading) {
    return (
      <PageLayout
        variant="essay"
        role="educator"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Critical Thinking', path: '/critical-thinking-research' },
          { label: phase ? phaseNames[phase] : 'Phase', path: `/critical-thinking-research/${phase}` },
          { label: 'Loading...' }
        ]}
      >
        <div className="container py-8">
          <LoadingState variant="article" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout variant="essay" role="educator">
        <div className="container py-8">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </PageLayout>
    );
  }

  // Check access: non-admins can only see published essays (status='published')
  if (essay) {
    const isPublished = essay.status === 'published';
    if (!isPublished && !isAdmin) {
      // Draft accessed by non-admin - redirect to phase page
      return <Navigate to={`/critical-thinking-research/${phase}`} replace />;
    }
  }

  // Essay not found
  if (!essay) {
    return <Navigate to={`/critical-thinking-research/${phase}`} replace />;
  }

  const title = essay?.title || formatTitle(essayId || '');

  return (
    <PageLayout
      variant="essay"
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Critical Thinking', path: '/critical-thinking-research' },
        { label: phase ? phaseNames[phase] : 'Phase', path: `/critical-thinking-research/${phase}` },
        { label: title }
      ]}
      showManifesto={!!essay?.voice_role}
      manifesto={essay?.snippet || undefined}
    >
      <SEO
        title={title}
        description={essay?.snippet || 'Critical thinking essay on rigorous analysis methods.'}
        type="article"
        author={essay?.author || 'Dika Gustiana'}
      />
      
      <div className="container py-8">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                {title}
              </h1>
              {isAdmin && (
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            
            {essay?.snippet && (
              <p className="mt-4 text-lg text-muted-foreground">
                {essay.snippet}
              </p>
            )}
            
            <div className="mt-4 flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
              {essay?.author && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {essay.author}
                </span>
              )}
              {essay?.read_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {essay.read_time}
                </span>
              )}
              {essay?.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {essay.date}
                </span>
              )}
            </div>

            {essay?.prerequisites && essay.prerequisites.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-muted-foreground">Prerequisites: </span>
                {essay.prerequisites.map((prereq, i) => (
                  <Badge key={i} variant="outline" className="mr-1">
                    {prereq}
                  </Badge>
                ))}
              </div>
            )}

            {essay?.learning_outcomes && essay.learning_outcomes.length > 0 && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-medium mb-2">After This Essay You Will:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {essay.learning_outcomes.map((outcome, i) => (
                    <li key={i}>• {outcome}</li>
                  ))}
                </ul>
              </div>
            )}
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {essay?.content ? (
              <div dangerouslySetInnerHTML={{ __html: contentToHtml(essay.content) }} />
            ) : (
              <p className="text-muted-foreground italic">
                This essay content is being developed. Check back soon for comprehensive insights on this topic.
              </p>
            )}
          </div>

          {/* Related Content */}
          {essay && (
            <RelatedContent
              currentEssayId={essay.id}
              section={essay.section}
              categoryId={essay.category_id}
              prerequisites={essay.prerequisites}
            />
          )}
        </article>
      </div>
    </PageLayout>
  );
}
