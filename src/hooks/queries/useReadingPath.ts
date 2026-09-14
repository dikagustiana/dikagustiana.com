import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { READING_PATH_SLUGS } from '@/data/readingPath';
import { onlyPublished } from '@/lib/publication';

/**
 * Resolve the reading path's steps against what is actually published.
 *
 * The path's ORDER lives in `src/data/readingPath.ts` and never comes from
 * this query — that is the point of it. What the query supplies is the two
 * things the repository cannot know: whether each named essay is published
 * right now, and the placement fields its canonical URL is built from.
 *
 * A slug that comes back empty is not an error and not a hole: the step stays
 * in the path and renders as unwritten, exactly like a step that never had a
 * slug. An unpublished step must never become a dead link, and it must never
 * silently disappear either — a path that quietly shortens itself is a path
 * that lies about how finished the argument is.
 */
export interface ReadingPathRow {
  slug: string;
  title: string;
  snippet: string | null;
  section: string;
  phase: string | null;
  read_time: string | null;
  date: string | null;
  finance_section: string | null;
  fsli_slug: string | null;
  topic: string | null;
  finance_modules: { slug: string; track_slug: string } | null;
}

export const useReadingPath = () =>
  useQuery({
    queryKey: ['reading-path', READING_PATH_SLUGS],
    queryFn: async () => {
      if (READING_PATH_SLUGS.length === 0) return {} as Record<string, ReadingPathRow>;

      const { data, error } = await onlyPublished(
        supabase
          .from('essays')
          .select(
            `slug, title, snippet, section, phase, read_time, date,
             finance_section, fsli_slug, topic,
             finance_modules!essays_module_id_fkey ( slug, track_slug )`,
          )
          .in('slug', READING_PATH_SLUGS),
      );

      if (error) throw error;

      const rows = (data ?? []) as unknown as ReadingPathRow[];
      return Object.fromEntries(rows.map((row) => [row.slug, row])) as Record<string, ReadingPathRow>;
    },
  });
