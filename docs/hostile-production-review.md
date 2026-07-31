# Hostile Production Review — Product + Engineering

## Phase 0 — Product map (PM first)

### Personas inferred from implementation
1. **Visitor/Reader (anonymous)**
   - Reads published essays and educational pages across Finance, Accounting, Green Transition, Next Big Thing, Critical Thinking, Books, IELTS.
   - Evidence: public routes and section navigation in app router and header navigation.
2. **Admin/Editor (authenticated admin role)**
   - Uses Writer's Studio and Content Dashboard to create/edit/publish/delete essays and manage content health.
   - Evidence: admin routes and admin-only checks in dashboard/content pages.
3. **Signed-in non-admin user**
   - Has auth/session but does not get admin access; can use non-admin pages and some personal finance workflow.
   - Evidence: role checks and user-scoped finance tables/functions.

### Jobs-to-be-done by persona
- **Visitor**: discover sections, browse essays, read article details, navigate related content.
- **Admin**: create draft, edit metadata/content, validate tone/figures, publish/unpublish, delete content, review health.
- **Signed-in non-admin**: sign in/sign up, use personal finance tooling.

### Current IA (information architecture)
- **Global routes**: `/`, `/auth`, major section hubs, detail pages, tools, and admin routes.
- **Section hubs**: Accounting, Finance, Green Transition, Next Big Thing, Critical Thinking, Books, IELTS.
- **Content types in active use**: essays, FSLI pages, books uploads, content blocks, sections metadata.
- **Navigation model**: desktop dropdown nav + mobile nav + footer links.

### Critical funnels status
- **Read funnel**: present (home → section feed/list → essay detail).
- **Search funnel**: present only as local in-page filters on section/feed/admin pages; no global search entry point.
- **Subscribe funnel**: **missing journey** (no newsletter/subscribe capture route/component).
- **Contact funnel**: **missing journey** (no contact page/form/path in IA).
- **Publish funnel**: present (admin dashboard/content/writer editor with draft/publish controls).

### Admin workflow map
- **Create draft**: present (`/admin/content/new`, `/admin/writer/:section/new`).
- **Edit**: present via content editor and writer editor.
- **Add images/figures**: present via `EssayEditor` + image/figure uploaders and figure validation.
- **Preview**: present (split preview and preview panel).
- **Publish/update**: present (status transitions + update mutations).
- **Rollback/version restore**: **missing** (no revision history table/API/UI; only current row state).

---

## Phase 1 — UX and content workflow audit

### Issue 1 — Admin route protection is inconsistent (S1)
- **Who it hurts**: Admin/editor, security owner, operations.
- **Scenario**:
  1. Non-admin user opens direct admin/writer editor URL.
  2. Writer editor loads form state and queries content before any explicit hard redirect.
- **Evidence**: `WriterEditor` reads `isAdmin` from auth but never enforces it; no route guard wrapper in router.
- **Proposed change**: Introduce a route-level guard for all `/admin/*` and `/admin/writer/*` paths with immediate redirect to `/auth` or access denied.
- **Expected impact**: lower accidental exposure/confusion and fewer unauthorized write attempts against RLS.
- **Implementation cost**: Low.

### Issue 2 — Publish path split across two editors creates operational drift (S2)
- **Who it hurts**: Admin/editor.
- **Scenario**:
  1. Admin can create/edit from AdminContentEditor and WriterEditor.
  2. Validation/status semantics differ by editor implementation.
- **Evidence**: two distinct editing systems (`AdminContentEditor` + `WriterEditor`) with overlapping save/publish logic.
- **Proposed change**: choose one canonical editor for essay lifecycle; deprecate the other behind feature flag.
- **Expected impact**: faster onboarding, fewer status bugs, reduced training cost.
- **Implementation cost**: Medium.

### Issue 3 — No rollback/revision workflow for published content (S1)
- **Who it hurts**: Admin/editor, readers (quality regressions remain live).
- **Scenario**:
  1. Published essay edited with mistake.
  2. No one-click rollback; manual re-edit required.
- **Evidence**: no revision model/routes/hooks in codebase and no migration for essay revisions.
- **Proposed change**: append-only `essay_revisions` and restore action in admin editor.
- **Expected impact**: lower incident MTTR and safer publishing cadence.
- **Implementation cost**: Medium.

### Issue 4 — Reader acquisition funnels incomplete (S2)
- **Who it hurts**: Visitor growth and retention.
- **Scenario**:
  1. Visitor finishes article.
  2. No subscribe or contact path to convert intent.
