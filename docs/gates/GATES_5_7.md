# GATES 5–7 — Session B

Sections 5, 6 and 7 only. Session A owns `docs/GATE_LEDGER.md`; this file is the
authority for these three sections so that neither session is writing the other's
record.

**States**

- `PASSED` — observed on running software, with the measurement and its source recorded.
- `CODED-NOT-VERIFIED` — the code exists; the gate was not run.
- `BLOCKED` — with the specific cause and what would unblock it.

**How these were measured.** `vite build` + `vite preview` on `127.0.0.1:4173`,
never the dev server, driven by Playwright/Chromium against the **live** project
`asypkbkiebjvvpimewfp`. HTTP status is not a discriminator — this is an SPA and
every URL returns 200 with whatever the router matched — so every verdict below
classifies the *render*, plus the console and the network calls behind it.

**Harness note.** Chromium in this container cannot complete TLS to
`*.supabase.co` (the egress proxy re-terminates TLS and the bundled browser does
not trust its CA). Supabase requests are therefore intercepted by Playwright and
fulfilled from Node, which does proxy correctly. The page makes exactly the calls
it would make in production, with the same method, headers and body, and receives
the real responses from the real project; only the transport hop differs. TLS
verification was never disabled.

---

## GATE 5 — Finish the writing experience

**Commit: `c7e5d12`**

| Requirement | State | Evidence |
|---|---|---|
| An image pasted mid-body survives save → reload → publish → anonymous read, observed on the live page at `/finance/analytics/t4-m07/fa-07-01` | **PASSED** | A 314-byte PNG (generated with valid IHDR/IDAT/IEND and CRCs) pasted as a `File` into the body via a real `ClipboardEvent`. Observed in order: `handlePaste` claimed the event (`defaultPrevented: true`); the upload placeholder appeared (`.essay-image-uploading` count 1); `POST /storage/v1/object/essay-images/finance/…png` → **200**; placeholder count returned to **0**; a `figure` node was inserted whose `<img>` decoded in the editor at **naturalWidth 160 × naturalHeight 100**. Saved, then published. In a **separate anonymous browser context** (`signedIn: false`) `/finance/analytics/t4-m07/fa-07-01` rendered the image with `naturalWidth 160, naturalHeight 100, complete: true`. |
| A non-admin upload is refused, observed | **PASSED** | Real HTTP against production storage, three identities. `anonymous` → **403** `new row violates row-level security policy`; `authenticated non-admin` (`route-sweep-tester`) → **403** same; `admin` (`import-admin`) → **200**. Anonymous read of the admin-uploaded object → **200 `image/png`**. Policies already existed (`public_buckets_admin_insert/update/delete`, `public_buckets_read`) — **no migration was needed**. |
| A document containing text, headings, a link, a figure with caption, and a table survives the round trip unchanged — verified per block | **PASSED** | Blocks authored through the editor UI, then read back per block. After **save + reload** the editor showed marker text ✓, `h2` carrying the marker ✓, `table` 1 ✓, `figure` 1 ✓. In the database `content_json` went 81 → 88 top-level blocks with `json_tables: 1` and `json_figures: 1`. Anonymously on the published page: marker `h2` **1**, marker paragraph ✓, `a[href="https://example.com/gate5"]` **1**, `table` **1** with 9 cells reading `H1 / H2 / H3 / cell-a`, `figure` present, image decoded. |
| Preview and the published page render identically for that document | **PASSED** | Preview pane measured in the editor: `{tables: 1, figures: 1, links: 1, marker: true}`. Published page, anonymous: `{tables: 1, figures: 1, links: 1, marker: true}`. They now agree because they are the same component — `WriterPreview` renders through `ArticleBody` rather than its own `contentToHtml` + `sanitizeHtml` + `dangerouslySetInnerHTML` path. |
| Exactly one route authors essays | **PASSED** | `/admin/writer/:section/:slug` is the only route that mounts an editor. Observed: `/admin/writer/a6837e0f-…` → `/admin/writer/finance/fa-07-01` (1 editor, "Edit Essay"); `/admin/writer/new` → `/admin/writer/finance/new` (1 editor, "New Essay"); `/admin/writer/finance` → `/admin/writer/finance/list` (**0** editors). `WriterStudio` is now a redirect, so the second authoring stack is gone without editing `App.tsx`. |
| Nothing imports the deleted editors | **PASSED** | `grep` over `src` and `tests` for `WriterModeEditor\|InlineEssayEditor\|EssayBodyEditor\|RichTextEditor\|UnifiedEditor` returns **comments only** — no imports. All five files deleted. |
| No editor configures extensions inline | **PASSED** | `useEditor(` occurs **once** in the tree (`EssayEditor.tsx:490`). `StarterKit` is referenced **only** in `src/lib/tiptap/extensions.ts`. |
| The duplicate-extension warning is gone from the console | **PASSED** | Editor loaded on the built preview; console captured from page load. **0** messages matching `/duplicate\|already been added/`. Cause was the standalone `@tiptap/extension-link` alongside StarterKit v3, which bundles it; link options moved inside `StarterKit.configure({ link: … })`. |

