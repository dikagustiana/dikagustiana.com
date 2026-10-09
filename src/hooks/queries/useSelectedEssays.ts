import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * THE featuring mechanism. `essays.is_selected` is the one way anything gets
 * promoted anywhere — the homepage, About, and the Finance landing all read
 * it. The two mechanisms it replaced: `useFeaturedEssays` (created_at
 * recency, which is what put a database-rebuild notice on the homepage) and
 * `finance_settings.featured_finance_essay_id` (a third path for one page).
 *
 * The ORDER is the owner's: `essays.selected_rank`, set in Admin → Content →
 * Homepage order, lower first. A starred essay that has not been placed yet
 * (rank NULL) sorts after every placed one, newest first.
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
      const base = () =>
        supabase.from('essays').select(SELECTED_COLUMNS).eq('is_selected', true).eq('published', true);

      const ranked = await base()
        .order('selected_rank', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!ranked.error) return ranked.data as unknown as SelectedEssay[];
      if (!isMissingColumn(ranked.error)) throw ranked.error;

      const { data, error } = await base().order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data as unknown as SelectedEssay[];
    },
  });
};
