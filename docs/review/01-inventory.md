# Phase 2 — Inventory

Repo state reviewed: `main` @ cf22d64 (2026-10-04), branch `review/goals-2026-10`.
Every claim carries a file:line, a command+output, or a live URL observed on 2026-10-05.

## 0. Two live-site facts that frame everything (observed 2026-10-05)

1. **Production is stale by ~2 months.** `https://dika-s-digital-studio.vercel.app/` (the
   origin the domain resolves through) serves `index.html` with a *relative* `og:image`
   `/logo.png`, no `og:url`, no `twitter:image` — the pre-`c739e1a` shape (that commit,
   "share cards + prerender", is dated 2026-08-02 08:26 UTC and rewrites exactly those
   tags; verified with `git show c739e1a~1:index.html | grep og:image` → `/logo.png`).
   Fingerprinting the deployed JS (`assets/index-tLuHZmHp.js`, 137,525 B): contains
   `finance-in-action` (FIA v1 nav item, present since the 2026-07-31 restore commit)
   but zero occurrences of `capital-allocation` / `Capital in Motion` (landed with PR #39,
   2026-10-03) and zero `FIA_PREVIEW` (PR #40, 2026-10-04). The `manualChunks` split the
   deployed HTML references (`query-*.js`, `supabase-*.js`) landed 2026-07-31 12:52 UTC
   (`e9bf047`). So the deployed build is from the 2026-07-31→08-02 window; sitemap/RSS
   (Sep 28), the capital-in-motion port (Oct 3) and FIA v3 (Oct 4) have never reached
   production. CI on main is green (`gh run list --workflow=ci.yml` — success on the
   2026-10-04 merge), so the break is between GitHub and Vercel (deploy never triggered,
   or builds failing in Vercel) — that state is only visible in the Vercel dashboard.
   **Finding P0, owner-only.**
2. **The apex domain redirects away from the site.** `curl -sI https://dikagustiana.com/`
   → `HTTP/1.1 308 Permanent Redirect`, `Location: https://dika-s-digital-studio.vercel.app/`
   (plus a `Refresh` header), served by Vercel. `https://www.dikagustiana.com/` answers
   200 directly; `http://` apex 308s to `https://dikagustiana.com/`. So a visitor (or an
   admissions panel) typing the bare domain is bounced to a raw project URL that also
   hosts the stale build. Root cause is domain assignment in the Vercel dashboard.
   **Finding P0, owner-only** (constraint 1: no DNS/Vercel changes).

Supporting observation: `/sitemap.xml` and `/rss.xml` return the SPA fallback
(`200, text/html, 1139 B`) on both origins — consistent with the stale build (the feed
files are written by `scripts/prerender.mjs` since 2026-09-28, `1717877`; the deployed
build predates them). `/robots.txt` serves a real robots file from `public/`.

## 1. Routes and reachability

Route table: `src/App.tsx` (273 lines, read in full). All pages are lazy-loaded chunks
(`src/App.tsx:16-88`). Admin routes are wrapped in `RequireAdmin` (`src/App.tsx:185,
227-248`), which checks the Supabase session and an admin row in `public.user_roles`
(`src/components/auth/RequireAdmin.tsx`); public routes render for anonymous visitors.

### Public routes

| Route | Page | Renders |
|---|---|---|
| `/`, `/index`→`/` | `Index.tsx` | Landing: section cards, industry-chain preview |
| `/about` | `About.tsx` | Argument: reading path, chain section |
| `/auth` | `Auth.tsx` | Sign in/up (public page; grants nothing without admin role) |
| `/accounting`, `/accounting/fsli`, `/accounting/fsli/:slug` | `Accounting`, `FsliList`, `FsliDetail` | Accounting hub + FSLI pages |
| `/accounting/consolidated-reporting`, `/accounting/statutory-reporting`, `/accounting/consolidation/:topic` | `ConsolidatedReporting`, `StatutoryReporting`, `ConsolidationDetail` | Accounting surfaces that inline essays |
| `/finance` | `FinanceLanding` | Finance hub (six-part curriculum) |
| `/finance/capital-allocation`, `/:conditionSlug` | `FinanceInMotion`, `CapitalConditionDetail` | Capital in Motion: 21 conditions in 6 layers (static data `src/data/capitalConditions.ts`) |
| `/finance/finance-in-action`, `/:modelSlug` | `FinanceInActionIndex`, `FinanceModelDetail` | FIA production pages (out of scope FD4) |
| `/finance/:track`, `/finance/:track/:slug`, `/finance/:track/:moduleSlug/:essaySlug`→redirect | `FinanceTrackIndex`, `FinanceTrackChild`→`FinanceModulePage`/`FinanceEssayPage` | Curriculum tracks, modules, essays |
| `/essays/:slug` | `EssayBySlug` | Universal essay resolver/reader |
| `/green-transition` + `/now` `/gaps` `/future` `/:phase` `/:phase/:slug` | `GreenTransition`, `GreenTransitionPhase`, `GreenTransitionEssayPage` | Green transition section |
| `/green-transition/climate-finance`, `/:slug` | `ClimateFinance`, `GreenTransitionEssayPage` | Climate finance |
| `/green-transition/tracker`, `/archive`, `/:issueSlug`, `/:issueSlug/:sectionKey/:entrySlug` | `GreenTransitionTracker*` | Tracker (static data `src/data/trackerIssues.ts`) |
| `/development-finance`, `/:phase`, `/:phase/:slug` | `DevelopmentFinance*` | Development finance section |
| `/the-next-big-thing`, `/:theme/:slug`, `/:slug` | `TheNextBigThing`, `NextBigThingEssayPage` | Op-ed section |
| `/critical-thinking-research` + phases | `CriticalThinking*` | Learning section (legacy) |
| `/books-academia`, `/books/categories`, `/books/:category`, `/books/:category/:bookId/read` | `Books*`, `BookReader` | Book library (legacy) |
| `/english-ielts` | `EnglishIelts` | Static learning page (legacy) |
| `*` | `NotFound` | 404 |

Legacy redirects preserved: `/finance-101*` (5 routes), `/finance/finance-in-motion`,
`/finance/capital-in-motion/:conditionSlug`, `/masyarakat-baru` (4 routes),
`/finance/:track/:moduleSlug/:essaySlug` via `FourSegmentEssayRedirect` (`src/App.tsx:95-120,
168-179, 207-210`).

### Admin routes (RequireAdmin)

`/finance-workspace`, `/settings`, `/debug/auth`, `/admin/dashboard`, `/admin/content`,
`/admin/audit-log`, `/admin/writer/:id` (WriterStudio → redirect), `/admin/writer/:section/list`,
`/admin/writer/:section/:slug` (the canonical editor), `/admin/writer/:section/:slug/brief`,
`/admin/content/:id` (redirect). Source: `src/App.tsx:184-248`.

### Flag-gated (FD4, out of scope)

`/finance/finance-in-action` routes switch on compile-time `__FIA_PREVIEW__`
(`vite.config.ts:11-15`; `src/App.tsx:70-79`): with `VITE_FIA_PREVIEW=true` the v3.1
viewer + synthetic fixtures build; unset, Rollup drops them and
`scripts/assert-no-synthetic.mjs` fails the build if `SYNTHETIC` reaches `dist/`.

## 2. Feature areas, components, hooks, stores

State: no zustand/redux — React Context (`src/contexts/AuthContext.tsx`, 29 consumers) +
TanStack Query. Data layer: `src/hooks/queries/*` (15 hook modules, all Supabase-backed;
per-module consumer counts verified by grep). Full table produced during the sweep;

highlights:

| Area | Core files | Notes |
|---|---|---|
| Writer Studio | `src/components/writer/WriterEditor.tsx` (881), `PublishModal.tsx` (722), `WriterValidation.tsx`, `WriterPreview.tsx`, `WriterList.tsx`; editor canvas `src/components/editorial/EssayEditor.tsx` + `toolbar/` (Tiptap 3); domain schemas `src/domains/writing/schema/*` | The only live editor; `/admin/writer/:section/:slug` |
| Autosave | `src/hooks/useEssayAutosave.ts` (481): 2 s debounce, 60 s revision rollup, `visibilitychange` flush; `useDraftRecovery` offers (never auto-applies) a newer backup; rules in `src/lib/revisions.ts` (202, pure) | Never-published essay → revision **and** row (optimistic-concurrency on `updated_at`); published → revision only. Brief body is backup-only |
| Essay reading | `editorial/ArticleBody.tsx` (665), `LongformArticleShell`, `ArticleShell`, `EssayCardLink`, `RelatedContent`, `SEO.tsx` | Sanitised HTML: `src/lib/sanitizeHtml.ts` + DOMPurify |
| Industry chain map | `src/components/industry-chain/*` (ChainPlate 813, ChainColumn 847, ChainTargetPanel 592, SVG 465, URL state `useChainUrl.ts`), data `src/data/industryChain.ts` (2,293 lines), geometry generator `scripts/build-chain-plate.mjs` (1,325) | Swimlane plate + narrow column; embedded on `/` and `/about` |
| Capital in Motion | `src/data/capitalConditions.ts` (266: 21 conditions, 6 layers, decision rules), pages `FinanceInMotion`, `CapitalConditionDetail` | Goal 4 framework |
| Green transition tracker | `src/data/trackerIssues.ts` (561), `components/tracker/*`, 4 pages | Static data |
| FIA (production side) | `pages/FinanceInActionIndex`, `FinanceModelDetail`, `components/finance-in-action/ModelAdminPanel`, `hooks/queries/useFinanceModels` | v3.1 viewer is flag-gated |
| Books/IELTS/Critical thinking | `components/books`, `BookReader`, `EnglishIelts`, `CriticalThinking*` | Legacy learning surfaces (goal-fit question in Phase 6) |
| SEO/share | `SEO.tsx` (react-helmet-async), `src/lib/shareImage.mjs` (single og:image formula), `scripts/lib/shareCard.mjs` (satori+resvg 1200×630), `scripts/lib/siteFeeds.mjs` (sitemap+RSS, FEED_SIZE 20) | Build-time generation in `scripts/prerender.mjs` |

Dead-code candidates (zero importers, verified by grep across src/tests/scripts):
`src/lib/admin/sectionPhaseConfig.ts` (126 lines — **K2 CONFIRMED**),
`src/hooks/use-mobile.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/NavLink.tsx`,
`src/components/editorial/ImageUploader.tsx` (422), `src/components/green-transition/GreenTransitionRelatedEssays.tsx`,
`src/components/consolidation/ProcessStep.tsx`, `src/components/consolidation/WorkingPaperTable.tsx` (248),
`src/components/admin/AdminEditorDebugLine.tsx`, `src/components/admin/LivePreviewPanel.tsx` (197) +
6 more via the dead `components/admin/index.ts` barrel, `src/lib/essayTemplates.ts` (327) via dead
`TemplateSelector`, 3 files via the dead `components/finance/index.ts` barrel, the retired
`src/domains/writing/components/{LeftSidebar,RightSidebar,TopBar}.tsx` + barrels,
`src/hooks/queries/index.ts` barrel. Also caller-less: `useWriterEssay` (only
`generateUniqueSlug` is imported from its module). Full list with evidence in `02-functions.md`.

## 3. Supabase schema (from repository migrations only; no database was connected)

Migrations: `supabase/migrations/2026{0731..0902}*.sql` (17 current) + `_archive/` (43,
explicitly never replayed — `_archive/README.md`). Baseline supersedes the archive
(`20260731010000_baseline_foundation.sql:1-10`).

**Tables** (all `public`, all RLS enabled): `user_roles`, `profiles` (auth/identity);
`finance_sections`, `finance_modules`, `finance_models` (draft-gated by `is_published`),
`finance_settings`, `fsli_pages`, `fsli_sections` (content); `sections`, `categories`,
`essays` (published+draft in one table, gate = `published` boolean, placement columns
`module_id`/`finance_section`/`lesson_type`/`fsli_slug`/`topic`, `content_json`,
`layout_config`, `presentation` jsonb, `brief_json`), `admin_audit_log` (append-only),
`books_uploads` (soft delete), `essay_revisions` (authoring). Council table dropped
2026-08-01 (`20260801060000:33`). Key policies:

- `essays`: anon SELECT `published = true` (`20260731030000:446-448`); authenticated
  SELECT `published OR admin`; writes admin-only (466-489). **No anon write policy
  anywhere in the schema** (grep: every `TO anon` is a SELECT/grant).
- `essay_structure` view (08i): `security_invoker=false, security_barrier=true`;
  exposes draft **metadata only** (id, slug, title, snippet, author, placement) for the
  visible-stubs feature; bodies excluded; REVOKE/GRANT pinned (`20260803150000:35-61`).
- Role checks: inlined `EXISTS (… user_roles … role='admin')` in every policy (immune
  to function-grant revocation); one deliberate `has_role()` use in
  `user_roles_insert_admin` (recursion avoidance), `has_role` is SECURITY DEFINER with
  `SET search_path = public`, EXECUTE revoked from PUBLIC/anon (`20260731010000:210-241`).
- Storage: buckets `essay-images`, `books`, `finance-models` all public-read;
  writes admin-only via whitelisted policies (`20260731010000:474-547`).
- Functions: `handle_new_user` (SD, search_path pinned), `update_updated_at_column`,
  `has_role`, `validate_essay_placement` (live trigger, fails closed),
  tone-field trigger dropped 08d.
- Seeds: `supabase/seed.sql` = e2e fixtures only (admin@dika.test, one published essay).
- Migration hygiene: replayable from zero; idempotent data steps with assert blocks.
  Blemishes: 08d comment cites a nonexistent migration number; 04 has `BEGIN` without
  `COMMIT` (07 has the inverse) — harmless under the Supabase runner; baseline comments
  call 4 tracks "final" though 07 adds a 5th.

## 4. Edge function

One: `supabase/functions/link-preview/` (`index.ts` 191 lines, `resolve.ts` 700+).
- `verify_jwt = true` pinned in `supabase/config.toml:26-27` (project policy: every
  function verifies JWT and re-checks auth server-side; the historic
  verify_jwt=false + service-role anti-pattern is documented at config.toml:18-24).
- Self-checks: bearer token → `/auth/v1/user` → `user_roles?role=eq.admin` under the
  caller's own token (RLS-enforced) → 403 for non-admins (`index.ts:151-165`).
- Outbound: project's own auth/REST; Cloudflare DoH (`cloudflare-dns.com/dns-query`);
  oEmbed endpoints `publish.x.com`, `www.youtube.com`; the user-supplied target page.
- SSRF guards: https+443 only, no credentials in URL, single-label/localhost rejected,
  every host resolved (A+AAAA) and **all** addresses must be public (`resolve.ts:272-275`),
  IPv4 blocklist incl. 169.254.169.254, IPv6 allowlist (mapped/NAT64 judged by embedded
  IPv4), redirects followed by hand (max 3) with per-hop re-checks, 5 s budget, 512 KiB
  body cap, only text/html + JSON parsed, output plain-text only (markup discarded).
- No service-role client exists in the function (`index.ts:17-19`); uses platform-injected
  `SUPABASE_URL` + publishable key names (`SUPABASE_PUBLISHABLE_KEYS`, fallback
  `SUPABASE_ANON_KEY`).
- Offline-tested: `tests/unit/linkPreview.test.ts` (467 lines).
- Deploy path is manual (Supabase MCP, human gate) per `README.md` — no CI deploys functions.

## 5. Scheduled jobs

- GitHub Actions cron: **`Content backup`** — daily 20:17 UTC + manual dispatch
  (`.github/workflows/backup.yml:19-23`). Dumps essays/related tables to a workflow
  artifact (90-day retention) with row-count floors and a ≥50 KB `essays.json` gate.
- No Vercel crons (`vercel.json` has none), no Supabase cron, no pg_cron in migrations.

## 6. External services

Supabase (Postgres+Auth+Storage; project ref `asypkbkiebjvvpimewfp` appears as the
non-secret fallback URL in `scripts/prerender.mjs:36-38`), Vercel (hosting + Analytics
`@vercel/analytics`), GitHub Actions (CI + backup), Cloudflare DoH + x.com/YouTube
oEmbed (edge function outbound only). No AI providers, no other third-party calls
(`supabase/config.toml:8-9`).

## 7. Environment variables (names only; no values stored/used by this review)

| Where | Names |
|---|---|
| Client build (`src/integrations/supabase/client.ts:4-5`) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Preview flag (`vite.config.ts:13`) | `VITE_FIA_PREVIEW` |
| Prerender/feeds (`scripts/prerender.mjs:26-38`) | same two `VITE_SUPABASE_*` (reads process env or `.env`) |
| Content dump (`scripts/dump-content.mjs:51-56`) | `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ACCESS_TOKEN_USER`) |
| Edge function runtime (`index.ts:24-40`) | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_ANON_KEY` |
| CI (`.github/workflows/ci.yml`) | none — CI runs with **no secrets** |
| Backup workflow (`.github/workflows/backup.yml:38-41`) | `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — **both currently empty at runtime** (see §9, K1) |

