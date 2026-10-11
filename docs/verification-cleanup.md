# Verification-marker cleanup

The owner's instruction: treat every unverified claim in a **published** essay as correct for
now. Remove the marker, keep the claim word for word, and log everything. This file records
the first run's discovery. Later runs re-check the live data against it and do not redo it.

Discovery run: 2026-10-11, against the live project `asypkbkiebjvvpimewfp` (dikagustiana-com).
Result: **0 markers. Nothing to clean.**

## Where essays live

| What | Where |
|---|---|
| Table | `public.essays`. There are 183 rows: 21 published and 162 drafts. |
| Published filter | `published = true`. This is the column RLS enforces (`src/lib/publication.ts`). On this date all 21 published rows also had `status = 'published'`, and all 162 drafts had `false` / `'draft'`. |
| Canonical body | `content_json` (TipTap JSON). `ArticleBody` renders JSON first and uses the HTML parser only for legacy rows. |
| HTML mirror | `content` (string). All 21 published rows carry it. A clean must edit both columns in step, or the mirror goes stale. |
| Brief companion | `brief_json`. One published essay has one. |
| `published_at` | No such column. The publication date is `date`. A body edit must not touch it. |

### Triggers that fire on an essay UPDATE

- `update_essays_updated_at` sets `updated_at = now()` on every UPDATE. A body edit bumps it
  whether or not we want it to. That is the wanted behaviour. `updated_at` feeds the share
  card's `?v=` cache-buster (`src/lib/shareImage.mjs`), `article:modified_time`, and the
  sitemap's lastmod (`scripts/prerender.mjs`). It is also the stale-tab guard in
  `BriefEditor`, so a bump makes an open editor tab fail loudly instead of overwriting the
  clean.
- `sync_essay_publication_state` changes `published` or `status` only when one of those two
  columns changes. A body-only UPDATE leaves publication state alone.
- `validate_essay_placement` checks placement. A body-only UPDATE passes it unchanged.

A direct DB edit writes no `essay_revisions` row. A run that changes a body should insert a
revision with `change_type = 'migration'` so the editor's history shows the edit.

## Marker forms searched

Every column of every published row was searched (`row_to_json(essays)`), plus the structure
of `content_json` and the attributes in `content`.

| Form | Searched for | Published essays with it |
|---|---|---|
| Inline tag text | `[unverified]`, `UNVERIFIED`, `unverif*` (any case), `(needs source)`, `need(s) source`, `citation needed`, `[verify]`, `to verify`, `unsourced`, `unconfirmed`, `[source]`, `[cite]`, `TK`, `??` | 0 (see the near-misses below) |
| TipTap marks | every mark type in use | none. Only `bold` (230), `italic` (96) and `code` (10) appear. There is no highlight, textStyle or custom mark. |
| TipTap nodes | every node type in use | none. The types in use are doc, paragraph, text, heading, lists, blockquote, table nodes, horizontalRule, hardBreak, one `callout` (a formula box in `driver-tree-construction`) and one `blockMath`. There is no footnote node. |
| CSS classes / data attributes in `content` | every `class=` and `data-*=` | none. Only `data-type="callout"`, `data-type="block-math"` and one `data-latex`. There is no `<mark>`, `<sup>` or `<span>`. |
| Footnote flags | footnote nodes, `<sup>` | none |
| Verification Register | a DB table or column named `*verif*`, `*claim*`, `*register*` or `assumed*`; a heading or table in the body named "Verification Register" | none. There is no such table in `public` (the `fsre.*` registers are the company-models pipeline, not essays). No published body has a register heading or table. |
| Renderer badge | `unverif` or `needs source` anywhere in `src/` (TipTap extensions, `ArticleBody`, `index.css`) | none. No code renders a verification badge. |

Drafts were read but not edited. They have no marker convention either. Their only hit is
"the amount is unverifiable" in `the-objective-function-of-the-firm`, which is prose.

## Near-misses: the word "unverified" as prose, not a marker

Three published sentences use "unverified" as a working word in the claim itself. Each sits
in the author's own "Least-confident assertions" disclosure or a stated-assumption sentence.
Deleting the word is not marker removal. It breaks the grammar and turns a disclosed limit
into an unqualified claim, so the "word for word" rule forbids it. These sentences are left
as written and are not counted as markers.

| Essay | Sentence (exact) | Why it stays |
|---|---|---|
| `corporate-dividend-taxes-receivable-refund-claims-and-disputes` | "That a contractor's monthly payments follow current-year liftings on provisional figures, rather than one-twelfth of last year's tax, is my understanding and unverified; HEN's overpayment mechanism rests on it." | Removing the word leaves "is my understanding and ; HEN's…". |
| `corporate-dividend-taxes-receivable-refund-claims-and-disputes` | "…do not reach HEN because its assessment leaves no tax unpaid; this reading of the fine base is unverified for an SKPLB dispute" | Removing the word leaves "this reading of the fine base is for an SKPLB dispute". |
| `indonesias-reindustrialization-bet` | "In stylised illustrative arithmetic using unverified inputs, not an estimate, a clean premium of 15 percent of capital expenditure against avoided losses of 60 percent gives a 25 percent break-even probability." | It discloses that the inputs are illustrative. Removing the word changes what the arithmetic claims. |

If the owner wants these hedges gone, that is an editorial rewrite of the sentence, not this
cleanup. It needs the owner's wording.

Also not markers: the `Status` column in `due-from-government-underlift-vat-and-other-receivables`
("in review", "verified, awaiting payment") is the essay's VAT-claim example. The word
"assumed" in seven essays is prose.

## How a later run should work

1. Re-run the searches above against `published = true`. Add any new form found to the
   table, with a real example.
2. Before changing anything, write `logs/verification/YYYY-MM-DD.json`. `logs/` is
   gitignored and the cloud container is reclaimed, so a snapshot that holds original bodies
   must also be kept somewhere that lasts: commit it with `git add -f` on the run's branch,
   or attach it to the PR. Otherwise the rollback copy is lost.
3. Edit `content_json` and `content` together in one transaction. Strip the marker only. On
   any error, roll back the whole run.
4. Validate: the JSON parses as TipTap, and the old and new plain text differ only by the
   removed marker strings. Render-check each changed slug.

## Run log

| Date | Published essays | Markers found | Essays changed | Reverted | Snapshot |
|---|---|---|---|---|---|
| 2026-10-11 | 21 | 0 | 0 | 0 | `logs/verification/2026-10-11.json` (local; nothing to snapshot) |
