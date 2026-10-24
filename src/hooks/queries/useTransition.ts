import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  chartsFromCatalog,
  withData,
  type ChartModel,
  type ChainRow,
  type ChartCatalogRow,
  type ChartDataRow,
  type HistoryRow,
  type SeriesStatusRow,
} from '@/lib/transition/model';

/**
 * Reads of the transition data layer's public views (migration
 * 20261024120000_transition_data_layer). anon has no privilege on a ds_ table;
 * these views are its whole contract, and each returns published rows only.
 *
 * The views are newer than the generated types, hence the casts, as in
 * useTrackerEntries.
 */

const view = (name: string) => supabase.from(name as never);

export function useChain() {
  return useQuery({
    queryKey: ['transition', 'chain'],
    queryFn: async (): Promise<ChainRow[]> => {
      const { data, error } = await view('v_chain').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as ChainRow[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Published charts with their published series; `slug` narrows to one. */
export function useChartCatalog(slug?: string) {
  return useQuery({
    queryKey: ['transition', 'catalog', slug ?? '*'],
    queryFn: async (): Promise<ChartCatalogRow[]> => {
      let q = view('v_chart_catalog').select('*');
      if (slug) q = q.eq('chart_slug', slug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ChartCatalogRow[];
    },
    staleTime: 5 * 60_000,
  });
}

/** What the given charts draw: latest vintages only. */
export function useChartData(slugs: string[]) {
  const key = [...slugs].sort();
  return useQuery({
    queryKey: ['transition', 'data', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<ChartDataRow[]> => {
      // PostgREST pages at 1000 rows; a monthly mix of eight members passes that.
      const out: ChartDataRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await view('v_chart_data')
          .select('*')
          .in('chart_slug', key)
          .order('chart_slug')
          .order('series_id')
          .order('member')
          .order('period_start')
          .range(from, from + 999);
        if (error) throw error;
        const rows = (data ?? []) as unknown as ChartDataRow[];
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return out;
    },
    staleTime: 5 * 60_000,
  });
}

export function useSeriesStatus(seriesIds: string[]) {
  const key = [...seriesIds].sort();
  return useQuery({
    queryKey: ['transition', 'status', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<SeriesStatusRow[]> => {
      const { data, error } = await view('v_series_status').select('*').in('series_id', key);
      if (error) throw error;
      return (data ?? []) as unknown as SeriesStatusRow[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Every published vintage of the given series: the detail page's history. */
export function useSeriesHistory(seriesIds: string[]) {
  const key = [...seriesIds].sort();
  return useQuery({
    queryKey: ['transition', 'history', key],
    enabled: key.length > 0,
    queryFn: async (): Promise<HistoryRow[]> => {
      const out: HistoryRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await view('v_series_history')
          .select('*')
          .in('series_id', key)
          .order('series_id')
          .order('member')
          .order('period_start')
          .order('vintage')
          .range(from, from + 999);
        if (error) throw error;
        const rows = (data ?? []) as unknown as HistoryRow[];
        out.push(...rows);
        if (rows.length < 1000) break;
      }
      return out;
    },
    staleTime: 5 * 60_000,
  });
}

export function useChartUsage(slug: string) {
  return useQuery({
    queryKey: ['transition', 'usage', slug],
    queryFn: async (): Promise<Array<{ chart_slug: string; essay_slug: string; essay_title: string }>> => {
      const { data, error } = await view('v_chart_usage').select('*').eq('chart_slug', slug);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ chart_slug: string; essay_slug: string; essay_title: string }>;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Published charts, with their data and the status of their series: what the
 * tracker page and an essay embed draw. `slug` narrows to one chart.
 */
export function useChartModels(slug?: string) {
  const catalog = useChartCatalog(slug);
  const charts = useMemo(() => chartsFromCatalog(catalog.data ?? []), [catalog.data]);
  const memberOrder = useMemo(() => {
    const out: Record<string, string[] | null> = {};
    for (const r of catalog.data ?? []) if (r.series_id) out[r.series_id] = r.members;
    return out;
  }, [catalog.data]);
  const slugs = charts.filter((c) => c.seriesIds.length > 0).map((c) => c.slug);
  const seriesIds = [...new Set(charts.flatMap((c) => c.seriesIds))];
  const data = useChartData(slugs);
  const status = useSeriesStatus(seriesIds);
  const models: ChartModel[] = useMemo(
    () => charts.map((c) => withData(c, data.data ?? [], memberOrder)),
    [charts, data.data, memberOrder],
  );
  return {
    charts: models,
    status: status.data ?? [],
    isLoading: catalog.isLoading || (slugs.length > 0 && data.isLoading),
    isError: catalog.isError || data.isError,
    refetch: () => {
      void catalog.refetch();
      void data.refetch();
      void status.refetch();
    },
  };
}
