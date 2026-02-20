import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        .select(`
          id, slug, title, snippet, author, date, read_time, thumbnail_url, economist_fields,
          finance_section,
          module:finance_modules!module_id ( slug )
        `)
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

export const useFinanceSectionEssays = (routeSlugOrDbKey: string) => {
  const dbKey = routeSlugOrDbKey;

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

// ── Finance Modules ──

export interface FinanceModule {
  id: string;
  track_slug: string;
  slug: string;
  title: string;
  thesis: string | null;
  sort_order: number;
  framing_content: string | null;
  module_meta: { variant?: string; icon?: string; color_accent?: string } | null;
  created_at: string;
  updated_at: string;
}

/**
 * FinanceFundamental — Alias for FinanceModule.
 * Used by PostSettingsPanel to populate the fundamentals picker.
 * (PostSettingsPanel imports this type by name; it must be exported.)
 */
export type FinanceFundamental = FinanceModule;

export const useFinanceModulesByTrack = (trackSlug: string) => {
  return useQuery({
    queryKey: ['finance-modules', trackSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_modules')
        .select('*')
        .eq('track_slug', trackSlug)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FinanceModule[];
    },
    enabled: !!trackSlug,
  });
};

export const useModuleLessonCounts = (trackSlug: string) => {
  return useQuery({
    queryKey: ['finance-module-lesson-counts', trackSlug],
    queryFn: async () => {
      const { data: modules, error: modError } = await supabase
        .from('finance_modules')
        .select('id, slug')
        .eq('track_slug', trackSlug);

      if (modError) throw modError;
      if (!modules || modules.length === 0) return {};

      const counts: Record<string, number> = {};
      for (const mod of modules) {
        const { count, error } = await supabase
          .from('essays')
          .select('id', { count: 'exact', head: true })
          .eq('module_id', mod.id)
          .eq('published', true);

        counts[mod.slug] = error ? 0 : (count || 0);
      }

      return counts;
    },
    enabled: !!trackSlug,
  });
};

export const useAllFinanceModules = () => {
  return useQuery({
    queryKey: ['finance-modules', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_modules')
        .select('*')
        .order('track_slug', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FinanceModule[];
    },
  });
};

// ── Finance Module by slug ──

export const useFinanceModuleBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['finance-modules-by-slug', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_modules')
        .select('*')
        .eq('slug', slug)
        .limit(1)
        .single();

      if (error) throw error;
      return data as FinanceModule;
    },
    enabled: !!slug,
  });
};

// ── Essays linked to a finance module ──

export interface FinanceModuleEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  date: string | null;
  read_time: string | null;
  finance_order: number | null;
  lesson_type: string | null;
  created_at: string;
}

export const useEssaysByModuleId = (moduleId: string | undefined) => {
  return useQuery({
    queryKey: ['essays-by-module-id', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essays')
        .select('id, slug, title, snippet, date, read_time, finance_order, lesson_type, created_at')
        .eq('module_id', moduleId!)
        .eq('published', true)
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinanceModuleEssay[];
    },
    enabled: !!moduleId,
  });
};
