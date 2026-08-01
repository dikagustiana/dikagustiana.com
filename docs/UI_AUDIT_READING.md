# UI audit — reading surfaces (session 7)

Scope, per the mandate: homepage, About, track index, module index, essay page,
FSLI pages. Not the admin. Method: `ui-audit` skill — recon sweeps
(`transition: all`, `ease-in`, `scale(0)`, scroll listeners, `h-screen`, pure
black, forced-smooth scrolls, off-palette colour, hardcoded metadata, dead
components), then every finding re-read at its location before it was allowed
into the table.

Recon facts first: **zero** `ease-in`, `scale(0)`, `h-screen`, or `#000000`
on any reading surface. One font family, one grey family, one radius system.
The defects that did exist were mostly **truth defects** — fabricated content
and metadata — not aesthetic ones.

## Findings

All dispositions applied in this session's Section-5 commit unless marked
otherwise. `npm run typecheck` (tsc -b, 249 files) and `vite build` pass after
the batch; the FSLI result is observed in GATE W5.

| # | Severity | Category | Location | Before | After | Why | Disposition |
|---|----------|----------|----------|--------|-------|-----|-------------|
| 1 | HIGH | Content truth | `FsliDetail.tsx` section configs + `FsliContentSection.tsx:87` | All 24 line-item pages rendered identical cash-equivalents boilerplate — a `placeholder` string shown whenever `fsli_sections` had no row, which is always (0 rows) | Placeholder rendering removed; an unwritten section says *"Not written yet."* in one quiet line; admins click straight into writing it | A page that confidently states the wrong thing is worse than a page that says it has no content yet (mandate 5.2). Same class as the component that advertised 45 books over an empty table | **Fixed** |
| 2 | HIGH | Content truth | `FsliHeroSection.tsx` (used on every FSLI page) | Stock Unsplash photo with a *"Photo: Unsplash"* credit, a "Key points" card carrying cash-specific bullets on all 24 items, and the template *"{title} represent important components on a company's balance sheet"* | Hero replaced by the real per-item data the page actually has: reported figures for 31 Dec 2024 / 31 Dec 2023 and the notes reference, `tabular-nums`, with the caption "Figures as reported in the source financial statements" | The bullets were false on 23 of 24 pages; the description template is ungrammatical for singular items; decorative stock photography with credits is filler. Real distinct data beats fabricated sameness | **Fixed** |
| 3 | HIGH | Content truth | `FsliDetail.tsx:190-196` | Hardcoded `Updated 6 Sep 2025` and `6 min read` on every page | Real `updated_at`, formatted; read time removed (there is no content to estimate) | Fabricated metadata, same class as the hardcoded `Draft · Dika Gustiana` byline fixed in Section 3 | **Fixed** |
| 4 | HIGH | Dead controls | `FsliOnThisPage.tsx:73-80` | Two arrow `<Button>`s with no `onClick` — they rendered, focused, and did nothing | Removed | A control that looks interactive and is inert breaks trust in every control around it | **Fixed** |
| 5 | MEDIUM | Motion / a11y | `FsliOnThisPage.tsx:43`, `FsliDetail.tsx:176` | `behavior: 'smooth'` forced regardless of `prefers-reduced-motion` | `scrollBehavior()` from the new `src/lib/motion.ts` (shared with `ArticleToc`) | Same defect class GATE W4 fixed on the essay page; an explicit `'smooth'` overrides even the now-gated CSS | **Fixed** |
| 6 | MEDIUM | Efficiency | `FsliContentSection.tsx:36-47` | Every section fetched its own `fsli_sections` row: **10 single-row requests per page view** | One `useFsliSections(slug)` query in `FsliDetail`; content passed down as a prop; loading renders a paragraph-shaped skeleton | Same class as the 99-request module index fixed at GATE 1b | **Fixed** |
| 7 | MEDIUM | Performance | `FsliDetail.tsx:95-113` | Non-passive, unthrottled scroll handler doing up to 10 `getBoundingClientRect` reads per scroll event | rAF-coalesced (one measurement pass per frame), `passive: true`, cancel on unmount | Layout reads per event on a long page are measurable main-thread work; identical pattern to the `ReadingProgress` fix in Section 4 | **Fixed** |
| 8 | MEDIUM | Palette | `FsliRelatedItems.tsx:30` | Active-item style in `amber-50/700/500` — a family the site's palette does not use — on a branch that can never render (the list filters out the current slug) | Dead branch removed with its stray palette | One accent, locked; and dead styling invites someone to resurrect it | **Fixed** |
| 9 | LOW | Motion / perf | `Index.tsx:93,146,159`, `RelatedContent.tsx:146`, `FinanceTrackIndex.tsx:82`, `FinanceModulePage.tsx:113` | `transition-all` (six occurrences — two of them introduced by this session's own Section 3) | Narrowed to the properties actually transitioned; the homepage "Enter →" arrow now nudges via `transition-transform` instead of animating flex `gap`, which re-runs layout | `transition: all` animates unintended properties off the GPU | **Fixed** |
| 10 | LOW | Hygiene | `FsliHeroSection.tsx`, `FsliMetricCard.tsx`, `FsliSection.tsx`, `FsliSidebar.tsx` | Never imported by anything | Deleted | Dead components carry fabrication templates (MetricCard hardcodes `$` and "Thousands USD" for figures whose currency it cannot know) | **Fixed** |
| 11 | LOW | Content truth | `FsliDetail.tsx` outline | Fixed section heading "Bank Overdrafts Treatment" on all 24 pages — a cash-specific topic in a shared outline | Retitled "Classification Boundary Cases"; `section_key` unchanged so any future DB rows still bind | The outline is shared; its headings must be true for every line item | **Fixed** |
| 12 | LOW | Accessibility | `FsliContentSection.tsx` | Admin click-to-edit prose `<div>` is not keyboard-focusable | — | — | **Not fixed, recorded**: the pencil `Button` beside it is the keyboard path, and the surface is admin-only. Revisit if the inline editor grows |

## Verdict

The reading surfaces are executionally sound and truth-poor: the design
language (one palette, one type system, shadcn register, restrained motion) is
consistent, but four of the five HIGH findings were fabricated content or
metadata presented as real. That is the pattern this project keeps finding —
`Draft · Dika Gustiana`, 45 advertised books, `0/0 lessons` — and the highest-
leverage change was the same each time: render the data or admit its absence.
The problem is not the design language; it is places where the interface was
allowed to lie. After this batch, the FSLI pages are honest skeletons with
real figures, which is the correct state for content that has not been
written.

## Missed opportunities (additive, not corrective)

- `fsli_pages.category` exists (current_assets, …) but "Related line items"
  is first-8-by-sort-order. Grouping by the current item's category would make
  the label true at zero data cost.
- The FSLI notes reference (`3i.6`) is plain text; once note pages exist it is
  a natural link target.
- `RelatedEssays` cards already fetch `read_time` for essays that have it;
  the card renders title and snippet only.

## Deliberately not flagged

- `FigureUploader.tsx` / `ImageUploader.tsx` amber warning text — admin
  authoring surfaces, outside the mandated scope.
- Homepage card hover (`-translate-y-1` + shadow) — occasional surface,
  register-appropriate feedback; narrowing its `transition-all` (finding 9)
  was enough.
- The admin banner on FSLI pages being in Indonesian — the owner's language,
  admin-only.
- Inline ToC entries at ~36px height — below the 44px tap-target bar, but it
  is a full-width secondary nav row inside a collapsible; the primary-nav
  tap-target gate (session 6) is unaffected. Recorded here rather than
  churned.
- `FsliRelatedItems` capping at 8 items — arbitrary but harmless; the list is
  real data with real titles.
