import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  frameInput,
  anonymizeResponses,
  buildAdvisorMessages,
  buildPeerReviewMessages,
  buildChairmanMessages,
  parseJsonObject,
  parsePeerReview,
  parseChairmanVerdict,
  validateCouncilRequest,
  type AdvisorResponse,
} from '../../supabase/functions/council-review/pipeline.ts';
import {
  REVIEW_ADVISORS,
  BRAINSTORM_ADVISORS,
  CHAIRMAN_PERSONA,
  advisorsForMode,
} from '../../supabase/functions/council-review/personas.ts';

const responses: AdvisorResponse[] = [
  { advisorId: 'a1', advisorName: 'One', model: 'm', text: 'text-1' },
  { advisorId: 'a2', advisorName: 'Two', model: 'm', text: 'text-2' },
  { advisorId: 'a3', advisorName: 'Three', model: 'm', text: 'text-3' },
  { advisorId: 'a4', advisorName: 'Four', model: 'm', text: 'text-4' },
  { advisorId: 'a5', advisorName: 'Five', model: 'm', text: 'text-5' },
];

describe('frameInput', () => {
  it('frames brainstorm input with idea markers', () => {
    const framed = frameInput('brainstorm', '  my rough idea  ');
    expect(framed).toContain('--- ESSAY IDEA ---');
    expect(framed).toContain('my rough idea');
    expect(framed).not.toContain('--- DRAFT ---');
  });

  it('frames review input with draft markers and optional topic', () => {
    const framed = frameInput('review', 'the draft body', 'Working Title');
    expect(framed).toContain('--- DRAFT ---');
    expect(framed).toContain('the draft body');
    expect(framed).toContain('Working title / topic: Working Title');
  });

  it('omits the topic line when no topic is given', () => {
    expect(frameInput('review', 'body')).not.toContain('Working title');
  });
});

describe('anonymizeResponses', () => {
  it('assigns each response a unique letter A-E', () => {
    const { anonymized } = anonymizeResponses(responses);
    expect(anonymized.map(r => r.letter).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('is reversible: every letter maps back to the advisor that wrote it', () => {
    const { anonymized, letterToAdvisorId } = anonymizeResponses(responses);
    for (const anon of anonymized) {
      const advisorId = letterToAdvisorId[anon.letter];
      const original = responses.find(r => r.advisorId === advisorId);
      expect(original?.text).toBe(anon.text);
    }
    expect(Object.keys(letterToAdvisorId)).toHaveLength(5);
    expect(new Set(Object.values(letterToAdvisorId)).size).toBe(5);
  });

  it('shuffles with the injected rng (mapping actually varies)', () => {
    // rng always 0 → deterministic rotation; rng always 0.99 → identity order.
    const a = anonymizeResponses(responses, () => 0);
    const b = anonymizeResponses(responses, () => 0.999);
    expect(a.letterToAdvisorId).not.toEqual(b.letterToAdvisorId);
  });

  it('rejects more responses than available letters', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      advisorId: `a${i}`,
      advisorName: `A${i}`,
      model: 'm',
      text: 't',
    }));
    expect(() => anonymizeResponses(many)).toThrow();
  });
});

describe('prompt assembly', () => {
  it('advisor messages carry the persona system prompt and framed input', () => {
    const persona = REVIEW_ADVISORS[0];
    const messages = buildAdvisorMessages(persona, 'FRAMED');
    expect(messages[0]).toEqual({ role: 'system', content: persona.systemPrompt });
    expect(messages[1].content).toBe('FRAMED');
  });

  it('peer-review messages include all anonymized responses and demand JSON', () => {
    const { anonymized } = anonymizeResponses(responses, () => 0.5);
    const messages = buildPeerReviewMessages(REVIEW_ADVISORS[1], 'FRAMED', anonymized);
    for (const anon of anonymized) {
      expect(messages[1].content).toContain(`--- RESPONSE ${anon.letter} ---`);
    }
    expect(messages[0].content).toContain('valid JSON');
  });

  it('chairman messages include responses and peer reviews', () => {
    const { anonymized } = anonymizeResponses(responses, () => 0.5);
    const messages = buildChairmanMessages(
      CHAIRMAN_PERSONA.systemPrompt,
      'FRAMED',
      anonymized,
      [
        {
          strongest: { letter: 'A', reason: 'clear' },
          biggestBlindSpot: { letter: 'B', reason: 'vague' },
          missedByAll: 'audience',
        },
        { strongest: null, biggestBlindSpot: null, missedByAll: null, raw: 'unstructured review' },
      ],
    );
    expect(messages[1].content).toContain('ADVISOR RESPONSES:');
    expect(messages[1].content).toContain('Strongest: Response A — clear');
    expect(messages[1].content).toContain('unstructured review');
  });
});

