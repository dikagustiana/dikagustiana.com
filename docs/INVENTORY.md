# INVENTORY — Dika's Digital Studio

> Phase 0 discovery inventory. Built from a static audit of `src/App.tsx` (routes),
> `src/pages/*`, `src/hooks/queries/*`, `src/components/*`, `supabase/functions/*`,
> and `supabase/migrations/*`. Last updated as part of the full-site upgrade pass.

## 1. Stack

- **Build:** Vite 5 + `@vitejs/plugin-react-swc`, TypeScript 5 (non-strict), Tailwind 3 + shadcn/ui.
- **Data:** Supabase (`@supabase/supabase-js`) + TanStack Query v5.
- **Routing:** `react-router-dom` v6 (`BrowserRouter`).
- **Editor:** TipTap 3 (StarterKit + Link + Placeholder + custom Figure extension), KaTeX for math display.
- **SEO:** `react-helmet-async` via `src/components/SEO.tsx`.
- **Tests:** Vitest (unit + jsdom component) and Playwright (mocked e2e in `tests/e2e`, live in `tests/live`).

Baseline at start of pass: **lint 0 errors / 60 warnings**, **tsc 0 errors**, **116 unit tests pass**, **build OK** (main chunk 1,531 kB / 436 kB gzip — see Performance).

## 2. Routes → Pages (from `src/App.tsx`)

Gating: **[P]** public · **[A]** admin-only (`RequireAdmin`).

### Core
| Path | Page | Data | States present | SEO |
|---|---|---|---|---|
| `/` [P] | `Index.tsx` | `useSelectedEssays(4)` · `useChainModules()` (chain plate, short version under the hero; full chain and its joint readings on request) | loading | ✓ |
| `/about` [P] | `About.tsx` | `useSelectedEssays()` · `useChainModules()` (chain plate; every joint and layer opens a reading, the curriculum list only for a joint with a mapped module) | loading (curriculum list) | ✓ |
| `/auth` [P] | `Auth.tsx` | `useAuth` + form | — | ✗ |
| `*` [P] | `NotFound.tsx` | — | — | ✗ (also `console.error` on every hit) |

### Accounting
| Path | Page | Data | States | SEO |
|---|---|---|---|---|
| `/accounting` [P] | `Accounting.tsx` | static | — | ✓ |
| `/accounting/fsli` [P] | `FsliList.tsx` | `useFsliPages()` | loading | ✗ |
| `/accounting/fsli/:slug` [P] | `FsliDetail.tsx` | `useFsliPage`, `useEssaysByFsliSlug` | loading, error | ✗ |
| `/accounting/consolidated-reporting` [P] | `ConsolidatedReporting.tsx` | static | — | ✗ |
| `/accounting/statutory-reporting` [P] | `StatutoryReporting.tsx` | static | — | ✗ |
| `/accounting/consolidation/:topic` [P] | `ConsolidationDetail.tsx` | `useEssaysByTopic` | loading | ✗ |

### Finance
| Path | Page | Data | States | SEO |
|---|---|---|---|---|
| `/finance` [P] | `FinanceLanding.tsx` | `useFeaturedFinanceEssay`, `useFinanceSections` | loading | ✓ |
| `/finance/finance-in-motion` [P] | `FinanceInMotion.tsx` | static `CONDITIONS` | — | ✓ |
| `/finance/capital-in-motion/:conditionSlug` [P] | `CapitalConditionDetail.tsx` | static | — | ✓ |
| `/finance/finance-in-action` [P] | `FinanceInActionIndex.tsx` | `useFinanceModels` | loading, empty | ✓ |
| `/finance/finance-in-action/:modelSlug` [P] | `FinanceModelDetail.tsx` | `useFinanceModelBySlug`, `useAllFinanceModules` | loading | ✓ |
| `/finance/:track` [P] | `FinanceTrackIndex.tsx` | `useFinanceSectionBySlug`, `useFinanceModulesByTrack`, `useTrackAllEssays` | loading | ✓ |
| `/finance/:track/:moduleSlug` [P] | `FinanceModulePage.tsx` | `useFinanceModuleBySlug`, `useEssaysByModuleId` | loading | ✓ |
| `/finance/:track/:moduleSlug/:essaySlug` [P] | `FinanceEssayPage.tsx` | direct supabase + `useFinanceModuleBySlug` | loading | ✓ |
| `/finance-workspace` [A] | `FinanceWorkspace.tsx` | finance settings/essays/sections/modules | loading | ✗ |
| `/executive-dashboard` [A] | `ExecutiveDashboard.tsx` | static mock | — | ✗ |
| `/finance-101*` | → redirects to `/finance*` | — | — | — |

