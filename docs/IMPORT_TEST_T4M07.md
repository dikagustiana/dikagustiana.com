# Import test — T4-M07 Essay 1, "Driver Tree Construction"

One real 3,246-word essay taken all the way in: authored through the editor as admin,
placed in the curriculum tree, saved, published, and read back as an anonymous visitor —
then diffed against source. This document records the decisions the test forced and, most
importantly, **the list of things the source document contains that the schema or editor
cannot currently represent.** That last list is the specification for what to fix before
the remaining 159 essays go in.

Live project: `asypkbkiebjvvpimewfp` (dikagustiana-com, ap-southeast-1). The essay is
published at **`/finance/analytics/t4-m07/fa-07-01`**.

---

## Verdict

| acceptance check | result |
|---|---|
| Every source heading present at a consistent, deliberate level; zero dropped | **PASS** — 10 H1→h2, 3 H2→h3, 0 h1 in body, nothing dropped |
| All 10 section breaks present; paragraph count matches source | **PASS** — 89/89 source body blocks present verbatim |
| Display equations render as intended and survive publish | **PASS** — 7 equation callouts render as bold paragraphs, present in editor + published |
| ANCHORS USED and Post-Flight land where decided, and it's written down | **PASS** — see §4 |
| Essay resolves at its real URL, derived from taxonomy not hand-typed | **PASS** — `/finance/analytics/t4-m07/fa-07-01` |
| Anonymous can read once published; could not while draft | **PASS** — anon saw 0 of 105 drafts; sees it after publish |
| Incoherent placement rejected by the database | **PASS** — trigger refused module_id + green-transition category (ERRCODE 23514) |
| Autosave survives a hard reload mid-paste | **FAIL** — the editor at `/admin/writer` has no autosave (see §6) |
| Content round-trips save → cold reload unchanged | **PASS** — editor census identical before/after reload; 89/89 blocks |
| Preview matches published page | **PASS** — text-level diff: 0 blocks missing from either surface |

Nine of ten pass. The one failure (autosave) is a missing feature in the surviving editor
stack, not a data-loss bug in this import.

---

## 1. Slug scheme — `t{track}-m{module}`

`finance_modules.slug` is globally UNIQUE, and "Module 07" exists in four sections. A slug
of `module-07` inserts once and then fails on the second track.

