import { useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { essayShareImage } from '@/lib/shareImage.mjs';
import { useEssay } from '@/hooks/queries/useEssays';
import { RelatedContent } from '@/components/RelatedContent';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { LoadingState, ErrorState } from '@/components/states';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { EssayEditLink } from '@/components/EssayEditLink';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

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
    >
      <SEO
        title={title}
        description={essay?.snippet || 'Critical thinking essay on rigorous analysis methods.'}
        type="article"
        author={essay?.author || 'Dika Gustiana'}
        // The og:image the prerender wrote into this page's raw HTML.
        image={essay?.slug ? essayShareImage(essay).url : undefined}
      />
      
      <div className="container py-8">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                {title}
              </h1>
              {/* Was an "Edit" button with no handler. Renders for admins only. */}
              <EssayEditLink slug={essay.slug} section={essay.section ?? 'critical-thinking'} />
            </div>
            
            {essay?.snippet && (
              <p className="mt-4 text-lg text-muted-foreground">
                {essay.snippet}
              </p>
            )}
            
            {(essay.author || essay.read_time || essay.date) && (
              <p className="mt-4 text-muted-foreground text-sm">
                {[essay.author, essay.date, essay.read_time].filter(Boolean).join(' · ')}
              </p>
            )}

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
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentToHtml(essay.content)) }} />
            ) : (
              <p className="text-muted-foreground">Not written yet.</p>
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
