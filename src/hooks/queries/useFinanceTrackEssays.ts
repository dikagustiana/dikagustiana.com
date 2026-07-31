import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FinanceModuleEssay } from './useFinance';

/**
 * Fetch essay counts (published + total) keyed by module ID
 * for all modules in a given track.
 */
export const useTrackEssayCounts = (trackSlug: string) => {
  return useQuery({
    queryKey: ['finance-track-essay-counts', trackSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Get module IDs for this track
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: modules, error: modErr } = await (supabase as any)
        .from('finance_modules')
        .select('id')
        .eq('track_slug', trackSlug);

      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return {};

      const moduleIds = (modules as { id: string }[]).map((m) => m.id);

      // Fetch all essays for these modules in one query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: essays, error: essayErr } = await (supabase as any)
        .from('essays')
        .select('module_id, published')
        .in('module_id', moduleIds);

      if (essayErr) throw essayErr;

      const counts: Record<string, { published: number; total: number }> = {};
      for (const id of moduleIds) {
        counts[id] = { published: 0, total: 0 };
      }
      for (const e of (essays || []) as { module_id: string; published: boolean }[]) {
        if (counts[e.module_id]) {
          counts[e.module_id].total++;
          if (e.published) counts[e.module_id].published++;
        }
      }

      return counts;
    },
    enabled: !!trackSlug,
  });
};

/**
 * Fetch all essays grouped by module ID for a given track.
 */
export const useTrackAllEssays = (trackSlug: string) => {
  return useQuery({
    queryKey: ['finance-track-all-essays', trackSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: modules, error: modErr } = await (supabase as any)
        .from('finance_modules')
        .select('id')
        .eq('track_slug', trackSlug);

      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return {};

      const moduleIds = (modules as { id: string }[]).map((m) => m.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: essays, error: essayErr } = await (supabase as any)
        .from('essays')
        .select('id, slug, title, snippet, date, read_time, finance_order, lesson_type, created_at, published, status, module_id')
        .in('module_id', moduleIds)
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (essayErr) throw essayErr;

      const grouped: Record<string, FinanceModuleEssay[]> = {};
      for (const id of moduleIds) {
        grouped[id] = [];
      }
      for (const e of (essays || []) as (FinanceModuleEssay & { module_id: string })[]) {
        if (grouped[e.module_id]) {
          grouped[e.module_id].push(e);
        }
      }

      return grouped;
    },
    enabled: !!trackSlug,
  });
};
