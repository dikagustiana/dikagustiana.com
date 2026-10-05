# Phase 4 — Feature checks (end to end)

Evidence sources, in order of authority for each claim:

1. **Mocked Playwright e2e suite** (`npm run test:e2e`): 72/72 PASS on this branch
   (2026-10-05). The suite builds the real production bundle and serves it locally with a
   dead Supabase URL; every Supabase call is intercepted (`tests/e2e/mockSupabase.ts`) —
   no production backend is contacted. Specs: `smoke` (every public route renders, header
   holds at 4 widths × 3 root-font sizes), `auth` (protected routes), `content`
   (data→render binding), `journeys` (7 reader journeys), `chain` (740 lines of map
   behaviour), `mapLinks` (map→essay link contract).
2. **Interactive browser pass on the local production build** (current branch code,
   `127.0.0.1:4173`) — structure, copy, controls, 404.
3. **Live site** (`https://dikagustiana.com` → 308 → `dika-s-digital-studio.vercel.app`)
   — **currently a blank page for every visitor** (Phase 2 §0/§4 of this file): all
   scripts load 200, `#root` renders 0 children, confirmed by screenshot. Control
   experiment: the same Aug-2026 build served locally renders its shell; the current
   branch build renders fully. The blank is the stale bundle meeting the current
   database. Until the owner repairs the GitHub→Vercel pipeline and redeploys, live-site
   verification of content-dependent features is **blocked**, and this doc marks such
   rows BLOCKED-LIVE with the code/test evidence that stands in.

Two environment facts found while running the suite (findings, not blockers):
the e2e webServer command uses POSIX `VAR=x` env syntax and **cannot start on Windows**
(`'VITE_SUPABASE_URL' is not recognized as an internal or external command`,
playwright.config.ts:41-43); the suite was run by building and serving manually, then
`npx playwright test` (server reuse). Playwright browsers are also not pre-installed
(`npx playwright install chromium` needed).

## Feature matrix

