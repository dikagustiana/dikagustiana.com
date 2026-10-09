import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onlyPublished } from '@/lib/publication';

/**
 * How many published essays each section holds.
 *
 * Written for the homepage's Sections list, so that three empty doors
 * stopped looking like furnished rooms; that list left the homepage on
 * 2026-10-09 (docs/DECISIONS.md). The count stays because the header's
 * navigation reads it (useNavSectionCollapsed): a section with nothing
 * published collapses to a plain link instead of a menu of empty pages.
 *
 * This is a COUNT, not a description. The owner's rule against six sibling
 * sentences under six headings stands (docs/DECISIONS.md, 2026-08-03) — that
 * rule is about generated prose, and a number is not prose.
 *
 * Counted client-side from the published rows rather than with a grouped
 * aggregate, because PostgREST has no GROUP BY and the alternative is one HEAD
 * request per section. At this size that trade is not close.
 */
export const useSectionCounts = () =>
  useQuery({
    queryKey: ['section-counts'],
    queryFn: async () => {
      const { data, error } = await onlyPublished(supabase.from('essays').select('section'));
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { section: string | null }[]) {
        if (!row.section) continue;
        counts[row.section] = (counts[row.section] ?? 0) + 1;
      }
      return counts;
    },
  });
