# dikagustiana.com — design system, exported for the Lab

Everything that makes dikagustiana.com look the way it does, written down so another app (the Lab)
can be built to match. Read from the code at `main` @ `c384c71` and checked against the live
site's computed styles on 27 November 2026; every value here is one the site uses. Where the code
and the live page disagreed, the live value is given and the difference noted.

| File | What it is |
|---|---|
| `README.md` | This spec: rules, tokens, type, layout, every component's anatomy |
| `tokens.css` | Fonts, colour tokens, base rules and component classes, in plain CSS (no Tailwind needed) |
| `tailwind.preset.cjs` | The site's Tailwind 3 theme as a preset |
| `tokens.json` | The same colours, type and number format as resolved values, for Python charts and the like |
| `screenshots/` | The live site at 1440 × 900 (2×) and on an iPhone 13 |

## Contents

0. [Bringing it into the Lab](#0-bringing-it-into-the-lab)
1. [The rules](#1-the-rules)
2. [Colour](#2-colour)
3. [Type](#3-type)
4. [Layout and spacing](#4-layout-and-spacing)
5. [Shape: radius, borders, shadows, z-index](#5-shape-radius-borders-shadows-z-index)
6. [Site chrome](#6-site-chrome)
7. [Core components](#7-core-components)
8. [Reading surface](#8-reading-surface)
9. [Listing pages](#9-listing-pages)
10. [Data surfaces: grids, tables, numbers](#10-data-surfaces-grids-tables-numbers)
11. [Charts](#11-charts)
12. [Diagrams](#12-diagrams)
13. [The homepage hero](#13-the-homepage-hero)
14. [Motion](#14-motion)
15. [Icons](#15-icons)
16. [Share card](#16-share-card)
17. [Do not port](#17-do-not-port)
18. [Screenshots](#18-screenshots)

---

## 0. Bringing it into the Lab

**Stack the site uses:** Vite 5, React 18, TypeScript, Tailwind 3.4, shadcn/ui (style `default`,
base colour `slate`, CSS variables on), Radix primitives, lucide-react icons. If the Lab is on the
same stack, the port is three steps:

1. **Fonts.** Copy into the Lab's `public/fonts/`:
   - `plus-jakarta-sans-latin.woff2`, `spectral-normal-400-latin.woff2`,
     `spectral-normal-700-latin.woff2`, `spectral-italic-400-latin.woff2`,
     `spectral-italic-700-latin.woff2`: from this repo's `public/fonts/`, or live at
     `https://dikagustiana.com/fonts/<name>`.
   - `source-serif-4-latin-500-normal.woff2` (only if the Lab wants the hero face): from the npm
     package `@fontsource/source-serif-4@5.3.1`, `files/`.
   All are OFL. Preload the faces visible on first paint:
   `<link rel="preload" href="/fonts/spectral-normal-700-latin.woff2" as="font" type="font/woff2" crossorigin>`.
2. **Tokens.** Import `tokens.css` as the first line of the main stylesheet, before `@tailwind base`.
3. **Theme.** `presets: [require('./design-system/tailwind.preset.cjs')]` in `tailwind.config.js`, and
   install `tailwindcss-animate` and `@tailwindcss/typography`. Then add shadcn components as usual;
   apply the two edits in §7.1 (button hover surface, sheet close target) after they are generated.

**Tailwind 4:** `@import "./design-system/tokens.css" layer(base);` and map the tokens with
`@theme inline`:

```css
@theme inline {
  --font-sans: var(--font-sans); --font-serif: var(--font-serif);
  --font-display: var(--font-display); --font-hero: var(--font-hero);
  --color-background: hsl(var(--background)); --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card)); --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover)); --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary)); --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary)); --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted)); --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent)); --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive)); --color-border: hsl(var(--border));
  --color-input: hsl(var(--input)); --color-ring: hsl(var(--ring));
  --color-header: hsl(var(--header-bg)); --color-header-foreground: hsl(var(--header-foreground));
  --color-fia-sourced: hsl(var(--fia-sourced)); /* …and the rest of the fia-* and wb-* tokens */
  --radius-lg: var(--radius); --radius-md: calc(var(--radius) - 2px); --radius-sm: calc(var(--radius) - 4px);
}
```

**Not React, or charts drawn in Python:** take the hex values from `tokens.json`.

---

## 1. The rules

These are stated in the site's code comments and in `docs/DECISIONS.md`. They are what makes the
site look deliberate rather than templated, so they matter more than any single value.

1. **Light only.** No dark theme. Tailwind's `darkMode` stays `["class"]` and nothing ever sets the
   class, so the vendored shadcn `dark:` variants can never switch on (`media` would half-darken the
   page under an OS dark preference).
2. **The accent is navy, `hsl(215 60% 32%)` (#214983).** It replaced emerald, which failed WCAG AA as
   text, as a focus ring and on cards. Navy clears AA in every role (8.58:1 on the page) and shares
   hue 215 with the ink, so the site reads as one system.
3. **Green has two jobs and no others:** the Green Transition section's identity, and success states.
   Never a link, a button, a focus ring or a hover.
4. **Never use the accent on the dark header.** Navy on `#1f2937` is 1.64:1. On the header, use white
   at 80% (9.89:1) and mark active items with `bg-white/10`; invert badges (light chip, dark type).
5. **Quiet hovers use `--secondary`, never `--accent`.** Stock shadcn hovers `ghost`/`outline` buttons
   with `bg-accent` because its accent is a light grey. Here the accent is a brand colour, so the
   site's button variants hover with `bg-secondary`.
6. **Colour never carries meaning alone.** Every state that has a colour also has a glyph, a pattern
   or a word: ▲ ▼ Δ ✎ ● for cell roles, filled/half/quarter/empty discs for status, hatching for an
   unsplit remainder, dashed for a projection, words on every legend chip.
7. **Serif prose under sans headings.** Spectral for reading and for page/section titles; Plus Jakarta
   Sans for UI, navigation and headings *inside* an essay body. A data viewer uses the sans only.
8. **Tokens only.** Components never name a font family or a hex; every colour is `hsl(var(--token))`.
   The exceptions are the hero palette, the chart series and the share card, each defined once.
9. **44px touch targets.** Every control under a finger is at least 44 × 44 (`min-h-11`, `min-h-[44px]`);
   dense grid rows may close to 28px only under `(pointer: fine)`.
10. **No horizontal page scroll at 375px.** Long tokens wrap (`overflow-wrap: break-word`), wide tables
    scroll inside their own wrapper, rows of chips scroll sideways in their own strip.
11. **Reduced motion means none.** A global block zeroes every animation and transition, CSS included.
12. **Subtraction over decoration.** Lists are `divide-y` rows rather than card grids; no icon chips,
    no six parallel one-line descriptions, no "Enter →". Numbering only where the order is real
    (a learning sequence), never on peers, where it reads as rank.
13. **One number format** for data (§10.1): `1,234.5`, `(665)`, `15.5%`, `—` for empty.
14. **Focus is always visible:** `focus-visible:ring-2 ring-ring ring-offset-2` (or `ring-inset` inside
    grids and strips). A control revealed on hover is also revealed on focus.

---

## 2. Colour

Values are HSL triplets in `tokens.css`; the hex is what they resolve to. Contrast ratios are WCAG
2.x, measured.

### 2.1 Surfaces and ink

| Token | HSL | Hex | Used for |
|---|---|---|---|
| `--background` | `0 0% 98%` | `#fafafa` | The page |
| `--foreground` | `215 25% 17%` | `#212a36` | Body ink (13.88:1 on page) |
| `--card` | `200 40% 96%` | `#f1f6f9` | Cards, footer, grid panels, sticky grid columns |
| `--card-foreground` | `215 25% 20%` | `#263140` | |
| `--popover` | `0 0% 100%` | `#ffffff` | Popovers, dialogs, inspector, workbook |
| `--secondary` | `200 30% 94%` | `#ebf1f4` | Quiet hover, selected tab/row surface |
| `--muted` | `200 20% 92%` | `#e7ecef` | Skeletons, the fiscal-year column, row headers |
| `--muted-foreground` | `215 15% 45%` | `#627084` | Secondary text (4.82:1 on page, 4.63:1 on card) |
| `--border`, `--input` | `215 20% 88%` | `#dadfe7` | Every rule and outline |
| `--header-bg` | `215 28% 17%` | `#1f2937` | Sticky header, nav menus (measured live) |
| `--primary` | `215 28% 17%` | `#1f2937` | Primary button fill, the current pill/segment |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | 14.68:1 on primary |
| `--button-dark` | `215 30% 13%` | `#171f2b` | |

### 2.2 Roles

| Token | Hex | Rule |
|---|---|---|
| `--accent`, `--ring`, `--link-primary`, `--nav-active` | `#214983` | Links, focus ring, active rails. Not on the dark header |
| `--destructive` | `#cf3030` | Errors (4.89:1) |
| `--section-green` | `#21c45d` | Green Transition identity and success only. 2.21:1: never text |
| `--accent-editorial` | `#ff6719` | Essay blockquote rail, callout tint (8%), "New" badge, link-popover ring. 2.79:1: a field or rail, never body text |

### 2.3 Editorial ink

| Token | Value | Used for |
|---|---|---|
| `--prose-ink` | `rgb(54,55,55)` `#363737` | Essay body and in-body headings (11.44:1) |
| `--prose-muted-ink` | `rgb(119,119,119)` `#777777` | Essay subtitle |
| `--prose-rule` | `0 0% 90%` `#e6e6e6` | `<hr>` in an essay |

### 2.4 Data-cell states

Finance in Action (the model viewer) and the consolidation workbook. Each pair that must be told
apart also differs in lightness (precedent L95 vs dependent L86).

| Token | Hex | Meaning | Paired with |
|---|---|---|---|
| `--fia-sourced` | `#0d4f9c` | A figure read from a filing (text colour) | word "Sourced" |
| `--fia-assumption-bg` / `-fg` | `#dff6e8` / `#0f572d` | An editable forecast assumption (fill + text, 7.63:1) | word "Assumption" |
| `--fia-missing` | `#535a65` | Not disclosed: `—`, italic | word "Not disclosed" |
| `--fia-cost` | `#aa5218` | A named cost bar (white label 5.34:1) | legend word |
| `--fia-unsplit` | `#818a98` | Hatch stroke of an unsplit remainder | `.fia-hatch` pattern |
| `--fia-precedent` | `#e7f2fe` | Feeds the selected cell | ▲ |
| `--fia-dependent` | `#fdd9b9` | Fed by the selected cell | ▼ |
| `--fia-changed` | `#fff3c2` | Changed by the reader's edit (flashes once) | Δ |
| `--fia-edited` | `#126836` | 2px outline on a cell the reader edited | ✎ |
| `--wb-red` / `--wb-blue` | `#b81e1e` / `#0b18cb` | The Excel file's own red and blue type | |
| `--wb-error-bg` / `-fg` | `#fde7e7` / `#8f1919` | `#REF!`, `#DIV/0!` cells (7.65:1) | the error text |

### 2.5 Palettes outside the tokens

Defined once each, in the files named.

- **Hero** (`src/components/hero/WeaveHero.tsx`): cream `#F4F1EA`, ink `#1E2761` (12.26:1 on cream),
  terracotta weft `#C2694A`, weft fibre `#D98B6E`, link `#0070C0`. See §13.
- **Chart series** (`src/lib/transition/model.ts`), in this order, validated on `#fafafa` (adjacent CVD
  ΔE ≥ 9.1): `#0070c0` `#eb6834` `#1baf7a` `#eda100` `#e87ba4` `#008300` `#6250d6` `#e34948`. A
  chart with one line always uses `#0070c0`. Colour follows the member, never its rank.
- **Chart structure** (`src/components/transition/TransitionChart.tsx`): axis/crosshair `#1E2761`,
  gridlines `hsl(215 20% 88%)`, tick labels `hsl(215 15% 45%)`, policy markers `#9a3412` (only use).
- **Peer bars**: one neutral ramp, the subject first: `bg-foreground`, `/55`, `/35`, `/20`.
- **Share card** (`scripts/lib/shareCard.mjs`): `#f8f7f4` ground, `#0f172a` ink, `#334155` label.

### 2.6 Known contrast debts (do not copy blindly)

- `--prose-muted-ink` `#777777` on `#fafafa` is **4.29:1**, under AA's 4.5:1 for the 18px subtitle. If the
  Lab uses it for text under 24px, darken it to `#6b6b6b` (5.07:1) or use `--muted-foreground`.
- Footnote markers are drawn in `--accent-editorial` (2.79:1). Fine as a marker the reader can also
  reach by its number; not fine for words.

---

## 3. Type

### 3.1 Families

| Token | Family | Weights loaded | Role |
|---|---|---|---|
| `--font-sans` | Plus Jakarta Sans | 400–800 (one variable file, 27 KB) | All UI, nav, body of non-essay pages, essay in-body headings, data viewers |
| `--font-serif` | Spectral | 400, 700, upright and italic (static, ~22 KB each) | Essay prose, essay title/subtitle, card titles and decks |
| `--font-display` | Spectral | (same files) | Every `h1`–`h6` by default |
| `--font-hero` | Source Serif 4 | 500 | The homepage headline only |
| mono | system `ui-monospace` stack | | Eyebrows, ordinal numbers, tickers, source codes |

Self-hosted, latin subset only (the content is English and Indonesian), `font-display: swap`. Zero
third-party font requests. Note that Spectral has no 600 file: the many `font-semibold` headings
resolve to the 700 file by the browser's font matching, so on the live site "semibold" Spectral is
Spectral Bold. Keep it that way, or add a 600 file on purpose.

### 3.2 Base rules

- `body`: sans, `--foreground` on `--background`, antialiased.
- `h1`–`h6`: `font-display font-semibold tracking-tight` (Spectral, 600, −0.025em).
- Inside a data viewer (`.fia-viewer`) headings switch to the sans, normal tracking.

### 3.3 The scale as used

Counted across `src/`: `text-sm` is the workhorse (375 uses), then `text-xs` (198).

| Role | Classes | Rendered |
|---|---|---|
| Page title, landing | `text-3xl md:text-4xl font-display font-bold mb-2` | Spectral 30 → 36px |
| Page title, data/detail | `text-3xl font-semibold leading-tight text-foreground` | Spectral 30px |
| Section heading | `text-2xl font-semibold text-foreground mt-16 mb-6` | 24px |
| Small section heading | `text-xl font-display font-semibold text-foreground` | 20px (e.g. "Glimpse") |
| Card title | `font-display text-lg font-semibold leading-snug` | Spectral 18 / 24.75px |
| Lede | `text-base text-muted-foreground leading-relaxed`, `max-w-2xl` | 16 / 26px |
| Body UI | `text-sm` | 14 / 20px |
| Meta, captions | `text-xs text-muted-foreground` | 12 / 16px |
| Eyebrow | `.eyebrow` | mono 11px, uppercase, 0.18em |
| Small caps label | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | 12px, 0.05em |
| Micro label (grid) | `text-[10px]`, `text-[11px]` | |

### 3.4 The editorial type system

One set of rules for the writing canvas (`.essay-prose`) and the published page
(`.prose-editorial`), so what the writer sees is byte-for-byte what the reader gets. Measured from
Substack's writing surface.

| Element | Value |
|---|---|
| Column | explicit `width: 728px`, centred; `max-width: 100%` only as the phone guard |
| Body | Spectral 400, **19px / 30.4px (1.6)**, `#363737`, `overflow-wrap: break-word` |
| Paragraph | `margin: 0 0 20px` |
| In-body h1 / h2 | **Plus Jakarta Sans 700**, 2em / 1.625em, line-height 1.16, `margin: 1em 0 0.625em` |
| h3 / h4 / h5 / h6 | 1.3em / 1.125em / 1em / 0.875em |
| Lists | `margin 0 0 19px; padding-left 1.75rem`; `li` margin-top 8px |
| `hr` | 1px `#e6e6e6`, margin 32px 0 |
| Blockquote | 4px `#ff6719` rail, text 20px in from it, **not italic**, body size |
| Pull quote | no rail, centred, 1.375em / 1.45, margin 32px 0 |
| Callout | `#ff6719` at 8% fill, radius 8px, padding 16px 20px |
| Inline code | mono at body size, no pill, no background |
| Code block | `--muted` fill, radius 6px, padding 14px 16px, 0.8125em / 1.55 |
| Block math | centred, margin 24px 0, scrolls sideways |
| Figures | up to `min(780px, 100vw − 2rem)`: wider than the text |
| Tables | `border-collapse`, `text-sm`; `th` `border bg-muted/50 px-3 py-2 font-semibold`; `td` `border px-3 py-2 align-top`; wrapper `overflow-x-auto` |
| Title | `.editorial-title`: Spectral 700, 32 / 36px |
| Subtitle | `.editorial-subtitle`: Spectral 400, 18 / 24px, `#777777` |
| Reader size control | S = 17px, M = 19px (default, no class), L = 21px, all at 1.6 |

### 3.5 Numbers

Every figure in a table, grid, chart label, count or KPI is `tabular-nums` (52 uses). Ordinals in
lists are mono: `text-sm font-mono text-muted-foreground tabular-nums`, zero-padded (`01`, `02`).

---

## 4. Layout and spacing

### 4.1 Breakpoints

Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536, plus `pointer-fine`
(`(pointer: fine)`). Site-specific switches:

| At | What changes |
|---|---|
| < 768 | Hero stacks (text, then weave in the bottom 38%) |
| `lg` 1024 | Article grows its TOC rail; Glimpse becomes a 5-column grid |
| `xl` 1280 | Desktop nav replaces the drawer; model inspector can sit beside the grid |
| 1400 | Container stops growing |
| 1440 | Model inspector opens by default |

### 4.2 Container and columns

- `container`: centred, `padding-inline: 2rem`, fluid until 1400px, capped at 1400px.
- Header row: `container max-w-[1920px] px-4`.
- Page columns (`src/components/layouts/pageColumn.ts`): `reading` = `container max-w-3xl` (48rem),
  `wide` = `container max-w-6xl` (72rem), `full` = `container`. The breadcrumb sits in the same column
  as the page so they share a left edge.
- Article: `mx-auto max-w-3xl lg:max-w-[64rem] lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12`
  (text column + 13rem TOC rail).
- Detail with aside: `grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]` (chart pages).
- Data card with inspector: `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem]`.
- Writing surface: `max-w-[52rem]`.

### 4.3 Vertical rhythm

| Pattern | Classes |
|---|---|
| Page body | `container py-8` (most), `py-10`, `py-12`; article `py-8 md:py-12` |
| Home section | `border-b border-border py-12` |
| Footer | `py-12`, inner grid `gap-8`, legal row `mt-12 pt-8 border-t` |
| Lede → content | `mb-10` |
| Section → section | `mt-16` on the heading, or `border-t border-border pt-10 mt-16` |
| Card grid gap | `gap-4` (tight) to `gap-6` |
| Stacks | `space-y-1`, `-2`, `-4` most common |
| Gaps | `gap-2` (125 uses), `gap-4`, `gap-3`, `gap-1.5` |

### 4.4 Common grids

| Use | Classes |
|---|---|
| Track cards | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| Related essays | `grid gap-6 md:grid-cols-3` |
| KPI tiles | `grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5` |
| Driver cards | `grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| Footer | `grid grid-cols-1 md:grid-cols-4 gap-8` (brand spans 2) |
| Numbered list row | `grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-5` |
| Company list row | `grid grid-cols-[4.5rem_minmax(0,1fr)]`, from `md` `[4.5rem_minmax(0,1fr)_8rem_6.5rem_6.5rem_minmax(0,12rem)]` |

### 4.5 Sticky offsets

Header `sticky top-0` 64px (+1px rule). Everything that sticks under it uses `top-16`; the article
TOC uses `top-32`; anchored headings `scroll-mt-32`, anchored cards `scroll-mt-24`.

---

## 5. Shape: radius, borders, shadows, z-index

- **Radius:** `--radius: 0.5rem` → `rounded-lg` 8px (cards, panels, dialogs), `rounded-md` 6px
  (buttons, inputs, menus; the most used), `rounded-sm` 4px (chips, cells), `rounded-full` (pills,
  round icon buttons, status chips). Nothing larger than `rounded-xl` (12px, two uses).
- **Borders:** 1px `border-border` almost everywhere (214 uses). Emphasis by weight and dash, not
  colour: `border-b-2 border-foreground` for the current tab, `border-dashed` for "not yet" or
  "layer", `border-l-2` rails for notes, `border-foreground/40 [border-left-style:dashed]` for the
  forecast boundary.
- **Shadows:** sparse. `shadow-sm` on cards and the active segment, `shadow-md` on popovers and
  tooltips, `shadow-lg` on dialogs, sheets and menus, `shadow-xl` on the header's nav menus. Cards
  are flat with a border by default; shadow comes on hover only in a few legacy places.
- **z-index:** header `z-50`; sub-nav and reading progress `z-40`; article toolbar and data section
  nav `z-30`; grid internals `z-10/20/30`; dialogs, sheets, menus `z-50`; link popover `z-[70]`;
  skip link and toasts `z-[100]`.

---

## 6. Site chrome

### 6.1 Header

- `header`: `sticky top-0 z-50 bg-header border-b border-header/20`, height 64px (+1px rule = 65).
- Row: `container max-w-[1920px] mx-auto flex min-h-16 flex-wrap items-center justify-between gap-x-4 px-4`.
  Wraps rather than hides when the reader's font is large.
- Logo: `/logo.png` (400 × 400 JPEG, an orange-and-blue lantern mark) at `h-8 w-8 object-contain` in a
  44 × 44 link to `/`; `hover:opacity-80`. Icon only, no wordmark.
- Nav links: `.nav-link` = `px-3 py-2 text-sm font-medium text-white/80 hover:text-white rounded-md`,
  focus `ring-2 ring-white/40`; active adds `text-white bg-white/10`. Measured live: Plus Jakarta Sans
  14px / 500, padding 8 × 12.
- Desktop nav from `xl`; below that a hamburger (`Menu h-6 w-6`, 44 × 44 ghost button).
- Sign In is hidden beside the logo, revealed on hover and on focus (`opacity-0
  group-hover:opacity-100 group-focus-within:opacity-100`).
- Admin badge on the dark header is inverted: `bg-primary-foreground text-primary text-xs font-bold uppercase tracking-wide`.

### 6.2 Nav dropdown

Split trigger: the label is a link, the chevron (`ChevronDown h-3.5 w-3.5`, `rotate-180` open,
`duration-200`) toggles. The 44 × 28 chevron hit area is the full header height.

- Panel wrapper: `absolute top-full z-50 pt-1` (the 4px gap is padding so the pointer never leaves
  the hit area); `right-0` for the last menu in the row.
- Panel: `bg-header border border-header/50 rounded-lg shadow-xl py-2`, width `w-48` to `w-72`.
- Item: `block px-4 py-2 text-sm text-header-foreground/90 hover:bg-white/10 hover:text-header-foreground focus:bg-white/10`; current item `bg-white/10`.
- Opens on hover, closes 150ms after the pointer leaves; one menu open at a time; arrow keys move;
  Escape closes and returns focus.

Navigation structure: Home · Foundations of Knowing · Accounting ▾ (FSLI Detail, Consolidated
Reporting, Statutory Reporting) · Finance ▾ (Fundamentals, Strategic Finance, Planning & Forecasting,
Financial Analytics, Capital in Motion, Finance in Action) · Green Transition ▾ (Where We Are Now,
Challenges Ahead, Pathways Forward, Climate Finance) · The Next Big Thing ▾ · Learning ▾ (Books,
IELTS). Admin adds Finance Workspace and Writer's Studio.

### 6.3 Mobile drawer

shadcn `Sheet side="right"`, `w-80 overflow-y-auto p-0`. Header `p-6 pb-4 border-b`, title
"Navigation". Rows: `flex min-h-[44px] items-center py-3 px-4 font-medium hover:bg-secondary rounded-lg`;
active `bg-secondary text-primary`. A section with children is a split row (label link + 44px
chevron button); children indent `ml-4 pl-4 border-l border-border`, `text-sm`. Admin and auth
blocks sit under `pt-4 border-t`.

### 6.4 Breadcrumb bar

Bar: `bg-muted/30 border-b border-border py-3`, content in the page's column. Trail: `flex flex-wrap
items-center gap-x-2 gap-y-1 text-sm text-muted-foreground`; separators `ChevronRight w-4 h-4`; first
crumb has a `Home w-4 h-4` icon; last crumb `text-foreground font-medium break-words`. It wraps: long
titles never push the page sideways.

### 6.5 Section sub-nav (underline tabs)

`border-b border-border bg-background/95 backdrop-blur sticky top-16 z-40`, inner `container max-w-4xl`,
row `flex items-center gap-2 overflow-x-auto`. Optional back link (`ArrowLeft h-4 w-4`, label from
`sm`) then a `w-px h-6 bg-border` divider. Tab: `flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2`;
current `border-primary text-foreground`; other `border-transparent text-muted-foreground
hover:text-foreground hover:border-border`.

### 6.6 Footer

`bg-card border-t border-border py-12`; `grid grid-cols-1 md:grid-cols-4 gap-8`. Brand column
(`md:col-span-2`): logo, a one-sentence tagline `text-muted-foreground text-sm max-w-md mb-4`, LinkedIn
and email links (`Linkedin`/`Mail h-4 w-4`, `text-sm text-muted-foreground hover:text-foreground`).
Two link columns with `h4 font-semibold text-foreground mb-4` and `ul space-y-2 text-sm`. Legal row
`mt-12 pt-8 border-t text-center text-sm text-muted-foreground`.

### 6.7 Skip link

`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground`.

---

## 7. Core components

### 7.1 Button (shadcn, edited)

Base: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium
transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:opacity-50 [&_svg]:size-4`.

| Variant | Classes |
|---|---|
| default | `bg-primary text-primary-foreground hover:bg-primary/90` (slate `#1f2937`, white) |
| destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| outline | `border border-input bg-background hover:bg-secondary hover:text-secondary-foreground` ← edited |
| secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| ghost | `hover:bg-secondary hover:text-secondary-foreground` ← edited |
| link | `text-primary underline-offset-4 hover:underline` |

Sizes: default `h-10 px-4 py-2`, `sm` `h-9 px-3`, `lg` `h-11 px-8`, `icon` `h-10 w-10`. In data
surfaces buttons are `h-11` (44px). The two edits against stock shadcn: `outline`/`ghost` hover with
`secondary` not `accent` (rule 5), and the Sheet close button is 44 × 44
(`flex min-h-[44px] min-w-[44px] items-center justify-center`, `data-[state=open]:bg-secondary`).

**Tool button** (data toolbars): `inline-flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground hover:bg-secondary`.
**Icon tool**: `inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-secondary`.
**Round icon button** (carousel arrows, pause): `inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-muted disabled:opacity-30`.
**Text action**: `text-accent underline underline-offset-2 hover:opacity-80` (or `hover:underline`).

### 7.2 Chips and badges

| Kind | Classes |
|---|---|
| shadcn Badge | `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`; variants default/secondary/destructive/outline |
| Eyebrow chip | `.eyebrow-chip text-primary border-primary/30` (mono 11px caps, `border rounded px-1.5 py-0.5`): "Featured", "Start here" |
| Legend chip | `inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-1.5 py-0.5 text-xs` + a sample in the state's colour |
| Count pill | `inline-flex items-center rounded-full border border-border px-2 text-[11px] font-medium leading-4 tabular-nums` |
| Inline kind tag | `inline-flex rounded-sm border border-border px-1.5 py-0.5 text-xs font-medium` + state class |
| Synthetic/draft tag | `rounded border border-dashed border-foreground/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider` |
| Status chip (world) | `rounded-full border px-2.5 py-0.5 text-xs`; published = accent border and text |

### 7.3 Pills, tabs, segmented controls

- **Stage pill** (filter/anchor row): `inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm`; current `border-foreground bg-foreground text-background`; other `border-border bg-card text-foreground hover:border-foreground`; a "layer" kind is `border-dashed`. Count beside the label in `tabular-nums text-muted-foreground` (inverted when current). Row `flex gap-2 overflow-x-auto`.
- **Underline tabs**: §6.5; in data cards `min-h-11 px-3 text-xs font-semibold border-b-2`, current `border-foreground text-foreground`.
- **Sheet tabs** (spreadsheet foot): `min-h-11 shrink-0 border-x border-b-2 border-t-0 px-4 text-sm font-medium`; active `border-x-border border-b-foreground bg-card text-foreground`; other `border-x-transparent border-b-transparent text-muted-foreground hover:text-foreground`. Tabs hang from the grid (`-mb-px`).
- **Segmented control** (chart range): `inline-flex overflow-hidden rounded-md border border-border`; segment `px-3 py-1`; on `bg-primary text-primary-foreground`; off `bg-background text-foreground hover:bg-muted`. `aria-pressed`.
- **Text-size toggle** (radiogroup): `flex items-center gap-1 bg-muted rounded-lg p-1`; option `px-3 py-1.5 text-sm font-medium rounded`; on `bg-background text-foreground shadow-sm`; off `text-muted-foreground hover:text-foreground`. Label "Text" `text-xs px-2` from `sm`.
- **Company tab** (entity switcher): box `relative flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-1`; current `border-foreground bg-secondary`; not built `border-dashed border-border`; link `border-border bg-card hover:border-foreground`. A 28px monogram `h-7 w-7 rounded-md border bg-muted text-[11px] font-semibold` (two letters of the ticker), ticker `text-sm font-semibold`, status under it `text-[11px]`. Groups separated by `ml-2 border-l border-border pl-4` with a caps label.

### 7.4 Form controls

- Input / Select trigger: `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. In data filters `h-11`.
- Textarea: `min-h-[80px]`, same border and ring.
- Label: `text-sm font-medium leading-none`; field group `space-y-1.5`.
- Switch: `h-6 w-11 rounded-full border-2 border-transparent`, on `bg-primary`, off `bg-input`; thumb `h-5 w-5 bg-background shadow-lg`, `translate-x-5`.
- Radio: `h-4 w-4 rounded-full border border-primary`.
- Native select in toolbars: `h-11 rounded-md border border-input bg-background px-3 text-sm`.
- Search with icon: wrapper `relative`, icon `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`, input `pl-9`.
- Filter panel: `space-y-4 rounded-md border border-border bg-card p-4`, `grid gap-4 md:grid-cols-2`.

### 7.5 Overlays

| | Classes |
|---|---|
| Dialog overlay | `fixed inset-0 z-50 bg-black/80`, fade |
| Dialog | `max-w-lg gap-4 border bg-background p-6 shadow-lg`, `duration-200`, fade + zoom 95 + slide; title `text-lg font-semibold leading-none tracking-tight`; description `text-sm text-muted-foreground`; footer `flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2` |
| Sheet | `bg-background p-6 shadow-lg`, open 500ms, close 300ms; side sheets `w-3/4 sm:max-w-sm` |
| Popover | `w-72 rounded-md border bg-popover p-4 shadow-md` |
| Dropdown menu | `min-w-[8rem] rounded-md border bg-popover p-1 shadow-lg`; item `rounded-sm px-2 py-1.5 text-sm`; separator `-mx-1 my-1 h-px bg-muted` |
| Tooltip | `rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md` |
| Toast (sonner) | `bg-background text-foreground border-border shadow-lg`; action `bg-primary`; bottom-right, `md:max-w-[420px]` |
| Field error bubble | `absolute top-full mt-1 w-max max-w-[18rem] rounded-sm border border-border bg-popover px-2 py-1 text-xs text-destructive shadow-sm` |
| Image lightbox | `max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur-sm`; close `absolute top-4 right-4 p-2 bg-background rounded-full shadow-lg` |

### 7.6 Notes and banners

- **Rail note** (genre, context): `border-l-2 border-border pl-4`, eyebrow + `text-[15px] leading-relaxed text-muted-foreground`.
- **Revision note** (stronger): `border-l-2 border-foreground bg-muted/40 py-3 px-4`, eyebrow in `text-foreground`.
- **Dashed note** (synthetic data, caveat): `flex items-start gap-3 rounded-md border border-dashed border-foreground/40 bg-muted/60 px-4 py-3 text-sm`, a leading `h-4 w-4` icon.
- **Unavailable block**: `rounded-md border border-dashed border-border px-4 py-6 text-center text-sm font-medium`.
- **Restore banner** (writer): full-width `border-b bg-amber-50 px-4 py-3` holding a borderless Alert.
- **Alert**: `rounded-lg border p-4`, icon absolutely placed `left-4 top-4`; destructive `border-destructive/50 text-destructive`.

### 7.7 States

- **Empty**: `flex flex-col items-center justify-center py-12 px-4 text-center`; icon in `rounded-full bg-muted p-3 mb-4` (`h-6 w-6 text-muted-foreground`); title `text-lg font-semibold mb-2`; message `text-sm text-muted-foreground max-w-md mb-4`; optional primary button with `Plus`.
- **Error**: same frame; icon disc `bg-destructive/10`, `AlertCircle h-6 w-6 text-destructive`; "Try again" outline button with `RefreshCw`. Copy says what failed and that it is temporary, never "no content".
- **Loading**: skeletons only (`animate-pulse rounded-md bg-muted`), shaped like what comes: cards (`rounded-lg border bg-card p-6 space-y-4` with lines `h-4 w-3/4`, `h-3 w-full`, `h-3 w-2/3`), list rows (`h-12 w-12` thumb + two lines), article (`h-8 w-2/3` title, `h-4` lines), table (four `w-1/4` cells per row). Placeholders hold the final size (`h-48`, `h-72`, `min-h-[min(70vh,44rem)]`) so nothing shifts. No spinners on reading surfaces; `Loader2 animate-spin` only in the writer and admin.
- **404**: centred, `min-h-screen`; `404` in `text-sm font-medium uppercase tracking-widest text-muted-foreground`; `h1 text-3xl font-display font-bold`; a "Did you mean" card `rounded-md border bg-card p-4 text-left`; primary and outline 44px buttons.

---

## 8. Reading surface

The essay page (`ArticleShell`). See `screenshots/desktop-essay*.png`.

- **Toolbar**: `sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border`, inner `container max-w-3xl lg:max-w-[64rem] py-2 flex items-center justify-end gap-2`: Share (`min-h-[44px] gap-1.5 px-2 text-sm text-muted-foreground`, `Link2`/`Share2`/`Check`) and the S/M/L text-size toggle.
- **Reading progress**: `sticky top-16 h-0.5 z-40 bg-muted/30`, bar `bg-primary origin-left`, driven by `transform: scaleX()` in rAF (compositor only).
- **Header**: kicker row `mb-6 border-b border-border pb-3` with `text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground`; `.editorial-title mb-4`; `.editorial-subtitle mb-6`; meta row `flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm text-muted-foreground border-b border-border pb-6 mb-8` (topic in `text-xs font-mono uppercase tracking-wide`, author `font-medium text-foreground`, date, read time). Hero image `w-full rounded-lg` with caption `text-sm text-muted-foreground mt-3 text-center italic`.
- **TOC rail** (`lg` up): `sticky top-32`; label `mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground` ("On this page"); list `max-h-[calc(100vh-12rem)] overflow-y-auto border-l border-border`; item `-ml-px border-l-2 py-1.5 pr-2 text-left leading-snug`, `pl-4` (h2) / `pl-7` (h3); current `border-primary font-medium text-primary`; other `border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground`.
- **TOC collapsible** (below `lg`): `border border-border rounded-lg mb-8`, trigger `px-4 py-3 text-sm font-medium hover:bg-muted/50` with `List` icon.
- **Heading anchors**: a copy-link button `ml-2 p-1.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted`.
- **Key takeaways**: `bg-muted/50 border border-border rounded-lg p-6 my-10`; heading `font-semibold mb-4`; `ol list-decimal space-y-3 pl-5 text-muted-foreground marker:text-foreground`.
- **References**: `border-t border-border pt-8 mt-10`; heading with `BookOpen h-5 w-5`; `ol space-y-2 text-sm list-decimal list-inside text-muted-foreground`; links with `ExternalLink h-3 w-3`.
- **Footnotes**: `mt-12 border-t border-border pt-6`, `text-[0.875em] text-prose-muted`.
- **Link card** (embedded link): `my-8 block rounded-lg border border-border bg-card p-4`; source line `text-xs font-medium uppercase tracking-wide text-muted-foreground` with `ExternalLink h-3.5 w-3.5`; title `mt-1 font-semibold leading-snug`; description `mt-1 text-sm leading-relaxed text-muted-foreground`; author · date `mt-2 text-xs`. Never an iframe.
- **Image / figure**: `my-8`; frame `relative bg-muted rounded-lg overflow-hidden` with a pulse placeholder; image fades in (`transition-opacity duration-300`); caption `mt-3 text-sm text-muted-foreground`, source in italics with an accent link. Failure: `ImageOff h-12 w-12 opacity-50`, "Image failed to load". Figures zoom on click (hover veil `bg-black/30`, pill `bg-background/90 px-3 py-2 rounded-md` with `ZoomIn`).
- **Embedded chart**: `my-10 rounded-md border border-border bg-muted/40 p-4 sm:p-5` (§11).
- **Prev / next**: `border-t border-border pt-8 mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4`; each `group flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30`; label `text-xs text-muted-foreground mb-1`; title `text-sm font-medium group-hover:text-primary line-clamp-2`; chevron `h-5 w-5`.
- **Related essays**: `border-t border-border pt-10 mt-16`, `h2 text-xl font-display font-semibold mb-6`, `grid gap-6 md:grid-cols-3`; image `aspect-[16/9] rounded-lg mb-4` scaling to 105% on hover (300ms).
- **Author box**: `border-t border-border pt-8 mt-10`, `w-16 h-16 rounded-full` photo, name `font-semibold`, bio `mt-1 text-sm text-muted-foreground`.

### 8.1 Writing surface

- Top bar: `border-b border-border/60 bg-background`, inner `mx-auto flex h-12 max-w-[52rem] items-center justify-between gap-2 px-4`: back ghost button ("Posts"), a status line `text-xs text-muted-foreground truncate` (saving `Loader2 h-3 w-3 animate-spin`; offline `CloudOff h-3.5 w-3.5 font-medium text-destructive`), Preview ghost and Publish `Button size="sm"`.
- Canvas: `mx-auto w-full max-w-[52rem] pb-32 pl-10 pr-4 pt-12 sm:pl-16`; the left gutter holds the `+` insert button at `-left-8`. Title and subtitle are borderless textareas with `.editorial-title` / `.editorial-subtitle`, placeholders at `muted-foreground/40` and `/30`.
- Empty-paragraph placeholder: `::before` with `content: attr(data-placeholder)` in `hsl(var(--muted-foreground) / 0.6)`.
- Selected figure: `outline: 2px solid hsl(var(--primary)); outline-offset: 2px; border-radius: 0.5rem`.
- Toolbar icon buttons `h-8 w-8 text-foreground/80`, active `bg-secondary text-foreground`.
- Posture: formatting appears only in an 8-action bubble menu on selection (bold, italic, strikethrough, link, heading, subheading, quote, list); no word count, no validation while drafting; validation speaks only in the publish dialog. The save chip never animates.

---

## 9. Listing pages

The reference page is `/finance` (`screenshots/desktop-finance-landing.png`).

- Skeleton: `PageLayout width="reading"` → breadcrumb bar, then `py-8 container max-w-3xl`.
- Title `text-3xl md:text-4xl font-display font-bold mb-2`; lede block `mb-10 max-w-2xl`, paragraphs `text-base text-muted-foreground leading-relaxed`, spaced `mt-3`.
- **Featured block**: `block border border-border rounded-lg p-8 mb-12 hover:border-primary/40 transition-colors group`; eyebrow chip; title `text-2xl md:text-3xl font-display font-semibold mb-3 group-hover:text-primary`; deck `text-muted-foreground text-lg leading-relaxed`; meta `flex gap-4 mt-4 text-sm text-muted-foreground`.
- **Numbered card** (a real order): `flex items-start gap-4 rounded-lg border border-border p-5 hover:border-primary/40 h-full`; number `text-lg font-mono font-bold text-muted-foreground tabular-nums` zero-padded; title `font-semibold group-hover:text-primary`; description `text-sm text-muted-foreground leading-relaxed`; trailing `ArrowRight h-4 w-4 mt-1`.
- **Numbered row** (curriculum): `grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-5 -mx-3 px-3 rounded hover:bg-muted/30`; `01` in `text-sm font-mono text-muted-foreground tabular-nums`; title `text-base font-semibold leading-snug group-hover:text-primary`; thesis `text-sm text-muted-foreground mt-1 line-clamp-1`; right column `text-xs text-muted-foreground tabular-nums` ("3 of 8 published").
- **Plain list**: `divide-y divide-border` rows, title only, the row is the link (rule 12).
- **Feed row**: `py-8` rows in `divide-y`; `flex flex-col sm:flex-row gap-6`; thumb `sm:w-48 aspect-[16/10] sm:aspect-[4/3] rounded-lg bg-muted`; badges `variant="secondary"`/`outline` `text-xs`; title `text-xl font-semibold group-hover:text-primary line-clamp-2`; deck `text-muted-foreground line-clamp-2`.
- Hover language everywhere: border to `primary/40` (or `foreground`), title to `text-primary` (or `text-accent`), `transition-colors`. No lift, no shadow.

### 9.1 Homepage "Glimpse"

`screenshots/desktop-home.png`. Section `border-b border-border py-12`; `container flex flex-col gap-6
lg:grid lg:grid-cols-5 lg:gap-x-8`: three pinned columns (still) and, behind a 1px rule at
`left: -1rem`, a running row of two columns.

- Column: eyebrow `mb-3` (section name), title `mb-3 font-display text-lg font-semibold leading-snug group-hover:text-accent`, deck `mb-4 line-clamp-5 font-serif text-sm leading-relaxed text-muted-foreground`, month `mt-auto text-xs text-muted-foreground`. No badge, no author, no reading time.
- Below `lg` the pins scroll sideways (`w-64` → `sm:w-72`, `gap-2rem`, snap). The running row's right edge fades over 3rem (`mask-image`).
- Running row: Embla, `loop`, `dragFree`, AutoScroll at **30 px/s**, stops on hover, hold, focus or its pause button, resumes **3 s** later. Still under reduced motion.

---

## 10. Data surfaces: grids, tables, numbers

The Finance in Action model viewer (`screenshots/desktop-fia-model*.png`) is the densest surface on
the site and the closest to what a lab needs.

### 10.1 Number format (one formatter)

`src/lib/finance-in-action/format.ts`. Written without `Intl`, so output does not depend on the
machine.

| Case | Output |
|---|---|
| Thousands | `1,234.5` (en-US: comma groups, point decimals) |
| Negative | `(665)` in brackets; a value that rounds to zero is never bracketed |
| Empty / not disclosed | `—` (em dash) |
| Percent (a fraction) | `0.155 → 15.5%`, negative `(2.0%)`, one decimal |
| Change | `+12`, `(12)`, `0` |
| Ratio change | `+1.2 pp`, `(1.2 pp)`, `0 pp` |
| Multiple | `3.55x`, two decimals |
| Decimals by size | ≥ 100: 0 (`7,270`); ≥ 10: 1 (`72.7`); < 10: 2 (`2.40`) |

The convention is stated once under each grid and chart: "A comma separates thousands and a point
marks decimals; negatives are in brackets." The site's older house format (point for thousands,
comma for decimals) survives only in the consolidation workbook.

### 10.2 The model grid (spreadsheet)

Laid out as the downloadable workbook: column letters on top, row numbers on the left, period
header in row 1, column A the label, column B the unit.

| Part | Spec |
|---|---|
| Frame | `relative max-h-[min(70vh,44rem)] overflow-auto overscroll-x-contain border-b border-border bg-card` |
| Table | `w-max min-w-full border-separate border-spacing-0 tabular-nums`, font **13px** × zoom |
| Cell rule | `border-b border-r border-border` (no zebra) |
| Row height | 44px under a finger; 28px (rule included) under `pointer: fine`; never under 24px at any zoom |
| Column widths | row numbers 2.5rem; A 9rem (14rem from `sm`); B 8rem (10rem from `lg`); periods ≥ 5.5rem |
| Frozen | row numbers + A always (`sticky left-*`), B from `sm`; letters `top-0`, header row under them; z 10 / 20 / 30 |
| Letters / row numbers | `text-[11px] text-center tabular-nums`, `bg-muted`; highlighted `bg-secondary` for the selection's row/column |
| Header cells | `bg-card px-2 py-1 font-semibold`, periods right-aligned |
| Label column | `bg-card px-2 text-left font-normal`, `truncate`; unit column `text-xs text-muted-foreground` |
| Value cell | button `flex w-full flex-col items-end justify-center px-2`, right-aligned, `whitespace-nowrap` |
| Fiscal-year column | `bg-muted`, header suffix "YEAR" (`text-[10px] uppercase tracking-wider`) |
| Forecast | dashed rule before the first forecast column: `border-l-2 border-l-foreground/40 [border-left-style:dashed]`; header italic, suffix "FORECAST", labels `Q3 26E` |
| Total row | `font-semibold` + rule drawn inside the cells: `shadow-[inset_0_1px_0_hsl(var(--foreground)/0.4)]` |
| Ratio row | `italic` (`Royalty rate`, `Strip ratio`) |
| Selected | `ring-2 ring-inset ring-ring` |
| Focus | `focus-visible:ring-2 ring-inset ring-ring` |
| Glyph / note | `text-[10px]` glyph before the value (▲ ▼ Δ ✎), a delta line under it |
| Zoom | 70–150%, step 10, `−  100%  +` with 44px buttons, hidden below `md` |
| Keyboard | one tab stop; arrows, Home, End move; Enter, F2 or double-click edits an assumption |

### 10.3 Cell kinds and lens roles

| Kind | Class | Legend sample |
|---|---|---|
| Sourced | `text-fia-sourced` | `1,234` Sourced |
| Formula | `text-foreground` | `1,234` Formula |
| Assumption | `bg-fia-assumption-bg text-fia-assumption-fg` | `8.0%` Assumption |
| Missing | `text-fia-missing italic` | `—` Not disclosed |
| Selected ● | `ring-2 ring-ring ring-inset` | |
| Precedent ▲ | `bg-fia-precedent` | |
| Dependent ▼ | `bg-fia-dependent` | |
| Changed Δ | `bg-fia-changed` + one 900ms flash | |
| Edited ✎ | `outline outline-2 -outline-offset-2 outline-fia-edited` | |

Legend: `ul flex flex-wrap items-center gap-1.5 text-xs` of legend chips (§7.2), in the card header
beside its title. Every chip carries a sample, a word and a `title` with the meaning.

### 10.4 The model card and its parts

- **Card**: `rounded-lg border border-border bg-card mb-6 scroll-mt-24`; header `flex flex-wrap items-center gap-x-4 gap-y-1 px-3 sm:px-4` with `h2 text-lg font-semibold` and tool buttons on the right (`ml-auto`). Full screen = `fixed inset-0 z-50 rounded-none`. Footer `border-t px-1 pb-1` holds sheet tabs, a status line and zoom; a note row `border-t px-3 py-2` under it.
- **Formula bar**: `flex min-h-11 items-stretch border-y border-border bg-background text-[13px]`; name box `h-11 w-28 sm:w-36 border-r px-2 text-xs font-semibold tabular-nums`; `fx` in `italic text-muted-foreground border-r px-2.5` (from `lg`); formula text fills the rest.
- **Inspector** (side panel, 22rem): `bg-popover border-border`; `h2 text-base font-semibold`; the value `text-2xl font-semibold tabular-nums` with unit `text-sm text-muted-foreground`; sub-heads `text-xs font-semibold uppercase tracking-wider text-muted-foreground`; sections divided `mt-4 border-t pt-4`. Empty state is one sentence.
- **Status line**: `text-xs text-muted-foreground truncate` ("No cell selected · Model sheet").
- **Key figures** (KPI tiles): `grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5`; tile `flex flex-col rounded-md border border-border bg-card px-3 py-0.5`; label row `text-[11px] leading-4` (caps label + period); value `text-lg font-semibold tabular-nums` + unit `text-xs text-muted-foreground`; year-on-year count pill on the right.
- **Driver card**: `rounded-md border border-border bg-card`, button `min-h-11 p-3`; label `text-xs font-medium text-muted-foreground`; value `mt-1 font-semibold tabular-nums` + unit; a footer link row `border-t px-3 text-xs font-medium text-accent`.
- **Section nav** (in-page): `sticky top-[var(--header-h)] z-30 -mx-4 mb-8 flex items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:-mx-8 sm:px-8`, underline tabs in a `.fia-scroll-row` with `.fia-fade-right` while more is hidden.
- **Company bar** (page header): `h1 text-xl font-semibold leading-6` + ticker `text-base text-muted-foreground`; facts `text-xs leading-5 text-muted-foreground` with accent links.
- **Stage strip**: cards `flex min-h-[5.5rem] flex-col justify-between rounded-md border p-3 hover:border-foreground`; kicker `font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground`; title `text-sm font-semibold leading-snug`; counts `text-xs text-muted-foreground`; min column 7.5rem, then it scrolls.
- **Company list**: `divide-y divide-border border-y border-border`, rows `py-2`; ticker `font-mono text-sm font-semibold`; name link `min-h-11 font-medium hover:text-accent hover:underline`.
- **Status glyph**: a 12px SVG disc, r 5, stroke 1.5 in `currentColor`: Published = filled, Preview = half, In progress = quarter, Not started = empty; always followed by the word.

### 10.5 Plain data tables

The pattern under charts and in the unit-economics and cost-flow sections:

```
wrapper  overflow-x-auto rounded-md border border-border
table    w-full min-w-[36rem|44rem] border-collapse text-sm tabular-nums
caption  sr-only
thead tr border-b border-border text-left
th       px-3 py-2 font-semibold        (numbers: text-right)
tbody tr border-b border-border/60 align-top hover:bg-muted/40
th[row]  px-3 py-2 text-left font-normal
td       px-3 py-2 text-right           (text cells left, text-muted-foreground)
subtotal font-semibold
total    bg-muted/40
```

Compact version (chart value table, change log): `text-xs`, cells `py-1 pr-3`, header
`text-muted-foreground font-medium`. The shadcn `Table` (`h-12 px-4` heads, `p-4` cells,
`hover:bg-muted/50`) is used on one admin page (the audit log) only.

### 10.6 In-surface charts

- **Waterfall** (unit economics): plot 220px tall, column 7.5rem, bar 64% of its column, `rounded-t-[4px]`, min height 1.5rem, value label inside the bar top (`pt-1 text-xs font-semibold tabular-nums`). Revenue and subtotals `bg-primary text-primary-foreground`; named cost `bg-fia-cost text-primary-foreground`; unsplit `.fia-hatch` with the label on a `bg-background` chip. Bars sit in `flex min-w-max gap-0.5 px-2 pb-2 pt-3` inside a bordered sideways-scrolling frame. Line name under the bar `text-xs font-semibold leading-snug`.
- **Grouped bar** (peers): legend swatches `h-3 w-4 rounded-sm`; per metric a list of `h-5` rows: ticker `w-10`, a `h-4` track with an absolutely sized `rounded-sm` bar, value `w-16 text-right`. The subject is `bg-foreground` and `font-semibold`, peers lighter (`/55 /35 /20`). A missing value is a dotted outline box with italic text, never a zero bar.
- **Sankey** (cost flow): viewBox 840 wide, stack 300, node width 14, gap 10, labels 15px (11px small), ribbons `--muted-foreground` at 35% opacity, revenue node `--primary`, loss node hatched in `--destructive` and dashed. Text is haloed with a `--background` stroke (`paint-order: stroke`). Always followed by the same numbers as a table.
- **Legends** under these charts: `flex flex-wrap gap-x-5 gap-y-2 text-xs`, swatch `inline-block h-3 w-4 rounded-sm`, each item a full phrase ("Not split in the note: hatched, never shared out across the named lines").

### 10.7 Explainer blocks (concept cards, split bar, process steps)

From `/accounting/consolidated-reporting` (`screenshots/desktop-consolidated.png`). These are square:
no radius.

- **Concept card**: `border border-border bg-card p-6`; label `uppercase tracking-wider text-xs font-semibold text-foreground` (renders in Spectral, as an `h3`); text `text-sm text-muted-foreground leading-relaxed mt-2 mb-4`. In a `grid grid-cols-1 md:grid-cols-3 gap-6`.
- **Split bar** (a share drawn as a bar): `flex h-5 rounded overflow-hidden border border-border`; the owned part `bg-foreground` with a `text-[11px] font-mono text-background` label, the rest `bg-muted` with `text-muted-foreground`.
- **Formula box**: `text-xs font-mono text-muted-foreground bg-muted px-3 py-2 border border-border text-center`.
- **Process steps**: a panel `bg-card border border-border p-8` holding `grid grid-cols-2 md:grid-cols-5 gap-6 lg:gap-8`; each step `border-t-2 border-border pt-3`, "STEP 01" `text-xs font-semibold text-muted-foreground tracking-wide`, title `font-semibold text-sm mt-1`, text `text-xs text-muted-foreground leading-relaxed mt-1`.
- **Series list**: `divide-y divide-border border-y border-border`, rows `py-3`, title `font-medium group-hover:text-accent`, meta `text-xs font-mono text-muted-foreground`.
- Page: `container max-w-6xl py-8`; sections `mb-14`; `h1 text-3xl md:text-4xl font-bold tracking-tight mb-3`; `h2 text-2xl font-bold mb-6`; a `h-px bg-border mt-6` rule under the lede.

### 10.8 The workbook viewer (Excel file in the browser)

Further down the same page. Virtualised grid in `bg-popover rounded-b-md
rounded-tr-md border`, height `min(70vh, 44rem)`. Gridlines `border-b border-r border-border`; headers
`bg-background text-[11px] text-muted-foreground`; selection `outline outline-2 -outline-offset-2
outline-foreground`. Typed figures `text-fia-sourced`, worked figures ink, the file's own red/blue
type wins, error cells `bg-wb-error-bg text-wb-error-fg font-medium`. Excel border styles map to ink
lines: thin 1px solid, medium 2px, thick 3px, double 3px double, dashed and dotted 1px. Formula bar
`flex min-h-9 border-b bg-popover text-[13px]` (44px under coarse pointers). Sheet tabs scroll with a
`w-16` gradient fade (`bg-gradient-to-l from-background via-background/80`) and a 28px next button.

---

## 11. Charts

The tracker's line/bar chart (`TransitionChart.tsx`), `screenshots/desktop-tracker-chart.png`.

| Part | Spec |
|---|---|
| Frame | responsive SVG, width from a ResizeObserver; height 340 (220 compact); margins top 16, right 16, bottom 28, left 56; `font-sans` |
| Gridlines | horizontal only, `hsl(215 20% 88%)`, 1px |
| Baseline | `#1E2761`, 1px |
| Ticks | 11px, `hsl(215 15% 45%)`; y labels right-aligned 8px left of the plot; x labels 18px under it (years) |
| Lines | 2px, round joins; one line = `#0070c0`; more = series order (§2.5) |
| Projections | dashed `5 4`; points hollow (white fill), bars at 55% opacity, "proj." in the tooltip |
| Points | r 3, stroke 1.5 (hover r 4, stroke 2) |
| Policy markers | `#9a3412` only: dashed `3 3` vertical, a white pill (`rx 8`, stroke 1.5) with a 10px/600 number; listed under the chart with their text |
| Crosshair | `#1E2761` at 50% opacity, follows pointer and arrow keys |
| Tooltip | `absolute top-2 z-10 min-w-40 max-w-64 rounded-md border bg-background px-3 py-2 text-xs shadow-sm`; period `font-semibold`; rows with `h-2 w-2 rounded-sm` swatch and `tabular-nums` value; vintage line muted |
| Legend | only for 2+ lines: `mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm`, swatch `h-2.5 w-2.5 rounded-sm` |
| Table view | "Show the values as a table" link (`text-xs text-accent underline`), table `max-h-72 overflow-auto text-xs` |
| Source trail | `mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground`: "Source:" in ink, publisher link in accent, series code in `font-mono text-[11px]`, vintage, licence, last check, "Download CSV" |
| Timeline variant | a vertical list: `border-l-2` in marker orange, `h-3 w-3 rounded-full border-2 bg-background` dots, quarter heads `font-sans text-sm font-semibold` |

Rules (from the component's header): one y-axis per chart, never two; navy for structure; dark orange
only for policy markers; projections dashed, actuals solid; a legend for two or more lines; a table
view so no value depends on colour or a pointer.

Chart page: kicker `text-sm text-muted-foreground` ("Transition Tracker · Macro context"); the
**finding as the title** (`h1 mt-1 text-3xl font-semibold leading-tight`, Spectral): "Newcastle
thermal coal was US$154 a tonne in September 2026, a third of its September 2022 peak"; subtitle the
measure and unit. Aside (18rem) `space-y-8 text-sm`: `h2 font-serif text-base font-semibold` and an
inline `dl` (`dt` in ink, `dd` muted).

Chart card in a list: `border-t border-border pt-6`; title `font-serif text-lg font-semibold
leading-snug`; subtitle `mt-1 text-sm text-muted-foreground`; chart `mt-4`.

---

## 12. Diagrams

The industry chain plate (`src/components/industry-chain/chain-plate.css`) is the site's rule book
for diagrams. Reuse its grammar for any Lab diagram:

- **Tokens only.** The base map is foreground, muted and border; ONE accent (`--accent-editorial`,
  named `--cp-shift`) means exactly one thing (a change), used as an edge or a field, never as text.
- **Form before colour.** Stages are solid boxes (1px ink stroke, 18px/600 labels); nodes are dashed
  pills (`3 2.5`, muted stroke, 15px); groups are faint frames (`muted` at 32%, caps 14px label at
  0.09em); money flows are dotted (`2 3.5`, round caps); information is dash-dot (`9 3 1.5 3`);
  borders are `6 4` dashes; returns `5 3`; energy `1.5 2.5` dots.
- **Weight hierarchy.** The main flow is the heaviest line (1.7px) and its joint marks the heaviest
  form (1.8px; 2.6 on hover, 3 when open); boxes a step lighter; frames lighter still.
- **Status by form:** stuck = heavy (3.4px), moving = plain, unpriced = dashed; numbered discs filled,
  open or dashed to match.
- **Receding:** under an overlay the base geometry drops to 40% opacity; an isolated reading drops
  the rest to 10% but keeps their labels at 45%: names never become unreadable. A focused element
  always returns to full opacity.
- Every interactive mark has a larger invisible hit shape; focus draws in `--ring`, 2–3px.
- Labels 14px minimum on the plate.

---

## 13. The homepage hero

`screenshots/desktop-home.png`, `mobile-home.png`. Optional for the Lab, recorded in full.

- **Copy:** "Democratising knowledge. / Rebuilding industry." and one line of scope.
- **Height:** `clamp(440px, calc(100svh − 65px − 240px), 760px)` (the 240px keeps the next section
  in view).
- **Background:** `linear-gradient(180deg, #1f2937 0px, #F4F1EA 110px, #F4F1EA 80%, #fafafa 100%)`:
  the header's slate melts into cream over 110px, and cream into the page at the bottom. No rule at
  either edge.
- **Headline:** Source Serif 4, 500, `clamp(2.75rem, 5.2vw, 5.25rem)` capped to fit (70.6px at
  1440), line-height 1.05, tracking −0.025em, `#1E2761`; one sentence a line (`whitespace-nowrap`). A
  12px `-webkit-text-stroke` of the cream painted under the fill (`paint-order: stroke fill`) so
  threads seem to pass behind letters.
- **Subline:** Plus Jakarta Sans `clamp(1.125rem, 1.4vw, 1.5rem)` / 1.5, ink at 70% opacity,
  `max-width: 36ch`, `margin-top: 1.5rem`.
- **Placement:** desktop `absolute left-[6%] top-[130px] max-w-[52%]`; under 768px the text comes
  first (`container pt-[130px] pb-6`) and the weave fills the bottom 38%.
- **The weave** (canvas, DPR capped at 2): warp (navy, 2px) and weft (terracotta, 5px, with a 1.5px
  `4 5` dashed fibre in `#D98B6E`) on a square pitch `clamp(52px, 3.4vw, 68px)` (40px on phones). The
  woven region runs from 60% of the width to the right edge; wefts trail loose from 22% with a seeded
  wave (amplitude 8px, wavelength 220–320px) and fade in over 80px; no weft passes under text
  (28px clearance). Over/under alternates by `(i + j) % 2`. Loose warps wave 6px over 110–170px.
- **Nodes:** 3 per warp (2 on phones), radius 5–7, half solid half hollow (1.5px ring), drifting down
  the warp at 18–30 px/s, fading in and out over 26px.
- **Motion:** warps draw 0–1.2s (35ms stagger), wefts 1.0–2.5s (80ms stagger), nodes 2.0–2.6s (scale
  0.6 → 1), all easeOutCubic. Idle: a shared sine field, amplitude 3px (1.5 phone), period 6–10s,
  k = 0.004 rad/px, ramped in over 1s. Bottom 40px fades into the page. Reduced motion: the last
  intro frame, still. Seed `20261030`.

---

## 14. Motion

| What | Value |
|---|---|
| Default transition | `transition-colors` (150ms, `cubic-bezier(0.4,0,0.2,1)`); 109 uses |
| Hover lift | none; image zoom `scale-105` over 300ms on related cards only |
| Chevron rotate | `rotate-180`, 200ms |
| Accordion | 200ms ease-out |
| Dialog / popover | fade + zoom 95%, 200ms |
| Sheet | open 500ms, close 300ms, ease-in-out |
| Nav menu close delay | 150ms |
| Image appear | opacity, 300ms |
| Changed cell | one 900ms ease-out flash |
| Diagram marks | 0.2s ease, staggered 45ms each, 3px rise |
| World canvas | 600ms opacity; night veil 1200ms |
| Carousel | 30 px/s, resume after 3s |
| Hero | §13 |

Not animated on purpose: the save-status chip, toolbar chevrons, spinners on reading surfaces. Under
`prefers-reduced-motion: reduce` every animation and transition is zeroed by one global CSS block
(in `tokens.css`), and JS asks `matchMedia('(prefers-reduced-motion: reduce)')` at interaction time.
Smooth scrolling is on only under `no-preference`.

---

## 15. Icons

lucide-react 0.462. Sizes: `h-4 w-4` is the default (195 uses; buttons force `[&_svg]:size-4`);
`h-3 w-3` and `h-3.5 w-3.5` inline with `text-xs`; `h-5 w-5` for section icons and prev/next
chevrons; `h-6 w-6` for the hamburger and state discs; `h-12 w-12` for an image failure. Icons are
`aria-hidden` and sit `gap-1.5`/`gap-2` from their label; colour inherits, usually
`text-muted-foreground`. Common set: ChevronDown/Right/Left, ArrowLeft/Right, ExternalLink, Link2,
Share2, Check, X, Plus, Minus, Search, List, BookOpen, Clock, Menu, Maximize2/Minimize2,
PanelRightOpen/Close, Download, FlaskConical, AlertCircle, RefreshCw, FileQuestion, ImageOff, ZoomIn,
Loader2, CloudOff, History, Linkedin, Mail, Home.

---

## 16. Share card

1200 × 630 PNG drawn at build time (satori + resvg) for every essay. Ground `#f8f7f4`; a 3px `#0f172a`
rule at y 96 across the 1008px content width (96px margins); the lantern logo 88px at y 159 with the
section label beside it (Plus Jakarta Sans 600, 22px, tracking 2.6, `#334155`); the title from cap
height y 299 in Plus Jakarta Sans 700, 64 → 56 → 48px to fit 3 lines at 1.15 line-height, −0.01em;
footer "Dika Gustiana · dikagustiana.com" 700 22px at y 537.

---

## 17. Do not port

Present in the codebase, unused or broken:

- `src/App.css` (Vite template leftovers; not imported).
- `.hero-gradient` (reads `--hero-overlay`, which is never defined), `.card-feature`, `.link-accent`,
  `.editable-field`, `.admin-highlight` (no call sites).
- `scrollbar-none` on the section sub-nav: no plugin defines it, so it does nothing. Use
  `.fia-scroll-row` if a hidden scrollbar is wanted.
- The `dark:` hero values and the vendored shadcn `dark:` variants: the site is light only.
- `.longform-body` (one legacy shell); the editorial type system replaces it.

The admin pages were not specified separately: they are built from the same primitives (§7) on the
same page skeleton.

---

## 18. Screenshots

Taken from the live site on 27 November 2026, Chromium, 1440 × 900 at 2× and iPhone 13.

| File | Page |
|---|---|
| `desktop-home.png` | Home: header, hero, Glimpse |
| `desktop-finance-landing.png` | `/finance`: listing skeleton, featured block, numbered cards |
| `desktop-essay.png` | An essay's header, toolbar and TOC rail |
| `desktop-essay-body.png` | Essay body: 19px Spectral, sans in-body heading, TOC states |
| `desktop-fia-index.png` | `/finance/finance-in-action`: stage strip and pills |
| `desktop-fia-model.png` | A company model: company bar, key figures |
| `desktop-fia-model-grid.png` | The model grid, legend chips, formula bar, inspector, sheet tabs |
| `desktop-tracker.png` | `/green-transition/tracker` |
| `desktop-tracker-chart.png` | A chart page: segmented control, chart, source trail, aside |
| `desktop-consolidated.png` | `/accounting/consolidated-reporting`: concept cards, split bar, process steps |
| `mobile-home.png`, `mobile-essay.png`, `mobile-fia-model.png` | The same at phone width |
