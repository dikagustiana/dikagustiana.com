# UPGRADE REPORT — Full-site quality pass

> Living document. Updated as each atomic commit lands. Honesty labels:
> **[E2E]** proven end-to-end against a real DB · **[MOCK]** proven at code/mock level
> (Vitest/mocked Playwright) · **[LIVE?]** needs live-DB verification (queued).

## 0. Coordination (READ FIRST)
- Two branches/PRs must merge **in order: (1) the migration session's branch
  `claude/quirky-albattani-wlphbf`/PR #30, then (2) this upgrade branch
  `claude/keen-galileo-occyc8`.**
- This branch **never touched the live DB**. Everything below is **[MOCK]** unless stated.
- Any new schema is delivered as a **new, unapplied migration** for manual reconciliation.

## 1. Baseline (start of pass)
- Lint: **0 errors**, 60 warnings. Type-check (`tsc -p tsconfig.app.json`): **0 errors**.
- Unit/component (Vitest): **116 passing** across 14 files.
- Build: OK. **Main JS chunk 1,531 kB (gzip 436 kB)** + `hero-manga-texture.png` 1,141 kB →
  chunk-size warning. This is the performance starting point.

## 2. Area summaries (before → after)

### UI/UX & Design system
- _Before:_ Tokens exist (`index.css`/`tailwind.config.ts`); shadcn primitives present.
  Writer Studio surface is a bordered box with a heavy toolbar; metadata always in a sidebar.
- _After:_ (to be filled per commit)

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
- _Before:_ shadcn primitives are largely accessible; dialogs missing `Description`/aria warnings in
  tests; Writer Studio outline buttons are non-functional; no skip link.
- _After:_ (to be filled per commit)

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
- _Before:_ `.env` is git-tracked but contains only the publishable anon key (RLS-protected, safe per
  `.env.example`) for project `rhwzvgklasvitocbbhvi` (≠ task project ref — migration session is
  repointing). No service_role key in client code. Legacy HTML essay content is rendered pass-through
  (sanitization point). All essays are publicly selectable incl. drafts (app-gated).
- _After:_ (to be filled per commit)

### Database readiness
- See §5 and FASE 4 package. No live changes applied.

## 3. Feature status (accurate labels)
| Feature | Status | Label |
|---|---|---|
| (filled as work lands) | | |

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
1. **Merge order:** migration PR first, then this branch.
2. **Live-DB verification (queued):** run the mocked suites first (`npm run test:unit`,
   `npm run test:e2e`), then the live suite (`npm run test:e2e:live`) once the migration session is
   done. Provision Vercel env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`) and edge-function secrets (`LOVABLE_API_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
3. **Regenerate `src/integrations/supabase/types.ts`** from the migrated DB (it is stale: shows
   dropped `fundamental_id`/`finance_fundamentals`, nullable `category_id`).
4. **Taste calls only you can make:** the Substack editor feel and the hierarchy-placement UX —
   judge by using them.
5. **Functions needing external secrets:** `spending-insights`, `parse-bank-statement`,
   `parse-pdf-statement` (all `LOVABLE_API_KEY`); `quant-data-fetch` (Yahoo Finance).
6. **Product decision:** should draft essays be publicly readable by slug? (Currently yes.)
