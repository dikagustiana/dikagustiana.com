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

_Filled in below once the three-identity sweep completes._

---

## ROUTE CHANGES REQUESTED

`src/App.tsx` is Session A's file (Section 4 sweep). These are the changes
Session B needs; they are recorded rather than applied because Session A's
GATE 4 is not yet terminal.

1. **Delete the `/admin/writer/:id` route** (currently `<RequireAdmin><WriterStudio /></RequireAdmin>`), and the `WriterStudio` lazy import with it. Section 5.2 retired that stack; `src/domains/writing/WriterStudio.tsx` is now only a redirect that keeps old URLs resolving, and it can be deleted along with the route. **Not urgent** — the redirect is correct and the file is small. If the route is kept, nothing breaks.
2. See the Section 7 table for route removals, once it is filled in.

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
- **Test-identity contention.** Session A reset `route-sweep-tester@dikagustiana.com`'s password at 10:00 UTC while Session B was mid-sweep, and created `sweep-admin@dikagustiana.com`. Session B has moved to `testuser@dikagustiana.com` (non-admin) and `import-admin@dikagustiana.com` (admin) to stay clear. All four accounts are temporary and are the owner's to delete.
