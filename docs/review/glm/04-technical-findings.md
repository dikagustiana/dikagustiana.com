# Phase 5 — Technical findings, by lens

Every finding has an ID (F1…), evidence (file:line, command output, or live observation),
and a preliminary tag: severity **P0** (site-breaking/security/irreversible) · **P1** ·
**P2** · **P3** (hygiene), and goal impact **G0** (blocks a goal) · **G1** (noticeably
weakens) · **G2** (small gain) · **G3** (hygiene). Phase 9 re-reviews this list against
the goals and finalises the ranking; tags here are the raw material.

Positive findings (things that hold the goals up) are listed per lens as ✔ — they matter
to the reconciliation and must not be broken by fixes.

## Correctness

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| F1 | **The production site renders a blank page to every visitor.** All scripts load (200), `#root` stays empty; screenshot captured. Control experiments: current build renders fully locally; the deployed-era build (5ac5457, built locally) also renders its shell against a dead DB — the blank is the stale bundle against the *current* database. Root cause sits with the deploy staleness (F20), not the current code. | In-app browser observation 2026-10-05 on `dika-s-digital-studio.vercel.app` (`rootChildren: 0`, body text empty) vs `127.0.0.1:4173` (`rootChildren: 3`, full homepage); `git show 5ac5457` build renders shell | P0 / G0 (goals 1, 2, 4, 5 reading surfaces) |
| F2 | **Recovery banner false positive.** `findRecoveryCandidate` compares content only (revisions.ts:192-202); an autosave older than the last manual save still "differs", so a routine save+reload offers "Unsaved draft recovered… probably captured after the last save" (WriterEditor.tsx:744-746) — a claim the code never verifies. | Code + pinned test `[pinned]` in tests/unit/autosaveWrites.test.tsx | P2 / G2 (erodes trust in the net) |
| F3 | **Same-tab save race mislabelled as cross-tab conflict.** A manual save in flight while an autosave is in flight: both guard the same `serverUpdatedAtRef`; the loser's zero-rows guard throws "changed in another tab or on another device" about its own tab (useEssayAutosave.ts:323-331). Loud, no data loss, no action the writer can take. | Code trace; guard semantics verified by tests | P2 / G2 |
| F4 | **Supabase error details collapse to "Unknown error".** The chip extracts `error instanceof Error ? error.message : 'Unknown error'` (useEssayAutosave.ts:343) — PostgrestError objects are plain objects, so the author sees the generic text. Exposed by the new test, pinned. | tests/unit/autosaveWrites.test.tsx "surfaces a row-write error…" | P3 / G2 |
| F5 | **Query-driven pages fail to silence, not to an error state.** No hook sets `throwOnError` (App.tsx:90 creates a default QueryClient); a failed list query renders `data === undefined` → empty list. Direct-fetch pages (EssayBySlug, FinanceEssayPage, BookReader, AdminContent…) DO render `ErrorState`. Net: a DB hiccup makes index pages look genuinely empty. | grep: `ErrorState` in 8 pages (all direct-fetch); `throwOnError` absent from all of src/hooks | P2 / G1 |
| F6 | `useContentStats` swallows both query errors (useUnifiedContent.ts:150,154) — the admin dashboard shows zeros, indistinguishable from empty. | Code | P3 / G3 |
| F7 | `useAuditLog` fetches the latest 500 rows and filters client-side (useAuditLog.ts) — a search can silently miss matching rows beyond the page. | Code | P3 / G3 |
| F8 | Footer "Finance" link is the legacy `/finance-101` (redirected client-side). Works, but mints legacy URLs. | Footer DOM snapshot, local build | P3 / G3 |

