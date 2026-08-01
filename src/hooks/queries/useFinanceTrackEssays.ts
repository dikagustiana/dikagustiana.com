import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FinanceModuleEssay } from './useFinance';

/**
 * Published-vs-planned lesson counts keyed by module ID.
 *
 * `total` must NOT be derived by counting rows in `essays`. RLS correctly hides
 * the 160 unpublished stubs from anonymous visitors, so counting returned 0 and
 * the module index rendered "0 essays" for every module — the data was right
 * and the interface was lying. The planned figure comes from
 * `finance_modules.module_meta.essay_count`, which is anon-readable and was
 * populated from the framework by migration 20260801100000.
 *
 * `published` is still counted, because a published essay is visible to
 * everyone by definition.
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
        .select('id, module_meta')
        .eq('track_slug', trackSlug);

      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return {};

      const mods = modules as { id: string; module_meta: { essay_count?: number } | null }[];
      const moduleIds = mods.map((m) => m.id);

      // Only PUBLISHED essays are counted; the planned total comes from meta.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: essays, error: essayErr } = await (supabase as any)
        .from('essays')
        .select('module_id')
        .in('module_id', moduleIds)
        .eq('published', true);

      if (essayErr) throw essayErr;

      const counts: Record<string, { published: number; total: number }> = {};
      for (const m of mods) {
        counts[m.id] = { published: 0, total: m.module_meta?.essay_count ?? 0 };
      }
      for (const e of (essays || []) as { module_id: string }[]) {
        if (counts[e.module_id]) counts[e.module_id].published++;
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
