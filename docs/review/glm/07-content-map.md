# Phase 8 — Content map: coverage and connections

**Sources (no database was read):** the seed migrations that define the curriculum
(`20260731040000_seed_surviving_content.sql`, `20260731070000_framework_v2_curriculum.sql`,
counts pinned by `20260801100000_module_meta_essay_count.sql`), the static data files
(`capitalConditions.ts`, `trackerIssues.ts`, `industryChain.ts`, `chainCurriculumMap.ts`,
`readingPath.ts`), and the share-card manifest the repo itself carries
(`docs/review/share-cards/manifest.json`, rendered from the live DB on a prior pass —
the closest thing to a published-essays list available offline; treat "published" below
as "at least these" if newer essays exist).

## The finance curriculum (goal 4)

| Part | Surface | Modules | Written (published) | State |
|---|---|---|---|---|
| 01 Fundamentals | `/finance/fundamentals` | 22 (`('fundamentals', …)` tuples in seed 04) | 0 visible in repo evidence; 20 framework lesson slots seeded as drafts (`ff-01-01`…`ff-20-02`, 56 rows in 07) | **Thinnest** — the entry track the landing page points to ("Start with Fundamentals") is all Planned rows |
| 02 Strategic Finance | `/finance/strategic-finance` | 14 (2 authored + 12 derived) | 0 visible | Thin |
| 03 Planning & Forecasting | `/finance/planning` | 8 | ≥1 — `macro-scenario-construction-for-cfos` (card label, 2026-08-02) | Thin |
| 04 Financial Analytics | `/finance/analytics` | 10 | ≥1 — `driver-tree-construction` (2026-08-03) | Thin |
| 05 Capital in Motion | `/finance/capital-allocation` | 6 layers × conditions, **21 conditions total**, each with a decision rule (`capitalConditions.ts`: `CONDITIONS` 21, `LAYERS`, `LAYER_ORDER`) | **Complete** — static data, renders without the DB; company case studies gated off (`SHOW_CASE_COMPANIES=false`) | **Thickest**, and disconnected from the DB curriculum by design |
| 06 Finance in Action | `/finance/finance-in-action` | `finance_models` table (empty per seed note 04:73-74) | — | **Out of scope** (FD4); work in progress elsewhere |

Planned lesson totals are pinned per module as `module_meta.essay_count` (migration 08c):
**161 planned finance lessons** across tracks 01–04 (105 from seed 04 + 56 from 07),
against **~3 published finance essays** in evidence (incl. the meta essay
`site-rebuild-note`) — a written ratio of roughly **2%**. The curriculum's honesty
mechanism (visible Planned rows, "n of N published" counts) is what makes that ratio
readable as intent rather than abandonment — that is the design working as the owner
intended.

## Non-finance sections

| Section | Written (in evidence) | Notes |
|---|---|---|
| The Next Big Thing (`/the-next-big-thing`) | **4** — `indonesias-reindustrialization-bet` (Economy), `the-agentic-finance-function` (Technology), `the-best-time-ever-for-an-idea-guy` (Growth), `thinking-was-expensive-but-attention-…` (Society); themes migrated Sep 2026 (migration 09) | **The thickest written section**; the four themes mirror the homepage's argument |
| Green Transition (`/green-transition`) | Phase pages + climate-finance hub (static concept panels) + ≥1 seeded essay; content otherwise DB-held | The 8-essay shift lens on the homepage links here |
| Tracker (`/green-transition/tracker`) | **Complete and frozen**: quarterly issues Jan 2025–Jun 2025, static data (`trackerIssues.ts`, 561 lines), dated corrections, coverage notices; **declared paused** | The rigour exhibit (Phase 7, reader 3) |
| Development Finance (`/development-finance`) | 4 topic hubs (SWF, MDBs, blended, Indonesia's capital architecture); essays DB-held | On-thesis, thin |
| Accounting (`/accounting`) | FSLI page shells with seeded line items (fsli_pages seeded; `fsli_sections` prose lost per seed note 04:68-69), consolidation topics (static config) | Older surface; pre-dates the verification standard |
| Learning (critical-thinking, books, ielts, tools) | Static shells + `books_uploads` (empty — rows lost per seed note) | Serves none of the goals (Phase 6) |

## Connections to the chain map and between distances (goal 3)

- **Map → sections/essays**: the homepage plate's shift lenses carry 8 essays each
  (`industryChain.ts` `OVERVIEW_GROUPS` + `readingPath`), joints open essays with context
  kept (e2e `mapLinks`, journeys). `chainCurriculumMap.ts` maps joints → finance modules
  — the finance distance is wired into the map.
- **Sections → map**: not written and not linked. Section indexes say what they are, not
  where they stand on the chain (Phase 6, G3.4 partial).
- **Essays → map/stage**: **absent** (G3.2 FAIL — Phase 6). The data to fix it exists in
  `chainPlacement.ts` / `chainCurriculumMap.ts`.
- **Finance parts interlink**: landing → tracks → modules → essays with counts; Capital
  in Motion sits outside this tree (own route, absent from the nav dropdown by declared
  choice) and Finance in Action is flag-gated work-elsewhere.
- **About → essays**: the curated reading path (`readingPath.ts` resolved against the DB
  by `useReadingPath`, `onlyPublished`) — the strongest cross-section argument surface.

## Thick and thin against the architecture (goal 3)

- **Thick:** the chain map itself (static, complete, tested); Capital in Motion
  (complete); The Next Big Thing (4 essays across all four themes); the tracker archive.
- **Thin:** every DB-driven finance track (≈2% written); Development Finance; Green
  Transition essays (the lens counts 8, but those are placement promises — the section's
  own essay list is largely Planned).
- **The mismatch that matters:** the site's entry point for a serious reader —
  Fundamentals, "start here" — is the emptiest part, while the argument's freshest
  writing (The Next Big Thing) is one nav level away from the thesis. The architecture
  carries this honestly (counts everywhere), but the reading path a panel member is
  likely to take runs through the emptiest rooms first. Phase 9 carries this as an
  editorial-shape observation for the owner, not a defect to fix in code.