### Green Transition
| Path | Page | Data | States | SEO |
|---|---|---|---|---|
| `/green-transition` [P] | `GreenTransition.tsx` | static | — | ✓ |
| `/green-transition/climate-finance` [P] | `ClimateFinance.tsx` | `useClimateFinanceEssays` | loading | ✗ |
| `/green-transition/climate-finance/:slug` [P] | `GreenTransitionEssayPage.tsx` | direct supabase | loading | ✓ |
| `/green-transition/tracker` [P] | `GreenTransitionTracker.tsx` | static `trackerIssues` | — | ✓ |
| `/green-transition/tracker/archive` [P] | `GreenTransitionTrackerArchive.tsx` | static | — | ✗ |
| `/green-transition/tracker/:issueSlug` [P] | `GreenTransitionTrackerDetail.tsx` | static | — | ✓ |
| `/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug` [P] | `GreenTransitionTrackerEssay.tsx` | static | — | ✓ |
| `/green-transition/:phase` [P] | `GreenTransitionPhase.tsx` | categories + essays | — | ✓ |
| `/green-transition/:phase/:slug` [P] | `GreenTransitionEssayPage.tsx` | direct supabase | loading | ✓ |

### Development Finance
| Path | Page | Data | States | SEO |
|---|---|---|---|---|
| `/development-finance` [P] | `DevelopmentFinance.tsx` | `useEssays` | loading | ✓ |
| `/development-finance/:phase` [P] | `DevelopmentFinancePhase.tsx` | direct supabase | loading | ✗ |
| `/development-finance/:phase/:slug` [P] | `DevelopmentFinanceEssayPage.tsx` | direct supabase | loading | ✗ |

### Critical Thinking / Books / IELTS / Next Big Thing
| Path | Page | Data | States | SEO |
|---|---|---|---|---|
| `/critical-thinking-research` [P] | `CriticalThinkingResearch.tsx` | static | — | ✓ |
| `/critical-thinking-research/:phase` [P] | `CriticalThinkingPhase.tsx` | `useEssays` | loading, empty | ✓ |
| `/critical-thinking-research/:phase/:essayId` [P] | `CriticalThinkingEssay.tsx` | `useEssay` (param is a **slug**, misnamed) | loading, error | ✓ |
| `/books-academia` [P] | `BooksAcademia.tsx` | `useBookCategories` | loading, error | ✓ |
| `/books/categories` [P] | `BooksCategories.tsx` | static | — | ✗ |
| `/books/:category` [P] | `BooksList.tsx` | **hardcoded sample data** (bug — `useBooks` unused) | — | ✗ |
| `/books/:category/:bookId/read` [P] | `BookReader.tsx` | placeholder | — | ✗ |
| `/english-ielts` [P] | `EnglishIelts.tsx` | static | — | ✓ |
| `/the-next-big-thing` [P] | `TheNextBigThing.tsx` | `EditorialFeed` | (in feed) | ✓ |
| `/the-next-big-thing/:slug` [P] | `NextBigThingEssayPage.tsx` | direct supabase | loading | ✓ |

### Admin tools
| Path | Page | Data | SEO |
|---|---|---|---|
| `/personal-finance` [A] | `PersonalFinance.tsx` | direct supabase (`finance_accounts`, `finance_transactions`) | ✗ (also `console.log` noise) |
| `/dikas-tools` [A] | `DikasTools.tsx` | static | ✓ |
| `/dikas-tools/remora-trading` [A] | `RemoraTrading.tsx` | remora_* tables + edge fns | ✓ |
| `/dikas-tools/quant-engine` [A] | `DikaQuantEngine.tsx` | quant_* tables + edge fns | ✓ |
| `/model`, `/model/test` [A] | `ModelPlatform.tsx`, `ModelTest.tsx` | static placeholders | ✗ |
| `/forecasting/{input,assumptions,output}` [A] | `Forecasting*.tsx` | placeholders (unimplemented) | ✗ |
| `/settings`, `/debug/auth` [A] | `Settings.tsx`, `DebugAuth.tsx` | `useAuth` | ✗ |
| `/admin/dashboard` [A] | `AdminDashboard.tsx` | `useAdminEssays`, `useSections` | ✓ |
| `/admin/health` [A] | `AdminHealth.tsx` | static checks | ✗ |
| `/admin/content` [A] | `AdminContent.tsx` | `useUnifiedContent`, `useContentStats`, `useSections` | ✓ |
| `/admin/writer/:id` [A] | `domains/writing/WriterStudio.tsx` (lazy) | `useWriterEssay`, `useWriterSections`, `useWriterCategories` | ✓ |
| `/admin/writer/:section/list` [A] | `WriterListPage.tsx` (thin) | — | ✗ |
| `/admin/writer/:section/:slug` [A] | `WriterEditorPage.tsx` (thin) | — | ✗ |
| `/admin/content/:id` [A] | `AdminEditorRedirect.tsx` | → `/admin/writer/:id` | — |