**Decision:** use the framework's own cross-reference convention. The document writes
references as `T1-M09`, `T3-M01`, `T4-M07`, `T4-QM3` ("Draws From T1-M09 Cash Flow
Analysis"), so the slug is the lowercase of that: **`t4-m07`, `t1-m07`, `t1-m08a`,
`t4-qm3`**. It is the identifier the source treats as canonical; any other scheme
disagrees with the document. Verified live: `t1-m07` and `t4-m07` coexist, and the essay
resolves at `/finance/analytics/t4-m07/fa-07-01`.

`UNIQUE (track_slug, sort_order)` is also present and is load-bearing separately — the
essay-stub seed resolves `module_id` by scalar subquery on `(track_slug, sort_order)`.

## 2. `sort_order` vs display label — integer key, text label

Module numbering is not integer: `08A`, `08B`, `14B`, `14C`, `QM1`–`QM3`.

**Decision:** `sort_order` stays the INTEGER **ordinal position within the track** (the
column three existing consumers — the `UNIQUE`, the FK ordering, the stub subqueries —
already depend on), and the label the reader sees moves to **`module_meta.display_label`**
(`'07'`, `'08A'`, `'QM1'`). So `08A`/`08B` occupy ordinals 8 and 9 and are never coerced
into one number. Verified: both exist at ordinals 8/9 with distinct labels.

`module_meta` also now carries `academic_mapping` — the framework's Academic Mapping table
(reference · chapters · depth) as reference data, exactly what `module_meta jsonb` is for.
(Applied for the 4 test modules; the full 49-module academic-mapping enrichment is the
deferred migration in §8.)

## 3. Heading levels — the essay title is the page H1; body headings demote by one

The source uses 10 H1s and 3 H2s. The editor's `getEditorExtensions()` / `RichTextEditor`
configures `StarterKit` with `heading: { levels: [2, 3] }`, so **H1 is not in the schema**.
An unrepresentable node does not error — it disappears. This is the single most dangerous
spot for silent content loss.

**Decision:** the essay title is the page's H1; **body headings demote by one level on
import** (H1→H2, H2→H3). Rationale: a document should have exactly one H1 (its title), and
demotion preserves the full heading hierarchy inside the allowed `[2,3]` range without
touching the editor schema. Verified end to end: 10 `<h2>` + 3 `<h3>` in the editor, in
the saved HTML, and on the published page; zero `<h1>` in the body; zero headings dropped.

## 4. Structure with no obvious home — where ANCHORS and Post-Flight went

- **ANCHORS USED** (the source-citation block in the front matter) → the **References
  component** (`economist_fields.references`, rendered by `ArticleShell` → `References`).
  It is bibliographic metadata, not body prose, and the app already has a first-class home
  for it. 5 references saved and rendering on the published page. The MISNUMBERED/VERIFIED
  annotations are kept verbatim in the reference label text.
- **Post-Flight** (Claim trace, Gate 2 discrepancies, Least-confident assertions) → **body
  content**, as a demoted `<h2>Post-Flight` with `<h3>` subsections and bullet lists.
  Rationale: it is authored prose the reader should see, not structured metadata, and it
  has no dedicated schema field. It round-trips and renders on the published page.
- **Display equations** (e.g. `IDR 60 billion x 1.05 x 0.98 = IDR 61.74 billion`) → **kept
  as bold paragraphs**, not promoted to a math block. Rationale: they are already
  plain-text arithmetic with `x` as the multiplier, not LaTeX; a KaTeX math block would be
  a new node type requiring the full four-place contract for zero rendering gain on this
  content. Revisit only if real LaTeX (fractions, integrals, Greek) appears in a later
  essay. 7 render as bold in editor and published, byte-stable across publish.

## 5. Placement — how many fields were hand-set

Opening the `fa-07-01` stub in the editor, the editor **derived** every placement field
from the seeded stub:

| field | derived? |
|---|---|
| Title | ✓ derived (framework essay-1 title) |
| URL slug (`fa-07-01`) | ✓ derived, and disabled (immutable on an existing essay) |
| Category (General / finance-general) | ✓ derived |
| Finance Module (`[analytics] Driver-Based Forecasting…`) | ✓ derived |
| Finance Order (1) | ✓ derived |
| Lesson Type (concept) | ✓ derived |

**Placing the essay into Section 04 → Module 07 → Essay 1 required setting zero fields** —
it was one action (open the stub). Two other fields had to be hand-set, and both are
findings:

- **Deck Line** (required) — the essay subtitle. Legitimately author-supplied.
- **Topic/Phase** (required `*`) — I had to pick a value, but **the module already fixes
  the topic**. For a curriculum essay this field is redundant; the editor should derive it
  from the module or drop it. **Fix before scale.**

For a *net-new* essay (not a pre-seeded stub) the author would pick Section → Module from
the two dropdowns; that is the "one action" the mandate asked for, and it works.

## 6. THE FIX LIST — what the schema/editor cannot represent (fix before the other 159)

This is the most valuable output of the test. In rough priority:

1. **No autosave in the surviving editor.** `canAutosave()` exists only in `WriterStudio`
   (Stack B); the editor actually mounted at `/admin/writer/:section/:slug` is `WriterEditor`
   (Stack A), which has only a manual "Save Draft" button. Verified: pasting a large body
   and hard-reloading **without** clicking save loses everything. The Phase-2 editor
   consolidation ("Stack A composition wins, Stack B plumbing wins") must port autosave
   into the surviving editor. **Acceptance-bar failure.**

2. **No image support in the body.** `RichTextEditor` runs `StarterKit` only — no `Image`
   extension. A pasted or dropped image is silently dropped (verified: 0 images before, 0
   after paste). The only working upload path is the hero image (`ImageUploader` →
   `essay-images` bucket → `thumbnail_url`) and figure blocks. Mid-body images are exactly
   Phase-5-item-2 future work, and they need the full **four-place contract** (extensions,
   serialize, ArticleBody, sanitizeHtml) or they will vanish after publish.

3. **`Topic/Phase` is required but redundant for curriculum essays** (§5). Derive from the
   module or drop it for finance-section essays.

4. **Publishing requires ≥3 Key Takeaways, which the source essay does not supply.** The
   publish gate (`WriterValidation`) hard-requires 3 filled takeaways. For this test I
   derived 3 from the essay's own doctrine sentences. For 160 imported essays this is
   either a bulk-authoring burden or a gate that should be relaxed for curriculum content.

5. **Body is stored as HTML, not TipTap JSON.** `RichTextEditor.onUpdate` calls
   `editor.getHTML()`; `essays.content` holds HTML, and `content_json` is unused by this
   editor. The `content_json` pathway the spec describes lives on the *other* (retired)
   stack. If canonical-JSON storage is wanted, it must be wired into the surviving editor.

6. **The "Draws From" dependency graph has no home.** The framework's cross-references
   (`T1-M09`, `T3-M01`, …) form a module dependency graph. No table represents it. Left
   out of this seed by design; a candidate home is `module_meta.draws_from` (an array of
   module slugs) — **flagged as an open design question**, not built.

7. **`finance_settings.featured_finance_essay_id`** and similar single-value config are
   fine, but note the essay's **section cache is not auto-synced** when its category
   changes (documented in the placement-coherence migration). Out of scope here.

## 7. Curriculum seed — counts vs the framework's own claim

Seeded from `curriculum_framework_v2.docx`:

| | framework overview table | seeded | note |
|---|---|---|---|
| sections | 6 | **5 rows** | Section 06 "Finance in Action" holds *models*, not essays — `finance_models` territory, out of scope (§9). Sections 01–05 seeded; 05 is the row only (TBD). |
| modules | 49 | **49** | all on the `t{n}-m{label}` scheme with display labels |
| essays | 160 | **161 stubs** | see the discrepancy below |

**The 160-vs-161 discrepancy is internal to the source document.** Its overview table
claims 55 essays for Fundamentals (160 total); its own module-by-module essay lists sum to
**56** for Fundamentals (161 total). The module-level detail is the authoritative side — it
is the actual enumerated essay list — so the overview roll-up undercounts Fundamentals by
one. Seeded to the module detail: 161 stubs (56 Fundamentals `ff-*`, 55 strategic `sf-*`,
25 planning `pf-*`, 25 analytics `fa-*`, one of which — `fa-07-01` — is the published essay
from this test).

Every stub is `published = false`; the deck (framework text after the first colon) is in
`snippet`. **Draft-leak check passed:** anonymous and non-admin sessions each see only the
2 published essays and 0 of the 161 draft stubs — enforced at the RLS layer
(`essays_select_anon_published USING (published = true)`), so no navigation, count, or
"next essay" component can leak a draft regardless of what it queries.

## 8. Deferred (committed, not applied)

The per-module Academic Mapping tables for all 49 modules and the essay decks for the 105
pre-existing strategic/planning/analytics stubs were generated but **not** folded into the
applied migration, to keep it reviewable. The 4 test modules carry `academic_mapping` as
the proven pattern. The full enrichment is a straightforward follow-up migration.

## 9. Explicitly not built

- **Section 06 Finance in Action** — 11 institutional models with an Objective · Draws From ·
  Strategic Decision shape. That is `finance_models` territory (a different table with
  `documentation jsonb`, `module_references`, `excel_file_url`), out of scope for a writing
  test. To model it: map each model's Objective/Draws-From/Strategic-Decision into
  `finance_models.documentation` and resolve "Draws From" module slugs into
  `module_references`. Not started.
- **Section 05 Capital Allocation modules/essays** — framework marks them TBD. Seeded the
  section row only; invented nothing.
- **The "Draws From" dependency graph** — see §6 item 6. No new table created this session.

---

## How the test was run

Through the real editor UI (Playwright driving Chromium against the dev server), logged in
as a temporary admin, not via direct SQL — a SQL insert proves the table accepts a row,
which is not what was under test. Because the in-container browser cannot complete TLS to
`*.supabase.co` through the egress gateway, dev traffic was routed through a local
CORS relay (`scratchpad/import/relay.mjs`) that forwards to the real project via Node
fetch; the app, RLS, triggers, storage, and edge function are all the real live project.
Every count in this document was measured programmatically (DOM census + text-level block
diff), not by eye — 3,246 words is exactly the length where an eyeball check misses a
dropped paragraph.
