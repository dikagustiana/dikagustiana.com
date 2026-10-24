# Design — dikagustiana.com cleanup and Books shelves

Rule for every change here: refine within the existing theme. Same tokens (`font-display`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-popover`, `bg-secondary`, `text-accent` on hover), same type scale, same list pattern the site already uses (`divide-y divide-border border-y`). No new colours, no shadows, no gradients.

## 1. Working paper — normal mode

```
Working paper: PT Dummy C and its subsidiaries, PSAK 338          (h2, unchanged)
The full PSAK 338 consolidation workbook, sheet by sheet.          (lede, rewritten)
Figures are dummy and do not represent any company's data.         (text-xs text-muted-foreground)

                                                     [⤢ Full screen]   ← single quiet button, right-aligned
┌ SOFP │ SOPL │ SOCE │ CF 24 │ … ─────────────────────────────────────── ▸ ┐   tabs; fade + ▸ when more tabs exist
│ A1  │ fx │ PT DUMMY - C DAN ENTITAS ANAK                                 │   formula bar, no Inspector button
├─────┴────┴─────────────────────────────────────────────────────────────┤
│    A B C D      E                      …   J            L            N  │   headers kept, no cell gridlines
│ 1  PT DUMMY - C DAN ENTITAS ANAK                          PT DUMMY - C AND SUBSIDIARIES   ← no longer clipped
│ 12 Kas dan bank                         61.178.535.792  75.109.486.095  …  Cash and bank  ← col P readable
│ 22 Total Aset Lancar                   ───────────────  (workbook's own rule kept)
└─────────────────────────────────────────────────────────────────────────┘
```

- Grid area spans the full width of the `wide` block; empty trailing columns fill to the edge instead of a blank band.
- Cell surface: `bg-popover`, no `border-b border-r` on cells. Header row/column keep their thin border so the headers read as a frame.
- Selected cell: keep the current selected fill and outline. No precedent/dependent fills.
- Tab overflow: when tabs overflow, a right-edge fade and a small ▸ scroll control, so the reader knows more sheets exist (the "SoCE" clipping in the screenshot).

### Copy (replace in `copy.ts`)

| Key | New text |
|---|---|
| `lede` | The full PSAK 338 consolidation workbook, sheet by sheet. |
| `disclaimer` | Figures are dummy and do not represent any company's data. |
| `failedMessage` | The workbook could not be loaded just now. Reload the page to try again. |
| `fullScreen` / `exitFullScreen` | Full screen / Exit full screen |

## 2. Working paper — full screen

```
┌ SOFP │ SOPL │ SOCE │ … ──────────────────────────────────── [✕ Exit] ┐   tabs row; exit control at its right end
│ A1  │ fx │ …                                                        │
│ grid fills the rest of the screen                                    │
└──────────────────────────────────────────────────────────────────────┘
```

- Nothing else on screen: no heading, legend, disclaimer or toolbar row.
- Exit control: icon button `Minimize2` with visible label "Exit" from `md` up, icon-only below; `aria-label="Exit full screen"`. Esc also exits.
- Padding `p-2` (not `p-3`), background `bg-background`.
- Phones (no Fullscreen API): the existing `page` fallback (`fixed inset-0 z-50`) with the same layout.

## 3. Consolidated Reporting page

Order after cleanup: Hero → Three terms → Process Architecture → Working paper → Consolidation series. Method and Topics are gone.

- Page uses `PageLayout width="wide"`: breadcrumb, hero and every section share one left edge, centred in the viewport.
- Consolidation series list: full width of the `wide` block (drop its `max-w-3xl`), same row style as now (title left, "Part n" right in `font-mono text-xs`).

## 4. Reading pages (Books, Critical Thinking, others found in the audit)

- `PageLayout width="reading"`: one centred column, `max-w-3xl mx-auto`; breadcrumb inner wrapper uses the same width so "Home › Books" sits directly above the h1.
- At 2560 px the column sits in the middle; at 390 px nothing changes visually (column already full width).

## 5. Books page

```
Books                                                         (h1, font-display)
Books read for this site's work, by subject.                  (subtitle, unchanged)

──────────────────────────────────────────────────────────────
▾ Corporate Finance                                     4 books    ← shelf header = button, aria-expanded
──────────────────────────────────────────────────────────────
  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
  │cover │ │cover │ │ Title│ │cover │   cover 2:3, rounded-sm, border-border
  │      │ │      │ │ set  │ │      │   no cover → typographic placeholder: title in font-display on bg-secondary
  └──────┘ └──────┘ └──────┘ └──────┘
  Title              Title …                                 text-sm font-medium, 2 lines max
  Author · 2023                                              text-xs text-muted-foreground
  Two-line synopsis preview that is cut…                     text-xs text-muted-foreground line-clamp-2
  FREE                                                       badge: text-[11px] font-mono uppercase
──────────────────────────────────────────────────────────────
▸ Accounting                                            2 books
──────────────────────────────────────────────────────────────
▸ Green Transition                                      3 books
──────────────────────────────────────────────────────────────
```

- Shelf header: `py-5`, name in `text-lg font-display font-semibold`, count right-aligned in `text-xs font-mono text-muted-foreground`, chevron rotates 90° (`transition-transform`, 150 ms; respects `prefers-reduced-motion`). Whole row clickable; keyboard: Enter/Space.
- Grid inside a shelf: 2 columns at 390 px, 3 at `sm`, 4 at `md` and up (the column is `max-w-3xl`, so 4 is the max). Gap `gap-x-5 gap-y-8`.
- Badge: Free = `text-foreground border border-border`; Buy = `text-muted-foreground border border-border`. Text only, no colour coding beyond that.
- Hover on a card: cover border to `border-foreground/40`, title to `text-accent`.
- Empty page (no published books): the subtitle, then "No books on the shelves yet." in `text-muted-foreground`. For an admin, a link "Add a book →" to `/admin/books` under it.

### Book dialog

```
┌──────────────────────────────────────────────────────────┐
│ ┌──────┐  Title of the Book                         [✕]  │
│ │cover │  Author Name · 2023 · Corporate Finance          │
│ │      │                                                  │
│ └──────┘  [⭳ Download PDF]      or      [Buy ↗]           │  one primary button (bg-primary)
│ ──────────────────────────────────────────────────────── │
│ Synopsis (rich text, prose styles from essays,            │
│ max-h-[60vh] scrolls inside the dialog)                   │
│                                                           │
│ License: CC BY 4.0                                        │  free books only, text-xs muted
└──────────────────────────────────────────────────────────┘
```

- shadcn `Dialog`, `max-w-2xl`; on phones full-height sheet (cover above title).
- Opening sets `?book=<slug>` (replace, not push); closing removes it. Back button closes the dialog if it was opened by a link.
- Buy opens in a new tab; label "Buy ↗" with `aria-label="Buy <title> (opens in a new tab)"`.

## 6. Admin — `/admin/books`

Two panels, stacked on narrow screens, side by side from `lg`:

```
Shelves                          │ Books in: Corporate Finance            [+ Add book]
[+ Add shelf]                    │ ↑↓ Title A      Free   Published   [Edit]
↑↓ Corporate Finance   4  [Edit] │ ↑↓ Title B      Buy    Draft       [Edit]
↑↓ Accounting          2  [Edit] │
↑↓ Green Transition    3  [Edit] │
```

- Reorder with up/down arrow buttons, the same pattern as Homepage order (`src/components/admin/HomepageOrder.tsx`). No drag library: the repo has none, and none is added.
- Delete shelf: disabled while it holds books (tooltip says why).

Book form (dialog or side sheet):

| Field | Control | Rule |
|---|---|---|
| Title | input | required |
| Slug | input, auto from title | unique, editable |
| Author | input | optional |
| Year | numeric input | optional |
| Shelf | select | required |
| Cover | image upload with preview | jpg/png/webp ≤ 2 MB, optional |
| Access | segmented: Free / Paid | required |
| File (Free) | PDF/EPUB upload | required for Free, ≤ 50 MB |
| License note (Free) | input, helper text "Why this book can be redistributed, e.g. CC BY 4.0" | required for Free |
| Purchase URL (Paid) | input | required for Paid, must start with https:// |
| Synopsis | TipTap, reduced toolbar | optional; excerpt generated on save |
| Published | switch | default off |

Save disabled until the rules pass; errors inline under each field. Successful save: toast "Book saved".
