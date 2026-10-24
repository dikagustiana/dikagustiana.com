import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChainLink, ChartType, Frequency } from '@/lib/transition/model';
import type { ManualRow } from '@/lib/transition/manualEntry';
import type { TrackerSector } from '@/lib/tracker';

/**
 * The admin's reads and writes on the ds_ tables. RLS admits only an admin
 * (migration 20261024120000_transition_data_layer); ds_observation and
 * ds_check are written by the gate alone, so the only publish path here is
 * the ds_publish_series RPC. Casts as in useTrackerEntries: the tables are
 * newer than the generated types.
 */

const table = (name: string) => supabase.from(name as never);
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)(fn, args);

export interface AdminSeries {
  id: string;
  source_id: string;
  source_code: string;
  source_url: string;
  title_en: string;
  unit: string;
  frequency: Frequency;
  chain_link: ChainLink;
  ingest: 'api' | 'manual';
  is_projection: boolean;
  definition_note: string;
  status: 'draft' | 'published' | 'retired';
  review_due: string | null;
  r7_threshold: number;
}

export interface StageRow {
  id: number;
  stage_token: string;
  series_id: string;
  member: string;
  period_start: string;
  period_label: string | null;
  value: number;
  unit: string | null;
  vintage: string;
  is_projection: boolean;
  source_url: string | null;
  source_locator: string | null;
  ingest: 'api' | 'manual';
  staged_at: string;
}

export interface CheckRow {
  id?: number;
  series_id?: string;
  stage_token?: string;
  run_at?: string;
  rule_id: string;
  severity: 'fail' | 'warn' | 'info';
  passed: boolean;
  expected: string | null;
  actual: string | null;
  detail: string;
}

export interface GateResult {
  run_at: string;
  rules: number;
  failed: number;
  warnings: number;
  published: boolean;
  rows_published: number;
  rows_unchanged: number;
}

export interface AdminChart {
  slug: string;
  title: string;
  subtitle: string | null;
  chain_link: ChainLink;
  chart_type: ChartType;
  annotation_sectors: TrackerSector[];
  published: boolean;
  sort_order: number;
}

export interface AdminChain {
  chain_link: ChainLink;
  title: string;
  question: string;
  status_text: string | null;
  sort_order: number;
}

export interface FetchRun {
  id: string;
  source_id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'ok' | 'partial' | 'failed';
  rows_staged: number;
  error: string | null;
  run_url: string | null;
}

const KEY = ['transition-admin'] as const;

export function useAdminTransition() {
  return useQuery({
    queryKey: [...KEY],
    queryFn: async () => {
      const [series, stage, checks, charts, chain, runs, counts] = await Promise.all([
        table('ds_series').select('*').order('chain_link').order('id'),
        table('ds_observation_stage').select('*').order('series_id').order('period_start').limit(5000),
        table('ds_check').select('*').order('run_at', { ascending: false }).limit(1000),
        table('ds_chart').select('*').order('chain_link').order('sort_order'),
        table('ds_chain').select('*').order('sort_order'),
        table('ds_fetch_run').select('*').order('started_at', { ascending: false }).limit(20),
        supabase.from('v_series_status' as never).select('series_id, n_values, last_retrieved_at, latest_vintage'),
      ]);
      for (const r of [series, stage, checks, charts, chain, runs, counts]) if (r.error) throw r.error;
      return {
        series: (series.data ?? []) as unknown as AdminSeries[],
        stage: (stage.data ?? []) as unknown as StageRow[],
        checks: (checks.data ?? []) as unknown as CheckRow[],
        charts: (charts.data ?? []) as unknown as AdminChart[],
        chain: (chain.data ?? []) as unknown as AdminChain[],
        runs: (runs.data ?? []) as unknown as FetchRun[],
        counts: (counts.data ?? []) as unknown as Array<{ series_id: string; n_values: number; last_retrieved_at: string | null; latest_vintage: string | null }>,
      };
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: [...KEY] });
    void qc.invalidateQueries({ queryKey: ['transition'] });
  };
}

/** Stage manual rows under the series' open manual token (or a new one). */
export function useStageRows() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ seriesId, token, rows }: { seriesId: string; token: string; rows: ManualRow[] }) => {
      const payload = rows.map((r) => ({ ...r, series_id: seriesId, stage_token: token, ingest: 'manual' }));
      const { error } = await table('ds_observation_stage').insert(payload as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
}

export function useDiscardStage() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ ids }: { ids: number[] }) => {
      const { error } = await table('ds_observation_stage').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: done,
  });
}

export async function previewStage(seriesId: string, token: string): Promise<CheckRow[]> {
  const { data, error } = await rpc('ds_preview_stage', { p_series_id: seriesId, p_stage_token: token });
  if (error) throw error;
  return (data ?? []) as unknown as CheckRow[];
}

export function usePublishSeries() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ seriesId, token, confirm }: { seriesId: string; token: string; confirm: boolean }): Promise<GateResult> => {
      const { data, error } = await rpc('ds_publish_series', {
        p_series_id: seriesId,
        p_stage_token: token,
        p_confirm_warnings: confirm,
      });
      if (error) throw error;
      return ((data ?? []) as unknown as GateResult[])[0];
    },
    onSuccess: done,
  });
}

export function useUpdateChart() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ slug, values }: { slug: string; values: Partial<AdminChart> }) => {
      const { error } = await table('ds_chart').update(values as never).eq('slug', slug);
      if (error) throw error;
    },
    onSuccess: done,
  });
}

export function useUpdateChain() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ link, status_text }: { link: ChainLink; status_text: string | null }) => {
      const { error } = await table('ds_chain').update({ status_text } as never).eq('chain_link', link);
      if (error) throw error;
    },
    onSuccess: done,
  });
}

export function useUpdateSeries() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Pick<AdminSeries, 'review_due' | 'r7_threshold' | 'status'>> }) => {
      const { error } = await table('ds_series').update(values as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: done,
  });
}
