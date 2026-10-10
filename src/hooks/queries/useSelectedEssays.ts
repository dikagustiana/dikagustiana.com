import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * The homepage row: EVERY published essay, the owner's picks first.
 *
 * First the starred essays (`essays.is_selected`) in the owner's order —
 * `essays.selected_rank`, set in Admin → Content → Homepage order, lower
 * first; a starred essay that has not been placed yet (rank NULL) sorts after
 * every placed one, newest first. Then every other published essay, newest
 * first. The two are joined in that order and cut to `limit`. So a new essay
 * is on the homepage the day it is published, without a star; the star
 * decides only who leads (owner decision D3(a), 2026-10-10: 21 essays were
 * published, 3 were starred, and the row showed the 3).
 *
 * One read, one snapshot. As two reads, the starred and then the rest, an
 * essay starred or unstarred between them could be on neither side (review
 * of PR #63). The database sorts the starred to the front in the owner's
 * order and the hook keeps them as they come; the rest it puts back in date
 * order, so a rank an unstarred essay still holds (an order saved from a
 * panel opened before the unstar) moves nothing. The read stops at twice
 * `limit`, 60 on the homepage against 21 published essays today. With no
 * rank left on an unstarred essay the row is the read's first `limit` rows;
 * the database sorts an unstarred essay that keeps one ahead of the newer
 * unstarred, which pushes them down the read, and the second `limit` is the
 * room for that. So the row is exact while no more than `limit` published
 * unstarred essays hold a rank. Only that stale save leaves one, and it
 * writes no more than the starred its panel listed.
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
  date, created_at, finance_section, fsli_slug, topic, is_selected,
  finance_modules!essays_module_id_fkey ( slug, track_slug )
`;

const newestFirst = (a: SelectedEssay, b: SelectedEssay) => Date.parse(b.created_at) - Date.parse(a.created_at);

export const useSelectedEssays = (limit = 8) => {
  return useQuery({
    queryKey: ['essays', 'selected', limit],
    queryFn: async () => {
      const base = () =>
        supabase.from('essays').select(SELECTED_COLUMNS).eq('published', true).order('is_selected', { ascending: false });

      let read = await base()
        .order('selected_rank', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      if (isMissingColumn(read.error)) {
        // Before the rank migration: the same read, the starred newest first.
        read = await base().order('created_at', { ascending: false }).limit(limit * 2);
      }
      if (read.error) throw read.error;

      const rows = read.data as unknown as (SelectedEssay & { is_selected: boolean })[];
      const starred = rows.filter((essay) => essay.is_selected);
      const rest = rows.filter((essay) => !essay.is_selected).sort(newestFirst);
      return [...starred, ...rest].slice(0, limit);
    },
  });
};
