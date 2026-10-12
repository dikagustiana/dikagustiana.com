import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FsCheck, FsLine, FsPeriod } from '@/lib/fs';

/**
 * Reads for the audited financial statements viewer.
 *
 * RLS decides what each reader gets (20261011130000_fs_statements): anon and
 * signed-in readers see published periods and their rows, an admin sees drafts
 * too. There is no status filter in the viewer's reads on purpose, so an admin
 * can review a draft on the page before publishing it; the line-item pages
 * read published periods only.
 */

const PERIOD_COLUMNS =
  'id, company_id, period_key, period_end, comparative_end, currency, unit, auditor, auditor_report_no, auditor_opinion, source_file, status, fs_company!inner(id, legal_name, short_name)';

const LINE_COLUMNS =
  'id, period_id, statement, parent_id, sort_order, line_type, indent, label_id, label_en, notes_ref, value_cy, value_py, source_page, line_key, fsli_slug, printed_diff_cy, printed_diff_py, printed_diff_note';

/** Every period the reader may see, newest first: the company picker's list. */
export function useFsPeriods() {
  return useQuery({
    queryKey: ['fs-periods'],
    queryFn: async (): Promise<FsPeriod[]> => {
      const { data, error } = await supabase
        .from('fs_period')
        .select(PERIOD_COLUMNS)
        .order('period_end', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FsPeriod[];
    },
  });
}

/** Every line of one period, all three vertical statements, in printed order. */
export function useFsLines(periodId: string | undefined) {
  return useQuery({
    queryKey: ['fs-lines', periodId],
    queryFn: async (): Promise<FsLine[]> => {
      const { data, error } = await supabase
        .from('fs_line')
        .select(LINE_COLUMNS)
        .eq('period_id', periodId!)
        .order('statement', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FsLine[];
    },
    enabled: !!periodId,
  });
}

/** The pages of the period's SoCE cells, for the badge's page range (the SoCE is checked, not yet shown). */
export function useFsSocePages(periodId: string | undefined) {
  return useQuery({
    queryKey: ['fs-soce-pages', periodId],
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase.from('fs_soce_cell').select('source_page').eq('period_id', periodId!);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => r.source_page as number))];
    },
    enabled: !!periodId,
  });
}

/** Every check run of one period; the badge reads the latest. */
export function useFsChecks(periodId: string | undefined) {
  return useQuery({
    queryKey: ['fs-checks', periodId],
    queryFn: async (): Promise<FsCheck[]> => {
      const { data, error } = await supabase
        .from('fs_check')
        .select('rule_id, statement, description, expected, actual, diff, passed, run_at')
        .eq('period_id', periodId!)
        .order('run_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FsCheck[];
    },
    enabled: !!periodId,
  });
}

/**
 * The statement rows linked to one line-item page, from the newest published
 * period that has one. Null when no published statement row links to it.
 */
export function useFsLinesForSlug(slug: string) {
  return useQuery({
    queryKey: ['fs-lines-for-slug', slug],
    queryFn: async (): Promise<{ period: FsPeriod; lines: FsLine[] } | null> => {
      const { data: linked, error } = await supabase
        .from('fs_line')
        .select(`period_id, fs_period!inner(${PERIOD_COLUMNS})`)
        .eq('fsli_slug', slug)
        .eq('fs_period.status', 'published');
      if (error) throw error;
      const periods = ((linked ?? []) as unknown as Array<{ fs_period: FsPeriod }>)
        .map((r) => r.fs_period)
        .sort((a, b) => (a.period_end < b.period_end ? 1 : -1));
      const period = periods[0];
      if (!period) return null;
      const { data: lines, error: linesError } = await supabase
        .from('fs_line')
        .select(LINE_COLUMNS)
        .eq('period_id', period.id)
        .order('sort_order', { ascending: true });
      if (linesError) throw linesError;
      return { period, lines: (lines ?? []) as unknown as FsLine[] };
    },
    enabled: !!slug,
  });
}

/**
 * The admin's publish action (Plan 1.7): fs_publish_period re-runs the tie-out
 * rules on the stored rows, records the run, and publishes only if none fail.
 */
export function useFsPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase.rpc('fs_publish_period', { p_period_id: periodId });
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
    onSettled: (_data, _error, periodId) => {
      void qc.invalidateQueries({ queryKey: ['fs-periods'] });
      void qc.invalidateQueries({ queryKey: ['fs-checks', periodId] });
    },
  });
}
