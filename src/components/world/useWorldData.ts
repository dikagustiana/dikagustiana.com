/**
 * The world's published data, once per session (PRD §8.3): the index at
 * load, cached under the Finance in Action preview's own query key, and the
 * statuses and flow classes the engine needs derived from it. An outage
 * (the request failed) gives every company 'unavailable'.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { flowsFrom, loadPublished, packageFor, PUBLISHED_QUERY_KEY, statusesFrom } from '@/world/data/boundary';
import type { Registry as FiaRegistry } from '@/lib/finance-in-action/registry';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import type { FlowWeight, ModelStatus } from '@/world/data/types';

export interface WorldData {
  state: 'loading' | 'ok' | 'outage';
  reg: FiaRegistry | null;
  statuses: Map<string, ModelStatus>;
  flows: FlowWeight[];
  packageFor: (ticker: string) => ModelPackage | null;
  /** How many of the placed sub-industries have a published model: computed, never typed. */
  covered: number;
}

export function useWorldData(): WorldData {
  const q = useQuery({ queryKey: PUBLISHED_QUERY_KEY, queryFn: loadPublished, staleTime: 5 * 60_000, retry: 1 });
  const reg = q.data ?? null;
  const state: WorldData['state'] = q.isPending ? 'loading' : q.isError ? 'outage' : 'ok';
  return useMemo(() => {
    const statuses = statusesFrom(state === 'loading' ? null : reg, state === 'outage');
    const published = new Set([...statuses.values()].filter((s) => s.state === 'published').map((s) => s.ticker));
    return { state, reg, statuses, flows: flowsFrom(reg), packageFor: (t) => packageFor(reg, t),
      covered: 0 + (published.size ? countCovered(published) : 0) };
  }, [state, reg]);
}

import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
function countCovered(published: Set<string>): number {
  return REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced' && s.companies.some((c) => published.has(c.ticker))).length;
}