`.env.example` documents the three `VITE_*` values. No secret values are committed
(grep for `sbp_`, `sb_secret_`, `service_role` literals: none in tracked files).

## 8. Build / CI / deploy configuration

- Build: `vite build && node scripts/assert-no-synthetic.mjs && node scripts/prerender.mjs`
  (`package.json:8`). Prerender: fetches published essays (anon key), writes per-essay
  `dist/<canonical-path>/index.html` with raw og/twitter tags + per-essay
  `dist/og/<slug>.png` cards + `sitemap.xml` + `rss.xml`; **skips** locally/CI without a
  key, **hard-fails** on Vercel (`VERCEL=1`) without one
  (`scripts/prerender.mjs:49-63`) — a deploy without the key ships a generic card, the
  exact failure class it exists to prevent.
- CI (`.github/workflows/ci.yml`): `on: push: [main]` + `pull_request`. Steps: `npm ci`,
  `eslint . --max-warnings=35`, `tsc -b --force` (solution-style root tsconfig — a bare
  `tsc --noEmit` compiles nothing, comment at ci.yml:16-17), `vitest run` with
  `TZ=America/Chicago` + `scripts/assert-test-count.mjs` floor, `npm run build`.
- Vercel (`vercel.json`): SPA rewrite `/(.*) → /index.html`; security headers incl.
  HSTS preload and a **Report-Only** CSP; no crons; no `git.deploymentEnabled` /
  `ignoreCommand` tuning.
