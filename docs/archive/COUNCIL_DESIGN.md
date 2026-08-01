# Writing Council — archived design

**Status: removed from the codebase 2026-08-01.** This document exists so the system can be
rebuilt from a design rather than from memory. No code from it remains; the
`council-review` edge function, the `/admin/council` route, and the `council_sessions`
table were all deleted in the same session.

## Why it was removed

All six seats (five advisors plus the chairman) resolved to a single model,
`google/gemini-2.5-flash`, because no persona set a `model` override and every one fell
through to `DEFAULT_MODEL`. The anonymised peer-review stage was therefore **one model
reviewing its own five outputs under six different letters**. The mechanism assumed
independent judgment between seats and did not have it, so the peer-review and chairman
stages were measuring style variance from prompt differences, not disagreement between
distinct reasoners.

That is a configuration failure, not a design failure — the architecture below explicitly
supported per-seat models and was never given them. Anyone rebuilding this should treat
**genuine model diversity across seats as the precondition**, not an optimisation. A
single-model council is an expensive way to sample one model six times.

`council_sessions` held zero rows at deletion, so nothing was lost.

---

## Pipeline: four stages

Input is framed once and reused by every stage, so all seats judge identical text.

```
                    ┌──────────────────────────────────────────┐
   raw input ──►    │ Stage 0: frameInput(mode, content, topic)│
                    └──────────────────┬───────────────────────┘
                                       │  framedInput (one string, reused everywhere)
                    ┌──────────────────▼───────────────────────┐
                    │ Stage 1: N advisors, PARALLEL            │
                    │   persona.systemPrompt + framedInput     │
                    └──────────────────┬───────────────────────┘
                                       │  AdvisorResponse[]
                    ┌──────────────────▼───────────────────────┐
                    │ Stage 2: anonymise (Fisher-Yates)        │
                    │   → Response A..E + letter→advisorId map │
                    └──────────────────┬───────────────────────┘
                                       │  AnonymizedResponse[]
                    ┌──────────────────▼───────────────────────┐
                    │ Stage 3: N peer reviews, PARALLEL        │
                    │   each advisor judges ALL anonymised     │
                    └──────────────────┬───────────────────────┘
                                       │  PeerReviewVerdict[]
                    ┌──────────────────▼───────────────────────┐
                    │ Stage 4: chairman synthesis (single)     │
                    │   framed + responses + reviews → verdict │
                    └──────────────────────────────────────────┘
```

### Stage 0 — input framing

`frameInput(mode, content, topic)` produced one string, wrapped in explicit delimiters so
the model could tell instruction from payload:

- **brainstorm**: "The author is considering writing an essay and wants the council to
  evaluate the idea before any drafting starts." then `--- ESSAY IDEA ---` … `--- END ESSAY IDEA ---`.
- **review**: "The author has a full essay draft and wants the council to review it before
  publishing." with an optional `Working title / topic: …` line, then `--- DRAFT ---` … `--- END DRAFT ---`.

Framing once (rather than per-advisor) is deliberate: it guarantees every seat sees byte-identical
input, so response differences are attributable to the persona alone.

### Stage 1 — independent advisors, in parallel

`Promise.all` over the mode's advisor list. Each call:

```
messages = [
  { role: 'system', content: persona.systemPrompt },
  { role: 'user',   content: framedInput },
]
model = persona.model ?? DEFAULT_MODEL
```

Produces `AdvisorResponse { advisorId, advisorName, model, text }`.

Note the failure mode: `Promise.all` rejects on the first failing advisor, discarding the
whole run. A rebuild should use `allSettled` and proceed with a quorum.

### Stage 2 — anonymisation

`anonymizeResponses(responses, rng = Math.random)`:

- Fisher-Yates shuffle of response order, then relabel `A, B, C, …` (supported up to 8).
- Returns `{ anonymized: [{letter, text}], letterToAdvisorId: {A: 'voice-tone', …} }`.
- **The mapping is retained** and written into the transcript, so the UI can de-anonymise
  after the fact while the models never see identities. Reversible for the reader, opaque
  to the reviewer.
- `rng` is injected so tests can pin the shuffle deterministically.

Purpose: strip positional and identity bias. A reviewer must not know which response is its
own, nor which seat produced any other.

### Stage 3 — anonymised peer review, in parallel

Every advisor reviews **all** anonymised responses, including (unknowingly) its own. The
system prompt states this explicitly: "one of them is yours, but you don't know which label
it received. Judge them all on merit alone."

Required reply shape:

```json
{
  "strongest":          { "letter": "A", "reason": "1-2 sentences" },
  "biggest_blind_spot": { "letter": "B", "reason": "1-2 sentences" },
  "missed_by_all":      "1-3 sentences"
}
```

`missed_by_all` is the load-bearing field — it is the only place the council can surface a
gap common to every seat, which is exactly what a panel of similar models tends to have.

### Stage 4 — chairman synthesis

One call receiving the framed input, all anonymised responses, and all peer reviews. The
chairman is explicitly **not a summariser**: "you are the tie-breaker. Where advisors
disagree, take a side and say why. Never answer 'it depends'."

Required reply shape:

```json
{
  "consensus":      "Where the council agrees (2-4 sentences)",
  "disagreements":  "Where it disagrees, and your ruling on each (2-4 sentences)",
  "blind_spots":    "What the peer reviews caught that individuals missed (1-3 sentences)",
  "recommendation": "Decisive recommendation (2-4 sentences, no hedging)",
  "first_step":     "The single concrete next step (1 sentence)"
}
```

