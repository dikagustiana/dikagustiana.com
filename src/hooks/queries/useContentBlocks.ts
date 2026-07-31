import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContentBlock {
  id: string;
  page_slug: string;
  block_key: string;
  content: string;
  block_type: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useContentBlocks = (pageSlug: string) => {
  return useQuery({
    queryKey: ['content_blocks', pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('page_slug', pageSlug)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ContentBlock[];
    },
    enabled: !!pageSlug,
  });
};

export const useContentBlock = (pageSlug: string, blockKey: string) => {
  return useQuery({
    queryKey: ['content_blocks', pageSlug, blockKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .eq('page_slug', pageSlug)
        .eq('block_key', blockKey)
        .single();

      if (error) throw error;
      return data as ContentBlock;
    },
    enabled: !!pageSlug && !!blockKey,
  });
};
