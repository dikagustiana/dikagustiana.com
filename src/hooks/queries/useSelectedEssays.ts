import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * THE featuring mechanism. `essays.is_selected` is the one way anything gets
 * promoted anywhere — the homepage, About, and the Finance landing all read
 * it. The two mechanisms it replaced: `useFeaturedEssays` (created_at
 * recency, which is what put a database-rebuild notice on the homepage) and
 * `finance_settings.featured_finance_essay_id` (a third path for one page).
 */
export interface SelectedEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  phase: string | null;
  author: string | null;
  read_time: string | null;
  date: string | null;
  created_at: string;
  // Placement, so essayUrl can build the canonical finance URL. Without these
  // a selected curriculum essay silently degrades to the universal route.
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_modules: { slug: string; track_slug: string } | null;
}

export const useSelectedEssays = (limit = 8) => {
  return useQuery({
    queryKey: ['essays', 'selected', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select(`
          id, slug, title, snippet, section, phase, author, read_time,
          date, created_at, finance_section, fsli_slug, topic,
          finance_modules!essays_module_id_fkey ( slug, track_slug )
        `)
        .eq('is_selected', true)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as SelectedEssay[];
    },
  });
};