---

## Persona schema

```ts
interface AdvisorPersona {
  id: string;           // stable identifier stored in transcripts
  name: string;         // display name
  systemPrompt: string; // full system prompt
  model?: string;       // per-seat override; defaults to DEFAULT_MODEL
}
```

Personas lived in exactly one file, separate from orchestration, so seats could be edited
without touching the pipeline. `advisorsForMode(mode)` selected the roster.

A shared rules block was appended to every advisor prompt: stay in your assigned
perspective, 150–300 words, no preamble, be specific, quote concrete parts, **never hedge
with "it depends"**, write in English.

### Review roster (for an existing draft)

| id | name | single question it owns |
|---|---|---|
| `voice-tone` | Voice & Tone Checker | Does this sound like the author at their best? Target: personal, flowing, opinionated — Noah Smith / Noahpinion register. Flag Wikipedia-summary prose and buried positions; rewrite one or two sentences to demonstrate. |
| `analytical-rigor` | Analytical Rigor Checker | Do the finance / economics / green-transition claims hold up? Audit claims, numbers, causal steps. Rank the three weakest and state what evidence fixes each. |
| `outsider` | The Outsider | Reads as an intelligent non-specialist. Flags jargon, acronyms, and the exact point they would stop reading. |
| `structure-flow` | Structure & Flow Editor | Does the piece move? Hook, argument order, transitions, ending. Proposes one concrete structural change. |
| `contrarian` | The Contrarian | Attacks the argument as its smartest critic. Steelmans the strongest ignored counter-argument, then says whether the draft survives it. |

### Brainstorm roster (for an idea, pre-draft)

| id | name | single question it owns |
|---|---|---|
| `contrarian` | The Contrarian | Why this topic may not be worth writing: stale, over-covered, undifferentiable. Names who already wrote it. |
| `first-principles` | The First Principles Thinker | What actual question would this answer, and for whom? Untangles multiple questions into the one that is the essay. |
| `expansionist` | The Expansionist | The bigger angle: what larger trend is this an instance of? Offers 2–3 expanded angles and bets on one. |
| `outsider` | The Outsider | Would a general reader click, and finish? What hook would make them forward it. |
| `executor` | The Executor | Makes it real: working title, 3–5 beat outline, core claim, data needed, length, and the first step to take today. |

The chairman was a sixth persona with the same shape and no override.

---

## Response-parsing contract

Models do not reliably return bare JSON, so parsing was defensive and **never threw**.

`parseJsonObject(content)`:
1. Strip a markdown fence if present — matches ```` ```json … ``` ```` or a bare fence.
2. If the result still does not start with `{`, take the substring between the first `{`
   and the last `}` (handles JSON wrapped in prose).
3. `JSON.parse`, and accept only a non-array object.
4. Return `null` on any failure.

Both parsers **degrade instead of failing**: on `null` they return an empty structured
verdict with the raw model text preserved in a `raw` field, and the UI renders `raw` as
prose when the structured fields are absent. A malformed reply costs formatting, never the
content.

Both parsers also accepted snake_case and camelCase key spellings (`biggest_blind_spot` /
`biggestBlindSpot`, `missed_by_all` / `missedByAll`, `blind_spots` / `blindSpots`,
`first_step` / `firstStep`), because models drift between the two. Letters were normalised
to a single uppercase character.

## Input validation

Rejected before any model call:

- `mode` must be exactly `brainstorm` or `review`
- `content` required, non-empty, ≤ 60,000 characters (`MAX_CONTENT_LENGTH`)
- `topic` optional, ≤ 500 characters (`MAX_TOPIC_LENGTH`)
- `post_id` optional, must match a UUID pattern

## Transport and authorisation

- Deployed as a Supabase edge function with `verify_jwt = true`.
- Additionally re-checked admin server-side by querying `user_roles` directly rather than
  via `rpc('has_role')` — that function's EXECUTE grant for `authenticated` had been
  revoked and restored before, so the direct query was the more stable gate. **Keep this
  property in any rebuild: never trust the frontend guard alone.**
- Gateway calls used the OpenAI chat-completions shape (`POST {baseUrl}/chat/completions`,
  `{model, messages}`, reply at `choices[0].message.content`), so any OpenAI-compatible
  provider worked by configuration. 429 and 402 were surfaced as typed errors
  (rate-limited / out of credits) rather than generic 500s.

## Persistence

One row per run in `council_sessions`: `post_id`, `mode`, `input_snapshot` (topic + content),
`advisors_config` (id, name, model, systemPrompt — the full config as run, so a transcript
stays interpretable after prompts change), `advisor_responses` (each with its assigned
letter), `peer_reviews`, `verdict`.

A failed insert was logged but **not** thrown: the transcript already existed in memory, so
the response returned it with `persisted: false` and the UI warned "Not saved. Copy anything
you need." Losing the archive was never allowed to also lose the run.

## If rebuilding

1. **Give the seats different models.** Without that the peer-review stage is theatre. This
   is the one change that decides whether the rebuild is worth doing.
2. Use `Promise.allSettled` in stages 1 and 3 and proceed on a quorum; one failing seat
   should not discard a completed run.
3. Keep: framing once, anonymisation with a retained reversible mapping, the never-throw
   parsers with `raw` fallback, `missed_by_all`, the "never hedge" instruction, the
   server-side admin re-check, and returning an unpersisted transcript rather than an error.
4. Consider whether the chairman should be a distinct model from every advisor seat.
