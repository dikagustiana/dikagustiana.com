import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { essayUrl, essayUrlInputFromRow } from '@/lib/essayUrl';

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
  section: string | null;
  finance_section: string | null;
  finance_modules: { slug: string | null; track_slug: string | null } | null;
}

export function RelatedEssays({ currentEssayId, section, className }: RelatedEssaysProps) {
  const { data: essays, isLoading } = useQuery({
    queryKey: ['related-essays-editorial', currentEssayId, section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        // The module join is what lets finance essays build their canonical
        // four-segment URL. Without it the old local builder fell back to
        // `/finance/<slug>` — which is the TRACK route, not an essay.
        .select('id, slug, title, snippet, phase, read_time, thumbnail_url, author, section, finance_section, finance_modules(slug, track_slug)')
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

  if (isLoading || !essays) return null;

  // One canonical builder for the whole product. This component's private
  // builder predated it and disagreed with it for finance essays. A card
  // that cannot produce a URL is dropped — a dead related-card is worse
  // than two cards instead of three.
  const linkable = essays
    .map((essay) => ({
      essay,
      href: essayUrl(essayUrlInputFromRow({ ...essay, section: essay.section ?? section })),
    }))
    .filter((e): e is { essay: RelatedEssay; href: string } => !!e.href);

  if (linkable.length === 0) return null;

  return (
    <section className={cn("border-t border-border pt-10 mt-16", className)}>
      <h2 className="text-xl font-display font-semibold text-foreground mb-6">
        Continue Reading
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {linkable.map(({ essay, href }) => (
          <Link
            key={essay.id}
            to={href}
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