- **Evidence**: no subscribe/contact routes/components in router/nav/footer.
- **Proposed change**: add minimal conversion endpoints (newsletter capture + contact intent form).
- **Expected impact**: measurable conversion events and audience capture.
- **Implementation cost**: Low.

### Issue 5 — Search is fragmented and page-local only (S3)
- **Who it hurts**: Visitor and returning reader.
- **Scenario**:
  1. User wants to find topic across site.
  2. Must enter each section page and use local search inputs.
- **Evidence**: multiple local search controls (`EditorialFeed`, `GreenTransitionPhase`, `FsliList`, admin lists) but no global search route.
- **Proposed change**: introduce global `/search` backed by indexed essays/FSLI/books.
- **Expected impact**: faster content discovery and increased read depth.
- **Implementation cost**: Medium.

### Issue 6 — Tone/brand voice is inconsistent across top-level experiences (S3)
- **Who it hurts**: Visitor trust/clarity.
- **Scenario**:
  1. Homepage frames strict technical instruction.
  2. Next Big Thing frames “ideas laboratory” and speculative stance.
- **Evidence**: contrasting copy and interaction framing across `Index` and `TheNextBigThing`.
- **Proposed change**: define section-level voice contract in CMS and enforce via shared hero pattern.
- **Expected impact**: lower cognitive dissonance; clearer product promise.
- **Implementation cost**: Low.

---

## Phase 2 — Engineering review (mapped to PM priorities)

### 1) Auth and authorization

#### Finding A1 — Client-only admin gating is inconsistent
- **Evidence**: admin pages often gate in component render, but router has no protected route wrapper; writer editor lacks explicit denial path.
- **Risk**: unauthorized UI exposure and repeated forbidden write attempts; noisy error states.
- **Fix plan**: central `<RequireAdmin>` around all admin routes + fallback redirect.
- **PM impact**: safer admin workflow, less confusion for signed-in non-admin.

#### Finding A2 — Admin status fetch is async and can create transient UI mismatch
- **Evidence**: role check deferred in auth state callback; pages rely on `isAdmin` boolean.
- **Risk**: flicker/incorrect nav before role resolution.
- **Fix plan**: hold protected route rendering until role check complete; memoized role query cache.
- **PM impact**: cleaner dashboard entry and fewer false “access denied” flashes.

### 2) Data integrity and API boundaries

#### Finding D1 — Dual publish state (`published` + `status`) increases inconsistency risk
- **Evidence**: queries and filters use both fields; mutations manually sync both; DB trigger mutates status on draft updates.
- **Risk**: divergent states in edge paths and harder analytics truth.
- **Fix plan**: make `status` canonical, derive `published` in DB view or generated column.
- **PM impact**: reliable publish metrics and consistent list filtering.

#### Finding D2 — Direct client table writes across many components
- **Evidence**: components call supabase `.from(...).insert/update/delete` directly.
- **Risk**: duplicated write rules and hard-to-audit business logic.
- **Fix plan**: move high-risk writes to RPC/edge functions with contracts.
- **PM impact**: fewer content incidents; faster policy changes.

### 3) CMS and editor reliability

#### Finding C1 — Two parallel editors with overlapping lifecycle logic
- **Evidence**: `AdminContentEditor` and `WriterEditor` each implement loading, dirty tracking, validation, save/publish.
- **Risk**: behavior drift and defects duplicated.
- **Fix plan**: consolidate to one editor domain module.
- **PM impact**: reduced admin time-to-publish.

#### Finding C2 — No revision history / rollback
- **Evidence**: no revision persistence model or restore flow.
- **Risk**: irreversible bad publish, prolonged outage of content quality.
- **Fix plan**: write-on-publish snapshots + restore UI.
- **PM impact**: safer publishing operations.

### 4) Performance and caching

#### Finding P1 — React Query client uses defaults; no stale/caching strategy
- **Evidence**: `new QueryClient()` without tuned defaults.
- **Risk**: excess refetches, slower repeat navigation.
- **Fix plan**: set `staleTime`, `gcTime`, retry policy by query class.
- **PM impact**: faster browsing, lower perceived latency.

#### Finding P2 — Client-side filtering after broad fetches
- **Evidence**: editorial/admin lists fetch full section sets then filter/search in memory.
- **Risk**: degraded performance as content volume grows.
- **Fix plan**: push search/topic/sort pagination to query layer.
- **PM impact**: faster search and list responsiveness for readers/admins.

### 5) Error handling, observability, recovery

