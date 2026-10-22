# Consolidation series layout — live verification, 2026-10-22

Commit `4d4588c` on `main`, measured on **https://dikagustiana-com.vercel.app** (production deployment
of the `dikagustiana-com` project; `www.dikagustiana.com` serves the same bundle). The apex
`dikagustiana.com` still answers 308 to the old `dika-s-digital-studio` project, so it was not used.

Measured with Playwright Chromium at 1440 × 900, 1280 × 900 and 375 × 900. Raw numbers per page and
width: `evidence.json`.

## Checks, per page and width

| check | rule |
|---|---|
| prose measure | `article.prose-editorial` is 728px at 1440/1280 and 311px at 375. The FSLI reference is 704px at 1280: its left "Related line items" rail narrows the column the same 728px rule sits in |
| body | Spectral 19px / 30.4px, paragraph margin 20px |
| title, deck | `.editorial-title` Spectral 700 32px; `.editorial-subtitle` Spectral 18px |
| TOC | "On this page" rail right of the body at 1440 and 1280; no rail at 375 |
| no page scroll | `scrollWidth` equals the viewport width |
| tables | every table's wrapper has `overflow-x: auto` and stays inside the viewport |

## Results

| page | 1440 | 1280 | 375 |
|---|---|---|---|
| Reference: `/accounting/fsli/retained-earnings` | pass | pass | pass |
| `business-combinations-acquisition-method-goodwill-common-control` | pass | pass | pass |
| `consolidation-worksheet-elimination-entries` | pass | pass | pass |
| `intercompany-profit-in-inventory` | pass | pass | pass |
| `intercompany-profit-plant-assets` | pass | pass | pass |
| `consolidated-cash-flows-and-mid-year-acquisitions` | pass | pass | pass |
| `mutual-holdings-complex-group-structures` | pass | pass | pass |
| Other section: `/green-transition/now/the-green-transition-isnt-only-about-green` | pass | pass | pass |
| Other section: `/finance/analytics/driver-tree-construction` | pass | pass | pass |
| Other section: `/the-next-big-thing/technology/the-agentic-finance-function` | pass* | pass* | pass |

\* No TOC rail, as before this change: the essay has no h2/h3, and `ArticleToc` renders only with
three or more. Every other check passes.

At 1440 and 1280 every series essay measures identically to the Green Transition essay (body at
x = 228 / 148, rail at x = 1024 / 944). At 375 their widest tables (317–653px) scroll inside a
343px wrapper while the page stays 375px wide.

Before the fix (`before-*.png`) the same essay sat in a left-pinned `max-w-3xl` box: body at
x = 72 with the title at x = 52, a 36px display-font title, a sans deck, no TOC rail and no byline.

## Screenshots

- `reference-fsli-retained-earnings-{1440,1280,375}.png`
- `after-<slug>-{1440,1280,375}.png` for three series essays
- `before-intercompany-profit-in-inventory-{1440,1280,375}.png`