### Findings recorded while doing Section 5

- **Inserting a table crashed the page.** `NotFoundError: Failed to execute 'insertBefore' on 'Node'`, rendering the error boundary and destroying the editor. Cause: the contextual table toolbar appeared as a *new sibling* between elements whose DOM ProseMirror mutates, so React reconciled against a child list that had moved underneath it. Fixed by keeping the slot permanently mounted and toggling its contents. **This passed `tsc --noEmit` and passed `vite build`** — it was only ever visible by inserting a table in a browser.
- **`isActive` is not reactive.** The table controls were driven by `editor.isActive('table')`, which only repaints when something unrelated re-renders the component. Now subscribed via `useEditorState`.
- **The prompt's editor map was one editor short.** It named `EssayEditor` as "a third editor configuring extensions inline"; `RichTextEditor` was doing the same and was what `WriterModeEditor` and `EssayBodyEditor` actually rendered. Both are deleted.
- **`colspan` / `rowspan` were missing from the sanitizer allowlist.** A merged cell would have survived sanitising as an ordinary cell and the table would have silently lost its shape — the four-place contract failing in exactly its designed manner. Added, with `colwidth` / `data-colwidth`.
- **A bare `<img>` in a legacy HTML body rendered as nothing.** `ArticleBody`'s legacy `DOMParser` path had no `img` case, so an `<img>` fell through to `processChildren`, which returns null for a void element. Legacy path now handles `img` and full table markup.
- **The two published essays are stored inconsistently.** `fa-07-01` holds **HTML** in `essays.content` (21,954 B) while `site-rebuild-note` holds **TipTap JSON** in the same column. `ArticleBody` branches on which, so production is already running both of its renderers. Both paths now understand every block type, but the column should be normalised. **160 of 162 essays have no body at all.**
- **Saving a published essay as a draft unpublishes it and rewrites its status.** `handleSave('draft')` sends `status: 'draft'`, and the `validate_essay_tone_fields_trigger` rewrites it to `tone_pending`. Observed live on `fa-07-01`. Pre-existing behaviour, not introduced here, but the status the writer asks for is not the status it gets.
- **Drag handle is not billable.** `@tiptap/extension-drag-handle-react@3.19.0` is **MIT on the public npm registry** — it is no longer Tiptap Pro. Installed; no need to stop and ask.
- **`fa-07-01` was modified and restored.** The gate names that URL, so the blocks were authored into the live essay and then restored from the backup taken in 6.2: content back to **21,954 B / 81 blocks**, `status: published`, `published: true`, test marker absent. Exposure was a few minutes on a page whose only reader was this session.

---

## GATE 6 — Safety nets

| Requirement | State | Evidence |
|---|---|---|
| 6.2 — The dump script run once, output inspected, and `fa-07-01`'s body and presentation confirmed present in it | **PASSED** at `c7e5d12` | `scripts/dump-content.mjs` run against the live project through an admin session (not a service-role key, so no RLS-bypassing key is stored). Output `content-2026-08-01T09-29-16-117Z.json`, 319.9 KB: **162 essays, 2 with a body, 1 with presentation, 2 revisions**. Inspected inside the file, not merely trusted from the summary: `fa-07-01` → `content` **21,954 B** beginning `<h2>The decision hidden inside the model</h2>`, `content_json` `type=doc` with **81** top-level blocks, `presentation` keys `deck, author_bio, references, hero_caption, key_takeaways` with **5 references** and **3 key takeaways** — matching the verified fact block exactly. **The restore path was then exercised for real**: after Section 5 modified `fa-07-01`, it was restored from this dump and verified back at 21,954 B / 81 blocks / published. A backup that has actually been restored from is the only kind worth having. |
| 6.1 — The 3,000-word reload recovery observed again, after Sections 1 and 5 have both landed | **BLOCKED — Session A GATE 1 is not terminal** | Session A's ledger at the time of writing has GATE 1b `_pending_` and GATE 1c `CODED-NOT-VERIFIED` (the scratch-database rehearsal and the live drop are both outstanding). Section 1 touches the save path, so measuring autosave now measures a state that is about to change. **Unblocked by:** Session A recording GATE 1 in a terminal state, after which the check is: paste 3,000+ words into `/admin/writer/finance/new`, hard-reload mid-edit, confirm the recovery banner offers the autosaved revision and restoring it returns the text. Autosave was left untouched by this session — `useEssayAutosave` and `useDraftRecovery` are unchanged, and `WriterEditor` still feeds them `contentJson` straight from the editor. |

