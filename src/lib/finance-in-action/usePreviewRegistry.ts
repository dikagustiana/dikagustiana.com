/**
 * The preview registry with the owner's published models in it.
 *
 * The fixtures are drawn at once; published packages join when the read
 * returns. A failed read keeps the fixtures and says so (`published` is
 * 'error' with the failure), so a broken read never empties the page.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildPreviewRegistry, previewRegistry } from './preview';
import { failureOf, fetchPublishedPackages, PUBLISHED_QUERY_KEY } from './published';
import type { RegistryState } from './registryState';

export type { PublishedState } from './registryState';

export function usePreviewRegistry(): RegistryState {
  const q = useQuery({
    queryKey: PUBLISHED_QUERY_KEY,
    queryFn: () => fetchPublishedPackages(),
    staleTime: 5 * 60_000,
  });
  const reg = useMemo(() => (q.data?.length ? buildPreviewRegistry(q.data) : previewRegistry()), [q.data]);
  if (q.isPending) return { reg, published: 'loading', failure: null, fixtures: true };
  if (q.isError) return { reg, published: 'error', failure: failureOf(q.error), fixtures: true };
  return { reg, published: 'ok', failure: null, fixtures: true };
}
