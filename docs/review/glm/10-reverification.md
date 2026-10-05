# Phase 12 — Reverification on the fixed branch

Everything re-run after the 15 work orders (`8adddf9`…`b62ebdc` + the Phase 12 fix
`3ec6cce`). Method as in Phases 3–4: unit/e2e against mocked Supabase only; browser on a
local production build; no production system touched. "Start" numbers are the Phase 2
baseline; "End" is this phase.

## 1. Gates, before and after

| Check | Start (main @ cf22d64) | End (this branch) |
|---|---|---|
| `npm run build` | PASS, 11.5 s, `editor` chunk 871.7 kB warning | PASS, ~5–6 s, `assert-no-synthetic` PASS; prerender skips by design (no key in this environment). Top chunks: `editor` 854 kB (unchanged class), `react-vendor` 184, `supabase` 167, entry 132, `WriterEditorPage` 117, `ChainPlate` 112; dist total 4,379 kB |
| `npm run typecheck` | PASS | PASS (proves the WO-06 removals broke no importer) |
| `npm run lint` | 25 warnings, CI ceiling 35 | **22 warnings, ceiling ratcheted to 22** (`f0a006a`) |
| `npm run test:unit` | 916/917 (1 failure: OFL hash on CRLF checkout) | **934/934 incl. the OFL test** — 15 new test files/cases added (autosave writes 21, canonicalPath parity 10, chainLink 2, dumpAssess 6, auth failure path 2, recovery recency 2, WO-04 race 1); 3 dead test files removed; `assert-test-count` guard: 934 ≥ 913, ok |
| `npm run test:e2e` | could not start on Windows (POSIX webServer) | **72/72 PASS on Windows AND wired into CI** (`1475005`) |
| Unit-suite flake | capitalInMotion timing tests flake under local parallel load | **Unchanged, and proven pre-existing**: a clean `cf22d64` worktree (junctioned `node_modules`) flaked 2/1/3 failures across three full runs — not introduced by this branch. CI (ubuntu, 2 workers) has been green on main |

## 2. Function audit — verdicts re-checked

| Verdict | Start (Phase 3) | End | What moved |
|---|---|---|---|
| works | 87 | 93 | recovery offer (recency rule), same-tab save coordination, error-message extraction, canonicalPath (extracted + parity-tested), admin stats + audit-log filter, footer link, related-essays dedupe |
| broken | 0 | 0 | — |
| dead | 24 | 7 (deliberate keeps) | WO-06 removed 24 units incl. the hard-delete mutation `useDeleteEssay`; the keeps are test-only exports their tests use (`hasBrief`, `countFigures`, `validateImages`, `PUBLISHED_COLUMN`, `PRESENTATION_COLUMNS`, `tiptapJsonToMarkdown`, `extractFiguresFromJson`) and `RelatedContent` — which WO-10 initially deleted and **typecheck proved still consumed by `CriticalThinkingEssay.tsx`**, so it was restored in the same commit |
| risky | 5 | 0 | every Phase 3 risky item (recovery recency, save race, silent stats, 500-row client filter, canonical mirror) is now fixed and covered by a test |
| unclear | 0 | 0 | — |

Tests written for previously untested criticals: the autosave/backup write path (Phase 3),
the WO-04 flush race, the recovery recency rule, the dump trust floors, the auth failure
path. Residual untested: a full component-level publish click-through (the write layer
under it is tested at hook level; documented in `09-plan.md` as dropped scope).

## 3. Feature checks — statuses re-verified

| Feature | Phase 4 | End |
|---|---|---|
| Header navigation + 4×3 font-size integrity | PASS | PASS (e2e 72/72 re-run) |
| Footer links | PASS with `/finance-101` blemish | **PASS** — browser: footer Finance href is now `/finance` |
| Section indexes render | PASS (render) | **PASS + error states**: browser on a dead DB shows "Couldn't load this track … a temporary failure, not an empty track" with Try again, inside the page layout |
| Finance landing / syllabus honesty copy | PASS | unchanged |
| Essays + stubs (Planned rows) | PASS by construction | unchanged (stubs remain non-clickable by contract; FD3 respected) |
| Chain map + controls + link contract | PASS | unchanged (FD2: no map code touched) |
| Essay → chain link | absent (G3.2 gap) | **NEW** for chain-pinned modules: `chainLinkForModule` + shell link, unit-tested; unpinned essays render nothing (honest absence). Verified: no link renders on the local build (no mapped-module data in the dead DB) — expected |
| Related-essays rail on essay pages | believed absent | **CORRECTION — was already wired on every essay page** (both shells render `RelatedEssays` from `currentEssayId`+`section`, passed by all five essay pages). Phase 6/7's "no related reading" claim is retracted; the dead duplicate hook was removed instead |
| Search | ABSENT | unchanged (owner decision, R10) |
| Share cards / sitemap / RSS on live site | BLOCKED-LIVE (stale deploy) | unchanged by this branch — still blocked on the owner's redeploy (R1); code-side pipeline verified and now parity-tested |
| 404 | PASS | unchanged |
| Writer Studio save/publish paths | PASS (code) | **PASS + hardened**: backup-first ordering, guarded writes and loud failures are pinned by tests; recovery no longer offers stale backups; a manual save can no longer misreport its own tab as "another tab" |
| Auth/admin gating | PASS | PASS + failure path pinned by test (bounce + uncached retry) |
| Backup pipeline | daily failures (owner-side secrets) | code side: trust floors extracted and tested (`dumpAssess`); the secrets themselves remain the owner's action (R3) |

