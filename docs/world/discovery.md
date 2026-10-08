# Discovery: the Kawasan Industri world on dikagustiana.com

Phase A of `MEGA-PROMPT-kawasan-industri.md`, carried out on 8 October 2026 on branch
`feat/kawasan-industri` (forked from `main` at `bed215d`). No product code was written. Every
item below names the file and lines it rests on, or quotes the command that produced it.

Conventions: line numbers are of the files at `bed215d`. Commands were run from the repository
root with Node v22.22.0 and npm 10.9.4 unless stated. The Factory Yard inspection was done on a
clone pinned to `148758ae19a9b2201245485bf3619ab5e742f8f4` in the session scratchpad, never
inside this repository.

---

## 1. The chain map

### 1.1 Where it lives

| Thing | Where |
|---|---|
| Data file (the authority) | `src/data/industryChain.ts`, 2,293 lines |
| Components | `src/components/industry-chain/` (23 files, 6,511 lines incl. the data file's consumers); public surface in `index.ts`: `ChainPlate`, `IndustryChainPreview`, `IndustryChainSection`, `ChainTargetPanel`, `ChainCurriculumList`, `useChainModules` |
| Wide plate (generated) | `ChainPlateSvg.tsx` (two JSX plates, `ChainPlateWide` the detail and `ChainPlateCompact` the overview) and `chain-plate.css`, both written by `scripts/build-chain-plate.mjs` (`npm run build:chain`) |
| Narrow layout | `ChainColumn.tsx` (847 lines), a React component, not generated |
| Mark reading order (generated) | `chainMarkOrder.ts` (`MARK_ORDER` per shift), written by the same script |
| Controls and selection state | `chainLensContext.ts` (`lens`, `shift`, `selected`, `hovered`, `hidden`) |
| Address contract | `useChainUrl.ts:27-33`: `?lens=<shift>&distance=<lens>&node=<slug>`; the parameter names are the owner's and inverted against the code's names; written with `history.replaceState`, never the router |
| Landing page | `src/pages/Index.tsx:10` imports `IndustryChainPreview`, rendered at `:94` |
| About page | `src/pages/About.tsx:2` imports `IndustryChainSection`, rendered at `:142` |
| Wrappers | `ChainPlate.tsx:789-811`: both are `<section id="industry-chain" className="border-b border-border py-12"><div className="container">…`; the landing one passes `variant="preview" heading="h1"` |
| Finance in Action's view of the chain | `src/lib/finance-in-action/chain.ts` reads `STAGES`, `COLUMNS`, `BANDS`, `slugOf`; `contract/validate.ts:23` names the two spanning layers `band-energy`, `band-logistics` |

**The landing page has no hero.** `Index.tsx:84-94` says so in its own comment ("nothing precedes
it: no hero, no artwork, no argument block") and the preview carries the page's `h1`
(`ChainPlate.tsx:800-811`). PRD §2.1 and §7.1 describe the map as the second screen below an
existing hero; that is no longer the repository's state. See §10.3, item F.

### 1.2 How the data is shaped

All exports are in `src/data/industryChain.ts`.

| PRD word | In the data file | Lines |
|---|---|---|
| Stages | `STAGES: Stage[]` (7): `stage-biological`, `stage-extraction`, `stage-processing`, `stage-packaging`, `stage-manufacturing`, `stage-consumption`, `stage-recovery`; `origin: true` on the two origins | 89-121 |
| Nodes | `NODES` (5): aggregation, trader, principal, distributor, wholesaler; `RETAIL` (5 formats) collapsed to `RETAIL_GROUP` (`node-retail`) | 124-149 |
| Reading order | `COLUMNS` (13 ids) | 155-169 |
| Transfer points (diamonds) | `JOINT_IDS` (11) and `JOINTS: Joint[]` with `from`, `to`, `margin: MarginKind`, `lines[]` (statement lines), `read: LensReading`. The diamond's form comes from `MARGIN_KINDS[margin].mark`: `'filled-diamond'` for `conversion` (a stage sells), `'open-diamond'` for `node-spread` (a node sells), `'square'` for `service-fee` | 173-248, 250-531 |
| Economy hooks | Not a separate list: they are the economy-lens chips on joints, `JOINTS[i].read.economy.chip`: "Inflation enters" (`j-production-aggregation`, l.297), "Export · FX" (`j-extraction-processing`, 316), "First mark-up" (`j-aggregation-processing`, 339), "Producer prices" (362), "Import · FX" (385), "Excise · credit" (427), "Final demand · CPI" (496) |
| Bands (enabling layers) | `BANDS: Band[]` (7, not five or six): `band-logistics` (594), `band-cold-chain` (617), `band-credit` (640), `band-capital` (664), `band-energy` (710), `band-governance` (750), `band-regulation` (770). Fields: `span`, `spanLabel`, `margin?`, `attaches: 'joints'|'stages'|'recipients'|'none'`, `recipients?`, `financesLayers?`, `means`, `lines[]`, `read: LensNote`, `shortages?` (energy only: generation, network, connection) | 547-787 |
| Borders | `BORDERS` (2): `border-export` at `j-extraction-processing` (out), `border-import` at `j-trader-manufacturing` (in) | 825-851 |
| Loops | `RETURNS: ReturnFlow[]` (6): scrap, commercial returns, reusable packaging, post-consumer material, post-consumer organic, secondary market; plus `BYPRODUCT` (forward, not a return) | 853-888 |
| Money and information | `NON_PHYSICAL` (`FlowKind` money/information, both directions) | 892-935 |
| Overlays (shifts) | `ShiftId = 'reindustrialisation' \| 'green'`; `SHIFTS: Shift[]` with `levers`, `criterion`, `read`, `targets: ShiftTarget[]`, `moves`, `callouts`; `TENSIONS` (the conflict written under a shift) | 1019, 1221-1248, 1250-1607, 1617 |
| Condition marks | `ShiftTarget { id, condition?: Condition }`; a target without a condition is parked and draws no mark. `Condition { status, basis, case?, now, holds, lever, mechanism?, action, funds }`, each line a `LensNote` (economy and finance voices), `UNWRITTEN` for empty slots. `ConditionStatus = 'stuck' \| 'moving' \| 'unpriced'`; `STATUS[s].form` = filled / open / dashed. `ConditionBasis = 'assessed' \| 'scenario'`. `CONDITION_AS_OF = '2026-09-14'` | 1038-1123, 1144-1199 |
| Mark numbering | `MARK_ORDER` in `chainMarkOrder.ts` (generated, left-to-right then top-to-bottom), filtered at runtime to targets whose reading is written | `chainMarkOrder.ts:17-38` |
| Evidence lines | **There is no `(value, source, year, link)` field.** What exists: `Condition.basis` and `Condition.case` (the named case an assessed status was read against), and `ESSAY_ASSOCIATIONS` (1771-1802) → `essaysFor(id, shift)` (1815-1819), whose `evidence: true` means "read under the shift that is on, and that shift marks this element as assessed". The map carries no digits by design (`CHAIN_COPY.controls.transfersInside`, 2270-2275) | 1105-1121, 1758-1822 |
| Drill-downs | **None implemented.** The energy band's three shortages are data (`BANDS[energy].shortages`, 744-747) and `CHAIN_COPY.energy` names generation / network / connection / self-supply (2211-2220). The "PLN electricity chain" exists elsewhere, as Capital in Motion conditions (`src/data/capitalConditions.ts:178, 218`, `caseCompany: 'PLN'`) at `/finance/capital-allocation/:conditionSlug`. Nothing in the schematic opens anything in the same frame |
| Public slugs | `SLUGS` (1673-1728): the permanent address of every element; the unit test pins the table verbatim |
| Overview grouping | `OVERVIEW_GROUPS`, `OVERVIEW_HIDES`, `drawnAtOverview` (1898-1986) |

Lens vocabulary: `LensId = 'economy' | 'finance'` (l.74) is what the PRD calls the distance
control; the shift overlay is `ShiftId`. The URL contract swaps the words (`useChainUrl.ts:11-15`).

Essay publication is checked live, never assumed: `useChainEssays.ts` queries `essays` with
`onlyPublished()` for the slugs in `ESSAY_SLUGS`.

### 1.3 Existing tests on the schematic

Unit: `tests/unit/chainPlate.test.tsx`, `chainColumn.test.tsx`, `chainMarks.test.tsx`,
`chainCondition.test.ts`, `industryChain.test.ts`, `chainCurriculumMap.test.ts`, and
`src/components/industry-chain/ChainAudit.test.tsx`. E2E: `tests/e2e/chain.spec.ts` (360 px and
1280 px, both `/` and `/about`, asserts one `.cp-column` on `/`, seven `.cp-bar`, no sideways
scroll) and `tests/e2e/mapLinks.spec.ts`. These must keep passing with the flag off.

---

## 2. Flags

**The site has exactly one flag mechanism: a build-time constant.**

- `vite.config.ts:11-13`: `define: { __FIA_PREVIEW__: JSON.stringify(loadEnv(...).VITE_FIA_PREVIEW === "true") }`.
- `src/vite-env.d.ts:4`: `declare const __FIA_PREVIEW__: boolean;`
- `src/App.tsx:71-79` reads the constant directly in the lazy `import()` so Rollup drops the other branch's chunk entirely.
- `src/lib/finance-in-action/flag.ts:8` re-exports it as `FIA_PREVIEW` for components already inside the preview.
- `vitest.config.ts:14` defines it `'false'` for tests.
- `scripts/assert-no-synthetic.mjs` runs after `vite build` (package.json `build`) and fails a Vercel production build (`VERCEL_ENV === 'production'`) that carries the flag, and any flag-off build whose `dist/` contains the SYNTHETIC marker.
- `.env.example:11-14` documents the variable. There is no runtime flag table, no Vercel Flags SDK, no localStorage flag, no `import.meta.env` read outside `client.ts`, `published.ts` and `DEV` checks (grep in §2 of the command log).

Per environment: Vite inlines `import.meta.env` at build time (README "Environment variables"),
so a flag is set as a Vercel environment variable scoped to Preview or Production and takes
effect on the next deploy. Nothing can be flipped at runtime.

**How `world_kawasan` fits:** a second constant `__WORLD_KAWASAN__` from `VITE_WORLD_KAWASAN === 'true'`
in `vite.config.ts`, declared in `vite-env.d.ts`, re-exported from `src/lib/world/flag.ts`, and
read in the chain slot so that with the flag off the world's chunk is not emitted at all (the
same dead-code property the FIA preview has). A post-build guard like `assert-no-synthetic.mjs`
checks that a flag-off `dist/` contains no world marker. The preview deployment needs
`VITE_WORLD_KAWASAN=true` **and** `VITE_FIA_PREVIEW=true` (see §3.5) set on Vercel for the
Preview environment of this branch; that is a Vercel project setting and under rule 1 the owner
sets it, not the agent.

---

## 3. Finance in Action

### 3.1 The data layer that reads `fsre_published`

`src/lib/finance-in-action/published.ts` (whole file, 32 lines): a raw `fetch` to
`${VITE_SUPABASE_URL}/rest/v1/model_packages?select=package` with headers
`apikey: <publishable key>`, `Accept-Profile: fsre_published`. No session, so PostgREST answers as
`anon`. `[]` when the env is unset; throws `published models answered <status>` when `!res.ok`.
Query key `PUBLISHED_QUERY_KEY`. The hook `usePreviewRegistry.ts` (react-query, `staleTime` 5 min)
merges the published packages into `buildPreviewRegistry()` and reports `'loading' | 'ok' | 'error'`.
`registry.ts` (`buildRegistry`) validates every package with `validatePackage` and `checkFormulas`
before listing it and keeps rejects aside with their issues; `groupAlongChain` orders by
`CHAIN_POSITIONS`.

**Finding: the schema is not reachable from the site today.** Run on 8 October 2026 through the
exact path the module uses (anonymous publishable key, `Accept-Profile: fsre_published`):

```
$ curl -sS -H "apikey: <publishable key>" -H "Accept-Profile: fsre_published" \
    "https://asypkbkiebjvvpimewfp.supabase.co/rest/v1/model_packages?select=package->meta->>ticker"
HTTP 406
{"code":"PGRST106","details":null,"hint":"Only the following schemas are exposed: public, graphql_public","message":"Invalid schema: fsre_published"}
```

So `fetchPublishedPackages()` throws in production and `usePreviewRegistry` is in its `'error'`
state. `mcp__Supabase__list_tables` for schema `fsre_published` returned `{"tables":[]}`; that call
lists tables only, so whether the `model_packages` view exists cannot be told from here, and no
SQL was run against the project (rule 2). **Whether INTP's package exists in `fsre_published`
is therefore unknown and cannot become known from the site until the owner exposes the schema**
(Supabase dashboard → Project Settings → Data API → Exposed schemas; a production setting, owner's
action). Until then the PRD's outage rule applies to every building: "Model status unavailable".

### 3.2 Contract v3.1

`src/lib/finance-in-action/contract/types.ts` (`CONTRACT_VERSION = 'proposal-v3.1'`):

- `PackageMeta`: `ticker`, `name`, `subIndustry` (FSRE code, e.g. `B121`), `chainStage` (a `STAGES` id or `band-energy`/`band-logistics`), `pair[]`, `version` (e.g. `PTBA-2026Q2-r1`), `contentHash`, `asOf.latestQuarter`, `provenance`, `status`, `depth`, `conditionIds`, `skillVersions`, optional `rounding`, `conditionNotes`.
- `UnitEconomics { unit, basisLabel, denominatorRowRef, periods[], lines: UELine[] }`; `UELine { id, label, role, rowRef, driver?: { description, physicalUnit, inputRowRefs }, contains? }`; roles in `constants.ts` `UE_LINE_ROLES`: revenue, cost, subtotal, unsplit.
- `DriverTree { nodes: TreeNode[], edges }` with `rowRef` per node.
- `CellSource { issuer, document, period, page?, note?, xbrlConcept?, docSha256? }`. The `doc:<sha256>#page=n` locator string of proposal P-1 does not exist as a field; the parts exist separately (`docSha256`, `page`).
- `PeerBandEntry { metric, unit, period, value, rowRef? }`; `Workpaper { gates: Gate[] }`.
- **Not in the contract:** `archetype`, escalation records, unsplit records as a list (only `UELine.role === 'unsplit'` with `contains[]`), the formula graph of proposal P-2 (`docs/company-models/implementation-brief-v3.1.md:441` names P-2 as pending). PRD §7.8's "the package names the archetype" has no field yet; the zone fallback will carry every company until it does.
- `contract/links.ts`: `IndustryLink { id, from, to, whatFlows, driverFrom, driverTo, intensity, costShare, demandShare, passThrough, caveat? }`; `isMeasured()` requires both shares sourced (constraint 10).
- Statuses (`constants.ts` `STATUSES`): `published`, `preview`, `in_progress`, `not_started`, each with a glyph.

### 3.3 Model page components to reuse

- Inspector: `src/components/finance-in-action/viewer/model/Inspector.tsx` takes `{ view: ModelView }` from `useModelView.ts` and renders `CellDetail` and `CellSources` (source line via `model/explain.ts`). Reuse on the board means building a `ModelView` for the package with `useModelView`; `Inspector` is not package-only.
- Download: `viewer/model/DownloadButton.tsx` takes the same `view` and lazy-loads `export/xlsx.ts` (ExcelJS) on click.
- Peer band: `src/lib/finance-in-action/peers.ts`, `MIN_PUBLISHED_FOR_BAND = 2`, draws min–max from two published companies. **This contradicts PRD §8.3** ("never a band from two points; one comparator → two marks"). The world needs its own `peerBand` rule; the model page is out of scope to change (mega prompt §14).
- Number formatter: `src/lib/finance-in-action/format.ts` (`formatNumber`, `formatPercent`, `formatDelta`, `formatForRow`, `parseHouseNumber`), house format already: point thousands, comma decimals, brackets for negatives, no `Intl`. PRD D6's two options are the same thing in this repository.

### 3.4 Index and routes

- Index page: `src/pages/finance-in-action/FiaIndexPage.tsx` (StageStrip, CompanyList, IndexFilters, LinkLayer, LinkCard); address params `q`, `condition`, `connections`, `link`.
- Routes: `src/lib/finance-in-action/routes.ts`: `INDEX_PATH = '/finance/finance-in-action'`, `modelPath(ticker)` lower-case, `subIndustryPath(code)` as `#sub-<code>` anchors. `App.tsx:171-172` registers `/finance/finance-in-action` and `/finance/finance-in-action/:modelSlug`; `FiaModelRoute.tsx` falls through to the legacy `FinanceModelDetail` (table `finance_models`) when the slug has no package.
- Committed sub-industry data: `src/data/finance-in-action/sub-industries.json` has two entries, `A121` Coal production and `B121` Construction materials, with `chainStage`, `unitNoun`, `unit`, `note`. `links.json` has one expected link `coal-to-cement` (all weights `null`). The first slate (`fixtures/slate.json`): PTBA, ITMG (A121), INTP, SMGR (B121), all `not_started`. Codes follow IDX-IC's letter-plus-three-digit sub-industry scheme, so the registry's `code` is the same key as `pkg.meta.subIndustry`.

### 3.5 Flag coupling

Everything in §3.3–3.4 is routed only when `__FIA_PREVIEW__` is true. With it off, "Open full
model" and "Open in Finance in Action index" would land on the legacy pages. The world must not
import `preview.ts` (it imports SYNTHETIC fixtures and would trip `assert-no-synthetic.mjs`); it
imports `published.ts` and `registry.ts` directly and builds a registry from published packages
plus the committed `sub-industries.json` and `links.json`.

---

## 4. Essays

### 4.1 Schema

`public.essays`, 32 columns (`src/integrations/supabase/types.ts:214-249`; the file is generated,
never hand-edited): `section text NOT NULL` (denormalised slug cache), `category_id`,
`published boolean` (default false), `status content_status_enum` (`draft | tone_pending |
published | archived`), `phase`, `finance_section`, `module_id`, `fsli_slug`, `topic`,
`is_selected`, `brief_json`, `content`, `content_json`, `presentation`, `layout_config`, dates.
**No `tags`, no `kind`, no `evidence`, no `falsifier`.** `docs/SCHEMA_PLAN.md:650-661` and
`supabase/migrations/20260731030000_baseline_cms.sql:206-211` record `tags` as deliberately
absent. Categories: `public.categories (section_id, slug)`; sections seeded in
`20260731040000_seed_surviving_content.sql:126-129` (`finance`, `accounting`,
`green-transition`), with `next-big-thing` and `development-finance` used as `section` values in
code (`TheNextBigThing.tsx:91`, `DevelopmentFinance.tsx:37`).

Publication: the anon SELECT policy is `USING (published = true)` and nothing else
(`baseline_cms.sql:38-43, 240-243`; `docs/SCHEMA_PLAN.md:208-216`). `src/lib/publication.ts`
is the one helper: `onlyPublished(query)` and `isPublished(row)`; `status` is unenforced
workflow metadata. A second view, `public.essay_structure`
(`20260803150000_essay_structure_public_view.sql`), exposes draft titles for "Coming soon";
irrelevant to the think tank, which lists published essays only.

### 4.2 Listing per section

- `src/components/editorial/EditorialFeed.tsx:56-69`: `from('essays').eq('section', section)` for `'next-big-thing' | 'green-transition'`, ordered by `created_at`.
- `src/pages/DevelopmentFinance.tsx:37-38`: `section: 'development-finance', published: true`.
- Finance: `useFinanceSectionEssays` (`src/hooks/queries/useFinance.ts:152`), `useEssays` (`useEssays.ts:57`), `useSelectedEssays`.

Rooms → sections: The Next Big Thing → `next-big-thing`; The Green Transition →
`green-transition`; Development Finance → `development-finance`. **"Industry analysis" has no
section.** Candidates: a room fed by essays carrying any sub-industry tag regardless of section,
or `finance` filtered by tag. Owner decision (§10.3, item G).

### 4.3 Migrations and where one could be applied

- Naming `YYYYMMDDHHMMSS_description.sql` in `supabase/migrations/` (17 files); applied only through the Supabase `apply_migration` tooling (README "Database & migrations"), never the CLI push.
- Production carries 21 migrations (`mcp__Supabase__list_migrations`, read-only). Four are not in the repository: `20260802034247_essay_revisions_fk_restrict`, `20260802034510_sync_essay_publication_state`, `20260802065239_slug_unique_code_column_human_slugs`, `20260802070418_consolidate_featuring_on_is_selected`. A local database built from the repository's folder alone is therefore not production's schema; a Supabase branch would be.
- `mcp__Supabase__list_branches` → `{"branches":[]}`. No branch exists; whether branching is available on this project's plan was not tested (creating one is a project change).
- Local path: `scripts/setup-test-db.sh` (Supabase CLI + Docker); `docs/e2e-live-testing.md:31-40` warns that this environment's network policy has blocked the Docker image CDN before.

Shape the think tank needs (PRD §8.5): `kind` (`thesis | model-based`), `tags text[]` (sub-industry
codes, chain node ids, tickers), `evidence jsonb` (links), `falsifier text`. Recommendation:
nullable columns on `essays` with a `CHECK` on `kind`, so the existing anon policy covers them
and no new table needs a policy ("zero tables without a policy"). Until applied, the interim file
`docs/world/think-tank-tags.json` carries the same four fields per essay slug.

---

## 5. Routing, theme, formatting

- **Router:** `react-router-dom@6` `BrowserRouter` in `src/App.tsx`; every page lazy. `/finance/:track` and `/finance/:track/:slug` (`App.tsx:173-177`) are dynamic; React Router 6 ranks a static segment above a dynamic one, so `/finance/kawasan` and `/finance/kawasan/:ticker` can be added without reordering, and `/finance/kawasan` itself must be registered so it does not fall into `FinanceTrackIndex`. `vercel.json` rewrites every path to `index.html`; `scripts/prerender.mjs` pre-renders essays only, so a new route needs nothing there. `tests/unit/navConfig.test.ts` pins the finance nav paths; the board route is not a nav item.
- **Design tokens:** `src/index.css` `:root` (lines 76-191), HSL triplets consumed by `tailwind.config.ts` (`hsl(var(--token))`): `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent` (navy `215 60% 32%`, the only accent; green is reserved for the Green Transition section and success), `--border`, `--ring`, `--section-green`, `--fia-*` (sourced, assumption, missing, cost, unsplit, precedent, dependent, changed, edited). Typography tokens `--font-sans` (Plus Jakarta Sans, self-hosted variable file), `--font-serif` and `--font-display` (Spectral, self-hosted), `index.css:1-70` and `public/fonts/`. **No monospace token exists.**
- **Theme switch:** `.dark { … }` is defined (`index.css:194-232`) and Tailwind uses `darkMode: ["class"]`, but **nothing in `src/` ever toggles the class**: no `classList`, `data-theme`, `localStorage` theme or `prefers-color-scheme` read outside `useMediaQuery.ts` and `motion.ts`; eight files use `dark:` variants. The site is effectively light-only. PRD §7.13 "dark mode follows the site's theme" has nothing to follow yet (§10.3, item H).
- **Number formatter:** `src/lib/finance-in-action/format.ts` (see §3.3). The site's older convention is the same (`WorkingPaperTable.tsx`, cited in its header).
- **Tabular numerals:** no utility in use; Tailwind's `tabular-nums` is available.
- **Reduced motion:** `src/lib/motion.ts` `prefersReducedMotion()` / `scrollBehavior()`; `index.css:277-286` zeroes every CSS animation and transition under `prefers-reduced-motion: reduce`; recorded in `docs/DECISIONS.md` as the hard boundary.
- **Media queries:** `src/hooks/useMediaQuery.ts` (`useSyncExternalStore`, synchronous first render), used by `ChainPlate` to choose wide or narrow.
- **CSP:** `vercel.json` sets `Content-Security-Policy-Report-Only` (not enforced): `script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src` unset. A bundled three.js engine with canvas text textures and self-hosted fonts needs no change. Also `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS.
- **Analytics:** `@vercel/analytics/react` `<Analytics />` in `App.tsx:12,129`; no `track()` call anywhere. PRD §12's three events would use `track` from the same package; proposed as a gate 4 decision, not built before.

---

## 6. Testing

| Layer | Tool and config | How to run | Baseline on this branch (8 Oct 2026) |
|---|---|---|---|
| Unit and component | Vitest 2.1.9, jsdom, `vitest.config.ts`; include `src/**/*.test.{ts,tsx}` and `tests/unit/**`; setup `src/test/setup.ts` (fake Supabase env, RTL cleanup) | `npm run test:unit` (CI: `TZ=America/Chicago npx vitest run --reporter=default --reporter=json --outputFile=vitest-report.json && node scripts/assert-test-count.mjs vitest-report.json`) | `Test Files 59 passed (59) · Tests 932 passed (932) · Duration 36.02s`; `assert-test-count: 932 tests, 0 failed, 0 failed suite(s) (floor 921) · ok`. `MIN_TESTS` must be raised when tests are added (`scripts/assert-test-count.mjs:13`) |
| Lint | ESLint 9 flat config `eslint.config.js`; `no-explicit-any` warn, `no-unused-vars` off; CI ceiling `--max-warnings=35` | `npx eslint . --max-warnings=35` | `✖ 22 problems (0 errors, 22 warnings)`, exit 0 |
| Types | `tsc -b --force` (`tsconfig.app.json`: `strict`, `noImplicitAny`, `noUnusedLocals: false`, ES2020, bundler resolution) | `npm run typecheck` | clean, no output |
| E2E | Playwright 1.56.1, `playwright.config.ts`: `vite build` + `vite preview` on `127.0.0.1:4173` with a dead Supabase URL; every network call intercepted by `tests/e2e/mockSupabase.ts`; chromium only (`/opt/pw-browsers/chromium-1194` is pre-installed) | `npm run test:e2e` | see §6.1 below |
| Live E2E | `playwright.live.config.ts`, `tests/live/`, `E2E_LIVE=1`, local or staging Supabase only | `npm run test:e2e:live` | not run (needs a database) |
| Visual regression | **None.** No `toHaveScreenshot` anywhere. Screenshot tooling exists for review sets: `scripts/capture-chain-review.mjs` (chain states with a manifest) and `scripts/fia/screenshots.mjs` | — | The flag-off regression test will be a Playwright `toHaveScreenshot` on `/` and `/about` at 360 and 1280 px with baselines captured from a build of `main` and committed |
| Lighthouse | Not installed (`npx --no-install lighthouse` → missing package `lighthouse@13.5.0`) | `npx lighthouse@13.5.0 …` would download it; Chromium is available | for gate 2 |
| CI | `.github/workflows/ci.yml` on push to `main` and every PR: `npm ci`, eslint ceiling, typecheck, vitest + count floor, `npm run build` (keyless, prerender skipped). E2E is not in CI | — | — |

Lint note for the engine: ESLint lints `// @ts-nocheck` files too. Vendored engine files with
implicit `any` and terse style will raise `no-explicit-any` warnings and possibly `js/recommended`
errors (`no-empty`, `prefer-const`, `no-cond-assign`). The plan (§10.1) is to type every touched
file and add one override block for untouched ported files that keeps errors on and does not
raise the 35-warning ceiling.

### 6.1 E2E baseline

`CI=1 npx playwright test` on this branch (builds the bundle with the dead Supabase URL, serves it
on `127.0.0.1:4173`, chromium):

```
  72 passed (45.5s)
exit=0
```

The run includes `tests/e2e/chain.spec.ts` and `mapLinks.spec.ts`, so the schematic's current
behaviour on `/` and `/about` at 360 px and 1280 px is the recorded baseline the flag-off path
must keep.

---

## 7. Backups (rule 3)

Two workflows exist; **neither has ever succeeded.**

| Workflow | Runs | Latest | Failure |
|---|---|---|---|
| `.github/workflows/backup.yml` "Content backup" (daily 20:17 UTC, eleven public tables via REST with the service-role key) | 67 (`mcp__github__actions_list`, `total_count: 67`), every listed run `conclusion: failure` | run 37706401014, 2026-10-08T00:11Z, job 113081689451, step 5 "Dump all content" failed | log: `env: VITE_SUPABASE_URL: ` (empty), `SUPABASE_SERVICE_ROLE_KEY: ` (empty); `FATAL: VITE_SUPABASE_URL not set (checked .env and the environment).` `Process completed with exit code 1.` |
| `.github/workflows/db-backup.yml` "Full database backup" (daily 20:43 UTC, `supabase db dump` + restore into a scratch stack + row-count compare) | 3, all `failure` (first on 2026-10-05 from the `m1/site-safe` branch, then two scheduled) | run 37707478786, 2026-10-08T00:23Z, job 113085189226, step 2 "Refuse to run without the connection secret" failed | log: `no dump to package`; `##[warning]No files were found with the provided path: upload/. No artifacts will be uploaded.` (`SUPABASE_DB_URL` secret not set) |

Supabase's own backups: `mcp__Supabase__get_project` reports `status: ACTIVE_HEALTHY`, Postgres
`17.6.1.155`, region `ap-southeast-1`, created 2026-07-31; the API does not return the plan or
backup state, and `backup.yml:1-4` records that the project is on the free tier, which has no
automated backups. **Rule 3 is not satisfied.** No migration may be applied anywhere, a branch or
a local database included, until the two secrets exist and a scheduled run uploads an artifact.
Nothing was changed; the owner sets the secrets (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_DB_URL`, optionally `BACKUP_PASSPHRASE`) in GitHub → Settings → Secrets → Actions, then
`workflow_dispatch` either workflow.

---

## 8. Factory Yard adoption list

Pinned commit `148758ae19a9b2201245485bf3619ab5e742f8f4` ("Bring the README up to the east country,
with two new figures", 2026-10-07 08:27:25 +0000). Verified on the clone: 74 `.ts` files under
`yard/`, 13,362 lines, 44 files begin with `// @ts-nocheck`, dependencies `three@0.186.1`,
`next@16.3.8`, `react@19.3.0`. Import-time side effects (grep counts): `applyTheme()` is called at
module level in `index.ts` (twice) and the renderer is created there; `shared.ts:5-6` does
`document.getElementById` for `stage` and `view`; `view.ts` uses `$()` 22 times; `Math.random`
appears once, in `view.ts`'s debug `order()` helper; `kernel/math.ts:4` seeds one module-global
`rng` from `location.search`. Warm-up: `sim/core.ts:11` `WARMUP = 80` seconds at `STEP = 1/60`,
run synchronously in `index.ts:296`. Fonts: `app/layout.tsx:7` loads DM Mono with
`next/font/google`; `kernel/part.ts:99` reads `--mono` for text textures. three.js addons used:
`lines/LineMaterial`, `lines/LineSegments2`, `lines/LineSegmentsGeometry`,
`controls/OrbitControls`, `geometries/ConvexGeometry` (towers only).

Dispositions: **as is** = copy with the credit header; **type** = copy and remove `@ts-nocheck`
with types; **adapt** = copy, type, and change what the reason says; **no** = do not port.

| File | Lines | Disposition | Reason |
|---|---|---|---|
| `kernel/iso.ts` | 13 | type | the projection, after ai-iso-skill; pure |
| `kernel/math.ts` | 9 | adapt | `rng` must become a per-instance generator seeded from `WorldOptions.seed`, not from `location.search` |
| `kernel/part.ts` | 119 | adapt | `Part` is the geometry builder; `TEXT_MESHES` and `css('--mono')` are module-global and read the document; text texture family comes from the shell's CSS variable, texture and material registries become instance-scoped |
| `kernel/path.ts` | 68 | type | filleted polyline walked by arc length; already half typed |
| `kernel/graph.ts` | 39 | type | `Site` corridor graph with Dijkstra, needed by forklifts |
| `shared.ts` | 18 | adapt | becomes the instance context (`scene`, `gfx`, `hooks`) created by `createWorld`; `$`, `stage`, `canvas`, `REDUCED`, `DEBUG` globals go |
| `theme.ts` | 40 | adapt | one table from the site's tokens to the engine's names; the `NIGHT` hex palette stays here (the one file where hex is allowed); `applyTheme`/`shade` per instance |
| `layout.ts` | 169 | no | the hand-written coordinate table; replaced by `placement/layout.generated.ts` (PRD §9.3.2). Its helper ideas (`onRoad`, `zAt`, `slotAt`) are reimplemented over the generated layout |
| `land.ts` | 192 | no | the east country's terrain |
| `index.ts` | 304 | no (rewritten) | import-time assembly; becomes `create.ts` with `createWorld`, `dispose`, the measured warm-up and the fixed build order |
| `view.ts` | 357 | adapt | keep camera, `frame()`, hit-testing, `select`, `setLive`, reticle, `drawRoute`, `PEEK`/`updatePeek`, LOD switch, frame loop, debug API; remove every `$()`, weather, police, fair, metro, motors, starbase references; `VIEWS` from the layout; keys per PRD §7.3; `window.world`; add `dispose` |
| `models/vehicles.ts` | 219 | adapt | keep tractor, trailer, forklift, pallet, van, car and car-lite; drop `buildPoliceCar`, `buildBus`; add a reefer variant |
| `models/people.ts` | 135 | adapt | keep the figure and the lite figure; drop police, firefighter, robber, ghutra outfits |
| `models/train.ts` | 61 | as is | locomotive, flat wagon, car carrier |
| `models/port.ts` | 218 | as is | ship-to-shore crane, gantry, tractor, container, ship, tugs |
| `models/works.ts` | 114 | adapt | Car Works models; only the shared helpers that `train.ts` and `port.ts` import stay |
| `models/sea.ts` | 68 | no | lighthouse and boats (fishing is not ported); a quay light is drawn in the port builder |
| `models/animals.ts`, `brt.ts`, `heli.ts`, `metro.ts`, `motors.ts`, `starship.ts` | 76, 49, 46, 77, 51, 266 | no | village, Metrobus, police helicopter, metro, Motors, Starbase |
| `sim/core.ts` | 110 | adapt | `STEP`, clock, `night()`, `Pallet`, conveyor stay; `sim` becomes per instance; **`DRIVERS`, `STAFF`, `NAMES` (personal names) are removed** (rule 9); `WARMUP` becomes the measured value |
| `sim/roads.ts` | 105 | type | road rules (`clearAhead`, seniority); `CITY` reference replaced by the generated roads |
| `sim/roadnet.ts` | 107 | adapt | the street graph is built from the generated road centrelines, not the literal `N`/`STREETS` tables |
| `sim/trucks.ts` | 221 | adapt | `Truck` and `holdOn` holds; drop the bus; keep flatbed, van and the container `boxer` |
| `sim/forklifts.ts` | 193 | adapt | `Site` graphs `PLANT`/`WH` and `LOC` come from the estate warehouse's generated block |
| `sim/person.ts` | 110 | type | `Person` step queue; `TINY`/`FAR` become instance state |
| `sim/people.ts` | 327 | adapt | keep `Walker`, `Staff`, `Picker`, portals and `nextPortal`; drop shop, shoppers, guard; portals from the town's generated blocks |
| `sim/cars.ts` | 103 | adapt | `Car` for town traffic on generated loops; drop shop customers and `SPOTS` |
| `sim/freight.ts` | 109 | adapt | the container triangle (plant → port → warehouse) over generated roads |
| `sim/train.ts` | 146 | adapt | the shunting train in the rail yard; drop the car-carrier loading |
| `sim/port.ts` | 493 | adapt | quay, cranes, tractors, ship; `PORT` constants from the layout; ship, owner and port names stay generic (no companies) |
| `sim/homes.ts` | 108 | adapt | only the `entity()` helper is kept; residents and homes go |
| `sim/boats.ts`, `brt.ts`, `courier.ts`, `east.ts`, `fair.ts`, `fire.ts`, `fishing.ts`, `metro.ts`, `motors.ts`, `observatory.ts`, `police.ts`, `sahel.ts`, `starbase.ts`, `village.ts`, `weather.ts`, `works.ts` | 43, 165, 111, 61, 170, 291, 120, 345, 530, 183, 859, 184, 545, 405, 27, 224 | no | PRD §9.2 exclusions (police and robberies, fire, fair, fishing, Sahel, metro, Metrobus, Motors, east country, village, observatory, Starbase, weather) and the courier's online orders |
| `world/ground.ts` | 211 | adapt | `tree`, `pine`, `palm`, `ring` helpers as is; `buildWorld` (slab, streets, kerbs) rewritten over the generated roads |
| `world/industry.ts` | 276 | adapt | the shell-and-cut pattern (`peek`), the factory, warehouse, gate and booth builders become the parametric process-plant, warehouse, gate-with-weighbridge families |
| `world/interiors.ts` | 144 | adapt | `lowWall` and the hatched cut are the base of every archetype interior; home furniture goes |
| `world/town.ts` | 301 | adapt | flats, bank, café, town hall builders become the office tower, bank tower, hotel, restaurant, shop families; police station goes |
| `world/towers.ts` | 305 | adapt | the skyscraper builder only (business and financial districts); Sahel's names and cards go; drops `ConvexGeometry` if the parametric tower does not need it |
| `world/port.ts` | 140 | adapt | quay, apron, yard and breakwater from the layout's gateway strip |
| `world/rail.ts` | 41 | adapt | `trackOn()` as is; `RAIL_PATH` from the layout |
| `world/range.ts` | 46 | adapt | the hill height field for the think tank's hill; terraces go |
| `world/woods.ts` | 99 | adapt | the forest block of the biological arc; `CLEAR` rectangles from the layout |
| `world/brt.ts`, `central.ts`, `east.ts`, `metro.ts`, `motors.ts`, `observatory.ts`, `orchard.ts`, `pier.ts`, `sahel.ts`, `starbase.ts`, `station.ts`, `village.ts`, `weatherfx.ts`, `works.ts` | 48, 242, 289, 315, 313, 130, 47, 132, 157, 306, 128, 289, 41, 259 | no | excluded systems, or town-specific streets (Orchard Lane, the pier, the fire station) |

Tally: as is 2, type 5, adapt 22, no 44, rewritten 1 (`index.ts`). The ported set is about 4,900
lines of the 13,362. `scripts/check-yard.mjs` (free names, missing exports, load order from the
entry) is ported as `scripts/world/check-engine.mjs` over `src/world/engine/`; it needs
`@babel/parser` and `@babel/traverse` as devDependencies.

New runtime dependency: `three@0.186.1` (with `@types/three@0.186.0` as a devDependency). It is
the baseline the mega prompt's size rule is measured against, listed here anyway. It must be a
`manualChunks` entry in `vite.config.ts` so it never enters the initial bundle.

---

## 9. Licence state

- Factory Yard at `148758a`: `ls` of the repository root shows `.gitignore AGENTS.md CLAUDE.md README.md app components docs next.config.ts package-lock.json package.json scripts tsconfig.json yard`; **no `LICENSE`, `NOTICE` or `COPYING` file**; `package.json` has `"private": true` and no `license` field. `README.md:229-230` credits "Isometric kernel and visual language adapted from ai-iso-skill (MIT, © Tolga Cohce)" and "Rendering by three.js (MIT)". The repository's 43 commits are authored "Claude"; the GitHub account is `Khalidabdi1`.
- ai-iso-skill at `44b4da7714148eef547cc1b102e433472dfe3531` (2026-10-04): `LICENSE` is the MIT licence, "Copyright (c) 2026 Tolga Cohce".
- `NOTICE.md` will need: (1) the ai-iso-skill MIT text verbatim with its copyright line; (2) a Factory Yard entry naming the repository URL, the commit, the files adapted, and either the licence text once the author adds one or the author's written permission for use on a public site, quoted with its date and channel; (3) three.js's MIT notice. Rule 10: until (2) exists the pull request stays a draft, and every gate report says so.

---

## 10. Plan

### 10.1 File layout

Section 3 of the mega prompt, with these adjustments for the repository's conventions:

```
src/world/engine/                ported engine: kernel/ theme.ts view/ sim/ models/ world/ create.ts index.ts
src/world/world/                 builders for regions, blocks, roads, signposts, gates, vehicles (from the layout)
src/world/interiors/             proc.ts dist.ts asset.ts mine.ts farm.ts service.ts, each build() + STATIONS
src/world/data/boundary.ts       the only importer of src/lib/finance-in-action inside src/world/
src/world/placement/place.ts     the algorithm; layout.generated.ts its committed output
src/world/poster/render-poster.ts   SVG far view from the generated layout (no WebGL); runs in the build
src/lib/world/flag.ts            WORLD_KAWASAN from __WORLD_KAWASAN__
src/lib/world/constants.ts       VIEWS, PLACES, KEYS, LAYERS, STATUS vocabulary (rule 12: one exported constant each)
src/lib/world/registry/          types.ts  subindustries.generated.ts  links.generated.ts  physical-units.ts
src/lib/world/presentation.ts    signposts, band → layer, mark placement
src/lib/world/peerBand.ts        the PRD §8.3 rule (the model page keeps its own)
src/components/world/            WorldFrame, Skema, Card, Board, ThinkTank, Search, controls
src/pages/world/KawasanBoardPage.tsx   /finance/kawasan/:ticker
scripts/world/build-registry.ts  run with node --experimental-strip-types (as scripts/build-chain-plate.mjs does)
scripts/world/check-engine.mjs   the check-yard port
scripts/world/assert-world-flag.mjs   flag-off dist/ carries no world chunk
public/world/poster-far.svg      committed and regenerated by the build; a test fails on drift
tests/unit/world*.test.ts(x)     unit and component tests (repository convention: tests/unit/)
tests/e2e/world.spec.ts          smoke with ?debug=1; flag-off visual regression with committed baselines
docs/world/                      PRD, MEGA-PROMPT, discovery, gate-<n>.md, review-registry.md, frames/, report.md, sources/, think-tank-tags.json
NOTICE.md
```

Differences from the prompt's layout, recorded: tests live under `tests/` not beside the code;
the poster is committed as well as generated; the board page is a `src/pages/world/` page like
every other route; the flag module is `src/lib/world/flag.ts` mirroring `finance-in-action/flag.ts`.

### 10.2 Commit sequence

As section 12 of the mega prompt, pushed after each:

1. `docs: add the Kawasan Industri PRD and source table` (done, `f618e9f`)
2. `docs: discovery for the Kawasan Industri world` → **gate 0**
3. `world: vendor the Factory Yard engine at 148758a with NOTICE` (NOTICE carries ai-iso-skill's MIT and the Factory Yard entry marked "permission pending")
4. `world: mountable engine with createWorld and dispose`
5. `world: types for touched engine modules; check script`
6. `registry: generator, generated constants, tests, review table` → **gate 1**
7. `world: placement algorithm and generated layout`
8. `world: builders for regions, roads, gates, signposts, vehicles`
9. `world: poster renderer in the build`
10. `world: React shell, flag, Skema toggle, cards, search, keyboard, phone` (the flag-off visual baselines are captured from a build of `main` in this step, before the shell changes anything)
11. `docs: style frames and measurements` → **gate 2**
12. `world: distance control, shift overlays, reading strip, drill-down`
13. `world: chain highlight`
14. `world: data boundary and published-model statuses`
15. `world: archetype interiors, stations, synonyms, driver placement`
16. `world: in-world whiteboard and the full board with its route`
17. `world: think tank rooms, interim tags, two-way links; migration file (branch only)` → **gate 3**
18. `test: engine, smoke, UI, performance, accessibility`
19. `docs: report, decision log, NOTICE` → **gate 4**

Step 3 may be split into kernel + theme, sim + models, world + view if a single commit is unreviewable.

### 10.3 What the repository makes impossible or unwise, with an alternative

Numbered for the owner; each needs an answer or a default at gate 0.

| # | Finding | Effect on the PRD | Alternative (default if unanswered) |
|---|---|---|---|
| A | `fsre_published` is not an exposed Data API schema (§3.1, PGRST106). | No published model can be read; INTP's existence is unknowable from the site. | Owner exposes the schema in the Supabase dashboard (a production API setting; not the agent's to change under rules 1–2). Until then the world shows "Model status unavailable" everywhere, which is the PRD's own outage rule, and the gate 2 company frame uses a mock labelled "mock, never ships". |
| B | Both backup workflows fail on missing secrets; none has ever produced an artifact (§7). | Rule 3 blocks applying the essay-tag migration anywhere, including a branch or local database. | Owner sets the three secrets and runs the workflows once. Default: at gate 3 the migration file is committed and **not applied**; the gate 3 report says BLOCKED for that item. |
| C | No Supabase branch exists, branching availability is unknown, the repository's migration folder lacks four production migrations, and Docker egress has been blocked here before (§4.3). | The "Supabase branch or local database" rehearsal may be impossible in this environment. | After B is fixed: try a Supabase branch first; else a raw local Postgres (as gate 1c in `docs/GATE_LEDGER.md` did) with the four missing migrations noted as a gap. Default: rehearse where possible, report what was not. |
| D | The schematic has no drill-down and no "existing electricity chain component" (§1.2). The PLN material is Capital in Motion's, at another route. | PRD §7.5 "the energy mark's drill-down opens the PLN electricity chain as the schematic does today" cannot reuse anything. | Default: the energy mark's card lists the band's three shortages from the data file and links to the two PLN conditions at `/finance/capital-allocation/…`, labelled "drill-down v0, opens in the section". An in-frame chain is new content and waits for the owner. |
| E | Condition marks carry no `(value, source, year, link)` evidence line; the map carries no digits by design (§1.2). | PRD §7.5 / §7.4 evidence line cannot be shown as specified without changing the data file, which the PRD forbids. | Default: the condition card shows status, basis, named case, the four lines in the active voice, `CONDITION_AS_OF`, and the evidence essay (published-checked) exactly as `ChainTargetPanel` does. No value, no year. |
| F | The landing page has no hero; the chain preview is the first screen and carries the `h1` (§1.1). | PRD §7.1 "the existing hero stays untouched above it" has no hero to keep; the world becomes the first screen and the LCP element. | Default: the world replaces the preview in place, keeps `heading="h1"` in the frame header, and the poster is the LCP candidate. Confirm. |
| G | No `Industry analysis` section exists among essays (§4.2). | The default room list cannot be filled from a section. | Default: the room lists published essays carrying any sub-industry code in the interim tag file, whatever their section. |
| H | The site has no theme switch; dark mode is CSS only (§5). | PRD §7.1 header "theme" button and §7.13 "dark mode follows the site's theme" have nothing to follow. | Default: the frame follows `.dark` on `<html>` if ever present, else `prefers-color-scheme`; **no theme button in the frame** (a site-wide toggle is out of this PRD's scope). Night still follows the clock. |
| I | `peers.ts` draws a band from two published companies; PRD §8.3 forbids it (§3.3). | The two surfaces would disagree. | Default: the world applies the PRD rule in `src/lib/world/peerBand.ts`; the model page is left as is (mega prompt §14) and the disagreement is listed for the owner at gate 3. |
| J | `Inspector` and `DownloadButton` take a `ModelView`, not a package (§3.3). | Reuse needs the model page's view state. | Default: the board builds a `ModelView` with `useModelView(pkg, reg)` per opened company and passes it to both. Verified at Phase F; if `useModelView` depends on page-only context, extract `CellDetail`/`CellSources` with no behaviour change. |
| K | Model-page links route only with `__FIA_PREVIEW__` on (§3.5). | "Open full model" and "Open in Finance in Action index" land on legacy pages otherwise. | Default: preview builds set both flags; the gate 4 report records that production needs the FIA preview on before `world_kawasan`. |
| L | No monospace token; Factory Yard's text textures used DM Mono (§5). | PRD §7.13 "the site's monospace or sans token". | Default: in-world text uses `--font-sans` (Plus Jakarta Sans, already self-hosted); no new font file. |
| M | ESLint lints `@ts-nocheck` files and CI holds 35 warnings (§6). | Vendored code would fail CI. | Default: type every touched file; one override block for untouched ported files that disables `no-explicit-any` there only; the ceiling is not raised. |
| N | The official IDX-IC classification document must be cited with a hash (PRD §8.1); it lives on idx.co.id, which this environment may not reach. | Phase C's generator fails without the citation by design. | Default: fetch it; if the network refuses, the owner drops the PDF (or its URL and SHA-256) into `docs/world/sources/` and gate 1 waits. |
| O | Example-pair listing status needs a verifiable source (mega prompt §5.2). | Same network question. | Default: cite IDX's issuer pages where reachable; otherwise "not yet proposed". |
| P | The Vercel deployments list is forbidden to this session (`403` on `GET /v7/deployments`, team `dikagirawan-4804s-projects`, project `dikagustiana-com`). | The gate reports cannot quote the preview URL. | Owner reads it from Vercel (branch `feat/kawasan-industri`) or the commit's GitHub deployment status. |
| Q | `BANDS` has seven layers (credit **and** capital, governance **and** regulation); PRD §7.4 maps five plus cold chain. | `band-capital` (asset and project finance) has no layer in the PRD. | Default: `band-capital` joins the money layer as its second strand (asset finance, towards the plants) and the card says so; governance and regulation stay two signpost sets as the PRD lists them. |
| R | `src/data/finance-in-action/sub-industries.json` holds two FSRE codes; the registry will hold 130 (§3.4). | Two lists of sub-industries. | Default: the registry generator also emits the FSRE-shaped two-code file's superset later; for this work the registry is the authority and the index keeps its own list unchanged (mega prompt §14). Recorded for gate 4. |

### 10.4 Startup and performance facts to carry forward

- The engine's warm-up is 80 s × 60 steps = 4,800 synchronous steps (`sim/core.ts:11`, `index.ts:296`); the measured minimum to populate the far view's roads is a Phase B deliverable.
- Factory Yard's React component calls `import('@/yard')` in an effect (`components/YardFigure.tsx:10-13`); the site will import the engine chunk after first paint or first interaction, whichever is first.
- Draw-call discipline: whole-plate home view about 1.9k (`AGENTS.md`, "Draw calls"); `TINY` below 4.2 px/m and `FAR` below 1.5 px/m (`view.ts:300`).
- The entity contract and `peek` mechanism are as the mega prompt describes (`AGENTS.md` "Simulation rules"; `view.ts:171-193`).
