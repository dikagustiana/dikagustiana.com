import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// Transcript types (mirror supabase/functions/council-review responses)
// ---------------------------------------------------------------------------

export type CouncilMode = 'brainstorm' | 'review';

export interface CouncilAdvisorInfo {
  id: string;
  name: string;
  model: string;
}

export interface CouncilAdvisorResponse {
  advisorId: string;
  advisorName: string;
  model: string;
  letter: string;
  text: string;
}

export interface CouncilPeerReview {
  reviewerId: string;
  reviewerName: string;
  review: {
    strongest: { letter: string; reason: string } | null;
    biggestBlindSpot: { letter: string; reason: string } | null;
    missedByAll: string | null;
    raw?: string;
  };
}

export interface CouncilVerdict {
  consensus: string;
  disagreements: string;
  blindSpots: string;
  recommendation: string;
  firstStep: string;
  raw?: string;
}

export interface CouncilTranscript {
  session_id: string | null;
  created_at: string | null;
  persisted: boolean;
  mode: CouncilMode;
  advisors: CouncilAdvisorInfo[];
  advisor_responses: CouncilAdvisorResponse[];
  peer_reviews: CouncilPeerReview[];
  verdict: CouncilVerdict;
}

export interface CouncilSessionRow {
  id: string;
  post_id: string | null;
  mode: string;
  input_snapshot: string;
  advisors_config: Json;
  advisor_responses: Json;
  peer_reviews: Json;
  verdict: Json;
  created_at: string;
  created_by: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface RunCouncilInput {
  mode: CouncilMode;
  content: string;
  topic?: string;
  post_id?: string;
}

export function useRunCouncil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RunCouncilInput): Promise<CouncilTranscript> => {
      const { data, error } = await supabase.functions.invoke('council-review', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as CouncilTranscript;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['council-sessions'] });
    },
  });
}

/**
 * Council session history. Pass a post id to scope to one essay, a mode to
 * scope to brainstorm/review, or neither for the full timeline.
 */
export function useCouncilSessions(options?: { postId?: string | null; mode?: CouncilMode }) {
  const { postId, mode } = options ?? {};
  return useQuery({
    queryKey: ['council-sessions', postId ?? null, mode ?? null],
    queryFn: async (): Promise<CouncilSessionRow[]> => {
      let query = supabase
        .from('council_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (postId) query = query.eq('post_id', postId);
      if (mode) query = query.eq('mode', mode);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CouncilSessionRow[];
    },
  });
}

/** Convert a stored session row back into the transcript shape the UI renders. */
export function sessionRowToTranscript(row: CouncilSessionRow): CouncilTranscript {
  const advisorsConfig = (row.advisors_config ?? []) as unknown as Array<
    CouncilAdvisorInfo & { systemPrompt?: string }
  >;
  return {
    session_id: row.id,
    created_at: row.created_at,
    persisted: true,
    mode: row.mode === 'brainstorm' ? 'brainstorm' : 'review',
    advisors: advisorsConfig.map(({ id, name, model }) => ({ id, name, model })),
    advisor_responses: (row.advisor_responses ?? []) as unknown as CouncilAdvisorResponse[],
    peer_reviews: (row.peer_reviews ?? []) as unknown as CouncilPeerReview[],
    verdict: (row.verdict ?? {}) as unknown as CouncilVerdict,
  };
}
