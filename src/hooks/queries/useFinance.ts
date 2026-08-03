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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_sections')
        .select('*')
        .eq('slug', slug)
        // maybeSingle: a missing track is a not-found, not an error. `.single()`
        // makes PostgREST answer 406 on zero rows, which surfaced as a failed
        // request behind a page that otherwise looked fine.
        .maybeSingle();

      if (error) throw error;
      return data as FinanceSection | null;
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
    },
  });
};

// ── Featured Essay ──

export const useFeaturedFinanceEssay = () => {
  return useQuery({
    queryKey: ['finance-featured-essay'],
    queryFn: async () => {
      // ONE featuring mechanism sitewide: essays.is_selected. This used to
      // read finance_settings.featured_finance_essay_id — a third path for
      // one page. The landing shows the most recently selected finance
      // essay, or nothing at all when none is selected.
      const { data, error } = await supabase
        .from('essays')
        .select(`
          id, slug, title, snippet, author, date, read_time, thumbnail_url,
          presentation, section, phase, finance_section, fsli_slug, topic,
          finance_modules!essays_module_id_fkey ( slug, track_slug )
        `)
        .eq('section', 'finance')
        .eq('is_selected', true)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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
    staleTime: 2 * 60 * 1000,
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

// useFinanceEssaysForAdmin was deleted with the featured-essay selector —
// its only caller. Featuring is essays.is_selected, toggled in Admin → Content.

// ── Finance Modules ──

export interface FinanceModule {
  id: string;
  track_slug: string;
  slug: string;
  title: string;
  thesis: string | null;
  sort_order: number;
  framing_content: string | null;
  module_meta: { variant?: string; icon?: string; color_accent?: string; display_label?: string; essay_count?: number } | null;
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
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('finance_modules')
        .select('*')
        .eq('track_slug', trackSlug)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as FinanceModule[];
    },
    enabled: !!trackSlug,
  });
};

// NOTE: useModuleLessonCounts lived here and is deleted, not moved. It had
// zero consumers (only its cache key was ever invalidated), and it was the
// last reader of `module_meta.essay_count` besides useTrackEssayCounts —
// which now derives its totals from the essay_structure view instead
// (docs/DECISIONS.md 2026-08-03, "module counts are derived"). The stored
// essay_count key is therefore entirely unread; its removal is staged as a
// follow-up migration in the session log, applied only after these pages
// are confirmed reading the derived source in production.

export const useAllFinanceModules = () => {
  return useQuery({
    queryKey: ['finance-modules', 'all'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('finance_modules')
        .select('*')
        .order('track_slug', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as FinanceModule[];
    },
  });
};

// ── Finance Module by slug ──

export const useFinanceModuleBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['finance-modules-by-slug', slug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('finance_modules')
        .select('*')
        .eq('slug', slug)
        .limit(1)
        // A module slug that does not exist is a not-found for the page to
        // handle, not a transport error.
        .maybeSingle();

      if (error) throw error;
      return data as FinanceModule | null;
    },
    enabled: !!slug,
  });
};

// ── Essays linked to a finance module ──

/**
 * One row of the public curriculum structure — the essay_structure VIEW's
 * shape, not the essays table's. The view exposes titles, decks, placement
 * and the author for draft AND published essays to every identity; it does
 * not carry bodies, and read_time/lesson_type are NULL until published.
 * (docs/DECISIONS.md 2026-08-03 — the anon-draft reversal, titles and decks
 * only.)
 */
export interface EssayStructureRow {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  section: string | null;
  module_id: string | null;
  finance_order: number | null;
  published: boolean;
  read_time: string | null;
  lesson_type: string | null;
}

/**
 * Every lesson of a module — drafts included, for everyone. The query runs
 * against essay_structure, so no identity flag exists here any more: the
 * anonymous reader, the signed-in reader and the admin all receive the same
 * rows, and what differs is only the rendering (a draft is inert for
 * readers, a door into the editor for admins).
 */
export const useEssaysByModuleId = (moduleId: string | undefined) => {
  return useQuery({
    queryKey: ['essays-by-module-id', moduleId],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('essay_structure')
        .select('id, slug, title, snippet, author, section, module_id, finance_order, published, read_time, lesson_type')
        .eq('module_id', moduleId!)
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });

      if (error) throw error;
      return (data || []) as EssayStructureRow[];
    },
    enabled: !!moduleId,
  });
};
