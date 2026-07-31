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
}

export const useSelectedEssays = (limit = 8) => {
  return useQuery({
    queryKey: ['essays', 'selected', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('essays')
        .select('id, slug, title, section, phase, date, created_at')
        .eq('is_selected', true)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SelectedEssay[];
    },
  });
};
