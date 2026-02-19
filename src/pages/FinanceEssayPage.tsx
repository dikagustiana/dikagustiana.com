/**
 * FinanceEssayPage — Renders finance essays using the canonical ArticleShell.
 *
 * Same reading experience as Next Big Thing and Green Transition essays.
 * Route: /finance/:track/:moduleSlug/:essaySlug
 */

import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/states';
import { ArticleShell, ArticleLayout } from '@/components/editorial';
import { contentToHtml } from '@/lib/tiptap/serialize';
import { useFinanceModuleBySlug } from '@/hooks/queries/useFinance';

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
  module_id?: string | null;
  fundamental_id?: string | null;
  created_at: string;
  updated_at: string;
  economist_fields: {
    deck?: string;
    key_takeaways?: string[];
    references?: (string | { label: string; url?: string })[];
    hero_caption?: string;
    author_bio?: string;
  } | null;
}

interface EssayListItem {
  slug: string;
  title: string;
}

export default function FinanceEssayPage() {
  const { track, moduleSlug, essaySlug } = useParams<{
    track: string;
    moduleSlug: string;
    essaySlug: string;
  }>();
  const { isAdmin } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { data: module } = useFinanceModuleBySlug(moduleSlug!);

  useEffect(() => {
    if (essaySlug) loadEssay();
  }, [essaySlug, isAdmin]);

  const loadEssay = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      // Fetch by globally unique slug
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', essaySlug!)
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

  // Fetch siblings — disabled as module_id is no longer used
  const { data: siblings } = useQuery({
    queryKey: ['finance-siblings-stub'],
    queryFn: async (): Promise<EssayListItem[]> => [],
    enabled: false,
  });

  if (notFound || (!loading && !essay)) {
    return <Navigate to="/finance" replace />;
  }

  if (loading) {
    return (
      <ArticleLayout>
        <LoadingState variant="article" />
      </ArticleLayout>
    );
  }

  if (!essay) return null;

  const currentIndex = siblings?.findIndex((e) => e.slug === essaySlug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  const getEssayUrl = (slug: string) => `/finance/${track}/${moduleSlug}/${slug}`;

  const economistFields = essay.economist_fields || {};
  const deck = economistFields.deck || essay.snippet;
  const topic = module?.title ?? essay.phase ?? 'Finance';
  const htmlContent = contentToHtml(essay.content || '');

  return (
    <ArticleShell
      seoTitle={essay.title}
      seoDescription={deck || 'Finance knowledge for decision-making.'}
      seoAuthor={essay.author || undefined}
      backLink={{ label: 'Back to module', path: `/finance/${track}/${moduleSlug}` }}
      title={essay.title}
      deck={deck}
      author={essay.author}
      publishedAt={essay.date}
      updatedAt={essay.updated_at}
      createdAt={essay.created_at}
      readTime={essay.read_time}
      topic={topic}
      heroImage={essay.thumbnail_url}
      heroCaption={economistFields.hero_caption}
      content={essay.content || ''}
      htmlContent={htmlContent}
      keyTakeaways={economistFields.key_takeaways}
      references={economistFields.references}
      authorBio={economistFields.author_bio}
      previous={previous}
      next={next}
      getEssayUrl={getEssayUrl}
      currentEssayId={essay.id}
      section="finance"
    />
  );
}
