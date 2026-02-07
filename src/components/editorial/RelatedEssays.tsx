import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedEssaysProps {
  currentEssayId: string;
  section: string;
  className?: string;
}

interface RelatedEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  phase: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  author: string | null;
}

export function RelatedEssays({ currentEssayId, section, className }: RelatedEssaysProps) {
  const { data: essays, isLoading } = useQuery({
    queryKey: ['related-essays-editorial', currentEssayId, section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, phase, read_time, thumbnail_url, author')
        .eq('section', section)
        .eq('status', 'published')
        .neq('id', currentEssayId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as RelatedEssay[];
    },
    enabled: !!currentEssayId && !!section,
  });

  if (isLoading || !essays || essays.length === 0) return null;

  const getEssayUrl = (essay: RelatedEssay) => {
    if (section === 'next-big-thing') {
      return `/the-next-big-thing/${essay.slug}`;
    }
    if (essay.phase) {
      return `/${section}/${essay.phase}/${essay.slug}`;
    }
    return `/${section}/${essay.slug}`;
  };

  return (
    <section className={cn("border-t border-border pt-10 mt-16", className)}>
      <h2 className="text-xl font-display font-semibold text-foreground mb-6">
        Continue Reading
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {essays.map((essay) => (
          <Link 
            key={essay.id} 
            to={getEssayUrl(essay)}
            className="group block"
          >
            {essay.thumbnail_url && (
              <div className="aspect-[16/9] overflow-hidden rounded-lg mb-4">
                <img
                  src={essay.thumbnail_url}
                  alt={essay.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {essay.title}
            </h3>
            {essay.snippet && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {essay.snippet}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {essay.author && <span>{essay.author}</span>}
              {essay.read_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {essay.read_time}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
