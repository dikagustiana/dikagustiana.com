import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrackerEntry } from '@/lib/tracker';

/**
 * The tracker register, every row the reader is allowed to see.
 *
 * RLS decides which rows those are (migration 20261011100000_tracker_entry):
 * a reader gets the published rows, an admin gets every row, so an admin can
 * review unpublished entries on a preview deployment and the page marks them.
 * There is no `published` filter here on purpose; adding one would hide from
 * the admin exactly the rows they need to check.
 *
 * `tracker_entry` is newer than the generated types, hence the casts, as in
 * useAuditLog.
 */
export function useTrackerEntries() {
  return useQuery({
    queryKey: ['tracker-entries'],
    queryFn: async (): Promise<TrackerEntry[]> => {
      const { data, error } = await supabase
        .from('tracker_entry' as never)
        .select('id, quarter, sector, status, finding, detail, sources, verification, published')
        .order('quarter', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TrackerEntry[];
    },
  });
}
