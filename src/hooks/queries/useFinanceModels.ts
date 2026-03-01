import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinanceModel {
  id: string;
  slug: string;
  number: string;
  name: string;
  description: string | null;
  depth: 'foundation' | 'executive' | 'institutional';
  version: string;
  last_updated: string;
  documentation: {
    objective?: string;
    mechanics?: string;
    inputs?: string;
    outputs?: string;
    decision?: string;
    limitations?: string;
  };
  module_references: string[];
  excel_file_url: string | null;
  is_flagship: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useFinanceModels = () =>
  useQuery({
    queryKey: ['finance-models'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('finance_models')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as FinanceModel[];
    },
  });

export const useFinanceModelBySlug = (slug: string) =>
  useQuery({
    queryKey: ['finance-models', slug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('finance_models')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as FinanceModel;
    },
    enabled: !!slug,
  });

export const useUpdateFinanceModel = () => {
  const qc = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('finance_models')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-models'] });
    },
  });
};
