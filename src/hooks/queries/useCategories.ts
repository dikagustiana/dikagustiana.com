import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  section_id: string | null;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface UseCategoriesParams {
  sectionId?: string;
  sectionSlug?: string;
}

export const useCategories = (params: UseCategoriesParams = {}) => {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: async () => {
      let query = supabase.from('categories').select('*');

      if (params.sectionId) {
        query = query.eq('section_id', params.sectionId);
      }

      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

export const useCategory = (slug: string, sectionId?: string) => {
  return useQuery({
    queryKey: ['categories', slug, sectionId],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('slug', slug);

      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!slug,
  });
};
