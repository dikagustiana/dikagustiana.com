import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Section {
  id: string;
  slug: string;
  name: string;
  voice_role: 'manager' | 'economist' | 'educator' | 'coach' | 'hybrid';
  manifesto: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useSections = () => {
  return useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Section[];
    },
  });
};

export const useSection = (slug: string) => {
  return useQuery({
    queryKey: ['sections', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('slug', slug)
        // maybeSingle: a row that does not exist is a not-found for the page
        // to render, not a 406 from PostgREST behind a page that looks fine.
        .maybeSingle();

      if (error) throw error;
      return data as Section;
    },
    enabled: !!slug,
  });
};
