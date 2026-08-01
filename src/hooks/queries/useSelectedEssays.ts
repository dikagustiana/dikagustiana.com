import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SelectedEssay {
  id: string;
  slug: string;
  title: string;
  section: string;
  phase: string | null;
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
      const { data, error } = await (supabase as any)
        .from('essays')
        .select(`
          id, slug, title, section, phase, date, created_at,
          finance_section, fsli_slug, topic,
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
