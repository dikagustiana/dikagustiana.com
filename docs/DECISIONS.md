# DECISIONS

Design decisions taken during the full-site upgrade pass, with rationale and rejected
alternatives. Newest first.

---

# 2026-10-24 — Finance in Action: the model page, sheet first (D-S1 to D-S9)

Spec: `docs/company-models/sheet-first/` (PRD, ARCHITECTURE, DESIGN, PLAN), approved by the owner on
24 October 2026; the report is `report.md` beside them. The model page now opens on the model: stage pills,
company tabs, a low company bar and the key figures, then "The model" card on the first screen at 1440×900,
with at least fifteen rows of the grid; the explaining sections follow it.

- **D-S1, D-S2.** The model page only; the index is unchanged. The site's tokens and type; the site is light
  only (2026-10-09), so there is no dark variant to check.
- **D-S3, density by pointer.** A `pointer-fine` screen (`(pointer: fine)`) in `tailwind.config.ts`: grid rows
  are 28px under a mouse or a trackpad, rule included, and a 44px target under a finger; never under 24px at any
  zoom. Every control outside the grid stays 44px, the name box included.
- **D-S4, a Checks sheet.** Read-only, worked from every cell's `tieOut` and every cell of a `gap_*` row
  (`view/checksSheet.ts`), never stored in a package; the download writes the same table as a Checks worksheet
  at the same addresses. A gap row agrees within the package's rounding tolerance. No fixture carries a gap
  row yet.
- **D-S5, D-S8.** No section bands and no issuer logos: a ticker monogram stands where a logo would.
- **D-S6, the inspector in the card.** From 1280px it sits beside the grid and folds away; it opens folded
  below 1440px. Narrower, it is the bottom panel it was. The page's second inspector column is gone.
- **D-S7, opening position.** The grid opens with the latest reported quarter and the forecast in view, three
  quarters before it where there is room; where there is not, the forecast wins over the earlier quarters.
- **D-S9.** The five key-figure roles, in one low row from 1024px.
- **Addresses are the workbook's.** Column letters, row numbers and the name box come from `ADDRESSING`
  (`view/sheetAddress.ts`); the formula bar shows a formula exactly as the package and the .xlsx hold it.
- **Tabs in reading order.** Model, Reported, Assumptions, Checks (PRD R2.4), under the grid; the export keeps
  its own order. A new tab clears the selection.
- **The company rail and the model header are gone**, replaced by `CompanyTabs` (same order, the address's
  query carried, so Connections stays on) and `CompanyBar`. A pair company the tabs list is not named again in
  the bar.

---

# 2026-10-22 — Finance in Action: the chain view (PRD D-M1 to D-C2, all defaults accepted)

Spec: `docs/company-models/chain-view/` (PRD, PLAN, PROMPT-site, PROMPT-model). On 22 October 2026 the owner
accepted every default and proposal in PRD §4, D-M1 to D-C2, in his words "kerjain aja, bikin langsung
semuanya". This entry records the site side (PLAN Fase B); the model side (Fase A) is separate work.

- **D-M1, no market data.** The model page's key-figure cards are operating figures: volume sold with a
  year-on-year pill, revenue, cost of revenue and the last profit subtotal per unit, and profit to owners from
  the driver tree's root. Every figure is worked from package rows (lib/finance-in-action/keyFigures.ts); a role
  the model does not carry says "Not in this model". The cards read the latest reported quarter with note-level
  detail, not the FY column, so a year-earlier quarter exists to compare with.
- **D-C1, `downstreamLines` in the link register.** Optional, site data, not the package contract:
  ticker → the downstream company's unit-economics line that carries the input. `validateLinkRegister` reports
  an entry whose ticker or line does not resolve (or names a revenue or subtotal line); the screen ignores it.
  `coal-to-cement` carries `{}` until the model work measures it. The contract (`types.ts`,
  `model-package.schema.json`, `fia.contract_schema`) is unchanged.
- **D-C2, company-level chain derived.** `companyChain` works upstream and downstream companies from
  `linksTo`/`linksFrom` on every read; links to a spanning layer are their own group. No company-to-company edge
  is written anywhere.
- **Anchors.** A stage's index section is `stage-<stage id>` (`#stage-stage-extraction`), a layer's
  `band-<band id>` (`#band-band-energy`), from `positionAnchor`, which the pills, the strip, the breadcrumbs and
  the homepage map all use. Every layer now has a section, so every pill lands.
- **Homepage doors.** At the finance distance only, the plate generator's `StageModelsHit` (emitted after every
  other hit, so the existing keyboard order holds) and the column's stage box link to the stage's section with
  "n models" or "planned". The counts come from a feed ChainPlate lazy-loads by build flag: the preview or the
  live registry; with neither flag nothing loads. In production this adds the published-models read to the
  homepage (one cached request, the same query key as Section 06).
- **Download .xlsx** moved from the page header into "The model" card, so it stays the page's only primary
  action. Full screen is a modal dialog that traps focus; Escape returns it to the button.

---

# 2026-10-22 — The glimpse's arrows show on a phone too

