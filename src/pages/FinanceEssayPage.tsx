/**
 * FinanceEssayPage — Renders finance essays using the canonical ArticleShell.
 *
 * Same reading experience as Next Big Thing and Green Transition essays.
 * Route: /finance-101/essays/:slug
 */

import { useParams, Navigate } from 'react-router-dom';
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

const phaseLabels: Record<string, string> = {
  fundamentals: 'Fundamentals',
  'strategic-finance': 'Strategic Finance',
  'financial-planning': 'Financial Planning & Forecasting',
  'financial-analytics': 'Financial Analytics',
};

export default function FinanceEssayPage() {
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
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug)
        .eq('section', 'finance')
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
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load essay:', error);
      }
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const { data: siblings } = useQuery({
    queryKey: ['finance-siblings', essay?.phase],
    queryFn: async () => {
      let query = supabase
        .from('essays')
        .select('slug, title')
        .eq('section', 'finance')
        .eq('status', 'published')
        .order('sort_order', { ascending: true });

      if (essay?.phase) {
        query = query.eq('phase', essay.phase);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EssayListItem[];
    },
    enabled: !!essay,
  });

  if (notFound || (!loading && !essay)) {
    return <Navigate to="/finance-101" replace />;
  }

  if (loading) {
    return (
      <ArticleLayout>
        <LoadingState variant="article" />
      </ArticleLayout>
    );
  }

  if (!essay) return null;

  const currentIndex = siblings?.findIndex((e) => e.slug === slug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  const getEssayUrl = (essaySlug: string) => `/finance-101/essays/${essaySlug}`;

  const economistFields = essay.economist_fields || {};
  const deck = economistFields.deck || essay.snippet;
  const topic = essay.phase ? phaseLabels[essay.phase] || essay.phase : 'Finance';
  const htmlContent = contentToHtml(essay.content || '');

  return (
    <ArticleShell
      seoTitle={essay.title}
      seoDescription={deck || 'Finance knowledge for decision-making.'}
      seoAuthor={essay.author || undefined}
      backLink={{ label: 'Back to Finance', path: '/finance-101' }}
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