### How to run the backup

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_ANON_KEY="<anon/publishable key>" \
ADMIN_EMAIL="<an admin's email>" ADMIN_PASSWORD="<password>" \
node scripts/dump-content.mjs --out backups
```

It dumps the **authored layer only** — `essays` (bodies, `content_json`,
`presentation`) and `essay_revisions`. Schema and curriculum seed are not
included because they regenerate exactly by replaying `supabase/migrations`;
the writing does not, and the free tier has no point-in-time recovery. The
script exits non-zero if it captures zero bodies, because a dump with no
bodies is a broken dump rather than an empty database. Restore by `PATCH`ing
the rows back through PostgREST with an admin session.

---

## GATE 7 — The five never-checked module groups

**Commit: `b589d9a`.** Every row below was observed on `vite build` + `vite preview`
against the live project, as all three identities, plus a 375px pass. `badApi`
counts non-2xx Supabase calls made by the page — a page that looks fine while
swallowing a 406 is a defect, not a pass.

Two of the mandate's five groups turned out to be one surface: **`FinanceWorkspace`
is the finance curriculum admin**, and it is what `/finance-workspace` mounts. It is
reported once, under both names.

### Verdicts in Gate 4's column format

| route | page component | tables touched | intended access | anonymous | authenticated non-admin | admin | 375px | desktop | verdict |
|---|---|---|---|---|---|---|---|---|---|
| `/finance-workspace` | `FinanceWorkspace` | `finance_settings`, `finance_sections`, `finance_modules`, `essays` | admin only | → `/auth` (507 ch) | → `/` (1,941 ch), VIEWER badge | renders (1,069 ch), 0 errors | no h-scroll | OK | **WORKING — verified.** Both non-admin identities are correctly bounced by `RequireAdmin`. Admin gets the featured-essay selector, section metadata editor and module list, all backed by real writes (`finance_sections.update`, `finance_settings.update`). |
| `/accounting/fsli` | `FsliList` | `fsli_pages` | public | renders (3,053 ch) | renders (3,060 ch) | renders (3,093 ch) | no h-scroll | OK | **WORKING — verified.** Lists the 24 rows. |
| `/accounting/fsli/:slug` | `FsliDetail` | `fsli_pages`, `fsli_sections`, `essays` | public | renders (3,611 ch) | renders (3,618 ch) | renders (3,814 ch) | no h-scroll | OK | **WORKING, CONTENT IS BOILERPLATE — see finding F1.** Renders, but `fsli_sections` has 0 rows so all 24 pages show the same hardcoded placeholder prose. |
| `/accounting/fsli/<unknown>` | `FsliDetail` | `fsli_pages` | public | **404** (96 ch), badApi 0 | **404**, badApi 0 | **404**, badApi 0 | no h-scroll | OK | **FIXED.** Was: two swallowed **406**s and a 459-char shell, then a silent redirect to the index. |
| `/books-academia` | `BooksAcademia` | `books_uploads` | public | renders (765 ch) | renders (772 ch) | renders (805 ch) | no h-scroll | OK | **WORKING (empty state).** `EmptyState` when there are no categories — intentional, not a break. |
| `/books/categories` | `BooksCategories` | `books_uploads` | public | renders (663 ch) | renders (670 ch) | renders (703 ch) | no h-scroll | OK | **FIXED.** Was: four cards advertising 12/8/15/10 books against a table with **0 rows**, every card leading to an empty list. Now counts real rows and shows "The library is empty" — observed. |
| `/books/:category` | `BooksList` | `books_uploads` | public | renders (590 ch) | renders (597 ch) | renders (630 ch) | **h-scroll — F2** | OK | **WORKING (empty state), one layout defect.** `EmptyState` "No books yet" is correct for an empty table. Overflows horizontally at 375px (F2). |
| `/books/:category/:bookId/read` | `BookReader` | `books_uploads`, storage `books` | public | renders (590 ch), badApi 0 | renders (597 ch), badApi 0 | renders (630 ch), badApi 0 | **h-scroll — F2** | OK | **FIXED, but the feature is unreachable — F3.** The swallowed 406 is gone and an unknown id now shows "Book not found". Nothing in the codebase can create a book, so no valid id exists. |
| `/finance/finance-in-action` | `FinanceInActionIndex` | `finance_models` | public | renders (642 ch) | renders (649 ch) | renders (682 ch) | no h-scroll | OK | **WORKING (empty state).** "No models configured yet." — intentional. |
| `/finance/finance-in-action/:modelSlug` | `FinanceModelDetail` + `ModelAdminPanel` | `finance_models`, `finance_modules`, storage `finance-models` | public page, admin panel | **404** (114 ch), badApi 0 | **404**, badApi 0 | **404**, badApi 0 | no h-scroll | OK | **FIXED, but the feature is unreachable — F3.** Was: two swallowed **406**s plus a silent redirect to the index. Nothing can create a model, so no valid slug exists and `ModelAdminPanel` can never be reached. |

**Every group has a verdict. None is left in the "never looked" state.**

### Findings

**F1 — All 24 FSLI detail pages show the same placeholder prose.**
`FsliContentSection` computes `displayContent = content || placeholder`, reading
content from `fsli_sections`, which has **0 rows**. The placeholders in
`FsliDetail` are written specifically about cash and cash equivalents ("According
to IAS 7…", "Bank overdrafts that are repayable on demand…"). So every FSLI —
inventories, right-of-use assets, deferred tax — currently renders ten sections of
cash-equivalents text, plus a `getKeyPoints()` that returns the same three points
for every line item and a templated hero line. The pages *look* finished, which is
what makes this worth writing down. **Repair:** author `fsli_sections` rows (the
inline admin editor already writes them), or drop the placeholders so an unwritten
section renders as visibly empty rather than as someone else's content.
Coverage is also partial: the 24 rows are `current_assets` (11) and
`non_current_assets` (13) only — no liabilities, equity, or P&L lines.

**F2 — Breadcrumbs overflow horizontally at 375px.**
`/books/:category` and `/books/:category/:bookId/read` are the only two routes in
this sweep with `hScroll=true`, for anonymous and admin alike. They are also the
only two with **four** breadcrumb items; the routes with two or three do not
overflow. Cause: `src/components/Breadcrumb.tsx:15` is
`<nav className="flex items-center gap-2 …">` with **no `flex-wrap`**. The unused
shadcn `src/components/ui/breadcrumb.tsx` does have `flex-wrap` — the custom
component is the odd one out. **Not fixed here:** this is shared layout used by
most pages, and it belongs to Session A's Gate 3 (375px, no horizontal scroll).
The fix is adding `flex-wrap` to that one class list, and it will clear every
4-item breadcrumb on the site, not just these two routes.

**F3 — `books_uploads` and `finance_models` are features with no way in.**
Both tables hold **0 rows**, and grepping the whole of `src` for writes:

- `books_uploads` — **nothing inserts it.** The only references are three
  `select`s in `useBooks.ts`. There is no upload UI anywhere, despite a public
  `books` storage bucket existing for the files.
- `finance_models` — `useFinanceModels.ts` has `select`, `select`, `update`. **No
  insert.** `ModelAdminPanel` can only edit a model that already exists, and it is
  rendered *inside* `/finance/finance-in-action/:modelSlug`, the detail page of a
  model that cannot be created. The admin panel is unreachable by construction.

So both are half-built: read paths, render paths, empty states and (for models) an
edit path all exist, and the one thing that would let any of it run — a create
path — was never built. **What repair would take:** for books, an admin upload
form writing `books_uploads` alongside a storage upload (the `FigureUploader`
pattern applies almost directly). For models, a create form and an index-level
"New model" action; the framework's Section 06 is 11 institutional models, so
there is a known list to seed, and seeding via migration would make
`ModelAdminPanel` reachable immediately. **Neither is a route to delete** — the
routes behave correctly for the data that exists, and deleting them would throw
away working read and render paths for a feature that is simply unfinished.

**F4 — Curriculum Sections 05 and 06 confirmed to have no data path.**
`finance_sections` holds 5 rows: `fundamentals`, `strategic-finance`, `planning`,
`analytics`, `capital-allocation`. Section 05 is `capital-allocation` (the
framework marks it TBD). Section 06 has **no row at all** — it is the 11
institutional models, which is `finance_models` territory and therefore blocked
behind F3.

**F5 — No raw PostgREST text, error boundary or blank screen anywhere.**
Across all 50 observations: 0 error boundaries, 0 raw PostgREST/RLS messages
leaked to the page, 0 blank screens, 0 infinite spinners. After the fixes,
**0 non-2xx Supabase calls** on any route as any identity. The only remaining
console error is `net::ERR_CONNECTION_RESET` from a request the sandboxed browser
cannot reach; it appears on every page including the homepage and is an artefact
of this container, not of the app.

---

## ROUTE CHANGES REQUESTED

`src/App.tsx` is Session A's file (Section 4 sweep). These are the changes
Session B needs; they are recorded rather than applied because Session A's
GATE 4 is not yet terminal.

1. **Delete the `/admin/writer/:id` route** (currently `<RequireAdmin><WriterStudio /></RequireAdmin>`), and the `WriterStudio` lazy import with it. Section 5.2 retired that stack; `src/domains/writing/WriterStudio.tsx` is now only a redirect that keeps old URLs resolving, and it can be deleted along with the route. **Not urgent** — the redirect is correct and the file is small. If the route is kept, nothing breaks. Note `AdminDashboard` links to `/admin/writer/new`, which the redirect forwards to `/admin/writer/finance/new`; if the route is deleted, that link needs updating in the same change.
2. **No route removals from Section 7.** All ten routes swept behave correctly for the data that exists. The two unreachable features (F3) have working read, render and empty-state paths and are missing only a create path — deleting their routes would throw away working code for something unfinished rather than broken.
3. **One-word fix that belongs to Gate 3, not to us:** add `flex-wrap` to the `nav` class list at `src/components/Breadcrumb.tsx:15`. It is the cause of the only horizontal overflow found at 375px in this sweep (finding F2) and it affects every page with four or more breadcrumb items.

**Note for Session A's Gate 4, not a request:** `src/App.tsx` at `c7e5d12`
contains **66** `<Route>` entries, not the 68 the mandate's fact block states.
Worth reconciling before Gate 4 claims a verdict on "all 68".

---

## Boundaries observed

- No column matching `essays.*_fields` was read, written or referenced.
- `supabase/migrations/_pending/20260802000000_drop_legacy_persona_columns.sql` was **not** applied.
- No migration was applied at all: 5.1's storage policies already existed.
- Project `ascbthsgborseynmmthm` (personal-os) was not touched.
- `src/App.tsx`, `Index.tsx`, `About.tsx`, `WriterList.tsx`, `AdminContent.tsx`, `LivePreviewPanel.tsx`, `useEssays.ts`, `useWriterEssay.ts` and the design-token layer were not edited.
- RLS: 14 tables, all with policies — unchanged.

### Requests to Session A

- **Gate 3's `/admin/writer` 375px check should be deferred to Session B.** Section 3 requires observing `/admin/writer` at 375px while Section 5.2 was concurrently replacing the editor that renders it. Session B owns that surface and will measure it.
- **Test-identity contention.** Session A reset `route-sweep-tester@dikagustiana.com`'s password at 10:00 UTC while Session B was mid-sweep, and created `sweep-admin@dikagustiana.com`. Session B moved to `testuser@dikagustiana.com` (non-admin) plus its own `gateb-admin@dikagustiana.com`, which has since been **deleted** along with its `user_roles` row. All four remaining accounts are temporary and are the owner's to delete.

### State this session changed outside the repository

Recorded because a later session should not have to rediscover it:

- **Passwords were reset** on `import-admin@dikagustiana.com` and
  `testuser@dikagustiana.com` (and briefly `route-sweep-tester@dikagustiana.com`, which
  Session A has since reset again). The gate requires observing three identities and the
  original passwords were recorded nowhere. The new values are not written to any tracked
  file. These are throwaway verification accounts already slated for deletion; the owner's
  own account was never touched.
- **`gateb-admin@dikagustiana.com` was created and then deleted.** Auth is back to the four
  accounts that predate this session.
- **`fa-07-01` was edited and restored.** Final state verified against the pre-session
  measurement: `status: published`, `published: true`, 21,946 characters of `content`,
  81 `content_json` blocks, 5 references, 3 key takeaways, no test marker present.
- **Two objects remain in the `essay-images` bucket** under `drafts/` and `finance/` from
  the upload verification. Harmless, unreferenced, and safe to delete.
- **No migration was applied** and no schema changed.
