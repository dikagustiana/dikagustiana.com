import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * The homepage row: EVERY published essay, the owner's picks first.
 *
 * Two reads in one hook. First the starred essays (`essays.is_selected`) in
 * the owner's order — `essays.selected_rank`, set in Admin → Content →
 * Homepage order, lower first; a starred essay that has not been placed yet
 * (rank NULL) sorts after every placed one, newest first. Then every other
 * published essay, newest first. The two are joined in that order and cut to
 * `limit`. So a new essay is on the homepage the day it is published, without
 * a star; the star decides only who leads (owner decision D3(a), 2026-10-10:
 * 21 essays were published, 3 were starred, and the row showed the 3).
 *
 * `essays.is_selected` is still THE featuring flag. The Finance landing reads
 * it on its own (useFeaturedFinanceEssay) and is not widened by this rule.
 * The two mechanisms it replaced: `useFeaturedEssays` (created_at recency,
 * which is what put a database-rebuild notice on the homepage) and
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

/**
 * Postgres "undefined_column". PostgREST passes it through when a query
 * names `selected_rank` before migration 20261009140000_essay_selected_rank
 * is applied; every reader of the rank treats it as "not ordered yet" and
 * falls back to newest first, so the site never depends on the column being
 * there. Delete the fallbacks once the migration is on production.
 */
export const MISSING_COLUMN = '42703';

export const isMissingColumn = (error: { code?: string } | null | undefined): boolean =>
  error?.code === MISSING_COLUMN;

const SELECTED_COLUMNS = `
  id, slug, title, snippet, section, phase, author, read_time,
  date, created_at, finance_section, fsli_slug, topic,
  finance_modules!essays_module_id_fkey ( slug, track_slug )
`;

export const useSelectedEssays = (limit = 8) => {
  return useQuery({
    queryKey: ['essays', 'selected', limit],
    queryFn: async () => {
      const base = (starred: boolean) =>
        supabase.from('essays').select(SELECTED_COLUMNS).eq('is_selected', starred).eq('published', true);

      const starred = async () => {
        const ranked = await base(true)
          .order('selected_rank', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(limit);
        if (!ranked.error) return ranked.data as unknown as SelectedEssay[];
        if (!isMissingColumn(ranked.error)) throw ranked.error;

        const { data, error } = await base(true).order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return data as unknown as SelectedEssay[];
      };

      // The rest never name the rank, so they need no fallback of their own.
      const rest = async () => {
        const { data, error } = await base(false).order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return data as unknown as SelectedEssay[];
      };

      const [picked, others] = await Promise.all([starred(), rest()]);
      // An essay starred between the two reads would come back from both.
      const seen = new Set(picked.map((essay) => essay.id));
      return [...picked, ...others.filter((essay) => !seen.has(essay.id))].slice(0, limit);
    },
  });
};
