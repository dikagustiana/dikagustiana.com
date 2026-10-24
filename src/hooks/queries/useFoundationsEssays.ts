import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FOUNDATIONS_SECTION } from '@/config/foundationsOfKnowing';

/**
 * Every essay of Foundations of Knowing, drafts included, for every reader.
 *
 * Read from the essay_structure view, as the Finance tracks are: an anonymous
 * reader cannot see a draft row in `essays` (RLS), and the section and part
 * pages list the planned essays as the map of the work. The view carries
 * titles, decks, placement and ordering, never bodies. One read serves both
 * pages: 56 rows, ordered by sort_order (part × 100 + place in the part).
 */
export interface FoundationsEssayRow {
  id: string;
  slug: string;
  title: string;
  snippet: string | null;
  author: string | null;
  phase: string | null;
  sort_order: number | null;
  published: boolean;
  read_time: string | null;
}

export const useFoundationsEssays = () =>
  useQuery({
    queryKey: ['foundations-essays'],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<FoundationsEssayRow[]> => {
      const { data, error } = await supabase
        .from('essay_structure')
        .select('id, slug, title, snippet, author, phase, sort_order, published, read_time')
        .eq('section', FOUNDATIONS_SECTION)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FoundationsEssayRow[];
    },
  });

/** Essays per part, keyed by part id: total and published. */
export function countByPart(rows: FoundationsEssayRow[] | undefined) {
  const counts: Record<string, { total: number; published: number }> = {};
  for (const row of rows ?? []) {
    if (!row.phase) continue;
    const c = (counts[row.phase] ??= { total: 0, published: 0 });
    c.total += 1;
    if (row.published) c.published += 1;
  }
  return counts;
}
