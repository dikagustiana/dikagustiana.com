import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { LoadingState } from '@/components/states';
import {
  ArticleLayout,
  ArticleHeader,
  ArticleBody,
  ArticleToc,
  KeyTakeaways,
  References,
  AuthorBox,
  RelatedEssays,
  EssayNavigation,
  useFontSize,
} from '@/components/editorial';
import { ArrowLeft } from 'lucide-react';
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
  const { fontSizeClass } = useFontSize();

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
        .eq('section', 'next-big-thing')
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

  // Fetch sibling essays for prev/next
  const { data: siblings } = useQuery({
    queryKey: ['nbt-siblings', essay?.phase],
    queryFn: async () => {
      let query = supabase
        .from('essays')
        .select('slug, title')
        .eq('section', 'next-big-thing')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (essay?.phase) {
        query = query.eq('phase', essay.phase);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EssayListItem[];
    },
    enabled: !!essay,
  });

  // Redirect non-admins accessing drafts
  if (notFound || (!loading && !essay)) {
    return <Navigate to="/the-next-big-thing" replace />;
  }

  if (loading) {
    return (
      <ArticleLayout>
        <LoadingState variant="article" />
      </ArticleLayout>
    );
  }

  if (!essay) return null;

  // Compute prev/next
  const currentIndex = siblings?.findIndex((e) => e.slug === slug) ?? -1;
  const previous = currentIndex > 0 ? siblings![currentIndex - 1] : null;
  const next = siblings && currentIndex >= 0 && currentIndex < siblings.length - 1
    ? siblings[currentIndex + 1]
    : null;

  const getEssayUrl = (essaySlug: string) => `/the-next-big-thing/${essaySlug}`;

  // Extract extended fields
  const economistFields = essay.economist_fields || {};
  const deck = economistFields.deck || essay.snippet;
  const keyTakeaways = economistFields.key_takeaways || [];
  const references = economistFields.references || [];
  const heroCaption = economistFields.hero_caption;
  const authorBio = economistFields.author_bio;
  const topic = essay.phase ? categoryLabels[essay.phase] || essay.phase : undefined;

  // Get HTML content for TOC
  const htmlContent = contentToHtml(essay.content || '');

  // Build back link with theme context
  const backPath = essay.phase
    ? `/the-next-big-thing?theme=${essay.phase}`
    : '/the-next-big-thing';

  return (
    <ArticleLayout>
      <SEO
        title={essay.title}
        description={deck || 'Analysis of emerging economic forces and structural change.'}
        type="article"
        author={essay.author || 'Dika Gustiana'}
      />

      {/* Back link */}
      <Link
        to={backPath}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to The Next Big Thing
      </Link>

      {/* Article Header */}
      <ArticleHeader
        title={essay.title}
        deck={deck}
        author={essay.author}
        publishedAt={essay.date}
        updatedAt={essay.updated_at}
        createdAt={essay.created_at}
        readTime={essay.read_time}
        topic={topic}
        heroImage={essay.thumbnail_url}
        heroCaption={heroCaption}
      />

      {/* Table of Contents */}
      <ArticleToc content={htmlContent} />

      {/* Article Body */}
      <ArticleBody
        content={essay.content || ''}
        fontSizeClass={fontSizeClass}
      />

      {/* End Matter */}
      <KeyTakeaways takeaways={keyTakeaways} />

      <References references={references} />

      {essay.author && (
        <AuthorBox
          name={essay.author}
          bio={authorBio}
        />
      )}

      {/* Prev/Next + Back */}
      <EssayNavigation
        backLink={{
          label: 'Back to The Next Big Thing',
          path: backPath,
        }}
        previous={previous}
        next={next}
        getEssayUrl={getEssayUrl}
      />

      {/* Related Essays */}
      <RelatedEssays
        currentEssayId={essay.id}
        section="next-big-thing"
      />
    </ArticleLayout>
  );
}
