# SESSION LOG — Supabase greenfield rebuild

Append-only. Newest entry first. A fresh session must be able to resume from this file.

## NEXT ACTION (single)
**Land the PR #11 ⇄ PR #10 reconciliation.** Two sessions independently implemented the
"writing an essay, and reading one" mandate; PR #10 merged first, and PR #11's branch now
carries the merge that reconciles them (one implementation per feature — see the merge
commit message for which side won where). Remaining: post-merge re-verification results in
the ledger stay green, PR #11 review comment addressed (takeaways guidance strict when
lessonType is null), then merge PR #11. The s7-* test identities are already deleted;
fresh namespaced identities used for post-merge re-checks must be deleted the same way.

## 2026-08-01 (session 7) — writing an essay, and reading one: Sections 1–5

Branch `claude/writing-reading-s1`. `3c9f78b` (Section 1), `30763f4` (Sections 2–3),
`e70d40f` (Section 4), plus the Section-5 commit. GATES W1–W5 all **PASSED** —
measurements in `docs/GATE_LEDGER.md`.

- **Essay page (W4).** Sticky ToC sidebar at lg:+ in both shells via an `ArticleToc`
  sidebar variant (the mandate named `LongformArticleShell`, but readers actually hit
  `ArticleShell` — no module has track_slug `finance-in-motion`; both got the pattern,
  the gate was measured on the reachable one). Root cause found: unconditional
  `html { scroll-behavior: smooth }` made even `behavior:'auto'` glide — now gated
  behind `prefers-reduced-motion: no-preference`. ReadingProgress is rAF-coalesced and
  compositor-only.