## 4. Phase 1 checks — start vs end

Verdicts use PASS-LOCAL (verified on the local production build / in code+tests) and
FAIL-LIVE/BLOCKED-LIVE where only the repaired production deployment can decide.

| Check | Start | End | Note |
|---|---|---|---|
| G1.1 mechanisms not labels [judge] | BLOCKED-LIVE | BLOCKED-LIVE | essay content is DB-only; re-verify after R1 |
| G1.2 citations + register | BLOCKED-LIVE | BLOCKED-LIVE | — |
| G1.3 professional reading surface | PASS-LOCAL | PASS-LOCAL | unchanged |
| G1.4 no broken/placeholder surfaces | FAIL-LIVE (blank site) | FAIL-LIVE | unchanged by the branch — this IS R1 |
| G2.1 thesis in 10 s | PASS-LOCAL / FAIL-LIVE | PASS-LOCAL / FAIL-LIVE | local homepage H1 verified again this phase |
| G2.2 ten-minute path | PASS-LOCAL (structural) | PASS-LOCAL (structural) | search still absent (R10, owner) |
| G2.3 about states method | PASS-LOCAL | PASS-LOCAL | unchanged |
| G2.4 no dead ends | FAIL-LIVE | FAIL-LIVE | R1/R2 |
| G3.1 chain ≤2 clicks from home + section indexes | PASS | PASS | header path holds on every page |
| G3.2 related stage ≤2 clicks from any essay | **FAIL** | **PARTIAL PASS** | stage-deep link exists for chain-pinned modules (`9b0e21e`); full coverage needs owner data rows in `chainCurriculumMap.ts` (data-only) |
| G3.3 swimlanes + the line | PASS | PASS | FD2 respected — map untouched |
| G3.4 sections name their distance | PARTIAL [judge] | PARTIAL [judge] | owner wording (R23) |
| G4.1 six parts + 21 conditions in 6 layers with decision rules | PASS | PASS | static framework untouched |
| G4.2 stubs read as planned, never broken | PASS by construction | **PASS + hardened** | with a dead DB the pages now SAY the fetch failed instead of looking empty (WO-08) |
| G4.3 stubs stay visible | PASS | PASS | FD3 respected |
| G4.4 landing shows the whole shape | PASS-LOCAL | PASS-LOCAL | — |
| G5.1 Verification Register per essay | BLOCKED-LIVE | BLOCKED-LIVE | no tooling support (R18, owner) |
| G5.2 structure (hook/findings/boundaries/close) | BLOCKED-LIVE | BLOCKED-LIVE | e2e journey still pins boundaries on the reader surface |
| G5.3 British English | BLOCKED-LIVE | BLOCKED-LIVE | site chrome dialect mix unchanged (content, constraint 3) |
| G5.4 homepage H1 own thesis | PASS-LOCAL | PASS-LOCAL | — |
| G5.5 no unverifiable quotes | BLOCKED-LIVE | BLOCKED-LIVE | — |
| G6.1 blank→published path | PASS (code+hook tests) | PASS (+19→21 autosave tests) | — |
| G6.2 no work-loss vector | PASS with 2 risky gaps | **PASS, gaps closed** | R7/R8/R13 fixed and tested |
| G6.3 publishing cannot break the public site | PASS | PASS | error states now make failures honest instead of empty |
| G6.4 backups + feeds automatic | FAIL (secrets) / PASS (code) | FAIL (secrets — owner) / PASS (code, now tested) | R3 |
| G6.5 sitemap/RSS/cards current, admin unreachable | BLOCKED-LIVE | BLOCKED-LIVE | robots + RequireAdmin re-verified locally |
| FD1 refine-not-redesign | — | **RESPECTED** | all UI changes are additive error states and one text link per shell |
| FD2 swimlane form | — | **RESPECTED** | zero commits touch `industry-chain` rendering |
| FD3 stubs visible | — | **RESPECTED** | — |
| FD4 finance-in-action out of scope | — | **RESPECTED** | zero commits touch it |

## 5. Regressions introduced and their resolution

1. **Bare error page on the track index** (found in this phase's browser verification):
   the WO-08 early return rendered without the site layout — no header, no way on. Fixed
   same phase by rendering inside the page's own `PageLayout` (`3ec6cce`), matching the
   existing `DevelopmentFinancePhase` pattern. Verified in the browser afterwards
   (header, footer and Try-again all present).
2. **WO-10's deletion of `RelatedContent.tsx` broke the build**: the Phase 2 audit's
   zero-importer claim missed `CriticalThinkingEssay.tsx`. Typecheck caught it before any
   commit; the file was restored in the WO-10 commit and the audit correction is recorded
   above.
3. No work order needed reverting; the two-commit stop rule (two red test runs → revert)
   never triggered.

## 6. Blocked-live list for the owner's redeploy (unchanged from Phase 4, restated)

After R1 (pipeline) and R2 (domain) are fixed, re-verify on production: per-essay share
cards and og tags (K4), sitemap.xml/rss.xml currency, Verification Register presence per
essay (G5.1), essay structure on ten essays (G5.2), British English (G5.3), the homepage
ten-second test on the real domain (G2.1), and stub copy on ten finance modules (G4.2).
