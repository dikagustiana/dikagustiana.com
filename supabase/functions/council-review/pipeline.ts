/**
 * Pure council-pipeline helpers: input framing, anonymization, prompt
 * assembly, and safe response parsing.
 *
 * No Deno / network / storage imports here — everything in this file is
 * deterministic given its inputs (randomness is injected), so it can be
 * unit-tested from Vitest (see tests/unit/council.test.ts).
 */

import type { AdvisorPersona } from './personas.ts';

export type CouncilMode = 'brainstorm' | 'review';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface AdvisorResponse {
  advisorId: string;
  advisorName: string;
  model: string;
  text: string;
}

export interface AnonymizedResponse {
  letter: string;
  text: string;
}

export interface AnonymizationResult {
  /** Responses relabelled Response A-E, in letter order. */
  anonymized: AnonymizedResponse[];
  /** letter → advisorId, so transcripts stay reversible. */
  letterToAdvisorId: Record<string, string>;
}

export interface PeerReviewVerdict {
  strongest: { letter: string; reason: string } | null;
  biggestBlindSpot: { letter: string; reason: string } | null;
  missedByAll: string | null;
  /** Raw model output kept when structured parsing failed. */
  raw?: string;
}

export interface ChairmanVerdict {
  consensus: string;
  disagreements: string;
  blindSpots: string;
  recommendation: string;
  firstStep: string;
  /** Raw model output kept when structured parsing failed. */
  raw?: string;
}

export const MAX_CONTENT_LENGTH = 60_000;
export const MAX_TOPIC_LENGTH = 500;

// ---------------------------------------------------------------------------
// Input framing
// ---------------------------------------------------------------------------

