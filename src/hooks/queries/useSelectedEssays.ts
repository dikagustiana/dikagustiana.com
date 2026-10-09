import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * THE featuring mechanism. `essays.is_selected` is the one way anything gets
 * promoted anywhere — the homepage, About, and the Finance landing all read
 * it. The two mechanisms it replaced: `useFeaturedEssays` (created_at
 * recency, which is what put a database-rebuild notice on the homepage) and
 * `finance_settings.featured_finance_essay_id` (a third path for one page).
 */
export interface SelectedEssay {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  phase: string | null;
  author: string | null;
  read_time: string | null;
  date: string | null;
  created_at: string;
  // Placement, so essayUrl can build the canonical finance URL. Without these
  // a selected curriculum essay silently degrades to the universal route.
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_modules: { slug: string; track_slug: string } | null;
}

const SELECTED_COLUMNS = `
  id, slug, title, snippet, section, phase, author, read_time,
  date, created_at, finance_section, fsli_slug, topic,
  finance_modules!essays_module_id_fkey ( slug, track_slug )
`;

/**
 * Order: the owner's `selected_rank` first (lower = further front, set in
 * Admin → Content → Homepage order), then newest first for anything not yet
 * placed. If the column does not exist yet (migration
 * 20261009120000_essay_selected_rank not applied), Postgres answers 42703 and
 * this falls back to newest-first rather than emptying the homepage.
 */
export const useSelectedEssays = (limit = 8) => {
  return useQuery({
    queryKey: ['essays', 'selected', limit],
    queryFn: async () => {
      const ranked = await supabase
        .from('essays')
        .select(SELECTED_COLUMNS)
        .eq('is_selected', true)
        .eq('published', true)
        .order('selected_rank', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!ranked.error) return ranked.data as unknown as SelectedEssay[];
      if (ranked.error.code !== '42703') throw ranked.error;

      const { data, error } = await supabase
        .from('essays')
        .select(SELECTED_COLUMNS)
        .eq('is_selected', true)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as SelectedEssay[];
    },
  });
};