- Edge functions: manual deploys only (README; MCP + human gate). Migrations: manual
  (`supabase` CLI locally; no Supabase GitHub integration in the repo).

## 9. What a push of a non-main branch triggers (quoted config)

| System | Trigger on a non-main branch push | Evidence |
|---|---|---|
| GitHub Actions CI | **Nothing.** `on: push: branches: [main]` + `pull_request:` — a branch push alone runs no workflow; only opening a PR would. | `.github/workflows/ci.yml:10-14`; confirmed by run history: the `feat/finance-in-action-v3` run is type `pull_request` |
| GitHub Actions backup | Nothing (schedule + workflow_dispatch only). | `.github/workflows/backup.yml:19-23` |
| Supabase migrations | **Nothing automated** — no Supabase GitHub integration, no `supabase db push` step anywhere in `.github/`, no CI job touches the database. | repo-wide grep of `.github/`, `supabase/` |
| Edge functions | **Nothing automated** — manual MCP deploys behind a human gate. | `README.md` (edge function section) |
| Vercel | **Cannot be determined from the repository.** `vercel.json` sets no `git.deploymentEnabled`/`ignoreCommand`. Vercel's default GitHub integration builds a preview for every branch push of the connected repo; whether this project has it enabled is a dashboard fact. If previews ARE enabled: each branch push spends build minutes, and the build **fails at prerender** when the preview environment lacks `VITE_SUPABASE_PUBLISHABLE_KEY` (`scripts/prerender.mjs:52-62` exits 1 when `VERCEL=1`). | constraint: "cannot tell" ⇒ treated as possibly-triggering |

