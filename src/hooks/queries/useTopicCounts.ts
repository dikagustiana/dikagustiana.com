import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onlyPublished } from '@/lib/publication';

/**
 * Published essays per `essays.topic` within one section. Accounting places
 * its consolidation essays by topic (see config/consolidationTopics), not by
 * phase, so this is the topic-level twin of useSectionPhaseCounts. An absent
 * key means zero once the query has resolved.
 */
export const useTopicCounts = (section: string) =>
  useQuery({
    queryKey: ['topic-counts', section],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await onlyPublished(
        supabase.from('essays').select('topic').eq('section', section),
      );
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as { topic: string | null }[]) {
        if (!row.topic) continue;
        counts[row.topic] = (counts[row.topic] ?? 0) + 1;
      }
      return counts;
    },
  });
