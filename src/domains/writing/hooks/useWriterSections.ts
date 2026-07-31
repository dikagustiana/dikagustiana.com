import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WritingSection } from '../schema/types';

export function useWriterSections() {
  return useQuery({
    queryKey: ['writer-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as WritingSection[];
    },
  });
}
