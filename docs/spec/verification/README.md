# Tracker rebuild: verification evidence (Plan 2.5)

Measured on 11 October 2026 against commit `0132ff7` plus the inline-reference underline fix in
the same commit as this file.

## How the page was run

- Production bundle (`vite build`), served with `vite preview` on 127.0.0.1:4173.
- `VITE_SUPABASE_URL` pointed at a local stand-in for the Supabase REST API that serves the 14
  signed-off entries, resolved exactly as the seed migration stores them, **as published**. That is
  what readers will see once the entries are published; in the project the rows are still
  `published = false` (anon sees 0 rows).
- Chromium 1194 (Playwright's bundled browser), axe-core 4.10.2, Lighthouse 12.2.1.
- Raw numbers: `tracker-evidence.json` in this folder.

## Screenshots

| File | What |
|---|---|
| `tracker-1440-first-screen.png` | 1440×900, first screen |
| `tracker-1440-full.jpg` | 1440, full page |
| `tracker-1440-row-open.png` | 1440, the register with Geothermal opened |
| `tracker-375-first-screen.png` | 375×812, first screen |
| `tracker-375-full.jpg` | 375, full page |

At 375 the document is 375px wide (`scrollWidth` 375): no sideways scroll on the page.

## PRD §B6, item by item

| Acceptance item | Result | Artefact |
|---|---|---|
| Every published `tracker_entry` has ≥ 1 source with `url` and `doc_no` or `date`; `verification='verified'` | Enforced by the table: `tracker_sources_valid()` CHECK and `tracker_entry_published_is_verified` CHECK. All 14 seeded rows pass. | `supabase/migrations/20261011100000_tracker_entry.sql`; `docs/db/verify/02_tracker_entry_acceptance.sql` (13 PASS lines, incl. rejection of empty sources, a source with neither doc_no nor date, a non-https url, and a published unverifiable row); `tests/unit/tracker_copy.test.tsx` (one test per entry) |
| No published entry contains "not just", "isn't about", "execution friction", "institutional ambiguity", "policy architecture", "paused" | 0 hits in the 14 entries; 0 hits on the rendered page | `tests/unit/tracker_copy.test.tsx` (one test per entry, plus a page-level test); mutation check: a banned phrase in one entry turns the suite red |
| "Paused"/"archive" at most once on the page | 0 on the rendered page (the status line says "Not updated since") | Playwright count on the built page: `{"pausedOrArchiveWholePage":0}`; page-level test in `tracker_copy.test.tsx` |
| Only two font families loaded on the route | Plus Jakarta Sans and Spectral. Font requests: `/fonts/plus-jakarta-sans-latin.woff2`, `/fonts/spectral-normal-400-latin.woff2`, `/fonts/spectral-normal-700-latin.woff2`. Elements with a monospace computed font: 0 | `tracker-evidence.json` → `playwright_axe.{1440,375}.fontsRequested`, `monoElements` |
| Body text contrast ≥ 4.5:1, checked with axe or equivalent | Issue body (Plus Jakarta Sans 19px, rgb(54,55,55) on rgb(250,250,250)): **11.44:1**. Register findings (16px, rgb(33,42,54)): **13.88:1**. Register headers 13.88:1. Source list 13.88:1. Lowest text on the page, the muted status line and labels (rgb(98,112,132)): **4.82:1**. axe `color-contrast`: pass, 0 violations at both widths | `tracker-evidence.json` → `measured`, `axe` |
| Lighthouse accessibility ≥ 95 | **99** mobile, **99** desktop | `tracker-evidence.json` → `lighthouse` |
| Dika signs off on every rewritten entry before `published=true` | Signed off 11 October 2026; seed lands `published = false`; project shows 0 rows to anon | `docs/spec/tracker_sources.md` header; seed migration; `select count(*)` as anon = 0 |
| Unverifiable entries delivered as a separate list | 30 claims, quoted, with reasons | `docs/spec/tracker_sources.md`, Part B |

## Other checks

- **axe, WCAG 2.0/2.1 A and AA:** 0 violations at 1440 (29 rules pass) and 375 (30 rules pass).
  The first run found `link-in-text-block` on the inline [n] references (colour was their only
  mark inside a paragraph); they are now always underlined. Two "incomplete" items at 375 are in
  site chrome, not the tracker: the mobile menu button's `aria-controls` and the scrolling
  Green Transition tabs, whose background axe cannot read.
- **Lighthouse's one failing audit**, `heading-order`, is the site footer's `<h4>` headings
  ("Sections", "Resources") following the page's `<h2>`. It is on every page and outside this PR.
- **Table row height:** smallest register row 291px at 1440; each sector button is 44px high
  (`min-h-11`).
- **Old addresses:** `/tracker/q2-2025` → `/green-transition/tracker#q2-2025`, section top 65px
  below the viewport top (under the sticky header); `/tracker/q1-2025` likewise; `/tracker/archive`
  and an entry address → `/green-transition/tracker` at the top.
- **Unit suite:** 1285 tests pass (`TZ=America/Chicago`), floor 1281. **E2E smoke** for the seven
  Green Transition routes: 7 pass.
