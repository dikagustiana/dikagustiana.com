# Review state — branch `review/goals-2026-10`

Session log for the goals-based review. The next session reads this and continues; never
redo a finished phase. Deliverables live in this folder (`docs/review/`).

## Current position

- **Phase:** 6 of 13 (Phases 1–5 committed)
- **Next:** Phase 6 goal-fit review (`05-goal-fit.md`): page-by-page against the Phase 1 checks (live content checks blocked by the blank-page P0; local build + e2e stand in).

## Baseline snapshot (recorded 2026-10-05, main @ cf22d64, Windows checkout)

- `npm run build`: PASS — vite build 11.48s; `assert-no-synthetic` PASS; `prerender`
  SKIPPED by design when `VITE_SUPABASE_PUBLISHABLE_KEY` is absent outside Vercel.
  Chunk warning: `editor` chunk 871.67 kB (gzip 270.05 kB) — only finding from build.
- `npm run typecheck`: PASS (clean).
- `npm run lint`: PASS with 25 warnings, 0 errors (mostly `no-explicit-any`, two
  `exhaustive-deps` in GreenTransitionEssayPage/NextBigThingEssayPage, one
  react-refresh in NotFound).
- `npm run test:unit`: 916/917 PASS. One failure: `tests/unit/shareCard.test.ts:215`
  expects sha256 of `scripts/og-fonts/OFL.txt` = `995c7199…`; working-tree file hashes
  `05831cfb…` because this Windows checkout has `core.autocrlf=true` and the repo has no
  `.gitattributes` (`git ls-files --eol` shows `i/lf w/crlf`). With CRLF stripped the
  hash matches the pinned value exactly — checkout artifact, not a repo defect on main.
  Candidate fix (Phase 11): add `.gitattributes` pinning eol.
- Live performance + bundle totals: to be measured in Phase 2.

## Done

- [x] Branch `review/goals-2026-10` cut from main @ cf22d64.
- [x] `npm install` clean.
- [x] Phase 1 — `00-goals.md` (checks G1.1–G6.5, guardrails FD1–FD4, claims K1–K6).
- [x] Phase 2 — `01-inventory.md`. Headline live-site facts: (a) production deployment is
  ~2 months stale (pre-Aug-2 index.html, no capital-allocation/FIA v3 in bundle; CI green
  ⇒ break is GitHub→Vercel; owner-only); (b) apex domain 308-redirects to the raw
  vercel.app URL while www serves 200 (owner-only); (c) K1 CONFIRMED — backup secrets
  empty in Actions, daily failures logged; (d) K2 CONFIRMED (dead file); (e) non-main
  branch push triggers no CI/migrations/function deploys (Vercel previews undeterminable
  from repo) ⇒ Phase 10/13 pushes may go ahead.

## Decisions / notes for the next session

- Prompt text and the owner's goal prose are never copied into the repo; `00-goals.md`
  paraphrases. Do not write personal/applicant info into files.
- Phase 11 fix candidates already queued: `.gitattributes` for line-ending-stable
  checkout (from baseline test failure).
- gh CLI is authenticated as the owner; used READ-ONLY (run logs/list). Never create
  PRs/issues/releases/tags. The GitHub repo is private (anonymous API 404s).
- Do NOT touch Supabase/Vercel/DNS. The two P0s (stale deploy, apex redirect) are
  owner-only dashboard/DNS decisions — document, never "fix".
- `gh` evidence for K1: run 37242617434 log shows both secrets resolve empty + FATAL line.
