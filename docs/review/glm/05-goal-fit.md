# Phase 6 — Goal-fit review, page by page

**Method and its one big limitation.** The live site is a blank page (Phase 5 F1) behind a
redirecting domain (F32/F19), so live content reading is impossible until the owner
repairs the pipeline. This pass therefore reads the **current branch build served locally**
(`127.0.0.1:4173`, production bundle) — the code that *should* be production — plus the
repository's content sources (seed migrations, static data files, share-card manifest),
plus the e2e suite for data-driven behaviour. Every content-dependent verdict below is
tagged **BLOCKED-LIVE** where only the production database can settle it; those re-run in
Phase 12 against the local build and are listed for re-verification after the owner's
redeploy. No draft or published content was read from any database.

Goal references (G1–G6) and check IDs are from `00-goals.md`.

## Page-by-page

| Page | Goals served | Phase 1 checks | What a reader can / cannot do | Missing / findings |
|---|---|---|---|---|
| **Homepage `/`** | G1, G2, G3 | G2.1 **PASS-LOCAL**: the H1 *is* the thesis — "The industry chain / Nothing here is complicated. It only looks that way from the wrong distance", with the economy/finance distance toggle and the two 8-essay shift lenses. G3.1 PASS (map *is* the homepage). G3.3 PASS (swimlanes + the line). G1.4 PASS-LOCAL (no placeholder/debug surfaces) | Can grasp the thesis in one screen; read the chain; follow a shift lens into essays; reach every section (Sections list + header) | **No published-essays surface on the homepage** — "a completed piece is one click away" only via section indexes; newest-writing surfacing depends on `is_selected` (curation) — BLOCKED-LIVE. F1/F32 make all of this invisible in production today |
| **About `/about`** | G2 (primary), G3 | G2.3 **PASS-LOCAL**: the method is stated in first person ("State the question, the position, its scope and its consequence early. Keep observed evidence, inference and judgment visibly apart… Where a claim is unchecked, say so"); H2s: the 2050s-capital question, "What I changed my mind about", "The industry chain", "On the shelf". G2.2's method leg lands here | Can learn how he works, what he changed his mind about, and the reading path (curated order, resolved against the DB — BLOCKED-LIVE for the essay links) | "On the shelf" = reading list; fine. Nothing missing structurally |
| **Finance `/finance`** | G4 (primary), G3 | G4.4 PASS-LOCAL: tagline, "Start with Fundamentals…", and the honesty promise: **"A working syllabus, kept in public. Every question stays listed whether or not it has been answered yet."** G3.4 partial: finance frames itself as decisions ("Finance exists to support decisions — not to produce reports") but does not say *chain* on this page | Can see the six-part shape and enter any part | The chain connection is one click away (homepage) but not stated here — G3.4's "same object at a different distance" is implicit, not written, on this page |
| **Finance tracks `/finance/{fundamentals,strategic-finance,planning,analytics}`** | G4 | G4.1 PASS (mechanism): module lists with "**n of N published**" counts derived from `essay_structure` (FinanceTrackIndex.tsx:130-138); Planned rows non-clickable by contract ("Written items link; planned ones do not, and are deliberately not clickable rather than clickable-and-empty", curriculumContract.ts:27) — G4.2/G4.3 **PASS by construction**: a stub cannot render as a broken page because drafts never render as pages; they render as Planned rows | Can see the honest state of each part; can open written essays | BLOCKED-LIVE: the real module/essay counts and titles. Empty-DB rendering shows breadcrumb raw slug and no H1 (F5) — cosmetic with data, ugly during outages |
| **Capital in Motion `/finance/capital-allocation` (+ detail)** | G4 | G4.1 PASS-LOCAL: "Twenty-one conditions I wish I understood earlier", six layers, premise copy; fully static (`capitalConditions.ts`: 21 conditions, `LAYERS` 6, decision rules; `getConditionByNumber`) | Can read the whole framework offline of the DB; each condition detail ends in its decision rule (data-verified in Phase 8) | Deliberately absent from the nav dropdown until it "has modules" (navConfig comment) — discoverable only from the finance landing. Owner-visibility question, not a defect |
| **Finance in Action `/finance/finance-in-action`** | G4 (part 06) | Out of scope (FD4). Production pages query `finance_models` (empty per seed) | — | Excluded by owner decision |
| **Accounting `/accounting` (+ fsli, consolidation, statutory)** | G1, G3(margin distance) | G1.4 PASS-LOCAL; intro copy frames accounting as "a language for describing economic reality" | Can enter FSLI line-item pages and consolidation topics (essays inline at page level; prerender skips them by design) | Voice/style of these pages predates the verification standard (older section of the site) — same class as the Learning pages, milder |
| **Green Transition `/green-transition` (+ now/gaps/future, climate-finance)** | G2, G3 | Intro: "The energy transition is a financial and economic problem… Who pays? Who benefits? Who gets left behind?" — G1.1-style framing in the section voice; phases map to the shift lens on the homepage chain | Can browse by phase; essays under each | BLOCKED-LIVE content. Copy uses "decolonize"-family US spelling ("decarbonize") vs homepage "reindustrialisation" — mixed dialect outside essays (G5.3 covers essays only; noted) |
| **Tracker `/green-transition/tracker` (+ archive, detail, essay)** | G1, G2 | **"PAUSED ARCHIVE · JANUARY 2025 TO Q2 2025 … written across January 2025–June 2025, and paused there"** — the tracker states its own status honestly (G2 rigour signal). Static data (trackerIssues.ts, 561 lines) with coverage notices (`CoverageNotice.tsx`) | Can read quarterly readings, what-changed panels, dated corrections (About promises these) | Paused since Q2 2025 — a panel may read "paused" as stalled ambition; owner-voice question, not a defect |
| **Development Finance `/development-finance` (+ 4 phases)** | G2, G1 | "How public capital is deployed, at scale, to shape economies" — on-thesis | Can browse four topics (SWF, MDBs, blended, Indonesia's capital architecture) | BLOCKED-LIVE content |
| **The Next Big Thing `/the-next-big-thing` (+ themes)** | G1 | "Speculative but reasoned… Critical questions, not predictions… Some ideas will be wrong. The value is in the reasoning, not the conclusions." — adversarial-reader framing in the section's own words | Can browse themes (incl. growth, Sep 2026 migration 09) | BLOCKED-LIVE content |
| **Learning: `/critical-thinking-research`, `/english-ielts`, `/books-academia`, `/books/*`** | **None of G1–G6** | Self-help register ("The Ignorance This Fights", "Band 7+ Methodology", "Each book listed here fights a specific ignorance") — a different voice, promise, and audience from the rest of the site | Can browse study material and a book list | **Dilutes the credibility instrument** (G2): a panel following the nav meets IELTS prep and a personal book library. Phase 9 lists unlinking/archiving as an owner decision (content stays; navigation and prominence are the question) |
| **Navigation + footer** | G2, G3 | Header: 6 sections + Learning submenu + Sign In; footer: About/sections/resources + LinkedIn + email | Can reach every section from anywhere | Footer "Finance" href is legacy `/finance-101` (F8). **No search anywhere** (Phase 4) — a 10-minute panel reader cannot look up a topic by name |
| **404** | G1.4 | Proper copy + Return home | — | — |
| **Auth `/auth`** | G6 | Public sign-in; nothing privileged without the admin role row | — | — |

## Essays and stubs (content-level) — BLOCKED-LIVE, with what stands in

The review brief asks for ten published essays and ten stubs read on the site. Production
being blank, and databases out of bounds for this review, the essay-level checks stand on:

- **Structure (G5.2)**: e2e journey "three minutes: the scope, the comparison, the
  objection and the limits are all on the page" pins boundaries/limits presence on
  longform essays; genre-aware validation requires the deck/thesis line and genre
  (`genres.ts`: explainer / argued-position / exploratory / correction); correction genre
  exists as a first-class type (the tracker promises dated corrections).
- **Verification Register (G5.1)**: no code-level support or check exists (grep: no
  "Verification" in src/). Whether each published essay carries the table is
  ** unverifiable from the repository** — the register lives in essay content. Flagged as
  the top re-verify item after redeploy.
- **British English (G5.3)**: same status — content-level, BLOCKED-LIVE; site chrome
  mixes dialects (see Green Transition row).
- **Stub presentation (G4.2/G4.3)**: PASS by construction (Planned rows, never pages).
- **H1s/homepage thesis (G5.4)**: PASS-LOCAL — homepage H1 is the owner's own line; essay
  H1s are the author's titles (content-level spot-check BLOCKED-LIVE).

## The architecture as a whole

- **The chain map connects the sections in exactly one direction.** Map → essays works
  and is tested (joints open essays with context kept; shareable URL state; e2e
  `mapLinks` + journeys). **Essays do not link back**: chain components are imported only
  by `Index.tsx` and `About.tsx`; essay pages carry only a backLink to their section
  (ArticleShell/LongformArticleShell `backLink`), and section indexes do not carry a
  chain link either. Essay → section (1) → header Home (2) → map is *on* that page, so
  the chain is 3 clicks from an essay — **G3.2 FAILS** as written (≤2 clicks). The
  mapping data to fix it exists (`chainCurriculumMap.ts`, `chainPlacement.ts`,
  `industryChain.ts` readingPath) — a small additive link in existing essay furniture
  would satisfy G3.2 without redesign (FD1-respecting refinement); Phase 10 work order.
- **G3.4 (each section names its distance)**: partially written. Homepage says it
  explicitly ("read the chain as an economy, or inspect its margins through finance").
  Finance and Green Transition sections say *what* they are but not *where they stand on
  the chain*; Accounting frames itself as a language. The line is present at the centre,
  implicit at the edges — a judgement call for the owner (wording is his; constraint 3).
- **Finance parts are linked as the curriculum intends** (G4.1): landing → tracks →
  modules → essays with published counts; part 05 (Capital in Motion) is complete and
  static; part 06 (FIA) is out of scope. The one nav-level gap: Capital in Motion is not
  in the finance dropdown (deliberate, per navConfig comment) — reachable only from the
  landing page.
- **Stubs**: the strongest goal-4 feature — visible, counted ("n of N published"),
  promised in copy ("A working syllabus, kept in public"), and structurally unable to
  render as broken pages.

## Writer Studio against goal 6

- **Every way work can be lost** (full audit in 03-features §Writer Studio): the two real
  residual risks are (a) a brand-new essay's first-typing window before the first manual
  save (autosave requires the row to exist — by design, `revisions.ts:117-124`), and
  (b) the final <2 s before a tab close (best-effort flush). Everything else is guarded,
  loud, and now tested.
- **How the goal-5 essay structure is supported**: the deck/thesis line and genre are
  *required* by validation (WriterValidation errors), figures and references are checked
  per section, corrections are a first-class genre. But the hook-without-header,
  findings-style section headers, boundaries section, and the Verification Register are
  **supported by nothing** — no template, no checklist, no validation. The one template
  module in the code (`essayTemplates.ts`, "How to Think About [Topic]" with
  Introduction/Context/Key Points) is (a) dead code since its UI was removed and (b)
  below the owner's current standard. The standard lives in the author's head; that is
  his right, but a writer-only checklist (no prose changes, purely tooling) is a
  candidate work order for Phase 10.
- **Publishing is quick and cannot break the public site** (G6.3): published-page
  rendering depends only on published rows (RLS + `onlyPublished`); editor failures
  toast and cannot blank a page — the one thing that DID blank the public site is the
  deploy pipeline (F1), which is outside the Studio.
