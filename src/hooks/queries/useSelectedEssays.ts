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
 * order, so a rank an unstarred essay still holds moves nothing. The read
 * stops at twice `limit`, 60 on the homepage against 21 published essays
 * today. With no rank left on an unstarred essay the row is the read's first
 * `limit` rows; the database sorts an unstarred essay that keeps one ahead of
 * the newer unstarred, which pushes them down the read, and the second
 * `limit` is the room for that. So the row is exact while no more than
 * `limit` published unstarred essays hold a rank. Nothing in the app leaves
 * one: unstarring clears the rank, and saving the order ranks only rows still
 * starred (useSaveSelectedOrder). Production had none on 10 October 2026;
 * only a hand edit in the database could add one.
 *
 * The pinned essays (`essays.featured_rank`, 1 to 3, set in Admin → Content →
 * Homepage Glimpse) come before all of them, in slot order, so the read can
 * never cut a pin off; glimpseZones splits the list into the glimpse's
 * pinned columns and its running row.
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
  /** The glimpse slot it is pinned to, 1 to 3; NULL (or absent, before migration 20261030100000_essay_featured_rank) when not pinned. */
  featured_rank?: number | null;
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

export const SELECTED_COLUMNS = `
  id, slug, title, snippet, section, phase, author, read_time,
  date, created_at, finance_section, fsli_slug, topic, is_selected,
  finance_modules!essays_module_id_fkey ( slug, track_slug )
`;

const newestFirst = (a: SelectedEssay, b: SelectedEssay) => Date.parse(b.created_at) - Date.parse(a.created_at);

/** How many essays the glimpse pins beside its running row. */
export const PINNED_SLOTS = 3;

const isPinned = (essay: SelectedEssay) => essay.featured_rank != null;

export const useSelectedEssays = (limit = 8) => {
  return useQuery({
    queryKey: ['essays', 'selected', limit],
    queryFn: async () => {
      const base = (columns: string) => supabase.from('essays').select(columns).eq('published', true);
      const byStar = <Q extends { order: (column: string, options: { ascending: boolean; nullsFirst?: boolean }) => Q }>(query: Q) =>
        query.order('is_selected', { ascending: false });

      // The pins first, then the starred in the owner's order, then the rest.
      let read = await byStar(base(`${SELECTED_COLUMNS}, featured_rank`).order('featured_rank', { ascending: true, nullsFirst: false }))
        .order('selected_rank', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      if (isMissingColumn(read.error)) {
        // Before the pin migration: nothing is pinned.
        read = await byStar(base(SELECTED_COLUMNS))
          .order('selected_rank', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(limit * 2);
      }
      if (isMissingColumn(read.error)) {
        // Before the rank migration: the same read, the starred newest first.
        read = await byStar(base(SELECTED_COLUMNS)).order('created_at', { ascending: false }).limit(limit * 2);
      }
      if (read.error) throw read.error;

      const rows = read.data as unknown as (SelectedEssay & { is_selected: boolean })[];
      const pinned = rows.filter(isPinned).sort((a, b) => a.featured_rank! - b.featured_rank!);
      const unpinned = rows.filter((essay) => !isPinned(essay));
      const starred = unpinned.filter((essay) => essay.is_selected);
      const rest = unpinned.filter((essay) => !essay.is_selected).sort(newestFirst);
      return [...pinned, ...starred, ...rest].slice(0, limit);
    },
  });
};

/**
 * The glimpse's two zones, from the homepage row. Slot n holds the essay
 * pinned to it (featured_rank n); a slot nobody is pinned to holds the newest
 * published essay not already in a slot, so the zone is three columns while
 * three essays are published. Everything else is the running row, in the
 * order given. An essay is in one zone only.
 */
export function glimpseZones(essays: SelectedEssay[]): { pinned: SelectedEssay[]; row: SelectedEssay[] } {
  const slots: (SelectedEssay | undefined)[] = Array.from({ length: PINNED_SLOTS }, (_, i) =>
    essays.find((essay) => essay.featured_rank === i + 1),
  );
  const fill = essays.filter((essay) => !slots.includes(essay)).sort(newestFirst);
  const pinned = slots
    .map((essay) => essay ?? fill.shift())
    .filter((essay): essay is SelectedEssay => !!essay);
  return { pinned, row: essays.filter((essay) => !pinned.includes(essay)) };
}