#### Finding E1 — Error handling is largely toast/console-based
- **Evidence**: widespread `console.error`, few structured telemetry hooks.
- **Risk**: low observability in production incidents.
- **Fix plan**: centralized logger + error boundary + request IDs in edge functions.
- **PM impact**: faster incident triage, less downtime impact.

#### Finding E2 — Hard reload used as recovery in key flows
- **Evidence**: `window.location.reload()` in admin/editor paths.
- **Risk**: state loss and slower recovery for admins.
- **Fix plan**: replace with targeted query invalidation and deterministic reset.
- **PM impact**: lower admin friction, fewer abandoned edits.

### 6) Quality: tests, lint, CI, deploy safety

#### Finding Q1 — No test scripts configured
- **Evidence**: package scripts include dev/build/lint/preview only.
- **Risk**: regressions in publishing flow reach production.
- **Fix plan**: add smoke tests for auth gates + publish workflow.
- **PM impact**: safer release velocity.

### 7) Simplification: dead code, duplication, abstractions

#### Finding S1 — Duplicate essay retrieval/wrangling patterns
- **Evidence**: multiple hooks/components fetch essays with similar fields and local filters.
- **Risk**: inconsistent behavior and maintenance overhead.
- **Fix plan**: unify query contracts + shared list/filter utility.
- **PM impact**: faster feature delivery and fewer inconsistencies.

---

## Final deliverable

### A) Product verdict

#### Top 5 product risks blocking growth/credibility
1. Missing conversion journeys (subscribe/contact).
2. No rollback/version recovery for content operations.
3. Inconsistent admin authorization UX (route guard gaps).
4. Dual editor systems with diverging behavior.
5. Fragmented search (no cross-site discovery).

#### Top 5 quick wins (speed to improve publishing + reading)
1. Add route-level admin guard for all admin paths.
2. Add publish rollback MVP (single-step restore to previous revision).
3. Ship global search endpoint + `/search` page.
4. Remove hard page reloads; use query invalidation.
5. Add minimal subscribe and contact forms with event tracking.

### B) Roadmap

#### 2-week roadmap
1. **Goal**: secure admin workflows.
   - Scope: `<RequireAdmin>` for admin routes.
   - Acceptance: non-admin cannot enter admin UI; clean redirect.
   - Owner: FE full-stack.
   - Effort: Low.
   - Dependency: Auth context.
2. **Goal**: stabilize publish semantics.
   - Scope: standardize on `status` in read/write paths.
   - Acceptance: dashboards/lists show consistent status counts.
   - Owner: BE + FE.
   - Effort: Medium.
   - Dependency: DB migration.
3. **Goal**: reduce editor recovery friction.
   - Scope: remove `window.location.reload` from editor flows.
   - Acceptance: recover actions preserve form state.
   - Owner: FE.
   - Effort: Low.
   - Dependency: React Query invalidation map.
4. **Goal**: baseline conversion capture.
   - Scope: `/subscribe` + `/contact` minimal forms.
   - Acceptance: successful submission events logged.
   - Owner: full-stack.
   - Effort: Low.
   - Dependency: storage endpoint.

#### 6-week roadmap
1. **Goal**: resilient publishing.
   - Scope: `essay_revisions`, restore endpoint, restore UI.
   - Acceptance: one-click rollback to previous revision under 1 minute.
   - Owner: full-stack.
   - Effort: Medium.
   - Dependency: schema + admin UI update.
2. **Goal**: unify editor architecture.
   - Scope: consolidate AdminContentEditor and WriterEditor into one flow.
   - Acceptance: single edit/publish path for all essay sections.
   - Owner: FE.
   - Effort: High.
   - Dependency: UX decision + migration plan.
3. **Goal**: scalable discovery.
   - Scope: global search index/query with pagination.
   - Acceptance: median search response <300ms at target dataset.
   - Owner: BE + FE.
   - Effort: Medium.
   - Dependency: DB indexes and ranking rules.
4. **Goal**: production observability.
   - Scope: structured logging + error boundaries + dashboard.
   - Acceptance: top 10 production errors visible with context.
   - Owner: full-stack.
   - Effort: Medium.
   - Dependency: telemetry provider.

#### Do-not-do list (low ROI now)
- Full personalization/recommendation engine before baseline search and conversion funnels.
- New section launches before fixing publishing reliability.
- Visual redesign before resolving IA and admin workflow bottlenecks.
- Advanced AI authoring features before rollback/observability/test safety.

### C) Go / no-go
- **Ready to scale content publishing: NO.**
- **Top 3 must-fix first**:
  1. Route-level admin protection consistency.
  2. Rollback/version restore capability.
  3. Canonical publish state and editor consolidation path.
