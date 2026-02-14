import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Finance Fundamentals ──

export interface FinanceFundamental {
  id: string;
  slug: string;
  title: string;
  core_content: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useFinanceFundamentals = () => {
  return useQuery({
    queryKey: ['finance-fundamentals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_fundamentals')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FinanceFundamental[];
    },
  });
};

export const useUpdateFundamental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; core_content?: string | null; sort_order?: number } }) => {
      const { error } = await supabase
        .from('finance_fundamentals')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-fundamentals'] });
    },
  });
};

// ── Finance Sections (DB-backed domain metadata) ──

export interface FinanceSection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useFinanceSections = () => {
  return useQuery({
    queryKey: ['finance-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_sections')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FinanceSection[];
    },
  });
};

export const useFinanceSectionBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['finance-sections', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_sections')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as FinanceSection;
    },
    enabled: !!slug,
  });
};

export const useUpdateFinanceSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; description?: string | null; sort_order?: number } }) => {
      const { error } = await supabase
        .from('finance_sections')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-sections'] });
    },
  });
};

// ── Finance Settings ──

export const useFinanceSettings = () => {
  return useQuery({
    queryKey: ['finance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_settings')
        .select('*');

      if (error) throw error;
      const map: Record<string, string | null> = {};
      for (const row of data) {
        map[row.key] = row.value;
      }
      return map;
    },
  });
};

export const useUpdateFinanceSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase
        .from('finance_settings')
        .update({ value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-settings'] });
      queryClient.invalidateQueries({ queryKey: ['finance-featured-essay'] });
    },
  });
};

// ── Featured Essay ──

export const useFeaturedFinanceEssay = () => {
  return useQuery({
    queryKey: ['finance-featured-essay'],
    queryFn: async () => {
      // Get setting
      const { data: settings, error: settingsError } = await supabase
        .from('finance_settings')
        .select('value')
        .eq('key', 'featured_finance_essay_id')
        .single();

      if (settingsError || !settings?.value) return null;

      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, economist_fields')
        .eq('id', settings.value)
        .single();

      if (error) return null;
      return data;
    },
  });
};

// ── Finance Section Essays ──

export interface FinanceSectionEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  date: string | null;
  read_time: string | null;
  thumbnail_url: string | null;
  finance_section: string | null;
  finance_order: number | null;
  created_at: string;
}

/**
 * Maps route slug to DB finance_section value.
 * Route slugs: strategic-finance, planning-forecasting, financial-analytics
 * DB values: strategic, planning, analytics
 */
const ROUTE_TO_DB_SECTION: Record<string, string> = {
  'strategic-finance': 'strategic',
  'planning-forecasting': 'planning',
  'financial-analytics': 'analytics',
};

export const useFinanceSectionEssays = (routeSlugOrDbKey: string) => {
  const dbKey = ROUTE_TO_DB_SECTION[routeSlugOrDbKey] || routeSlugOrDbKey;

  return useQuery({
    queryKey: ['finance-section-essays', dbKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, finance_section, finance_order, created_at')
        .eq('section', 'finance')
        .eq('finance_section', dbKey)
        .eq('published', true)
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinanceSectionEssay[];
    },
    enabled: !!dbKey,
  });
};

// ── Finance essays for admin (all statuses) ──

export const useFinanceEssaysForAdmin = () => {
  return useQuery({
    queryKey: ['finance-essays-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, status, published, finance_section, finance_order')
        .eq('section', 'finance')
        .order('title', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

// ── Essays linked to a fundamental ──

export const useFundamentalEssays = (fundamentalSlug: string) => {
  return useQuery({
    queryKey: ['fundamental-essays', fundamentalSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, author, date, read_time, thumbnail_url, finance_order, created_at')
        .eq('section', 'finance')
        .eq('finance_section', 'fundamentals')
        .eq('topic', fundamentalSlug)
        .eq('published', true)
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinanceSectionEssay[];
    },
    enabled: !!fundamentalSlug,
  });
};
