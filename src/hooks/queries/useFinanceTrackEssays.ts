import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EssayStructureRow } from './useFinance';

/**
 * Published-vs-total lesson counts keyed by module ID — both sides now
 * DERIVED from the essay_structure view.
 *
 * History, because this reverses a recorded fix: totals used to come from
 * `module_meta.essay_count`, stored precisely because counting `essays` rows
 * under RLS returned 0 for anonymous visitors ("0 essays" on every module).
 * The essay_structure view removed that constraint — every identity sees
 * every draft's row through it — so the count can finally come from the data
 * itself and cannot drift from the titles listed beneath it. Verified at
 * switch time: all 49 modules' stored counts matched their real row counts
 * exactly (GATE S7), so no rendered number changed.
 *
 * This derivation is MODULE-LEVEL ONLY. Section landing pages must keep
 * their hand-maintained numbers: Accounting and Green Transition carry real
 * work as static pages that are not `essays` rows, and a derived count would
 * understate them there (docs/DECISIONS.md 2026-08-03).
 */
export const useTrackEssayCounts = (trackSlug: string) => {
  return useQuery({
    queryKey: ['finance-track-essay-counts', trackSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: modules, error: modErr } = await supabase
        .from('finance_modules')
        .select('id')
        .eq('track_slug', trackSlug);

      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return {};

      const moduleIds = modules.map((m) => m.id);

      const { data: rows, error: rowsErr } = await supabase
        .from('essay_structure')
        .select('module_id, published')
        .in('module_id', moduleIds);

      if (rowsErr) throw rowsErr;

      const counts: Record<string, { published: number; total: number }> = {};
      for (const id of moduleIds) {
        counts[id] = { published: 0, total: 0 };
      }
      for (const r of rows ?? []) {
        if (!r.module_id || !counts[r.module_id]) continue;
        counts[r.module_id].total++;
        if (r.published) counts[r.module_id].published++;
      }

      return counts;
    },
    enabled: !!trackSlug,
  });
};

/**
 * Every lesson of every module in a track, grouped by module ID — drafts
 * included, for every identity, via the essay_structure view. A draft row
 * carries title, deck, author and placement; never a body, and read_time/
 * lesson_type are NULL until published.
 */
export const useTrackAllEssays = (trackSlug: string) => {
  return useQuery({
    queryKey: ['finance-track-all-essays', trackSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: modules, error: modErr } = await supabase
        .from('finance_modules')
        .select('id')
        .eq('track_slug', trackSlug);

      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return {};

      const moduleIds = modules.map((m) => m.id);

      const { data: essays, error: essayErr } = await supabase
        .from('essay_structure')
        .select('id, slug, title, snippet, author, section, module_id, finance_order, published, read_time, lesson_type')
        .in('module_id', moduleIds)
        .order('finance_order', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });

      if (essayErr) throw essayErr;

      const grouped: Record<string, EssayStructureRow[]> = {};
      for (const id of moduleIds) {
        grouped[id] = [];
      }
      for (const e of (essays || []) as EssayStructureRow[]) {
        if (e.module_id && grouped[e.module_id]) {
          grouped[e.module_id].push(e);
        }
      }

      return grouped;
    },
    enabled: !!trackSlug,
  });
};
