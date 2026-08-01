/**
 * FinanceEssayPage — Renders finance essays using the canonical ArticleShell.
 *
 * Same reading experience as Next Big Thing and Green Transition essays.
 * Route: /finance/:track/:moduleSlug/:essaySlug
 */

import NotFound from './NotFound';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/states';
import { ArticleShell, ArticleLayout } from '@/components/editorial';
import { LongformArticleShell } from '@/components/editorial/LongformArticleShell';
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
  module_id: string | null;
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
          setEssay(data as unknown as Essay);
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

  // Fetch siblings via module_id FK
  const { data: siblings } = useQuery({
    queryKey: ['finance-siblings', (essay as any)?.module_id],
    queryFn: async () => {
      if (!(essay as any)?.module_id) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('essays')
        .select('slug, title')
        .eq('module_id', (essay as any).module_id)
        .eq('status', 'published')
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EssayListItem[];
    },
    enabled: !!(essay as any)?.module_id,
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

  const currentIndex = siblings?.findIndex((e) => e.slug === essaySlug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next =
    siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  const getEssayUrl = (slug: string) => `/finance/${track}/${moduleSlug}/${slug}`;

  const presentation = resolvePresentation(essay);
  const deck = presentation.deck || essay.snippet;
  const topic = module?.title ?? essay.phase ?? 'Finance';
  const htmlContent = contentToHtml(essay.content || '');
  const isLongform = track === 'finance-in-motion';

  const sharedProps = {
    seoTitle: essay.title,
    seoDescription: deck || 'Finance knowledge for decision-making.',
    seoAuthor: essay.author || undefined,
    backLink: { label: 'Back to lessons', path: `/finance/${track}/${moduleSlug}` },
    title: essay.title,
    deck,
    author: essay.author,
    publishedAt: essay.date,
    updatedAt: essay.updated_at,
    createdAt: essay.created_at,
    readTime: essay.read_time,
    heroImage: essay.thumbnail_url,
    heroCaption: presentation.hero_caption,
    content: essay.content || '',
    keyTakeaways: presentation.key_takeaways,
    references: presentation.references,
    authorBio: presentation.author_bio,
    previous,
    next,
    getEssayUrl,
    currentEssayId: essay.id,
    section: 'finance' as const,
  };

  if (isLongform) {
    return <LongformArticleShell {...sharedProps} />;
  }

  return (
    <ArticleShell
      {...sharedProps}
      topic={topic}
      htmlContent={htmlContent}
    />
  );
}
