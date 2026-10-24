/**
 * Where each slate company stands before it is published: the view
 * fia.slate_progress (supabase/migrations/20261024170200_fia_slate_status.sql),
 * read as anon with the site's publishable key, as published.ts reads
 * fia.model_packages. It imports no fixture.
 *
 * The tracker is a progress note, not a number a reader relies on: a failed
 * read (the view not there yet, a refused key, the network) leaves the map
 * empty, every unmodelled company then counts as not started, and the
 * modelled count, which comes from the published packages, is unaffected.
 */
import { useQuery } from '@tanstack/react-query';
import { isSlateStatus, type SlateStatus } from './coverage';

export const SLATE_PROGRESS_QUERY_KEY = ['finance-in-action', 'slate-progress'] as const;

export async function fetchSlateProgress(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL,
  key: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
): Promise<Map<string, SlateStatus>> {
  if (!url || !key) return new Map();
  try {
    const res = await fetch(`${url}/rest/v1/slate_progress?select=ticker,status`, {
      headers: { apikey: key, 'Accept-Profile': 'fia', Accept: 'application/json' },
    });
    if (!res.ok) {
      await res.body?.cancel();
      return new Map();
    }
    const rows = (await res.json()) as { ticker?: unknown; status?: unknown }[];
    return new Map(
      (Array.isArray(rows) ? rows : [])
        .filter((r): r is { ticker: string; status: SlateStatus } => typeof r.ticker === 'string' && isSlateStatus(r.status))
        .map((r) => [r.ticker, r.status]),
    );
  } catch {
    return new Map();
  }
}

export function useSlateProgress(): Map<string, SlateStatus> {
  const q = useQuery({ queryKey: SLATE_PROGRESS_QUERY_KEY, queryFn: () => fetchSlateProgress(), staleTime: 5 * 60_000 });
  return q.data ?? EMPTY;
}

const EMPTY = new Map<string, SlateStatus>();
