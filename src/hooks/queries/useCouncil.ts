import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Thrown when the council edge function reports its AI gateway is unconfigured
 * (503 `council_not_configured`). The panel renders an explicit setup state for
 * this rather than a generic failure alert.
 */
export class CouncilNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message || 'The Writing Council is not configured.');
    this.name = 'CouncilNotConfiguredError';
  }
}

/** Read the JSON body out of a supabase-js FunctionsHttpError (best-effort). */
async function readFunctionErrorBody(
  error: unknown,
): Promise<{ error?: string; message?: string } | null> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try { return await ctx.clone().json(); } catch { return null; }
  }
  if (ctx && typeof ctx === 'object' && 'error' in (ctx as object)) {
    return ctx as { error?: string; message?: string };
  }
  return null;
}

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
      // A non-2xx status (e.g. the 503 "not configured" response) arrives as a
      // FunctionsHttpError whose body must be read from error.context. Parse it
      // so the "council_not_configured" signal survives to the UI instead of
      // collapsing into a generic "non-2xx status code" message.
      if (error) {
        const body = await readFunctionErrorBody(error);
        if (body?.error === 'council_not_configured') {
          throw new CouncilNotConfiguredError(body.message);
        }
        throw new Error(body?.message || body?.error || error.message);
      }
      if (data?.error) {
        if (data.error === 'council_not_configured') {
          throw new CouncilNotConfiguredError(data.message);
        }
        throw new Error(data.message || data.error);
      }
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