| Feature | Verdict | Evidence |
|---|---|---|
| **Navigation — header** | PASS | e2e `smoke` "the header holds its navigation": no sideways scroll at 1024/1280/1348/1440 px × 16/20/24 px root font (24 cases). Local snapshot: Home, About, Accounting, Finance, Green Transition, The Next Big Thing, Development Finance, Learning + submenu buttons; Sign In; skip-to-content link |
| **Navigation — dropdowns' targets** | PASS | `tests/unit/navConfig.test.ts` pins every path (added after `/finance/planning-forecasting`-style dead labels shipped — navConfig.ts:19-26 comment); e2e smoke visits all section indexes |
| **Navigation — footer** | PASS with a blemish | Footer sections/resources links all resolve; **footer "Finance" href is `/finance-101`** (legacy path, saved client-side by a `<Navigate>` redirect — works, but minted links should not ride legacy routes). LinkedIn + email links present |
| **Section indexes** (finance, accounting, green-transition ×4 tabs, development-finance ×4 phases, the-next-big-thing, critical-thinking, books) | PASS (render) / BLOCKED-LIVE (content) | e2e smoke renders each; local pass shows `/finance` with its syllabus-honesty copy; content-driven lists need the DB — e2e `content.spec` binds seeded rows to render |
| **Finance landing** | PASS (structure) | Local: H1 Finance; tagline; "Start with Fundamentals…"; **"A working syllabus, kept in public. Every question stays listed whether or not it has been answered yet"** — the stub-visibility promise (goal 4) in the product's own words |
| **Track index with a dead DB** | PASS-with-finding | `/finance/fundamentals` renders breadcrumb with the raw slug ("fundamentals"), no H1, no error message — silent emptiness on query failure (no `throwOnError` anywhere; see 02-functions §2). With data, e2e covers the populated layout |
| **Essays — reader surface** | PASS (behaviour) / BLOCKED-LIVE (content) | e2e journey "three minutes: the scope, the comparison, the objection and the limits are all on the page" pins boundaries/limits presence; "one substantial reading: the completed argument carries its own objection"; `ArticleBody` sanitises HTML; heading-ID/TOC tested (`tocHeadingIds.test.tsx`) |
| **Stubs — visible, honest** | PASS (mechanism) / BLOCKED-LIVE (copy) | Mechanism: draft metadata is public through the `essay_structure` view (Phase 2 §3) and indexes list planned work (landing copy above; `curriculumContract.ts` = "Planned" labels; e2e journey "curriculum: the syllabus says what it is, and promises no dates"). What a stub page says verbatim needs the live DB — re-verify after redeploy |
| **Chain map — swimlane form + controls** | PASS | Local: swimlane plate (Origins → Processing and intermediation → Manufacturing and packaging → Distribution and retail → Use and recovery); distance toggle economy/finance (pressed-state buttons); shift lenses reindustrialisation (8) / green transition (8); six hide-layer switches (logistics, cold chain, working capital, asset finance, energy, contract governance); "Show the detail" toggle; joint click updates the status line ("Economy · No shift · Production → aggregation") |
| **Chain map — entrance animation** | PASS | e2e "thirty seconds: the map is the entrance, and a completed piece is one click away" (30 s animation budget asserted) |
| **Chain map → essay links** | PASS | e2e `mapLinks` + journey "Energy leads to its essay with no overlay on, at the overview, with its context kept"; URL state round-trip (`useChainUrl.ts`, 127 lines) + journey "the state can be sent" (shareable map state) |
| **Search** | **ABSENT** | No search UI exists anywhere (header/footer snapshots, navConfig, routes, components — no search component or route). Discovery is by browsing structure only. For a 10-minute panel reader (goal 2) this is a gap when they arrive looking for a topic |
| **Share cards** | BLOCKED-LIVE / PASS-in-code | Live: every route serves the generic card with relative og:image (stale deploy, Phase 2 §0). Code: `prerender.mjs` writes per-essay HTML + `dist/og/<slug>.png`; `docs/review/share-cards/` holds 10 rendered cards + manifest with distinct per-essay titles/labels/sha256s; `shareCard.test.ts` pins size/determinism/glyphs; `check-share-parity.mjs` asserts raw==hydrated per route. Resolution = redeploy (owner) |
| **RSS + sitemap** | BLOCKED-LIVE / PASS-in-code | Live: `/rss.xml`, `/sitemap.xml` serve the SPA fallback (stale build predates them). Code: `siteFeeds.mjs` (tested: `siteFeeds.test.ts`) + prerender verify step that exits 1 on count mismatch |
| **404** | PASS | Local `/this-page-does-not-exist`: "404 · Page not found · The page you were looking for doesn't exist or may have moved. · Return home" |
| **Writer Studio — blank→published** | PASS (code + hook tests) | Code trace (02-functions §3): validation gate → guarded UPDATE → `recordRevision('publish')` → audit; create path INSERTs then navigates. New `autosaveWrites.test.tsx` (19 tests) covers the write layer. Component-level e2e of the full publish click-through remains untested (residual, Phase 10 candidate) |
| **Writer Studio — autosave** | PASS | Debounce 2 s; backup-first ordering; guarded row write (`published=false` + `updated_at`); zero-rows loud failure; brief bodies backup-only — all now pinned by `autosaveWrites.test.tsx`; `revisions.test.ts` pins the decision rules |
| **Writer Studio — recovery** | PASS-with-finding | `useDraftRecovery` probes backups on load and offers (never auto-applies); failure never blocks the editor. Finding: recency-blind rule offers stale autosaves (pinned test; Phase 10 work order) |
| **Writer Studio — image handling** | PASS (tests) | `FigureUploader` (519) + `imageBlock.test.ts`, `figureValidation.test.ts` (alt/source/aspect rules per section); `ImageUploader` (legacy, dead) |
| **Writer Studio — Brief companion** | PASS (code + tests) | Meta-only load (`META_SELECT`), backup-only autosave, guarded `brief_json` write, shared revision sequence with 23505 retry (covered by new tests at hook level) |
| **Auth/admin gating** | PASS | e2e `auth.spec` (protected routes); `authTabFocus.test.tsx` (tab-switch wipe regression); `RequireAdmin` + RLS policies (Phase 2 §3). Not run against the real project (would need writes) — `tests/live` exists for the owner (`E2E_LIVE=1`, documented `docs/e2e-live-testing.md`) |

## Writer Studio — every way work can be lost (goal 6 audit, from code + tests)

1. **Tab closed mid-typing** → debounced autosave (2 s) + `pagehide` flush; the final <2 s
   of typing can miss the backup (best-effort by design, documented in code).
2. **Tab hidden** → `visibilitychange` flush.
3. **Crash/reload after saves** → `useDraftRecovery` offers the newest differing autosave.
   *Gap:* the offer can be a false positive after a routine save+reload (recency-blind
   rule) — annoying, not lossy.
4. **Two tabs on the same essay** → guarded writes; the stale tab fails LOUDLY, never
   overwrites. *Gap:* same-tab manual-save vs in-flight autosave can produce the same
   loud "another tab" message about its own tab (false alarm, no loss).
5. **Publish with a failed revision insert** → row is written first (the artifact);
   revision marker failure surfaces on the chip. History marker can be missing while
   content is saved.
6. **Validation gate** → returns before any write; nothing cleared.
7. **Auth-tab wipe regression** → fixed + regression-tested (`authTabFocus.test.tsx`).
8. **Never-saved essay (K3)** → autosave requires the row to exist (`canAutosave`);
   before the first manual save there is NO net — by design (`revisions.ts:117-124`
   comment: the author saves manually once; autosave takes over). The risk window is
   "new essay, typed, never saved, tab closed" = full loss. Logged as a finding.

## Blocked-live list (re-verify after the owner redeploys)

Essay/stub content checks for goals 1, 2, 4, 5 on the live site: Verification Register
presence per essay (G5.1), structure checks (G5.2), British English (G5.3), homepage
thesis ten-second test (G2.1), stub copy (G4.2), share cards per essay (K4), RSS/sitemap
currency (G6.5). The code-side half of each is verified here; the live half needs a
working deployment.
