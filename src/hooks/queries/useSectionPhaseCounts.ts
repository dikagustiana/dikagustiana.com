import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onlyPublished } from '@/lib/publication';

/**
 * Published essays per phase, keyed by section then phase.
 *
 * The section landings list their phases, and on 9 October 2026 every phase of
 * Green Transition, Development Finance and Critical Thinking was empty. A row
 * that reads "View Essays" over an empty room is the same false promise
 * `useSectionCounts` fixed on the homepage, one level down. Counted the same
 * way and for the same reason: PostgREST has no GROUP BY, and at this size one
 * read of two columns beats a request per phase.
 *
 * An absent key means zero; an unresolved query also means absent. Callers must
 * check `isSuccess` before rendering a zero (see lib/sectionStanding).
 */
export type SectionPhaseCounts = Record<string, Record<string, number>>;

export const useSectionPhaseCounts = () =>
  useQuery({
    queryKey: ['section-phase-counts'],
    queryFn: async (): Promise<SectionPhaseCounts> => {
      const { data, error } = await onlyPublished(supabase.from('essays').select('section, phase'));
      if (error) throw error;

      const counts: SectionPhaseCounts = {};
      for (const row of (data ?? []) as { section: string | null; phase: string | null }[]) {
        if (!row.section || !row.phase) continue;
        const bySection = (counts[row.section] ??= {});
        bySection[row.phase] = (bySection[row.phase] ?? 0) + 1;
      }
      return counts;
    },
  });
