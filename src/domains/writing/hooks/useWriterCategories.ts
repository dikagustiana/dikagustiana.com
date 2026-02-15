import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WritingCategory } from '../schema/types';

export function useWriterCategories(sectionId?: string) {
  return useQuery({
    queryKey: ['writer-categories', sectionId],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WritingCategory[];
    },
    enabled: !!sectionId,
  });
}
