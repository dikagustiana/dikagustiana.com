import NotFound from './NotFound';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/states';
import { ArticleShell, ArticleLayout } from '@/components/editorial';
import { contentToHtml } from '@/lib/tiptap/serialize';

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
  category_id: string | null;
  created_at: string;
  updated_at: string;
  presentation: EssayPresentation | null;
  /** @deprecated legacy column, read only as a fallback until it is dropped */
  economist_fields: EssayPresentation | null;
}

interface EssayListItem {
  slug: string;
  title: string;
}

const categoryLabels: Record<string, string> = {
  technology: 'Technology',
  economy: 'Economy',
  society: 'Society',
  environment: 'Environment',
  governance: 'Governance',
};

export default function NextBigThingEssayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) loadEssay();
  }, [slug, isAdmin]);

  const loadEssay = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      // Fetch by globally unique slug — no section string matching needed
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const isPublished = data.status === 'published';
        if (!isPublished && !isAdmin) {
          setNotFound(true);
          setEssay(null);
        } else {
          setEssay(data as Essay);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sibling essays via category_id FK
  const { data: siblings } = useQuery({
    queryKey: ['nbt-siblings', essay?.category_id],
    queryFn: async () => {
      if (!essay?.category_id) return [];
      const { data, error } = await supabase
        .from('essays')
        .select('slug, title')
        .eq('category_id', essay.category_id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EssayListItem[];
    },
    enabled: !!essay?.category_id,
  });

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
  const next =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  const getEssayUrl = (essaySlug: string) => `/the-next-big-thing/${essaySlug}`;

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;
  const topic = essay.phase ? categoryLabels[essay.phase] || essay.phase : undefined;
  const backPath = essay.phase
    ? `/the-next-big-thing?theme=${essay.phase}`
    : '/the-next-big-thing';

  const htmlContent = contentToHtml(essay.content || '');

  return (
    <ArticleShell
      seoTitle={essay.title}
      seoDescription={deck || 'Analysis of emerging economic forces and structural change.'}
      seoAuthor={essay.author || undefined}
      backLink={{ label: 'Back to The Next Big Thing', path: backPath }}
      title={essay.title}
      deck={deck}
      author={essay.author}
      publishedAt={essay.date}
      updatedAt={essay.updated_at}
      createdAt={essay.created_at}
      readTime={essay.read_time}
      topic={topic}
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
      section="next-big-thing"
    />
  );
}
