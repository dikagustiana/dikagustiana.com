# Library phase 2 — verification (step 5, 2026-10-24/25)

Branch `feat/library-phase-2`, from `feat/finance-restructure` (not yet on `main`). Nothing was applied to
the production database and no function was deployed: every run below is local.

**The extracted text lives in R2, not Postgres** (the owner's decision, 2026-10-25; the PRD's
`book_paragraphs` table is not built). `scripts/books/extract-paragraphs.ts` writes
`text/<book id>/index.json` and `text/<book id>/ch-<n>.json` to the private bucket beside the book's file
(`supabase/functions/_shared/bookText.ts`); the database keeps only `books_uploads.ai_ready`. `book-ask` reads
a question's chapter from R2, and signs one-hour URLs (`action: 'text'`) for the reader's text view after the
same checks as a question (published, free, ai_ready). Every R2 URL is signed by `_shared/r2.ts`.

## Checks

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 23 warnings (the 23 on the base branch; none new) |
| `npm run typecheck` | clean |
| `npm run test:unit` (no `test` script exists) | 133 files, 1727 tests passed |
| `npm run build` | built; prerender skipped (no publishable key in this environment, as on CI) |
| `npx playwright test` (default config) | 132 passed (books.spec.ts 8, library.spec.ts 3 among them) |

## The local stack

No Supabase CLI stack could start in this container (Realtime needs IPv6, which the kernel lacks), so one was
assembled from the same images: `supabase/postgres:17.6.1.029` with every migration in
`supabase/migrations/` applied in order (three older ones fail on production-only data and were skipped:
`20260801060000`, `20261024150000`, `20261024150100`; the four of this branch apply cleanly, their rollbacks
too, and apply again after them), `postgrest/postgrest:v12.2.12`, `supabase/edge-runtime:v1.67.4` serving
`supabase/functions/book-ask`, `chrislusf/seaweedfs:3.85` as an S3-compatible stand-in for R2 (it checks
SigV4: a URL from `_shared/r2.ts` is accepted, the same URL with a wrong signature gets 403), reached through
`R2_ENDPOINT`, an optional override added to `_shared/r2.ts` for test stacks and never set in production; and a
small gateway for `/rest/v1`, `/functions/v1` and public storage.

**There is no Anthropic API key here** (and none was asked for). `ANTHROPIC_BASE_URL` pointed the function at
a stand-in that records the request and streams back, in the Messages API's SSE shape, an answer citing the
selected paragraph and the one before it, taken from the context it received. The guards, the context, the
stream, the citation check and the usage rows are the function's own; the answer's wording is the stand-in's.
`scripts/books/ask-check.ts` runs the real check once the secret is set.

Books seeded: "A Short Book of Ledgers" (free, `tests/fixtures/books/text.pdf` uploaded to the local bucket,
`file_store = 'r2'`), "A Scanned Book" (free, `scanned.pdf`, likewise), "Valuation" (paid), and the 200 books
of `tests/e2e/libraryFixtures.ts` on eight shelves. `scripts/books/extract-paragraphs.ts` read both PDFs from
the bucket and wrote, for the ledgers book, `text/bbbbbbbb-…-000000000001/index.json` and `ch-1.json`…`ch-3.json`
(29 paragraphs in 3 chapters) and set `ai_ready = true`; it flagged the scan `ai_ready = false` with no text,
and did not touch the paid book; `spine-metrics.ts` stored 203
spine colours; `rebuild-citations.ts --dry-run` found 0 pairs among 162 seeded essays.

## book-ask over curl

Same visitor throughout (`x-forwarded-for: 198.51.100.23`, `user-agent: curl-verification/1.0`).

(a) A paid book is refused, before any question is counted:

```
{"ok":false,"reason":"not_free","message":"Questions are only for free books."}
HTTP 403
```

Its text is refused the same way (`action: 'text'` → 403 `not_free`), and the scan's with 409 `not_ready`.
For the free book, `action: 'text', part: 'index'` gave a signed URL to
`/dg-books-public/text/bbbbbbbb-…-000000000001/index.json`, and that URL gave the index:

```
{"version":1,"book_id":"bbbbbbbb-0000-0000-0000-000000000001","page_count":4,"paragraphs":29,"chapters":[{"chapter":1,"first_para":1,"last_para":15,"first_page":1,"last_page":1},{"chapter":2,"first_para":16,"last_para":24,"first_page":3,"last_page":3},{"chapter":3,"first_para":25,"last_para":29,"first_page":4,"last_page":4}]}
```

(b) A free, ai_ready book, chapter 3, the selection ¶26:

```
event: meta
data: {"remaining":4,"context":[25,29]}

event: delta
data: {"text":"The passage says that th"}
…
event: delta
data: {"text":"just before it [¶25]."}

event: done
data: {"cited":[26,25],"outside":[],"remaining":4}

HTTP 200
```

¶25 and ¶26 are both in the context sent (¶25–¶29, chapter 3); `outside` is empty.

(c) Questions two to five, then the sixth from the same hash on the same day:

```
q2: data: {"cited":[4,3],"outside":[],"remaining":3}
q3: data: {"cited":[4,3],"outside":[],"remaining":2}
q4: data: {"cited":[4,3],"outside":[],"remaining":1}
q5: data: {"cited":[4,3],"outside":[],"remaining":0}
{"ok":false,"reason":"visitor_cap","message":"That is 5 questions today. Come back tomorrow."}
HTTP 429
```

In the first run (text in Postgres) a visitor from another address still had 4 left, and with the day's spend
past `BOOK_ASK_DAILY_USD=1` a new visitor got `429 daily_budget` with their question given back; the guards
did not change when the text moved.

The request the function sent upstream: `anthropic-version: 2026-10-21`, `anthropic-beta:
server-side-fallback-2026-07-01`, `model: claude-opus-5-5`, `stream: true`, `output_config.effort: low`,
`fallbacks: "default"`, no `temperature`, the chapter as a cached block with every paragraph prefixed `[¶n]`.

`book_ask_usage` after (a)–(c), the text in R2 (day in Asia/Jakarta):

```
    day     |                           visitor_hash                           | questions | usd_cents
------------+------------------------------------------------------------------+-----------+-----------
 2026-10-25 | dc1eae2516b7eefc5ae52a18f5347e6656b1b2606802f77102c062fd50db1f17 |         5 |        10
```

usd_cents is priced from the stand-in's token counts at claude-opus-5-5's rates and rounded up per answer;
real answers will differ.

RLS as anon, through PostgREST: `book_ask_usage` read and a `book_ask_take` call both `42501 permission
denied`. (The text has no table to guard; it is reached only through the function's checks and signed URLs.)

## Browser

`tests/e2e/books.spec.ts` (shelf: spines, keyboard walk, 200 books virtualised, reduced motion, sorts, old
addresses, 390 px) and `tests/e2e/library.spec.ts` (cover → read on the sample PDF; select → Ask → answer →
click [¶12] scrolls the reader to paragraph 12 and marks it; a paid book has Buy and no reader).

Screenshots in `screenshots/after/`, from the dev server against the local stack
(`node scripts/books/screenshots.mjs`): `shelf-full.png`, `shelf-reduced-motion.png`, `cover-free.png`,
`cover-paid.png`, `reader-margin.png` (answer citing [¶11] and [¶10]), `reader-cited.png` (after [¶10] was
clicked). The reader's text came through `book-ask`'s signed URLs from the local bucket; its `book-file` call
was answered in the script with a signed URL to the PDF in that bucket (book-file was not served locally).
