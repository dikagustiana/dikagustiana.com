/** The JISDOR rates (fx.ts), read once per visit; an empty list while loading or when the read fails. */
import { useQuery } from '@tanstack/react-query';
import { FX_QUERY_KEY, fetchFxRates, type FxRate } from './fx';

const NONE: FxRate[] = [];

export function useFxRates(): FxRate[] {
  const q = useQuery({ queryKey: FX_QUERY_KEY, queryFn: () => fetchFxRates(), staleTime: 60 * 60_000 });
  return q.data ?? NONE;
}
