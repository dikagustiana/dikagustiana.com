import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WritingEssay, EssayStatus } from '../schema/types';

export function useWriterEssay(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['writer-essay', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select(`
          *,
          categories!essays_category_id_fkey (
            id, slug, name, section_id,
            sections!categories_section_id_fkey (
              id, slug, name, voice_role
            )
          )
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as unknown as WritingEssay & {
        categories: {
          id: string;
          slug: string;
          name: string;
          section_id: string;
          sections: { id: string; slug: string; name: string; voice_role: string };
        };
      };
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!slug,
  });
}

interface SaveEssayData {
  title: string;
  slug: string;
  snippet: string | null;
  content: string | null;
  category_id: string;
  section: string;
  tags?: string[];
  status: EssayStatus;
  author: string | null;
  phase?: string | null;
  voice_role?: string | null;
  meta_description?: string | null;
  published?: boolean;
  date?: string | null;
  read_time?: string | null;
  manager_fields?: Record<string, unknown> | null;
  economist_fields?: Record<string, unknown> | null;
  educator_fields?: Record<string, unknown> | null;
  coach_fields?: Record<string, unknown> | null;
  module_id?: string | null;
  finance_section?: string | null;
  finance_order?: number | null;
  lesson_type?: string | null;
}

export function useSaveEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | null; data: SaveEssayData }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        ...data,
        published: data.status === 'published',
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { data: result, error } = await supabase
          .from('essays')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('essays')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writer-essay'] });
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['finance-module-lesson-counts'] });
      queryClient.invalidateQueries({ queryKey: ['essays-by-module-id'] });
    },
  });
}

export function useCheckSlugUnique() {
  return useMutation({
    mutationFn: async ({ slug, excludeId }: { slug: string; excludeId?: string }) => {
      let query = supabase
        .from('essays')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data?.length ?? 0) === 0;
    },
  });
}

export async function generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let candidate = baseSlug;
  let counter = 0;

  while (true) {
    let query = supabase
      .from('essays')
      .select('id')
      .eq('slug', candidate);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    if (!data || data.length === 0) return candidate;

    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
}
