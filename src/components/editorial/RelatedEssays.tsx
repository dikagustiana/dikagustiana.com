import { essayUrl } from '@/lib/essayUrl';
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
  finance_section?: string | null;
  fsli_slug?: string | null;
  topic?: string | null;
  finance_modules?: { slug: string; track_slug: string } | null;
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
        // finance_section + the module join let essayUrl build the four-segment
        // curriculum URL; without them a related finance essay silently got a
        // section/phase shape that only editorial sections actually serve.
        .select(`
          id, slug, title, snippet, phase, read_time, thumbnail_url, author,
          finance_section, fsli_slug, topic,
          finance_modules!essays_module_id_fkey ( slug, track_slug )
        `)
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

  // One canonical builder — a local shape here is how the homepage 404'd.
  const getEssayUrl = (essay: RelatedEssay) =>
    essayUrl({
      slug: essay.slug,
      section,
      phase: essay.phase,
      track: essay.finance_modules?.track_slug ?? essay.finance_section ?? null,
      moduleSlug: essay.finance_modules?.slug ?? null,
      fsliSlug: essay.fsli_slug,
      topic: essay.topic,
    }) ?? '#';

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
