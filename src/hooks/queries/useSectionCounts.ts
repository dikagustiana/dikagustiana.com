import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onlyPublished } from '@/lib/publication';

/**
 * How many published essays sit behind each door on the homepage.
 *
 * The Sections list names five subjects and, on 14 September 2026, three of
 * them had nothing written in them at all. The list could not show that: every
 * row looked identical, so "Development Finance" and "Finance" read as equally
 * furnished rooms and a stranger found the emptiness only by walking in.
 *
 * This is a COUNT, not a description. The owner's rule against six sibling
 * sentences under six headings stands (docs/DECISIONS.md, 2026-08-03) — that
 * rule is about generated prose, and a number is not prose. What it buys is
 * that the list stops implying a body of work that is not there.
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
