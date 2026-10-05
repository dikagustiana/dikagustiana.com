/**
 * The preview registry with the owner's published models in it.
 *
 * The fixtures are drawn at once; published packages join when the read
 * returns. A failed read keeps the fixtures and says so (`published` is
 * 'error' with the reason), so a broken read never empties the page.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Registry } from './registry';
import { buildPreviewRegistry, previewRegistry } from './preview';
import { fetchPublishedPackages, PUBLISHED_QUERY_KEY } from './published';

export type PublishedState = 'loading' | 'ok' | 'error';

export function usePreviewRegistry(): { reg: Registry; published: PublishedState; error: string | null } {
  const q = useQuery({
    queryKey: PUBLISHED_QUERY_KEY,
    queryFn: () => fetchPublishedPackages(),
    staleTime: 5 * 60_000,
  });
  const reg = useMemo(() => (q.data?.length ? buildPreviewRegistry(q.data) : previewRegistry()), [q.data]);
  const published: PublishedState = q.isPending ? 'loading' : q.isError ? 'error' : 'ok';
  return { reg, published, error: q.isError ? (q.error as Error).message : null };
}