## Security

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| ✔ | **RLS posture is strong and consistently built.** RLS on every table; no anonymous-write policy anywhere (grep-verified); admin checks inlined EXISTS on `user_roles`; `has_role` SD with pinned search_path, EXECUTE revoked from anon; privilege layer double-guarded with REVOKE/GRANT blocks. | Phase 2 §3 with migration line cites | ✔ do not weaken |
| ✔ | **Edge function hardening** — verify_jwt pinned + self-checked admin role, https/443-only, all-address DNS allowlist, per-hop redirect re-checks, body caps, plain-text output only. | Phase 2 §4; tests/unit/linkPreview.test.ts | ✔ |
| ✔ | Sanitised rendering (DOMPurify whitelist, iframes forbidden), KaTeX throwOnError:false red-source rendering, no `dangerouslySetInnerHTML` of unsanitised content found. | sanitizeHtml.ts + test; ArticleBody.tsx:78 | ✔ |
| ✔ | Admin routes wrapped in `RequireAdmin` (client) AND every admin table policy re-checks admin server-side; robots.txt disallows /admin, /auth, /settings, /debug. | App.tsx:184-248; robots.txt live | ✔ |
| F9 | **CSP ships Report-Only only** (vercel.json: `Content-Security-Policy-Report-Only`). No enforcing CSP anywhere — an XSS would have no browser-side backstop. (Understandable caution before enforcement; the report-only phase never ended.) | vercel.json:19-25 | P2 / G2 |
| F10 | Storage buckets are fully public-read (documented trade-off with name-enumeration acceptance, baseline_foundation.sql:485-493). Content is public by nature; fine — noted so it is a decision, not an accident. | Migration | P3 / G3 |
| F11 | The `essay_structure` view deliberately exposes draft metadata (title/snippet/author/placement) to anon — the visible-stubs feature. Column list is the boundary; bodies excluded. Security barrier + revokes in place. | 20260803150000:16-61 | ✔ (accepted, documented) |
| F12 | No secrets in the repository or its history found by this review (grep for key shapes; service-role key exists only as an Actions secret name). The one hard risk is operational: the backup secret is *missing* (F22). | grep; backup.yml | ✔ / see F22 |

## Data integrity

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| F13 | **No backups are happening.** The daily dump workflow fails at the dump step: both secrets resolve empty (`FATAL: VITE_SUPABASE_URL not set`), every run at least 2026-09-30→10-04 failed. Free tier has no PITR; the workflow is "the only backup this project has" (backup.yml:2-4). Until fixed, the sole copy of all content is the production database. | `gh run view 37242617434 --log-failed` (env block empty + FATAL); run list all `failure` | P0 / G0 (goal 6) |
| F14 | Dump floors are hardcoded (essays ≥100) — correct today, silently wrong when content doubles; below-floor exits 2, which is right. | dump-content.mjs floors | P3 / G3 |
| ✔ | Write-path integrity is well designed: backup-first ordering, optimistic-concurrency guards, archive-not-delete admin flows (`useDeleteContent` sets deleted semantics, useUnifiedContent.ts:328-334), audit log INSERT policy pins `user_id = auth.uid()`. | 02-functions §3 | ✔ |
| ✔ | Migrations replay cleanly from zero with assertion blocks; idempotent data steps. Blemishes only: 08d cites a nonexistent migration number; 04 has unbalanced BEGIN (harmless under the runner). | Phase 2 §3 | ✔ |

## Performance

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| F15 | **Editor chunk 871.67 kB (gzip 270 kB)** — Tiptap/Prosemirror. Lazy-loaded: only authoring routes pay it. Reader routes are unaffected. Optional win: finer manualChunks; low priority. | Build output (baseline, 01-inventory §10) | P3 / G3 |
| F16 | Initial reader payload ≈ entry 135.6 + react-vendor 189 + supabase 171.6 + query 39.2 kB raw (~163 kB gzip) + 56 kB self-hosted fonts. Reasonable for a SPA; prerendered essay HTML (once the deploy works) keeps crawler/first-paint cost low. | Build output; src/index.css font comments | ✔ / note |
| ✔ | **Fonts self-hosted, deliberately** — "a webfont that fails to load falls back silently… removes a third-party request from every page load" (index.css:1-13); zero third-party font requests in the current build. | src/index.css | ✔ |
| F17 | TanStack defaults: staleTime 0 + refetchOnWindowFocus true on public pages (only finance hooks override) — every tab focus re-reads Supabase on list pages; avoidable egress on the free tier. | App.tsx:90; hooks/queries staleTime overrides | P3 / G3 |
| F18 | Live TTFB: homepage 0.72 s, essay route 0.31 s (edge). With the site blank (F1), these numbers describe the shell only. | curl measurements 2026-10-05 | note |

