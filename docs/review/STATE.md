# Review state — branch `review/goals-2026-10`

Session log for the goals-based review. The next session reads this and continues; never
redo a finished phase. Deliverables live in this folder (`docs/review/`).

## Current position

- **Phase:** 2 of 13 (Phase 1 committed)
- **Next:** Phase 2 inventory (`01-inventory.md`): routes/pages and reachability, feature
  areas, Supabase schema/policies, edge function, cron, external services, env var names,
  build/CI/deploy config, what a non-main-branch push triggers, and the baseline.

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

## Decisions / notes for the next session

- Prompt text and the owner's goal prose are never copied into the repo; `00-goals.md`
  paraphrases. Do not write personal/applicant info into files.
- Phase 11 fix candidates already queued: `.gitattributes` for line-ending-stable
  checkout (from baseline test failure).
- Share-card PNGs already in repo at `docs/review/share-cards/` + `manifest.json` — use
  as evidence for claim K4 (share-card parity), do not overwrite.
