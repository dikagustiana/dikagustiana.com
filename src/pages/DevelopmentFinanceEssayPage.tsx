import NotFound from './NotFound';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState, ErrorState } from '@/components/states';
import { ArticleShell, ArticleLayout } from '@/components/editorial';
import { contentToHtml } from '@/lib/tiptap/serialize';

const phaseLabels: Record<string, string> = {
  'sovereign-wealth-funds': 'Sovereign Wealth Funds',
  'multilateral-development-banks': 'Multilateral Development Banks',
  'blended-finance': 'Blended Finance',
  'indonesia-capital-architecture': 'Indonesia\'s Capital Architecture',
};

interface Essay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  content: string | null;
  phase: string | null;
  status: string | null;
  published: boolean | null;
  created_at: string;
  updated_at: string;
  presentation: EssayPresentation | null;
}

export default function DevelopmentFinanceEssayPage() {
  const { phase, slug } = useParams<{ phase: string; slug: string }>();
  const { isAdmin } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // A failed FETCH is not a missing essay. Rendering 404 on a network error
  // tells the owner their essay is gone when it is fine — the panic-then-
  // recreate path that forks work. Errors get a retry, not a tombstone.
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (slug) loadEssay();
  }, [slug, isAdmin]);

  const loadEssay = async () => {
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        if (data.status !== 'published' && !isAdmin) {
          setNotFound(true);
          setEssay(null);
        } else {
          setEssay(data as Essay);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const { data: siblings } = useQuery({
    queryKey: ['dev-finance-siblings', essay?.phase],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('slug, title')
        .eq('section', 'development-finance')
        .eq('phase', essay!.phase!)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { slug: string; title: string }[];
    },
    enabled: !!essay?.phase,
  });

  const phaseLabel = phase ? phaseLabels[phase] || phase : '';

  if (loadError && !loading) {
    return (
      <div className="container min-h-[60vh] flex items-center justify-center py-16">
        <ErrorState
          title="Couldn't load this essay"
          message="The essay is still there — this page just couldn't reach the database. Check your connection and try again."
          onRetry={loadEssay}
        />
      </div>
    );
  }

  if (notFound || (!loading && !essay)) {
    // A bad slug is a wrong URL, not a reason to silently teleport the reader
    // to the section index. NotFound says so and offers the nearest real essay.
    return <NotFound />;
  }

  if (loading) {
    return (
      <ArticleLayout>
        <LoadingState variant="article" />
      </ArticleLayout>
    );
  }

  // A valid route shape with a bad slug used to render nothing — page chrome
  // with a blank middle, which reads as a broken site rather than a wrong URL.
  // NotFound also offers the nearest real essay for a near-miss slug.
  if (!essay) return <NotFound />;

  const currentIndex = siblings?.findIndex((e) => e.slug === slug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next = siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
    ? siblings[currentIndex + 1]
    : null;

  const getEssayUrl = (essaySlug: string) => `/development-finance/${phase}/${essaySlug}`;

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;
  const htmlContent = contentToHtml(essay.content || '');

  return (
    <ArticleShell
      seoTitle={essay.title}
      seoDescription={deck || 'Development finance analysis.'}
      seoAuthor={essay.author || undefined}
      backLink={{
        label: `Back to ${phaseLabel}`,
        path: `/development-finance/${phase || ''}`,
      }}
      title={essay.title}
      deck={deck}
      author={essay.author}
      publishedAt={essay.date}
      updatedAt={essay.updated_at}
      createdAt={essay.created_at}
      readTime={essay.read_time}
      topic={phaseLabel}
      heroImage={essay.thumbnail_url}
      heroCaption={presentation.hero_caption}
      content={essay.content || ''}
      htmlContent={htmlContent}
      keyTakeaways={presentation.key_takeaways}
      references={presentation.references}
      authorBio={presentation.author_bio}
      previous={previous}
      next={next}
      getEssayUrl={getEssayUrl}
      currentEssayId={essay.id}
      section="development-finance"
    />
  );
}
