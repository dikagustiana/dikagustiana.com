import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';
import { LoadingState } from '@/components/states';
import {
  ArticleLayout,
  ArticleHeader,
  ArticleBody,
  KeyTakeaways,
  References,
  AuthorBox,
  RelatedEssays,
  useFontSize,
} from '@/components/editorial';
import { ArrowLeft } from 'lucide-react';

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
  // Extended fields for Aeon-style reading
  economist_fields: {
    deck?: string;
    key_takeaways?: string[];
    references?: (string | { label: string; url?: string })[];
    hero_caption?: string;
    author_bio?: string;
  } | null;
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
        // Check access: non-admins can only see published essays
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

  // Extract extended fields
  const economistFields = essay.economist_fields || {};
  const deck = economistFields.deck || essay.snippet;
  const keyTakeaways = economistFields.key_takeaways || [];
  const references = economistFields.references || [];
  const heroCaption = economistFields.hero_caption;
  const authorBio = economistFields.author_bio;
  const topic = essay.phase ? categoryLabels[essay.phase] || essay.phase : undefined;

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
        to="/the-next-big-thing"
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
        readTime={essay.read_time}
        topic={topic}
        heroImage={essay.thumbnail_url}
        heroCaption={heroCaption}
      />

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

      {/* Related Essays */}
      <RelatedEssays
        currentEssayId={essay.id}
        section="next-big-thing"
      />
    </ArticleLayout>
  );
}