Decision under Hard-constraint 2: a non-main push applies **no migration** and deploys
**no function** (both are manual-only, evidenced above). Vercel preview builds are a
deployment of the static site, not a function deploy or migration; the branch push at
Phases 10 and 13 therefore goes ahead as instructed, and the minutes question is logged
as finding (K6) for the owner.

## 10. Baseline (2026-10-05, Windows checkout, `core.autocrlf=true`, no `.env`)

| Check | Result |
|---|---|
| `npm run build` | PASS. `vite build` 11.48 s. `assert-no-synthetic`: PASS ("no SYNTHETIC in dist/"). `prerender`: SKIPPED by design (no key outside Vercel; warning emitted). Warning: `editor` chunk **871.67 kB (gzip 270.05 kB)** — Tiptap/Prosemirror; other large chunks: `react-vendor` 189 kB/62.7 gzip, `ChainPlate` 176.7/45.0, `supabase` 171.6/44.4, `index` (entry) 135.6/43.2 |
| `npm run typecheck` | PASS, clean (`tsc -b --force`) |
| `npm run lint` | PASS, 0 errors / 25 warnings (floor is 35; mostly `no-explicit-any`, two `exhaustive-deps` in `GreenTransitionEssayPage.tsx:76` / `NextBigThingEssayPage.tsx:63`, one react-refresh in `NotFound.tsx:18`) |
| `npm run test:unit` | 916/917 PASS. One failure: `tests/unit/shareCard.test.ts:215` pins sha256 of `scripts/og-fonts/OFL.txt`; this Windows checkout materialises it CRLF (`git ls-files --eol` → `i/lf w/crlf`; no `.gitattributes` in repo; `core.autocrlf=true`), hash `05831cfb…` vs pinned `995c7199…`; `sed 's/\r$//' \| sha256sum` reproduces the pinned hash exactly → **checkout artifact, not a repo defect**. Candidate fix: `.gitattributes` |
| `npm run test:e2e` (mocked Playwright) | Not run in baseline — Phase 4 |
| Bundle | see build row (local build == CI build shape; prerender-only artefacts absent without key) |
| Live: homepage | `GET https://dika-s-digital-studio.vercel.app/` → 200; TTFB 0.72 s; HTML 1,139 B (SPA shell; content loads client-side from Supabase). Chain map is embedded here (`src/pages/Index.tsx:10,94`), so homepage timing is the chain-map timing; `ChainPlate` chunk 176.7 kB (45.0 gzip) is the map's cost |
| Live: essay | `GET /essays/driver-tree-construction` → 200; TTFB 0.31 s; HTML 1,139 B — **generic shell, not pre-rendered** (stale deploy, §0); actual essay arrives via JS + Supabase read |
| Live: stub | Stub pages are draft rows surfaced via the `essay_structure` view (§3); URL to be captured in Phase 4 browser pass (timing method identical) |
| Live: domain | apex 308 → vercel.app; www 200 (§0) |

