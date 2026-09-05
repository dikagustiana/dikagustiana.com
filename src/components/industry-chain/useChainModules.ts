/**
 * The modules that read one joint, with their lessons.
 *
 * Follows the structure the site already has — finance_sections →
 * finance_modules → essays — and the same `published` flag the track index
 * uses to say "Coming soon". Drafts are returned so they can be shown as
 * planned; the panel never links them for readers, exactly like
 * FinanceTrackIndex.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** The columns this panel reads from the essay_structure view. */
export interface ChainEssayRow {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  module_id: string | null;
  finance_order: number | null;
  /** The site's own rule for "Coming soon": false or null means unwritten. */
  published: boolean | null;
}

export interface ChainModule {
  id: string;
  slug: string;
  title: string;
  track_slug: string;
  /** The track's display title, from finance_sections. */
  track_title: string | null;
  thesis: string | null;
  essays: ChainEssayRow[];
}

export function useChainModules(moduleSlugs: string[]) {
  const key = [...moduleSlugs].sort();
  return useQuery({
    queryKey: ['chain-modules', key],
    staleTime: 5 * 60 * 1000,
    enabled: moduleSlugs.length > 0,
    queryFn: async (): Promise<ChainModule[]> => {
      const { data: modules, error: modErr } = await supabase
        .from('finance_modules')
        .select('id, slug, title, track_slug, thesis, sort_order')
        .in('slug', moduleSlugs)
        .order('sort_order', { ascending: true });
      if (modErr) throw modErr;
      if (!modules || modules.length === 0) return [];

      const trackSlugs = Array.from(new Set(modules.map((m) => m.track_slug)));
      const [{ data: sections, error: secErr }, { data: essays, error: essayErr }] = await Promise.all([
        supabase.from('finance_sections').select('slug, title').in('slug', trackSlugs),
        supabase
          .from('essay_structure')
          .select('id, slug, title, snippet, author, module_id, finance_order, published')
          .in('module_id', modules.map((m) => m.id))
          .order('finance_order', { ascending: true, nullsFirst: false })
          .order('title', { ascending: true }),
      ]);
      if (secErr) throw secErr;
      if (essayErr) throw essayErr;

      const trackTitle = new Map((sections ?? []).map((s) => [s.slug, s.title]));
      const byModule = new Map<string, ChainEssayRow[]>();
      for (const e of (essays ?? []) as ChainEssayRow[]) {
        if (!e.module_id) continue;
        (byModule.get(e.module_id) ?? byModule.set(e.module_id, []).get(e.module_id)!).push(e);
      }

      // Keep the order the mapping table gave, not the database's.
      const rank = new Map(moduleSlugs.map((s, i) => [s, i]));
      return modules
        .map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          track_slug: m.track_slug,
          track_title: trackTitle.get(m.track_slug) ?? null,
          thesis: m.thesis,
          essays: byModule.get(m.id) ?? [],
        }))
        .sort((a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0));
    },
  });
}
