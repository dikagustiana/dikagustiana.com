import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { advisorsForMode, CHAIRMAN_PERSONA, DEFAULT_MODEL } from './personas.ts';
import type { AdvisorPersona } from './personas.ts';
import {
  anonymizeResponses,
  buildAdvisorMessages,
  buildChairmanMessages,
  buildPeerReviewMessages,
  frameInput,
  parseChairmanVerdict,
  parsePeerReview,
  validateCouncilRequest,
} from './pipeline.ts';
import type { AdvisorResponse, ChatMessage, PeerReviewVerdict } from './pipeline.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * One call to an OpenAI-compatible chat-completions API; surfaces 429/402 as
 * typed errors. Provider-agnostic: `baseUrl` is the API base (e.g.
 * https://api.openai.com/v1) and `/chat/completions` is appended, so any
 * OpenAI-shaped gateway works by configuration alone. A trailing slash on the
 * base is tolerated.
 */
async function callGateway(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new GatewayError(429, "Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new GatewayError(402, "AI usage limit reached. Please add credits.");
    }
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw new GatewayError(500, `AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new GatewayError(500, 'No content in AI response');
  }
  return content;
}

class GatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization required' }, 401);
    }

    // Provider-agnostic AI gateway config. Both must be set as function secrets.
    // When either is missing, return a structured "not configured" response
    // (503) rather than throwing: the admin UI renders an explicit unconfigured
    // state from this instead of surfacing a raw error.
    const AI_GATEWAY_URL = Deno.env.get('AI_GATEWAY_URL');
    const AI_GATEWAY_API_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
    if (!AI_GATEWAY_URL || !AI_GATEWAY_API_KEY) {
      return jsonResponse({
        error: 'council_not_configured',
        message: 'The Writing Council AI gateway is not configured. Set AI_GATEWAY_URL and AI_GATEWAY_API_KEY in the edge function secrets.',
      }, 503);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // The runtime auto-injects SUPABASE_ANON_KEY (and SUPABASE_PUBLISHABLE_KEYS);
    // fall back to the anon key so this works regardless of key-naming scheme.
    const supabaseKey = (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY'))!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Admin gate — never rely on the frontend guard alone. Query user_roles
    // directly (RLS lets users read their own roles) instead of rpc('has_role'),
    // whose EXECUTE grant for authenticated has been revoked/restored before.
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleError) {
      console.error('Admin role check failed:', roleError);
      throw roleError;
    }
    if (!adminRole) {
      return jsonResponse({ error: 'Admin access required' }, 403);
    }

    const { request, error: validationError } = validateCouncilRequest(await req.json());
    if (!request) {
      return jsonResponse({ error: validationError }, 400);
    }

    const { mode, content, topic, post_id } = request;
    console.log(`Council session started: mode=${mode}, user=${user.id}, post_id=${post_id ?? 'none'}, content_length=${content.length}`);

    const advisors = advisorsForMode(mode);
    const framedInput = frameInput(mode, content, topic);

    // ── Stage 1: five independent advisors in parallel ──
    console.log('Stage 1: querying', advisors.length, 'advisors');
    const advisorResponses: AdvisorResponse[] = await Promise.all(
      advisors.map(async (persona: AdvisorPersona) => {
        const model = persona.model ?? DEFAULT_MODEL;
        const text = await callGateway(AI_GATEWAY_URL, AI_GATEWAY_API_KEY, model, buildAdvisorMessages(persona, framedInput));
        return { advisorId: persona.id, advisorName: persona.name, model, text };
      }),
    );

    // ── Stage 2: anonymize (random letter mapping, kept in the transcript) ──
    const { anonymized, letterToAdvisorId } = anonymizeResponses(advisorResponses);

    // ── Stage 3: five peer reviews in parallel ──
    console.log('Stage 3: peer review');
    const peerReviews: Array<{ reviewerId: string; reviewerName: string; review: PeerReviewVerdict }> =
      await Promise.all(
        advisors.map(async (persona: AdvisorPersona) => {
          const model = persona.model ?? DEFAULT_MODEL;
          const raw = await callGateway(
            AI_GATEWAY_URL,
            AI_GATEWAY_API_KEY,
            model,
            buildPeerReviewMessages(persona, framedInput, anonymized),
          );
          return { reviewerId: persona.id, reviewerName: persona.name, review: parsePeerReview(raw) };
        }),
      );

    // ── Stage 4: chairman synthesis ──
    console.log('Stage 4: chairman synthesis');
    const chairmanRaw = await callGateway(
      AI_GATEWAY_URL,
      AI_GATEWAY_API_KEY,
      CHAIRMAN_PERSONA.model ?? DEFAULT_MODEL,
      buildChairmanMessages(
        CHAIRMAN_PERSONA.systemPrompt,
        framedInput,
        anonymized,
        peerReviews.map(p => p.review),
      ),
    );
    const verdict = parseChairmanVerdict(chairmanRaw);

    // ── Persist the session (RLS: insert allowed for admins only) ──
    const advisorsConfig = advisors.map((p: AdvisorPersona) => ({
      id: p.id,
      name: p.name,
      model: p.model ?? DEFAULT_MODEL,
      systemPrompt: p.systemPrompt,
    }));
    const letterByAdvisorId = Object.fromEntries(
      Object.entries(letterToAdvisorId).map(([letter, advisorId]) => [advisorId, letter]),
    );
    const advisorResponsesRecord = advisorResponses.map(r => ({
      ...r,
      letter: letterByAdvisorId[r.advisorId],
    }));

    const { data: session, error: insertError } = await supabase
      .from('council_sessions')
      .insert({
        post_id: post_id ?? null,
        mode,
        input_snapshot: topic ? `${topic}\n\n${content}` : content,
        advisors_config: advisorsConfig,
        advisor_responses: advisorResponsesRecord,
        peer_reviews: peerReviews,
        verdict,
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      // The transcript still exists in memory — return it, but tell the client
      // persistence failed instead of throwing the whole run away.
      console.error('Failed to persist council session:', insertError);
    } else {
      console.log('Council session persisted:', session.id);
    }

    return jsonResponse({
      session_id: session?.id ?? null,
      created_at: session?.created_at ?? null,
      persisted: !insertError,
      mode,
      advisors: advisorsConfig.map(({ id, name, model }: { id: string; name: string; model: string }) => ({ id, name, model })),
      advisor_responses: advisorResponsesRecord,
      peer_reviews: peerReviews,
      verdict,
    });

  } catch (error) {
    if (error instanceof GatewayError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    console.error('Error running council session:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