## Discoverability

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| F19 | **The custom domain redirect + stale deploy break discoverability wholesale right now**: apex 308s to the raw vercel.app URL; canonical/og URLs are built on `https://dikagustiana.com` (siteOrigin.ts:7) which redirects; crawlers meet a blank page and a generic card. Everything else in this lens is moot until F1/F21 are fixed. | Phase 2 §0; siteOrigin.ts | P0 / G0 (goals 2, 5, 6) |
| ✔ | SEO plumbing is genuinely good in code: per-page titles/descriptions/canonical/og via `SEO.tsx` (absolute og:image enforced, JSON-LD at SEO.tsx:108), per-essay prerendered crawler HTML + share cards + sitemap + RSS with verify-and-exit-1 steps, robots.txt with admin disallows. | SEO.tsx; prerender.mjs; live robots.txt | ✔ |
| F20 | After redeploy, sitemap lists only prerendered pages (section indexes deliberately not listed, siteFeeds.mjs:5-6) — acceptable v1, worth a line in the report. | siteFeeds.mjs | P3 / G3 |

## Accessibility

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| ✔ | Skip-to-content link; landmark structure (banner/main/contentinfo); the chain map is fully keyboard-operable (joints are buttons, layer toggles are switches with names, distance/shift controls are pressed-state buttons); e2e asserts header integrity at 16/20/24 px root fonts; reduced-motion helpers (`motion.ts`); FIA v3 shipped an accessibility pass (e9d3386). | Local snapshots; e2e suite; motion.test.ts | ✔ |
| F21 | Contrast and focus-visible styling were **not measured** in this pass (no automated a11y audit exists in the repo). Recommend an axe sweep as follow-up; no specific violation found by inspection. | — | P3 / G3 |

