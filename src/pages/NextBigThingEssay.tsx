import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  updated_at: string;
}

const categoryLabels: Record<string, string> = {
  'technology': 'Technology',
  'economy': 'Economy',
  'society': 'Society',
  'environment': 'Environment',
  'governance': 'Governance',
};

export default function NextBigThingEssay() {
  const { slug } = useParams<{ slug: string }>();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadEssay();
    }
  }, [slug]);

  const loadEssay = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug)
        .eq('section', 'next-big-thing')
        .maybeSingle();

      setEssay(data);
    } catch (error) {
      console.error('Failed to load essay:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-8">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-8" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!essay) {
    return <Navigate to="/the-next-big-thing" replace />;
  }

  const categoryLabel = essay.phase ? categoryLabels[essay.phase] || essay.phase : '';

  // Simple markdown-like rendering for the content
  const renderContent = (content: string) => {
    return content.split('\n\n').map((paragraph, idx) => {
      // Handle headers
      if (paragraph.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-display font-semibold text-foreground mt-8 mb-4">
            {paragraph.replace('## ', '')}
          </h2>
        );
      }
      if (paragraph.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-semibold text-foreground mt-6 mb-3">
            {paragraph.replace('### ', '')}
          </h3>
        );
      }
      // Handle lists
      if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
        const items = paragraph.split('\n').filter(line => line.startsWith('- '));
        return (
          <ul key={idx} className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
            {items.map((item, i) => (
              <li key={i}>{item.replace('- ', '')}</li>
            ))}
          </ul>
        );
      }
      if (paragraph.includes('\n1. ') || paragraph.startsWith('1. ')) {
        const items = paragraph.split('\n').filter(line => /^\d+\. /.test(line));
        return (
          <ol key={idx} className="list-decimal list-inside space-y-2 text-muted-foreground mb-4 ml-4">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^\d+\. /, '')}</li>
            ))}
          </ol>
        );
      }
      // Handle bold text within paragraphs
      const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={idx} className="text-muted-foreground leading-relaxed mb-4">
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Image */}
        {essay.thumbnail_url && (
          <div 
            className="h-[40vh] min-h-[300px] bg-cover bg-center relative"
            style={{ backgroundImage: `url(${essay.thumbnail_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className="container py-8">
          <div className="max-w-3xl mx-auto">
            {/* Back Link */}
            <Link 
              to="/the-next-big-thing" 
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to The Next Big Thing
            </Link>

            {/* Category Badge */}
            {categoryLabel && (
              <Badge variant="secondary" className="mb-4 capitalize">
                {categoryLabel}
              </Badge>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              {essay.title}
            </h1>

            {/* Snippet */}
            {essay.snippet && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {essay.snippet}
              </p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              {essay.author && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {essay.author}
                </span>
              )}
              {essay.date && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {essay.date}
                </span>
              )}
              {essay.read_time && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {essay.read_time}
                </span>
              )}
            </div>

            {/* Content */}
            <article className="prose prose-invert max-w-none">
              {essay.content ? (
                renderContent(essay.content)
              ) : (
                <p className="text-muted-foreground italic">
                  Content coming soon. Check back later for the full essay.
                </p>
              )}
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
