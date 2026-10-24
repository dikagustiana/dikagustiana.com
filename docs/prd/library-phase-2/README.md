# Package 3 — Library phase 2: shelf, cover, margin questions (after Gloss)

Status: decided; R2 + in-page reader are live (1 book on `file_store = r2` as of 2026-10-24). Owner: Dika.
Branch: `feat/library-phase-2`. Reference: github.com/Nutlope/gloss — owner has written permission from @nutlope to adapt the UI; the repo carries no LICENSE file, so that permission is the only basis. Save the permission (screenshot/DM) at `docs/licenses/gloss.md` before the first commit, and credit Gloss on the library page.

## 1. PRD

### Problem
`/books-academia` lists books per shelf as text rows with a Read/Download dialog. It works, but it reads as a file listing. The three-tier access model (free with licence note / paid metadata-only / private) is in place; what is missing is the reason a visitor would stay: a shelf you can look along, a cover you can open, and — for public-domain books — a way to ask the text a question and get an answer that points back to the paragraph.

### Goal
Three deliverables, in this order, each shippable alone:
1. **Shelf** — books as spines on shelves, grouped by shelf (= topic), a spine opens to the cover.
2. **Cover + reader** — a cover page (title, author, year, synopsis, licence line, Read/Buy) in front of the existing pdf.js/epub.js reader.
3. **Margin questions** — on `access = 'free'` books only: select a passage, type a question, the answer appears in the margin citing paragraph numbers the reader can check. Capped per visitor per day; chapter-scoped context.

### Non-goals
- Importing articles, X bookmarks or PDFs from visitors (Gloss's read-later features). The library is owner-curated.
- Highlights/notes sync for visitors. Private-tier notes for the owner may follow as phase 3.
- Any AI feature on `access = 'paid'` books (metadata only — no text exists to query).
- Replacing Supabase/Vite with Gloss's stack (Next.js/Neon/Clerk). Ideas and UI only.

### Acceptance
- Shelf renders 200 books without layout jank (virtualised rows); keyboard navigation along a shelf; reduced-motion respected.
- Cover page is the canonical URL for a book (`/books-academia/:slug`); reader at `/books-academia/:slug/read` unchanged.
- Margin question: answer cites `[¶n]`; clicking `[¶n]` scrolls the reader to that paragraph; a question on a paid book is impossible from the UI and refused by the function.
- Daily cap enforced server-side; the owner can see spend per day.

## 2. Plan

| Step | Deliverable | Prerequisite |
|---|---|---|
| 0 | Upload the scanned/public-domain backlog to R2 with rclone (prompt already written, chat 2026-10-24); set `shelf_id` on each | — the shelf is empty-looking with 1 book |
| 1 | Shelf: data (spine colour, thickness), `Shelf` + `Spine` components, virtualised rows | 0 |
| 2 | Cover page; route change; Read/Download buttons move here from the dialog | 1 |
| 3 | Paragraph extraction job for free books (text layer → `book_paragraphs`) | 2 |
| 4 | `book-ask` edge function + margin UI + cap | 3 |
| 5 | Credit line, `docs/licenses/gloss.md`, Playwright | each step |

## 3. Design

### Shelf (adapted from Gloss `components/library/`)
- One row per `book_shelves` entry, in `sort_order`; row header = shelf name + count.
- Spine: height from page count (clamped 160–240 px), width from `size_bytes` (clamped 28–56 px), colour from a 12-colour palette keyed by shelf (one hue family per shelf, varied by lightness), title set vertically in `--font-sans`. No cover image on the spine.
- Hover/focus: spine tilts 6° and lifts (`transform` only, 200 ms); click/Enter opens the cover. Reduced motion: no tilt, outline only.
- Sorting control per page: by shelf (default), by year, by author. No "colour" or "length" sort (Gloss has them; not useful at 200 books).
- Paid books sit on the shelf with a small price tag glyph on the spine; private books do not appear for anonymous visitors.

### Cover page
- Left: generated cover (title/author on the shelf colour; real cover art only where `cover_path` exists and the licence allows). Right: title, author, year, shelf, synopsis (`synopsis_html`), licence line (`license_note`), then buttons: **Read** (free), **Download** (free), **Buy** (paid → `purchase_url`).
- Below: "Cited by" — essays whose references name this book (string match on title/author against `essays.content_json` references, precomputed into `book_citations`).

### Margin questions
- In the reader, selecting text shows a small "Ask" affordance at the selection end. Typing opens a margin panel to the right of the page (below the page on mobile).
- Answer streams in; each cited paragraph renders as `[¶12]` link; the quoted passage stays highlighted while the panel is open.
- Panel footer: `3 of 5 questions left today` and `Answers are generated; check the cited paragraphs.`
- Not shown at all on paid books or when the book has no extracted paragraphs.

## 4. Architecture

### Data
- `books_uploads` gains: `page_count int`, `spine_color text` (computed once, stored), `ai_ready boolean default false`.
- New `book_paragraphs (book_id uuid, chapter int, para int, page int, text text, primary key (book_id, chapter, para))` — populated only for `access = 'free'`; RLS anon select where the book is published and free.
- New `book_citations (book_id, essay_id)` — rebuilt by a script in `scripts/` whenever essays change (run manually; not a trigger).
- New `book_ask_usage (day date, visitor_hash text, questions int, usd_cents int)` — written by the function; admin read.

### Extraction (step 3)
`scripts/books/extract-paragraphs.ts`: pdf.js text layer (same version as the reader) → paragraphs by line-gap heuristic; epub via epub.js chapter iteration. Writes `book_paragraphs` through the service role. Scanned PDFs with no text layer are skipped and flagged (`ai_ready = false`); OCR is out of scope.

### Ask function
`supabase/functions/book-ask`:
- Input: `book_id`, `chapter`, `selection {para_from, para_to, text}`, `question`.
- Guards (in this order): book published and `access = 'free'`; `ai_ready`; visitor cap (hash of IP + UA, 5/day anon; the owner, signed in, uncapped); global cap USD/day from env.
- Context: the selected chapter's paragraphs with `[¶n]` prefixes (chapter-scoped, not whole-book — a 300-page book would not fit and would cost too much per question); system prompt instructs citing `[¶n]` only.
- Model: Claude via the owner's API key in function secrets (the site already runs on the owner's Claude credit; no Together AI). Streamed SSE back to the client.
- Logs `usd_cents` from token usage into `book_ask_usage`.

### Client
- `src/components/books/Shelf.tsx`, `Spine.tsx`, `CoverPage.tsx`, `reader/AskMargin.tsx`.
- Virtualisation: `@tanstack/react-virtual` if present in `package.json`; otherwise add it (small). Do not add three.js for the shelf even though it is in deps — the 3D book is Gloss flourish, not needed.
- `useBooks.ts` gains `useShelfBooks()` returning books with spine metrics; existing `useShelves()` unchanged.

### Credit
Library page footer: `Shelf and margin design adapted from Gloss by Hassan El Mghari, with permission.` Link to the repo.

### Tests
- Unit: spine metric clamps; paragraph splitter on two sample PDFs (one with text layer, one scanned → flagged).
- Function: refuses paid book; refuses sixth question; cites only `[¶n]` present in context (assert on a fixed prompt with temperature 0).
- Playwright: shelf keyboard walk; cover → read; ask → citation click scrolls.