Owner request, the same day: "make the arrows show on mobile too". The two arrow buttons ("Earlier in the
row", "Further along the row") were hidden below 768px, where the swipe was thought enough. They now show at
every width, in the header beside the pause button, the same 36px circles; nothing else about them changes (a
tap moves the row one column to the page's margin, stops it, and lets it run three seconds later; disabled at
a still row's ends). At 320px the heading and three buttons still fit on one line with room to spare. A tapped
button keeps its hover tint until the next tap elsewhere, as the pause button always has on a touchscreen.

Tests: `tests/unit/glimpse.test.tsx` (no class hides the arrows at any width); `tests/e2e/glimpse.spec.ts`
(at 1440, 1280 and 390 both arrows visible, the pause button's size and on its line; at 390 with touch, a tap
on each moves the row one column to the margin; with reduced motion at 390, the arrows jump and are disabled
at either end). No test was added or removed; `MIN_TESTS` stays at 1391.

---

# 2026-10-22 — The arrow keys move the glimpse again

Owner request, the same day, after the entry below: "make the arrow keys scroll the row again". The still row
had been a focusable scroller the arrow keys moved; the carousel that replaced it was moved by Tab and the
arrow buttons only.

- **The row is a Tab stop again**, after the header's buttons and before the columns, named by the heading
  ("Glimpse", a list), whenever it has somewhere to go, running or still. Focus on it holds the running row,
  as focus on a column does, until three seconds after focus leaves.
- **On the row, ArrowLeft and ArrowRight move it one column**, as the arrow buttons do: the column lands at
  the page's margin, at once for reduced motion. Before, the still row scrolled natively by the browser's
  arrow-key step (about 40px); a column a press matches the buttons and the carousel's stops.
- **On a column, they take focus to the next column** (round the loop when the row runs, stopping at a still
  row's ends) and the row brings that column to the margin. Paging the row under a focused link would leave
  focus off the frame's edge, out of sight.
- **Alt with an arrow is left alone** (the browser's back and forward), and Ctrl, Meta and Shift with an arrow
  too. Up and Down stay the page's.
- **The ring.** The list moves under the frame, so a ring on the list would move off screen with it: the frame
  draws it, inset, 2px of `--ring`, as the still row's was, and the edge fade lifts while the row has focus.

Tests: `tests/unit/glimpse.test.tsx` (the row a Tab stop only with somewhere to go; the arrow keys on the row,
Alt and ArrowDown left to the page; on a column, focus along and the row brought to it, the still row's ends
and the loop's wrap; reduced motion jumps); `tests/e2e/glimpse.spec.ts` (at 1440, running and with reduced
motion: Tab order, the ring, a column a press on the row, focus along the columns each at the margin and whole
in view, no sideways page scroll). `MIN_TESTS` rises from 1388 to 1391 (actual 1395).

---

# 2026-10-22 — The glimpse can be taken by hand

Owner request, the same day: the running row could not be moved. It was a CSS keyframe marquee
(`translateX(0)` to `-50%` on a strip holding the list twice) inside a frame with `overflow-x: clip`, so the
row had no scroll position for a swipe, a drag or a trackpad to move, and nothing listened for them; only
the pointer (hover), focus and the pause button could stop it. Asked for: the row keeps running when nobody
touches it, follows the reader's hand at once, stays where it is let go, and runs again from there about
three seconds later. Decided without the owner, as asked ("pick the most conservative option, log it"):

- **Embla, used directly, not shadcn/ui's `Carousel` wrapper.** The request preferred shadcn's Carousel with
  `embla-carousel-auto-scroll`; nothing like it was in the repository. `src/components/home/Glimpse.tsx` uses
  `embla-carousel-react` (the engine and hook the shadcn component is built on) because the wrapper would
  replace the row's list (a `ul` named by the heading, one `li` per essay, which screen readers, the tests and
  the homepage's test read) with `role="group"` slides, and put its arrows on the row's sides instead of the
  header beside the pause button. No `src/components/ui/carousel.tsx` is added, since nothing would import it.
- **Three dependencies:** `embla-carousel-react` 8.6.0 (with `embla-carousel` and
  `embla-carousel-reactive-utils`), `embla-carousel-auto-scroll` 8.6.0 and `embla-carousel-wheel-gestures`
  8.1.0 (with `wheel-gestures`). Embla has no wheel support of its own; the plugin turns a sideways trackpad
  scroll into a drag and calls `preventDefault` only for a wheel that is mostly sideways, so a vertical wheel
  over the row still scrolls the page. Shift and the wheel: browsers turn the delta sideways themselves
  (Chromium on Windows and Linux, Firefox, macOS); where one has not (Chromium's synthetic input, in the e2e
  suite), the glimpse turns it before the plugin reads it.
- **Speed and direction unchanged:** right to left (`direction: 'forward'`) at 30 px/s. Embla steps its
  animation at a fixed 1/60 s whatever the display's rate, and AutoScroll's `speed` is pixels per step, so
  the speed is 0.5. Measured at 1440, 1280 and 390: 30 px/s within 2.
- **The loop** is Embla's `loop`: it shifts a column from one end of the row to the other, so the list is
  drawn once and the second copy, `aria-hidden` and out of the tab order, is gone. Each column carries the
  gap after it inside its box (16rem of text and 2rem of padding, 18rem and 2rem from 640px), so the seam
  between the last column and the first is a gap like any other. Whether the row can loop is measured before
  the carousel is made (`src/hooks/useCanLoop.ts`, Embla's own test: every column but one must cover the
  frame); it replaces `useMarqueeDuration`, which is deleted with the `marquee` keyframes in
  `tailwind.config.ts` and `EssayCardLink`'s `tabIndex` prop.
- **Let go, it stays.** `dragFree`: no snapping back to a column. A flick glides on as any touch scroller does,
  and stops where its momentum runs out.
- **What holds it, and for how long.** A drag, a swipe or a sideways scroll (Embla's `pointerDown` and
  `pointerUp`, which the wheel plugin raises too), a mouse over the row (a finger's pointer events are not a
  hover), keyboard focus in it (a click's focus is not), and the arrows. Each holds it at once, and the row
  runs again **three seconds after the last of them lets go**, from where it stands. That includes the hover,
  which used to let it go at once: the request names it with the others. On a desktop the pointer is still
  over the row after a drag, so there it runs again three seconds after the pointer leaves. The plugin never
  starts or restarts the row by itself (`playOnInit: false`, `stopOnInteraction: true`); the glimpse decides.
- **The pause button wins.** While it is pressed nothing starts the row again: not a drag, not the pointer
  leaving, not focus leaving, not a resize. Pressed again, the row runs at once.
- **Arrows on a wide screen** (from 768px, Tailwind's `md`), in the header beside the pause button and in its
  style, with the still row's names ("Earlier in the row", "Further along the row"). Each stops the row,
  moves it one column so that column stands at the page's margin under the heading, and lets it run three
  seconds later. Hidden on a phone, which has the swipe. *(Superseded the same day: shown at every width; entry "The glimpse's
  arrows show on a phone too" above.)*
- **Keyboard.** The links are the Tab stops, as they were in the running row; Embla's `watchFocus` brings a
  column reached by Tab to the page's margin at once. The still row used to be a focusable scroller the arrow
  keys moved; it is now the same carousel, so for a keyboard there are the Tab stops and the arrows, and the
  arrow keys no longer move it. *(Superseded the same day: the arrow keys move it again; entry "The arrow keys move the glimpse
  again" above.)*
- **Reduced motion:** no auto-scroll and no pause button, and the row moves by hand (drag, swipe, trackpad,
  the arrows, which jump instead of easing). It is the carousel without `loop`: its first column at the page's
  left margin and its last ending at the right one, as before, with no native scrollbar now. Same for a row
  too short to loop and for the placeholders while loading.
- **Kept exactly:** the column (eyebrow, title, five-line deck, month), its widths, the 2rem gap, the edge fade
  (now on the frame only while the row runs, as before), the frame's clip and focus-ring room, and the
  section's `border-b py-12`. `touch-action: pan-y pinch-zoom` on the list leaves a vertical swipe to the page.
- **A drag never opens an essay** (Embla cancels the click that ends a drag of more than 10px); a click and a
  tap do.
- Without `ResizeObserver` and `IntersectionObserver`, which Embla needs (jsdom), the row is a plain list.

Tests: `tests/unit/glimpse.test.tsx` replaces Embla's hook with a stand-in and holds the glimpse's own part:
when it runs and when it stands still, 30 px/s forward, each hold and the three seconds after it, the pause
button over every hold, the arrows (one column; at once for reduced motion). `tests/e2e/glimpse.spec.ts`
(Chromium) at 1440, 1280 and 390: the speed, the last column directly before the first and the columns
covering the frame; a mouse drag, a trackpad scroll and Shift with the wheel following the input and a
vertical wheel scrolling the page; release, three seconds still, then running from there; a drag opening
nothing and a click opening the essay; hover and keyboard focus (columns 2, 3 and 10 at the margin); the
pause button through a drag, a hover and a scroll; the arrows; at 390 with touch, a swipe, a vertical swipe
scrolling the page and a tap opening the essay; reduced motion at 1440 and 390. `MIN_TESTS` rises from 1384
to 1388 (actual 1392).

Rollback: revert the merge on `main` (the deploy follows), or promote the previous production deployment in
Vercel. No data or schema is involved.

---

# 2026-10-22 — Finance in Action: two ways in, FSRE and manual (D1–D7)

Branch `claude/fia-two-gates-gslvkn`. Spec: `docs/company-models/two-gates/PRD.md` and `PLAN.md`; build
report `report.md` and owner runbook `RUNBOOK.md` beside them. Migration
`supabase/migrations/20261022100000_fia_two_gates.sql`, applied on 22 Oct with `apply_migration` (name
`fia_two_gates`) on the owner's instruction ("merge, finish everything"); the evidence is in `report.md`.
Exposing `fia` in the Data API and phase 0 (`VITE_FIA_LIVE` on Production) remain the owner's, in that order
(`RUNBOOK.md` §2.2); until then Production shows the legacy page and never reads `fia`.

- **D1, two ways in, one view (agreed 22 Oct).** The site reads `fia.model_packages` instead of
  `fsre_published.model_packages`: the FSRE channel, untouched, and a manual channel, `fia.manual_release`,
  filled with `scripts/fia/publish-manual.ts`. `channel` is a column of the view, never part of `package`, so
  the contract (proposal v3.1) is unchanged. Every package still passes `buildRegistry` on the page.
- **D2, a ticker in both channels (agreed 22 Oct).** As built: `DISTINCT ON (ticker) … ORDER BY approved_at
  DESC NULLS LAST, (channel = 'fsre') DESC, version DESC, content_hash`. The most recent approval wins, FSRE
  wins an exact tie, a null `approved_at` loses to any time (`DESC` alone would put it first), and two rows of
  one channel that tie fall to a fixed order rather than to the plan. Because the order is by time, a manual
  approval dated more than a minute ahead of the moment it is made is refused (it would outrank everything
  until withdrawn); the script stamps `now()`.
- **D3, who owns what (default, accepted with the owner's merge instruction of 22 Oct).** Schema `fia`, owned
  by this repository's migrations, plus `fia_private` for the helpers (the FSRE reader and the guard triggers),
  never exposed to the Data API. No DDL, grant or row in `fsre`, `fsre_private`, `fsre_status` or
  `fsre_published`; the fingerprint (`supabase/tests/fsre_fingerprint.sql`) was identical before and after, on
  a local stand-in and on production (229 objects, total `201cddfeaa5ae54387a05fa5e47d6d79`, no outside
  dependant, both times). FSRE is read by `fia_private.fsre_packages()`, plpgsql, **as the caller**: no
  view depends on `fsre_published.model_packages`, so an FSRE migration may replace its view, the migration
  applies on a database without FSRE (a local stack; the channel is then empty), and anon sees FSRE packages
  only as far as FSRE's own grant on its view allows. One way in does not take the other down: a view the
  reader cannot read (grant revoked, a column renamed, dropped or retyped) leaves the FSRE channel empty with a
  database WARNING, and the manual packages still show (found by an independent review of the branch; shown on
  the local stand-in). Rejected: a view naming `fsre_published` directly (fails without FSRE, and an FSRE
  `DROP VIEW … CASCADE` would drop the site's view with it); a SECURITY DEFINER reader (it would read past
  FSRE's grant).
- **D4, the contract in the database (default, accepted with the owner's merge instruction of 22 Oct).**
  `pg_jsonschema` (0.3.3, the version the project offers) in `extensions`. `fia.contract_schema` holds `model-package.schema.json` verbatim, insert-only; a
  unit test keeps the migration's copy equal to the file. A trigger refuses a manual row that does not match;
  a missing contract refuses rather than lets through. On 2,005 packages (the five SYNTHETIC ones and 2,000
  seeded single mutations) pg_jsonschema and ajv agreed every time.
- **D5, a failed gate (default, accepted with the owner's merge instruction of 22 Oct).** Never shown. The
  manual table refuses `published` with a failed gate (staged is allowed); the view drops such a package from either channel **before** choosing, so an
  older valid package of the ticker shows rather than nothing. Only the gate is filtered there, as R2 says: a
  newer FSRE package the site refuses for another reason (provenance not `filings`, say) still wins D2 and the
  page lists it under "Not shown"; filtering provenance in the view as well is the owner's call (it would also
  hide the synthetic FSRE packages the preview build shows).
- **D6, placement (default, accepted with the owner's merge instruction of 22 Oct).** INDY and ADRO on A121 Coal
  production; BREN on `band-energy` (accepted by `CHAIN_POSITIONS`/`groupAlongChain`), unit MWh. The owner was to
  give BREN's sub-industry code and name; asked to finish without stopping, I used **J411 "Electric
  utilities"**, the exchange's own classification of BREN (and of PGEO, the other listed geothermal producer)
  in the repository's IDX-IC snapshot (`docs/world/sources/issuers-snapshot.json`), coded like A121 and B121,
  and already on `band-energy` in the world registry. One JSON edit changes it. Still for the owner: since its
  2024 restructuring the listed ADRO is Alamtri Resources Indonesia, the thermal coal business having moved to
  Adaro Andalan Indonesia (AADI); A121 keeps ADRO as D6 says.
- **D7, depth and Capital in Motion (default, accepted with the owner's merge instruction of 22 Oct).** All
  three `executive`; INDY [3, 8], ADRO [3, 9], BREN [4, 6].
- **Row security without a policy, as PRD R1 says.** `fia.manual_release` and `fia.contract_schema` have RLS
  on, no policy and no grant to anon or authenticated. The README's "zero tables without a policy" invariant
  was written for the public schema's tables, which carry default grants; if the owner wants it here too, a
  restrictive `USING (false)` policy changes nothing in behaviour. The Supabase linter will also report
  `fia.model_packages` as a security-definer view: it is the design (anon reads the table only through it).
- **Migrations are applied with `apply_migration` or the SQL Editor, never `supabase db push`** (README),
  although PLAN phase 6 offered the CLI.

---

# 2026-10-22 — The consolidation series wears the essay layout

Branch `claude/consolidation-essays-layout-45352w`. Owner report: on desktop every essay of the
Consolidation series renders with a layout unlike the other essays; the FSLI essays imported in the
same batch are fine.

- **Root cause: the template, not the data.** `/accounting/consolidation/<slug>` is a series
  essay's own page, but `ConsolidationDetail` rendered it inside the topic-list template: a
  `max-w-3xl` box with no `mx-auto` (pinned left, half the desktop empty), a display-font h1 in a
  768px box while the 728px body centred inside it (title 20px left of the body), a sans deck, no
  "On this page" rail, no byline. The FSLI page and every other essay page centre the 728px measure
  under the editorial title/deck with a TOC rail.
- **Fix: the series essay renders through `ArticleShell`**, the single canonical essay layout (Finance,
  Green Transition, Next Big Thing and `/essays/:slug` already use it). Back link to Consolidated
  Reporting, prev/next in part order, related essays. The nine configured topic pages keep the topic
  template. No CSS keyed to the section, no per-essay switch.
- **Key takeaways are not passed.** The import copies them from each essay's own opening "In brief",
  so the end-matter box would print the same bullets twice. The FSLI page shows none either.
- **No data migration.** The six rows are byte-for-byte the format of the thirty FSLI rows that render
  correctly (TipTap `getHTML()` in `content`, the same `min-width` table styles and link classes, no
  wrappers or widths beyond those). A dry-run comparison found 0 rows to normalise. A snapshot of the
  six rows as served is in `backups/consolidation-essays-20261022T021749Z.json` (force-added; the
  folder is ignored for full dumps, and these rows are published).
- **The import now stores what the editor stores.** The studio writes `content` and `content_json`
  (the document `content` was serialised from); the 12 Oct import wrote `content_json: null`.
  `scripts/accounting-import/import.ts` now writes the document it already proves round-trips, to the
  row and its revision.
- **The 36 imported rows were backfilled the same day, on the owner's instruction** — see
  `docs/db/content-json-backfill-2026-10-22/`. Not by re-running the import: its markdown sources stay
  out of the repo, and its upsert would have fired the `updated_at` trigger and redated all 36 essays
  (share-card versions, feed dates, an "Updated" line) for a change no reader sees. The database built
  each document from the row's own `content`, wrote it only if its md5 equalled TipTap's
  `generateJSON` output for that row, and kept `updated_at` by disabling that one trigger inside the
  transaction.

# 2026-10-11 — Where We Are Now opens with two essays; its tab lists them

Branch `claude/pensive-fermi-t08feq`. Owner request: load "The Green Transition Isn't Only About
Green" and "Learn from the UK" into Green Transition's Where We Are Now, then publish.

- **Placement is data.** `section = 'green-transition'`, `phase = 'where-we-are-now'`, the
  finance-general catch-all `category_id` (Green Transition has no categories). The phase page orders
  newest first, so essay 1 (created 11 October) lists above essay 2 (10 October); `sort_order` 1 and 2
  are set but nothing reads them.
- **Body and end matter.** `content_json` is TipTap JSON in the editor's schema and `content` its
  `getHTML()`, both checked byte for byte against a local conversion of the owner's markdown. Key
  takeaways and references live in `presentation`, which the article shell renders after the body,
  and are not repeated in the body. The byline line is dropped; the page prints author and date.
- **Essay 2 reuses the stale draft's row** (`11cea50e…`, same slug). The SQL connector refuses DELETE,
  so the earlier incomplete draft was overwritten in full. The other stale draft,
  `why-indonesia-cannot-afford-to-wait`, is still there as an unplaced draft.
- **The tabs were empty.** `/green-transition/now`, `/gaps` and `/future` are static routes, so
  `GreenTransitionPhase` got no `:phase` and never queried. It now takes the segment from the path when
  the param is absent; the routes are unchanged (two test suites read the route table).
- **Prev/next stay in the phase.** The essay page took siblings from `category_id`, which for Green
  Transition is the catch-all shared with accounting and finance essays. It now reads section and
  phase, as the phase page does.
- **The current-condition index lists both essays**, in reading order.

---

# 2026-10-11 — The Green Transition Tracker is rebuilt as a sourced register

Branch `claude/sharp-noether-a2fkj7`, PR #69. Spec: `docs/spec/01_PRD.md` Part B and
`docs/spec/02_PLAN.md` PR 2; owner decisions D5–D7 there are closed.

## Rewritten with primary sources, not corrected in place — supersedes 2026-09-14

- **What changed.** The 2026-09-14 response kept every entry body as published and rendered dated
  corrections above it, with a fourth evidence state, "author observation"
  (`docs/response-2026-09-14/tracker-claim-ledger.md`). D6 replaces that: Q1 and Q2 2025 are
  rewritten from primary documents, and a claim with no primary source is deleted, not softened.
- **Result.** All 30 claims on the old page were listed for deletion with their wording quoted
  (`docs/spec/tracker_sources.md`, Part B); 14 new entries, one per sector per quarter, were
  written from the documents and signed off by the owner on 11 October 2026. The old text and its
  corrections stay in git history (`src/data/trackerIssues.ts` at `db79c55`).

## The register lives in the database

- `public.tracker_entry` (migration `20261011100000`), seeded from
  `supabase/content/tracker_entries.json` by `scripts/tracker/seed.mjs`. The JSON's entry text is
  copied from the signed-off file; the seed lands with `published = false`, and a later migration
  publishes it once the page has been reviewed on the preview deployment.
- RLS shows an admin the unpublished rows, so the preview can be reviewed while signed in; readers
  see published rows only.

## One page; the old routes redirect

- `/green-transition/tracker` stays (D5). `/tracker/q1-2025` and `/tracker/q2-2025` land on that
  issue's section of the page; `/tracker/archive` and the 22 entry pages land on the page.
- Typography per the owner's answer: issue bodies in the sans face at the essay size (19px) under
  serif headings; the column is the essay column (728px). No monospace and no bordered cards on
  the route.
- `/green-transition/current-condition` is a stub index for the essay series the tracker now
  belongs to. Its one essay shows as a title until it is published, then as a link.

---

# 2026-10-11 — Changed my mind is removed; the glimpse ends the homepage

Branch `claude/landing-argument-glimpse-marquee-fy7m4s`, restarted from `main` @ `1adf987` after
PR #68 merged. Owner request, the same day: the section headed "What I changed my mind about"
goes too.

- **Deleted:** `src/components/argument/ChangedMind.tsx` (`#changed-my-mind`) and its data
  `src/data/changedMind.ts` (`CHANGED_MIND`). Nothing else imported either; the folder
  `src/components/argument/` is gone with them.
- **No link pointed at it** from the site's nav, footer or components, and the database holds no
  essay, module, FSLI section or section manifesto that names `#changed-my-mind` (read-only query
  on production, 2026-10-11). An old `/about#changed-my-mind` or `/#changed-my-mind` now opens the
  homepage at its top.
- **The homepage is the map, then the glimpse.** The glimpse keeps its `border-b py-12` and is
  now the last section before the footer, as Changed my mind was.
- **The fragment jump stays** (`useFragmentOnArrival` in src/pages/Index.tsx). It is not this
  section's: FsliDetail uses it too, and `#industry-chain` and About's old links still arrive with
  a fragment. Its homepage tests now aim at `#industry-chain`.
- **The chain's provenance note** for `stage-processing` named `src/data/changedMind.ts`; it now
  cites the section by its last commit, `1adf987`.

Tests: `tests/unit/homePage.test.tsx` (the glimpse is the last section, neither removed section is
on the page, the map alone when nothing is published; the fragment tests on `#industry-chain`);
`tests/e2e/journeys.spec.ts` (an old About link keeps its fragment, now `#industry-chain`).
`navConfig.test.ts` renames one test. No test was added or deleted; `MIN_TESTS` stays at 1252.

---

# 2026-10-11 — The homepage's argument is removed; the glimpse runs

Branch `claude/landing-argument-glimpse-marquee-fy7m4s`, base `main` @ `2d37761`. Owner request,
two changes to the landing page and what it imports, nothing else redesigned.

## The argument section is removed

- **Deleted with nothing left mounted:** `src/components/argument/ReadingPath.tsx` (the section
  headed "The argument", `#the-argument`), its data `src/data/readingPath.ts` (`ARGUMENT`,
  `READING_PATH`, `READING_PATH_SLUGS`, `LINK_LABEL`), its query
  `src/hooks/queries/useReadingPath.ts` and its suite `tests/unit/readingPath.test.tsx`. Each had
  no other importer. `ChangedMind` stays where it was, now directly under the glimpse, so its
  folder `src/components/argument/` stays. *(Superseded the same day: `ChangedMind` removed too,
  entry "Changed my mind is removed; the glimpse ends the homepage" above.)*
- **No link pointed at it from the site.** No nav entry, footer or component linked
  `#the-argument`; the database holds no essay, module, FSLI section or setting that names it
  (read-only query on production, 2026-10-11). An old `/about#the-argument` or `/#the-argument`
  now opens the homepage at its top, as an unknown fragment does.
- **Rhythm.** Every homepage section is `border-b py-12`, so the glimpse and Changed my mind sit
  together as the argument did between them: 48px from the last column to the rule, 48px from the
  rule to the next heading, measured at 1440 and 375. No CSS was the section's own; its Tailwind
  classes go with the component.
- **The chain's provenance notes** (`ESSAY_ASSOCIATIONS[*].basis`, src/data/industryChain.ts, not
  shown) named the deleted data file; they now name it by its last commit, `2d37761`.

## The glimpse runs

- **A marquee, right to left, at 30 px/s,** the slow end of the 30–40 asked for, because the
  deck is five lines of serif: a column takes about twenty seconds to cross a 375px phone. The
  list is drawn twice on one strip; the `marquee` keyframes (tailwind.config.ts) move it from
  `translateX(0)` to `-50%`, which is one copy because each copy is its columns with one gap after
  each. A lap's length is not written down: `useMarqueeDuration` measures the copy and divides by
  the speed (one copy is half the strip: duration = trackWidth / 2 / speed), again on every resize
  of the page or the columns, so the speed holds as essays are added. The row starts mid-lap (a
  negative delay) so its first column stands under the heading, at the page's margin.
- **It stops** under the pointer, while a link in it has focus, and by a pause button in the
  header (where the still row keeps its paging buttons, in the same style). The button was added
  after review of PR #68 (Codex): a touchscreen has no hover and a tap on a column follows its
  link, so without it a reader there could not stop the row (WCAG 2.2.2). A column reached by Tab is
  brought to the page's margin (the animation is set to that point; a click does not move it), and
  the fade is lifted while keyboard focus is in the row so the focused column and its ring are whole.
  The frame clips sideways and does not scroll, so only the animation places the row.
- **The edges fade** over the page's margin (CSS `mask-image`, alpha only; no colour was added).
- **The second copy** is `aria-hidden="true"` and its links `tabIndex={-1}`, so a screen reader
  and Tab meet one list. `EssayCardLink` gained an optional `tabIndex` for it.
- **It stands still** for `prefers-reduced-motion: reduce` (read at render, `useMediaQuery`, and a
  `motion-reduce:animate-none` guard), as the row it was: scrolled by swipe, the two buttons or the
  arrow keys. It also stands still when one copy is narrower than the page (four essays or fewer on
  a 1440 screen), where two copies could not cover the frame for a lap and the empty end would show
  at the loop.

Tests: `tests/unit/glimpse.test.tsx` (the list twice with the copy hidden, the pause button, the
lap measured again when the columns change, still for reduced motion, for a short row and while
loading);
`tests/unit/homePage.test.tsx` (Changed my mind directly after the glimpse, no argument section);
`tests/e2e/glimpse.spec.ts` (at 1440 and 390: 30 px/s within 2, the strip exactly two copies wide,
the frame at the end of a lap byte-identical to its start and one gap off not; the pointer, the
pause button and keyboard focus stopping it, focus bringing columns 2, 3 and 10 to the margin; the
still row under reduced motion). The journeys suite drops its "three minutes" test, which read the
argument. `MIN_TESTS` falls from 1262 to 1252 (actual 1256): 16 deleted with the section, 6 added.
*(Superseded on 2026-10-22 for how the row runs, not that it runs: it is an Embla carousel a reader can
drag, swipe and scroll, drawn once, with no keyframes and no second copy; entry "The glimpse can be taken by
hand" above.)*

---

# 2026-10-10 — The consolidation working paper is the owner's PSAK 338 workbook, in a viewer

Branch `sweep/e-workbook`, base `main` @ `0487609`. The October 2026 site sweep, phase E (PRD R4).
The owner's decisions it applies, D8 to D11 and D15 to D17, are in `docs/sweep-2026-10/DECISIONS.md`
(phase 0).

## The viewer replaces the hand-built working paper — supersedes 2026-10-09

This supersedes "The consolidation working paper was rebuilt, not patched" in the 2026-10-09
public-site remediation entry below (line 94 at `0487609`). Section 4 of
`/accounting/consolidated-reporting` was a four-entity table whose combined, elimination and
consolidated figures were literals in `src/data/consolidationWorkingPaper.ts`; that file, `AccountRow`
and `tests/unit/consolidationWorkingPaper.test.ts` are deleted, and the entry stays as history. In their
place is the owner's dummy workbook, `docs/consolidation/source/pt-dummy-psak-338.xlsx` (PT Dummy - C
and its subsidiaries, 2022 to 2024), built by `npm run build:workbook` into
`public/consolidation/pt-dummy-psak-338.workbook.json` and read in `src/components/workbook/`: sheet
tabs, the name box and formula bar, a grid that renders only what is in view, an inspector with
precedents, dependents and cross-sheet jumps with Back, and the place in the URL (`?sheet=&cell=`).
Nothing is edited and nothing recalculated; every figure is Excel's cached value, and the Method
panel says so in R4.3's words. The committed workbook is the cleaned copy (D15, D16): no number,
formula or cached value differs from the owner's file.

## D8 to D11 as built

- **D8, the 49 error cells,** show as Excel shows them (43 `#REF!`, 6 `#VALUE!`) on an error fill,
  are said in words in the inspector, and are listed by sheet in the Method panel. The list lives in
  `src/lib/workbook/method.ts`, so the panel stands when the JSON does not load;
  `tests/unit/workbookViewer.test.tsx` holds it to the JSON.
- **D9:** `Adjustment Consolaa` (hidden), `Face Report` and `WP Consol` (empty) are not published,
  and the build fails unless its rule drops exactly those three. A formula that reads one names it
  and says it is not published.
- **D10:** the red type (an adjustment or a reviewer's flag) and the blue (a manual input) are kept,
  and the legend says what each means. The file writes red and blue two ways each, so the viewer has
  1,532 red and 32 blue cells, not the PRD's 969 and 30, which counted one way only
  (`docs/consolidation/build-report.md`, with ten of each for the owner to check the meaning).
  Open for the owner: a figure typed into the workbook is drawn in Finance in Action's sourced blue
  (R4.5 and R4.9: the PTBA reference's and Finance in Action's legend), so D10's blue, a different
  but close blue, is hard to tell from it in the grid; of its 32 cells, 8 are formula figures that
  read as typed ones. Either typed figures go to ink, which parts the viewer's legend from Finance in
  Action's, or D10's colours take a second mark beside the colour. Nothing is changed until the
  owner chooses.
- **D11:** Download .xlsx saves the committed workbook itself, as
  `pt-dummy-psak-338-working-paper.xlsx`. The build emits it as a hashed asset; nothing is generated
  in the browser.

## D15 to D17: what the repository holds

The owner decided D15 to D17 on 10 October, after the first build reported what the attached files
carried. The workbook was cleaned by `npm run sanitize:workbook`
(`scripts/consolidation/sanitize-workbook.ts`), which takes its cells by address, so no name it
removes is written anywhere in the repository: 26 cell values deleted and 5 labels shortened (D15),
and the file's metadata gone (D16: author fields, the OneDrive path, every comment and its authors,
73,336 legacy defined names; the four print ranges stay). A cell-by-cell comparison with openpyxl
over 31,869 cells differed at exactly the 31 edited cells, LibreOffice opens all 33 sheets, and the
branch's history was rewritten before its first push, so the one xlsx blob in it is the cleaned file.
The PTBA page in `docs/consolidation/reference/` is committed with its DATA block emptied (D17), as
a visual reference only. The three-letter codes in the workbook (STL, PSD, KLI, SLL, SLB, ALI) are
not names and stay unless the owner asks.

## The page around the viewer

Two sentences of the page's opening paragraph described the deleted table ("This working paper
shows how that is done, step by step, on an illustrative four-entity group under PSAK 110. The
figures are round numbers, not a company's accounts.") and are removed, with nothing in their place.
The Accounting landing's Consolidated Reporting row now describes the workbook, drawn from R4.6's
heading and default lede and marked OWNER-REPLACEABLE. R4.9's shared primitives were not extracted:
nothing is shared with `ModelGrid` without refactoring it, which R4.9 rules out, so the viewer uses
Finance in Action's lens roles, `--fia-*` tokens and number formatter directly.

## The PRD's cell count does not reconcile with the file

R4.8 asks the build test to hold the workbook's sheet, cell and formula counts to the profile in
PRD §1.2.4. Sheets (33) and formulas (15,485) match. The PRD's "~17 ribu sel" does not: the file
has 31,843 cells with a value before sanitising (15,485 formulas and 16,358 constants), 31,789 on
the published sheets. exceljs and, independently, openpyxl count the same; 119 of the cells hold an
empty text. The ~17,000 is close to the constants alone, which may be what was counted.
`tests/unit/workbookBuild.test.ts` holds the measured counts, and checks that every cell with a value
or a formula on a published sheet reaches the JSON with its formula;
`docs/consolidation/build-report.md` sets the two figures side by side.

## Light only

The viewer follows the site's tokens, and the site is light only (2026-10-09, "Light only,
stated"). Its four new tokens (`--wb-red`, `--wb-blue`, `--wb-error-bg`, `--wb-error-fg`) have no
dark values, and its precedent and dependent fills are Finance in Action's. R4.5's dark mode "from
the site's tokens" is therefore no dark mode, and phase E has no dark-mode screenshot.

## The JSON is fetched, never bundled

One file of 1,701,069 bytes (309 kB gzipped), under R4.7's 4 MB, so not split per sheet. It is
fetched with the viewer's own chunk when the section comes within 600 px of the viewport, or at
once when the URL names a sheet or a cell, and such a link opens the page at the viewer. If either
fails, the section says so, and the Method panel and the download, which need neither, stay.
`tests/e2e/workbook.spec.ts` measures a click on a cell (R4.7: under 50 ms): in the runs of 10
October, 5 to 24 ms to the formula bar, and at most 46 ms to the next frame, which also waits on the
browser's frame clock and so on the machine's load. The test holds every click to the formula bar,
and the median to the next frame, under 50 ms.

---

# 2026-10-10 — Finance in Action is card 06 on /finance, and goes live now (site sweep, phase F)

Branch `sweep/f-fia`, base `main` @ `0487609`. Executes PRD R5 of the October 2026 site sweep under
owner decision D12(a) (PRD §1.3, copied to `docs/sweep-2026-10/DECISIONS.md` by phase 0). The phase
report is `docs/sweep-2026-10/report-f.md`.

## Card 06 is a finance_sections row (PRD R5.1)

- `supabase/migrations/20261010110000_finance_section_06.sql` inserts `finance-in-action`, "Finance
  in Action", sort_order 6, icon `Table`, on conflict (slug) do nothing. Its description is
  `COPY.seoDescription` (`src/lib/finance-in-action/copy.ts`), OWNER-REPLACEABLE and editable in
  place from the Finance Workspace. **Not applied; the owner applies it**, after the flag deploy
  below.
- The landing links every row to `/finance/<slug>`. `App.tsx` declares `/finance/finance-in-action`
  ahead of `/finance/:track`, and the router ranks a static segment first anyway, so the card opens
  the Finance in Action index, never a track index. The landing's header comment no longer says
  "four equal domain entry points".
- `tests/unit/financeLandingSection06.test.tsx` draws the sixth card from the migration file's own
  VALUES tuple, and tells the index from a track index by more than its h1: a track index at that
  address draws the same h1, from the row's title.
- **No entry in this file is superseded.** "Numbering was rejected, deliberately" (line 1357 at
  `0487609`, in the 2026-08-03 entry "The Sections list: kept by owner decision, reshaped by
  subtraction", line 1337) reads the landing's numbers as a learning order. That holds for 01–04
  only, as it has since capital-allocation became 05, and its decision (no numbers on the homepage)
  stands. 06 is the section's own name (`COPY.section`, "Section 06"), not a later step of the
  syllabus.

## The live flag goes on in Production now — owner decision D12(a)

- `VITE_FIA_LIVE=true` on Vercel Production, `VITE_FIA_PREVIEW` unset, redeploy. Until the first
  package is approved in Personal OS 4F, the index lists the slate as "Planned; no model yet.", with
  no figure; `assert-no-synthetic` keeps the fixtures out of that build. The owner's reason: a slate
  without numbers is more honest than the legacy "0 of 0 models available" page.
- The live path needed no change first (PRD R5.2). Phase 0 read it as anon on 2026-10-10
  (`docs/sweep-2026-10/report-0.md` §2): `rest/v1/model_packages?select=package` with
  `Accept-Profile: fsre_published` answers `200 []`, and `scripts/world/check-published.ts` reads 0
  packages. Not `PGRST106`: the schema is exposed, and nothing waits on the Data API settings.
- **Supersedes** the FSRE publish path's O3, which is not an entry here: it is recorded in
  `docs/company-models/report-fsre-publish-path.md:4` and `:87` at `0487609` ("after the first real
  package is approved"), and both places now carry a note. `src/lib/finance-in-action/flag.ts` and
  `.env.example` say D12(a).
- **Order: the flag deploy first, then the migration**, or both in one sitting. The card appears the
  moment the row exists, with no deploy, and on a build without the flag it opens the legacy page
  D12 rejects. PRD §2.3 lists the migrations (step 3) before the Vercel flag (step 4); for this phase
  the order is the other way round, for that reason. The migration's header says so.

## With nothing published, production shows the slate and no PublishedNote

- PRD R5.3 expects production to show "the slate and `PublishedNote`". With production's answer
  today, `200 []`, it cannot: `PublishedNote` speaks only when the read fails (`not-available`,
  `refused`, `failed`; FSRE publish path G8), and `tests/unit/fiaLive.test.tsx` pins that an empty,
  successful read draws no status note. The code is kept: an empty read is not a failure, and a
  sentence for it would be new copy in the owner's voice.
- The phase F screenshot `fia-live-published-note-not-available-*.png` is a mocked `PGRST106`, not
  what production will show; `fia-live-nothing-published-*.png` is. The production check after the
  redeploy is: the slate is listed, no `SYNTHETIC` anywhere, no `[data-published-failure]` element,
  and the `assert-no-synthetic` line in the Vercel build log.

## The first real package is read, not accommodated (PRD R5.4, R5.5, R5.7)

- When the owner approves the first package (PTBA) in Personal OS 4F, it is read as anon and checked
  against `src/lib/finance-in-action/contract/model-package.schema.json`. If `live.ts` refuses it
  (FSRE's `fsre-workbook` snapshot is not the site's `proposal-v3.1`), the answer is a field-by-field
  diff in `docs/company-models/contract-diff-2026-10.md` for `fsre-skills` (P-2): the site's
  contract does not bend to fit, and nothing is written to an `fsre*` schema.
- `src/data/finance-in-action/sub-industries.json` already carries the slate's two sub-industries,
  A121 (PTBA, ITMG) and B121 (INTP, SMGR). Nothing added, and no ticker added to the slate.
- The legacy pages (`FinanceInActionIndex.tsx`, `FinanceModelDetail.tsx`, `ModelAdminPanel.tsx`,
  `useFinanceModels.ts`, bucket `finance-models`) stay in place (PRD R5.7); they are cleanup
  candidates for a separate decision.

---

# 2026-10-10 — The glimpse holds every published essay; the star decides who leads

Branch `sweep/c-home`, base `main` @ `0487609` (October 2026 site sweep, phase C, PRD R2). Owner
decision D3(a) (`docs/sweep-2026-10/DECISIONS.md`, added in the sweep's phase 0): "semua essay
terbit; yang dibintangi tampil dulu urut `selected_rank`, sisanya `created_at desc`; batas 30".
The reason given with it: 21 essays were published and 3 were starred, so the homepage showed 3;
the order stays the owner's through Admin, and a new essay reaches the homepage without a star.

## The rule

- **Two reads in one hook, joined.** `useSelectedEssays(limit)`
  (src/hooks/queries/useSelectedEssays.ts) reads the starred published essays in the owner's order
  (`selected_rank` ascending, an unplaced star after every placed one, then newest first), then
  every other published essay newest first, and returns the first in front of the second, cut to
  `limit` (30 on the homepage, `GLIMPSE_LIMIT` in src/pages/Index.tsx). An essay starred between
  the two reads comes back from both and is shown once. The hook keeps its name and signature, so
  no caller changed. *(Superseded 2026-10-10, after review of PR #63: one read. Two reads were two
  snapshots, so an essay starred or unstarred between them could come back from neither. The hook
  now reads the published essays once, the database sorting the starred first in the owner's order,
  puts the rest back in date order itself and stops the read at twice `limit`; its header says why.
  `selectedOrder.test.tsx` stars an essay between two reads of the emulated table. After review of
  PR #66, saving the homepage order ranks only rows still starred (`useSaveSelectedOrder`), so a
  panel opened before an unstar cannot leave a rank on an unstarred essay, which would sort it ahead
  of newer ones in the read; production held no such rank on 10 October 2026.)*
- **The star decides who leads, not who is in.** `is_selected` is still the one featuring flag and
  `selected_rank` still the order, both set as before in Admin → Content → "Homepage order"; the
  panel's comments now say the unstarred follow newest first.
- **The 42703 fallback stays on the starred read,** the only one that names the rank. The other
  read never names it and needs none. *(Superseded 2026-10-10 with the two reads: the one read
  falls back, without the rank.)*
- **The Finance landing is not widened.** `useFeaturedFinanceEssay` still takes the first finance
  essay of the starred order (PRD R2.2); only the homepage row reads unstarred essays.
- **Nothing published: the section is absent,** as it was with nothing starred.

Tests: `tests/unit/selectedOrder.test.tsx` runs the hook against an emulated essays table
(`tests/unit/helpers/essaysTable.ts`: starred by rank then the rest newest first, nothing starred,
the limit, the 42703 fallback, an essay returned by both reads); `tests/unit/glimpse.test.tsx`
feeds the row from the homepage's own query (3 starred + 18 others); `tests/e2e/glimpse.spec.ts`
seeds the production shape (3 starred, 18 not, a starred draft) through the production bundle and
asserts all 21 columns in order, the draft nowhere. *(Superseded 2026-10-10 with the two reads: the
test of an essay returned by both reads went with the duplicate filter. `selectedOrder.test.tsx` now
also stars an essay between two reads of the emulated table, keeps the rest newest first when an
unstarred essay still holds a rank, and cuts only what the row would not show when the read stops at
twice the limit.)*

Supersedes three passages of the 2026-10-09 entry "The homepage below the map is one row: the
glimpse", each marked in place (line numbers at `0487609`, where the sweep's PRD counts them): "A
horizontal row of starred essays" (line 28), "Zero starred essays: the section is absent" (lines
44–45), and `is_selected` as "who is on the homepage" (lines 49–52).

---

# 2026-10-10 — About is removed; the argument and Changed my mind move to the homepage

Branch `sweep/c-home`, base `main` @ `0487609` (October 2026 site sweep, phase C, PRD R8). Owner
decisions D4(a): "The argument" and "Changed my mind" "pindah ke Home di bawah Glimpse, copy tidak
diubah", because they are the site's core argument and `#the-argument` and `#changed-my-mind` are
linked from essays and tests; and D5(a): "On the shelf" is dropped, a static reading list with no
link into the site.

## What moved and what went

- **Moved as they were.** `ReadingPath` (the full form, `#the-argument`) and `ChangedMind`
  (`#changed-my-mind`) mount in src/pages/Index.tsx directly under the glimpse, as the same
  components, so the ids, the markup and the copy are About's. About's chain section
  (`IndustryChainSection`) is not repeated: the homepage opens on the same map. It stays exported,
  mounted nowhere, because the world shell's suite renders it. *(Superseded 2026-10-11 for
  `ReadingPath`: removed from the homepage with its data and query; entry "The homepage's argument
  is removed; the glimpse runs". And for `ChangedMind` the same day; entry "Changed my mind is
  removed; the glimpse ends the homepage".)*
- **Gone with the page:** `src/pages/About.tsx`, its hero, its "Selected Essays"
  (`useSelectedEssays(8)`; the hook stays for the homepage) and "On the shelf". The About door is
  gone from the header row (`MainNav.tsx`), from `navConfig.ts` (so from the phone's drawer, which
  reads it) and from the footer's Sections list; the header row is seven labels again.
- **`/about` forwards to `/`, client-side** (`AboutRedirect`, src/App.tsx, `Navigate` with
  `replace`). `vercel.json` manages rewrites and headers but no redirects, so there is no 301, and
  `/about` was never in the sitemap. The redirect keeps the query and the fragment: the map's
  address (`?lens=&distance=&node=`, `useChainUrl.ts`) is a published contract the homepage's map
  reads too, and `#the-argument` / `#changed-my-mind` name the same sections on `/`. The PRD's
  line is a bare `<Navigate to="/" replace />`; keeping the address is the one addition, so an
  essay's link into the map or into Changed my mind still lands where it pointed.
- **The homepage goes to a fragment itself.** The two sections sit far down and draw after the
  browser has looked for the fragment, so a fresh load of `/#changed-my-mind` stayed at the top.
  Home now makes the jump once, when nothing is fetching any more, clear of the sticky header, and
  not if the reader has already scrolled; a fragment that comes later (the skip link) is the
  browser's, and a fragment that is not valid percent-encoding is looked up as typed.
- **Links into the map point at `/`:** Finance in Action's "on the chain map" links
  (`chainMapHref`, src/lib/finance-in-action/chain.ts) and the address examples in
  `useChainUrl.ts` and `docs/response-2026-09-14-v5/linking-into-the-map.md`. The compact
  `ReadingPath`'s pointer to "the About page" is removed, not reworded: nothing mounts the compact
  form, and a new sentence there would be one the owner did not write.
- `docs/INVENTORY.md` and `docs/ROUTE_VERIFICATION.md` record the homepage and the redirect. Older
  reports that name `/about` (`docs/review/`, `docs/response-2026-09-14*/`, `GATE_LEDGER.md`,
  `SESSION_LOG.md`) stay as history.

Tests: a homepage suite (`tests/unit/homePage.test.tsx`: the argument and Changed my mind under
the glimpse with the map first, the argument in full, the fragment jump and its two edges, the
argument kept with nothing published); the header row and footer without About
(`siteChrome.test.tsx`) and no About door (`navConfig.test.ts`); e2e, an old About link landing on
the homepage with its address and fragment (`tests/e2e/journeys.spec.ts`), the three-minute
journey on Home, and `/about` in the smoke list as a redirect. The chain suites that opened
`/about` open `/`. `MIN_TESTS` rises from 1148 to 1162 (actual 1166); none fell.

Supersedes, each marked in place (line numbers at `0487609`): in the 2026-10-09 glimpse entry,
"One order for the site" (line 53, About's half) and "The world comes onto the homepage by its
flag" (lines 71–79, the About slot); in the 2026-10-09 remediation entry, "Owner-protected surfaces
left alone" (lines 125–129, About's hero).

---

# 2026-10-10 — FSLI pages: the essay is the body (site sweep, phase B)

Branch `sweep/b-fsli`, base `main` @ `0487609`. Executes PRD R1 of the October 2026 site sweep under
owner decisions D1(a) and D2(a) (PRD §1.3, copied to `docs/sweep-2026-10/DECISIONS.md` by phase 0).
The phase report is `docs/sweep-2026-10/report-b.md`.

## The essay is the page body; the outline and its table reader are deleted — owner decision D1(a)

- A line item with a published essay (`essays.fsli_slug`) now shows, after its figures cards, the
  essay's title as the first h2, its snippet as the lede, then `ArticleBody`. The fixed ten-part
  outline (`contentSections` / `issueSections` / `exampleSections`), `FsliContentSection` and
  `useFsliSections` are deleted, and with them every "Not written yet." line and the "Related
  Essays" block at the bottom. "On this page" lists the essay's own h2/h3 headings; its search box
  stays.
- **The site no longer reads `fsli_sections`.** The table and its rows are left in place: dropping
  it is a schema change nobody asked for. Nothing written disappears, because no row has content
  (PRD §1.2.1, checked 2026-10-10). A line item with neither an essay nor a cover ends at its
  figures, with no empty state: the decision's reason is that a standing outline only waits to be
  filled with generic text.
- **Supersedes** two entries, named by their lines at `0487609`: the whole of "2026-08-01
  (session 7) — FSLI empty state over seeded prose" (`:2414-2430`: unwritten sections saying "Not
  written yet.", `fsli_sections` as the single source of section prose, and the outline's
  `issues-overdrafts` heading); and, in "FSLI prose is authored as essays, not in a second editor",
  the sentence "Legacy `fsli_sections` content still renders read-only, so nothing written
  disappears" (`:2615-2616`). The rest of that entry stands: FSLI prose is written in the studio as
  accounting essays. Both passages keep their text and carry a "(Superseded 2026-10-10 …)" note in
  place, pointing here.

## Heading ids are the slug of the heading's words, minted once per page (PRD R1.2)

- An FSLI heading's id is the slug of its text, with `-2`, `-3`… only when the page already holds
  that slug (`src/lib/fsliToc.ts`). The ids are minted for the whole page and passed to each
  `ArticleBody` through a new optional `headingIds` prop, so the table and the body cannot disagree,
  and two essays on one page (none today) cannot render the same id. `root` and `main-content`
  are taken before any heading.
- **The essay page keeps its positional `section-N-<slug>` ids**: it passes no `headingIds`. Its
  anchors may already be shared, and R1 does not reach that page. Rejected: reusing the positional
  ids on the FSLI page (the branch's first version), because N counts every heading above, so one
  added heading moved every anchor below it; and changing both pages to the new scheme, which
  breaks every essay-page anchor in circulation.
- Known limits: renaming a heading changes its anchor; the index on a repeated heading follows the
  order of the repeats. Footnote ids (`fn-1`) are still per essay, so two essays with footnotes on
  one page would share them; recorded, not acted on, until a line item has two essays.

## "Covered in …" for line items without an essay — owner decision D2(a)

- `supabase/migrations/20261010100000_fsli_covered_by.sql` adds `fsli_pages.covered_by_slug` (text,
  null, references `fsli_pages (slug)`) and maps eight pages as PRD R1.3 lists; the three
  `other-*-assets` pages stay NULL. **Not applied; the owner applies it** through `apply_migration`.
  The mapping disables the `updated_at` trigger around its UPDATEs, in one transaction, so the eight
  pages keep the "Updated" date they show.
- A page without an essay whose row names a cover shows one sentence, "Covered in <essay title>",
  linking to the covering line item; the title falls back to the covering page's own title while it
  has no essay. **The site does not depend on the migration:** both reads are `select *`, so before
  it the key is absent and reads as not covered, and the eight pages end at their figures.
  `src/integrations/supabase/types.ts` is not regenerated; the column is typed locally until the
  owner applies the migration and regenerates.

## Smaller changes in the phase

- "Related line items" lists the page's own `fsli_pages.category`, itself excluded, in statement
  order, up to eight, instead of the first eight rows of the table (PRD R1.4).
- The header of `20261009090000_fsli_component_flag.sql` says it is applied (column verified present
  2026-10-10), so nobody applies it twice (PRD R1.5).
- The "On this page" highlight is measured when the page's headings arrive, not only on scroll, and
  is not carried from one line item to the next.

---

# 2026-10-10 — Capital in Motion: one name, no premise, no author on the cards

Branch `sweep/d-capital`, base `main` @ `0487609`. Phase D of the October 2026 sweep (PRD R6). It
implements the owner's decisions D6(a) and D7 (`docs/sweep-2026-10/DECISIONS.md`) and the owner's
instruction of 10 October 2026 that opens the page to change (R6.5). It supersedes two 2026-10-09
entries, each marked in place with a dated note and neither deleted: "Capital Allocation joins the
Finance dropdown" (line 163) in its naming, and "Owner-protected surfaces left alone" (line 182) for
Capital in Motion only.

## One name, "Capital in Motion", at the old address (D6(a))

- The page already called itself Capital in Motion in its h1, SEO title and breadcrumb; the Finance
  menu and the `/finance` card (`finance_sections.title`) called it Capital Allocation, the slug's
  name. The 2026-10-09 entry left the choice to the owner, and the owner chose the page's name.
- **The menu label** changed in `src/config/navConfig.ts`. A test reads the `<SEO title>` from
  `FinanceInMotion.tsx` and requires the label to equal it, so the two cannot drift apart again.
- **The card** changes when the owner applies `20261010120000_capital_in_motion_title.sql` through
  `apply_migration`. It updates one row's title and then asserts that the row carries it, so a
  mistyped slug fails the migration instead of updating nothing. No schema change, so `types.ts`
  is not regenerated. Until it lands, the card is the one place still saying Capital Allocation.
- **Not changed:** the slug and the address `/finance/capital-allocation`, with its legacy
  redirects, so nothing a search engine or an old link holds moves; the card's description (R6.4).

## The premise is deleted, not rewritten (D7)

D7 is still open, and its reason is the rule: nobody writes on the owner's behalf. The 2026-10-09
pass kept the block verbatim while the question was open (`07adda2`); it is now gone. The page reads
the h1, the existing subtitle, then the 21 conditions; the closing line under the list stays. The
deleted text lives in history and is quoted neither here nor in the code ("Comments may not quote
deleted copy", line 1441). If the owner writes a premise, it arrives as
`docs/sweep-2026-10/copy/capital-in-motion-premise.md` and is mounted as one prose block in one
colour and one size (R6.2), not as the old block's short lines in alternating colours.

## The cards name their layer, not their author (R6.3)

Each of the 21 cards ended its meta line with the author's name, so the index printed it 21 times.
The meta line is now the layer label alone. The page has no byline component, so none was added:
R6.3 keeps the name once in a page header only where a byline already exists. This is the
"separate decision" the 2026-08-02 entry "The hero drops its third paragraph, and with it the only
byline" (line 1456) left open for the two rendered bylines; its table row for
`CapitalConditionCard.tsx:27` ("kept, but see below", line 1500) no longer describes the code. The
essay byline (`ArticleHeader.tsx`) is untouched. A unit test walks all 21 cards for the name.

## What a future session must not undo by accident

- Renaming the slug to match the name. The address is what search engines and old links hold.
- Writing a premise to fill the space. The space is the owner's to fill (D7).
- Putting the author's name back on the cards' meta line. The owner took it off.

---

# 2026-10-10 — The header's dropdowns stay open on the way to an item

Branch `sweep/a-nav`, base `main` @ `0487609`; phase A of the October 2026 site sweep, PRD R7 (the
owner's finding 7: the dropdown vanished as the pointer moved down to it). None of the owner's answers
D1–D14 (`docs/sweep-2026-10/DECISIONS.md`) is about the header, so this entry implements no D-number:
R7 is the whole brief. It supersedes no earlier entry, because none recorded how the dropdown behaves
under a pointer. "Empty sections collapse in the nav" (2026-10-09, line 106 at `0487609`) still holds:
the four dropdowns tested here name no `essaySection` and never collapse.

## The gap was a margin outside every hit area; it is now padding

The panel was drawn `mt-1` below the label. The wrapper that carried `onMouseLeave` already held both
the label and the panel, so R7.2's wrapper was in place; the fault was those 4px, which belonged to
neither. A pointer crossing them left the wrapper and the menu closed under it. The panel now sits in
an absolute wrapper with a transparent `pt-1`, so the 4px are part of the hover area, and the panel
looks and sits exactly where it did. The PRD offered a pseudo-element bridge as the other way; the
padding was chosen because it leaves the panel's own box as it was.

## A 150 ms close that coming back cancels, and one menu open at a time

- Leaving starts a close of `NAV_DROPDOWN_CLOSE_DELAY_MS` (150); re-entering cancels it, and the timer
  is cleared on unmount. The delay is a timer, not motion, so it holds under `prefers-reduced-motion`
  too; nothing new animates (R7.4). **The delay alone does not fix the seam:** a quick pointer crosses
  4px inside 150 ms, a slow one rests there. A variant with the delay and the margin kept passed every
  straight-line test and failed only the one that rests the pointer in the seam, which is why that test
  exists.
- The delay had a cost that review caught: the menu just left stayed drawn for 150 ms over its
  neighbour (later in the document, same z-index), and a pointer moving into the overlap re-entered it
  and closed the menu it was heading for. Opening a menu now closes the open one at once, through one
  module-level handle (`closeOpenMenu`) rather than shared state: the header holds four instances of
  one component, and only the close needs to pass between them.

## Focus moves into the menu only on a keyboard open

Every open used to focus the first item, a hover included, which pulled keyboard focus into the menu
unasked. Now only ArrowDown, or Enter/Space on a menu button, does. Enter and Space are recognised by
the click they produce having `detail === 0` (a keyboard's or a screen reader's activation; a pointer's
click counts from 1), not by keydown handlers, because cancelling Space's own activation on keydown is
unreliable across browsers. Escape still closes and returns focus to the chevron, but only when focus
was inside the menu: a menu the pointer opened leaves focus where it was. Outside click and item click
close as before. Learning's label is itself the menu button (it has no landing page), so it opens from
the keyboard like the chevrons; R7.3 names only the chevron, and without this the Learning menu's
keyboard users would have lost the first-item focus they had.

## Learning's panel lines up with its label's right edge

Found while taking this phase's screenshots, and older than it: Learning's `w-48` panel, lined up from
the last label's left edge, ran past the right of the page (right edge 1344 at a 1280px viewport) and
gave the open menu a sideways scrollbar. `NavDropdown` takes `align` (`'start'` by default, or
`'end'`), and `MainNav.tsx` sets `align="end"` on Learning. That one line is outside `NavDropdown.tsx`,
the only file the PRD's phase prompt names; the phase report records it. An e2e test holds every panel
inside the viewport at 1280 and 1440px.

Not changed: `MobileNav` (its own drawer), the panel's look, no portal, no Radix. Tests:
`tests/unit/navDropdown.test.tsx` (14) and `tests/e2e/nav.spec.ts` (7; a real pointer moved in a
straight line, two pixels a step, from each of Accounting, Finance, The Next Big Thing and Learning to
its last item). `MIN_TESTS` 1148 → 1162.

---

# 2026-10-10 — The October 2026 site sweep: decisions are read from a file

Branch `sweep/0-bootstrap`, base `main` @ `0487609`. The owner's review of 10 October 2026 named ten
findings; the PRD that answers them (`PRD-PLAN-PROMPT-site-sweep.md`, attached to the session, not
committed) is executed one phase per branch and per draft pull request. The owner's answers to its
fourteen questions (D1–D14) are copied verbatim into `docs/sweep-2026-10/DECISIONS.md`, and each phase
reads them from there, not from a conversation. Two answers can only come from the owner and are
still open: D7 (the Capital in Motion premise; until it is written the block is removed) and D14 (the
Factory Yard author's written permission; until it is recorded in `NOTICE.md`, the world phases do not
start). Phase reports, in Indonesian like the PRD, are `docs/sweep-2026-10/report-<phase>.md`. Phase 0
changes no code: the database matched the PRD (21 published essays, 3 starred, 5 finance sections, no
FSLI section text), and `fsre_published.model_packages` answers the anonymous role with `200 []`.

---

# 2026-10-09 — The homepage below the map is one row: the glimpse

Branch `claude/confident-ride-d354er`, base `main` @ `1df681a`. The owner's request, verbatim: "aku
mau section dihapus aja. terus aku mau selected analysis diganti jadi semacam glimpse gitu. terus bisa
discroll ke kanan/kiri sampe 20 essays atau lebih. terus aku mau bisa nentuin essays mana yang aku
tarok didepan. terus aku mau yang world masuk sini". Four readings of it were put to the owner with a
proposal each, and the owner chose; the choices are recorded here so they are not re-read.

## The Sections list is deleted — owner decision, reversing 2026-08-03

The 2026-08-03 entry below kept the Sections grid against a review that recommended deleting it, and
said the next session that wanted it gone needed a new owner decision. This is that decision: the
owner asked for the list to go. The header's navigation names every section, so the homepage repeats
nothing by losing it. The `#sections` anchor had no remaining link. `useSectionCounts`, written to
count behind each door, stays: the header's navigation now reads it to collapse an empty section to a
plain link (the remediation entry below), so the hook outlives the list it was written for. The
2026-08-03 entry stays as history.

## "Selected Analysis" becomes the glimpse

- **What a glimpse is, by owner choice.** A horizontal row of starred essays, each a narrow column of
  text: the section in small type, the title, the deck (`essays.snippet`, the deck line the writer
  carries) clamped at five lines, and the month. No badge, no number, no author, no reading time: a
  glimpse of the essay itself, not a card about it. The owner rejected the earlier attempt (PR #50,
  branch `feat/home-glimpse`, closed as superseded): a row of cards with a colour badge, a `01`
  counter, the snippet and a read-time chip. The two alternatives offered and not chosen: a tighter
  card (title and deck only), and a "window to the world" where each column names what it lights
  in the Kawasan world (which would be bare until `docs/world/think-tank-tags.json` is written).
  *(Superseded 2026-10-10 in one respect: the row holds every published essay, the starred first;
  see the 2026-10-10 glimpse entry.)*
- **The heading is "Glimpse", with no sentence under it.** Approved by the owner. The old subtitle
  ("Hand-picked across sections, newest first") named a sort order that is no longer true.
- **The row runs to the viewport's edges,** first column aligned with the container's left edge, by
  a CSS inset computed from percentages, not `100vw` (which counts a vertical scrollbar the page does
  not have). Snap points, so the row never rests on a column cut in half. It holds up to 30 essays.
- **Scrolling:** swipe or trackpad; two buttons that page by 80 % of the visible width and are hidden
  when every column fits; the arrow keys once the row has focus (the `<ul>` is a focusable scroll
  region, named by the heading). The buttons scroll by `scrollBehavior()` (src/lib/motion.ts), so a
  reader who asked for reduced motion gets a jump, not a glide. Zero starred essays: the section is
  absent, as decided on 2026-09-14. *(Superseded 2026-10-10: absent only with nothing published.)*

## The order is the owner's: `essays.selected_rank`

- `is_selected` stays the one featuring mechanism (who is on the homepage); `selected_rank` says in
  what order (lower first). NULL means starred but not placed, and sorts after every placed essay,
  newest first — a new star joins the END of the row, never the front. Unstarring clears the rank in
  the same write, so a re-starred essay does not silently reclaim an old slot. *(Superseded
  2026-10-10 in one respect: the star decides who leads the row, not who is on it; every published
  essay is.)*
- **One order for the site.** About's "Selected Essays" is the first 8 of the same order; the Finance
  landing's featured essay is the first finance essay of it. Owner decision, over keeping About
  newest-first. *(Superseded 2026-10-10 for About, which is removed; the Finance landing's reading
  stands.)*
- **Set in Admin → Content → "Homepage order":** the starred essays, drafts included (a draft holds
  its slot and appears when published), with to-the-front / up / down. Every move writes the whole
  order (one update per row — an upsert would need every NOT NULL column) and shows it at once; a
  failed write restores the previous order. Audit action `reorder_selected`. Rejected: pinning only
  a few to the front (the rest unorderable) and a slug list in the repository (no migration, but a
  reorder is a commit).
- **The migration is `20261009140000_essay_selected_rank.sql`,** owner-applied through
  `apply_migration`. It seeds today's newest-first order, so applying it changes nothing a reader can
  see until the owner reorders. **The site does not depend on it being there:** every reader of the
  rank asks for the ranked order first and, on Postgres 42703 (undefined column), asks again newest
  first (`isMissingColumn`, src/hooks/queries/useSelectedEssays.ts). The admin panel is read-only
  until then and says so. The cost is one failed request per read until the migration lands; the
  fallbacks should be deleted once it has. `src/integrations/supabase/types.ts` carries the column
  by hand for the same reason, and should be regenerated after the migration.

## The world comes onto the homepage by its flag, not by new code — owner decision

"Yang world masuk sini" was read three ways: (a) turn the world on in the map's slot, (b) couple the
world to the glimpse (essays lighting buildings), (c) a third block below the glimpse. The owner chose
(a), which is what the PRD planned (§7.1: the world takes the map's slot on the landing page). No code
on this branch; the step is `VITE_WORLD_KAWASAN=true` on Vercel Production and a redeploy, behind the
owner's gate, and it also switches About's slot and opens `/finance/kawasan`. What that shows today is
in `docs/world/run-2026-10-09.md`: every building reads "Model status unavailable" until
`fsre_published` exists, and the think tank's tag file is empty. The glimpse sits directly under the
world, as it sits under the map; the map stays the first thing under the header. *(Superseded
2026-10-10 in one respect: About is removed, so the flag switches the homepage's slot only; see the
2026-10-10 About entry.)*
# 2026-10-09 — Public-site remediation from the 9 October audit

Branch `claude/blissful-fermi-q5x5iw`. Executes the code work packages of the audit (WP-2 to
WP-8, WP-11); WP-0 (domain), WP-1 (essay rows), WP-9 and WP-10 wait on the owner or on access.

## Light only, stated

The `.dark` palette in `src/index.css` could never apply: nothing in the app sets the `dark`
class, and it still carried the retired emerald accent. Deleted, with every `dark:` variant
outside the vendored `src/components/ui/`. `darkMode` stays `["class"]` rather than being
removed, because Tailwind's default (`media`) would switch on the vendored shadcn `dark:`
variants under an OS dark preference and give a half-dark page.

## The consolidation working paper was rebuilt, not patched

The audit's suggested fix (post +85,000 to goodwill and NCI) would have unbalanced the sheet: the
paper balanced only because 113,000 of related-party receivables were eliminated against 22,000
of payables, a 91,000 gap equal to the missing NCI. The elimination column now matches intragroup
balances on both sides, recognises NCI at 91,000 (acquisition-date fair value) and derives goodwill
from it. Intragroup trade also reconciles by counterparty (`INTRAGROUP_TRADE`, who owes whom), not
only in total; the first rebuild left Dummy C's related-party receivable larger than everything the
other entities owed, which review caught. `tests/unit/consolidationWorkingPaper.test.ts` holds the
arithmetic. Owner question Q4
still applies if a different worked example is wanted.

## Empty sections collapse in the nav (Q14 default)

A dropdown whose `essays.section` has no published essay renders as a plain link to its landing
page, which lists every phase with its count. Starts collapsed until the count loads, so the
header does not grow and lose a chevron on every page load while the sections are empty.

## Capital Allocation joins the Finance dropdown

It was left out "until it has modules", but `/finance/capital-allocation` renders the 21
conditions, not a module index, and `/finance` already listed it. Its page title is "Capital in
Motion" while the track is "Capital Allocation"; the nav uses the track name and the page title
is the owner's to change.

*[SUPERSEDED 2026-10-10 in its naming, by owner decision (October 2026 sweep, D6(a)): the page has
one name, "Capital in Motion", in the nav, the breadcrumb, the h1 and the SEO title, and on the
`/finance` card once the owner applies `20261010120000_capital_in_motion_title.sql`. The address
stays `/finance/capital-allocation` and the item stays in the dropdown. See the 2026-10-10 entry
on Capital in Motion.]*

## Unsourced figures removed rather than softened

Climate Finance's "~$25B/year", the bps/margin/multiple/ratio/$ figures in the capital
conditions, and the Statutory page's filings and deadlines are gone until each comes back with
its source (Q9, Q11, Q12). Mechanisms and durations stayed.

## Owner-protected surfaces left alone

About's hero, ReadingPath, ChangedMind and the industry-chain map keep their arbitrary type sizes
and eyebrows; the audit marks them as passing on their own terms, so the type-scale sweep skips
them. *(Superseded 2026-10-10 for About's hero, which went with About. ReadingPath and ChangedMind
now sit on the homepage, their copy unchanged by owner decision D4(a); the map is unchanged.)*

*[SUPERSEDED 2026-10-10 for Capital in Motion, on the owner's instruction (October 2026 sweep, R6):
the page is no longer left alone. This entry names only About's surfaces, but the same pass kept
Capital in Motion's premise verbatim for the owner (`07adda2`), and the sweep's PRD counts the page
among the owner-protected ones. The owner opened it: the premise block is deleted, with no
replacement until the owner writes one (D7), and the condition cards no longer carry the author's
name. This note covers Capital in Motion only. See the 2026-10-10 entry on Capital in Motion.]*

---

# 2026-09-28 — WO-R05: every essay gets its own share card; the rebuild is decided, not applied

Branch `claude/wo-r05-share-cards-rebuild`, base `main` @ `85cdf51`, merged as PR #37 on the owner's
instruction ("merge langsung") after gates B and C. Part 4 (the rebuild) is decided below and staged
at `docs/db/pending/wo-r05-rebuild/`, but **not applied**: its gates G1 and G2 were printed and not
yet approved. Gates are in `docs/GATE_LEDGER.md` ("WO-R05 session").

## Share-image precedence: the hero, then the essay's own card, then the fallback

On a pre-rendered essay route, `og:image` is:
1. `thumbnail_url`, the hero image, which is the owner's manual override;
2. otherwise the generated card, `https://dikagustiana.com/og/<slug>.png?v=<unix seconds of updated_at>`;
3. `/og-image.png` only on routes that are not pre-rendered.

- **One formula, two callers.** `src/lib/shareImage.mjs` (`essayShareImage`) is imported by
  `scripts/prerender.mjs` for the raw HTML and by the app for Helmet, through both article shells and
  `CriticalThinkingEssay`. It is a `.mjs` file with a `.d.mts` beside it, so Vite bundles it and Node
  runs it unbundled. The brief's fallback, two implementations plus a parity test, was not needed.
  Without it, `SEO.tsx`'s default image replaced the raw tag after hydration (the gate B mutant, 0/7).
- **`?v=` is `updated_at` in unix seconds.** A crawler that caches by image URL fetches the new card
  after an edit, because the URL changes.
- **Width, height and type only for the generated card.** A hero's dimensions are unknown, and a
  wrong value is worse than none. `og:image:alt` (the title) and `og:site_name` are always present.
- **A card is drawn for every written route, hero or not,** so removing a hero later never leaves an
  essay without one.

## The card: the fallback's template, the site's font, drawn at build time

- **Layout:** measured from `public/og-image.png`: the rule, the lantern and the footer at its
  positions, and the title's first capital on its line (y 299). The label sits beside the lantern,
  because below it would push the title down and force three-line titles to 56 px.
- **Content:** label, title, name and domain; **no deck**, because WhatsApp prints `og:description`
  under the image. Confirmed by the owner at the design gate.
- **The label rule:** the section's name (`sections.name`, through the category), then the finance
  track's title (`finance_sections.title`, through the module), else the category's name. The parts
  are joined with ` · ` and set uppercase with letter-spacing, since the font has no true small caps.
  Every name comes from the database; `scripts/` holds none. An unplaced finance essay reads
  `FINANCE · GENERAL` (the Site Rebuild Note), as rendered at the gate and approved.
- **Fonts, a deviation the owner approved:** static Plus Jakarta Sans Bold and SemiBold TTFs from
  `tokotype/PlusJakartaSans` @ `18d1cd2`, the upstream commit `google/fonts` names as its source.
  `google/fonts` ships only the variable TTF, and satori 0.33.5 cannot parse its `fvar` table.
  Rejected: (b) deriving static instances from the variable file with fontTools, which yields a
  converted file reproducible only with the same fontTools version; and converting the site's woff2
  at build time, which the brief forbids. Provenance and hashes are in `scripts/og-fonts/README.md`,
  pinned by a test.
- **The renderer:** satori 0.33.5 (layout, text as paths) and @resvg/resvg-js 2.6.2 (SVG to PNG),
  both devDependencies pinned exactly. No browser, and no network: the fonts and the logo are
  files in the repo. `shareCard.mjs` is loaded only by build scripts, never by `src/`, and gate B
  found no trace of either package in `dist/assets/`. `public/logo.png` holds JPEG bytes, so the card
  reads the type from the magic bytes.

## An undrawable title stops the build; a long one is cut

- **A character the font lacks fails the build,** naming the essay and the code point
  (`scripts/prerender.mjs`). A share card with a missing glyph would reach every reader; a failed
  build leaves the previous deployment serving and says why.
- **A card over 300 KB also fails the build.** The ceiling is conservative, not WhatsApp's.
- **A title longer than three lines at 48 px is cut at a word, closed with `…`.** No published
  title comes near it: all seven fit at 64 px. Truncation keeps the build green for a length problem,
  which a reader can still understand, while a missing glyph is a correctness problem. `lineClamp`
  stays as a safety net under the measured fit.

## Sitemap and feed, v1

- **The same run, the same fetch and the same `canonicalPath()`** as the pre-rendered pages. There
  is no second route table, so the sitemap lists exactly the pages written.
- **Sitemap:** the home page and every pre-rendered essay, with `lastmod` = `updated_at` as a date.
  The home page takes the newest essay's. **Section index pages are not listed:** the prerender cannot
  derive them without a hand-written list, and the home page links them.
- **Feed:** the 20 newest by `date` (else `created_at`), then by URL. **No `lastBuildDate`**, so
  the same essays always produce the same bytes. A rebuild that changed nothing then looks unchanged
  to a feed reader.

## The rebuild rule: any write that touches a published row (decided, not applied)

`AFTER INSERT OR UPDATE OR DELETE ON public.essays FOR EACH ROW`, acting when `OLD.published` **or**
`NEW.published` is true.

- **Deliberately no column list.** The prerender reads about a dozen columns, `updated_at` among
  them, and a hand-written list would drift. The rule is quiet anyway: autosave never writes a
  published row. Unpublishing and deleting a published essay qualify most of all, because they take
  a page down. Until this is applied, an unpublished essay's pre-rendered page keeps being served
  until the next deploy.
- **Nothing network-bound runs inside the owner's save.** The trigger only stamps
  `ops.site_rebuild.requested_at`, and it never raises: a failure is a warning, never a failed save.
  pg_cron runs `ops.fire_site_rebuild()` every 2 minutes. It fires once a request has been quiet for
  90 seconds, so a burst of saves is one build, and it records the previous firing's HTTP answer.
- **The hook URL lives only in Vault** (`vercel_deploy_hook_url`). It is read by name at firing time
  and appears in no file, migration or log. Without the secret, a firing records `no_secret` and sends
  nothing.

## Why the state lives in an unexposed `ops` schema (decided, not applied)

PostgREST exposes `public` and `graphql_public` only (measured 2026-09-28: `Accept-Profile: ops` →
PGRST106). A table in `public` would be reachable through the Data API with RLS as its only lock, and
would appear in `types.ts`. `ops` removes that surface:
- USAGE, table rights and EXECUTE are revoked from `public`, `anon` and `authenticated`;
- RLS is on anyway;
- both functions are `SECURITY DEFINER` with `search_path = ''`.

The owner's saves still stamp, because PostgreSQL does not check EXECUTE on a trigger's function when
the trigger fires. The rehearsal showed this as `authenticated` (check 3). Nothing is created in
`public`, so `types.ts` does not change.

## What a future session must not undo by accident

- Do not import `scripts/lib/shareCard.mjs`, satori or resvg from `src/`. The renderer is
  build-time only.
- Keep one image formula. A second copy in the app lets hydration drift from the raw HTML
  unseen, because crawlers never run it.
- Do not give the rebuild trigger a column list, network work, or a path that raises.
- Do not add `ops` to the exposed schemas, and do not move the state into `public`.
- Never write the hook URL anywhere but Vault. Rotation: create a new hook, run
  `vault.update_secret`, then delete the old hook (the README gains the steps with Part 4).

## Known gaps, and found, not acted on

- **The apex domain serves an old deployment.** `https://dikagustiana.com/*` answers 308 to
  `dika-s-digital-studio.vercel.app`, a pre-rebuild build, while `www.dikagustiana.com` serves this
  project. Every `og:image`, `og:url`, canonical, sitemap `<loc>` and feed link names the apex, so
  no share image, the fallback included, reaches a crawler until the owner points the apex at this
  project. This is a hosting setting, not a code decision, and nothing here changes it (GATE_LEDGER
  P5).
- **`finance_modules` changes do not rebuild** (a track slug change, for one). This is rare, and out
  of scope.
- **Hero images are not checked** for aspect ratio or size. The owner crops to 1200 × 630.
- **Accounting rows with a page-level canonical get no card**, exactly as they get no pre-rendered
  page.

---

# 2026-09-28 — Admin role is resolved once per user id

Branch `claude/auth-tab-focus-unmount`, base `main` @ `85cdf51`, merged as PR #36 on the owner's
instruction. Gates are in `docs/GATE_LEDGER.md` ("Auth tab-focus session").

## Same-user auth events never blank the route tree

**`AuthProvider` resolves the admin role once per user id** (`src/contexts/AuthContext.tsx`). A ref
holds the id whose role is resolved. An auth event for that same id updates `session` and `user` and
leaves `isLoading` alone, so `RequireAdmin` keeps its children mounted. A different id, or sign-out
(`null`), resolves exactly as before: spinner, role check, redirect.

**The cause.** `@supabase/auth-js` 2.89.0 re-reads the session on every hidden → visible transition.
It emits `SIGNED_IN` for a valid session, or refreshes it and emits `TOKEN_REFRESHED`
(`GoTrueClient._onVisibilityChanged` → `_recoverAndRefresh`). That is the library working as
documented. The fault was in `resolveSession`, which set `isLoading = true` on every event.
`RequireAdmin` then swapped the page for a spinner for one round-trip, and the Writer Studio unmounted
with everything unsaved. Tab focus is also the Growth workflow's own trigger: copy a URL in another
tab, come back, press Fetch details. The open link-card dialog was lost along with the editor.

## A failed check is not an answer

`checkAdminRole` reports whether the query itself completed. A network or RLS error clears the ref,
so the next auth event (the next tab focus, say) tries again instead of caching "not admin" for the
rest of the session. The old code healed a transient failure on the next focus by accident. The
retry is now kept on purpose.

## The trade-off, accepted

A role granted or revoked mid-session is picked up on reload or re-sign-in, not on the next tab
focus. The old code "picking it up on focus" was an accident of the bug, not a feature. Revocation is
still enforced server-side by RLS on every query, and by `link-preview`'s own admin check. A UI that
lags a revocation exposes nothing.

Rejected:
- **Filtering by event name** (ignoring `SIGNED_IN` and `TOKEN_REFRESHED`). auth-js re-emits other
  tabs' events here (`GoTrueClient.ts:394`), so signing in to another account in another tab also
  arrives as `SIGNED_IN`. The name cannot tell that apart from a tab focus; the user id can.
- **Re-checking the role on focus, without the spinner.** It still queries `user_roles` on every
  focus, and a transient failure there turns `isAdmin` false. `RequireAdmin` then redirects to
  `/auth`, which loses the same work, only less often.

## What a future session must not undo by accident

- Do not set `isLoading` for a same-user auth event, and do not treat a failed role check as an
  answer.
- Keep the 30 ms delay in the role mock of `tests/unit/authTabFocus.test.tsx`. With an instant mock,
  React batches `isLoading` true → false into one render and the spinner never commits. The test then
  passes against the broken code (checked 2026-09-28).
- Do not key an effect on the `user` or `session` object in anything that holds unsaved work.
  auth-js hands over a new object on every tab focus. Key on `user?.id`. Nothing does so today
  (audited 2026-09-28).

## Found, not acted on (out of scope)

- A role check that answers after a newer auth event still applies its answer: a sign-out, or a
  switch to another account, during the round-trip. This is pre-existing, and the patch leaves it as
  it was. It is UI-only, because RLS enforces every query.
- Tab discard (Chrome Memory Saver, mobile) is not covered: a discarded tab reloads from scratch, and
  a never-saved essay has no autosave to reload from. See owner decision 1, SESSION_LOG 2026-09-28.

---

# 2026-09-27 — The Growth theme, one theme list, and link previews resolved server-side

Branch `claude/nbt-growth-and-link-preview`, base `main` @ `1c33310`, merged as PR #35 on the
owner's instruction. Gates are in `docs/GATE_LEDGER.md` ("Growth-and-link-preview session").

## One source of truth for The Next Big Thing's themes

**The list lives in `src/config/nextBigThingThemes.ts` (`NEXT_BIG_THING_THEMES`), and every
surface derives from it.** It had been written out six times in `src/`, in four field-name
conventions, plus a seventh copy the brief had not listed (the `NBT_CATEGORIES` fixture in
`tests/unit/publishModalPlacement.test.tsx`). None of them had drifted. The home follows the
precedent already in that directory: `consolidationTopics.ts` is the single source for another
topic list, read by public pages and the writer. Rejected homes: `navConfig.ts`, which would make
the admin editors depend on navigation config, and `sectionLabels.ts`, which names sections, not the
themes inside one.

- Each consumer adapts the shape at its own site (`{ value, label }`, `{ label, path }`, an id →
  label map). The constant does not try to fit anyone's field names.
- The section page's tabs are `nextBigThingItems` itself (the second copy is deleted). Its topic filter
  takes the constant as-is: `EditorialFeed`'s `topics` prop became `readonly`.
- The `?theme=` URL has one builder, `nextBigThingThemePath()`, used by the nav and by the essay page's
  back link.
- The test fixture derives from the constant (owner decision, 2026-09-27). The only change is that its
  test-internal id `cat-tech` became `cat-technology`.
- `src/lib/admin/sectionPhaseConfig.ts` has no importers at all. It was rewritten as asked anyway, so
  that a later revival cannot resurrect a stale copy. Deleting it is a separate decision, not taken here.
- **Array order is display order everywhere, and it equals `sort_order` on the `next-big-thing-<id>`
  rows of `public.categories`.** Adding a theme is two edits: the constant, and a category row
  (migration). `tests/unit/placement.test.ts` ties its written-out slug loop to the constant by length
  and by members, so a theme cannot be added to one side alone.

## Growth: last, visible while empty

Growth is the sixth theme: curation entries built around someone else's post, with the owner's
commentary as the substance.
- **Position:** last, after Governance (`sort_order` 6; migration `20260927072835`). Placing it beside
  Economy would have needed four rows' `sort_order` bumped and the array reordered. Not asked for.
- **Empty but visible:** the owner's assumed default, unchanged. `?theme=growth` renders the feed's
  own empty state ("0 essays / No essays found"), measured.

## Link previews: server-resolved, metadata only

**The link card's metadata is resolved on the server at authoring time, never at read time, and only
plain text comes back.** This takes the door the 2026-08-01 entry below left open ("Embed stays a
client-side link card"), narrowly. The owner asked and chose the metadata-only variant: no iframe, no
third-party script, no provider HTML rendered.

- **Authoring time.** In the editor's link-card dialog, the author presses **Fetch details**. The
  `link-preview` edge function returns title, description, author, author link, source and published
  date, and they land in ordinary editable fields.
  - Manual values always win: a field the author has typed in, before or during the fetch, is never
    overwritten.
  - `resolvedAt` records when the snapshot was taken. It shows in the editor only.
  - A snapshot belongs to its link: changing the URL drops untouched fetched values.
  - A failed fetch shows a plain sentence and leaves manual entry, the old floor, exactly as it was.
    Publishing never waits on a fetch.
- **Read time: nothing.** The public page renders the stored snapshot (both `ArticleBody` paths,
  measured with zero fetch/XHR). A deleted or unreachable source post never blanks a published card.
- **Consequences, all verified.**
  - `vercel.json`'s CSP is unchanged: the editor's call goes to `*.supabase.co`, already in
    `connect-src`, and the reading path makes no request.
  - `src/lib/sanitizeHtml.ts` is unchanged: every field rides inside the existing `data-link-card`
    blob, and the visible markup is `span` + `class`. The sanitizer returns the enriched card
    byte-for-byte.
  - No new `data-*` attribute was introduced.
- **The four-place contract, and the trap in it.**
  - One field list (`src/lib/tiptap/linkCardData.ts`) now feeds the node's attributes, `serialize.ts`,
    both `ArticleBody` paths and the fallback reader.
  - `serialize.ts` used to write a hand-picked three-field blob. Any other field was dropped on every
    publish surface and on revision restore (`WriterEditor` restores a revision through
    `tiptapJsonToHtml`), while the editor still showed it. It now writes the complete record, and a
    test fails if it does not.
- **What the card shows.** It is still one `<a>` to the source.
  - The card itself shows source (site name, else the host), title, description, and a byline of
    author and date.
  - The date is formatted by `fullDate`: UTC, always with its year, so stored HTML cannot drift with
    the viewer's zone or the calendar year.
  - Stored HTML reads "Title — Author · Source · Date" in class-named spans. That is plain text where
    raw HTML is shown, and it can be read back if the blob is ever lost.
  - Markdown carries the attribution too: on a curation entry, whose post it is is the substance.
  - No remote thumbnail. This page has had a hot-linked third-party image removed once already.
- **Rejected:**
  - resolving at read time: a request per reader, a CSP change, and cards that blank when the source
    dies;
  - iframe embeds (the sanitizer stance below stands);
  - remote thumbnails;
  - rendering provider HTML;
  - the `@supabase/server` wrapper (it builds a secret-key admin client on `ctx`);
  - supabase-js inside the function. Plain `fetch` means no privileged client can exist in it.

## The function trusts the caller's token, not the gateway alone

`supabase/functions/link-preview` is deployed with `verify_jwt = true` AND re-checks authorisation
server-side:
- Auth must return a user for the caller's token.
- PostgREST, called with that same token, must return the caller's admin row from `user_roles`. RLS
  `user_roles_select_own` lets a user see only their own roles.
- No service-role or secret-key client exists in it.

**Measured on the deployed function: `verify_jwt` alone stopped only a request with no auth header and
one with a bad signature.** Three anonymous variants reached the handler, and the handler refused all
three with 401:
- the publishable key alone;
- the legacy anon key as a Bearer (a valid JWT);
- the publishable key as a Bearer.

A signed-in non-admin got 403. A deleted user's still-unexpired token got 401. The server-side check
is load-bearing, not belt-and-braces.

## The function's SSRF policy, and what it leaves

The URL is typed by a human and fetched by a server:
- https only, port 443 only, no credentials, no single-label or local-only names;
- A and AAAA resolved, and **any** non-public address refuses the host: private, loopback,
  link-local including 169.254.169.254, CGNAT, multicast, reserved, documentation, ULA, and the IPv6
  forms that tunnel to IPv4. IPv6 is allowlisted to global unicast;
- at most 3 redirects, every hop re-checked from scratch;
- one 5 s budget per fetch covering DNS, hops and body; a 512 KiB cap with the stream cancelled;
- only `text/html` pages and JSON oEmbed parsed.

`Deno.resolveDns` works in the deployed runtime; the function logs name the resolver on every
isolate, and the DNS-over-HTTPS fallback was never used. **Residual, accepted:** `fetch` resolves the
host again after the check. That is a rebinding window, closed in practice by HTTPS, because an
internal address will not present a valid certificate for the attacker's host name. The callers are
admins only.

## Prerender carries no essay body, so the crawler check was restated

The brief expected `scripts/prerender.mjs` output to contain card metadata as plain HTML. **It cannot,
for any body content:** prerender rewrites only `<head>` tags per published essay, and the body is the
empty SPA root that React fills.

The owner chose to restate the check (2026-09-27): verified instead that the card's title, author,
source and date are plain text in the stored `content` HTML, and that the page renders them with no
request. It follows that a crawler that does not run JavaScript sees no essay body today, card or
otherwise. Making it see one means prerendering bodies, a separate piece of work.

## X resolves anonymously, today

Measured on the deployed function, from Supabase's egress: `x.com/jack/status/20` resolved through
oEmbed discovery. X's logged-out page links `publish.x.com/oembed`, which answered with author, author
link, provider and the post in a blockquote; the post text and date were kept and the markup
discarded. If X closes that door, the known-endpoint fallback is next and manual entry is the floor.
**No API key, no scraping workaround and no headless browser were added**, and none should be without
the owner.

## What a future session must not undo by accident

- Do not narrow the link card's blob or pick fields by hand anywhere. Read `LINK_CARD_FIELDS`.
- Do not call `link-preview` from any read path, and do not add a remote image to the card.
- Do not render provider HTML, and do not widen `FORBID_TAGS` for an embed.
- Keep `verify_jwt = true` AND the handler's own user and admin check. Never add a service-role or
  secret-key client to this function.
- A new theme is the constant plus a migration. Never a list written out somewhere else.

## Found, not acted on (out of scope)

- `council-review` still exists on the project as a 410 tombstone. Deleting a slug needs an access
  token: `supabase functions delete council-review`.
- Four applied migrations have no repo mirror: `essay_revisions_fk_restrict`,
  `sync_essay_publication_state`, `slug_unique_code_column_human_slugs` and
  `consolidate_featuring_on_is_selected`.
- `WriterEditor`'s Green Transition phase list lacks `climate-finance`, and its finance ids differ from
  `FINANCE_DOMAIN_OPTIONS`. That is drift in other sections' lists; it only labels the preview.

---

# 2026-09-14 (v3) — The UI pass: an inert control is not offered, a figure is not a viewport, and a door is sized to the screen

Continues the executed v2 at `66d78b4`. Ten findings (U01–U10) of a focused UI audit; the record is
in `docs/response-2026-09-14-v3/`. Nothing of v2 was reset or replaced.

## Decisions

- **A control that cannot act where it is shown is not shown there.** The short plate's distance and
  scenario controls were coupled to expansion because the short plate can honour neither — it has no
  chips to re-word and no marks to raise. The fix is not to make them expand more carefully; it is not
  to offer them. Rejected: a third "Explore" distance (the audit rules it out, and it would have made
  a detail level into an analytical position); rejected: leaving them inert but harmless, which is how
  pressing the already-active "No shift" came to swap the whole plate.

- **The short plate carries one bounded question and one labelled action.** Orientation is not
  explanation: v2 put the right noun on the plate and left a stranger to invent the question, choose
  among two distances, two scenarios and sixteen marks, and work out for themselves which had been
  written against evidence. The entrance opens the one reading that is `basis: 'assessed'`, at the
  distance and under the scenario it was written in, and its description says so before it acts. It
  names the relation rather than the noun, and it bounds the case in the same breath: the electricity
  network is a different network from the goods distribution on this chain. Rejected: a tutorial, an
  autoplay sequence, a second map, a below-map essay — all ruled out, and none needed.

- **Nothing under the map, except the way back and the written conflict.** The older rule rejected a
  legend and a second explanation surface beneath the figure; v2 added a specific trade-off block
  there. **That block stays**, and this pass integrated rather than duplicated it: the featured
  entrance opens a reading whose scenario is the one the block is about, so a reader meets the
  trade-off immediately after the reading rather than as unrelated apparatus. What was added under the
  map is a second exit and nothing else. What was added *above* it is one line naming which shapes
  open — in the existing introduction, where the audit prefers it, and not a legend.

- **The figure is not the reader's viewport.** The reading popover was clamped to the figure, which is
  correct by the figure's geometry and put the reading's own title and Close behind the page's sticky
  header — measured at 1348×936, Close at y≈21–47 under a header at y=0–65. Placement now intersects
  the figure with the part of it a reader can see and re-places on scroll. The reading stays *inside*
  the figure: the brief's rule that the eye does not leave the selected element is not traded away for
  the fix. Where the figure has genuinely left the readable band, the reading scrolls away with the map
  it belongs to rather than detaching and floating over the page.

- **A door is sized to the screen it is drawn on, not to the grid it is drawn in.** The plate is drawn
  at `width:100%`, so a unit is not a pixel: at the 1280px breakpoint a chip was 12.7px tall, a layer
  switch 8.5px and a numbered mark 15.6px. Each is enlarged by a *transparent* hit shape, and the room
  comes from the plate's height, which costs nothing because the scale is set by its width.
  **Rejected, and measured rather than argued:** raising the generator's small type from 14 units to
  16 grew the viewBox from 1717 to 1789, returning about one pixel net while shrinking every target and
  every stage label by 4.2%. A proportional plate cannot be made legible by scaling its own type; what
  is left is an editorial question about how much the map draws, and it is in the handoff as one.

- **A mark has two radii.** The generator used one for both keeping a mark off the plate's ink and
  keeping two marks apart, which is how a mark's enlarged target came to sit on a chip's. They are now
  separate constants and the chip's *target* — not its ink — is what the placer avoids.

- **A transparent presentation attribute loses to a stylesheet rule.** `fill="transparent"` on a bare
  `circle` inside `.cp-mark` is overridden by `.cp-mark circle{fill:…}`, so the first attempt drew the
  hit areas as rings. Every hit shape now carries `.cp-hit-area`, and the generated CSS keeps it
  unpainted at two classes of specificity.

- **What steps back under isolation is the geometry, not the information.** Fading a group takes its
  labels with it — a stage name came out at an effective opacity of 0.1, in the half of the plate a
  reader consults to choose the next comparison. Shapes recede to .1; names stay legible a step behind
  at .45. Both fades come back whole under keyboard focus and never for a pointer, because CSS cannot
  restore a child through its parent's opacity and a focus ring at .18 is not a focus ring.

- **Hiding a layer is a statement about the drawing, and says so.** Beside the controls, only while a
  layer is off, with the way back — which nothing offered before. A faded band must never read as a
  claim that the service stopped being bought or that its constraint has gone.

- **A link that records an exploration restores it.** Reading the address is no longer gated on the
  full variant. A plain visit is still untouched, and `distance=economy` — which the writer never
  emits — leaves the landing page short, because that is what the short plate already shows.

- **The compact reading path ranks what it already had.** One necessary reading in full, the two
  methods grouped as optional with their links live, the two gaps grouped and named, and the reasoning
  of all four one disclosure away. Rejected: a second reading-path component, dropping a gap, and
  shortening a destination. A closed `details` is in the document, so nothing is hidden from a crawler
  or a screen reader. Public copy about checking "all 165 essay records, published and draft" was
  replaced with what a reader can inspect and when it was last true; the audit trail stays in the
  response record.

- **The desktop navigation and the drawer swap at the width where the row actually fits** (`xl`, not
  `lg`). At 1024px seven labels did not fit and did not wrap, so flexbox compressed them — one label
  was clipped mid-word inside a 64px header. Above that width the row wraps rather than overrunning,
  because the labels grow with the reader's default font and at 24px they gave the whole document a
  horizontal scrollbar. **Nothing is dropped to make room:** every label is a section of the site, and
  a capacity problem solved by hiding destinations solves it by making them unreachable.

## Not done, deliberately

No DNS or Vercel change; no canonical origin switched for convenience; the stale mirror repository was
not inspected. No numerical magnitude on the map — the repository's own no-figures test caught a first
draft of the entrance copy that carried a date range. No promotion of any of the fifteen scenario
marks. No comprehension claimed: nobody unfamiliar has used any of it.

---

# 2026-09-08 — The condition layer: a status on every mark, a reading in one voice, and nothing under the map

**The owner's brief of 2026-09-08 named one priority above all others: the map was anatomy, and its
job is condition — where the chain stands, what holds it, which lever moves it, who pays.** This pass
builds that layer (§6.5 of the brief), reworks the panels and controls around it (§6.1–6.3), adds
isolation at the finance distance (§6.6a) and per-layer switches (§6.6b), and clears everything from
under the plate (§6.5d). It ran on a branch and stopped at a pull request; it touched the map's
components, data file, generator and tests, and nothing else. Every visual judgement was made on
renders taken in this session at 1440px, 1280px and 360px; the brief's screenshots were one
iteration behind `main` (the marks, the chip counts and the URL state were already there).

## Decisions

- **A mark is a promise of a status and a reading, and a status is the one thing it cannot do
  without.** `ShiftTarget.condition` carries `status` — stuck, moving or unpriced, and only those
  three — plus four two-voice slots: `now`, `holds`, `action` (what the lever does here) and `funds`,
  each a `LensNote`. `isMarked` is now "has a condition". Removing a target's condition parks it: no
  mark, no gap, the numbers close up. The four lines are the owner's; `UNWRITTEN` marks the empty
  slots and the panel omits them rather than showing a placeholder. The earlier "what moves here"
  readings became the `action` line, because that is what they always described.
- **Statuses are provisional and say so.** Each was set from the brief's own examples (the floor
  logistics sets: stuck; formal recovery: unpriced; a policy or investment under way: moving) and
  the existing reading of the target. The pull request lists every one for the owner to confirm or
  flip; a unit test pins only the two the brief itself gives.
- **Status is told by form, never by colour alone.** On the plate: a heavy outline for stuck, a plain
  one for moving, a dashed one for unpriced; the numbered disc is filled, open or dashed to match;
  the border line goes solid when stuck. In the panel and the column the badge is a filled, open or
  dashed square beside the word. One accent still means one thing — a shift.
- **The panel speaks in one voice.** The "Two distances" block is gone from every panel. A reading
  under a shift is the six blocks the brief fixes, in that order: name and status badge; where it
  stands; what holds it; the lever and what it does here; who finances it; the essays. An anatomy
  panel (a joint or a layer at rest) reads its margin kind, its meaning, the control test, the one
  distance that is on, the lines of the accounts and the layers riding on it. Under a shift the
  anatomy folds beneath the reading, closed, so the reading is not lost under definitions.
- **Nothing under the map.** Removed outright: the shift caption and its lever line, the "What moves"
  list, the readout line, the "Read the chain at text size" reference, the "How the two distances
  relate" fold, the legend and its footnote. What stays is the button back to the short version. The
  footnote about functions versus firms and principal versus agent became one line over the plate.
- **Definitions moved to the element.** Hover or focus pins one line beside the thing itself — a
  node reads "takes title, transforms nothing; revenue gross; its margin is a spread", a joint reads
  its margin kind with the service performed there, a mark reads its number, title, status and essay
  count. The label is placed by trying above, below, right and left and taking the position that
  covers the least of the plate's own ink, clamped inside the figure, and it never covers its own
  anchor. The static geometry is reached by event delegation on the figure; the joints, bands and
  marks keep their own handlers. `DEFINE` in the data file holds the words the legend used to hold.
- **A reading opens beside its mark.** On the wide plate the panel is a popover inside the figure —
  below the anchor where there is room, else above, else beside, always clamped inside the figure and
  capped to its height — closed by Close, Escape or a click outside. On a narrow screen it is a
  bottom sheet (Radix Dialog), because a phone has no hover and no room beside a row; the sheet
  carries the one close control and returns focus to the row once its trap is down. Rejected:
  keeping the panel under the plate — the brief's rule is that the eye must not leave the element.
- **Finance isolates.** At the finance distance an open joint keeps itself, its two hands and the
  layers riding on it; the rest of the plate steps back to a tenth. A stage or node keeps the joints
  that touch it. A layer, border or return isolates nothing. Done by marking `data-dim` on the
  plate's elements from an effect, because the generated geometry knows nothing about state.
  Economy never isolates: from far, the whole chain is the reading.
- **The layers sit directly under the chain and are ticked where they attach.** The vertical order
  under the chain is now reading lane, bands, rails. Money and information run the length of the
  chain and attach nowhere in particular, so they take the bottom. Each fee-earning band is ticked
  with a small filled square at every joint it rides on; governance is ticked open at the three joints
  it governs; regulation has no tick. The "Fee" chip at the far right of each row is gone: the fee is
  read where it is paid, and the word "fee" follows the band's label.
- **The cold chain is its own band**, production → consumption, a fee, attaching at the moves. It is
  split from logistics because it does more than add a fee: a node that cannot keep the cold cannot
  hold the stock, so it decides which intermediaries can exist. The green transition marks it stuck,
  alongside logistics.
- **Energy is drawn as an input into every stage, and kept as a layer.** A short dotted arrow rises
  into the bottom edge of every stage box, and the energy band is ticked with a rising arrow under
  each; the band itself stays, because the brief's own list of layers names energy and the green
  overlay must be able to mark it. A full riser from the band to each stage was rejected: the stages
  are stacked in pairs (packaging over manufacturing, the two origins, consumption over recovery) and
  a riser to the upper box would cross the lower one.
- **The margin kind is told by the joint mark, not the chip's border.** A filled diamond where a
  stage sells (conversion), an open diamond where a node sells (spread), a square where a fee is paid.
  The chip is a reading and only a reading; its border no longer varies. "Terms" and "Rules" are gone
  as chip words — a layer that earns nothing is not a fourth kind of margin, and it says so on hover.
- **Two economy chips renamed.** "Basic industry" (a sector) → "Producer prices"; "Intermediate
  input" (a kind of good) → "Input–output link". Every economy chip is now the macro variable that
  enters at that joint.
- **Arrows of movement.** The reindustrialisation cut still moves right; the green transition gains
  a `price` move — a short arrow into the consumption → recovery ring, in the gap between the two
  boxes it sits between, with the callout "Who pays for recovery?" carrying the words.
- **Per-layer switches.** A small square at the left end of each band turns that layer off on its
  own; the band, its ticks and its mark fade but keep their place, and the marks keep their numbers.
  The shift control is untouched: still exclusive.
- **Marks are placed by collision, and their order by intent.** Each kind of target has a list of
  candidate places; the first that lands on no box, chip, band, border line, arrow or earlier mark
  is taken. The reading order is decided by the first candidate — where the mark belongs — so a mark
  that has to step aside keeps its place in the sequence.
- **The shift sentence draws the line the brief asks for**: "What a shift marks is my reading of
  where the chain stands, not part of its anatomy." The panel's kicker says "Reading · {shift} ·
  {distance}" against "At this joint · {distance}" for anatomy.

## Coordination

- **A parallel draft existed.** While this branch was being finished, pull request #30
  (`codex/industry-chain-condition-layer`, one commit on the same base) was found open, building a
  condition layer of its own over twelve of the same files, with the map's tests left red and the
  headline changed. Nothing was merged here; the pull request for this branch names the overlap and
  the differences, and the owner chooses. Two older branches (`claude/industry-chain-map-audit-ybm76s`,
  `codex/industry-chain-audit`) are the sources of #28 and #29 and carry nothing `main` lacks.
- **`initialShift`** lets a page frame open the same component with an overlay on — the Green
  Transition section's "Where We Are Now" — while an address still wins. Mounting it there is outside
  this branch's fence and is listed in the pull request.

## Held

- Swimlane, left to right. No shape claimed. Four categories kept apart by form. No new palette; every
  colour a token. No figures. The headline and standfirst verbatim. The landing page keeps its hero
  and its short chain. `chain-plate.css`, `ChainPlateSvg.tsx` and `chainMarkOrder.ts` are generated
  — edit the generator. The URL parameters are the owner's spelling.

## What a future session must not undo by accident

- A mark exists only where a condition exists; the four lines are never faked. Tests assert both.
- Status by form: heavy / plain / dashed on the plate, filled / open / dashed on the disc and badge.
- One voice per panel. A test asserts no panel carries two distances.
- Nothing under the plate but the controls and the back button. A test asserts the figure is last.
- Six layers in this order: logistics, cold chain, credit, energy, governance, regulation; bands
  before rails. Tests pin the order and the geometry.
- Test floor raised 407 → 426 (429 tests).

---

# 2026-09-06 (later) — Numbered marks, a slug per element, and the map's state in the address

**The owner's audit brief of 2026-09-06 asked for a completeness pass first and aesthetics second:
check every element against the target list, then build section 6 — numbered marks with panels,
permanent slugs, the map's state in the URL, the finance distance as the process of value creation,
and the enabling layer as the bearer of a per-unit burden.** This pass ran on a branch, stopped at a
pull request, and touched only the map's components, its data file, its generator and its tests.
Every visual judgement was made on renders taken in this session at 1440px and 360px.

## Found broken on `main`

- **The suite was red, and had been since #28.** That pull request rewrote the readings and removed
  the standard's number from the copy, but left `tests/unit/industryChain.test.ts`,
  `tests/unit/chainPlate.test.tsx` and `tests/e2e/chain.spec.ts` asserting the old headline and the
  old `PSAK 72` strings — while adding, in `ChainAudit.test.tsx`, a test that forbids any digit in
  the same records. Six unit tests and several e2e assertions contradicted each other. Fixed here by
  taking the newer intent: no standard is named anywhere in the public copy, the principal–agent
  test is stated in words, and `noFigures` now forbids every digit with no exception.

## Decisions

- **Contract capacity is gone as a layer.** The brief withdrew it; the target list of layers does not
  contain it. The local term it carried is not lost: `makloon` and the tolling fee now live on the
  reading of the manufacturing → distribution joint, where a toller actually appears — the brand
  owner books the sale gross and holds the inventory, and the plant behind it sells machine hours.
  That is a better place for it than a band: contract capacity was never a service riding on a span
  of the chain, it was an alternative answer to "who controls these goods".
  One `git revert` of this commit restores the band if the owner wants it back.

- **Five layers, not six**, and the green transition now lights logistics as well as energy, credit
  and recovery. The brief's own list for the green overlay names logistics, and section 6.4 asks the
  map to say why: an enabling layer takes no title and transforms nothing, but it INJECTS a cost, an
  energy use and an emission into every joint it touches, which puts a floor under the unit that no
  single stage can remove. The reading also carries the demonstration the brief asked for — one
  physical fact booked in two places, direct emission at the provider and purchased emission at the
  brand owner, the same split the gross-and-net line makes at a node. Written in plain words rather
  than with the scope numerals, because the map carries no digits at all.

- **A mark is a position; a slug is a name.** The numbered marks are computed by the generator from
  where they land on the plate — left to right, then top to bottom, with the layers last because
  they are the bottom row — and renumbered from one for every overlay. Identity is `SLUGS` in the
  data file: one permanent public address per element, pinned verbatim by a unit test, because it is
  what an essay links to. Nothing on the map ever displays a slug and nothing outside the map ever
  links to a number.

- **A mark exists only where BOTH readings are written.** That is what keeps the marked set the same
  at both distances: the shift decides which elements are marked, the distance decides only what a
  mark says. It also means an element with nothing to say carries no mark, so the map is never
  pitted with empty panels — and leaving a reading empty is how the owner parks a target.

- **The URL parameters are the owner's spelling, not the code's**: `?lens=` is the SHIFT and
  `?distance=` is what the code calls the lens. They are a published contract that essays will be
  written against, so they are mapped once in `useChainUrl.ts` and never renamed casually. Written
  with `history.replaceState`, not the router: the map is not a navigation, and a step per click
  would fill the back button. A plain visit rewrites nothing.

- **A readout replaces the tooltip.** One line of fixed height under the plate, which every mark,
  joint and layer writes into on hover and on focus. A floating tooltip on a plate this dense covers
  the neighbour the reader is comparing against — which is what the brief reported seeing — and the
  margin kind now reads as words there, not only as the chip's border.

- **The finance distance names the service, not the measure.** Every joint's finance reading now
  opens with what is done there — makes the material, bulks the lots, refines the input, lands the
  goods, breaks the bulk, holds the shelf — and the margin follows as the thing that measures it.
  Each layer reads the same way: what is sold here is capacity, or the wait, or power.

- **The headline states the thesis.** "Every joint in this chain is a margin.", with the standfirst
  "Add them up and you have an economy; take one apart and you have a driver tree." The previous
  headline named the mechanism (one chain, two distances); the controls already say that in the two
  sentences beneath, and the headline is the one place the argument can be made.

- **The consumption → recovery chip moved to the left of its joint.** On the right it was an opaque
  label painted across the two post-consumer return risers.

## Held

- Swimlane, left to right. No shape claimed. Four categories kept apart by form. No new palette. No
  figures. The landing page keeps its hero and its short chain. Every colour is still a token and
  `chain-plate.css` is still generated — edit the generator.

---

# 2026-09-06 — Two controls that compose: every joint carries two readings, and a shift is an overlay

**The owner's design brief of 2026-09-06 asked for two controls over one map — a distance
(economy ↔ finance) and a shift (none / reindustrialisation / green transition) — that compose into
six states, and asked that the joints, not the boxes, be the protagonists.** This pass builds both
controls, restructures the lens content around the joints, and re-weights the plate. It ran on a
branch and stopped at a pull request; the owner merges. Screenshots were not received with the brief,
so every visual judgement here was made on renders taken from `main` in this session.

## Superseded from the two entries of 2026-09-05

- **The lens ids are `economy` and `finance`**, not `economy` and `unit`. The brief names the two
  positions Economy ↔ Finance; "unit economics" is what finance sees, not the name of the distance.
- **The distance is a position, not a switch, and one of the two is always on** — economy at rest,
  because the reader arrives from far. The earlier three-state lens (off / economy / unit) is gone:
  the brief's model is two distances × three shifts = six states, and a "no distance" state was a
  seventh the thesis has no use for.
- **The economy lens is no longer a cloud of fifteen anchored annotations, and the unit lens is no
  longer a strip of slices under the columns.** Both readings now live ON THE JOINTS: every joint
  carries `read.economy` and `read.finance`, each a chip word and a sentence. The chip is always on;
  its word is the joint read at the distance that is on. Rejected: keeping the cloud (it read as an
  annotated infographic and anchored nine of fifteen readings to boxes, when the thesis says the
  joint is where inflation passes and value added is added up) and keeping the strip (a slice is cut
  at a joint, so drawing it under a column contradicted the map's own claim). Every fact in the old
  fifteen readings survives inside the per-joint sentences; energy intensity moved to the energy
  layer's reading.
- **The two distances have no colour.** Navy-for-far and orange-for-near are gone: a distance changes
  words, and the lane label under the chain says which is on. The editorial orange now means exactly
  one thing on the plate — a shift — as ring, outline, arrow and callout edge, never as text.
- **Energy is the sixth enabling layer**, a whole-chain band with a `service-fee` margin, not a set
  of perpendicular arrows into every stage. The brief lists energy among the layers, and the green
  transition has to be able to light it. Order of the six: logistics, credit, energy (the three
  whole-chain costs), contract capacity, governance (the two partial layers), regulation (the rules
  under everything). Tests pin the order.
- **The retail formats are rows inside one dashed retail node**, not five pills. One node type, five
  formats — as the column already drew them — and it takes eight flow lines and four pills off the
  right third of the plate, where the nodes were competing with the joints.
- **Monospace is gone from the plate and the column.** One face; case and weight tell a name from a
  note from a lane title.

## What was built, and the choices made

- **Two sentences are the two controls.** The lead names the two distances and the two words are
  the positions (`aria-pressed`, one always true). A second sentence names the two shifts; each word
  is a toggle and the two exclude each other, and the sentence says why in economic terms ("one at a
  time, since both draw on the same export earnings"). Rejected: a segmented control or tabs — the
  brief's own test is that if the control feels like navigation the thesis has failed.
- **A shift is an overlay, generated as static geometry** (`.cp-shift--{id}` groups, shown by CSS
  from `data-shift`): a ring on every joint it moves, an outline on every stage, node and layer, a
  lit redraw of every border line and return arc, one arrow where a cut moves (the export cut, from
  extraction → processing to processing → trader), and a callout chip. The base geometry and every
  unlit joint recede to a fixed opacity; labels never dim. Nothing is redrawn.
- **Composition happens in three places.** The caption under the sentences reads the shift as a
  whole at the distance that is on; the "What moves" list under the plate reads every lit target at
  that distance (each door among them a button); the panel of a lit target carries an "Under
  {shift}" block. Changing either control re-reads all three. A door stays open while a control
  changes — the same target, read differently — where before a lens change closed it.
- **Three levers, as data.** `LEVERS` names the only three ways the map moves (move the border cut;
  price a joint that was free; re-price a layer); each shift lists which it pulls, and a test asserts
  the two pull all three between them and light disjoint targets. Reindustrialisation lights the two
  borders, extraction → processing, processing (the capacity), processing → trader, the trader,
  trader → manufacturing and manufacturing. The green transition lights the energy and credit layers,
  consumption → recovery, recovery, and the two post-consumer loops. Regulation was considered for
  the green list (a carbon price is a rule) and left out to keep to the brief's four.
- **Margin kind is told by the chip's form**, not its word: solid for conversion, dashed for a
  spread, filled for a fee — the three forms the panel's `Chip` already used, now on the plate, in
  the column and in the legend. With a 2-position distance the kind words (Conversion / Spread / Fee)
  have no lane of their own; the form carries them without colour.
- **Weight inverted.** Stage boxes drop to a one-unit stroke; the flow rises to the heaviest line on
  the plate (foreground, 1.7); the joint diamond is the heaviest mark (radius eight, stroke 1.8). A
  test asserts flow outweighs box.
- **The reading lane** is two rows under the chain with elbowed leaders where three joints share one
  stretch (the two left-hand joints step sideways; processing → trader takes the lower row with the
  two border joints). A browser audit — no text over another text, every label inside its box, no
  chip over a box — passes in all six states at 1280 and 1440.
- **Mobile**: chips on every joint row swap with the distance; a shift outlines the rows it moves
  and writes what moves beneath each; the two post-consumer loops appear inline under Recovery while
  the green transition is on, so the loop is visible without opening the returns list. Nothing dims
  on a phone — a long column read at arm's length cannot afford to lose contrast.
- **The short version gains a quiet diamond at every join**, so the joints read as the motif before
  the reader expands the chain. No chips, no doors, no overlay there.
- **The headline is unchanged.** The brief floats two alternative headlines and asks for a
  proposal; the proposal is in the pull request, the code keeps the verbatim sentence and its test.

## What a future session must not undo by accident

- The headline is verbatim, and a test asserts it.
- No digits anywhere in the map except "PSAK 72". A test asserts it, over the shifts and levers too.
- One distance is always on; the two shifts are exclusive and light disjoint targets; there are
  exactly three levers. Tests assert all three.
- Every joint carries both readings with distinct chip words within a distance. A test asserts it.
- Every colour on the plate is a token; orange means a shift and nothing else; `chain-plate.css` is
  generated — edit the generator.
- Layers per joint are derived from spans; do not add a hand list back.
- Test floor raised 351 → 367 (370 tests).

# 2026-09-05 (later) — Every joint answers for its margin; five layers; the landing page carries the short chain

**The owner's later brief of the same day reverses several of the morning's "not to be re-litigated"
bullets, and this entry records the reversals so neither set is mistaken for current.** The plate on
About was complete and worked; this pass fixed four substantive faults in it, added a short version
under the landing-page hero, and redrew the narrow-screen layout.

## Superseded from the earlier entry (owner brief, later 2026-09-05)

- **The chain is NOT an hourglass, or any shape.** The grey hull is gone. A geological chain funnels, a
  biological chain fragments; the map is generic across sectors and must not claim a shape through
  layout. The unit-economics slices are now all one thickness — a thicker block would be a figure.
- **Contract capacity is back**, as an enabling layer (makloon · toll manufacturing) spanning primary
  processing → finished-goods manufacturing only. The earlier "deleted outright" is reversed.
- **Principal–distributor contract governance is a layer, not a joint attribute**, spanning
  manufacturing → retail only. `JOINT_ATTRIBUTES` is gone.
- **Information flow is drawn again**: demand signal back up the chain, specifications and standards
  forward. Money runs BOTH ways: payment against the goods; trade credit, trade promotion and rebates
  with them — the second line is what decides who can afford to be a node.
- **An unmapped joint is a target.** Every joint now answers "what margin sits here" and names the line
  of the accounts that carries it, so every joint is a button at rest — quiet diamond, chip on hover /
  focus / under the unit lens, panel on click. The earlier rule "no chain-located module → no target"
  now applies only to the curriculum section inside the panel.
- **The landing page carries the short version** as the second section under the hero (hero untouched).
  The earlier "the landing page waits" is superseded.

## What was built, and the choices made

- **Margin at a joint = the seller's slice.** A node sells a spread; a stage sells its conversion
  margin; consumption → recovery is a service fee (the discarding party pays a gate fee — money runs
  WITH the goods there, and recovery's conversion margin is realised later on the return flows).
  Manufacturing → distribution reads both ways: conversion where the maker sells as principal;
  node spread where a brand owner sells goods a toller made for it. Rejected: labelling by the buying
  side (retail → consumption would be "conversion", and a household converts nothing).
- **Three margin kinds, per the brief, and the layers keep their own lines.** Logistics, credit and
  contract capacity carry `service-fee`; governance ("Terms") and regulation ("Rules") carry no
  margin kind — they set or constrain the spreads either side. The credit layer's lines say when the
  "fee" is a lender's finance income and when it is a position on the balance sheet (receivables and
  payables, DSO/DPO, advances to suppliers, early-payment discounts as variable consideration,
  derecognition on factoring). Rejected: a fourth kind "financing" — the brief defines three.
- **Layers riding on a joint are DERIVED from the band's span** (`bandJoints`, `jointLayers`), not
  listed by hand. Contract capacity rides exactly processing→trader, trader→manufacturing,
  packaging→manufacturing; governance exactly manufacturing→distribution, distributor→wholesaler,
  wholesale→retail. A test pins both sets.
- **Border lines are base structure, not a lens.** Export cuts at extraction → processing, import at
  trader → manufacturing, drawn as vertical dashes with a chip. The economy lens's three "cuts" (which
  sat at the wrong x) are gone; its external-balance and import-share readings were re-anchored to the
  same joints as the borders, and a test asserts the two layers agree.
- **Post-consumer loop split by material**: recyclate lands on primary processing; organic (compost)
  lands on biological production. By-product stays a forward branch.
- **Four rails under the chain** for the non-physical flows, two per kind: money dotted with a filled
  head, information dash-dot with an open head; upstream rails arrow left, downstream right, captions
  on the tail. Rejected: one bidirectional line per kind (a reviewer's proposal) — the brief asks for
  two lines clearly different in direction.
- **Legend by form, not colour**: solid box, dashed pill, filled band, dashed arc, dotted/filled head,
  dash-dot/open head, vertical dash with chip, diamond. Plus the PSAK 72 principal–agent note.
- **Type**: every label on the wide plate is ≥14 viewBox units (names 18), the viewBox is 1600 wide,
  the About section uses the full `container`, and the wide plate is shown only from 1280px, where a
  name renders ≥12px. A test pins the CSS floor; the e2e spec measures the rendered scale.
- **Accessibility of the wide plate**: `role="img"` on the SVG would have pruned every button inside it
  from the accessibility tree, so the plate is a `role="group"` with `<title>`/`<desc>`. Triggers use
  `aria-expanded` + `aria-controls` (the panel is a disclosure); the two lens words and the two mobile
  toggles keep `aria-pressed`. On open, focus moves to the panel heading; Close returns it to the door.
  Hover affordances sit under `@media (hover:hover)`; nothing is hover-only.
- **One layout in the document at a time.** `useMediaQuery` (useSyncExternalStore) picks the generated
  plate from 1280px and the HTML column below it on the first render. Rejected: both in the DOM with
  CSS display switching (duplicate buttons, duplicate ids, and the "robust for prerender" argument was
  false — prerender touches only essay routes).
- **Between the phone and the plate, the column is read at reading width.** From 1280px up the
  generated plate is the map; below that the column is, capped at 42rem rather than stretched across
  a tablet. Lowering the plate's breakpoint was rejected: at 1024px its type would fall under 12px.
- **A lens dims the geometry, never the type.** `opacity:.42` on the whole base group took every
  stage and node name to about 2:1 — the very names the lens readings are anchored to. The rule now
  selects leaf shapes only, so labels keep their contrast under a lens.
- **The plate is a `role="group"`, and its lens overlays are NOT `aria-hidden`.** Under `role="img"`
  the browser prunes every button inside the drawing; with the overlays hidden, pressing a lens word
  announced "pressed" and exposed nothing. Both are reversed, and `display:none` still keeps the
  inactive overlay out of the tree.
- **Every box is sized from its own label.** The generator wraps each label to a per-column character
  budget and derives the box width and height from the wrapped lines, so a longer word in the data
  widens its box instead of overrunning it. Nothing in the generator restates a label any more — the
  stage names and the distributor's recursion come from the data, and a test asserts it. A browser
  audit (every text inside its box, no text over another text, nothing clipped) runs at rest and
  under both lenses.
- **Closing a reading returns focus to the door the reader came through**, even when they walked
  from a joint into one of its layers: a trigger inside the panel does not become the return target,
  and a detached one falls back to the figure.
- **Mobile is a column, in HTML** (`ChainColumn.tsx`), replacing the generated tall SVG whose rotated
  9px type could not hold five bands as rails. Stages are boxes, nodes pills, joints tappable rows that
  open their reading right beneath them; origins and the two side inputs sit two abreast; layers are a
  list of rows that open; returns and money/information are lists behind two toggles, off by default;
  lenses write inline. No fixed widths, no `whitespace-nowrap`; the e2e spec asserts
  `scrollWidth ≤ 360` with everything open.
- **The short version is a VIEW over the same data** (`COMPACT`): six stages, three node groups
  (Aggregator · Distribution / wholesale · Retail), two layers, one return arrow, no small labels, no
  doors. Packaging, the trader and the principal are omitted, not merged.
- **Progressive disclosure = one button, in place.** "See the full chain" (or pressing either lens word,
  which is a closer look) swaps the compact plate for the full one under the same headline; "Back to
  the short version" swaps back. Rejected: expansion on scroll (layout shifts under the reader's
  thumb and fights the reduced-motion rule) and a link to About (a second click and a page load for a
  reader who has just been promised the map is not complicated).
- **Generator ⇄ column parity is tested**: every id in the data must appear as `data-id` both in the
  generated plate and in the rendered column (with toggles and lenses on).
- **No digits**, still — the test now strips the one allowed token, "PSAK 72", before asserting.

## What a future session must not undo by accident

- The headline is verbatim, and a test asserts it.
- No digits anywhere in the map except "PSAK 72". A test asserts it.
- Every joint and every layer is a door; the curriculum follows only where a chain-located module is
  pinned, and a draft lesson stays inert "Coming soon".
- Every colour on the plate is a token; `chain-plate.css` is generated — edit the generator.
- Layers per joint are derived from spans; do not add a hand list back.
- Test floor raised 309 → 351 (354 tests).

# 2026-09-05 — The chain at two distances: the headline wins, the lenses overlay, the mapping ships empty

**The About map is rebuilt around one verbatim sentence — "Nothing here is complicated. It
only looks that way from the wrong distance." — and the diagram is subordinate to it.** Three
versions preceded this one in a single day: a toggle-and-panel map on About, a ledger-green
standalone plate proposed for the landing page, and that plate mounted in place of the homepage
hero. All three are gone. The homepage has its hero back (the DELIBERATE KEEP in
`HeroSection.tsx` stands); About carries the plate; the landing page waits — "masuk ke About
dulu, belum ke landing page".

## Owner decisions taken in session, recorded so they are not re-litigated

- **The chain is an hourglass** — narrows to primary processing, widens after distribution.
  This reverses the morning brief of the same day, which forbade claiming any chain shape. The
  later brief marks it final content; it is drawn, not captioned: lane count carries it on the
  wide plate, box width on the tall one.
- **Content is final.** Four categories never share a visual treatment (transformation stage,
  intermediary node, spanning layer, physical return). Logistics is a spanning layer, not a
  parallel stage. Energy is a perpendicular input into every stage, not a first stage. Two
  flows run against the goods: money right-to-left, physical returns.
- **The enabling-layer table under the map is dissolved, not tidied.** At rest only two bands
  survive — logistics and warehousing; regulation and standards. Contract capacity (makloon,
  toll manufacturing) is deleted outright, not kept in any form. Principal–distributor contract
  governance is an attribute of one joint (manufacturing → distribution), visible only under a
  lens. Monetary policy, fiscal policy and the external balance moved into the ECONOMY lens;
  credit and working capital (DSO, DIO, DPO — who finances whom) into UNIT ECONOMICS.
- **No figures.** Not percentages, not amounts, not "illustrative" magnitudes. The map carries
  the anatomy of a slice — what attaches at a joint and which way the cost moves — never its
  size. `tests/unit/industryChain.test.ts` asserts no digit appears in the data or the
  generated plate.
- **The joint → module mapping is data, not a design decision.** `src/data/chainCurriculumMap.ts`
  documents the schema (joint · moduleSlug · moduleClass ∈ chain-located, chain-wide,
  off-chain); only chain-located rows attach. It shipped empty, then the owner asked for the
  manufacturing → distribution joint to be filled first. Every row was checked against the live
  `finance_modules` table before it went in: `t1-m10` Working Capital Management and `t3-m06`
  Working Capital Optimization and Cash Conversion — the two modules that read receivables,
  payables and inventory, which is exactly what the lens sites at that joint ("DSO · DPO — who
  finances whom"). Considered and rejected for the same joint: `t2-m01` Corporate Governance and
  Agency Theory (the joint's attribute is contract governance between two firms, not board-level
  agency), `t2-m07` Credit Risk (framed on covenants, not trade receivables), `t4-m05` Unit
  Economics (the lens's own method — chain-wide, not one joint's). All six essays under the two
  modules are drafts, so the panel links the modules and lists the lessons as inert "Coming soon".
- **Placement:** the earlier same-day choice "the plate replaces the hero" is superseded by the
  later brief; the hero is back and the About section carries the map.

## Decisions taken here, with the alternative rejected

- **The lens control is the sentence.** The supporting line under the headline names the two
  lenses, and those two words are the two buttons (dotted underline at rest, solid in the lens
  colour when on, `aria-pressed`). Rejected: a toggle bar above the map (the previous brief
  killed it — controls announced before anything is worth controlling) and buttons under the
  plate (chrome that competes with the headline for the entry point).
- **Palette stays inside the navy system; the two lenses take the two accents it already has.**
  ECONOMY = `--accent` (navy; cool recedes, the far reading). UNIT ECONOMICS =
  `--accent-editorial` (the Substack orange; warm advances, the near reading) — used only as a
  field and an edge, never as text: as text it measures 2.4:1 on `--card`, below AA. Rejected:
  `--destructive` (passes contrast, but it is the delete-button red and would couple a lens to
  admin semantics) and a new token (the brief said not to touch the theme).
- **Returns are neutral** (`--muted-foreground`, dashed) so that red means exactly one thing on
  the page. The oxide-red returns of the standalone plate also cut through text.
- **The unit-economics strip mirrors the hull's own lower edge.** Slice thickness at each column
  is the hull's half-height there, so cost per unit visibly falls to processing and rises after
  distribution from the SAME geometry as the base map — the two lenses cannot disagree on the
  shape. Rejected: a cumulative stacked bar (its step sizes are implied magnitudes, and it does
  not read as an hourglass).
- **Information flow is no longer drawn.** The brief's final content names two counter-flows and
  a resting state of "the chain and two bands, nothing more"; information was neither. The
  by-product branch is kept, small, as a forward flow out of processing.
- **The regulation band is "Regulation and standards"**, because fiscal status moved into the
  ECONOMY lens under the brief's own split.
- **Geometry is generated, not hand-placed.** `scripts/build-chain-plate.mjs`
  (`npm run build:chain`) imports `src/data/industryChain.ts` directly (Node type stripping)
  and writes `ChainPlateSvg.tsx` and `chain-plate.css`; a test checks the generated file is in
  sync with the data. Rejected: hand-authored SVG — two layouts × ~200 coordinates do not stay
  on one grid, and the third same-day rework proved it.
- **Mobile is a redesign, not a shrink.** The hourglass stands upright (box width carries the
  pinch); the two bands become rails on the far left; returns run the gutter beside them; both
  lenses write into a right-hand column with wrapped notes; the curriculum panel drops below.
- **Skills:** `frontend-design` (and `design-direction`, which `component-craft` refers to) are
  not in the account's library. `artifact-design` and `artifact-diagramming` stood in for the
  page-level direction; `component-craft` was used as briefed.

## What a future session must not undo by accident

- The headline is verbatim, and a test asserts it. Do not rewrite, soften or lengthen it.
- No digits anywhere in the map — data or generated plate. A test asserts it.
- A joint with no chain-located mapping renders NO target: not a disabled one, none.
- In the curriculum panel a draft lesson is inert text labelled "Coming soon" on the same
  `published` flag `FinanceTrackIndex` uses. Never a link that 404s.
- Every colour on the plate is a token. `chain-plate.css` is generated; edit the generator.
- Test floor raised 299 → 309 (312 tests; the map's 19 replaced by the plate's 29).

# 2026-08-03 — The structure is public: draft titles and decks render to everyone

**Owner decision, reversing the 2026-08-01 rule "do not make drafts anon-readable" —
with its scope stated precisely: titles and decks only, never bodies.** Anonymous
visitors used to see module names and a count; the curriculum's structure — the
titles and decks of the 159 unwritten essays — now renders publicly, labelled
`Coming soon`, with the author shown. The ledger rows that asserted an anonymous
reader sees zero drafts are rewritten in place (`docs/GATE_LEDGER.md` rows 1b, D,
W2 and two bulleted notes) rather than left contradicting the code.

## The mechanism: a column-enumerating view, because RLS is row-level

Postgres RLS cannot express "unpublished rows, some columns". Loosening
`essays_select_anon_published` would hand anon the entire row — `content` and
`content_json` included — publishing 161 unwritten essays and exposing whatever is
mid-draft. That policy is untouched (non-negotiable, and re-measured: its qual is
still `(published = true)`). The exposure is the **`essay_structure` view**
(migration `essay_structure_public_view`), whose SELECT list is the whole public
contract: `id, slug, title, snippet, author, section, module_id, finance_order,
published` — plus `read_time` and `lesson_type` NULLed until published, so an
unpublished row exposes exactly the enumerated set and nothing presentational
leaks early. Scope `status IN ('draft','published')`: archived essays are
soft-deleted and must not resurface as `Coming soon`, and any future status stays
hidden until deliberately exposed.

**The `security_invoker` question, answered explicitly because getting it backwards
fails in one of two opposite ways:** the view is created `WITH (security_invoker =
false, security_barrier = true)`. Invoker semantics would apply the CALLER's RLS to
`essays` underneath — anon would see only published rows through the view and the
feature would expose nothing. Definer semantics (the deliberate choice) read
`essays` as the view's owner (`postgres`, the table owner, whom RLS does not bind),
so the view's column list and WHERE clause are the entire boundary. Supabase's
linter flags SECURITY DEFINER views; here that property is the point, and the
narrowness of the SELECT list is what makes it safe. A view cannot carry `CREATE
POLICY`, so its explicit access policy is the privilege layer: `REVOKE ALL` from
PUBLIC/anon/authenticated first (Supabase default privileges grant ALL to new
objects), then `GRANT SELECT` to anon and authenticated only.

## Drafts are inert, not disabled

A draft title that looks clickable and does nothing — or 404s — reads as broken,
and that failure has shipped here twice (track-index rows that were not links; the
dead `?theme=` tabs). Unpublished rows for readers are plain `<div>`s: no anchor,
no handler, no tabindex, muted text, `cursor-default`. Not a disabled link, not an
anchor without a target. For admins the same row keeps routing into the editor,
and the pencil stays admin-only. Published rows are byte-for-byte the interaction
they were: link, byline, read time.

## The name rule, updated to match the owner's call

The 2026-08-02 hero decision recorded the standing rule as "the name appears where
LinkedIn or email is attached" — one rendered occurrence, the footer contact line.
**The owner has now decided the byline stays on essay rows: `Coming soon · Dika
Gustiana` on every unwritten essay, `Published · Dika Gustiana · …` on published
ones — roughly 161 rendered occurrences. That is settled; do not delete these
bylines as a rule violation.** The rule as it now stands: the name appears on the
footer contact line, AND as the author byline on essay rows and essay pages —
authorship attribution on a byline is not the self-promotion the hero rule
removed. The hero itself stays byline-free; nothing about the 2026-08-02 hero
change is reopened.

## Module counts are derived; section landings are not

`useTrackEssayCounts` now derives both `published` and `total` per module from
`essay_structure` — the stored `module_meta.essay_count` is no longer read
anywhere (`useModuleLessonCounts`, its only other reader, had zero consumers and
is deleted as dead code). Verified at switch time: **all 49 modules' stored counts
equalled their real row counts, zero mismatches** (gate S7), so no rendered number
changed and the stored values are confirmed correct rather than inherited from the
framework document's 55-vs-56 inconsistency. The derivation is **module-level
only**: Accounting and Green Transition carry real work as hand-built static pages
that are not `essays` rows, so a derived count would understate section landings —
do not extend it there. The now-unread `essay_count` key's removal is staged as a
follow-up migration (SQL in the session log), to be applied only after production
pages are confirmed reading the derived source — the *_fields precedent: the drop
never travels with the new read path.

## The count line keeps its place — reported, as asked

`0 of 56 essays published` above a list of 56 visible titles would merely repeat
the page — if the titles were visible at rest. They are not: modules are collapsed
by default, so the per-module `n of N published` is the only signal of a module's
size and progress until it is expanded, and the track-level line aggregates 49 of
them. The counts summarise what expansion would show, repeat nothing the reader
can already see, and are now derived from the same rows as the titles, so they can
never disagree with them. Kept, on that reasoning.

---

# 2026-08-03 — The Brief companion

Every essay gets an optional companion: a Brief — 500–600 words, written days after
the long essay is published, explaining the same thing in a fraction of the space. It
is a **writing exercise** (compression as a test of understanding, the form every
scholarship-application artefact takes), not a reader convenience. Consequence that
governs the build: **if a Brief is ever machine-generated the feature has no value**,
so there is no summarise button, no AI-assist affordance, no generate-from-long
action — not now, not behind a flag (GATE B7 greps for this).

Settled by the owner, recorded here so they are not reopened: two views of one essay
at one URL; labels `Full · Brief` near the title; Full is the default; the toggle
renders only when a Brief exists (no placeholder, no disabled state); optional with
no publish gate; long first, then compress; flowing prose only (no headings, tables,
figures or lists — bold and links fine); visible live word count with 500–600 stated.

## The word-count reconciliation — record this before someone "fixes" it

The long-form writing canvas was deliberately stripped of its word count (the bar
comment in `WriterEditor.tsx` still says why: "a word count in the corner is a number
the writer will watch"). That was correct and stays correct. The Brief editor shows
one, live. These are not in tension. **The rule: a word count is part of the work
when there is a target, and noise when there is not.** The long essay has no word
target, so the number is only distraction; the Brief's 500–600 target is its
constraint, so the number is the task. A later session noticing the inconsistency
must not converge the two surfaces in either direction.

## Delegated decision 1 — where the Brief is written: a dedicated surface that never loads the long body

**Chosen: a separate Brief editor at `/admin/writer/:section/:slug/brief`
(`BriefEditorPage` → `BriefEditor`), which never mounts an editable long body.**
Rejected: the long editor with the body rendered read-only in Brief mode behind an
explicit switch-to-edit control.

Writing a Brief means opening a *published* essay — 161 times, tired, at midnight.
On a shared screen, the 26,000-character body is one mode-switch away from a stray
keystroke, and modes invite mode errors: the read-only variant protects exactly until
the author flips it, which is precisely when the protection matters. The dedicated
surface closes the risk **by construction**: no code on that screen writes
`essays.content` or `essays.content_json` — its save statement updates
`brief_json` and nothing else, which is checkable by reading one function
(GATE B2 verifies it behaviourally). Two further effects tipped it:

- **It makes the exercise cleaner.** The long version is not on screen, so it cannot
  be whittled down by copy-paste; the Brief is written from understanding. Consulting
  the long essay means opening its public page — reading, which is the right
  relationship to a published piece.
- **It satisfies "do not touch the long-form canvas" literally.** The chosen shape
  required zero edits to `WriterEditor`/`EssayEditor`; the read-only variant would
  have meant restructuring the canvas around a mode flag.

The Brief editor shows the essay's title and deck read-only (context, not editable
fields), the restricted canvas, the live word count with the 500–600 target stated,
and Save. Autosave follows the published-essay rule regardless of essay status:
backup-only into `essay_revisions` (`brief_autosave`), explicit Save to touch the
row — a Brief's subject is usually live, and one uniform rule beats two.
The Save is guarded on `updated_at` like every other essays write, so a stale tab
loses loudly instead of winning silently.

## Delegated decision 2 — the queue lives in /admin/content, not Personal OS

**Chosen: a Briefs panel on `/admin/content` — published essays with no Brief, age
since publication, oldest first.** A list makes no demand; it is there when he
wants it. A notification for optional work gets ignored, then habitually ignored,
then becomes noise that masks something that matters — the panel is deliberately
not a badge, not a nag, not a count in the nav.

Personal OS (Website page, GROWTH workspace) is where planned personal work actually
gets looked at, and the honest cost of not choosing it is that this list lives where
content is managed rather than where work is planned. But it crosses into a
different Supabase project (`ascbthsgborseynmmthm`), which is an architectural
decision in its own right and out of scope here. **What the Personal OS version
would need, recorded for the day it is wanted:** a read of this project's
`essays` (slug, title, date, `brief_json IS NULL`) from the personal-os app —
either a periodic sync job writing into a personal-os table, or a direct
cross-project fetch with this project's anon key (published essays are
anon-readable, so no secret crosses); a place on the Website page to render it;
and a decision about whether completing an item there marks anything here (it
should not — the Brief's existence IS the completion state, single source of
truth). Nothing on this project's side blocks it.

Age since publication is computed from `essays.date` (the stated publication date;
`created_at` fallback), because only one of the five published essays has a
`publish` revision row — the date column is the honest source that exists for all.
An essay published yesterday is inside the normal window; one three weeks unwritten
is a different fact, so the age is printed per row, oldest first, not summarised.

## Delegated decision 3 — an essay leaves the queue when a Brief exists, at any length

**Chosen: exit on existence** (non-empty `brief_json`), not on the Brief landing
inside 500–600 words. A 900-word Brief is a finished Brief that missed its target —
useful information about the exercise, not unfinished work. Any length-based exit
rule turns the target into a gate by the back door: a 700-word Brief pinned
permanently in the queue is a nag, and this feature must never block or nag
(the unwound publish-gate rule is the precedent). The pressure survives as
information instead: the panel's second list — essays whose Brief exists — prints
each Brief's word count, so drift from 600 to 900 to 1,100 is visible without any
rule preventing it.

## Storage shape — one jsonb column, no HTML mirror

`essays.brief_json jsonb`, NULL meaning no Brief. **No HTML mirror**, deliberately.
The long body's `content` (HTML) column exists because it predates `content_json` —
legacy rows still read from it (`ArticleBody`'s second branch). No Brief row
predates anything, so a `brief` HTML column would be a second representation with
no consumer whose only capability is diverging from the first — the exact
`content`/`content_json` failure this project already shipped once. The public
page renders the Brief through `ArticleBody`'s canonical JSON branch; HTML is
derived at read time where needed. GATE B5's divergence check is therefore run in
its honest form for a single-representation body: after a cold reload, the
editor's in-memory document equals the stored `brief_json` byte-for-byte
(canonicalJson), and serialise(parse(·)) over the stored document is stable.

## Brief revisions coexist in essay_revisions by change_type namespace

Same table, same `content_json` column, two new `change_type` values:
`brief_autosave` and `brief_manual_save` (CHECK constraint widened in migration
`essay_brief_companion`). Rejected: a parallel `brief_json` column on
`essay_revisions` (every row would carry a dead column for the other body, and
every writer must know which column to fill); a separate `brief_revisions` table
(a second numbering scheme and RLS surface for what is the same audit trail).

The load-bearing consequence: **every reader must filter by kind.** The revision
helpers in `src/lib/revisions.ts` now define the two namespaces
(`BRIEF_CHANGE_TYPES` / long) and `useEssayAutosave` takes a `body` parameter —
rollup and the recovery probe read only their own kind, while `revision_no`
still numbers across both (the UNIQUE constraint is per essay, not per kind).
Without the filter, the long editor's recovery probe would see a newer
`brief_autosave` row, find it differs from the long body, and offer to "restore"
a 26,000-character essay into its 600-word Brief. The word-count column question
resolved the same way as the mirror: **derived on read, never stored** — one
shared `briefWordCount()` walks the JSON text nodes for both the editor's live
count and the queue's displayed count, so the two numbers cannot disagree and
nothing can go stale.

## The Brief schema is a restriction, not a new contract surface

`getBriefExtensions()` in `src/lib/tiptap/extensions.ts`: paragraphs, text, bold,
italic, links, hard breaks — nothing else. Italic is included though the mandate
named only bold and links: the exclusion list is structural (headings, tables,
figures, lists — the places explanatory load hides), and emphasis is prose, not
structure; an editor that strips emphasis mangles meaning. Everything the Brief
can produce (`p`, `strong`, `em`, `a`, `br`) is already inside all five places of
the content contract — serialize.ts, ArticleBody, the sanitizer allowlist and the
round-trip test already handle these nodes — so the Brief adds **restriction**
tests (excluded nodes cannot exist even via paste, because they are absent from
the schema) rather than new rendering paths.

---

# 2026-08-03 — The Sections list: kept by owner decision, reshaped by subtraction

## The grid stays — owner decision, recorded so it is not relitigated

A design review recommended deleting the homepage Sections grid outright, on the
grounds that four of its six sections have no essay rows at all. **The owner declined
that recommendation.** The grid stays as a surface; what changed is its shape. Do not
reopen the argument; the next session that wants to delete it needs a new owner
decision, not a re-reading of the old review.

## Cards became a divide-y list of titles, and the description slot is REMOVED

Six equal cards with icon chips, six parallel one-line descriptions and a repeated
"Enter →" is the shape that reads as generated. The fix is subtraction, not better
copy: rows in a `divide-y` list, title only, the row itself the link. The description
slot is deliberately gone rather than emptied — six sibling sentences in one meter is
the tell, and a model asked for six parallel descriptions will produce six isometric
sentences again; removing the slot removes the problem. If descriptions return, the
owner writes them.

## Numbering was rejected, deliberately

Easy to get wrong by analogy: `FinanceLanding.tsx` numbers its entries and is this
repo's reference page. But numbering is load-bearing there — fundamentals → strategic
→ planning → analytics is a real learning order. The homepage's five sections are
peers with no order, so `01–06` would be read as rank, and "why does X outrank Y" is
a question with no answer. A list that provokes an unanswerable question is worse
than a plain one. (`FinanceLanding.tsx` itself was not edited: it is the reference,
and converging other pages onto it is right while editing it is how references
erode.)

## IELTS left the homepage and kept its page and nav entry

Likely the highest-search-volume content on the site, so it stays as an audience
asset reachable from Learning → IELTS. It does not sit among the top-level doors: on
a site read by scholarship panels, exam technique beside sovereign lending is a
register collision. The Finance row also now links to `/finance` directly instead of
the `/finance-101` legacy redirect — the row should name the destination, not a
forwarding address.

## Comments may not quote deleted copy (the wrapped-phrase lesson, twice in one session)

`HeroSection.tsx` explained a removed paragraph by quoting it verbatim — including
the owner's name, wrapped across a line break where the phrase-grep gate could not
see it. Reworded to explain the removal without reproducing the sentence; the same
fix applied to `FinanceTrackIndex.tsx`'s comment quoting the old hardcoded byline
string. And the session promptly repeated the mistake in miniature: the first fix for
the fabricated IELTS statistic quoted the bogus number in its explanatory comment,
where the gate grep caught it. The rule that falls out: **a comment explaining a
removal never reproduces the removed text**, and **any grep used as a gate must be
line-break insensitive** (search whitespace-normalised content), or it is a check
that passes because it never really looked.

---

# 2026-08-02 — The hero drops its third paragraph, and with it the only byline

The hero is now **exactly two text blocks and then the CTA**: the h1, one paragraph, "Read
the essays". The third paragraph — "Essays and a curriculum on corporate finance,
accounting, and the economics of the green transition. By Dika Gustiana." — is deleted.
The hero stops after "…and the probability of the future."

**The consequence is deliberate and is the point, not a side effect.** That paragraph was
the only place the owner's name appeared in the hero. After this change the name appears in
**one** rendered place on the site: the footer contact line, next to the LinkedIn link and
the email address. That is the standing rule — the name appears where LinkedIn or email is
attached — and it is the same rule that removed the standalone name heading from the footer
in an earlier session. This is that rule reaching the hero.

*[AMENDED 2026-08-03 — the rule above is superseded in one respect, by owner decision:
essay-row BYLINES are exempt. `Coming soon · Dika Gustiana` renders on every unwritten
essay row and `Published · Dika Gustiana · …` on published ones (~161 occurrences).
Authorship attribution is not the self-promotion this rule removed; the hero stays
byline-free. Full statement in the 2026-08-03 structure-visibility entry. Do not delete
essay-row bylines as a violation of this entry.]*

`mb-12` moved from the deleted paragraph up onto the surviving one, so the CTA keeps its
spacing rather than collapsing to the `mb-6` the second paragraph carried.

**What this costs, recorded so the trade is visible rather than discovered later.** The
deleted sentence was also the hero's only statement of *scope* — the only place above the
fold that named what the site is about. A reader now learns the subject matter from the
Sections grid below, not from the hero. The design audit had separately flagged that
sentence as understating the corpus (it named three subjects while the site ships six
sections, omitting development finance). Deleting it resolves that finding by removing the
claim rather than correcting it. If a scope line is ever wanted back, it belongs **without**
a byline.

**Name occurrences that remain in `src/` after this change, and why each stays.** The gate
asked for the footer contact line only; that is true of *rendered body copy*, and these are
the rest, none of which is a hero byline:

| Location | Kind | Disposition |
|---|---|---|
| `Footer.tsx:24` | rendered contact line, beside LinkedIn | **the one intended occurrence** |
| `SEO.tsx:18` `SITE_NAME` | `<meta>` / `og:site_name` / JSON-LD `publisher` | **kept** — machine-readable identity |
| `SEO.tsx:26`, `Index.tsx:77` | default meta description | **kept** — the search snippet |
| `ArticleShell.tsx:154`, `LongformArticleShell.tsx:115`, `CriticalThinkingEssay.tsx:91` | `author=` fallback into JSON-LD | **kept** — article authorship |
| `ArticleHeader.tsx:62` | rendered essay byline | **kept** — an essay states its author |
| `CapitalConditionCard.tsx:27` | rendered card byline | **kept**, but see below |
| `WriterEditor.tsx:69` `DEFAULT_AUTHOR` | admin default for new essays | **kept** — never public |
| `Auth.tsx:46`, `FinanceTrackIndex.tsx:81` | `noindex` page description; a code comment | **kept** — neither is public body copy |

Stripping the name from meta descriptions, `og:site_name` or article JSON-LD would be
actively harmful for a site whose whole job is being found and attributed by people
assessing the author — so the rule is read as governing **rendered body copy**, not
structured metadata or per-essay authorship. If it is meant to be absolute, the two rendered
bylines (`ArticleHeader.tsx:62` and `CapitalConditionCard.tsx:27`) are the ones to revisit,
and that is a separate decision from this one.

---

# 2026-08-02 — The site accent is navy, and green now has exactly two jobs

## The accent is `hsl(215 60% 32%)` — navy, not emerald

The brand accent was `--accent: 142 71% 45%`, a saturated emerald. It failed WCAG AA in
three separate roles simultaneously, and the repo already knew: the comment at
`src/index.css:112-114` recorded the 2.12:1 figure and a second token, `--accent-text` at
L28, was created as the remedy. That remedy was applied to **one** call site. Links, card
title hovers, section icons and list bullets kept shipping at 2.12:1, and
`group-hover:text-accent` made text *harder* to read on hover than at rest.

A brand colour that cannot be used at brand strength is not a brand colour. So the fix is
the value, not a fourth patch on top of three.

**Measured, in Chromium, from the rendered CSS variables** (not computed by hand — the
script read `getComputedStyle` and applied the WCAG 2.x sRGB formula):

| Role | Threshold | Emerald `142 71% 45%` | Navy `215 60% 32%` |
|---|---|---|---|
| as text on `--card` | 4.5:1 | 2.12:1 **FAIL** | **8.22:1 PASS** |
| as text on `--background` | 4.5:1 | 2.20:1 **FAIL** | **8.58:1 PASS** |
| as `--ring` on `--background` | 3.0:1 | 2.20:1 **FAIL** | **8.58:1 PASS** |
| `--accent-foreground` on it | 4.5:1 | 2.30:1 **FAIL** | **8.95:1 PASS** |

Navy renders as `rgb(33,73,131)`. Two reasons for this hue rather than another:

1. **It shares the 215 hue family with `--primary` (215 28% 17%) and `--foreground`
   (215 25% 17%)**, so it reads as the same system tightening rather than a second brand
   arriving. `FinanceLanding.tsx` — the page the rest should converge on — already uses
   `text-primary` for exactly this job, so this is that page's decision generalised.
2. **It is institutional rather than eco-startup.** The readers are scholarship panels and
   finance/infrastructure contacts. Emerald is the universal success/growth/eco hue; on a
   corporate-finance site it read as a template default.

**Rejected: promoting `--primary` (215 28% 17%) directly to accent.** It measures ~14:1, so
contrast was never the objection. The problem is that `--primary` is within a hair of
`--foreground`, so links would have become indistinguishable from body text and the accent
would have stopped doing the one job an accent has. Navy keeps ~1.6:1 of separation from
body ink while staying in the same family.

`--accent-text` is now redundant by value and is kept as an alias of `--accent` so existing
`text-accent-text` call sites keep working. Collapsing the two is a later, mechanical pass.

## `ghost` and `outline` buttons no longer use `--accent` as their hover surface

This was the same root cause wearing a different hat. Stock shadcn gives `ghost` and
`outline` `hover:bg-accent`, and in stock shadcn `--accent` is a **light neutral hover
surface**. This project repurposed the token as a saturated brand colour but left the
variants pointing at it, so ~80 ghost and outline buttons flooded with brand on hover.

Repointing them at navy would have been just as wrong — a ghost button should not become a
solid dark block. They now use `--secondary` (200 30% 94%), which is this project's actual
light neutral; `--secondary-foreground` on it measures 11.58:1.

## Green is reserved. Two jobs, nothing else

Green is **not** retired from the product, only from the accent role. It is now
`--section-green: 142 71% 45%` and it means exactly two things:

1. **The Green Transition section's own identity** — currently the concept icons and the
   callout on `/green-transition/climate-finance`.
2. **Success states** — `SectionIntro.tsx:142`.

It is never a link, a focus ring, a button, or a generic hover. Anything else that wants to
be green should be navy or `--muted-foreground` instead.

## Two dark-header call sites had to move off the accent entirely

A consequence worth recording because it is not obvious: navy on the dark slate header
(`--header-bg: 215 28% 17%`) measures **1.64:1** — worse than the emerald it replaced,
which measured 6.37:1 there. Both affected sites are admin-only, but leaving them would
have been a knowingly-introduced regression:

- `MainNav.tsx` Writer's Studio link — dropped the tint; `.nav-link` is white/80 at 9.89:1
  on the header, and `.nav-link-active` already marks the active state.
- `Logo.tsx` Admin badge — inverted to `bg-primary-foreground text-primary` (light chip,
  dark type), which stays legible on the header regardless of what the accent is.

**The general rule this establishes: the accent is a light-surface colour.** On the dark
header, use the white/slate pair, not the accent.

## The six-hue section rainbow is gone

`Index.tsx` gave each of the six section cards its own hue (blue-500, purple-500, the
emerald, amber-500, green-500, sky-500) — including two greens two cards apart and two
near-identical blues — and `About.tsx` repeated the same map for essay labels. Both arrays
are deleted. Section icons render in `text-muted-foreground` and pick up the accent on
hover alongside their title; About's section labels are all `text-muted-foreground`.

Distinctness between sections comes from order and typography, not hue.

**Correction to the brief this session worked from:** it stated the raw-palette pollution
was "concentrated in those two arrays, not scattered". It is not. The two arrays were 10 of
112 occurrences; the remaining 102 are spread across 22 files, the largest being
`CapitalConditionDetail.tsx` (22) and `SectionIntro.tsx` (12, a second independent
"voice role" colour axis that tints a full-width band under the header on public section
pages). Both are out of this session's scope and neither was touched. The brief was right
that `DevelopmentFinance.tsx` carries four.

---

# 2026-08-02 — Opening the editorial taxonomy: next-big-thing

## Category slugs: `<section-slug>-<name>`, because one row and one function already agreed

The five categories are `next-big-thing-technology`, `next-big-thing-economy`,
`next-big-thing-society`, `next-big-thing-environment`, `next-big-thing-governance`
(Technology · Economy · Society · Environment · Governance, sort order = navigation
order). The convention was read, not invented: the single existing row is
`finance-general` under `finance`, and `derivePhase()` in
`src/domains/writing/schema/placement.ts` — with tests — already strips
`"<sectionSlug>-"` from a category slug to produce the phase/theme. So the slug scheme,
the derivation function and the reading side's filter values (`essays.phase` =
`technology` …) are one convention, not three. A section wanting differently-shaped
category slugs would break `derivePhase`'s assumption and should change the function
and its tests in the same commit.

## The modal is ONE placement control that switches on the section

Chosen over two separate flows. The section is fixed before the modal ever opens — the
writer entered through `/admin/writer/:section/...` — so the modal renders exactly one
placement block: finance → track/module/order/lesson-type (untouched), accounting →
FSLI line item (untouched), editorial → category. The writer makes one choice and
`WriterEditor` derives the dependent columns the same way it already derived finance's
(`phase` from the category via `derivePhase`, mirroring `phase`/`topic` from the
module). The modal's URL line renders through `essayUrl` itself (with `…` as the slug),
so the preview can never disagree with the canonical builder. The writer never learns
which taxonomy tree they are in — which was the point.

Guard worth naming: `essays.category_id` defaults to `finance-general` at the DB, so a
loaded editorial essay can carry a category from another section. Once a section has
its own categories, that catch-all no longer satisfies "Category is required"
(`categoryBelongsToSection` in WriterEditor) and is deliberately not offered in the
list — otherwise the default would quietly publish essays the section page files
nowhere.

## The editorial canonical URL is three segments: /the-next-big-thing/:theme/:slug

The finance decision (Section 2, six-areas session) put the STABLE placement axis in
the address and kept the volatile one out: `/finance/:track/:slug`. The editorial
equivalent fell out of the route table itself: green-transition, development-finance
and critical-thinking essays already live at `/section/:phase/:slug` — next-big-thing
was the one placed section whose essay URL dropped its axis. Its five themes mirror the
navigation and are as stable as finance's tracks. So: theme (= category slug minus
section prefix, cached as `essays.phase`) is the middle segment;
`/the-next-big-thing/:slug` stays as a resolver that redirects to canonical when a
theme exists and renders directly when none does (no NBT essay existed before today, so
there are no old links to break — but the deployed bundle mints two-segment links until
the next deploy, and they heal). What was finance-shaped about the builder, recorded as
a finding: `EssayUrlInput` had fields for finance and accounting placement but no way
to even RECEIVE an editorial one, and both URL builders (`essayUrl` and placement.ts's
`buildCanonicalUrl` — still two, still kept in lockstep by tests) flattened NBT to two
segments.

## The placement trigger gained the editorial direction; the catch-all hole stays open, named

`validate_essay_placement` now also refuses an essay whose category belongs to a
NON-finance section when `essays.section` disagrees (23514, verified live both
directions). The reverse hole — a non-finance essay holding `finance-general` — is
still legal, deliberately: accounting, books, ielts and tools have no categories of
their own, and while `category_id` is NOT NULL with that default, the catch-all is
their only legal value (the original migration's design note tolerates exactly this).
The hole closes per-section: each section that opens gets its own categories, at which
point its essays stop being satisfiable by the catch-all (the UI already refuses; the
trigger can tighten fully once every section has categories).

## The landing's quick-add dialog is deleted, not fixed

`EssayDialog` on the NBT landing inserted essays with `phase` but no `category_id` —
the DB default filed them under finance-general, dodging the taxonomy this session
exists to open, with no validation, no revisions and no `content_json`. The same
one-authoring-surface rule that retired the FSLI inline editor applies: deleted (with
the never-imported `EssayModule`), and the admin button now links to
`/admin/writer/next-big-thing/new`.

## The ?theme= tabs now actually filter

The section subnav's five tabs linked to `?theme=<topic>` and nothing read the
parameter — dead navigation, the exact class the 65-route sweep missed because it never
clicked the nav. The feed's topic filter state now IS the URL parameter (single source
of truth, shareable filtered views); the dropdown writes it with `replace` so the back
button is not spammed. Verified by clicking the tabs anonymously, not by opening URLs.

---

---

---

---

# 2026-08-02 — Audit triage: what was deliberately not done, and why

## Archive, not soft-delete-with-a-new-column
`essays.status` already contains `archived`; the delete flow uses it instead of a new
`deleted_at` column. No schema change to `essays`, no RLS churn, the admin UI already
rendered the badge — the smallest change that makes deletion reversible. The FK to
`essay_revisions` is `ON DELETE RESTRICT`, so even a deliberate SQL purge must delete the
history explicitly first.

## The publication-state trigger, despite the last trigger disaster
`validate_essay_tone_fields` died referencing columns another migration dropped.
`sync_essays_publication` references only `status` and `published` on its own NEW/OLD row
— it cannot outlive its columns without failing the very migration that drops them. A DB
trigger (not a client fix alone) because the divergence had two live writers and PostgREST
is open to any future one; the guard has to sit below all of them.

## `capital-allocation` stays out of the nav
It is a real `finance_sections` row but has 0 modules and 0 essays. A nav item pointing at
an empty track index advertises nothing. Add it back the day it has content —
`tests/unit/navConfig.test.ts` documents the deliberate absence.

## Findings not acted on this session, with reasons
- **#3 client-side audit log** — with one admin, the log audits the auditor; and the
  destructive action it existed to catch (hard delete) no longer exists in the UI. The
  real fix — server-side trigger logging — becomes worth it the day a second admin
  exists. Accepted for now.
- **#13 CSP report-only with no endpoint** — a header reporting to nowhere is decoration,
  but *enforcing* a CSP on this SPA untested risks breaking the site for no live attacker
  model (one author, no user-generated content from non-admins). Deferred as a scoped
  task: enforce with a tested policy, or remove the noise.
- **#16/#17/#18 (FSLI publish flow, text-typed financials, model versioning)** — verified
  again this session: `finance_models` 0 rows, `fsli_sections` 0 rows, and no insert path
  exists (`ModelAdminPanel` unreachable by construction). Governance for unwritable
  tables is premature. These resurface the day an insert path is built — and #17's
  parseFloat(...)||0 must be fixed BEFORE data entry starts, not after.
- **No framework migration** — agree with the owner. Two published essays do not justify
  a rewrite; the proportionate SEO items (sitemap, robots, absolute OG, honest 404
  signalling) are ranked and waiting (#14, not reached this session).
- **Dependency vulnerabilities** — measured: 11 total (2 critical, 3 high), **5 in
  production dependencies** (2 high). `npm audit fix` without `--force` does not clear
  them; the rest are major-version bumps (vite 5→6 class). Deliberately not churned at
  the end of a session that touched save paths; scoped upgrade next session, with CI now
  in place to catch fallout.
- **#12 unsafe URLs, #14 proportionate SEO, #9 canonical redirects, #10 cache-on-logout,
  #11 role race, hero-texture compression** — not reached; ranked and estimated in
  docs/AUDIT_TRIAGE.md so the next session starts from the list, not from scratch.

# 2026-08-02 — Branch naming, the table of contents, and the embed

## Branches are named for the work they contain, and a merged name is never reused

The writing-surface refactor landed on a branch called
`claude/dikagustiana-sections-5-7-q0jja0` — the name of a branch from two rounds
earlier that had already been merged, describing "sections 5–7" of a mandate the
work had nothing to do with. Anyone reading the history has to open the diff to
find out what the branch was for, and the reused name makes two distinct pieces
of work look like one.

This is the third time a name has outlived its meaning here, after
`RUNBOOK_phase2.md` and the reuse of `phase-2-w564rz`. Names cannot be changed
retroactively once merged, so this is a convention, not a repair:

1. **A branch is named for the work it contains**, not for the mandate section,
   sprint, or session that produced it. `docs/design-handoff-and-byline-verification`,
   not `claude/sections-5-7`.
2. **A merged branch's name is never reused.** A merged pull request is finished;
   a second branch wearing its name makes the history ambiguous and can make new
   commits look like they belong to a closed review.
3. The same applies to documents. A file called `RUNBOOK_phase2.md` outlives
   "phase 2" and then misleads. Name it for what it is about.

## The reader keeps its table of contents

The specification has none, and the sidebar stays anyway. **Owner-decided, with
the reasoning on record so it is not relitigated:**

- The reference's posts run 800–1,500 words with few headings, where a table of
  contents is overhead. These are 3,000-word curriculum lessons: `fa-07-01` alone
  carries **13 headings** across 81 blocks. At that length the reader is
  navigating, not just reading, and a list of sections is the difference between
  finding the driver-tree worked example and scrolling for it.
- The sidebar is already gate-verified — it tracks to the final heading, is
  inline-collapsible below `lg`, and honours `prefers-reduced-motion`.
- Matching the reference on the surface is not worth discarding verified work.
  The specification is a description of the target, not a list of things to
  remove.

## Embed stays an anchor card, never an iframe (metadata server-resolved since 2026-09-27)

**Updated in place, 2026-09-27.** The card's metadata is no longer typed only by hand.
The owner asked, and the edge function this entry priced in reason 3 now exists,
metadata-only. See "Link previews: server-resolved, metadata only" (2026-09-27, at the
top of this file). What this entry decided about the *iframe* still stands unchanged.
The card is an anchor plus text, and the sanitizer was not widened.

1. **Still the rule: widening the sanitizer is the one change whose mistake becomes a
   vulnerability rather than a broken block.** `sanitizeHtml` forbids `iframe`
   (`FORBID_TAGS`). Allowing arbitrary iframes on this domain is a
   clickjacking and phishing surface — an attacker with any content-write path
   gets a same-origin frame to overlay or impersonate with. Every other block in
   this menu fails safe; this one would fail open. The 2026-09-27 work returns
   plain text only, so this reason was never tested, let alone overturned.
2. ~~There is no demand for it.~~ **Superseded 2026-09-27.** The Growth theme is
   curation: entries built around someone else's post, where whose post it is IS the
   substance. That is demand for attribution metadata (author, source, date). It is
   still not demand for embedded video or iframes.
3. **The cost was a server, not a component, and it has been paid.** The browser
   cannot read another origin's `<meta>` tags. `supabase/functions/link-preview`
   fetches under an SSRF policy, parses, and returns text, at authoring time only.
   Caching is the stored card itself, and rate-limiting is the admin-only gate.

**The door, now half-taken:** metadata was taken, narrowly. Any *embed* is still
the separate work described here, an edge function plus a *narrow* allowlist (specific
hosts, `sandbox` attribute, no `allow-top-navigation`), not a general `iframe` permit.
Ask for it as scoped work; do not widen `FORBID_TAGS`.

# 2026-08-01 — Writing-surface session: what the insert menu offers, and why

## The insert menu ships five items, and only five

The owner's specification lists eight (Image, Video, Audio, Embed/link preview,
Poll, Button, Divider, Paywall). Each was resolved on its own terms rather than
ported.

- **Image — kept, named for what the writer wants.** There is exactly one
  image-ish node in the schema, `figure`. "Image" and "Figure" are the same
  thing; shipping both would be two names for one node. The item is called
  **Image**, because that is the word in the writer's head, and it opens the
  figure uploader — an image plus an optional caption is the whole feature.
- **Divider — kept.** Trivial, already in the schema, in the specification.
- **Table — kept.** An insertion, not a reformat, so this menu is where it
  belongs. It was built and gate-verified last round.
- **Code block — kept, and this was a genuine call.** The specification's option
  set is deliberately small and a code block is not in it. But the curriculum is
  financial analysis: driver equations, model formulas, SQL against a ledger.
  Those want a monospaced block that will not be reflowed or smart-quoted, and
  the alternative — pasting them as ordinary paragraphs — loses that silently.
  It is an insertion, the node already exists in the schema, and it costs one
  row. Kept.
- **Embed / link preview — built as the client-side card.** *Updated in place
  2026-09-27: the owner took the decision this bullet asked for. Real metadata is
  now server-resolved at authoring time and metadata-only, with no iframe, as the
  recommendation below pointed. See "Link previews: server-resolved, metadata only"
  at the top of this file. The iframe version remains unbuilt, for the reasons
  given here.* `sanitizeHtml` forbids
  `iframe` outright (`FORBID_TAGS: ['script','style','iframe','object','embed','form']`).
  So the version people usually mean by "embed" — a YouTube or Twitter iframe —
  would render perfectly in the editor and be stripped on publish: the exact
  silent-vanish failure this project keeps hitting. What shipped is a card built
  from the URL alone: hostname, title, optional description, linking out. It
  fetches nothing and embeds nothing, and every tag and attribute it emits is
  already in the sanitizer allowlist, so it survives publish unchanged —
  measured anonymously on a published page.
  **The fork, stated rather than picked silently:** real oEmbed / Open Graph
  metadata needs a server round trip, because the browser cannot read another
  origin's `<meta>` tags. That is a new Supabase edge function (fetch, parse,
  cache, rate-limit, and handle the sites that block bots), plus a widened
  sanitizer allowlist if the result is ever to be an iframe. Two changes, one of
  them security-relevant. **Recommendation: leave it as the card.** For
  curriculum essays citing BIS, IMF and textbook sources, a clean labelled link
  is what a reader wants; an embedded tweet is not. If the owner wants true
  embeds, that is a scoped piece of work to ask for, not to assume.
- **Button — dropped.** In the reference it is a subscribe call-to-action. There
  are no subscriptions, no email list and no paid tier here, so the honest answer
  to "what would it do on this site?" is *link somewhere* — which is what a link
  already does, with less ceremony. Shipping a button that goes nowhere is worse
  than not shipping one.
- **Audio and Video — dropped.** The owner declined audio earlier. Neither is
  trivial: both need an upload path with size limits, a poster frame, a player
  with accessible controls, and `<video>`/`<audio>` added to the sanitizer
  allowlist — that is place four of the contract, where blocks vanish. Neither
  is in the curriculum's way today. Noted here, not built.
- **Poll and Paywall — not built, as instructed.** No polling infrastructure, no
  paid tier. Paywall in particular is the most Substack-specific element in the
  reference and the least relevant here.

## Escape once, at the layer that needs it

`figure` and `linkCard` both stored a JSON blob in a `data-*` attribute, and both
pre-escaped it (`JSON.stringify(attrs).replace(/"/g, '&quot;')`) before handing
it to `renderHTML` — which builds real DOM, which escapes attribute values
itself. Escaped twice on the way out, so `JSON.parse` threw on the way back in,
and every attribute fell back to its default: **a figure reloaded with `src=""`**.
Nothing errored.

The rule is now in one place, `src/lib/tiptap/attrJson.ts`: raw for `renderHTML`
(the DOM escapes it), escaped for the string-building serializer (nothing else
will), and a read that tries the raw form first and falls back to the legacy
doubly-escaped form, so rows already written still open.

## A node whose HTML does not round-trip corrupts the row silently

`EssayEditor` mirrors the document into React state as HTML and pushes external
changes back in with `setContent`. If a node's `renderHTML` output does not
survive being parsed and re-serialised byte-for-byte, that mirror never settles:
the editor re-parses its own output, `content` advances, `content_json` freezes,
and the row ends up holding two documents that disagree. `linkCard` did exactly
this — its `<a>` was claimed by StarterKit's Link mark on re-parse, because
ProseMirror gathers every mark rule before any node rule.

Two fixes and a guard: `priority: 100` on the card's parse rule; the HTML mirror
now ignores its own echo instead of re-parsing it; and
`tests/unit/editorHtmlRoundTrip.test.ts` asserts round-trip stability for every
block the insert menu can produce. Treat round-trip stability as the fifth place
of the content contract.

## Autosave says "Saved" only when it is true

Owner-decided and now implemented: an essay that has never been published
autosaves into the `essays` row itself, so `Draft · Saved` is literally true and
a crashed tab loses nothing — there is no published page to damage. An essay that
is already live writes a revision only, and the chip says **`Published · Backed
up HH:MM`**. It never says "Saved" for content that lives only in
`essay_revisions`. A failed write is loud: `Save failed` / `Backup failed` in
destructive colour with the error as its tooltip.

## The gutter `+` lives in the gutter

It was positioned at `left-0` of the editor container, which is the text's left
edge — so it sat on top of the first ~28px of the current line and swallowed
clicks meant for the text. The canvas now reserves 2.5rem of left padding at
every width (4rem from `sm:`), and the button pulls into it at `-left-8`. An
asymmetric margin on a phone is a smaller cost than a button the writer has to
click around.

## Open question for the owner: the table of contents

The reader specification has no table of contents. A sticky ToC sidebar was built
and gate-verified last session at the owner's request. These are 3,000-word
curriculum pieces rather than newsletter posts, so it probably still earns its
place — **it has been kept, and this is the ask**: keep it, or drop it to match
the specification exactly?

# 2026-08-01 — Fable session: reconcile + titles + defect verdicts

## The orphaned tone-fields trigger is dropped, not repaired
- **What it did today:** both branches of `validate_essay_tone_fields` referenced the four
  dropped `*_fields` columns, so since the column drop every INSERT/UPDATE on `essays`
  failed with `42703` before any row was touched. Before the drop, its draft branch was
  also silently rewriting `status` to `tone_pending` (observed during GATE 5).
- **Why drop rather than repair:** the persona system it validated is deleted; the live
  publish gate is `WriterValidation.canPublish` plus the `presentation` payload. A trigger
  that rewrites publication status is exactly the kind of magic that should not survive
  the system it belonged to. `voice_validated_at` (its only output column) stays, inert,
  for a later staged cleanup.
- **Applied:** migration `drop_orphaned_tone_fields_trigger`; verified by re-running the
  failing statement and by a real in-app Save Draft.

## Mismatched placement URLs redirect to canonical, they do not 404
- `/finance/<wrong-track>/<wrong-module>/<real-slug>` now redirects to the essay's one
  canonical URL (from its joined module), and a fabricated four-segment URL for an
  unplaced essay redirects to `/essays/:slug`.
- **Why redirect:** the slug names a real essay; the reader is at a wrong address, not a
  wrong destination. `/essays/:slug` already heals to canonical the same way, and a 404
  here would punish stale links that used to work. A *wrong slug* still 404s (GATE 1f).

## Draft titles route admins into the editor; published titles route everyone to the page
- On curriculum indexes, an admin clicking a draft stub lands in the editor (the public
  view of an empty essay is not worth landing on); published titles go to the reading
  experience for everyone. A pencil affordance sits beside every row for admins, always a
  sibling of the row's link — nested anchors are invalid HTML.

## `books_uploads` gets its insert path; `finance_models` deliberately does not (yet)
- **Books: built.** `useUploadBook` + an admin-only upload card on `/books/:category`.
  RLS already made storage and table writes admin-only; the UI was the only missing piece.
  Observed end-to-end and cleaned up.
- **Models: written decision.** The 11 institutional models are the owner's framework
  content (curriculum Section 06), and this session's mandate explicitly excludes
  Sections 05/06 data. The surfaces stay: read, render, empty-state and edit paths all
  work, and `ModelAdminPanel` becomes reachable the moment rows exist — via a future
  seed migration from the framework, which is the owner's call. Recorded here precisely
  so no third session rediscovers the gap.

## Site-wide smooth scrolling is gated behind `prefers-reduced-motion: no-preference`
- `index.css` set `scroll-behavior: smooth` on `html` unconditionally. Per spec,
  `scrollIntoView({ behavior: 'auto' })` defers to that CSS property — so every "instant"
  jump in the app was silently re-animated, including the ToC's reduced-motion branch.
  The CSS is now media-gated and the ToC uses `'instant'` explicitly. Observed: a
  10,433px jump completes within 120ms under emulated reduce.

## `/admin/writer/:id` stays as a redirect (ROUTE CHANGES REQUESTED, disposition)
- Deleting it was requested last round when `App.tsx` belonged to another session. Kept
  instead: the `WriterStudio` redirect keeps `/admin/writer/new` (used by AdminDashboard)
  and old bookmarks resolving, costs ~70 lines, and adds no authoring surface. The other
  two requests: no Section 7 route removals (reaffirmed), breadcrumb `flex-wrap` (already
  fixed by the parallel session, verified at 375px).

---

# 2026-08-01 — Section 5: the writing experience (Session B)

## The upload placeholder is a decoration, not a node
- **Decision:** the "Uploading image…" block shown while a pasted image uploads is a
  ProseMirror *widget decoration*, held in plugin state, not a node in the document.
- **Why:** the gate requires that a rejected upload leave no dead placeholder. A
  placeholder node would be part of the document, which means it can be serialized by
  `getHTML()`, stored by autosave into `essay_revisions`, and recovered days later as a
  permanent artefact of an upload that failed. Cleaning it up correctly on every failure
  path — network error, RLS refusal, oversized file, the author deleting the surrounding
  paragraph mid-flight — is a discipline you can forget. A decoration cannot be
  serialized, cannot be saved, and disappears with the plugin state.
- **Rejected:** an atom node with a `pending` attribute, filtered out at save time. That
  puts the correctness burden on every future writer of a save path.
- **Consequence:** if the anchor position is gone when the upload lands (the author
  deleted that part of the text), the image is dropped rather than inserted at a guessed
  position. Losing an upload the author can retry beats silently putting a picture
  somewhere they did not ask for.

## Pasted image files become `figure` nodes, not `image` nodes
- **Decision:** two node types coexist. A pasted or dropped image *file* is uploaded and
  inserted as a `figure`; a bare `<img>` (pasted markup, or legacy HTML in `essays.content`)
  is parsed as an `image`.
- **Why:** `figure` is the editorial primitive that already carries alt text, caption,
  source attribution and width mode, and already round-trips through all four places of
  the content contract. Routing uploads into it reuses a proven path. But `image` still has
  to exist, because without it a bare `<img>` matches no node and ProseMirror discards it —
  which is also why a legacy body containing `<img>` rendered as nothing.
- **Rejected:** one node for both. Collapsing them would either strip captions from
  uploads or fabricate empty figure furniture around every incidental image.

## `Link` is configured inside StarterKit rather than beside it
- **Decision:** `StarterKit.configure({ link: {...} })`, and `@tiptap/extension-link` is
  no longer a direct dependency.
- **Why:** StarterKit v3 bundles it. Registering a standalone copy alongside produced the
  duplicate-extension warning and two competing definitions of the same mark. Verified by
  reading the installed StarterKit's dependency list, not by assuming.
- Five further `@tiptap/extension-*` packages were declared in `package.json` and imported
  nowhere; removed.

## `WriterStudio` becomes a redirect rather than a deletion
- **Decision:** Stack B is retired by replacing `WriterStudio` with a component that
  resolves the old `/admin/writer/:id` URL and forwards to `/admin/writer/:section/:slug`.
- **Why:** the gate requires exactly one route that *authors* essays. Deleting the route
  outright means editing `src/App.tsx`, which Session A owns and whose Gate 4 is not
  terminal. A redirect satisfies the gate inside Session B's own surface, and keeps
  bookmarks and the dashboard's "New Essay" link working. The route can be deleted later
  with no further code change.

## Preview renders through `ArticleBody`
- **Decision:** `WriterPreview` no longer builds its own HTML; it renders the same
  component the published page renders.
- **Why:** two renderers means two lists of understood block types, so a block appearing
  in the preview was never evidence it would appear when published — the same class of
  failure as the homepage card that 404'd. One path, or the preview is decoration.

---

# 2026-08-01 — Section 7: the never-checked groups (Session B)

## `.single()` is the wrong call for a lookup that can legitimately miss
- **Decision:** `useFsliPage`, `useBook` and `useFinanceModelBySlug` use `maybeSingle()`.
- **Why:** PostgREST answers `single()` with HTTP **406** when no row matches. The pages
  swallowed it, so an unknown slug produced a thin shell and a red line in the console
  instead of a "not found" page. `maybeSingle()` makes "no such row" ordinary data.

## A miss renders `NotFound`, it does not redirect
- **Decision:** `FsliDetail` and `FinanceModelDetail` render `<NotFound />` instead of
  `<Navigate to={index} replace />`.
- **Why:** consistency with the correction GATE 1f already made to the four essay pages.
  A slug that matches nothing means the URL is wrong; moving the reader to an index they
  did not ask for hides that and makes a typo indistinguishable from a working link.

## Counts come from the table, or the page says it is empty
- **Decision:** `BooksCategories` counts real `books_uploads` rows; with none, it shows an
  empty state instead of four category cards.
- **Why:** it previously advertised 12, 8, 15 and 10 books against a table with zero rows —
  45 books that do not exist, each card leading to an empty list. Hardcoded counts are a
  claim about data, and this one was false.
- **Kept hardcoded:** the four category *titles*. Those are editorial taxonomy, not
  measurements, and deriving them from an empty table would leave nothing to browse once
  books exist.

---

# 2026-07-31 — Greenfield Supabase rebuild

The old Supabase project (`rhwzvgklasvitocbbhvi`) is gone; the frontend stays; the
database is rebuilt fresh. Decisions below, newest first within this section.

## Old project is deleted, not paused — no legacy dump possible
- **Observation:** The account lists 3 projects: `ascbthsgborseynmmthm` (dikagustiana-prod,
  ACTIVE — a different app, the personal-OS schema, untouched by this rebuild),
  `fqayxopcfxlkuftglqbl` (Sep 2025, paused) and `llqehykfmbgjnbwbijfs` (Nov 2025, paused).
  `rhwzvgklasvitocbbhvi` is absent — deleted, unrecoverable via restore.
- **Evidence the paused projects never hosted the site:** across the entire archived git
  history (Lovable scaffold 2025-12-23 → PR #34 merge 2026-07-26), the only Supabase ref
  ever present in `supabase/config.toml`, `client.ts`, or any file is `rhwzvgklasvitocbbhvi`.
- **Consequence:** `docs/db/legacy-dump.sql` cannot exist. All CMS content authored after
  the last content-bearing migration (2026-07-04) is lost. What survives is what the 43
  migrations seed.
- **Production was already dark:** the deployed JS bundle on www.dikagustiana.com contains
  no Supabase URL at all (env vars were unset at its build time), so the live site has been
  throwing at boot independent of the DB deletion.

## Free-project slot blocker — user authorized deleting the two paused 2025 projects
- Creating (or restoring) any project fails: the account owner is at the free plan's
  2-active-free-project limit. The Supabase MCP has no `delete_project` tool, so the
  deletion the owner approved (both paused 2025 projects) must be done in the dashboard.
  Creation is retried automatically until a slot frees up.

## Reseed strategy: reconstruct, never invent
- **Decision:** Reseed the 8 sections, 24 fsli_pages, 4 finance_sections, 2 finance_settings,
  49 finance_modules and 105 essay draft stubs; resolve every foreign key by subquery rather
  than by literal UUID; leave a column NULL where the archive holds no value.
- **Why the essay stubs are recoverable at all:** the three seed migrations hardcode
  `module_id` UUIDs for modules that no migration ever creates (they existed only in
  production), so a verbatim replay fails the foreign key. But each file groups its essays
  under a `-- Module NN:` comment and the slug prefix encodes the mapping (`sf-07-03` =
  strategic-finance module 07, essay 03), so the 29 missing modules and the whole
  105-essay outline are deterministically reconstructible.
- **Rejected:** replaying the three INSERTs verbatim (FK failure); dropping the stubs
  (throws away the curriculum plan of record); inventing theses for the 11 modules with no
  authored source (would put words in the owner's mouth).

## No `docs/db/legacy-dump.sql`, and `import.sql` is not the baseline
- **Decision:** author the baseline from scratch rather than from `docs/db/import.sql`.
- **Evidence:** `import.sql` concatenates only the first 38 of 43 migrations (last header
  `20260310000954`). It omits the security hardening, `admin_audit_log`, `council_sessions`,
  and **both** P0 auth-gating repairs — so it reproduces the *broken* state of both
  historical failures and ships without two tables the app queries.
  `docs/DB_READINESS.md` still says "38 migrations", confirming both docs predate the last
  five migrations. Its own header also recommends `supabase db push`, which is prohibited here.

## RLS: inline the role check instead of calling `has_role()`
- **Decision:** every policy uses `EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id =
  (SELECT auth.uid()) AND ur.role = 'admin')`. `has_role()` is still created (types.ts
  declares it) but no policy depends on it.
- **Rationale:** the P0 outage happened because `EXECUTE` on `has_role()` was revoked from
  `anon`/`authenticated` while dozens of policies called it — Postgres requires the *calling*
  role to hold EXECUTE on a function used in a policy expression. A policy that reads
  `user_roles` directly cannot be broken by a future grant change. The `essays` anon SELECT
  policy is `published = true` and references no function at all.

## Restore `src/` from the tracked zip — nothing to arbitrate on configs
- `src/` (284 files), `tests/` (30), and `public/_redirects`, `placeholder.svg`,
  `robots.txt` existed only inside `dika-s-digital-studio.zip`. Every root config file in
  the zip is byte-identical to the tracked copy, so the upload at `e9bf047` was simply
  incomplete — no conflicting versions existed to choose between.
- Verified after restore: `tsc --noEmit` passes; `vite build` succeeds.

## Package manager: npm, single lockfile
- The production bundle (`/assets/index-tLuHZmHp.js`) is byte-identical to a local
  `npm ci` + `vite build` from `package-lock.json` — production was provably built with
  the npm dependency tree. `bun.lock`/`bun.lockb` removed; `typecheck` script added.

## Zips untracked after extraction; history preserved as a branch
- `dika-s-digital-studio.zip` untracked (recoverable at `02c4c36`). Its embedded git
  history (template → PR #34, ~40 working branches) pushed to
  `archive/pre-rebuild-history` so 7 months of provenance survives outside a binary blob.
  Only the main line was pushed; the 39 stale work branches add noise, not information.
- `tmp/Attach_feature.zip` untracked: it is a Figma Make export of an "Attach feature"
  design prototype (MUI scaffold, 66 files) — a design artifact, not site code.
- `*.zip` is now gitignored.

## Branch & coordination
- **Work on `claude/keen-galileo-occyc8`, based on the merged PR #30** (which already inherited the
  editor/test work from `claude/quirky-albattani-wlphbf`). We do **not** push to or edit
  `claude/quirky-albattani-wlphbf` / PR #30 — a concurrent session owns those and the live DB
  migration. Two PRs must be merged **in order: migration first, then this upgrade.**
- **Never touch the live database.** No `db push`, `functions deploy`, `seed`, or destructive CRUD.
  All verification is at the mock/static level (Vitest + mocked Playwright). Live verification is
  queued in UPGRADE_REPORT.
- **Schema changes go into NEW migrations** with a later timestamp, are **not applied**, and are
  flagged for manual reconciliation. We do **not** edit existing migration files.

## Writer Studio: dead `tags` / `meta_description` fields
- **Decision:** Remove the non-functional `tags` and `meta_description` inputs from the editor.
- **Rationale:** Neither column exists on `essays`; the fields silently discarded input — a
  data-integrity/UX defect. Removing them makes the surface honest.
- **Rejected:** (a) Wiring them to the save payload — would make `insert/update` fail at the DB
  (unknown column). (b) Adding a new migration + UI wiring tonight — the live DB is mid-migration and
  the essay `snippet`/deck already supplies the SEO description on public essay pages, so a dedicated
  `meta_description` column is low value. The ready-to-apply SQL is documented in
  `UPGRADE_REPORT.md` if it is ever wanted, rather than shipped as an unapplied migration file that
  could collide with the concurrent migration session.

## Writer Studio: category required on every save
- **Decision:** Validate `category_id` (and section) on **draft saves too**, not only on publish.
- **Rationale:** `essays.category_id` is `NOT NULL` with FK `RESTRICT`. Saving a draft without a
  category produced an opaque DB error. Validating early gives a clear message and prevents the
  failed round-trip. This enforces the "no orphan essays" guarantee at the UI layer.

## Performance: route-level code splitting
- **Decision:** Lazy-load page routes with `React.lazy` + a `Suspense` fallback, and define
  `manualChunks` for heavy vendors (React, Supabase, TanStack Query, TipTap, Recharts, KaTeX).
- **Rationale:** The single JS bundle was ~1.53 MB (436 kB gzip) with a chunk-size warning. Splitting
  keeps initial load small and isolates rarely-used admin/editor code.
- **Rejected:** Manually re-architecting imports per page — higher risk; `manualChunks` + `lazy`
  achieves most of the win with minimal churn.

## SEO: canonical + sweep
- **Decision:** Add a `<link rel="canonical">` to the shared `SEO` component and add `<SEO>` to the
  public pages that lacked it. Admin/utility pages get `noindex` rather than rich tags.
- **Rationale:** Canonicalization benefits every page from one change; indexing admin tools is
  undesirable.

## Resilience: global error boundary + console hygiene
- **Decision:** Wrap the router in a global `ErrorBoundary`; gate `NotFound`'s `console.error`
  to dev only; remove `console.log` noise from `PersonalFinance`.
- **Rationale:** "Zero uncaught errors/warnings in console on normal flows"; a render error in one
  route should not white-screen the whole app.

## Testing strategy
- New behavior is guarded by **Vitest unit/component tests with a mocked Supabase client** (the repo
  already mocks Supabase in `src/test/`), keeping the suite green without touching any backend. Live
  e2e (`tests/live`) stays queued for after the migration session completes.

---

# 2026-07-31 (session 2) — verifying the baseline before applying it

## Dry-run the baseline against a local Postgres before it ever meets Supabase
- **Decision:** stand up a throwaway Postgres 16 with the Supabase role, schema and
  default-privilege shape replayed (`docs/db/verify/`), apply the real migration files to
  it, and run the whole acceptance bar against real RLS — before creating the project.
- **Rationale:** the SQL had never been executed. Four adversarial review lenses had read
  it and found seven defects; running it found an eighth they structurally could not see
  (see below). A 2,400-line schema should not meet a real database for the first time in
  production, and the project-creation blocker made the wait free.
- **Not a rule violation:** the prohibition is on `supabase db push` / `db reset` / any
  CLI migration command against the project. This is plain `psql` against a scratch
  cluster and touches no Supabase project.
- **Rejected:** applying straight to the new project and fixing forward — every fix would
  then be a migration on top of a wrong baseline, which is exactly the history the rebuild
  exists to escape.

## On managed Supabase, a privilege is never absent by default
- **Observation:** the platform ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL
  ON TABLES/FUNCTIONS TO postgres, anon, authenticated, service_role`. Every new table and
  function is therefore *born* with ALL granted to `anon` and `authenticated`, and `GRANT`
  is additive — it cannot subtract.
- **Consequence 1 (defect 7):** `admin_audit_log`'s "second, independent barrier behind
  RLS" did not exist. The table was UPDATE-able and DELETE-able at the privilege layer
  despite the deliberately absent policies.
- **Consequence 2 (the 8th defect):** `REVOKE EXECUTE ON FUNCTION has_role FROM PUBLIC` —
  the natural fix for "has_role is a public admin oracle" — leaves `anon`'s *named* grant
  intact. Verified: `SET ROLE anon; SELECT public.has_role(<uuid>,'admin')` still returned
  true. The revoke must name `anon`.
- **Decision:** every table and the one policy-callable function REVOKEs before granting.
  Stated as a rule in `docs/SCHEMA_PLAN.md` §1 so it is not undone by someone adding a
  table later and copying the grant block without the revoke.

## `user_roles` writes: delete what does not work rather than ship a silent no-op
- **Decision:** removed the admin UPDATE and DELETE policies on `user_roles`; kept INSERT.
- **Rationale:** Postgres applies a table's SELECT policies to the rows an UPDATE/DELETE
  *reads*. With only the own-row SELECT policy, a targeted admin UPDATE matched zero rows
  and **returned success**, and the only working DELETE was the unqualified one — which
  deleted the admin's own role and would lock the owner out of their own site. A policy
  that reports success while doing nothing is worse than no policy.
- **Rejected:** adding an admin SELECT policy to make them work. Permissive SELECT policies
  are ORed, so sign-in's admin probe would become `user_id = auth.uid() OR has_role(...)`
  and a future EXECUTE revoke would take the public site down — that is historical failure
  (a) exactly. Role administration stays a service_role/SQL operation, which is what it
  already was: nothing in `src/` administers roles.

## Filenames must encode dependency order
- **Decision:** `01/03/02/04` became `20260731010000/020000/030000/040000`.
- **Rationale:** the numbering was authoring order, but `essays.module_id` has an FK to
  `finance_modules`, so the real apply order was `01 → 03 → 02 → 04`. Nothing infers that,
  and `supabase db reset` — which the live e2e suite depends on — applies files in sorted
  order and would have failed. Correctness that lives only in a README is not correctness.

## The placeholder essay states losses, not reassurance
- **Decision:** rewrote the one published essay to remove four claims that were false —
  that the curriculum outline is "intact", that 49 modules belong to the three tracks that
  hold 29, that the outline "is what you see below", and a data-loss date the rebuild does
  not establish.
- **Rationale:** it is the only thing an anonymous visitor can read. A note explaining a
  data loss that overstates what survived is the worst possible first impression, and the
  same migration's own loss list contradicted it three paragraphs earlier. Every number in
  the replacement was re-counted against the seed data.

---

# 2026-07-31 (session 3) — live project, framework-v2 taxonomy, import test

## Slug scheme: the framework's own cross-reference convention (t4-m07)
- **Decision:** `finance_modules.slug` = lowercase of the framework's cross-ref tokens:
  `t1-m07`, `t4-m07`, `t1-m08a`, `t4-qm3`.
- **Rationale:** `slug` is globally UNIQUE and "Module 07" exists in four sections, so
  `module-07` inserts once then fails. The framework document already writes its own
  cross-references as `T1-M09 / T3-M01 / T4-M07`, treating that as the canonical id. Any
  other scheme disagrees with the source of record across 160 rows.
- **Rejected:** `section-module-07` style (verbose, and still not what the document uses);
  a synthetic integer id (loses the human-meaningful track/module encoding the slug URLs
  expose).

## sort_order stays integer; the display label moves to module_meta
- **Decision:** `sort_order` is the integer ordinal position within the track; the label a
  reader sees (`07`, `08A`, `QM1`) lives in `module_meta.display_label`.
- **Rationale:** three consumers already depend on `sort_order` being a clean integer — the
  `UNIQUE (track_slug, sort_order)`, the essay-stub `module_id` subqueries, and track
  ordering. `08A`/`08B` occupy ordinals 8/9 uncoerced. Coercing `08A`→8 and `08B`→8 would
  collide on the UNIQUE and silently merge two modules.

## Heading levels: title is H1, body demotes by one
- **Decision:** on import, H1→H2 and H2→H3; the essay title is the page's only H1.
- **Rationale:** the editor's StarterKit allows only `heading: [2,3]`, and an
  unrepresentable node is dropped silently — the highest-risk content-loss path. Demotion
  keeps the full hierarchy inside the allowed range without touching the editor schema, and
  one-H1-per-document is correct anyway. Verified: zero headings dropped end to end.

## ANCHORS → References; Post-Flight → body; equations stay bold text
- **ANCHORS USED** is bibliographic metadata → the `References` component
  (`economist_fields.references`), which the app already renders.
- **Post-Flight** is authored prose with no metadata home → body content (demoted headings).
- **Display equations** are plain-text arithmetic (`x` as multiplier), not LaTeX → kept as
  bold paragraphs. A KaTeX math block would be a new node type needing the full four-place
  contract for no rendering gain on this content. Revisit if real LaTeX appears later.

## Cross-tree placement coherence via trigger, not CHECK
- **Decision:** a BEFORE INSERT/UPDATE trigger refuses an essay that carries a curriculum
  `module_id` but an editorial (non-finance) `category_id` or section cache.
- **Rationale:** the two taxonomy trees share one `essays` table with nothing keeping them
  coherent. A CHECK constraint cannot reference another table (the category's section is two
  joins away); a trigger can. The route `/admin/writer/:section/:slug` already asserts which
  tree an essay lives in, so the constraint just makes the DB agree with the URL. Verified
  live: an incoherent UPDATE was refused with ERRCODE 23514, fail-closed even when the
  category doesn't resolve.
- **Deliberately NOT enforced:** the denormalised `essays.section` cache going stale when a
  category changes — owned by the writing-experience workstream, not this trigger.

## Count reconciliation: seed to the module detail, not the overview
- **Decision:** seed 161 essay stubs (56 Fundamentals), not the overview table's 160.
- **Rationale:** the framework is internally inconsistent — its overview claims 55
  Fundamentals essays, its module-by-module lists sum to 56. The enumerated module lists are
  the authoritative side; the overview is a roll-up that undercounts by one. Reported as a
  finding rather than quietly matching either number.

## Local CORS relay for the browser import test (dev-only)
- **Decision:** run the editor import test through a local relay
  (`127.0.0.1:8787` → the real project via Node fetch) rather than mocking Supabase.
- **Rationale:** the in-container Chromium cannot complete TLS to `*.supabase.co` through
  the egress gateway (connection reset at the fingerprint layer), but Node fetch through
  `HTTPS_PROXY` can. The relay keeps the test hitting the REAL project — real RLS, triggers,
  storage, edge function — which a mock would not. The relay is dev-only and never part of
  the app or deployment; `.env` is restored to production values.

---

## 2026-08-01 — The key-takeaways publish gate

**Where it actually is:** `src/components/writer/WriterValidation.tsx:54-60`.

```ts
const filledTakeaways = keyTakeaways.filter(k => k.trim()).length;
if (filledTakeaways < 3) {
  errors.push({ field: 'keyTakeaways',
    message: `At least 3 key takeaways required (${filledTakeaways}/3)` });
}
```

Not in the deleted `src/lib/admin/publishValidation.ts` — that module was dead code imported
only by its own test and was removed with the persona system. `WriterValidation.validateEssay`
is the live gate: `WriterEditor` computes it into `validation.canPublish`, which disables the
Publish button.

### What it protects

Something real. `KeyTakeaways` renders as a standing block in the article shell, and the
Economist-style layout the site borrows treats it as part of the furniture rather than an
optional extra. Three is the point below which the block stops reading as a summary and starts
reading as a stray bullet — one takeaway is a sentence that belonged in the deck, two look like
an unfinished list. The rule is really "if you are going to show this block, fill it", and it
also functions as a forcing device: being made to state three claims before publishing is a
cheap editorial check on whether the piece has a thesis.

### What it costs

It blocked a finished 3,246-word essay in a previous session. `fa-07-01` only satisfies it
because three takeaways were authored into `economist_fields` by hand to get past the gate.
That is the tell: a rule that gets satisfied by hand-editing the database is not shaping the
writing, it is being routed around.

The deeper mismatch is that it is a **uniform** rule over a **non-uniform** corpus. The
curriculum is 161 lesson stubs. `lesson_type` currently reads `concept` on all 162 rows, but
the enum already anticipates `framework`, `case-study`, `exercise`, `model-walkthrough`. An
exercise or a model walkthrough has no natural "three key takeaways" — its takeaway is the
worked artefact. Forcing three onto it produces filler, and filler in a standing block is worse
than no block, because the reader learns to skip it.

### Recommendation — scope per `lesson_type`, do not relax globally

1. **Require 3 for the essay-shaped types** (`concept`, `framework`) — the pieces where the
   block earns its place and the forcing function is worth having.
2. **Advisory for the rest** (`case-study`, `exercise`, `model-walkthrough`) — surface it as a
   warning in `WriterValidation`, not an error, so it never blocks Publish.
3. **All-or-nothing within a type:** if takeaways are supplied at all, require the full three.
   One or two should stay an error under every `lesson_type`, because a half-filled standing
   block is the actual failure mode.

Relaxing globally throws away a rule that is doing real work on the essays. Making it purely
advisory has the same effect more slowly. Scoping keeps the pressure where it helps and lifts
it where it manufactures filler.

**Not implemented in this session** — recorded as a recommendation, per the mandate's
instruction not to silently delete it.

---

## 2026-08-01 — Topic and Phase are required but redundant for curriculum essays

### The finding, with counts from the live database

| column | populated | of 162 |
|---|---|---|
| `topic` | **0** | 162 |
| `phase` | 1 | 162 |
| `module_id` | 161 | 162 |
| `finance_order` | 161 | 162 |

`topic` is NULL on **every single essay**. `phase` is set on exactly one. Meanwhile
`module_id` is set on 161. The fields the author is asked to fill are empty; the field that
actually locates the essay is populated.

**The asterisk is already decorative.** `WriterMetadata.tsx:162` labels the control
`Topic/Phase *`, but `WriterValidation.validateEssay` never checks either field — it validates
title, category, deck, key takeaways, word count and figures. So the UI signals "required"
while nothing enforces it. That is worse than either honest option: it trains the author to
fill a field that does not matter and would not have been checked anyway.

### Why they are redundant

For a curriculum essay, placement already determines both. `module_id` → `finance_modules`
gives `track_slug` and the module, and the essay's position is `finance_order`. The editorial
`phase` is a parallel, weaker encoding of the same fact — which is exactly why the placement
coherence trigger exists to stop the two trees disagreeing. Asking for three fields where one
determines the others is an invitation for them to drift apart.

### Recommendation — derive, do not ask

1. **Make module the single placement input** for `section = 'finance'`. Choosing the module
   sets `finance_section` (from `finance_modules.track_slug`) and `phase` (from the track), the
   way `resolvePlacementFields` already does in the WriterStudio stack.
2. **Hide Topic/Phase for curriculum essays.** Show it read-only as *"Derived from module:
   Analytics · T4-M07"* so the author can see the consequence of their one choice without being
   able to contradict it.
3. **Keep it editable only where nothing derives it** — the editorial sections
   (`green-transition`, `development-finance`, `critical-thinking`) where `phase` is the real
   placement and there is no module.
4. **Drop the asterisk** wherever the field is not actually validated. Either enforce it or do
   not mark it required.

`topic` is a separate concern: it is used by the accounting consolidation route
(`/accounting/consolidation/:topic`) and by `useEssaysByTopic`, so it should stay in the schema
— but it has no business being a required field on a finance curriculum essay, where zero rows
use it.

**Not implemented in this session** — recorded as a proposal.

---

## 2026-08-01 (session 7) — Both Section-2 recommendations applied

**Key-takeaways gate, scoped per `lesson_type`** (was: recommendation of 2026-08-01, now
implemented in `WriterValidation.tsx`):
- `concept` / `framework` — and every editorial essay — still require three (error).
- `case-study` / `exercise` / `model-walkthrough` — zero takeaways is an advisory warning.
- One or two takeaways is an error under **every** type: a half-filled standing block is the
  real failure mode.
Observed live on real stubs: an `exercise` with 0 takeaways published; a `concept` with 0
takeaways had Publish disabled.

**Topic and Phase derived from placement** (was: proposal, now implemented in
`WriterEditor.tsx` + `WriterMetadata.tsx`):
- Choosing the module sets `finance_section` (= track), `phase` (track mapped to the finance
  phase vocabulary via `TRACK_TO_PHASE`) and `topic` (= module slug — the module *is* the
  topic).
- The Topic/Phase control is read-only for curriculum essays — *"Derived from module:
  Strategic Finance · T2-M01"* — and editable only where nothing derives it. The decorative
  asterisk is gone: the field was labelled required while `validateEssay` never checked it.
- `topic` is only ever written for module-placed finance essays, so accounting's use of the
  column (its consolidation pages key on it) cannot be clobbered from this editor.

## 2026-08-01 (session 7) — FSLI empty state over seeded prose

Mandate 5.2 offered two ways out of the 24-identical-placeholder defect: seed
real sections or make the empty state honest. **Chosen: the honest empty
state.** Seeding "real" prose would have meant this session inventing
accounting doctrine for 24 line items and publishing it under the site's
name — the same fabrication class the section exists to remove, at larger
scale. Instead: unwritten sections say "Not written yet." in one quiet line,
admins click straight into the existing inline editor to write them, and each
page's header now carries the genuinely real per-item data it always had
(reported figures for both years and the notes reference from `fsli_pages`).
No schema change; `fsli_sections` remains the single source of section prose.

Also decided: the shared section outline may not carry line-item-specific
headings — "Bank Overdrafts Treatment" (true only for cash) became
"Classification Boundary Cases"; the `section_key` stays `issues-overdrafts`
so any rows written later still bind.

*(Superseded 2026-10-10: the outline, its "Not written yet." lines and the
site's read of `fsli_sections` are deleted; a line item's body is its linked
essay. See "2026-10-10 — FSLI pages: the essay is the body".)*

## 2026-08-02 (Substack replication) — The toolbar reversal

The owner reversed a verified decision, and this entry is the record the
mandate requires. The previous session removed the persistent formatting
toolbar and moved formatting into a selection-only bubble menu with eight
actions; that work passed its gate and is PASSED in `docs/GATE_LEDGER.md`
(S2). The owner has since directed a Substack replication, and Substack
formats from a persistent toolbar — roughly twenty items in seven separator
groups, horizontally scrollable, with a More menu as semantic overflow.

**The bubble menu is deleted; the persistent toolbar
(`src/components/editorial/toolbar/EditorToolbar.tsx`) replaces it.** The
earlier gate is *superseded, not broken*: the behaviour it verified was real
and correct against its specification, and the specification changed. The
affected ledger rows now point here. What survives from the old design:
insertion and formatting stay distinguishable (the toolbar formats and
inserts; `/` and the gutter `+` handle block insertion from ONE list that the
toolbar's More ▾ also reads), and zero validation while drafting.

## 2026-08-02 — Heading levels: widened to H1–H6

The schema allowed only h2/h3; the Style ▾ menu offers Normal + Heading 1–6,
and a menu item that silently does nothing was forbidden. Chosen: **widen the
schema to the full six levels** rather than trim the menu. The measured
tables include in-body H1 (38px) and H2 (30.875px), so at minimum H1 had to
become real; H3–H6 follow the same em-based ratio downward (1.3 / 1.125 / 1 /
0.875 — chosen, not measured; the source table stops at H2). All six pass the
five-place contract and the round-trip test covers all six. The essay title
remains a database field, not a body block; an in-body H1 (38px) rendering
larger than the page title (32px) is faithful to the original, not a bug.

## 2026-08-02 — SF Pro Display substitute: Plus Jakarta Sans

SF Pro Display cannot be licensed for general web use. The substitute for
in-body headings at 700 is **Plus Jakarta Sans** — already self-hosted,
already gate-verified as loading, and already the UI face of every control on
the page. The honest trade-off: PJS at 700 is rounder than SF Pro's
neo-grotesque; Inter or Archivo would be metrically closer. But shipping a
third family for headings alone means two sans faces in one product — a
cohesion failure worse than the metric gap — and no stack that silently
resolves to a system fallback was acceptable. `document.fonts.check` proves
PJS 700 loads at 38px on both surfaces.

## 2026-08-02 — Spectral in, Playfair Display out; where Plus Jakarta Sans remains

Spectral (Google Font, OFL) is self-hosted — eight static woff2 files, 400/700
upright+italic, latin + latin-ext — for the same reason PJS is: a webfont that
fails to load falls back silently. It takes three roles: editorial prose
(19px/1.6 body), title/subtitle (32/36, 18/24), and `--font-display`
sitewide, which **removes the Google-hosted Playfair Display @import** — the
last third-party font request. Plus Jakarta Sans remains the sans: UI chrome,
navigation, and in-body headings. Two families total. Spectral does NOT
replace PJS wholesale: the owner's instruction was the Substack pattern
(serif prose under sans headings), and re-skinning every UI surface to a
serif was neither asked for nor sensible.

## 2026-08-02 — The editorial accent is Substack's #ff6719, in one token

`--accent-editorial: 20.4 100% 54.9%` (exactly #ff6719) carries all five
measured roles: the blockquote rail, the link-popover focus ring, primary
buttons in popovers/dialogs, the "New" badge and dot, and the THEME swatches
in the colour palette. The mandate left the value to the owner and required
the pattern; matching the measured value was the default consistent with
"match it, do not reinterpret". Swapping to a house accent is a one-line
change in `src/index.css` — that is the point of the token. The site-wide
`--accent` (green) is untouched.

## 2026-08-02 — Button ▾ dropped; Template ▾ scoped, not built

**Button ▾** (Subscribe / Share / Comment / Send in the original) is dropped
entirely. There are no subscriptions, no comments table, no email
infrastructure — all four buttons would go nowhere, and the mandate's own
rule applied: do not ship buttons that go nowhere. Nothing was repurposed.

**Template ▾** is genuinely worth building — 161 essays across five lesson
types is exactly the case templates exist for — but it is real scope: a
`templates` table (schema change, forbidden this session), an editor flow to
save a document as a template and instantiate one, and list/rename/delete
management. Recommendation: build it as its own piece of work when the
schema freeze lifts; a lesson-type-shaped starting document would save the
owner real time 160 times. Not built silently.

## 2026-08-02 — More ▾ contents; Financial chart and Poetry recommendations

Kept in More ▾ (which reads the same list as the slash command): Link
preview, Table, Code block, Divider, LaTeX (new), Footnote (new). Dropped
entirely — absent from the UI, not present-and-broken: Poll, Prediction
market, Recipe, Audience-specific content, Paywall, Stock photos, Generate
image, Audio, Video.

**Financial chart — recommend deferring, second in queue after Template.**
The curriculum will eventually want real charts (Recharts is already a
dependency), but a chart node needs a data model inside the document, a
chart-type picker, and an editing surface — plus all five places of the
content contract. An interim path already exists: charts as figures.
**Poetry — recommend dropping permanently.** A finance curriculum for senior
professionals has no use for a poetry block; carrying it would be replication
for its own sake.

## 2026-08-02 — Footnotes are point citations; the references list stays

Footnotes and `presentation.references` coexist because they do different
jobs: a footnote is a point citation inside the argument (the sentence that
needs the page number), the references list is the end-of-essay reading list
("ANCHORS USED" in fa-07-01). Nothing is migrated. Mechanics: the note text
lives in a `data-footnote` attribute (no nested rich content — a second
document inside the document is round-trip surface for nothing the
curriculum needs), numbering is positional and never stored (a CSS counter in
the editor, render-time indices plus a numbered end-of-essay section with
backlinks on the published page).

## 2026-08-02 — KaTeX renders after sanitization, never through it

Math nodes store only their LaTeX source (`data-latex`); KaTeX renders
client-side on both surfaces from that attribute. KaTeX's output markup
never enters the database or passes through `sanitizeHtml` — so the
sanitizer's allowlist gains two data attributes, not KaTeX's element zoo.
The `style` attribute is now allowed but filtered by a DOMPurify hook to
exactly three properties with tight value patterns (`color`,
`background-color`, `text-align`); position/z-index/url() and friends are
stripped, unit-tested.

## 2026-08-02 — Motion: the boundary beat the skill, and the spinner died

Two recorded conflicts. (1) motion-craft's reduced-motion guidance is
"gentler, not zero — keep colour/opacity transitions"; the mandate's boundary
is "everything degrades to nothing, including CSS transitions". The boundary
won: a global `@media (prefers-reduced-motion: reduce)` block zeroes every
animation and transition, including Radix/tailwindcss-animate data-state
animations that no JS gate could reach. (2) The upload placeholder's 0.7s
looping spinner sat on the writing canvas; the gate caps canvas animation at
200ms and a 200ms/rev spinner is frantic, so the placeholder is now static —
dashed box plus "Uploading…", with the completion toast as the feedback.
Deliberately NOT animated anywhere: the save-state chip (a chip that animates
300 times a day is an interruption), and the toolbar chevrons' appearance
(they appear during a scroll; animation would lag the hand).

---

## 2026-08-02 — Six-areas session

### The footer name scope (owner decision, applied)
The name appears only where LinkedIn or email is attached. Applied: the
standalone name heading (`Footer.tsx` brand block) is gone, and the © line now
reads "dikagustiana.com" — a bare name with neither link attached would have
violated the same rule the heading did. The contact line "Dika Gustiana
Irawan · LinkedIn" stays. **Reversal is one line:** restore a name `<span>`
beside the footer logo link. The hero byline ("By Dika Gustiana.") is the
owner's copy, verbatim, and stays. Author-attribution values and SEO strings
elsewhere are essay metadata, not chrome — itemised in the ledger's GATE 1 row.

### Human slugs derive from the pre-colon head of the title
Titles follow a "Head: long subtitle" convention and run to ~180 characters;
slugifying the whole title would mint URLs nobody can read aloud. The slug is
the pre-colon head, slugified, capped at 60 characters, deduped by numeric
suffix — `fa-07-01` became `driver-tree-construction`. Pre-checked on all 161
rows before applying: 0 empty, 0 collisions, 0 clashes with existing slugs.
The curriculum code moved to `essays.code` (partial unique index) and remains
the internal identifier — rendered and searchable in the writer list.

### The featuring model kept: `essays.is_selected`
Three mechanisms existed; `is_selected` won because it already existed, already
had a query, and is a per-essay fact rather than a settings row pointing at an
id. Deleted: `useFeaturedEssays` (created_at recency — recency is what promoted
the database-rebuild notice) and `finance_settings.featured_finance_essay_id`
(a third path for one page, whose card also linked to `/essay/:slug`, a route
that does not exist). The homepage, About and the Finance landing all read the
one flag; the admin UI is a star per essay in Admin → Content, audit-logged.

### Zero selected → hide the section (owner decision, applied)
No recency fallback: a fallback is exactly what surfaced the rebuild note. With
nothing selected the homepage and Finance landing sections are absent, not
empty-looking — observed both ways. To keep day one from being blank,
`is_selected = true` was seeded on fa-07-01 in the migration. **Reversal is one
UPDATE** (or one star click in Admin → Content).

### FSLI prose is authored as essays, not in a second editor
The inline `fsli_sections` textarea wrote straight into rows anonymous readers
see — no draft, no publish boundary, no history, no autosave (the audit's
editing-public-data finding). Deleted, not hidden. FSLI prose is now accounting
essays linked by `fsli_slug` (picker in Post settings, prefilled by the FSLI
page's "Write in Studio" link), which inherits the entire finance flow for
free — the alternative was building draft/revision machinery a second time,
the duplication this project has paid for repeatedly. Legacy `fsli_sections`
content still renders read-only, so nothing written disappears.
*(Superseded 2026-10-10, this last sentence only: the site no longer reads
`fsli_sections`, which held no written row. See "2026-10-10 — FSLI pages: the
essay is the body".)*

### Font subsets dropped, and the one kept
Removed all FIVE latin-ext files (the brief counted four: 4 Spectral +
1 Plus Jakarta Sans) with their `@font-face` blocks: the content is English
and Indonesian, neither uses those glyph ranges, and `unicode-range` meant the
files were never fetched — repo weight, not wire weight (240 KB → 128 KB).
KEPT `spectral-italic-700-latin` (24 KB): the toolbar produces real
bold-italic, and browsers synthesize a fake one when the face is missing —
a smeared faux-bold inside a typography system that was measured to the pixel.

### All @tiptap packages pin ONE exact version
The lockfile carried react/starter-kit at 3.19.0 with core hoisted to 3.29.2 —
two ProseMirror graphs, and a clean install crashed the entire writer studio
while every check stayed green (details in the ledger). All twelve packages now
pin `3.29.2` exactly, no caret, and a unit test fails if any @tiptap version
ever differs from the others. Caret ranges on a lockstep-released family are
how this happened.

### The editor is not exported from the editorial barrel
`components/editorial/index.ts` re-exported `EssayEditor`, which pulled
TipTap, ProseMirror and KaTeX into the static bundle of every PUBLIC essay
page — readers downloaded the writing surface to read. The barrel now carries
reading components only; the studio imports the editor by direct path. Pinned
by test. KaTeX itself loads through one lazy `katexLoader` module (JS + CSS
together — a CSS-only dynamic import gets hoisted by Vite and defeats the
split).

### Dependency vulnerabilities: 8 remain, deliberately
`npm audit fix` (semver-safe) patched dompurify — the sanitizer, the one that
matters — and brace-expansion: 11 → 8. The remaining 8 sit behind breaking
upgrades (`--force`), which this session did not churn mid-refactor; same
posture as the audit-triage session, now with the count lower and the
security-critical package current.

---

## 2026-08-02 — Corrections + additions session

### The hero artwork is a deliberate KEEP — the deletion was a misread instruction
The six-areas mandate said "delete all three hero images"; the owner's actual
instruction kept the manga texture. Restored from git history. The performance
goal survives with the method corrected: the weight was the FORMAT (1.1 MB
lossless PNG for a colour illustration) and two zero-importer files (2.2 MB),
not the artwork. The texture now ships as a 156 KB WebP at the same 1536×1024
— transferred bytes measured 1,141,612 → 160,412. `min-h` 520px and
`max-w-[55%]` stay; they exist to accommodate the artwork. Fallback: WebP is
the one asset (src/assets holds exactly one file); if it ever fails to load,
the paper background keeps the hero readable — every browser that runs this
ES2020 app decodes WebP, so a second full-size fallback file would be pure
repo weight of exactly the kind this correction removes.

### Sign In on logo-hover is presentation, not security
Sign In left the top-level nav (an item only the owner uses) and sits beside
the logo, revealed on hover AND keyboard focus. Hiding the link does not make
/auth harder to find and is not meant to: RLS and the admin role are the
boundary. The value is a header that does not advertise internal tooling to
readers. Two guardrails written into the component: the logo stays a Link
(the original defect was a button-that-opened-a-dropdown), and the reveal has
`focus-visible` + `group-focus-within` — a hover-only control is invisible to
keyboard users, defect 6.6's exact class. Touch has no hover; the mobile
drawer carries its own Sign In.

### The barrel lesson (written down because it will recur)
The mandate asked to "lazy-load KaTeX"; the real cause was upstream:
`components/editorial/index.ts` re-exported `EssayEditor`, so EVERY public
reading page importing `ArticleShell` from the barrel dragged the entire
editing graph — TipTap, ProseMirror, KaTeX — into its static bundle. The
pattern to watch for: **a barrel file that mixes reading components with
editing components couples every reader to the editor.** Rule adopted: the
editorial barrel exports reading components only; editing surfaces are
imported by direct path; `tests/unit/readingPathWeight.test.ts` pins it.
Related trap, same family: a CSS-only dynamic import gets hoisted by Vite
into the importing chunk — lazy CSS must ride inside a lazy JS module.

### The test-count guard, and why "vitest failed" was not enough
Chosen mechanism: CI runs vitest with a JSON report and
`scripts/assert-test-count.mjs` fails the build when the total drops below a
floor (245) or any suite fails. The floor is raised when tests are added and
lowered only in the commit that deliberately deletes tests, naming them.
Two lessons from proving it: (1) vitest does exit non-zero on an
import-crashed suite, but a piped `tail` swallowed that exit — the guard is
belt-and-braces against every way the signal can be lost, including future
reporter/config changes; (2) an unused NAMED import of a nonexistent module
is silently type-elided by esbuild and never resolves — the intentional break
in a guard proof must be a bare side-effect import.

### Session practice: never hang on a non-terminating command
Recorded for every future session: `vitest run`, never watch mode; dev and
preview servers always backgrounded with their PID recorded for cleanup,
never run in the foreground. This session's container restart killed exactly
such background servers — the work survived because nothing interactive was
holding the terminal.

### Pre-rendered cards go stale until a redeploy — a real limitation, named
Found by review, and true: publishing or editing an essay in the writer
studio changes Supabase only. Nothing rebuilds the site, so the pre-rendered
`dist/<path>/index.html` for a NEW essay does not exist (it shares the
generic card) and for an EDITED essay keeps the old title/description/dates
until the next deploy. JavaScript-capable visitors always see the current
page — this affects crawlers only, which is exactly the audience the feature
was built for, so it is not cosmetic.

Deliberately NOT fixed in the client: the obvious shortcut is to POST a
Vercel deploy hook from the publish flow, but that URL would ship inside the
public admin bundle, and anyone who loaded it could trigger unlimited
rebuilds. The correct remedies, both owner-side and server-side:
1. A Supabase Database Webhook on `essays` (UPDATE where `published`) →
   the Vercel deploy hook URL. The secret stays in Supabase, never the
   browser. One-time setup; publishing then refreshes cards on its own.
2. Or simply hit "Redeploy" in Vercel after a publishing session.
Recorded rather than half-built, because option 1 needs a hook URL that only
the owner can mint.

### Accounting essays are skipped by the prerender, and say so
Accounting rows canonicalise to PAGE-level URLs — `/accounting/fsli/:slug`,
`/accounting/consolidation/:topic`, `/accounting/statutory-reporting` — that
inline several essays. Writing one essay's `og:title` there would let an
arbitrary essay speak for the whole page (last writer wins); writing it at
`/essays/:slug` instead would advertise a doorway that redirects. Both are
wrong, so those rows are skipped and NAMED in the build log, along with any
two essays that collide on one path (which fails the build). Page-level
cards for the FSLI surfaces are separate work on a separate object.
