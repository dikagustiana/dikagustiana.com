import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Essay {
  id: string;
  section: string;
  phase: string | null;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  content: string | null;
  published: boolean;
  status: string | null;
  sort_order: number;
  category_id: string | null;
  voice_role: string | null;
  prerequisites: string[] | null;
  learning_outcomes: string[] | null;
  manager_fields: Record<string, unknown> | null;
  economist_fields: Record<string, unknown> | null;
  educator_fields: Record<string, unknown> | null;
  coach_fields: Record<string, unknown> | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_section: string | null;
  finance_order: number | null;
  created_at: string;
  updated_at: string;
}

interface UseEssaysParams {
  section?: string;
  phase?: string;
  categoryId?: string;
  published?: boolean;
  limit?: number;
}

export const useEssays = (params: UseEssaysParams = {}) => {
  return useQuery({
    queryKey: ['essays', params],
    queryFn: async () => {
      let query = supabase.from('essays').select('*');

      if (params.section) {
        query = query.eq('section', params.section);
      }
      if (params.phase) {
        query = query.eq('phase', params.phase);
      }
      if (params.categoryId) {
        query = query.eq('category_id', params.categoryId);
      }
      if (params.published !== undefined) {
        query = query.eq('published', params.published);
      }
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query.order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Essay[];
    },
  });
};

interface UseEssayOptions {
  enabled?: boolean;
}

export const useEssay = (slug: string, options: UseEssayOptions = {}) => {
  return useQuery({
    queryKey: ['essay', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as Essay;
    },
    enabled: options.enabled !== undefined ? options.enabled : !!slug,
  });
};

export const useFeaturedEssays = (limit = 4) => {
  return useQuery({
    queryKey: ['essays', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, section, phase, author, read_time')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Essay[];
    },
  });
};

export const useEssaysByFsliSlug = (fsliSlug: string) => {
  return useQuery({
    queryKey: ['essays', 'fsli', fsliSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('fsli_slug', fsliSlug)
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Essay[];
    },
    enabled: !!fsliSlug,
  });
};

export const useEssaysByTopic = (section: string, topic: string) => {
  return useQuery({
    queryKey: ['essays', 'topic', section, topic],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('*')
        .eq('section', section)
        .eq('topic', topic)
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Essay[];
    },
    enabled: !!section && !!topic,
  });
};

export const useRelatedEssays = (currentId: string, section: string, limit = 3) => {
  return useQuery({
    queryKey: ['essays', 'related', currentId, section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, section, phase, author, read_time')
        .eq('section', section)
        .eq('published', true)
        .neq('id', currentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Essay[];
    },
    enabled: !!currentId && !!section,
  });
};
