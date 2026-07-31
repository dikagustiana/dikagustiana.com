# UPGRADE REPORT — Full-site quality pass

> Living document. Updated as each atomic commit lands. Honesty labels:
> **[E2E]** proven end-to-end against a real DB · **[MOCK]** proven at code/mock level
> (Vitest/mocked Playwright) · **[LIVE?]** needs live-DB verification (queued).

## 0. Coordination (READ FIRST)
- This upgrade is **PR #31** (`claude/keen-galileo-occyc8` → `main`). It is **clean and independent**
  against `main` (which already contains the merged PR #30 editor/test baseline).
- A concurrent session owns the **live DB migration** (branch `claude/quirky-albattani-wlphbf`). This
  branch **never touched the live DB or any migration file** and pushes only to its own branch/PR.
- **Deploy order:** apply the DB migration FIRST, then deploy this frontend — it expects the migrated
  schema (`category_id` NOT NULL, `fsli_slug`/`topic`, `finance_modules`). Don't double-apply.
- Everything below is **[MOCK]** unless stated. No new migration files were added (only a generated
  convenience bundle `docs/db/import.sql`).

## 1. Baseline (start of pass)
- Lint: **0 errors**, 60 warnings. Type-check (`tsc -p tsconfig.app.json`): **0 errors**.
- Unit/component (Vitest): **116 passing** across 14 files.
- Build: OK. **Main JS chunk 1,531 kB (gzip 436 kB)** + `hero-manga-texture.png` 1,141 kB →
  chunk-size warning. This is the performance starting point.

## 2. Area summaries (before → after)

### UI/UX & Design system
- _Before:_ Tokens exist (`index.css`/`tailwind.config.ts`); shadcn primitives present.
  Writer Studio surface is a bordered box with a heavy muted toolbar; **no autosave** (only a static
  "Unsaved" dot); outline items were dead buttons.
- _After (Writer Studio):_
  - **Silent autosave** (1.5s debounce) once the essay exists + has title/section/category, with a
    live **Saving / Saved / Unsaved / Save failed** status chip in the top bar. Autosave skips the
    publish gate and preserves the current status; manual Save/Publish keep full validation + toasts.
    [MOCK — `canAutosave` gate unit-tested; full debounce wiring verified by tsc/build, not e2e]
  - **Calmer one-column surface:** removed the editor's bordered "box" and heavy muted toolbar
    (now a light, blurred, sticky strip), and aligned body text with the title/deck so it reads like
    the page, not a form field.
  - **Outline is now clickable** — jumps to the matching heading (respects `prefers-reduced-motion`).
- _Still TODO (needs visual QA — only judgeable by using it):_ selection **bubble menu** + empty-line
  **"+" insert menu**, moving metadata into a "Publish settings" drawer, and making editor typography
  byte-for-byte match the published `ArticleBody`. Deferred deliberately: these are visual/interaction
  changes I can't verify without a browser in this environment.

### Content hierarchy & routing / Writer Studio
- _Before:_ Placement = Section → Category (+ Finance Module). No way to place into FSLI (`fsli_slug`)
  or Consolidation (`topic`); category only enforced on publish; dead `tags`/`meta_description`.
- _After:_ New **pure placement module** (`src/domains/writing/schema/placement.ts`) is the single
  source of truth mapping editor selections → both the DB fields written and the public URL, so the
  saved row always matches how the public page queries. [MOCK — 16 placement tests]
  - **Accounting placement panel** added: data-driven **FSLI line-item** selector (from `fsli_pages`)
    sets `fsli_slug`, and **Consolidation topic** selector (shared `config/consolidationTopics.ts`,
    also used by the public page) sets `topic`. An admin can now place an essay on e.g. "Cash
    Equivalents" and it resolves to `/accounting/fsli/cash-equivalents`.
  - **Category now required on every save** (was publish-only) → no opaque FK error, upholds the
    NOT-NULL `category_id` integrity (no orphan essays).
  - Switching section **clears stale cross-section fields** (finance & accounting) so essays never
    carry another section's placement.
  - Dead `tags`/`meta_description` inputs removed (no such columns existed; input was discarded).
  - URL preview unified via `buildCanonicalUrl`; fixed dev-finance preview that previously dropped
    the `:phase` segment; shows a clear "not reachable" hint for accounting essays with no leaf.

### Function correctness
- _Before:_ `BooksList` renders hardcoded sample data (`useBooks` unused). 8 pages fetch via
  `useEffect`+direct supabase without retry. `quant-backtest`/`remora-ingest` lack input validation.
- _After:_ (to be filled per commit)

### QA / tests
- _Before:_ 116 unit tests; mocked Playwright e2e present; live suite present but DB-gated.
- _After:_ (to be filled per commit)

### Accessibility
- _Before:_ shadcn primitives are largely accessible; dialogs miss `Description`/aria (jsdom warns);
  Writer Studio outline buttons non-functional; no skip link.
- _After:_ Added a **"Skip to content" link** + `#main-content` landmark in `PageLayout`;
  outline buttons are now functional + keyboard-focusable; `prefers-reduced-motion` respected for
  outline scroll; `ErrorBoundary` uses `role="alert"`; TopBar back button has an `aria-label`; 404
  uses semantic markup + a real `Link`. [MOCK]
- _Still TODO:_ pages render their own `<main>` inside PageLayout's `<main>` → **duplicate `main`
  landmark** (pre-existing; fix by switching inner page wrappers to `<div>`); some shadcn `Dialog`s
  lack `DialogDescription`/`aria-describedby` (jsdom warns); full keyboard/contrast/AA audit needs a
  browser (queued).

### Performance
- _Before:_ single main JS chunk **1,531 kB (436 kB gzip)** + chunk-size warning. [MOCK]
- _After:_ route-level `React.lazy` + vendor `manualChunks`. Main entry now **137 kB (43.7 kB gzip)**;
  vendors split into `react-vendor` 186 kB (61.6 gz), `supabase` 172 kB (44.4 gz), and the **`editor`
  (TipTap+ProseMirror) 377 kB (120 gz) is deferred** to editor routes only. **Chunk-size warning
  gone.** Initial shell ≈ 44 + 61.6 + 44.4 + 21.3(css) ≈ **171 kB gz vs 436 kB gz before (~61%
  smaller)**. Each page is its own small chunk. [MOCK — `npm run build`]
- _Still TODO:_ `public`/`assets` `hero-manga-texture.png` is 1,141 kB (homepage LCP image) — needs
  image re-encode (webp/resize); not done (no image tooling guaranteed in CI). Queued.

### SEO
- _Before:_ audit flagged ~27 pages without `<SEO>`; SEO component had no canonical; no sitemap.
- _After:_ `SEO` component now emits a **`<link rel="canonical">`** (origin+path) on every page that
  uses it and supports **`noindex`**. Verified that most "missing" pages actually render SEO via
  `ArticleShell` (audit grepped `<SEO>` literally and undercounted). Added `<SEO>` to the genuinely
  missing public pages: FsliList, FsliDetail, ConsolidatedReporting, StatutoryReporting,
  ConsolidationDetail, BooksCategories (plus BooksList/BookReader from the Books fix). Added
  `noindex` to Auth and the polished 404. [MOCK]
- _Still TODO:_ `sitemap.xml` requires the production domain (site is CSR; SEO is client-rendered —
  consider prerender/SSG for crawlers that don't run JS). Queued.

### Security (static)
- _Before:_ `.env` git-tracked (publishable anon key only — RLS-protected, safe per `.env.example`).
  Concerns flagged: rich-content render sanitization; drafts publicly selectable.
- _After (verified statically):_
  - **No `service_role`/`sb_secret_`/secret strings in the client bundle** (`dist/`) or `src/`. ✓
  - Primary public renderer **`ArticleBody` builds React nodes from TipTap JSON (no
    `dangerouslySetInnerHTML`)** → XSS-safe by construction; the JSON→HTML serializer also escapes
    text + attributes. ✓
  - `npm audit`: 20 advisories, **but the production-tree ones (`ws`, `yaml`, `rollup`) are
    build/tooling deps and are NOT in the shipped browser bundle** (verified). Remediation:
    `npm audit fix` (run + re-verify build/tests; deferred here to avoid an unverifiable dependency
    bump during the concurrent migration session).
- _Residual / TODO:_ a few pages (`CriticalThinkingEssay`, `FinanceModulePage`) use
  `dangerouslySetInnerHTML` for legacy HTML content — low risk (writes are admin-only via RLS) but
  should be sanitized with DOMPurify on the legacy-HTML path (not added blindly; would need visual QA
  for figure/KaTeX). Product decision still open: drafts are publicly selectable by slug.

### Database readiness
- No live changes applied. Run-ready package added: **`docs/DB_READINESS.md`** (apply order, exact
  Vercel env vars, storage buckets, edge-fn secrets, prod admin grant, queued live verification) and
  **`docs/db/import.sql`** (38 migrations concatenated in timestamp order for a one-shot import into a
  fresh/empty DB). Reconcile with the concurrent session's applied state before pushing. [LIVE?]

## 3. Feature status (accurate labels)
| Feature | What changed | Label |
|---|---|---|
| Route code-splitting / bundle | lazy routes + manualChunks; main 436→44 kB gz | [MOCK] build |
| Global ErrorBoundary | recoverable fallback on render error | [MOCK] 3 tests |
| BooksList / BookReader | wired to `useBooks`/`useBook` + states + file viewer | [MOCK] 5 tests |
| Writer Studio placement | pure module maps selection→DB fields + URL | [MOCK] 16 tests |
| FSLI/Consolidation placement | new accounting panel (fsli_slug / topic) | [MOCK] |
| Category-required save | validates section+category on every save | [MOCK] |
| Writer Studio autosave + status | debounced silent save, status chip | [MOCK] gate tested; wiring by build |
| Calmer editor surface | borderless, light toolbar, clickable outline | [MOCK] build; **visual QA needed** |
| SEO canonical + sweep | canonical/noindex + missing public pages | [MOCK] |
| Skip link / a11y | skip-to-content, focusable outline | [MOCK] |
| No secrets in bundle | verified `dist/` + `src/` clean | [MOCK] static |
| Edge functions | behavior unchanged; contracts documented | [LIVE?] needs secrets |
| All DB-backed reads/writes | unchanged queries; schema cross-checked | [LIVE?] after migration |

## 4. Bugs found & fixed
- **BooksList ignored its data hook** — rendered 3 hardcoded sample books; uploaded books were
  invisible. Now queries `useBooks({category})` with full states. [MOCK]
- **BookReader was a fake placeholder** ("Page 1 of 1"); now loads the real book + embeds/downloads
  the file from the `books` bucket. [MOCK]
- **Writer Studio discarded `tags` & `meta_description`** (no such columns) — removed. [MOCK]
- **Writer Studio draft-save with no category** hit an opaque DB FK error — now validated. [MOCK]
- **Writer Studio could not place essays into FSLI/Consolidation** — added placement. [MOCK]
- **Dev-finance URL preview dropped the `:phase` segment** — fixed in `buildCanonicalUrl`. [MOCK]
- **No global error boundary** — a render error white-screened the app; added one. [MOCK]

### Found & fixed during adversarial self-review (Phase 5)
- **Autosave could silently publish a draft without validation** if the Status dropdown was set to
  "published" (silent save skipped the publish gate). Fixed: autosave now uses the last *persisted*
  status (`lastSavedStatusRef`), never the dropdown — publishing stays an explicit, validated action.
- **Autosave caused an editor-state stomp / data-loss window**: `onSuccess` invalidates
  `['writer-essay']` → refetch → the load effect re-ran on every save and reset `contentJson` from the
  server while the live TipTap DOM kept newer text. Fixed: the load effect now runs **once per essay
  id** (`loadedIdRef`), so a background refetch never overwrites in-progress edits. (Also fixes
  pre-existing churn after manual saves.)
- **Outline click scrolled to the wrong heading** when empty headings existed (outline filtered them,
  DOM index didn't). Fixed: `scrollToHeading` filters empty headings to match.
- **ErrorBoundary "Try again" couldn't recover chunk-load failures** (React caches the rejected lazy
  import). Fixed: chunk-load errors now trigger a full reload; ordinary render errors still soft-reset.
  [MOCK — all four covered by reasoning + tests where unit-testable; 145 tests green]

## 5. New migrations queued (NOT applied)
- _None applied._ Optional, only-if-wanted SQL for per-essay SEO meta (the `snippet`/deck already
  serves as the SEO description today, so this is low priority):
  ```sql
  -- Run on a fresh/empty DB or after the migration session reconciles; then regen types.ts.
  alter table public.essays add column if not exists meta_description text;
  alter table public.essays add column if not exists tags text[];
  ```

## 6. Performance numbers
- (before/after chunk table)

## 7. A11y & security findings
- (filled per commit)

## 8. WHEN YOU WAKE UP (prioritized)
1. **Reconcile the two PRs:** ensure the DB-migration session's work is applied to the live DB, then
   merge **PR #31** (this one). See `docs/DB_READINESS.md` for the exact runbook (env vars, buckets,
   secrets, admin grant).
2. **Live-DB verification (queued):** mocked suites first — `npm run test:unit` (145, no backend) and
   `npm run test:e2e` (needs `npx playwright install chromium`; browsers couldn't be installed here) —
   then `npm run test:e2e:live` once the schema is ready.
3. **Regenerate `src/integrations/supabase/types.ts`** from the migrated DB (it's stale: shows dropped
   `fundamental_id`/`finance_fundamentals` and a nullable `category_id`). Then re-run `tsc`.
4. **Taste calls only you can make (use it to judge):** the Substack editor *feel* — I delivered the
   calm surface + autosave + clickable outline, but deferred the **selection bubble menu**, empty-line
   **"+" insert menu**, the **"Publish settings" drawer**, and making editor typography match
   `ArticleBody` exactly (all need a browser to judge). Also sanity-check the **hierarchy-placement**
   per section against your real category/phase naming (phase is derived from category slugs).
5. **Functions needing external secrets:** `spending-insights`, `parse-bank-statement`,
   `parse-pdf-statement` (`LOVABLE_API_KEY`); service-role functions need `SUPABASE_SERVICE_ROLE_KEY`.
6. **Reasonable cleanups (low risk, deferred to stay verifiably green):** `npm audit fix` for
   build-tooling advisories; DOMPurify on the two legacy-HTML `dangerouslySetInnerHTML` render paths;
   fix the duplicate `<main>` landmark (pages nest `<main>` inside PageLayout's `<main>`); add
   `DialogDescription` to dialogs that warn; re-encode the 1.14 MB `hero-manga-texture.png`.
7. **Product decisions:** should draft essays be publicly readable by slug? (Currently yes, app-gated.)
   Do you want a per-essay `meta_description` column (SQL ready in §5)?
