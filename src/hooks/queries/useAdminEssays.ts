import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VoiceRole } from '@/components/layouts/PageLayout';

export interface EssayWithHealth {
  id: string;
  slug: string;
  title: string;
  section: string;
  phase: string | null;
  published: boolean | null;
  voice_role: string | null;
  author: string | null;
  date: string | null;
  snippet: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  // Computed health fields
  healthScore: number;
  missingFields: string[];
  hasViolations: boolean;
}

export function useAdminEssays(sectionFilter?: string) {
  return useQuery({
    queryKey: ['admin-essays', sectionFilter],
    queryFn: async () => {
      let query = supabase
        .from('essays')
        .select('*')
        .order('updated_at', { ascending: false });

      if (sectionFilter && sectionFilter !== 'all') {
        query = query.eq('section', sectionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBulkPublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, published }: { ids: string[]; published: boolean }) => {
      const { error } = await supabase
        .from('essays')
        .update({ published, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

export function useDeleteEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('essays')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}

export function useUpdateEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EssayWithHealth> }) => {
      const { error } = await supabase
        .from('essays')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
      queryClient.invalidateQueries({ queryKey: ['essay'] });
    },
  });
}

interface CreateEssayData {
  title: string;
  slug: string;
  section: string;
  phase?: string | null;
  voice_role?: string | null;
  published?: boolean;
  author?: string | null;
  date?: string | null;
  read_time?: string | null;
  snippet?: string | null;
  content?: string | null;
  prerequisites?: string[] | null;
  learning_outcomes?: string[] | null;
}

export function useCreateEssay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEssayData) => {
      const { data: result, error } = await supabase
        .from('essays')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essays'] });
      queryClient.invalidateQueries({ queryKey: ['essays'] });
    },
  });
}
