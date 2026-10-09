/**
 * The think tank's pieces: published essays of the rooms' sections, through
 * the same query every section page uses (the essays table, filtered on the
 * column RLS enforces), joined with the interim tag file.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { onlyPublished } from '@/lib/publication';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { piecesFor, type Piece, type PublishedEssay } from '@/lib/world/thinkTank';

export const PIECES_QUERY_KEY = ['world', 'pieces'] as const;

export function usePieces(): Piece[] {
  const q = useQuery({
    queryKey: PIECES_QUERY_KEY,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PublishedEssay[]> => {
      const { data, error } = await onlyPublished(supabase.from('essays').select('slug, title, section, date, phase')).order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PublishedEssay[];
    },
  });
  return piecesFor(REGISTRY.rooms, q.data ?? []);
}