## Code health

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| F22 | **Dead code, 24 units** — incl. K2-confirmed `src/lib/admin/sectionPhaseConfig.ts` (126 lines; its `CONSOLIDATION_TOPICS` copy shadows the live `src/config/consolidationTopics.ts` — drift risk), `essayTemplates.ts` chain (327+191), `ImageUploader` (422), `WorkingPaperTable` (248), `LivePreviewPanel` (197), retired `domains/writing/components/*` (RightSidebar 374…), 4 dead barrels, `use-mobile`, `alert-dialog`, `NavLink`, plus test-only exports (`hasBrief`, `countFigures`, `validateImages`, `tiptapJsonToMarkdown`, `extractFiguresFromJson`, `PUBLISHED_COLUMN`, `PRESENTATION_COLUMNS`). | Phase 2 §2 with zero-importer greps | P2 / G3 |
| F23 | **`useDeleteEssay` is dead AND dangerous** — hard-DELETEs essay rows, the exact behaviour the live admin flow deliberately abolished; one accidental import from irreversible content loss. | useAdminEssays.ts:100-122 vs useUnifiedContent.ts:328-334 | P2 / G3 (delete it) |
| F24 | `canonicalPath` (prerender.mjs:87-114) is a hand-mirror of the route-table-tested `essayUrl` — drift ships wrong og:url/canonical silently; not import-safe to test as-is. | prerender.mjs vs essayUrl.ts | P2 / G2 |
| F25 | 25 lint warnings (0 errors; ceiling pinned at 35 in CI) — mostly `no-explicit-any`, two `exhaustive-deps`, one react-refresh. | lint output; ci.yml:23 | P3 / G3 |
| F26 | Root-level `AUDIT-LOG.md`, `CHANGES-MADE.md`, `UPGRADE-SUMMARY.md` are dated records of a June 2026 autonomy pass (branch names in headers) — historical, candidates for docs/archive. | File headers | P3 / G3 |
| F27 | K5 verdict: **largely refuted.** README's env/edge-function sections match the code; `docs/SESSION_LOG.md`'s file references exist (my first check false-positived on CRLF); the genuinely stale bits are small: footer `/finance-101` (F8), baseline migration comments (04 "final slug set" vs 07's fifth track; 08d cites a nonexistent migration number), and the June 2026 root records (F26). | README.md; SESSION_LOG grep + ls; migrations | P3 / G3 |

## Tests

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| ✔ | Suite is strong for a solo project: 936 unit tests + 72 e2e; decision logic (revisions, placement, publication contract, essayUrl, feeds, share cards) is pure and table-tested; 7 reader journeys; 740 lines of chain-map behaviour; TZ pinned in CI to catch timezone assumptions; test-count floor asserts suites can't silently shrink. | Baseline + Phase 3/4 runs | ✔ |
| F28 | **CI never runs the e2e suite.** ci.yml steps: npm ci, eslint, typecheck, vitest, build — no Playwright. The 72-test suite runs only when someone remembers. | .github/workflows/ci.yml | P2 / G2 |
| F29 | The e2e webServer command is POSIX-only — cannot start on Windows (`'VITE_SUPABASE_URL' is not recognized…`); run manually via Git Bash for this review. | playwright.config.ts:41-43; error output | P3 / G3 |
| F30 | Remaining untested criticals after Phase 3: component-level publish click-through (WriterEditor/PublishModal submit → row), `dump-content.mjs`, `AuthContext` transient-failure bounce, `canonicalPath` (needs extraction first). | 02-functions §7 | P2 / G2 |

## Delivery

| ID | Finding | Evidence | Tag |
|---|---|---|---|
| F31 | **Production deployment is ~2 months stale and the GitHub→Vercel pipeline is broken.** Deployed build fingerprints to the Jul 31–Aug 2 window (index.html predates the Aug-2 og rewrite; bundle lacks capital-allocation (Oct 3) and FIA v3 (Oct 4)); CI on main is green, so nothing failing in GitHub should block a deploy — the break is on the Vercel side (integration disconnected, or builds failing there — the prerender step hard-fails a Vercel build without `VITE_SUPABASE_PUBLISHABLE_KEY`, and the GitHub Actions secrets for the same two values are already known-missing (F13), making "env vars never configured" a live hypothesis). Owner must check the Vercel dashboard; not fixable from the repo. | Phase 2 §0 fingerprinting; prerender.mjs:52-62; backup failure pattern | P0 / G0 (every goal that needs the live site) |
| F32 | **Apex domain 308-redirects to the raw project URL** (`dikagustiana.com` → `dika-s-digital-studio.vercel.app`); www serves 200. Domain assignment/redirect misconfiguration in the Vercel dashboard. | curl -sI outputs, Phase 2 §0 | P0 / G0 (goal 2 first impressions) |
| F33 | Backup workflow secrets `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are unset in GitHub Actions (K1 confirmed; = F13, root cause of the data-integrity P0). | gh run logs | P0 / G0 |
| F34 | Vercel branch-preview behaviour is undeterminable from the repo (no `git.deploymentEnabled`/`ignoreCommand` in vercel.json). If previews are on, every branch push spends minutes and fails at prerender without a preview-env key. Owner-side check; optional repo-side tweak is a proposal, not a fix. | vercel.json; prerender.mjs:52-62 | P3 / G3 |
| F35 | CI's lint ceiling (`--max-warnings=35`) no longer matches the actual count (25) — the ceiling ratchets down but hasn't been lowered. | ci.yml:23 vs lint output | P3 / G3 |
| F36 | K6 verdict: **superseded** — the real spend problem is the opposite of wasted rebuilds: production does not rebuild at all (F31). Preview minutes question folded into F34. | — | — |
