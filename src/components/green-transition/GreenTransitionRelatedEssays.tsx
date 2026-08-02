import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GreenTransitionRelatedEssaysProps {
  phase?: string;
  currentSlug?: string;
}

interface Essay {
  slug: string;
  title: string;
}

export function GreenTransitionRelatedEssays({ phase, currentSlug }: GreenTransitionRelatedEssaysProps) {
  const [essays, setEssays] = useState<Essay[]>([]);

  useEffect(() => {
    loadRelatedEssays();
  }, [phase]);

  const loadRelatedEssays = async () => {
    try {
      if (!phase) return; // no phase, no query — .eq('phase', undefined) matches nothing useful
      const { data } = await supabase
        .from('essays')
        .select('slug, title')
        .eq('section', 'green-transition')
        .eq('phase', phase)
        .order('sort_order', { ascending: true })
        .limit(10);

      setEssays(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load related essays:', error);
      }
    }
  };

  if (essays.length === 0) {
    return null;
  }

  return (
    <aside className="w-56 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4 text-sm">
            Related Essays
          </h3>
          
          <nav className="space-y-1">
            {essays.map((essay) => (
              <Link
                key={essay.slug}
                to={`/green-transition/${phase}/${essay.slug}`}
                className={cn(
                  "block py-2 px-3 text-sm rounded-md transition-colors border-l-2",
                  currentSlug === essay.slug 
                    ? "bg-amber-50 text-amber-700 border-amber-500 font-medium dark:bg-amber-950/30 dark:text-amber-400" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                )}
              >
                {essay.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