## 11. Owner claims K1–K6 after Phase 2

| # | Claim | Status after Phase 2 |
|---|---|---|
| K1 | Backup secrets missing from GitHub Actions | **CONFIRMED.** `gh run view 37242617434 --log-failed` shows the dump step's env block with both secrets empty and `FATAL: VITE_SUPABASE_URL not set (checked .env and the environment).` Runs on 09-30, 10-01, 10-02, 10-03, 10-04 all `failure`. No backup has been produced by the schedule; artifact gate can never pass. Owner-only fix (repo secrets) |
| K2 | `sectionPhaseConfig.ts` dead | **CONFIRMED** (zero importers; see §2) |
| K3 | No safety net for a never-saved essay | Partial: autosave writes a revision + row for never-published essays and `useDraftRecovery` probes backups; whether any vector remains (e.g. before first autosave fires, publish-time loss) → Phase 3/4 |
| K4 | Share cards identical across essays | **CONFIRMED on the live site, but for a different reason than the code:** production predates the per-card prerender (§0), so every route serves the generic card with relative `og:image`. The current code draws a distinct card per essay (`scripts/lib/shareCard.mjs`, `docs/review/share-cards/manifest.json` + PNGs). Fix is redeploy, owner-side |
| K5 | `SESSION_LOG` / README stale | `docs/SESSION_LOG.md` exists (review pending, Phase 5); README read — edge-function and env sections match current code; full stale-reference sweep in Phase 5 |
| K6 | Vercel minutes wasted by needless rebuilds | Superseded by a bigger delivery finding: production appears **not to rebuild at all** (stale since ~Aug 1, §0). Whether branch previews burn minutes is undeterminable from the repo (§9). Owner-only dashboard check |