- **Consistency (W5).** ui-audit on the reading surfaces: 12 findings, 11 fixed, 1
  recorded — full table with dispositions in `docs/UI_AUDIT_READING.md`. The 24 FSLI
  pages stopped lying: no more shared cash-equivalents boilerplate, stock photo, fake
  key points, or `Updated 6 Sep 2025` — unwritten sections say "Not written yet." and
  each page shows its own real reported figures. The five @tiptap deps were already
  gone from package.json (removed in `c7e5d12`, merged via PR #9); what the lockfile
  keeps are starter-kit's own transitive copies, which is exactly why the direct
  declarations were redundant.

- **Save path closed (W1).** Autosave re-observed after every save-path change (3,612 words
  recovered); the orphaned tone trigger confirmed dropped and its migration mirrored into
  the repo (`20260801125833` — applied live by a parallel session that never committed the
  file); key-takeaways gate scoped per `lesson_type`, both arms observed on real stubs;
  Topic/Phase/finance_section now derive from module placement — one field instead of three.
- **Editor access (W2).** Admin: 4 pencil affordances, draft titles route to the editor, an
  empty real stub (`sf-01-04`) opens the editor and saves. Non-admin and anon: zero pencils,
  zero drafts, and anon `GET /essays?published=eq.false` → `content-range: */0` at PostgREST.
- **Reading path (W3).** FinanceTrackIndex rows are real links (were plain text); the
  hardcoded `Draft · Dika Gustiana` byline replaced with real status/author/read-time;
  RelatedEssays + RelatedContent moved onto `essayUrl` (last two local builders);
  `/finance/wrongtrack/wrongmodule/fa-07-01` now redirects to the canonical placement.
  Route count reconciled: 66 `<Route path>` = 65 swept + `*` catch-all.
- **Parallel-session interference, again.** Mid-run, the previous sweep test accounts were
  deleted by an active parallel session (login started failing with `invalid_credentials`;
  SQL showed only `import-admin` remained, freshly signed in). Re-minted session-namespaced
  `s7-admin@` / `s7-user@` per the mandate's naming rule; probes then passed unmodified.
  These identities must be deleted at session end.
- **Harness.** The local CORS relay is hardened (`keepAliveTimeout=0`,
  `maxRequestsPerSocket=1`, `Connection: close`) and runs as a managed background task —
  the earlier `ERR_CONNECTION_RESET` failures under Playwright are gone.
- **Explicitly NOT this session** (per mandate, unchanged from session 6 findings):
  `books_uploads` / `finance_models` still have no insert path and `ModelAdminPanel` stays
  unreachable by construction; curriculum Sections 05/06 have no data path; the six
  zero-unique-commit branches remain (git proxy rejects delete-pushes — owner deletes in
  the GitHub UI); GATE 7's verdicts still live in `docs/gates/GATES_5_7.md` and want
  transplanting into the ledger.

## 2026-08-01 (session 7, Fable) — reconcile, close gate gaps, every title reaches its essay

Single session, no parallel branch. All work on `claude/dikagustiana-sections-5-7-q0jja0`
restarted from `main` (`a1c2e50`, the PR #9 merge — Section A's merge had already landed
before this session began).

- **P0 found and fixed: every essay save in production was dead.** The
  `validate_essay_tone_fields` trigger still referenced all four dropped `*_fields`
  columns, so since the column drop every INSERT/UPDATE on `essays` raised
  `42703: record "new" has no field "manager_fields"` — reproduced, then trigger+function
  dropped via `apply_migration`, then a real in-app Save Draft observed succeeding.
  Nobody had re-run a save after the drop landed. Reads looked fine throughout.
- **GATE A–G all PASSED** — evidence in the ledger. Headlines: autosave recovered
  **3,200 of 3,200** words after a hard reload; track-index essay rows are now links with
  real status/author (the hardcoded `Draft · Dika Gustiana` is gone); mismatched
  track/module URLs redirect to the canonical essay URL; admins get a pencil into the
  editor and drafts stay `content-range: */0` for everyone else; the ToC is a sticky
  sidebar at `lg:` that tracks to the last heading, with reduced-motion respected
  (root cause: `scroll-behavior: smooth` in CSS silently re-animated `behavior:'auto'`
  jumps — now media-gated); books gained their missing insert path, observed end-to-end;
  FSLI pages stopped wearing cash-equivalents prose and fake metadata.
- **Route count reconciled:** 66 = 65 concrete + the `*` catch-all, which the sweep had
  exercised but not counted. Swept in its own right, all three identities, both viewports.
- **`ui-audit` does not exist in this environment** — manual consistency sweep recorded
  in the ledger instead, including four things deliberately not fixed.
- **Two more pre-canonical URL builders found and fixed** (`RelatedEssays`,
  `RelatedContent` — their finance fallback emitted the TRACK route), and
  `AdminDashboard`'s recent-essay lists linked to the retired studio route.
- **Housekeeping done:** test accounts `testuser`, `route-sweep-tester`, `sweep-admin`
  deleted (only `import-admin` remains — owner's item); 5 unreferenced test images and
  the F.1 test PDF removed from storage; test revisions and the stub edit cleaned up
  (`fa-02-01` keeps its correctly derived `phase`/`topic`).

## SESSION B NEXT ACTION (single) — superseded; kept for history
**Run GATE 6.1 — the 3,000-word autosave reload recovery — as soon as Session A records
GATE 1 in a terminal state.** (Done in session 7: see GATE W1 — 3,612 words recovered.)

## 2026-08-01 (session 6, Session B) — Sections 5, 6.2 and 7

Ran concurrently with Session A. Surface split observed throughout: `src/App.tsx`,
`Index.tsx`, `About.tsx`, `AdminContent.tsx`, `LivePreviewPanel.tsx` and the design-token
layer were not touched, and route changes are recorded under `ROUTE CHANGES REQUESTED` in
`docs/gates/GATES_5_7.md` rather than applied.

- **GATE 5 PASSED** at `c7e5d12`, all eight requirements observed on `vite build` +
  `vite preview` against the live project. An image pasted into the body uploads, survives
  save → reload → publish, and is readable anonymously at
  `/finance/analytics/t4-m07/fa-07-01` with the image decoding at 160×100. A non-admin
  upload is refused (403 RLS, observed for both anonymous and authenticated non-admin).
  Text, headings, a link, a figure and a table all survive the round trip, verified per
  block. Preview and published agree because they are now the same component. One
  authoring route. Zero duplicate-extension warnings.
- **The bug the gate existed to catch:** inserting a table crashed the page with a React
  `insertBefore` error and destroyed the editor. It passed `tsc --noEmit` and passed
  `vite build`. Only inserting a table in a browser found it.
- **Four editors deleted** (`WriterModeEditor`, `InlineEssayEditor`, `EssayBodyEditor`,
  `RichTextEditor`) plus `UnifiedEditor`; `WriterStudio` became a redirect so the second
  authoring stack is gone without editing `App.tsx`. Note the mandate's map was one editor
  short — `RichTextEditor` was also configuring StarterKit inline.
- **GATE 6.2 PASSED.** `scripts/dump-content.mjs` written, run, and its output inspected;
  `fa-07-01`'s body (21,954 B / 81 blocks) and presentation (5 references, 3 key takeaways)
  confirmed present. The restore path was then exercised for real — `fa-07-01` was modified
  by the Section 5 verification and restored from this dump.
- **GATE 6.1 BLOCKED** — Session A GATE 1 not terminal (1b pending, 1c CODED-NOT-VERIFIED).
- **GATE 7 PASSED.** All five groups have a verdict, none left unlooked-at. Three swallowed
  PostgREST 406s fixed (`.single()` → `maybeSingle()` plus a real `NotFound`), and
  `BooksCategories` stopped advertising 45 books that do not exist. Two features —
  `books_uploads` and `finance_models` — are half-built: they have read, render and
  empty-state paths but **nothing anywhere can create a row**, so `ModelAdminPanel` is
  unreachable by construction. All 24 FSLI detail pages render the same cash-equivalents
  placeholder prose because `fsli_sections` is empty.
- **For Session A's Gate 3:** the only 375px horizontal overflow found is caused by
  `src/components/Breadcrumb.tsx:15` lacking `flex-wrap`. One word, affects every page with
  four or more breadcrumb items.
- **For Session A's Gate 4:** `src/App.tsx` contains **66** `<Route>` entries, not 68.

## 2026-08-01 (session 5) — gated completion sweep, Section 0 + most of Section 1

- **GATE 0 PASSED.** PR #5 merged (`1d6c7f4`); verified by reading `src/lib/presentation.ts`
  back from `refs/heads/main` via the API, not by trusting the merge response. The four
  legacy persona columns still exist in `information_schema`, so the `_pending` drop is
  correctly unapplied. `@tiptap/html` confirmed absent from `package.json` and the lockfile.
- **GATE 0b BLOCKED.** Both dead branches have 0 unique commits, but the git proxy rejects
  delete-pushes (3 attempts) and no delete-branch tool exists. Needs the GitHub UI.
- **GATE 1a PASSED.** One canonical URL builder (`src/lib/essayUrl.ts`) replaces the four
  that disagreed. The homepage card now emits `/finance/analytics/t4-m07/fa-07-01`; it
  previously emitted `/essays/fa-07-01`, which matched no route. All 16 link targets on `/`
  and `/about` render a real page; zero render the 404 fallback. `tests/unit/essayUrl.test.ts`
  parses the route table out of `App.tsx` and asserts every branch against it, so a
  plausible-looking URL that matches nothing fails the suite.
  - **Finding:** `site-rebuild-note` was published and reachable at *no working URL at all* —
    the homepage linked it to a 404 and `/finance-101/essays/:slug` discarded the slug and
    dumped the reader at `/finance`. `/essays/:slug` now exists: it redirects to the canonical
    URL when placement produces one, and renders the essay when it does not.
- **GATE 1d PASSED.** Published list `select('*')` 58,043 → 1,116 bytes (−98.1%); admin list
  219,390 → 84,164 bytes (−61.6%). Measured against the live REST API, same rows both times.
- **GATE 1c CODED-NOT-VERIFIED.** The thing the gate exists to catch was found: `LivePreviewPanel`
  still read `economistFields` and would have broken the admin preview on the drop while the
  public page kept working. Fixed. `hero_image_url` turns out to be written by nothing — the
  hero image lives in `essays.thumbnail_url`. The scratch-DB rehearsal has not run; the drop
  stays unapplied.
- **GATE 1e CODED-NOT-VERIFIED.** Canonical View-live URL observed once, not reproduced on a
  second run. Not claimed as passed.
- **GATE 1f FAILED, reported not worked around.** A wrong slug inside a *valid* route shape
  never reaches the catch-all, so the improved 404 is unreachable. Two defects surfaced:
  all four essay pages rendered a blank middle for a missing essay (fixed), and an earlier
  `Navigate to="/finance"` still preempts the fix (not fixed — see NEXT ACTION).

### Owner actions (unchanged, none blocking)
Admin signup at `/auth` then the grant, then delete `import-admin@dikagustiana.com`; the Auth
leaked-password toggle; deleting the two dead branches; `supabase functions delete
council-review` (410 tombstone still deployed); attaching the domain; and the framework
document's overview table claiming 55 Fundamentals essays where its own module lists sum to 56
(module detail is authoritative, the seed is correct at 161).


## STATUS (session 4, 2026-08-01): LOVABLE REMOVED (0) + SAFETY-NET MIGRATION (1) + AUTOSAVE (2).
**The blocking item is closed: a 3,612-word paste survives a hard reload with no manual save.**
Project `asypkbkiebjvvpimewfp`. Phase 0: no Lovable anywhere in `src/`, `supabase/functions/`,
`package.json`, `vite.config.ts`, `README.md`; `council-review` is provider-agnostic
(`AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY`, OpenAI chat-completions shape) and renders an explicit
"not configured" state on a missing key (live invoke returns HTTP 503 `council_not_configured`).
Phase 1: migration `20260801042530_content_json_layout_config_revisions` applied live —
`essays.content_json`/`layout_config` added, `essay_revisions` table (admin-only every verb,
anon no access). Both published essays backfilled `content_json` and verified block-for-block
(fa-07-01 headings/list-items identical HTML→JSON→render; 81 top-level blocks); each seeded an
initial `migration` revision. `tsc` ✓, build ✓, 163 tests ✓, security advisors: only the two
documented pre-existing WARNs (`has_role` SECURITY DEFINER, leaked-password toggle).

## NEXT ACTION (single)
**Phase 3 — images in the body**: add the image/figure node through all four places of the
four-place contract (extensions / serialize / ArticleBody / sanitizeHtml allowlist), plus a
ProseMirror paste-drop plugin uploading to the `essay-images` bucket with placeholder swap and
rejection handling. Verify the image survives to an anon read and that a non-admin is refused.

### Owner blockers (carry forward — none doable from a session)
1. **Owner signs up at `/auth`** then a service-side `INSERT INTO user_roles (user_id,'admin')`
   grants admin (self-grant is blocked by design). The TEMPORARY `import-admin@dikagustiana.com`
   admin stays until the owner's account works, then gets deleted.
2. **Set `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY`** (renamed from `LOVABLE_API_KEY` in Phase 0)
   on the edge-function secrets, plus the model mapping the owner chooses. Until then
   `/admin/council` loads and shows the "not configured" state; runs stay disabled. Model
   strings the code still carries (to be replaced by the owner's provider identifiers):
   `DEFAULT_MODEL = 'google/gemini-2.5-flash'` in `supabase/functions/council-review/personas.ts`
   (every advisor + chairman fall through to it; no per-persona override set).
3. **Vercel:** set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` on the project serving
   `dikagustiana.com` and redeploy (Vite inlines env at build time).

Deferred (committed, not applied): `docs/db/pending/`-style full academic-mapping + deck
enrichment for all 49 modules / 105 existing stubs — generated, held back to keep the
applied migration reviewable.

## 2026-08-01 (session 4) — remove Lovable, then make the editor safe to write in

- **Phase 0 — Lovable out.** `grep -ri lovable src/ supabase/functions/ package.json
  vite.config.ts README.md` is clean. Real `README.md` replaces the boilerplate;
  `lovable-tagger` removed from `package.json` + `vite.config.ts` (plugins now `[react()]`,
  `manualChunks` untouched). `council-review` made provider-agnostic: `callGateway(baseUrl,
  apiKey, model, messages)` posts OpenAI chat-completions to `${baseUrl}/chat/completions`;
  a missing `AI_GATEWAY_URL`/`AI_GATEWAY_API_KEY` returns 503 `council_not_configured`
  (verified live), which the UI renders as a non-destructive "not configured" alert via a
  new `CouncilNotConfiguredError`. Model strings surfaced, not chosen — the owner supplies
  provider + mapping (see NEXT ACTION §2). Deployed as `council-review` v2. Committed `0b7959f`.
- **Phase 1 — safety-net migration (one migration).** `20260801042530` adds
  `essays.content_json` (canonical TipTap doc; legacy `content` HTML kept as fallback, not
  dropped) + `essays.layout_config`, and the `essay_revisions` table (id, essay_id FK CASCADE,
  revision_no UNIQUE per essay, change_type CHECK, title/snippet/content_json/layout_config/
  status/voice_role/changed_by=auth.uid()/change_summary/created_at; two indexes; RLS admin-only
  on every verb with inlined `user_roles` EXISTS, INSERT also requires `changed_by = auth.uid()`;
  REVOKE-then-GRANT so anon gets nothing). Dry-run on a scratch Postgres before applying live.
- **content_json backfill, measured not eyeballed.** Both published essays converted at the app
  layer (HTML → `generateJSON(html, getEditorExtensions())`; JSON strings passed through) under
  jsdom, round-trip asserted on heading/list-item counts, then PATCHed live (both 204).
  fa-07-01: h2/h3/li identical before/after, 81 top-level blocks; site-rebuild-note: 5. Each
  essay seeded an initial `change_type='migration'` revision as history's starting point.
  One-off conversion scripts/tests were deleted after use (the recipe lives in the migration
  header); `@tiptap/html` was reverted from `package.json` since no app code imports it yet.
- **Found in Phase 1, deferred to Phase 5:** StarterKit v3 bundles `Link`, so
  `getEditorExtensions()` adding a standalone Link logs a "Duplicate extension names: ['link']"
  warning — fix when trimming StarterKit-redundant extensions.

- **Phase 2 — autosave (the blocking item).** The import test's one hard failure is closed.
  New `src/lib/revisions.ts` (pure decision logic) + `src/hooks/useEssayAutosave.ts` (Supabase
  writes), wired into the WriterEditor stack. Design points that matter:
  - **Autosave writes `essay_revisions`, never the `essays` row.** A backup is not a save, so a
    failed backup can never touch what is already published, and the indicator says "Backed
    up", never "Saved". Promoting a draft stays an explicit, validated action.
  - **Rollup:** consecutive autosaves inside 60s UPDATE the revision this session last wrote
    instead of appending, so a long session yields ~1 revision/minute rather than one per
    keystroke-pause. It only ever rolls up *its own* row — another tab's backup and the
    pre-reload state are never overwritten.
  - **`canonicalJson` is load-bearing, not cosmetic.** Postgres `jsonb` does not preserve key
    order, so a naive stringify comparison would call the document "changed" on every load and
    the recovery prompt would fire forever. Comparison sorts keys; array order is kept.
  - **Recovery is offered, never applied.** A banner with Restore / Keep-saved; neither side is
    destroyed behind the author's back.
  - `canAutosave` now has ONE definition (moved to `lib/revisions`, re-exported from
    `domains/writing/schema/types` for the WriterStudio stack).
  - `EssayEditor` now also emits `getJSON()` so `content_json` comes straight from the editor
    rather than being reparsed out of HTML; manual save writes both, and only writes
    `content_json` when a document exists (a title-only edit must not wipe the canonical body).
- **Phase 2 verified live** (dev server → CORS relay → real project, admin session):
  - 3,612-word paste + a later edit, **no Save clicked**, hard reload → backup indicator read
    "Backed up 04:50 AM"; the essays row stayed empty (`updated_at` unchanged, 0 words in the
    header); recovery banner appeared; Restore returned all 3,612 words including the second
    edit. Both edits collapsed into **one** revision row (191 blocks) — rollup confirmed.
  - **Loud failure:** intercepting `POST /rest/v1/essay_revisions` produced "Backup failed";
    removing the intercept recovered to "Backed up" on the next edit.
  - **RLS boundary, checked by simulating JWT claims in SQL:** anon refused at the GRANT level
    (401, `permission denied`); non-admin authenticated sees 0 of the existing revisions;
    non-admin INSERT refused; an admin forging `changed_by` as another user refused; admin
    INSERT with the default `changed_by` allowed. Probe rows deleted afterwards.
  - `tsc` ✓, build ✓, 184 tests ✓ (17 new `revisions` tests; the old `autosave.test.ts` was
    folded into them).

## 2026-07-31 (session 3) — stand-up + framework-v2 import test

- **The "delete two paused projects" blocker was stale.** The owner's new mandate stated
  there are no paused projects; `list_projects` confirmed only `personal-os`
  (`ascbthsgborseynmmthm`, untouched). `create_project` succeeded immediately:
  `asypkbkiebjvvpimewfp`, ap-southeast-1, free tier.
- **Applied all migrations via `apply_migration`** (never CLI): the 4 verified baseline
  files, then `20260731050000` (adversarial framework-v2 slugs on 4 modules),
  `20260731060000` (cross-tree placement-coherence trigger), `20260731070000` (full
  framework-v2 curriculum: all 49 modules on the `t{n}-m{label}` scheme, 56 Fundamentals
  essay stubs, Section 05 row). 14 tables, RLS on all, advisors clean but the documented
  `has_role` WARN.
- **Wired the app:** `types.ts` regenerated from the live schema (clean swap, as predicted);
  `config.toml` project_id set; `.env` set (production values; gitignored). `council-review`
  deployed with `verify_jwt=true`. Bootstrapped a temporary admin + a permanent non-admin
  test user (service-side, since self-grant is blocked by design).
- **Import test T4-M07-1 (full report: `docs/IMPORT_TEST_T4M07.md`).** Took the real 3,246-word
  "Driver Tree Construction" essay all the way in *through the editor UI* (Playwright), not
  by SQL. Result: 9 of 10 acceptance checks pass. Headings demote H1→h2/H2→h3 with zero
  dropped (10+3); 89/89 source blocks round-trip verbatim; equations survive as bold;
  ANCHORS→References, Post-Flight→body; resolves at its real taxonomy URL; anon reads it
  published and saw 0 of 105 drafts; preview == published (text-level). The **one failure:
  no autosave** in the WriterEditor stack (only WriterStudio has `canAutosave`) — a hard
  reload mid-paste loses work. Other findings: no body-image support (StarterKit has no
  Image node — pasted images silently dropped); Topic/Phase required but redundant for
  curriculum essays; publish requires ≥3 key takeaways the source lacks; body stored as
  HTML not TipTap JSON.
- **The 4 constraint collisions resolved:** slug `t4-m07` (framework's own cross-ref
  convention, since Module 07 exists in 4 sections and slug is globally UNIQUE);
  `sort_order` stays the integer ordinal with the label (`08A`, `QM1`) in
  `module_meta.display_label`; heading demotion; ANCHORS→References / Post-Flight→body /
  equations kept as bold text.
- **Placement coherence enforced by trigger** (a CHECK can't cross tables): a curriculum
  essay (module_id set) must sit in the finance editorial tree. Verified live — giving
  fa-07-01 a green-transition category alongside its module was refused (ERRCODE 23514).
- **Count reconciliation:** framework claims 6/49/160. Seeded 5 section rows (Section 06 is
  models, not essays — out of scope), 49 modules, **161** essay stubs. The 160-vs-161 gap is
  INTERNAL to the source: its overview says 55 Fundamentals essays but its module lists sum
  to 56. Seeded to the module detail (the authoritative side).
- **Draft-leak check passed** at the RLS layer: anon + non-admin see only the 2 published
  essays, 0 of 161 drafts — so no nav/count/"next essay" component can leak a draft.

## STATUS (session 2, 2026-07-31): everything not requiring the project is DONE.
The baseline SQL is fixed, verified by execution, and moved to `supabase/migrations/`.
`docs/SCHEMA_PLAN.md` is written. Still nothing applied to Supabase — no project exists.

## Session 2's NEXT ACTION (superseded by session 3 — kept for the record)
**BLOCKED on the owner, three independent actions. Full detail in `docs/RUNBOOK.md`.**

1. **Delete the two paused 2025 Supabase projects** (`fqayxopcfxlkuftglqbl`,
   `llqehykfmbgjnbwbijfs`) at https://supabase.com/dashboard. Re-confirmed this session:
   `create_project` still returns `BadRequestException: 2 project limit`, and the limit
   counts paused projects. The MCP has no `delete_project` tool. **This blocks everything.**
2. **Vercel** — re-confirmed zero projects in the only reachable team
   (`team_qkOkuTIM75I336YmxaGlDwWZ`). Connect the owning account, or set
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` by hand **and redeploy** (Vite
   inlines env at build time).
3. **Set `LOVABLE_API_KEY`** in the new project's edge-function secrets. No MCP tool for it.

The moment slot 1 frees, `docs/RUNBOOK.md` is a mechanical 8-step sequence.

## 2026-07-31 (session 2)

- **Fixed all 7 reviewed defects** in the drafted SQL (commit `aa29c03`), including both
  blockers: `essays.category_id` got back the DEFAULT the live schema had (pinned to
  `finance-general`), which unbreaks four insert paths while keeping NOT NULL + FK
  RESTRICT; and the published placeholder essay was rewritten to drop four false claims.
- **Built a local dry-run harness** (`docs/db/verify/`) — a throwaway Postgres 16 with the
  Supabase role/schema/default-privilege shape replayed, so the baseline could be executed
  and attacked before touching a real project. Plain `psql`, not a CLI migration command.
- **Running it found an 8th defect that four reading-based review lenses had missed:**
  `REVOKE EXECUTE ... FROM PUBLIC` does not remove `anon`'s EXECUTE on `has_role()`,
  because `ALTER DEFAULT PRIVILEGES` grants it to `anon` *by name* as well. The fix for
  defect 3 was incomplete until it revoked `FROM PUBLIC, anon`. General rule for this
  platform: **a privilege is never absent by default, only ever explicitly taken away.**
  The same trap is what made defect 7 (`admin_audit_log` append-only) real rather than
  claimed — every table now REVOKEs before granting.
- **Defect 4 re-derived rather than patched.** The three `user_roles` write policies were
  worse than non-functional: a targeted admin UPDATE/DELETE matched zero rows and
  *reported success*, and the only DELETE that worked was the unqualified one — which,
  because the visible row set is the caller's own rows, deleted **the admin's own role**.
  UPDATE/DELETE removed; INSERT kept and verified working for granting another user.
- **Verified against real RLS locally:** anon reads the 1 published essay and 0 of 105
  drafts, and holds no write privilege on any of the 14 tables; admin create/update/delete
  round-trips; non-admin blocked everywhere; audit log append-only on both layers;
  self-grant blocked; `(track_slug, sort_order)` uniqueness enforced.
- **Moved the baseline to `supabase/migrations/`** with timestamps that encode dependency
  order (commit `5810bc0`). The old `01/02/03/04` numbering was authoring order and
  contradicted the real order (`01 → 03 → 02 → 04`, because `essays.module_id` has an FK
  to `finance_modules`) — `supabase db reset`, which the live e2e suite depends on, would
  have applied them wrongly. Plain sorted order now works and is verified.
- **Wrote `docs/SCHEMA_PLAN.md`** (commit `587a057`) by introspecting the applied schema
  rather than restating the drafts: 14 tables, 151 columns, 5 enums, 4 functions, 12
  triggers, 3 buckets, the role model, FK actions with reasons, everything cut with
  reasons, and the permanent losses. It corrects the drafts in two places — the initplan
  performance rationale was overstated, and the privilege-layer claims were untrue until
  the REVOKEs were added.
- **Fixed a test that phase 1 left broken** (commit `8b696d9`). `tests/unit/council.test.ts`
  failed to load at all — it read a migration path phase 1 had archived — so the suite
  reported "138 passed" while a whole file silently never ran. It also asserted the
  `has_role()` spelling the rebuild deliberately replaced with an inlined check. Now
  17/17 files, **163 tests**.
- **Type regeneration could not be done offline** (the CLI's `gen types` needs Docker),
  but the diff was determined statically and is a clean swap: 25 cut table types
  disappear and **no cut table is queried anywhere**; `essays.fundamental_id` disappears
  and it appears **only inside `types.ts` itself**; nothing new appears.
- **Verified green:** `tsc --noEmit` ✓, `vite build` ✓, 163 unit tests ✓, 66 route
  declarations in `src/App.tsx` with every element resolving.

## 2026-07-31 (session 1) — status at the time: stopped by the owner on credit cost
No Supabase project was ever created, so no migration ran and the live site is unchanged
(still broken at boot — its deployed bundle has no Supabase URL compiled in). All work is
committed and pushed to `claude/dikagustiana-supabase-rebuild-ioiyd1`. Resume from this file.

### Session 1's next action (superseded by session 2's, above — kept for the record)
**BLOCKED on the owner, one action:** delete the two paused 2025 Supabase projects
(`fqayxopcfxlkuftglqbl`, `llqehykfmbgjnbwbijfs`) at https://supabase.com/dashboard. The
owner approved this but the Supabase MCP exposes no `delete_project` tool, so it cannot be
done from a session. Until a free-project slot exists, `create_project` returns
`BadRequestException: 2 project limit` and NOTHING can be applied.
The moment a slot frees: `create_project(name=dikagustiana-com, region=ap-southeast-1,
org=rwgsxtztlyoiinhbbleh)` → `apply_migration` baseline → `apply_migration` seed →
regenerate types → rewire env → deploy council-review → bootstrap admin → acceptance run.
Baseline SQL and seed SQL are authored and committed under `supabase/migrations/`, so the
apply step is mechanical.

**Second owner action (independent):** the Vercel account connected to this session
(`team_qkOkuTIM75I336YmxaGlDwWZ`) has zero projects, but www.dikagustiana.com is served by
Vercel — the owning account is not reachable from here. Either connect that account, or the
new env vars must be set there by hand (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`). Note the currently-deployed bundle has NO Supabase URL
compiled in at all, so the live site is already broken at boot regardless of the DB.

**Third owner action:** set `LOVABLE_API_KEY` on the new project's edge function secrets.
The MCP has no secret-setting tool. Without it the Writing Council route loads and lists
sessions but a council run returns an error.

**Before applying anything:** `docs/db/pending/README.md` lists 7 defects the adversarial
review found in the drafted SQL — two rated blocker. The `essays.category_id NOT NULL`
change breaks three insert paths and the repo's own RLS test, and the published placeholder
essay overclaims what survived. Fix those first; the SQL has never been executed.

## 2026-07-31 (session 1)

- Branch: `claude/dikagustiana-supabase-rebuild-ioiyd1` (all work lands here; PR → main at end).
- **Restored `src/`** (284 files), `tests/`, 3 public files from `dika-s-digital-studio.zip`;
  all root configs were byte-identical between zip and repo. Commit `1942784`, pushed.
  `tsc --noEmit` ✓, `vite build` ✓.
- **Salvage settled:** old project `rhwzvgklasvitocbbhvi` is deleted from the account
  (not paused). Entire archived git history references only that ref → the two paused 2025
  projects never hosted the site; content authored via CMS after 2026-07-04 is lost.
  No `legacy-dump.sql` possible. Production bundle currently deployed has NO Supabase URL
  baked in (identical hash to an env-less local build) — live site already broken at boot.
- **Vercel:** connected Vercel account/team (`team_qkOkuTIM75I336YmxaGlDwWZ`) has ZERO
  projects — the deployment serving www.dikagustiana.com lives under a different Vercel
  account. Rewiring existing env vars is impossible from here; a fresh deploy +
  domain move will be needed, or the user connects the owning account.
- **Supabase account:** 3 projects; `dikagustiana-prod` (`ascbthsgborseynmmthm`) is the
  user's OTHER app (personal-OS schema, active, touched today) — never touch it.
  Creation of `dikagustiana-com` blocked by 2-active-free-project limit; user approved
  deleting both paused 2025 projects; MCP lacks delete_project → user must do it in
  dashboard; creation being retried automatically.
- **Housekeeping commit `5688d9d`:** zips untracked (`*.zip` ignored), bun lockfiles
  removed (npm proven by bundle-hash match), `typecheck` script added.
- **History:** zip's embedded git history pushed to `archive/pre-rebuild-history`.
- **Analysis workflow** `wf_c3524677-f2d`: 8 parallel agents (route map, CMS core, finance
  curriculum, PF tracker, quant+remora, content inventory, import.sql audit, auth/storage/ops).
  Findings that changed the plan:
  - `docs/db/import.sql` is **STALE** — it concatenates only the first 38 of 43 migrations
    (last header `20260310000954`) and omits exactly the five that matter most: the security
    hardening, `admin_audit_log`, `council_sessions`, and BOTH P0 auth-gating repairs. Using
    it as the baseline would have reintroduced both historical failures and shipped without
    two tables the app queries. `docs/DB_READINESS.md` still says "38 migrations", confirming
    both docs predate the last five migrations. Baseline authored from scratch instead.
  - There are **43** migration files, not 44.
  - **No published content exists anywhere in the repo.** The migrations hold 105 essay
    *draft stubs* (title + slug + module + order, no body, `published=false`) — not "~18
    essays". The 68 fundamentals lesson stubs were deleted by `20260301070510`. All real
    prose lived only in the deleted DB.
  - The 105 stubs hardcode `module_id` UUIDs that **no migration creates** (production-only
    modules), so a verbatim replay FK-fails. Recoverable: module titles are in SQL comments
    and the slug prefix encodes the mapping (`sf-07-03` = strategic-finance module 07).
  - Frontend never calls `supabase.rpc()`; admin is resolved by a direct `user_roles` select
    in `AuthContext.tsx:23-36`.
- **Scope cut** (commit `9268fdb`): personal-finance tracker, quant, remora, 5 placeholder
  admin pages, AdminHealth, and dead `content_blocks` inline editing. 40 tables → 14;
  13 edge functions → 1 (`council-review`). Full reasoning in `docs/DECISIONS.md`.
  `tsc --noEmit` ✓, `vite build` ✓, 162 unit tests ✓ after the cuts.
- **43 old migrations archived** to `supabase/migrations/_archive/` with a README recording
  the two auth-gating failures. `supabase/config.toml` rewritten for the one function.
- **Schema workflow** `wf_69d7acb7-80a`: 3 authoring agents (foundation / cms / finance) +
  4 adversarial lenses each (types-match, src-queries, rls-attack, postgres-valid).
- **Seed workflow** `wf_c2879cfb-282` (complete): reconstructs 8 sections, 24 fsli_pages, 4
  finance_sections, 2 finance_settings, **49 finance_modules**, **105 essay stubs** (module_id
  resolved by subquery on track_slug+sort_order, never a literal UUID), 1 category, and 1
  published placeholder essay so the anon-read acceptance check has a subject. 194 rows.
  The 29 non-fundamentals modules were reconstructed from the `-- Module NN:` comments in the
  three essay-seed migrations, with slug/title/thesis taken from `20260218_002` for the 18
  that had an authored match; the other 11 get a derived slug and a NULL thesis rather than an
  invented one.
- **All drafted SQL is in `docs/db/pending/`** (2,476 lines across 4 files) with each author's
  notes and the full verifier output. Apply order is 01 → 03 → 02 → 04, NOT filename order:
  `essays.module_id` has a FK to `finance_modules`.
- **The drafted SQL is NOT clean.** The schema workflow was stopped mid-verification (9 of 12
  lenses had reported); those 9 plus all 4 seed lenses found 7 blocker/major defects, listed
  with fixes in `docs/db/pending/README.md`. Do not apply before fixing them.

### What is verified working
`tsc --noEmit` ✓ · `vite build` ✓ · 162 unit tests ✓ — all after the module cuts, on a clean
`npm ci`. Every route in `src/App.tsx` either survives or was removed with its page,
components, nav entries, tests and edge functions; 66 route declarations remain of 77.

### What was never reached
Baseline apply · seed apply · RLS verification · types regeneration · env rewiring · edge
function deploy · admin bootstrap · Vercel deploy · the acceptance checklist. `docs/SCHEMA_PLAN.md`
was not written — `docs/db/pending/*.notes.json` holds the same material in raw form.