**SEO coverage at baseline: ~31/58 pages. 27 pages missing `<SEO>`.**

## 3. Data hooks (`src/hooks/queries/`)

`useEssays`, `useEssay`, `useFeaturedEssays`, `useEssaysByFsliSlug`, `useEssaysByTopic`, `useEssaysBySection` (`useEssays.ts`); `useFinance*` (sections/settings/modules/track essays, `useFinance.ts`); `useFinanceModels.ts`; `useFinanceTrackEssays.ts`; `useFsliPages.ts`; `useSections.ts`; `useCategories.ts`; `useContentBlocks.ts`; `useBooks.ts` (`useBooks`/`useBook`/`useBookCategories`); `useAdminEssays.ts`; `useUnifiedContent.ts`; `useSelectedEssays.ts`. Writer-domain hooks: `useWriterEssay` (+ `useSaveEssay`, `generateUniqueSlug`), `useWriterSections`, `useWriterCategories`.

## 4. Contexts / guards

- `src/contexts/AuthContext.tsx` — session + `isAdmin` (via `user_roles` lookup), `signIn/signUp/signOut`.
- `src/components/auth/RequireAdmin.tsx` — admin route guard.

## 5. Edge functions (`supabase/functions/`)

| Function | Auth | External secret | Notes |
|---|---|---|---|
| `detect-recurring` | JWT | — | recurring-payment detection |
| `spending-insights` | JWT | `LOVABLE_API_KEY` (Gemini) | AI advisor |
| `parse-bank-statement` | open | `LOVABLE_API_KEY` | text/CSV → transactions |
| `parse-pdf-statement` | open | `LOVABLE_API_KEY` | PDF/image → transactions |
| `quant-data-fetch` | service-role | Yahoo Finance (no key) | OHLCV ingest; auto-creates stocks |
| `quant-features`/`quant-regime`/`quant-signals`/`quant-backtest` | service-role | — | quant pipeline; backtest lacks input validation |
| `remora-health`/`remora-ingest`/`remora-signals` | service-role | — | ingest/signal; ingest lacks `type`/array validation |

**External secrets to provision (queue for live):** `LOVABLE_API_KEY`. Service-role functions need `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in the functions runtime.

## 6. Storage buckets

`essay-images` (public; admin write), `embeds` (public; admin write), `books` (public; admin write), `finance-models` (public; admin write).

## 7. Forms / write surfaces (admin & user)

- **Writer Studio** (`domains/writing/WriterStudio.tsx`) — primary essay editor (insert/update `essays`).
- **AdminContent** / `useUnifiedContent` — bulk publish/unpublish/delete essays + fsli_pages.
- **Personal Finance** — `AddAccountDialog`, `AddTransactionDialog`, `UploadStatementDialog`, `RecurringTransactions`, `SpendingInsights` (insert/update finance_* + invoke edge fns).
- **Finance admin** — `FinanceWorkspace`, `ModelAdminPanel` (update finance_sections/settings/models, upload to `finance-models`).
- **Next Big Thing** — `EssayDialog`/`EssayModule` (insert/update/delete essays).
- **Remora/Quant** — ingestion + pipeline trigger panels.

## 8. Known data-model caveats (see CONTENT_MODEL.md)

- `src/integrations/supabase/types.ts` is **stale**: still shows `essays.fundamental_id` + `finance_fundamentals` (dropped by migration `20260218_003`) and `category_id` as nullable (made NOT NULL by `20260215_001`). Regenerating types requires DB access → queued.
- `essays` has **no `tags` / `meta_description` column** — Writer Studio collected both but they were silently discarded (fixed in this pass).
