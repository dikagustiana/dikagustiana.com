/**
 * The production registry: the owner's published models, read once per
 * visit, and the slate while there are none. A failed read never becomes a
 * fixture (constraint 3) and never becomes a number: the page says which
 * failure it was and lists the slate as planned.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildLiveRegistry } from './live';
import { failureOf, fetchPublishedPackages, PUBLISHED_QUERY_KEY } from './published';
import type { RegistryState } from './registryState';

export function useLiveRegistry(): RegistryState {
  const q = useQuery({
    queryKey: PUBLISHED_QUERY_KEY,
    queryFn: () => fetchPublishedPackages(),
    staleTime: 5 * 60_000,
  });
  const reg = useMemo(() => buildLiveRegistry(q.data ?? []), [q.data]);
  if (q.isPending) return { reg, published: 'loading', failure: null, fixtures: false };
  if (q.isError) return { reg, published: 'error', failure: failureOf(q.error), fixtures: false };
  return { reg, published: 'ok', failure: null, fixtures: false };
}
