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
- _After:_ (to be filled per commit)

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
- _Before:_ see Baseline (1.53 MB main chunk).
- _After:_ (to be filled per commit — chunk count + sizes)

### SEO
- _Before:_ 27/58 pages missing `<SEO>`; SEO component has no canonical; no sitemap.
- _After:_ (to be filled per commit)

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
- (filled per commit)

## 5. New migrations queued (NOT applied)
- (filled if/when added)

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