describe('parseJsonObject', () => {
  it('parses plain JSON', () => {
    expect(parseJsonObject('{"a": 1}')).toEqual({ a: 1 });
  });
  it('parses fenced JSON', () => {
    expect(parseJsonObject('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it('parses JSON embedded in prose', () => {
    expect(parseJsonObject('Sure! Here it is: {"a": 1} — hope that helps')).toEqual({ a: 1 });
  });
  it('returns null for garbage, arrays, and empty input', () => {
    expect(parseJsonObject('not json at all')).toBeNull();
    expect(parseJsonObject('[1,2]')).toBeNull();
    expect(parseJsonObject('')).toBeNull();
  });
});

describe('parsePeerReview', () => {
  it('parses a structured review', () => {
    const parsed = parsePeerReview(
      JSON.stringify({
        strongest: { letter: 'c', reason: 'rigorous' },
        biggest_blind_spot: { letter: 'E', reason: 'ignores audience' },
        missed_by_all: 'the cost argument',
      }),
    );
    expect(parsed.strongest).toEqual({ letter: 'C', reason: 'rigorous' });
    expect(parsed.biggestBlindSpot?.letter).toBe('E');
    expect(parsed.missedByAll).toBe('the cost argument');
    expect(parsed.raw).toBeUndefined();
  });

  it('keeps the raw text when parsing fails', () => {
    const parsed = parsePeerReview('I think Response A was best because…');
    expect(parsed.raw).toContain('Response A');
    expect(parsed.strongest).toBeNull();
  });
});

describe('parseChairmanVerdict', () => {
  it('parses a structured verdict', () => {
    const verdict = parseChairmanVerdict(
      JSON.stringify({
        consensus: 'agree',
        disagreements: 'disagree',
        blind_spots: 'spots',
        recommendation: 'do it',
        first_step: 'write the outline',
      }),
    );
    expect(verdict.consensus).toBe('agree');
    expect(verdict.blindSpots).toBe('spots');
    expect(verdict.firstStep).toBe('write the outline');
    expect(verdict.raw).toBeUndefined();
  });

  it('falls back to raw text when unparseable', () => {
    const verdict = parseChairmanVerdict('The council believes…');
    expect(verdict.raw).toBe('The council believes…');
    expect(verdict.recommendation).toBe('');
  });
});

describe('validateCouncilRequest', () => {
  it('accepts a valid review request', () => {
    const { request, error } = validateCouncilRequest({
      mode: 'review',
      content: 'draft',
      topic: 'title',
      post_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(error).toBeUndefined();
    expect(request?.mode).toBe('review');
  });

  it('rejects bad mode, empty content, oversized content, and bad post_id', () => {
    expect(validateCouncilRequest({ mode: 'chat', content: 'x' }).error).toBeTruthy();
    expect(validateCouncilRequest({ mode: 'review', content: '   ' }).error).toBeTruthy();
    expect(
      validateCouncilRequest({ mode: 'review', content: 'x'.repeat(60_001) }).error,
    ).toBeTruthy();
    expect(
      validateCouncilRequest({ mode: 'review', content: 'x', post_id: 'not-a-uuid' }).error,
    ).toBeTruthy();
    expect(validateCouncilRequest(null).error).toBeTruthy();
  });
});

describe('persona config', () => {
  it('each mode has exactly 5 advisors with unique ids', () => {
    for (const advisors of [REVIEW_ADVISORS, BRAINSTORM_ADVISORS]) {
      expect(advisors).toHaveLength(5);
      expect(new Set(advisors.map(a => a.id)).size).toBe(5);
      for (const advisor of advisors) {
        expect(advisor.name.trim()).toBeTruthy();
        expect(advisor.systemPrompt.length).toBeGreaterThan(100);
      }
    }
  });

  it('advisorsForMode selects the right set', () => {
    expect(advisorsForMode('brainstorm')).toBe(BRAINSTORM_ADVISORS);
    expect(advisorsForMode('review')).toBe(REVIEW_ADVISORS);
  });
});

describe('council_sessions migration (permission guardrail)', () => {
  const sql = readFileSync(
    join(__dirname, '../../supabase/migrations/20260704080000_create_council_sessions.sql'),
    'utf-8',
  );

  it('enables RLS on the table', () => {
    expect(sql).toMatch(/ALTER TABLE public\.council_sessions ENABLE ROW LEVEL SECURITY/i);
  });

  it('gates every policy on has_role admin and never uses USING (true)', () => {
    const policies = sql.match(/CREATE POLICY[\s\S]*?;/gi) ?? [];
    expect(policies.length).toBeGreaterThanOrEqual(4);
    for (const policy of policies) {
      expect(policy).toMatch(/has_role\(auth\.uid\(\), 'admin'\)/);
    }
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });
});