/** Frame the raw input once; every advisor receives the same framed input. */
export function frameInput(mode: CouncilMode, content: string, topic?: string): string {
  if (mode === 'brainstorm') {
    return [
      'The author is considering writing an essay and wants the council to evaluate the idea before any drafting starts.',
      '',
      '--- ESSAY IDEA ---',
      content.trim(),
      '--- END ESSAY IDEA ---',
    ].join('\n');
  }

  const topicLine = topic?.trim()
    ? `Working title / topic: ${topic.trim()}\n\n`
    : '';
  return [
    'The author has a full essay draft and wants the council to review it before publishing.',
    '',
    `${topicLine}--- DRAFT ---`,
    content.trim(),
    '--- END DRAFT ---',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Anonymization
// ---------------------------------------------------------------------------

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Shuffle advisor responses into anonymous letters (Response A, B, …) so
 * peer reviewers and the chairman can't develop positional or identity bias.
 * `rng` is injectable for deterministic tests; defaults to Math.random.
 */
export function anonymizeResponses(
  responses: AdvisorResponse[],
  rng: () => number = Math.random,
): AnonymizationResult {
  if (responses.length > LETTERS.length) {
    throw new Error(`Cannot anonymize more than ${LETTERS.length} responses`);
  }

  // Fisher-Yates shuffle of the response order.
  const shuffled = [...responses];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const anonymized: AnonymizedResponse[] = [];
  const letterToAdvisorId: Record<string, string> = {};
  shuffled.forEach((response, index) => {
    const letter = LETTERS[index];
    anonymized.push({ letter, text: response.text });
    letterToAdvisorId[letter] = response.advisorId;
  });

  return { anonymized, letterToAdvisorId };
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

export function buildAdvisorMessages(persona: AdvisorPersona, framedInput: string): ChatMessage[] {
  return [
    { role: 'system', content: persona.systemPrompt },
    { role: 'user', content: framedInput },
  ];
}

function formatAnonymizedResponses(anonymized: AnonymizedResponse[]): string {
  return anonymized
    .map(r => `--- RESPONSE ${r.letter} ---\n${r.text}\n--- END RESPONSE ${r.letter} ---`)
    .join('\n\n');
}

export function buildPeerReviewMessages(
  persona: AdvisorPersona,
  framedInput: string,
  anonymized: AnonymizedResponse[],
): ChatMessage[] {
  const letters = anonymized.map(r => r.letter).join(', ');
  const system = `You are ${persona.name}, one member of a five-person writing council. The council has just produced ${anonymized.length} independent responses to the same input. They are anonymized (Response ${letters}); one of them is yours, but you don't know which label it received. Judge them all on merit alone.

Respond ONLY with valid JSON in this exact structure:
{
  "strongest": { "letter": "A", "reason": "Why this response is the strongest (1-2 sentences)" },
  "biggest_blind_spot": { "letter": "B", "reason": "Why this response has the biggest blind spot (1-2 sentences)" },
  "missed_by_all": "The most important thing that ALL responses missed (1-3 sentences)"
}

Write in English. Be decisive — pick exactly one letter for each field.`;

  const user = `${framedInput}\n\nHere are the council's responses:\n\n${formatAnonymizedResponses(anonymized)}`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function buildChairmanMessages(
  chairmanSystemPrompt: string,
  framedInput: string,
  anonymized: AnonymizedResponse[],
  peerReviews: PeerReviewVerdict[],
): ChatMessage[] {
  const reviewsText = peerReviews
    .map((review, index) => {
      const body = review.raw
        ? review.raw
        : [
            review.strongest ? `Strongest: Response ${review.strongest.letter} — ${review.strongest.reason}` : null,
            review.biggestBlindSpot
              ? `Biggest blind spot: Response ${review.biggestBlindSpot.letter} — ${review.biggestBlindSpot.reason}`
              : null,
            review.missedByAll ? `Missed by all: ${review.missedByAll}` : null,
          ]
            .filter(Boolean)
            .join('\n');
      return `--- PEER REVIEW ${index + 1} ---\n${body}\n--- END PEER REVIEW ${index + 1} ---`;
    })
    .join('\n\n');

  const user = [
    framedInput,
    '',
    'ADVISOR RESPONSES:',
    '',
    formatAnonymizedResponses(anonymized),
    '',
    'PEER REVIEWS:',
    '',
    reviewsText,
  ].join('\n');

  return [
    { role: 'system', content: chairmanSystemPrompt },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Safe response parsing
// ---------------------------------------------------------------------------

/**
 * Parse a model reply that should be a JSON object, tolerating markdown code
 * fences and surrounding prose. Returns null when nothing parseable is found.
 */
export function parseJsonObject(content: string): Record<string, unknown> | null {
  if (!content || !content.trim()) return null;

  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Fall back to the outermost braces if the reply wraps JSON in prose.
  if (!jsonStr.startsWith('{')) {
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    jsonStr = jsonStr.slice(start, end + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function asLetterVerdict(value: unknown): { letter: string; reason: string } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.letter !== 'string' || !record.letter.trim()) return null;
  return {
    letter: record.letter.trim().toUpperCase().slice(0, 1),
    reason: typeof record.reason === 'string' ? record.reason : '',
  };
}

/** Parse a peer-review reply; falls back to keeping the raw text. */
export function parsePeerReview(content: string): PeerReviewVerdict {
  const parsed = parseJsonObject(content);
  if (!parsed) {
    return { strongest: null, biggestBlindSpot: null, missedByAll: null, raw: content };
  }
  return {
    strongest: asLetterVerdict(parsed.strongest),
    biggestBlindSpot: asLetterVerdict(parsed.biggest_blind_spot ?? parsed.biggestBlindSpot),
    missedByAll:
      typeof parsed.missed_by_all === 'string'
        ? parsed.missed_by_all
        : typeof parsed.missedByAll === 'string'
          ? (parsed.missedByAll as string)
          : null,
  };
}

/** Parse the chairman reply; falls back to putting everything in `raw`. */
export function parseChairmanVerdict(content: string): ChairmanVerdict {
  const parsed = parseJsonObject(content);
  const str = (value: unknown): string => (typeof value === 'string' ? value : '');
  if (!parsed) {
    return {
      consensus: '',
      disagreements: '',
      blindSpots: '',
      recommendation: '',
      firstStep: '',
      raw: content,
    };
  }
  return {
    consensus: str(parsed.consensus),
    disagreements: str(parsed.disagreements),
    blindSpots: str(parsed.blind_spots ?? parsed.blindSpots),
    recommendation: str(parsed.recommendation),
    firstStep: str(parsed.first_step ?? parsed.firstStep),
  };
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export interface CouncilRequest {
  mode: CouncilMode;
  content: string;
  topic?: string;
  post_id?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate the request body; returns an error message or the typed request. */
export function validateCouncilRequest(body: unknown): { request?: CouncilRequest; error?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }
  const record = body as Record<string, unknown>;

  if (record.mode !== 'brainstorm' && record.mode !== 'review') {
    return { error: "mode must be 'brainstorm' or 'review'" };
  }
  if (typeof record.content !== 'string' || !record.content.trim()) {
    return { error: 'content is required' };
  }
  if (record.content.length > MAX_CONTENT_LENGTH) {
    return { error: `content exceeds ${MAX_CONTENT_LENGTH} characters` };
  }
  if (record.topic !== undefined && (typeof record.topic !== 'string' || record.topic.length > MAX_TOPIC_LENGTH)) {
    return { error: `topic must be a string of at most ${MAX_TOPIC_LENGTH} characters` };
  }
  if (record.post_id !== undefined && (typeof record.post_id !== 'string' || !UUID_PATTERN.test(record.post_id))) {
    return { error: 'post_id must be a UUID' };
  }

  return {
    request: {
      mode: record.mode,
      content: record.content,
      topic: record.topic as string | undefined,
      post_id: record.post_id as string | undefined,
    },
  };
}
