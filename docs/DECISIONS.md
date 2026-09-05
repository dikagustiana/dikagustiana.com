# DECISIONS

Design decisions taken during the full-site upgrade pass, with rationale and rejected
alternatives. Newest first.

---

# 2026-09-05 — The chain at two distances: the headline wins, the lenses overlay, the mapping ships empty

**The About map is rebuilt around one verbatim sentence — "Nothing here is complicated. It
only looks that way from the wrong distance." — and the diagram is subordinate to it.** Three
versions preceded this one in a single day: a toggle-and-panel map on About, a ledger-green
standalone plate proposed for the landing page, and that plate mounted in place of the homepage
hero. All three are gone. The homepage has its hero back (the DELIBERATE KEEP in
`HeroSection.tsx` stands); About carries the plate; the landing page waits — "masuk ke About
dulu, belum ke landing page".

## Owner decisions taken in session, recorded so they are not re-litigated

- **The chain is an hourglass** — narrows to primary processing, widens after distribution.
  This reverses the morning brief of the same day, which forbade claiming any chain shape. The
  later brief marks it final content; it is drawn, not captioned: lane count carries it on the
  wide plate, box width on the tall one.
- **Content is final.** Four categories never share a visual treatment (transformation stage,
  intermediary node, spanning layer, physical return). Logistics is a spanning layer, not a
  parallel stage. Energy is a perpendicular input into every stage, not a first stage. Two
  flows run against the goods: money right-to-left, physical returns.
- **The enabling-layer table under the map is dissolved, not tidied.** At rest only two bands
  survive — logistics and warehousing; regulation and standards. Contract capacity (makloon,
  toll manufacturing) is deleted outright, not kept in any form. Principal–distributor contract
  governance is an attribute of one joint (manufacturing → distribution), visible only under a
  lens. Monetary policy, fiscal policy and the external balance moved into the ECONOMY lens;
  credit and working capital (DSO, DIO, DPO — who finances whom) into UNIT ECONOMICS.
- **No figures.** Not percentages, not amounts, not "illustrative" magnitudes. The map carries
  the anatomy of a slice — what attaches at a joint and which way the cost moves — never its
  size. `tests/unit/industryChain.test.ts` asserts no digit appears in the data or the
  generated plate.
- **The joint → module mapping is data, not a design decision.** `src/data/chainCurriculumMap.ts`
  ships EMPTY with the schema documented (joint · moduleSlug · moduleClass ∈ chain-located,
  chain-wide, off-chain). Only chain-located rows attach. Nothing was guessed from module
  titles: a module linked to the wrong joint does more damage than a joint with no module yet.
- **Placement:** the earlier same-day choice "the plate replaces the hero" is superseded by the
  later brief; the hero is back and the About section carries the map.

## Decisions taken here, with the alternative rejected

- **The lens control is the sentence.** The supporting line under the headline names the two
  lenses, and those two words are the two buttons (dotted underline at rest, solid in the lens
  colour when on, `aria-pressed`). Rejected: a toggle bar above the map (the previous brief
  killed it — controls announced before anything is worth controlling) and buttons under the
  plate (chrome that competes with the headline for the entry point).
- **Palette stays inside the navy system; the two lenses take the two accents it already has.**
  ECONOMY = `--accent` (navy; cool recedes, the far reading). UNIT ECONOMICS =
  `--accent-editorial` (the Substack orange; warm advances, the near reading) — used only as a
  field and an edge, never as text: as text it measures 2.4:1 on `--card`, below AA. Rejected:
  `--destructive` (passes contrast, but it is the delete-button red and would couple a lens to
  admin semantics) and a new token (the brief said not to touch the theme).
- **Returns are neutral** (`--muted-foreground`, dashed) so that red means exactly one thing on
  the page. The oxide-red returns of the standalone plate also cut through text.
- **The unit-economics strip mirrors the hull's own lower edge.** Slice thickness at each column
  is the hull's half-height there, so cost per unit visibly falls to processing and rises after
  distribution from the SAME geometry as the base map — the two lenses cannot disagree on the
  shape. Rejected: a cumulative stacked bar (its step sizes are implied magnitudes, and it does
  not read as an hourglass).
- **Information flow is no longer drawn.** The brief's final content names two counter-flows and
  a resting state of "the chain and two bands, nothing more"; information was neither. The
  by-product branch is kept, small, as a forward flow out of processing.
- **The regulation band is "Regulation and standards"**, because fiscal status moved into the
  ECONOMY lens under the brief's own split.
- **Geometry is generated, not hand-placed.** `scripts/build-chain-plate.mjs`
  (`npm run build:chain`) imports `src/data/industryChain.ts` directly (Node type stripping)
  and writes `ChainPlateSvg.tsx` and `chain-plate.css`; a test checks the generated file is in
  sync with the data. Rejected: hand-authored SVG — two layouts × ~200 coordinates do not stay
  on one grid, and the third same-day rework proved it.
- **Mobile is a redesign, not a shrink.** The hourglass stands upright (box width carries the
  pinch); the two bands become rails on the far left; returns run the gutter beside them; both
  lenses write into a right-hand column with wrapped notes; the curriculum panel drops below.
- **Skills:** `frontend-design` (and `design-direction`, which `component-craft` refers to) are
  not in the account's library. `artifact-design` and `artifact-diagramming` stood in for the
  page-level direction; `component-craft` was used as briefed.

## What a future session must not undo by accident

- The headline is verbatim, and a test asserts it. Do not rewrite, soften or lengthen it.
- No digits anywhere in the map — data or generated plate. A test asserts it.
- A joint with no chain-located mapping renders NO target: not a disabled one, none.
- In the curriculum panel a draft lesson is inert text labelled "Coming soon" on the same
  `published` flag `FinanceTrackIndex` uses. Never a link that 404s.
- Every colour on the plate is a token. `chain-plate.css` is generated; edit the generator.
- Test floor raised 299 → 309 (312 tests; the map's 19 replaced by the plate's 29).

# 2026-08-03 — The structure is public: draft titles and decks render to everyone

**Owner decision, reversing the 2026-08-01 rule "do not make drafts anon-readable" —
with its scope stated precisely: titles and decks only, never bodies.** Anonymous
visitors used to see module names and a count; the curriculum's structure — the
titles and decks of the 159 unwritten essays — now renders publicly, labelled
`Coming soon`, with the author shown. The ledger rows that asserted an anonymous
reader sees zero drafts are rewritten in place (`docs/GATE_LEDGER.md` rows 1b, D,
W2 and two bulleted notes) rather than left contradicting the code.

## The mechanism: a column-enumerating view, because RLS is row-level

Postgres RLS cannot express "unpublished rows, some columns". Loosening
`essays_select_anon_published` would hand anon the entire row — `content` and
`content_json` included — publishing 161 unwritten essays and exposing whatever is
mid-draft. That policy is untouched (non-negotiable, and re-measured: its qual is
still `(published = true)`). The exposure is the **`essay_structure` view**
(migration `essay_structure_public_view`), whose SELECT list is the whole public
contract: `id, slug, title, snippet, author, section, module_id, finance_order,
published` — plus `read_time` and `lesson_type` NULLed until published, so an
unpublished row exposes exactly the enumerated set and nothing presentational
leaks early. Scope `status IN ('draft','published')`: archived essays are
soft-deleted and must not resurface as `Coming soon`, and any future status stays
hidden until deliberately exposed.

**The `security_invoker` question, answered explicitly because getting it backwards
fails in one of two opposite ways:** the view is created `WITH (security_invoker =
false, security_barrier = true)`. Invoker semantics would apply the CALLER's RLS to
`essays` underneath — anon would see only published rows through the view and the
feature would expose nothing. Definer semantics (the deliberate choice) read
`essays` as the view's owner (`postgres`, the table owner, whom RLS does not bind),
so the view's column list and WHERE clause are the entire boundary. Supabase's
linter flags SECURITY DEFINER views; here that property is the point, and the
narrowness of the SELECT list is what makes it safe. A view cannot carry `CREATE
POLICY`, so its explicit access policy is the privilege layer: `REVOKE ALL` from
PUBLIC/anon/authenticated first (Supabase default privileges grant ALL to new
objects), then `GRANT SELECT` to anon and authenticated only.

## Drafts are inert, not disabled

A draft title that looks clickable and does nothing — or 404s — reads as broken,
and that failure has shipped here twice (track-index rows that were not links; the
dead `?theme=` tabs). Unpublished rows for readers are plain `<div>`s: no anchor,
no handler, no tabindex, muted text, `cursor-default`. Not a disabled link, not an
anchor without a target. For admins the same row keeps routing into the editor,
and the pencil stays admin-only. Published rows are byte-for-byte the interaction
they were: link, byline, read time.

## The name rule, updated to match the owner's call

The 2026-08-02 hero decision recorded the standing rule as "the name appears where
LinkedIn or email is attached" — one rendered occurrence, the footer contact line.
**The owner has now decided the byline stays on essay rows: `Coming soon · Dika
Gustiana` on every unwritten essay, `Published · Dika Gustiana · …` on published
ones — roughly 161 rendered occurrences. That is settled; do not delete these
bylines as a rule violation.** The rule as it now stands: the name appears on the
footer contact line, AND as the author byline on essay rows and essay pages —
authorship attribution on a byline is not the self-promotion the hero rule
removed. The hero itself stays byline-free; nothing about the 2026-08-02 hero
change is reopened.

## Module counts are derived; section landings are not

`useTrackEssayCounts` now derives both `published` and `total` per module from
`essay_structure` — the stored `module_meta.essay_count` is no longer read
anywhere (`useModuleLessonCounts`, its only other reader, had zero consumers and
is deleted as dead code). Verified at switch time: **all 49 modules' stored counts
equalled their real row counts, zero mismatches** (gate S7), so no rendered number
changed and the stored values are confirmed correct rather than inherited from the
framework document's 55-vs-56 inconsistency. The derivation is **module-level
only**: Accounting and Green Transition carry real work as hand-built static pages
that are not `essays` rows, so a derived count would understate section landings —
do not extend it there. The now-unread `essay_count` key's removal is staged as a
follow-up migration (SQL in the session log), to be applied only after production
pages are confirmed reading the derived source — the *_fields precedent: the drop
never travels with the new read path.

## The count line keeps its place — reported, as asked

`0 of 56 essays published` above a list of 56 visible titles would merely repeat
the page — if the titles were visible at rest. They are not: modules are collapsed
by default, so the per-module `n of N published` is the only signal of a module's
size and progress until it is expanded, and the track-level line aggregates 49 of
them. The counts summarise what expansion would show, repeat nothing the reader
can already see, and are now derived from the same rows as the titles, so they can
never disagree with them. Kept, on that reasoning.

---

# 2026-08-03 — The Brief companion

Every essay gets an optional companion: a Brief — 500–600 words, written days after
the long essay is published, explaining the same thing in a fraction of the space. It
is a **writing exercise** (compression as a test of understanding, the form every
scholarship-application artefact takes), not a reader convenience. Consequence that
governs the build: **if a Brief is ever machine-generated the feature has no value**,
so there is no summarise button, no AI-assist affordance, no generate-from-long
action — not now, not behind a flag (GATE B7 greps for this).

Settled by the owner, recorded here so they are not reopened: two views of one essay
at one URL; labels `Full · Brief` near the title; Full is the default; the toggle
renders only when a Brief exists (no placeholder, no disabled state); optional with
no publish gate; long first, then compress; flowing prose only (no headings, tables,
figures or lists — bold and links fine); visible live word count with 500–600 stated.

## The word-count reconciliation — record this before someone "fixes" it

The long-form writing canvas was deliberately stripped of its word count (the bar
comment in `WriterEditor.tsx` still says why: "a word count in the corner is a number
the writer will watch"). That was correct and stays correct. The Brief editor shows
one, live. These are not in tension. **The rule: a word count is part of the work
when there is a target, and noise when there is not.** The long essay has no word
target, so the number is only distraction; the Brief's 500–600 target is its
constraint, so the number is the task. A later session noticing the inconsistency
must not converge the two surfaces in either direction.

## Delegated decision 1 — where the Brief is written: a dedicated surface that never loads the long body

**Chosen: a separate Brief editor at `/admin/writer/:section/:slug/brief`
(`BriefEditorPage` → `BriefEditor`), which never mounts an editable long body.**
Rejected: the long editor with the body rendered read-only in Brief mode behind an
explicit switch-to-edit control.

Writing a Brief means opening a *published* essay — 161 times, tired, at midnight.
On a shared screen, the 26,000-character body is one mode-switch away from a stray
keystroke, and modes invite mode errors: the read-only variant protects exactly until
the author flips it, which is precisely when the protection matters. The dedicated
surface closes the risk **by construction**: no code on that screen writes
`essays.content` or `essays.content_json` — its save statement updates
`brief_json` and nothing else, which is checkable by reading one function
(GATE B2 verifies it behaviourally). Two further effects tipped it:

- **It makes the exercise cleaner.** The long version is not on screen, so it cannot
  be whittled down by copy-paste; the Brief is written from understanding. Consulting
  the long essay means opening its public page — reading, which is the right
  relationship to a published piece.
- **It satisfies "do not touch the long-form canvas" literally.** The chosen shape
  required zero edits to `WriterEditor`/`EssayEditor`; the read-only variant would
  have meant restructuring the canvas around a mode flag.

The Brief editor shows the essay's title and deck read-only (context, not editable
fields), the restricted canvas, the live word count with the 500–600 target stated,
and Save. Autosave follows the published-essay rule regardless of essay status:
backup-only into `essay_revisions` (`brief_autosave`), explicit Save to touch the
row — a Brief's subject is usually live, and one uniform rule beats two.
The Save is guarded on `updated_at` like every other essays write, so a stale tab
loses loudly instead of winning silently.

## Delegated decision 2 — the queue lives in /admin/content, not Personal OS

**Chosen: a Briefs panel on `/admin/content` — published essays with no Brief, age
since publication, oldest first.** A list makes no demand; it is there when he
wants it. A notification for optional work gets ignored, then habitually ignored,
then becomes noise that masks something that matters — the panel is deliberately
not a badge, not a nag, not a count in the nav.

Personal OS (Website page, GROWTH workspace) is where planned personal work actually
gets looked at, and the honest cost of not choosing it is that this list lives where
content is managed rather than where work is planned. But it crosses into a
different Supabase project (`ascbthsgborseynmmthm`), which is an architectural
decision in its own right and out of scope here. **What the Personal OS version
would need, recorded for the day it is wanted:** a read of this project's
`essays` (slug, title, date, `brief_json IS NULL`) from the personal-os app —
either a periodic sync job writing into a personal-os table, or a direct
cross-project fetch with this project's anon key (published essays are
anon-readable, so no secret crosses); a place on the Website page to render it;
and a decision about whether completing an item there marks anything here (it
should not — the Brief's existence IS the completion state, single source of
truth). Nothing on this project's side blocks it.

Age since publication is computed from `essays.date` (the stated publication date;
`created_at` fallback), because only one of the five published essays has a
`publish` revision row — the date column is the honest source that exists for all.
An essay published yesterday is inside the normal window; one three weeks unwritten
is a different fact, so the age is printed per row, oldest first, not summarised.

## Delegated decision 3 — an essay leaves the queue when a Brief exists, at any length

**Chosen: exit on existence** (non-empty `brief_json`), not on the Brief landing
inside 500–600 words. A 900-word Brief is a finished Brief that missed its target —
useful information about the exercise, not unfinished work. Any length-based exit
rule turns the target into a gate by the back door: a 700-word Brief pinned
permanently in the queue is a nag, and this feature must never block or nag
(the unwound publish-gate rule is the precedent). The pressure survives as
information instead: the panel's second list — essays whose Brief exists — prints
each Brief's word count, so drift from 600 to 900 to 1,100 is visible without any
rule preventing it.

## Storage shape — one jsonb column, no HTML mirror

`essays.brief_json jsonb`, NULL meaning no Brief. **No HTML mirror**, deliberately.
The long body's `content` (HTML) column exists because it predates `content_json` —
legacy rows still read from it (`ArticleBody`'s second branch). No Brief row
predates anything, so a `brief` HTML column would be a second representation with
no consumer whose only capability is diverging from the first — the exact
`content`/`content_json` failure this project already shipped once. The public
page renders the Brief through `ArticleBody`'s canonical JSON branch; HTML is
derived at read time where needed. GATE B5's divergence check is therefore run in
its honest form for a single-representation body: after a cold reload, the
editor's in-memory document equals the stored `brief_json` byte-for-byte
(canonicalJson), and serialise(parse(·)) over the stored document is stable.

## Brief revisions coexist in essay_revisions by change_type namespace

Same table, same `content_json` column, two new `change_type` values:
`brief_autosave` and `brief_manual_save` (CHECK constraint widened in migration
`essay_brief_companion`). Rejected: a parallel `brief_json` column on
`essay_revisions` (every row would carry a dead column for the other body, and
every writer must know which column to fill); a separate `brief_revisions` table
(a second numbering scheme and RLS surface for what is the same audit trail).

The load-bearing consequence: **every reader must filter by kind.** The revision
helpers in `src/lib/revisions.ts` now define the two namespaces
(`BRIEF_CHANGE_TYPES` / long) and `useEssayAutosave` takes a `body` parameter —
rollup and the recovery probe read only their own kind, while `revision_no`
still numbers across both (the UNIQUE constraint is per essay, not per kind).
Without the filter, the long editor's recovery probe would see a newer
`brief_autosave` row, find it differs from the long body, and offer to "restore"
a 26,000-character essay into its 600-word Brief. The word-count column question
resolved the same way as the mirror: **derived on read, never stored** — one
shared `briefWordCount()` walks the JSON text nodes for both the editor's live
count and the queue's displayed count, so the two numbers cannot disagree and
nothing can go stale.

## The Brief schema is a restriction, not a new contract surface

`getBriefExtensions()` in `src/lib/tiptap/extensions.ts`: paragraphs, text, bold,
italic, links, hard breaks — nothing else. Italic is included though the mandate
named only bold and links: the exclusion list is structural (headings, tables,
figures, lists — the places explanatory load hides), and emphasis is prose, not
structure; an editor that strips emphasis mangles meaning. Everything the Brief
can produce (`p`, `strong`, `em`, `a`, `br`) is already inside all five places of
the content contract — serialize.ts, ArticleBody, the sanitizer allowlist and the
round-trip test already handle these nodes — so the Brief adds **restriction**
tests (excluded nodes cannot exist even via paste, because they are absent from
the schema) rather than new rendering paths.

---

# 2026-08-03 — The Sections list: kept by owner decision, reshaped by subtraction

## The grid stays — owner decision, recorded so it is not relitigated

A design review recommended deleting the homepage Sections grid outright, on the
grounds that four of its six sections have no essay rows at all. **The owner declined
that recommendation.** The grid stays as a surface; what changed is its shape. Do not
reopen the argument; the next session that wants to delete it needs a new owner
decision, not a re-reading of the old review.

## Cards became a divide-y list of titles, and the description slot is REMOVED

Six equal cards with icon chips, six parallel one-line descriptions and a repeated
"Enter →" is the shape that reads as generated. The fix is subtraction, not better
copy: rows in a `divide-y` list, title only, the row itself the link. The description
slot is deliberately gone rather than emptied — six sibling sentences in one meter is
the tell, and a model asked for six parallel descriptions will produce six isometric
sentences again; removing the slot removes the problem. If descriptions return, the
owner writes them.

## Numbering was rejected, deliberately

Easy to get wrong by analogy: `FinanceLanding.tsx` numbers its entries and is this
repo's reference page. But numbering is load-bearing there — fundamentals → strategic
→ planning → analytics is a real learning order. The homepage's five sections are
peers with no order, so `01–06` would be read as rank, and "why does X outrank Y" is
a question with no answer. A list that provokes an unanswerable question is worse
than a plain one. (`FinanceLanding.tsx` itself was not edited: it is the reference,
and converging other pages onto it is right while editing it is how references
erode.)

## IELTS left the homepage and kept its page and nav entry

Likely the highest-search-volume content on the site, so it stays as an audience
asset reachable from Learning → IELTS. It does not sit among the top-level doors: on
a site read by scholarship panels, exam technique beside sovereign lending is a
register collision. The Finance row also now links to `/finance` directly instead of
the `/finance-101` legacy redirect — the row should name the destination, not a
forwarding address.

## Comments may not quote deleted copy (the wrapped-phrase lesson, twice in one session)

`HeroSection.tsx` explained a removed paragraph by quoting it verbatim — including
the owner's name, wrapped across a line break where the phrase-grep gate could not
see it. Reworded to explain the removal without reproducing the sentence; the same
fix applied to `FinanceTrackIndex.tsx`'s comment quoting the old hardcoded byline
string. And the session promptly repeated the mistake in miniature: the first fix for
the fabricated IELTS statistic quoted the bogus number in its explanatory comment,
where the gate grep caught it. The rule that falls out: **a comment explaining a
removal never reproduces the removed text**, and **any grep used as a gate must be
line-break insensitive** (search whitespace-normalised content), or it is a check
that passes because it never really looked.

---

# 2026-08-02 — The hero drops its third paragraph, and with it the only byline

The hero is now **exactly two text blocks and then the CTA**: the h1, one paragraph, "Read
the essays". The third paragraph — "Essays and a curriculum on corporate finance,
accounting, and the economics of the green transition. By Dika Gustiana." — is deleted.
The hero stops after "…and the probability of the future."

**The consequence is deliberate and is the point, not a side effect.** That paragraph was
the only place the owner's name appeared in the hero. After this change the name appears in
**one** rendered place on the site: the footer contact line, next to the LinkedIn link and
the email address. That is the standing rule — the name appears where LinkedIn or email is
attached — and it is the same rule that removed the standalone name heading from the footer
in an earlier session. This is that rule reaching the hero.

*[AMENDED 2026-08-03 — the rule above is superseded in one respect, by owner decision:
essay-row BYLINES are exempt. `Coming soon · Dika Gustiana` renders on every unwritten
essay row and `Published · Dika Gustiana · …` on published ones (~161 occurrences).
Authorship attribution is not the self-promotion this rule removed; the hero stays
byline-free. Full statement in the 2026-08-03 structure-visibility entry. Do not delete
essay-row bylines as a violation of this entry.]*

`mb-12` moved from the deleted paragraph up onto the surviving one, so the CTA keeps its
spacing rather than collapsing to the `mb-6` the second paragraph carried.

**What this costs, recorded so the trade is visible rather than discovered later.** The
deleted sentence was also the hero's only statement of *scope* — the only place above the
fold that named what the site is about. A reader now learns the subject matter from the
Sections grid below, not from the hero. The design audit had separately flagged that
sentence as understating the corpus (it named three subjects while the site ships six
sections, omitting development finance). Deleting it resolves that finding by removing the
claim rather than correcting it. If a scope line is ever wanted back, it belongs **without**
a byline.

**Name occurrences that remain in `src/` after this change, and why each stays.** The gate
asked for the footer contact line only; that is true of *rendered body copy*, and these are
the rest, none of which is a hero byline:

| Location | Kind | Disposition |
|---|---|---|
| `Footer.tsx:24` | rendered contact line, beside LinkedIn | **the one intended occurrence** |
| `SEO.tsx:18` `SITE_NAME` | `<meta>` / `og:site_name` / JSON-LD `publisher` | **kept** — machine-readable identity |
| `SEO.tsx:26`, `Index.tsx:77` | default meta description | **kept** — the search snippet |
| `ArticleShell.tsx:154`, `LongformArticleShell.tsx:115`, `CriticalThinkingEssay.tsx:91` | `author=` fallback into JSON-LD | **kept** — article authorship |
| `ArticleHeader.tsx:62` | rendered essay byline | **kept** — an essay states its author |
| `CapitalConditionCard.tsx:27` | rendered card byline | **kept**, but see below |
| `WriterEditor.tsx:69` `DEFAULT_AUTHOR` | admin default for new essays | **kept** — never public |
| `Auth.tsx:46`, `FinanceTrackIndex.tsx:81` | `noindex` page description; a code comment | **kept** — neither is public body copy |

Stripping the name from meta descriptions, `og:site_name` or article JSON-LD would be
actively harmful for a site whose whole job is being found and attributed by people
assessing the author — so the rule is read as governing **rendered body copy**, not
structured metadata or per-essay authorship. If it is meant to be absolute, the two rendered
bylines (`ArticleHeader.tsx:62` and `CapitalConditionCard.tsx:27`) are the ones to revisit,
and that is a separate decision from this one.

---

# 2026-08-02 — The site accent is navy, and green now has exactly two jobs

## The accent is `hsl(215 60% 32%)` — navy, not emerald

The brand accent was `--accent: 142 71% 45%`, a saturated emerald. It failed WCAG AA in
three separate roles simultaneously, and the repo already knew: the comment at
`src/index.css:112-114` recorded the 2.12:1 figure and a second token, `--accent-text` at
L28, was created as the remedy. That remedy was applied to **one** call site. Links, card
title hovers, section icons and list bullets kept shipping at 2.12:1, and
`group-hover:text-accent` made text *harder* to read on hover than at rest.

A brand colour that cannot be used at brand strength is not a brand colour. So the fix is
the value, not a fourth patch on top of three.

**Measured, in Chromium, from the rendered CSS variables** (not computed by hand — the
script read `getComputedStyle` and applied the WCAG 2.x sRGB formula):

| Role | Threshold | Emerald `142 71% 45%` | Navy `215 60% 32%` |
|---|---|---|---|
| as text on `--card` | 4.5:1 | 2.12:1 **FAIL** | **8.22:1 PASS** |
| as text on `--background` | 4.5:1 | 2.20:1 **FAIL** | **8.58:1 PASS** |
| as `--ring` on `--background` | 3.0:1 | 2.20:1 **FAIL** | **8.58:1 PASS** |
| `--accent-foreground` on it | 4.5:1 | 2.30:1 **FAIL** | **8.95:1 PASS** |

Navy renders as `rgb(33,73,131)`. Two reasons for this hue rather than another:

1. **It shares the 215 hue family with `--primary` (215 28% 17%) and `--foreground`
   (215 25% 17%)**, so it reads as the same system tightening rather than a second brand
   arriving. `FinanceLanding.tsx` — the page the rest should converge on — already uses
   `text-primary` for exactly this job, so this is that page's decision generalised.
2. **It is institutional rather than eco-startup.** The readers are scholarship panels and
   finance/infrastructure contacts. Emerald is the universal success/growth/eco hue; on a
   corporate-finance site it read as a template default.

**Rejected: promoting `--primary` (215 28% 17%) directly to accent.** It measures ~14:1, so
contrast was never the objection. The problem is that `--primary` is within a hair of
`--foreground`, so links would have become indistinguishable from body text and the accent
would have stopped doing the one job an accent has. Navy keeps ~1.6:1 of separation from
body ink while staying in the same family.

`--accent-text` is now redundant by value and is kept as an alias of `--accent` so existing
`text-accent-text` call sites keep working. Collapsing the two is a later, mechanical pass.

## `ghost` and `outline` buttons no longer use `--accent` as their hover surface

This was the same root cause wearing a different hat. Stock shadcn gives `ghost` and
`outline` `hover:bg-accent`, and in stock shadcn `--accent` is a **light neutral hover
surface**. This project repurposed the token as a saturated brand colour but left the
variants pointing at it, so ~80 ghost and outline buttons flooded with brand on hover.

Repointing them at navy would have been just as wrong — a ghost button should not become a
solid dark block. They now use `--secondary` (200 30% 94%), which is this project's actual
light neutral; `--secondary-foreground` on it measures 11.58:1.

## Green is reserved. Two jobs, nothing else

Green is **not** retired from the product, only from the accent role. It is now
`--section-green: 142 71% 45%` and it means exactly two things:

1. **The Green Transition section's own identity** — currently the concept icons and the
   callout on `/green-transition/climate-finance`.
2. **Success states** — `SectionIntro.tsx:142`.

It is never a link, a focus ring, a button, or a generic hover. Anything else that wants to
be green should be navy or `--muted-foreground` instead.

## Two dark-header call sites had to move off the accent entirely

A consequence worth recording because it is not obvious: navy on the dark slate header
(`--header-bg: 215 28% 17%`) measures **1.64:1** — worse than the emerald it replaced,
which measured 6.37:1 there. Both affected sites are admin-only, but leaving them would
have been a knowingly-introduced regression:

- `MainNav.tsx` Writer's Studio link — dropped the tint; `.nav-link` is white/80 at 9.89:1
  on the header, and `.nav-link-active` already marks the active state.
- `Logo.tsx` Admin badge — inverted to `bg-primary-foreground text-primary` (light chip,
  dark type), which stays legible on the header regardless of what the accent is.

**The general rule this establishes: the accent is a light-surface colour.** On the dark
header, use the white/slate pair, not the accent.

## The six-hue section rainbow is gone

`Index.tsx` gave each of the six section cards its own hue (blue-500, purple-500, the
emerald, amber-500, green-500, sky-500) — including two greens two cards apart and two
near-identical blues — and `About.tsx` repeated the same map for essay labels. Both arrays
are deleted. Section icons render in `text-muted-foreground` and pick up the accent on
hover alongside their title; About's section labels are all `text-muted-foreground`.

Distinctness between sections comes from order and typography, not hue.

**Correction to the brief this session worked from:** it stated the raw-palette pollution
was "concentrated in those two arrays, not scattered". It is not. The two arrays were 10 of
112 occurrences; the remaining 102 are spread across 22 files, the largest being
`CapitalConditionDetail.tsx` (22) and `SectionIntro.tsx` (12, a second independent
"voice role" colour axis that tints a full-width band under the header on public section
pages). Both are out of this session's scope and neither was touched. The brief was right
that `DevelopmentFinance.tsx` carries four.

---

# 2026-08-02 — Opening the editorial taxonomy: next-big-thing

## Category slugs: `<section-slug>-<name>`, because one row and one function already agreed

The five categories are `next-big-thing-technology`, `next-big-thing-economy`,
`next-big-thing-society`, `next-big-thing-environment`, `next-big-thing-governance`
(Technology · Economy · Society · Environment · Governance, sort order = navigation
order). The convention was read, not invented: the single existing row is
`finance-general` under `finance`, and `derivePhase()` in
`src/domains/writing/schema/placement.ts` — with tests — already strips
`"<sectionSlug>-"` from a category slug to produce the phase/theme. So the slug scheme,
the derivation function and the reading side's filter values (`essays.phase` =
`technology` …) are one convention, not three. A section wanting differently-shaped
category slugs would break `derivePhase`'s assumption and should change the function
and its tests in the same commit.

## The modal is ONE placement control that switches on the section

Chosen over two separate flows. The section is fixed before the modal ever opens — the
writer entered through `/admin/writer/:section/...` — so the modal renders exactly one
placement block: finance → track/module/order/lesson-type (untouched), accounting →
FSLI line item (untouched), editorial → category. The writer makes one choice and
`WriterEditor` derives the dependent columns the same way it already derived finance's
(`phase` from the category via `derivePhase`, mirroring `phase`/`topic` from the
module). The modal's URL line renders through `essayUrl` itself (with `…` as the slug),
so the preview can never disagree with the canonical builder. The writer never learns
which taxonomy tree they are in — which was the point.

Guard worth naming: `essays.category_id` defaults to `finance-general` at the DB, so a
loaded editorial essay can carry a category from another section. Once a section has
its own categories, that catch-all no longer satisfies "Category is required"
(`categoryBelongsToSection` in WriterEditor) and is deliberately not offered in the
list — otherwise the default would quietly publish essays the section page files
nowhere.

## The editorial canonical URL is three segments: /the-next-big-thing/:theme/:slug

The finance decision (Section 2, six-areas session) put the STABLE placement axis in
the address and kept the volatile one out: `/finance/:track/:slug`. The editorial
equivalent fell out of the route table itself: green-transition, development-finance
and critical-thinking essays already live at `/section/:phase/:slug` — next-big-thing
was the one placed section whose essay URL dropped its axis. Its five themes mirror the
navigation and are as stable as finance's tracks. So: theme (= category slug minus
section prefix, cached as `essays.phase`) is the middle segment;
`/the-next-big-thing/:slug` stays as a resolver that redirects to canonical when a
theme exists and renders directly when none does (no NBT essay existed before today, so
there are no old links to break — but the deployed bundle mints two-segment links until
the next deploy, and they heal). What was finance-shaped about the builder, recorded as
a finding: `EssayUrlInput` had fields for finance and accounting placement but no way
to even RECEIVE an editorial one, and both URL builders (`essayUrl` and placement.ts's
`buildCanonicalUrl` — still two, still kept in lockstep by tests) flattened NBT to two
segments.

## The placement trigger gained the editorial direction; the catch-all hole stays open, named

`validate_essay_placement` now also refuses an essay whose category belongs to a
NON-finance section when `essays.section` disagrees (23514, verified live both
directions). The reverse hole — a non-finance essay holding `finance-general` — is
still legal, deliberately: accounting, books, ielts and tools have no categories of
their own, and while `category_id` is NOT NULL with that default, the catch-all is
their only legal value (the original migration's design note tolerates exactly this).
The hole closes per-section: each section that opens gets its own categories, at which
point its essays stop being satisfiable by the catch-all (the UI already refuses; the
trigger can tighten fully once every section has categories).

## The landing's quick-add dialog is deleted, not fixed

`EssayDialog` on the NBT landing inserted essays with `phase` but no `category_id` —
the DB default filed them under finance-general, dodging the taxonomy this session
exists to open, with no validation, no revisions and no `content_json`. The same
one-authoring-surface rule that retired the FSLI inline editor applies: deleted (with
the never-imported `EssayModule`), and the admin button now links to
`/admin/writer/next-big-thing/new`.

## The ?theme= tabs now actually filter

The section subnav's five tabs linked to `?theme=<topic>` and nothing read the
parameter — dead navigation, the exact class the 65-route sweep missed because it never
clicked the nav. The feed's topic filter state now IS the URL parameter (single source
of truth, shareable filtered views); the dropdown writes it with `replace` so the back
button is not spammed. Verified by clicking the tabs anonymously, not by opening URLs.

---

---

---

---

# 2026-08-02 — Audit triage: what was deliberately not done, and why

## Archive, not soft-delete-with-a-new-column
`essays.status` already contains `archived`; the delete flow uses it instead of a new
`deleted_at` column. No schema change to `essays`, no RLS churn, the admin UI already
rendered the badge — the smallest change that makes deletion reversible. The FK to
`essay_revisions` is `ON DELETE RESTRICT`, so even a deliberate SQL purge must delete the
history explicitly first.

## The publication-state trigger, despite the last trigger disaster
`validate_essay_tone_fields` died referencing columns another migration dropped.
`sync_essays_publication` references only `status` and `published` on its own NEW/OLD row
— it cannot outlive its columns without failing the very migration that drops them. A DB
trigger (not a client fix alone) because the divergence had two live writers and PostgREST
is open to any future one; the guard has to sit below all of them.

## `capital-allocation` stays out of the nav
It is a real `finance_sections` row but has 0 modules and 0 essays. A nav item pointing at
an empty track index advertises nothing. Add it back the day it has content —
`tests/unit/navConfig.test.ts` documents the deliberate absence.

## Findings not acted on this session, with reasons
- **#3 client-side audit log** — with one admin, the log audits the auditor; and the
  destructive action it existed to catch (hard delete) no longer exists in the UI. The
  real fix — server-side trigger logging — becomes worth it the day a second admin
  exists. Accepted for now.
- **#13 CSP report-only with no endpoint** — a header reporting to nowhere is decoration,
  but *enforcing* a CSP on this SPA untested risks breaking the site for no live attacker
  model (one author, no user-generated content from non-admins). Deferred as a scoped
  task: enforce with a tested policy, or remove the noise.
- **#16/#17/#18 (FSLI publish flow, text-typed financials, model versioning)** — verified
  again this session: `finance_models` 0 rows, `fsli_sections` 0 rows, and no insert path
  exists (`ModelAdminPanel` unreachable by construction). Governance for unwritable
  tables is premature. These resurface the day an insert path is built — and #17's
  parseFloat(...)||0 must be fixed BEFORE data entry starts, not after.
- **No framework migration** — agree with the owner. Two published essays do not justify
  a rewrite; the proportionate SEO items (sitemap, robots, absolute OG, honest 404
  signalling) are ranked and waiting (#14, not reached this session).
- **Dependency vulnerabilities** — measured: 11 total (2 critical, 3 high), **5 in
  production dependencies** (2 high). `npm audit fix` without `--force` does not clear
  them; the rest are major-version bumps (vite 5→6 class). Deliberately not churned at
  the end of a session that touched save paths; scoped upgrade next session, with CI now
  in place to catch fallout.
- **#12 unsafe URLs, #14 proportionate SEO, #9 canonical redirects, #10 cache-on-logout,
  #11 role race, hero-texture compression** — not reached; ranked and estimated in
  docs/AUDIT_TRIAGE.md so the next session starts from the list, not from scratch.

# 2026-08-02 — Branch naming, the table of contents, and the embed

## Branches are named for the work they contain, and a merged name is never reused

The writing-surface refactor landed on a branch called
`claude/dikagustiana-sections-5-7-q0jja0` — the name of a branch from two rounds
earlier that had already been merged, describing "sections 5–7" of a mandate the
work had nothing to do with. Anyone reading the history has to open the diff to
find out what the branch was for, and the reused name makes two distinct pieces
of work look like one.

This is the third time a name has outlived its meaning here, after
`RUNBOOK_phase2.md` and the reuse of `phase-2-w564rz`. Names cannot be changed
retroactively once merged, so this is a convention, not a repair:

1. **A branch is named for the work it contains**, not for the mandate section,
   sprint, or session that produced it. `docs/design-handoff-and-byline-verification`,
   not `claude/sections-5-7`.
2. **A merged branch's name is never reused.** A merged pull request is finished;
   a second branch wearing its name makes the history ambiguous and can make new
   commits look like they belong to a closed review.
3. The same applies to documents. A file called `RUNBOOK_phase2.md` outlives
   "phase 2" and then misleads. Name it for what it is about.

## The reader keeps its table of contents

The specification has none, and the sidebar stays anyway. **Owner-decided, with
the reasoning on record so it is not relitigated:**

- The reference's posts run 800–1,500 words with few headings, where a table of
  contents is overhead. These are 3,000-word curriculum lessons: `fa-07-01` alone
  carries **13 headings** across 81 blocks. At that length the reader is
  navigating, not just reading, and a list of sections is the difference between
  finding the driver-tree worked example and scrolling for it.
- The sidebar is already gate-verified — it tracks to the final heading, is
  inline-collapsible below `lg`, and honours `prefers-reduced-motion`.
- Matching the reference on the surface is not worth discarding verified work.
  The specification is a description of the target, not a list of things to
  remove.

## Embed stays a client-side link card

**Decision, with the door left open.** The block ships as a card built from the
URL alone — hostname, title, optional description, linking out. Real oEmbed /
Open Graph metadata is not built. Three reasons, in the order they matter:

1. **Widening the sanitizer is the one change on the list whose mistake becomes a
   vulnerability rather than a broken block.** `sanitizeHtml` forbids `iframe`
   (`FORBID_TAGS`, line 34). Allowing arbitrary iframes on this domain is a
   clickjacking and phishing surface — an attacker with any content-write path
   gets a same-origin frame to overlay or impersonate with. Every other block in
   this menu fails safe; this one would fail open.
2. **There is no demand for it.** These essays cite BIS papers, IMF working
   papers and textbooks. They link to sources; they do not embed video. A clean
   labelled card is what a reader of a 3,000-word finance lesson actually wants
   from a citation.
3. **The cost is a server, not a component.** The browser cannot read another
   origin's `<meta>` tags, so real metadata needs an edge function that fetches,
   parses, caches and rate-limits, and handles the sites that block bots.

**The door:** if a specific need appears — a named source whose preview genuinely
helps — the work is an edge function plus a *narrow* allowlist (specific hosts,
`sandbox` attribute, no `allow-top-navigation`), not a general `iframe` permit.
Ask for it as scoped work; do not widen `FORBID_TAGS`.

# 2026-08-01 — Writing-surface session: what the insert menu offers, and why

## The insert menu ships five items, and only five

The owner's specification lists eight (Image, Video, Audio, Embed/link preview,
Poll, Button, Divider, Paywall). Each was resolved on its own terms rather than
ported.

- **Image — kept, named for what the writer wants.** There is exactly one
  image-ish node in the schema, `figure`. "Image" and "Figure" are the same
  thing; shipping both would be two names for one node. The item is called
  **Image**, because that is the word in the writer's head, and it opens the
  figure uploader — an image plus an optional caption is the whole feature.
- **Divider — kept.** Trivial, already in the schema, in the specification.
- **Table — kept.** An insertion, not a reformat, so this menu is where it
  belongs. It was built and gate-verified last round.
- **Code block — kept, and this was a genuine call.** The specification's option
  set is deliberately small and a code block is not in it. But the curriculum is
  financial analysis: driver equations, model formulas, SQL against a ledger.
  Those want a monospaced block that will not be reflowed or smart-quoted, and
  the alternative — pasting them as ordinary paragraphs — loses that silently.
  It is an insertion, the node already exists in the schema, and it costs one
  row. Kept.
- **Embed / link preview — built as the client-side card. The other version was
  not built, and needs a decision from the owner.** `sanitizeHtml` forbids
  `iframe` outright (`FORBID_TAGS: ['script','style','iframe','object','embed','form']`).
  So the version people usually mean by "embed" — a YouTube or Twitter iframe —
  would render perfectly in the editor and be stripped on publish: the exact
  silent-vanish failure this project keeps hitting. What shipped is a card built
  from the URL alone: hostname, title, optional description, linking out. It
  fetches nothing and embeds nothing, and every tag and attribute it emits is
  already in the sanitizer allowlist, so it survives publish unchanged —
  measured anonymously on a published page.
  **The fork, stated rather than picked silently:** real oEmbed / Open Graph
  metadata needs a server round trip, because the browser cannot read another
  origin's `<meta>` tags. That is a new Supabase edge function (fetch, parse,
  cache, rate-limit, and handle the sites that block bots), plus a widened
  sanitizer allowlist if the result is ever to be an iframe. Two changes, one of
  them security-relevant. **Recommendation: leave it as the card.** For
  curriculum essays citing BIS, IMF and textbook sources, a clean labelled link
  is what a reader wants; an embedded tweet is not. If the owner wants true
  embeds, that is a scoped piece of work to ask for, not to assume.
- **Button — dropped.** In the reference it is a subscribe call-to-action. There
  are no subscriptions, no email list and no paid tier here, so the honest answer
  to "what would it do on this site?" is *link somewhere* — which is what a link
  already does, with less ceremony. Shipping a button that goes nowhere is worse
  than not shipping one.
- **Audio and Video — dropped.** The owner declined audio earlier. Neither is
  trivial: both need an upload path with size limits, a poster frame, a player
  with accessible controls, and `<video>`/`<audio>` added to the sanitizer
  allowlist — that is place four of the contract, where blocks vanish. Neither
  is in the curriculum's way today. Noted here, not built.
- **Poll and Paywall — not built, as instructed.** No polling infrastructure, no
  paid tier. Paywall in particular is the most Substack-specific element in the
  reference and the least relevant here.

## Escape once, at the layer that needs it

`figure` and `linkCard` both stored a JSON blob in a `data-*` attribute, and both
pre-escaped it (`JSON.stringify(attrs).replace(/"/g, '&quot;')`) before handing
it to `renderHTML` — which builds real DOM, which escapes attribute values
itself. Escaped twice on the way out, so `JSON.parse` threw on the way back in,
and every attribute fell back to its default: **a figure reloaded with `src=""`**.
Nothing errored.

The rule is now in one place, `src/lib/tiptap/attrJson.ts`: raw for `renderHTML`
(the DOM escapes it), escaped for the string-building serializer (nothing else
will), and a read that tries the raw form first and falls back to the legacy
doubly-escaped form, so rows already written still open.

## A node whose HTML does not round-trip corrupts the row silently

`EssayEditor` mirrors the document into React state as HTML and pushes external
changes back in with `setContent`. If a node's `renderHTML` output does not
survive being parsed and re-serialised byte-for-byte, that mirror never settles:
the editor re-parses its own output, `content` advances, `content_json` freezes,
and the row ends up holding two documents that disagree. `linkCard` did exactly
this — its `<a>` was claimed by StarterKit's Link mark on re-parse, because
ProseMirror gathers every mark rule before any node rule.

Two fixes and a guard: `priority: 100` on the card's parse rule; the HTML mirror
now ignores its own echo instead of re-parsing it; and
`tests/unit/editorHtmlRoundTrip.test.ts` asserts round-trip stability for every
block the insert menu can produce. Treat round-trip stability as the fifth place
of the content contract.

## Autosave says "Saved" only when it is true

Owner-decided and now implemented: an essay that has never been published
autosaves into the `essays` row itself, so `Draft · Saved` is literally true and
a crashed tab loses nothing — there is no published page to damage. An essay that
is already live writes a revision only, and the chip says **`Published · Backed
up HH:MM`**. It never says "Saved" for content that lives only in
`essay_revisions`. A failed write is loud: `Save failed` / `Backup failed` in
destructive colour with the error as its tooltip.

## The gutter `+` lives in the gutter

It was positioned at `left-0` of the editor container, which is the text's left
edge — so it sat on top of the first ~28px of the current line and swallowed
clicks meant for the text. The canvas now reserves 2.5rem of left padding at
every width (4rem from `sm:`), and the button pulls into it at `-left-8`. An
asymmetric margin on a phone is a smaller cost than a button the writer has to
click around.

## Open question for the owner: the table of contents

The reader specification has no table of contents. A sticky ToC sidebar was built
and gate-verified last session at the owner's request. These are 3,000-word
curriculum pieces rather than newsletter posts, so it probably still earns its
place — **it has been kept, and this is the ask**: keep it, or drop it to match
the specification exactly?

# 2026-08-01 — Fable session: reconcile + titles + defect verdicts

## The orphaned tone-fields trigger is dropped, not repaired
- **What it did today:** both branches of `validate_essay_tone_fields` referenced the four
  dropped `*_fields` columns, so since the column drop every INSERT/UPDATE on `essays`
  failed with `42703` before any row was touched. Before the drop, its draft branch was
  also silently rewriting `status` to `tone_pending` (observed during GATE 5).
- **Why drop rather than repair:** the persona system it validated is deleted; the live
  publish gate is `WriterValidation.canPublish` plus the `presentation` payload. A trigger
  that rewrites publication status is exactly the kind of magic that should not survive
  the system it belonged to. `voice_validated_at` (its only output column) stays, inert,
  for a later staged cleanup.
- **Applied:** migration `drop_orphaned_tone_fields_trigger`; verified by re-running the
  failing statement and by a real in-app Save Draft.

## Mismatched placement URLs redirect to canonical, they do not 404
- `/finance/<wrong-track>/<wrong-module>/<real-slug>` now redirects to the essay's one
  canonical URL (from its joined module), and a fabricated four-segment URL for an
  unplaced essay redirects to `/essays/:slug`.
- **Why redirect:** the slug names a real essay; the reader is at a wrong address, not a
  wrong destination. `/essays/:slug` already heals to canonical the same way, and a 404
  here would punish stale links that used to work. A *wrong slug* still 404s (GATE 1f).

## Draft titles route admins into the editor; published titles route everyone to the page
- On curriculum indexes, an admin clicking a draft stub lands in the editor (the public
  view of an empty essay is not worth landing on); published titles go to the reading
  experience for everyone. A pencil affordance sits beside every row for admins, always a
  sibling of the row's link — nested anchors are invalid HTML.

## `books_uploads` gets its insert path; `finance_models` deliberately does not (yet)
- **Books: built.** `useUploadBook` + an admin-only upload card on `/books/:category`.
  RLS already made storage and table writes admin-only; the UI was the only missing piece.
  Observed end-to-end and cleaned up.
- **Models: written decision.** The 11 institutional models are the owner's framework
  content (curriculum Section 06), and this session's mandate explicitly excludes
  Sections 05/06 data. The surfaces stay: read, render, empty-state and edit paths all
  work, and `ModelAdminPanel` becomes reachable the moment rows exist — via a future
  seed migration from the framework, which is the owner's call. Recorded here precisely
  so no third session rediscovers the gap.

## Site-wide smooth scrolling is gated behind `prefers-reduced-motion: no-preference`
- `index.css` set `scroll-behavior: smooth` on `html` unconditionally. Per spec,
  `scrollIntoView({ behavior: 'auto' })` defers to that CSS property — so every "instant"
  jump in the app was silently re-animated, including the ToC's reduced-motion branch.
  The CSS is now media-gated and the ToC uses `'instant'` explicitly. Observed: a
  10,433px jump completes within 120ms under emulated reduce.

## `/admin/writer/:id` stays as a redirect (ROUTE CHANGES REQUESTED, disposition)
- Deleting it was requested last round when `App.tsx` belonged to another session. Kept
  instead: the `WriterStudio` redirect keeps `/admin/writer/new` (used by AdminDashboard)
  and old bookmarks resolving, costs ~70 lines, and adds no authoring surface. The other
  two requests: no Section 7 route removals (reaffirmed), breadcrumb `flex-wrap` (already
  fixed by the parallel session, verified at 375px).

---

# 2026-08-01 — Section 5: the writing experience (Session B)

## The upload placeholder is a decoration, not a node
- **Decision:** the "Uploading image…" block shown while a pasted image uploads is a
  ProseMirror *widget decoration*, held in plugin state, not a node in the document.
- **Why:** the gate requires that a rejected upload leave no dead placeholder. A
  placeholder node would be part of the document, which means it can be serialized by
  `getHTML()`, stored by autosave into `essay_revisions`, and recovered days later as a
  permanent artefact of an upload that failed. Cleaning it up correctly on every failure
  path — network error, RLS refusal, oversized file, the author deleting the surrounding
  paragraph mid-flight — is a discipline you can forget. A decoration cannot be
  serialized, cannot be saved, and disappears with the plugin state.
- **Rejected:** an atom node with a `pending` attribute, filtered out at save time. That
  puts the correctness burden on every future writer of a save path.
- **Consequence:** if the anchor position is gone when the upload lands (the author
  deleted that part of the text), the image is dropped rather than inserted at a guessed
  position. Losing an upload the author can retry beats silently putting a picture
  somewhere they did not ask for.

## Pasted image files become `figure` nodes, not `image` nodes
- **Decision:** two node types coexist. A pasted or dropped image *file* is uploaded and
  inserted as a `figure`; a bare `<img>` (pasted markup, or legacy HTML in `essays.content`)
  is parsed as an `image`.
- **Why:** `figure` is the editorial primitive that already carries alt text, caption,
  source attribution and width mode, and already round-trips through all four places of
  the content contract. Routing uploads into it reuses a proven path. But `image` still has
  to exist, because without it a bare `<img>` matches no node and ProseMirror discards it —
  which is also why a legacy body containing `<img>` rendered as nothing.
- **Rejected:** one node for both. Collapsing them would either strip captions from
  uploads or fabricate empty figure furniture around every incidental image.

## `Link` is configured inside StarterKit rather than beside it
- **Decision:** `StarterKit.configure({ link: {...} })`, and `@tiptap/extension-link` is
  no longer a direct dependency.
- **Why:** StarterKit v3 bundles it. Registering a standalone copy alongside produced the
  duplicate-extension warning and two competing definitions of the same mark. Verified by
  reading the installed StarterKit's dependency list, not by assuming.
- Five further `@tiptap/extension-*` packages were declared in `package.json` and imported
  nowhere; removed.

## `WriterStudio` becomes a redirect rather than a deletion
- **Decision:** Stack B is retired by replacing `WriterStudio` with a component that
  resolves the old `/admin/writer/:id` URL and forwards to `/admin/writer/:section/:slug`.
- **Why:** the gate requires exactly one route that *authors* essays. Deleting the route
  outright means editing `src/App.tsx`, which Session A owns and whose Gate 4 is not
  terminal. A redirect satisfies the gate inside Session B's own surface, and keeps
  bookmarks and the dashboard's "New Essay" link working. The route can be deleted later
  with no further code change.

## Preview renders through `ArticleBody`
- **Decision:** `WriterPreview` no longer builds its own HTML; it renders the same
  component the published page renders.
- **Why:** two renderers means two lists of understood block types, so a block appearing
  in the preview was never evidence it would appear when published — the same class of
  failure as the homepage card that 404'd. One path, or the preview is decoration.

---

# 2026-08-01 — Section 7: the never-checked groups (Session B)

## `.single()` is the wrong call for a lookup that can legitimately miss
- **Decision:** `useFsliPage`, `useBook` and `useFinanceModelBySlug` use `maybeSingle()`.
- **Why:** PostgREST answers `single()` with HTTP **406** when no row matches. The pages
  swallowed it, so an unknown slug produced a thin shell and a red line in the console
  instead of a "not found" page. `maybeSingle()` makes "no such row" ordinary data.

## A miss renders `NotFound`, it does not redirect
- **Decision:** `FsliDetail` and `FinanceModelDetail` render `<NotFound />` instead of
  `<Navigate to={index} replace />`.
- **Why:** consistency with the correction GATE 1f already made to the four essay pages.
  A slug that matches nothing means the URL is wrong; moving the reader to an index they
  did not ask for hides that and makes a typo indistinguishable from a working link.

## Counts come from the table, or the page says it is empty
- **Decision:** `BooksCategories` counts real `books_uploads` rows; with none, it shows an
  empty state instead of four category cards.
- **Why:** it previously advertised 12, 8, 15 and 10 books against a table with zero rows —
  45 books that do not exist, each card leading to an empty list. Hardcoded counts are a
  claim about data, and this one was false.
- **Kept hardcoded:** the four category *titles*. Those are editorial taxonomy, not
  measurements, and deriving them from an empty table would leave nothing to browse once
  books exist.

---

# 2026-07-31 — Greenfield Supabase rebuild

The old Supabase project (`rhwzvgklasvitocbbhvi`) is gone; the frontend stays; the
database is rebuilt fresh. Decisions below, newest first within this section.

## Old project is deleted, not paused — no legacy dump possible
- **Observation:** The account lists 3 projects: `ascbthsgborseynmmthm` (dikagustiana-prod,
  ACTIVE — a different app, the personal-OS schema, untouched by this rebuild),
  `fqayxopcfxlkuftglqbl` (Sep 2025, paused) and `llqehykfmbgjnbwbijfs` (Nov 2025, paused).
  `rhwzvgklasvitocbbhvi` is absent — deleted, unrecoverable via restore.
- **Evidence the paused projects never hosted the site:** across the entire archived git
  history (Lovable scaffold 2025-12-23 → PR #34 merge 2026-07-26), the only Supabase ref
  ever present in `supabase/config.toml`, `client.ts`, or any file is `rhwzvgklasvitocbbhvi`.
- **Consequence:** `docs/db/legacy-dump.sql` cannot exist. All CMS content authored after
  the last content-bearing migration (2026-07-04) is lost. What survives is what the 43
  migrations seed.
- **Production was already dark:** the deployed JS bundle on www.dikagustiana.com contains
  no Supabase URL at all (env vars were unset at its build time), so the live site has been
  throwing at boot independent of the DB deletion.

## Free-project slot blocker — user authorized deleting the two paused 2025 projects
- Creating (or restoring) any project fails: the account owner is at the free plan's
  2-active-free-project limit. The Supabase MCP has no `delete_project` tool, so the
  deletion the owner approved (both paused 2025 projects) must be done in the dashboard.
  Creation is retried automatically until a slot frees up.

## Reseed strategy: reconstruct, never invent
- **Decision:** Reseed the 8 sections, 24 fsli_pages, 4 finance_sections, 2 finance_settings,
  49 finance_modules and 105 essay draft stubs; resolve every foreign key by subquery rather
  than by literal UUID; leave a column NULL where the archive holds no value.
- **Why the essay stubs are recoverable at all:** the three seed migrations hardcode
  `module_id` UUIDs for modules that no migration ever creates (they existed only in
  production), so a verbatim replay fails the foreign key. But each file groups its essays
  under a `-- Module NN:` comment and the slug prefix encodes the mapping (`sf-07-03` =
  strategic-finance module 07, essay 03), so the 29 missing modules and the whole
  105-essay outline are deterministically reconstructible.
- **Rejected:** replaying the three INSERTs verbatim (FK failure); dropping the stubs
  (throws away the curriculum plan of record); inventing theses for the 11 modules with no
  authored source (would put words in the owner's mouth).

## No `docs/db/legacy-dump.sql`, and `import.sql` is not the baseline
- **Decision:** author the baseline from scratch rather than from `docs/db/import.sql`.
- **Evidence:** `import.sql` concatenates only the first 38 of 43 migrations (last header
  `20260310000954`). It omits the security hardening, `admin_audit_log`, `council_sessions`,
  and **both** P0 auth-gating repairs — so it reproduces the *broken* state of both
  historical failures and ships without two tables the app queries.
  `docs/DB_READINESS.md` still says "38 migrations", confirming both docs predate the last
  five migrations. Its own header also recommends `supabase db push`, which is prohibited here.

## RLS: inline the role check instead of calling `has_role()`
- **Decision:** every policy uses `EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id =
  (SELECT auth.uid()) AND ur.role = 'admin')`. `has_role()` is still created (types.ts
  declares it) but no policy depends on it.
- **Rationale:** the P0 outage happened because `EXECUTE` on `has_role()` was revoked from
  `anon`/`authenticated` while dozens of policies called it — Postgres requires the *calling*
  role to hold EXECUTE on a function used in a policy expression. A policy that reads
  `user_roles` directly cannot be broken by a future grant change. The `essays` anon SELECT
  policy is `published = true` and references no function at all.

## Restore `src/` from the tracked zip — nothing to arbitrate on configs
- `src/` (284 files), `tests/` (30), and `public/_redirects`, `placeholder.svg`,
  `robots.txt` existed only inside `dika-s-digital-studio.zip`. Every root config file in
  the zip is byte-identical to the tracked copy, so the upload at `e9bf047` was simply
  incomplete — no conflicting versions existed to choose between.
- Verified after restore: `tsc --noEmit` passes; `vite build` succeeds.

## Package manager: npm, single lockfile
- The production bundle (`/assets/index-tLuHZmHp.js`) is byte-identical to a local
  `npm ci` + `vite build` from `package-lock.json` — production was provably built with
  the npm dependency tree. `bun.lock`/`bun.lockb` removed; `typecheck` script added.

## Zips untracked after extraction; history preserved as a branch
- `dika-s-digital-studio.zip` untracked (recoverable at `02c4c36`). Its embedded git
  history (template → PR #34, ~40 working branches) pushed to
  `archive/pre-rebuild-history` so 7 months of provenance survives outside a binary blob.
  Only the main line was pushed; the 39 stale work branches add noise, not information.
- `tmp/Attach_feature.zip` untracked: it is a Figma Make export of an "Attach feature"
  design prototype (MUI scaffold, 66 files) — a design artifact, not site code.
- `*.zip` is now gitignored.

## Branch & coordination
- **Work on `claude/keen-galileo-occyc8`, based on the merged PR #30** (which already inherited the
  editor/test work from `claude/quirky-albattani-wlphbf`). We do **not** push to or edit
  `claude/quirky-albattani-wlphbf` / PR #30 — a concurrent session owns those and the live DB
  migration. Two PRs must be merged **in order: migration first, then this upgrade.**
- **Never touch the live database.** No `db push`, `functions deploy`, `seed`, or destructive CRUD.
  All verification is at the mock/static level (Vitest + mocked Playwright). Live verification is
  queued in UPGRADE_REPORT.
- **Schema changes go into NEW migrations** with a later timestamp, are **not applied**, and are
  flagged for manual reconciliation. We do **not** edit existing migration files.

## Writer Studio: dead `tags` / `meta_description` fields
- **Decision:** Remove the non-functional `tags` and `meta_description` inputs from the editor.
- **Rationale:** Neither column exists on `essays`; the fields silently discarded input — a
  data-integrity/UX defect. Removing them makes the surface honest.
- **Rejected:** (a) Wiring them to the save payload — would make `insert/update` fail at the DB
  (unknown column). (b) Adding a new migration + UI wiring tonight — the live DB is mid-migration and
  the essay `snippet`/deck already supplies the SEO description on public essay pages, so a dedicated
  `meta_description` column is low value. The ready-to-apply SQL is documented in
  `UPGRADE_REPORT.md` if it is ever wanted, rather than shipped as an unapplied migration file that
  could collide with the concurrent migration session.

## Writer Studio: category required on every save
- **Decision:** Validate `category_id` (and section) on **draft saves too**, not only on publish.
- **Rationale:** `essays.category_id` is `NOT NULL` with FK `RESTRICT`. Saving a draft without a
  category produced an opaque DB error. Validating early gives a clear message and prevents the
  failed round-trip. This enforces the "no orphan essays" guarantee at the UI layer.

## Performance: route-level code splitting
- **Decision:** Lazy-load page routes with `React.lazy` + a `Suspense` fallback, and define
  `manualChunks` for heavy vendors (React, Supabase, TanStack Query, TipTap, Recharts, KaTeX).
- **Rationale:** The single JS bundle was ~1.53 MB (436 kB gzip) with a chunk-size warning. Splitting
  keeps initial load small and isolates rarely-used admin/editor code.
- **Rejected:** Manually re-architecting imports per page — higher risk; `manualChunks` + `lazy`
  achieves most of the win with minimal churn.

## SEO: canonical + sweep
- **Decision:** Add a `<link rel="canonical">` to the shared `SEO` component and add `<SEO>` to the
  public pages that lacked it. Admin/utility pages get `noindex` rather than rich tags.
- **Rationale:** Canonicalization benefits every page from one change; indexing admin tools is
  undesirable.

## Resilience: global error boundary + console hygiene
- **Decision:** Wrap the router in a global `ErrorBoundary`; gate `NotFound`'s `console.error`
  to dev only; remove `console.log` noise from `PersonalFinance`.
- **Rationale:** "Zero uncaught errors/warnings in console on normal flows"; a render error in one
  route should not white-screen the whole app.

## Testing strategy
- New behavior is guarded by **Vitest unit/component tests with a mocked Supabase client** (the repo
  already mocks Supabase in `src/test/`), keeping the suite green without touching any backend. Live
  e2e (`tests/live`) stays queued for after the migration session completes.

---

# 2026-07-31 (session 2) — verifying the baseline before applying it

## Dry-run the baseline against a local Postgres before it ever meets Supabase
- **Decision:** stand up a throwaway Postgres 16 with the Supabase role, schema and
  default-privilege shape replayed (`docs/db/verify/`), apply the real migration files to
  it, and run the whole acceptance bar against real RLS — before creating the project.
- **Rationale:** the SQL had never been executed. Four adversarial review lenses had read
  it and found seven defects; running it found an eighth they structurally could not see
  (see below). A 2,400-line schema should not meet a real database for the first time in
  production, and the project-creation blocker made the wait free.
- **Not a rule violation:** the prohibition is on `supabase db push` / `db reset` / any
  CLI migration command against the project. This is plain `psql` against a scratch
  cluster and touches no Supabase project.
- **Rejected:** applying straight to the new project and fixing forward — every fix would
  then be a migration on top of a wrong baseline, which is exactly the history the rebuild
  exists to escape.

## On managed Supabase, a privilege is never absent by default
- **Observation:** the platform ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL
  ON TABLES/FUNCTIONS TO postgres, anon, authenticated, service_role`. Every new table and
  function is therefore *born* with ALL granted to `anon` and `authenticated`, and `GRANT`
  is additive — it cannot subtract.
- **Consequence 1 (defect 7):** `admin_audit_log`'s "second, independent barrier behind
  RLS" did not exist. The table was UPDATE-able and DELETE-able at the privilege layer
  despite the deliberately absent policies.
- **Consequence 2 (the 8th defect):** `REVOKE EXECUTE ON FUNCTION has_role FROM PUBLIC` —
  the natural fix for "has_role is a public admin oracle" — leaves `anon`'s *named* grant
  intact. Verified: `SET ROLE anon; SELECT public.has_role(<uuid>,'admin')` still returned
  true. The revoke must name `anon`.
- **Decision:** every table and the one policy-callable function REVOKEs before granting.
  Stated as a rule in `docs/SCHEMA_PLAN.md` §1 so it is not undone by someone adding a
  table later and copying the grant block without the revoke.

## `user_roles` writes: delete what does not work rather than ship a silent no-op
- **Decision:** removed the admin UPDATE and DELETE policies on `user_roles`; kept INSERT.
- **Rationale:** Postgres applies a table's SELECT policies to the rows an UPDATE/DELETE
  *reads*. With only the own-row SELECT policy, a targeted admin UPDATE matched zero rows
  and **returned success**, and the only working DELETE was the unqualified one — which
  deleted the admin's own role and would lock the owner out of their own site. A policy
  that reports success while doing nothing is worse than no policy.
- **Rejected:** adding an admin SELECT policy to make them work. Permissive SELECT policies
  are ORed, so sign-in's admin probe would become `user_id = auth.uid() OR has_role(...)`
  and a future EXECUTE revoke would take the public site down — that is historical failure
  (a) exactly. Role administration stays a service_role/SQL operation, which is what it
  already was: nothing in `src/` administers roles.

## Filenames must encode dependency order
- **Decision:** `01/03/02/04` became `20260731010000/020000/030000/040000`.
- **Rationale:** the numbering was authoring order, but `essays.module_id` has an FK to
  `finance_modules`, so the real apply order was `01 → 03 → 02 → 04`. Nothing infers that,
  and `supabase db reset` — which the live e2e suite depends on — applies files in sorted
  order and would have failed. Correctness that lives only in a README is not correctness.

## The placeholder essay states losses, not reassurance
- **Decision:** rewrote the one published essay to remove four claims that were false —
  that the curriculum outline is "intact", that 49 modules belong to the three tracks that
  hold 29, that the outline "is what you see below", and a data-loss date the rebuild does
  not establish.
- **Rationale:** it is the only thing an anonymous visitor can read. A note explaining a
  data loss that overstates what survived is the worst possible first impression, and the
  same migration's own loss list contradicted it three paragraphs earlier. Every number in
  the replacement was re-counted against the seed data.

---

# 2026-07-31 (session 3) — live project, framework-v2 taxonomy, import test

## Slug scheme: the framework's own cross-reference convention (t4-m07)
- **Decision:** `finance_modules.slug` = lowercase of the framework's cross-ref tokens:
  `t1-m07`, `t4-m07`, `t1-m08a`, `t4-qm3`.
- **Rationale:** `slug` is globally UNIQUE and "Module 07" exists in four sections, so
  `module-07` inserts once then fails. The framework document already writes its own
  cross-references as `T1-M09 / T3-M01 / T4-M07`, treating that as the canonical id. Any
  other scheme disagrees with the source of record across 160 rows.
- **Rejected:** `section-module-07` style (verbose, and still not what the document uses);
  a synthetic integer id (loses the human-meaningful track/module encoding the slug URLs
  expose).

## sort_order stays integer; the display label moves to module_meta
- **Decision:** `sort_order` is the integer ordinal position within the track; the label a
  reader sees (`07`, `08A`, `QM1`) lives in `module_meta.display_label`.
- **Rationale:** three consumers already depend on `sort_order` being a clean integer — the
  `UNIQUE (track_slug, sort_order)`, the essay-stub `module_id` subqueries, and track
  ordering. `08A`/`08B` occupy ordinals 8/9 uncoerced. Coercing `08A`→8 and `08B`→8 would
  collide on the UNIQUE and silently merge two modules.

## Heading levels: title is H1, body demotes by one
- **Decision:** on import, H1→H2 and H2→H3; the essay title is the page's only H1.
- **Rationale:** the editor's StarterKit allows only `heading: [2,3]`, and an
  unrepresentable node is dropped silently — the highest-risk content-loss path. Demotion
  keeps the full hierarchy inside the allowed range without touching the editor schema, and
  one-H1-per-document is correct anyway. Verified: zero headings dropped end to end.

## ANCHORS → References; Post-Flight → body; equations stay bold text
- **ANCHORS USED** is bibliographic metadata → the `References` component
  (`economist_fields.references`), which the app already renders.
- **Post-Flight** is authored prose with no metadata home → body content (demoted headings).
- **Display equations** are plain-text arithmetic (`x` as multiplier), not LaTeX → kept as
  bold paragraphs. A KaTeX math block would be a new node type needing the full four-place
  contract for no rendering gain on this content. Revisit if real LaTeX appears later.

## Cross-tree placement coherence via trigger, not CHECK
- **Decision:** a BEFORE INSERT/UPDATE trigger refuses an essay that carries a curriculum
  `module_id` but an editorial (non-finance) `category_id` or section cache.
- **Rationale:** the two taxonomy trees share one `essays` table with nothing keeping them
  coherent. A CHECK constraint cannot reference another table (the category's section is two
  joins away); a trigger can. The route `/admin/writer/:section/:slug` already asserts which
  tree an essay lives in, so the constraint just makes the DB agree with the URL. Verified
  live: an incoherent UPDATE was refused with ERRCODE 23514, fail-closed even when the
  category doesn't resolve.
- **Deliberately NOT enforced:** the denormalised `essays.section` cache going stale when a
  category changes — owned by the writing-experience workstream, not this trigger.

## Count reconciliation: seed to the module detail, not the overview
- **Decision:** seed 161 essay stubs (56 Fundamentals), not the overview table's 160.
- **Rationale:** the framework is internally inconsistent — its overview claims 55
  Fundamentals essays, its module-by-module lists sum to 56. The enumerated module lists are
  the authoritative side; the overview is a roll-up that undercounts by one. Reported as a
  finding rather than quietly matching either number.

## Local CORS relay for the browser import test (dev-only)
- **Decision:** run the editor import test through a local relay
  (`127.0.0.1:8787` → the real project via Node fetch) rather than mocking Supabase.
- **Rationale:** the in-container Chromium cannot complete TLS to `*.supabase.co` through
  the egress gateway (connection reset at the fingerprint layer), but Node fetch through
  `HTTPS_PROXY` can. The relay keeps the test hitting the REAL project — real RLS, triggers,
  storage, edge function — which a mock would not. The relay is dev-only and never part of
  the app or deployment; `.env` is restored to production values.

---

## 2026-08-01 — The key-takeaways publish gate

**Where it actually is:** `src/components/writer/WriterValidation.tsx:54-60`.

```ts
const filledTakeaways = keyTakeaways.filter(k => k.trim()).length;
if (filledTakeaways < 3) {
  errors.push({ field: 'keyTakeaways',
    message: `At least 3 key takeaways required (${filledTakeaways}/3)` });
}
```

Not in the deleted `src/lib/admin/publishValidation.ts` — that module was dead code imported
only by its own test and was removed with the persona system. `WriterValidation.validateEssay`
is the live gate: `WriterEditor` computes it into `validation.canPublish`, which disables the
Publish button.

### What it protects

Something real. `KeyTakeaways` renders as a standing block in the article shell, and the
Economist-style layout the site borrows treats it as part of the furniture rather than an
optional extra. Three is the point below which the block stops reading as a summary and starts
reading as a stray bullet — one takeaway is a sentence that belonged in the deck, two look like
an unfinished list. The rule is really "if you are going to show this block, fill it", and it
also functions as a forcing device: being made to state three claims before publishing is a
cheap editorial check on whether the piece has a thesis.

### What it costs

It blocked a finished 3,246-word essay in a previous session. `fa-07-01` only satisfies it
because three takeaways were authored into `economist_fields` by hand to get past the gate.
That is the tell: a rule that gets satisfied by hand-editing the database is not shaping the
writing, it is being routed around.

The deeper mismatch is that it is a **uniform** rule over a **non-uniform** corpus. The
curriculum is 161 lesson stubs. `lesson_type` currently reads `concept` on all 162 rows, but
the enum already anticipates `framework`, `case-study`, `exercise`, `model-walkthrough`. An
exercise or a model walkthrough has no natural "three key takeaways" — its takeaway is the
worked artefact. Forcing three onto it produces filler, and filler in a standing block is worse
than no block, because the reader learns to skip it.

### Recommendation — scope per `lesson_type`, do not relax globally

1. **Require 3 for the essay-shaped types** (`concept`, `framework`) — the pieces where the
   block earns its place and the forcing function is worth having.
2. **Advisory for the rest** (`case-study`, `exercise`, `model-walkthrough`) — surface it as a
   warning in `WriterValidation`, not an error, so it never blocks Publish.
3. **All-or-nothing within a type:** if takeaways are supplied at all, require the full three.
   One or two should stay an error under every `lesson_type`, because a half-filled standing
   block is the actual failure mode.

Relaxing globally throws away a rule that is doing real work on the essays. Making it purely
advisory has the same effect more slowly. Scoping keeps the pressure where it helps and lifts
it where it manufactures filler.

**Not implemented in this session** — recorded as a recommendation, per the mandate's
instruction not to silently delete it.

---

## 2026-08-01 — Topic and Phase are required but redundant for curriculum essays

### The finding, with counts from the live database

| column | populated | of 162 |
|---|---|---|
| `topic` | **0** | 162 |
| `phase` | 1 | 162 |
| `module_id` | 161 | 162 |
| `finance_order` | 161 | 162 |

`topic` is NULL on **every single essay**. `phase` is set on exactly one. Meanwhile
`module_id` is set on 161. The fields the author is asked to fill are empty; the field that
actually locates the essay is populated.

**The asterisk is already decorative.** `WriterMetadata.tsx:162` labels the control
`Topic/Phase *`, but `WriterValidation.validateEssay` never checks either field — it validates
title, category, deck, key takeaways, word count and figures. So the UI signals "required"
while nothing enforces it. That is worse than either honest option: it trains the author to
fill a field that does not matter and would not have been checked anyway.

### Why they are redundant

For a curriculum essay, placement already determines both. `module_id` → `finance_modules`
gives `track_slug` and the module, and the essay's position is `finance_order`. The editorial
`phase` is a parallel, weaker encoding of the same fact — which is exactly why the placement
coherence trigger exists to stop the two trees disagreeing. Asking for three fields where one
determines the others is an invitation for them to drift apart.

### Recommendation — derive, do not ask

1. **Make module the single placement input** for `section = 'finance'`. Choosing the module
   sets `finance_section` (from `finance_modules.track_slug`) and `phase` (from the track), the
   way `resolvePlacementFields` already does in the WriterStudio stack.
2. **Hide Topic/Phase for curriculum essays.** Show it read-only as *"Derived from module:
   Analytics · T4-M07"* so the author can see the consequence of their one choice without being
   able to contradict it.
3. **Keep it editable only where nothing derives it** — the editorial sections
   (`green-transition`, `development-finance`, `critical-thinking`) where `phase` is the real
   placement and there is no module.
4. **Drop the asterisk** wherever the field is not actually validated. Either enforce it or do
   not mark it required.

`topic` is a separate concern: it is used by the accounting consolidation route
(`/accounting/consolidation/:topic`) and by `useEssaysByTopic`, so it should stay in the schema
— but it has no business being a required field on a finance curriculum essay, where zero rows
use it.

**Not implemented in this session** — recorded as a proposal.

---

## 2026-08-01 (session 7) — Both Section-2 recommendations applied

**Key-takeaways gate, scoped per `lesson_type`** (was: recommendation of 2026-08-01, now
implemented in `WriterValidation.tsx`):
- `concept` / `framework` — and every editorial essay — still require three (error).
- `case-study` / `exercise` / `model-walkthrough` — zero takeaways is an advisory warning.
- One or two takeaways is an error under **every** type: a half-filled standing block is the
  real failure mode.
Observed live on real stubs: an `exercise` with 0 takeaways published; a `concept` with 0
takeaways had Publish disabled.

**Topic and Phase derived from placement** (was: proposal, now implemented in
`WriterEditor.tsx` + `WriterMetadata.tsx`):
- Choosing the module sets `finance_section` (= track), `phase` (track mapped to the finance
  phase vocabulary via `TRACK_TO_PHASE`) and `topic` (= module slug — the module *is* the
  topic).
- The Topic/Phase control is read-only for curriculum essays — *"Derived from module:
  Strategic Finance · T2-M01"* — and editable only where nothing derives it. The decorative
  asterisk is gone: the field was labelled required while `validateEssay` never checked it.
- `topic` is only ever written for module-placed finance essays, so accounting's use of the
  column (its consolidation pages key on it) cannot be clobbered from this editor.

## 2026-08-01 (session 7) — FSLI empty state over seeded prose

Mandate 5.2 offered two ways out of the 24-identical-placeholder defect: seed
real sections or make the empty state honest. **Chosen: the honest empty
state.** Seeding "real" prose would have meant this session inventing
accounting doctrine for 24 line items and publishing it under the site's
name — the same fabrication class the section exists to remove, at larger
scale. Instead: unwritten sections say "Not written yet." in one quiet line,
admins click straight into the existing inline editor to write them, and each
page's header now carries the genuinely real per-item data it always had
(reported figures for both years and the notes reference from `fsli_pages`).
No schema change; `fsli_sections` remains the single source of section prose.

Also decided: the shared section outline may not carry line-item-specific
headings — "Bank Overdrafts Treatment" (true only for cash) became
"Classification Boundary Cases"; the `section_key` stays `issues-overdrafts`
so any rows written later still bind.

## 2026-08-02 (Substack replication) — The toolbar reversal

The owner reversed a verified decision, and this entry is the record the
mandate requires. The previous session removed the persistent formatting
toolbar and moved formatting into a selection-only bubble menu with eight
actions; that work passed its gate and is PASSED in `docs/GATE_LEDGER.md`
(S2). The owner has since directed a Substack replication, and Substack
formats from a persistent toolbar — roughly twenty items in seven separator
groups, horizontally scrollable, with a More menu as semantic overflow.

**The bubble menu is deleted; the persistent toolbar
(`src/components/editorial/toolbar/EditorToolbar.tsx`) replaces it.** The
earlier gate is *superseded, not broken*: the behaviour it verified was real
and correct against its specification, and the specification changed. The
affected ledger rows now point here. What survives from the old design:
insertion and formatting stay distinguishable (the toolbar formats and
inserts; `/` and the gutter `+` handle block insertion from ONE list that the
toolbar's More ▾ also reads), and zero validation while drafting.

## 2026-08-02 — Heading levels: widened to H1–H6

The schema allowed only h2/h3; the Style ▾ menu offers Normal + Heading 1–6,
and a menu item that silently does nothing was forbidden. Chosen: **widen the
schema to the full six levels** rather than trim the menu. The measured
tables include in-body H1 (38px) and H2 (30.875px), so at minimum H1 had to
become real; H3–H6 follow the same em-based ratio downward (1.3 / 1.125 / 1 /
0.875 — chosen, not measured; the source table stops at H2). All six pass the
five-place contract and the round-trip test covers all six. The essay title
remains a database field, not a body block; an in-body H1 (38px) rendering
larger than the page title (32px) is faithful to the original, not a bug.

## 2026-08-02 — SF Pro Display substitute: Plus Jakarta Sans

SF Pro Display cannot be licensed for general web use. The substitute for
in-body headings at 700 is **Plus Jakarta Sans** — already self-hosted,
already gate-verified as loading, and already the UI face of every control on
the page. The honest trade-off: PJS at 700 is rounder than SF Pro's
neo-grotesque; Inter or Archivo would be metrically closer. But shipping a
third family for headings alone means two sans faces in one product — a
cohesion failure worse than the metric gap — and no stack that silently
resolves to a system fallback was acceptable. `document.fonts.check` proves
PJS 700 loads at 38px on both surfaces.

## 2026-08-02 — Spectral in, Playfair Display out; where Plus Jakarta Sans remains

Spectral (Google Font, OFL) is self-hosted — eight static woff2 files, 400/700
upright+italic, latin + latin-ext — for the same reason PJS is: a webfont that
fails to load falls back silently. It takes three roles: editorial prose
(19px/1.6 body), title/subtitle (32/36, 18/24), and `--font-display`
sitewide, which **removes the Google-hosted Playfair Display @import** — the
last third-party font request. Plus Jakarta Sans remains the sans: UI chrome,
navigation, and in-body headings. Two families total. Spectral does NOT
replace PJS wholesale: the owner's instruction was the Substack pattern
(serif prose under sans headings), and re-skinning every UI surface to a
serif was neither asked for nor sensible.

## 2026-08-02 — The editorial accent is Substack's #ff6719, in one token

`--accent-editorial: 20.4 100% 54.9%` (exactly #ff6719) carries all five
measured roles: the blockquote rail, the link-popover focus ring, primary
buttons in popovers/dialogs, the "New" badge and dot, and the THEME swatches
in the colour palette. The mandate left the value to the owner and required
the pattern; matching the measured value was the default consistent with
"match it, do not reinterpret". Swapping to a house accent is a one-line
change in `src/index.css` — that is the point of the token. The site-wide
`--accent` (green) is untouched.

## 2026-08-02 — Button ▾ dropped; Template ▾ scoped, not built

**Button ▾** (Subscribe / Share / Comment / Send in the original) is dropped
entirely. There are no subscriptions, no comments table, no email
infrastructure — all four buttons would go nowhere, and the mandate's own
rule applied: do not ship buttons that go nowhere. Nothing was repurposed.

**Template ▾** is genuinely worth building — 161 essays across five lesson
types is exactly the case templates exist for — but it is real scope: a
`templates` table (schema change, forbidden this session), an editor flow to
save a document as a template and instantiate one, and list/rename/delete
management. Recommendation: build it as its own piece of work when the
schema freeze lifts; a lesson-type-shaped starting document would save the
owner real time 160 times. Not built silently.

## 2026-08-02 — More ▾ contents; Financial chart and Poetry recommendations

Kept in More ▾ (which reads the same list as the slash command): Link
preview, Table, Code block, Divider, LaTeX (new), Footnote (new). Dropped
entirely — absent from the UI, not present-and-broken: Poll, Prediction
market, Recipe, Audience-specific content, Paywall, Stock photos, Generate
image, Audio, Video.

**Financial chart — recommend deferring, second in queue after Template.**
The curriculum will eventually want real charts (Recharts is already a
dependency), but a chart node needs a data model inside the document, a
chart-type picker, and an editing surface — plus all five places of the
content contract. An interim path already exists: charts as figures.
**Poetry — recommend dropping permanently.** A finance curriculum for senior
professionals has no use for a poetry block; carrying it would be replication
for its own sake.

## 2026-08-02 — Footnotes are point citations; the references list stays

Footnotes and `presentation.references` coexist because they do different
jobs: a footnote is a point citation inside the argument (the sentence that
needs the page number), the references list is the end-of-essay reading list
("ANCHORS USED" in fa-07-01). Nothing is migrated. Mechanics: the note text
lives in a `data-footnote` attribute (no nested rich content — a second
document inside the document is round-trip surface for nothing the
curriculum needs), numbering is positional and never stored (a CSS counter in
the editor, render-time indices plus a numbered end-of-essay section with
backlinks on the published page).

## 2026-08-02 — KaTeX renders after sanitization, never through it

Math nodes store only their LaTeX source (`data-latex`); KaTeX renders
client-side on both surfaces from that attribute. KaTeX's output markup
never enters the database or passes through `sanitizeHtml` — so the
sanitizer's allowlist gains two data attributes, not KaTeX's element zoo.
The `style` attribute is now allowed but filtered by a DOMPurify hook to
exactly three properties with tight value patterns (`color`,
`background-color`, `text-align`); position/z-index/url() and friends are
stripped, unit-tested.

## 2026-08-02 — Motion: the boundary beat the skill, and the spinner died

Two recorded conflicts. (1) motion-craft's reduced-motion guidance is
"gentler, not zero — keep colour/opacity transitions"; the mandate's boundary
is "everything degrades to nothing, including CSS transitions". The boundary
won: a global `@media (prefers-reduced-motion: reduce)` block zeroes every
animation and transition, including Radix/tailwindcss-animate data-state
animations that no JS gate could reach. (2) The upload placeholder's 0.7s
looping spinner sat on the writing canvas; the gate caps canvas animation at
200ms and a 200ms/rev spinner is frantic, so the placeholder is now static —
dashed box plus "Uploading…", with the completion toast as the feedback.
Deliberately NOT animated anywhere: the save-state chip (a chip that animates
300 times a day is an interruption), and the toolbar chevrons' appearance
(they appear during a scroll; animation would lag the hand).

---

## 2026-08-02 — Six-areas session

### The footer name scope (owner decision, applied)
The name appears only where LinkedIn or email is attached. Applied: the
standalone name heading (`Footer.tsx` brand block) is gone, and the © line now
reads "dikagustiana.com" — a bare name with neither link attached would have
violated the same rule the heading did. The contact line "Dika Gustiana
Irawan · LinkedIn" stays. **Reversal is one line:** restore a name `<span>`
beside the footer logo link. The hero byline ("By Dika Gustiana.") is the
owner's copy, verbatim, and stays. Author-attribution values and SEO strings
elsewhere are essay metadata, not chrome — itemised in the ledger's GATE 1 row.

### Human slugs derive from the pre-colon head of the title
Titles follow a "Head: long subtitle" convention and run to ~180 characters;
slugifying the whole title would mint URLs nobody can read aloud. The slug is
the pre-colon head, slugified, capped at 60 characters, deduped by numeric
suffix — `fa-07-01` became `driver-tree-construction`. Pre-checked on all 161
rows before applying: 0 empty, 0 collisions, 0 clashes with existing slugs.
The curriculum code moved to `essays.code` (partial unique index) and remains
the internal identifier — rendered and searchable in the writer list.

### The featuring model kept: `essays.is_selected`
Three mechanisms existed; `is_selected` won because it already existed, already
had a query, and is a per-essay fact rather than a settings row pointing at an
id. Deleted: `useFeaturedEssays` (created_at recency — recency is what promoted
the database-rebuild notice) and `finance_settings.featured_finance_essay_id`
(a third path for one page, whose card also linked to `/essay/:slug`, a route
that does not exist). The homepage, About and the Finance landing all read the
one flag; the admin UI is a star per essay in Admin → Content, audit-logged.

### Zero selected → hide the section (owner decision, applied)
No recency fallback: a fallback is exactly what surfaced the rebuild note. With
nothing selected the homepage and Finance landing sections are absent, not
empty-looking — observed both ways. To keep day one from being blank,
`is_selected = true` was seeded on fa-07-01 in the migration. **Reversal is one
UPDATE** (or one star click in Admin → Content).

### FSLI prose is authored as essays, not in a second editor
The inline `fsli_sections` textarea wrote straight into rows anonymous readers
see — no draft, no publish boundary, no history, no autosave (the audit's
editing-public-data finding). Deleted, not hidden. FSLI prose is now accounting
essays linked by `fsli_slug` (picker in Post settings, prefilled by the FSLI
page's "Write in Studio" link), which inherits the entire finance flow for
free — the alternative was building draft/revision machinery a second time,
the duplication this project has paid for repeatedly. Legacy `fsli_sections`
content still renders read-only, so nothing written disappears.

### Font subsets dropped, and the one kept
Removed all FIVE latin-ext files (the brief counted four: 4 Spectral +
1 Plus Jakarta Sans) with their `@font-face` blocks: the content is English
and Indonesian, neither uses those glyph ranges, and `unicode-range` meant the
files were never fetched — repo weight, not wire weight (240 KB → 128 KB).
KEPT `spectral-italic-700-latin` (24 KB): the toolbar produces real
bold-italic, and browsers synthesize a fake one when the face is missing —
a smeared faux-bold inside a typography system that was measured to the pixel.

### All @tiptap packages pin ONE exact version
The lockfile carried react/starter-kit at 3.19.0 with core hoisted to 3.29.2 —
two ProseMirror graphs, and a clean install crashed the entire writer studio
while every check stayed green (details in the ledger). All twelve packages now
pin `3.29.2` exactly, no caret, and a unit test fails if any @tiptap version
ever differs from the others. Caret ranges on a lockstep-released family are
how this happened.

### The editor is not exported from the editorial barrel
`components/editorial/index.ts` re-exported `EssayEditor`, which pulled
TipTap, ProseMirror and KaTeX into the static bundle of every PUBLIC essay
page — readers downloaded the writing surface to read. The barrel now carries
reading components only; the studio imports the editor by direct path. Pinned
by test. KaTeX itself loads through one lazy `katexLoader` module (JS + CSS
together — a CSS-only dynamic import gets hoisted by Vite and defeats the
split).

### Dependency vulnerabilities: 8 remain, deliberately
`npm audit fix` (semver-safe) patched dompurify — the sanitizer, the one that
matters — and brace-expansion: 11 → 8. The remaining 8 sit behind breaking
upgrades (`--force`), which this session did not churn mid-refactor; same
posture as the audit-triage session, now with the count lower and the
security-critical package current.

---

## 2026-08-02 — Corrections + additions session

### The hero artwork is a deliberate KEEP — the deletion was a misread instruction
The six-areas mandate said "delete all three hero images"; the owner's actual
instruction kept the manga texture. Restored from git history. The performance
goal survives with the method corrected: the weight was the FORMAT (1.1 MB
lossless PNG for a colour illustration) and two zero-importer files (2.2 MB),
not the artwork. The texture now ships as a 156 KB WebP at the same 1536×1024
— transferred bytes measured 1,141,612 → 160,412. `min-h` 520px and
`max-w-[55%]` stay; they exist to accommodate the artwork. Fallback: WebP is
the one asset (src/assets holds exactly one file); if it ever fails to load,
the paper background keeps the hero readable — every browser that runs this
ES2020 app decodes WebP, so a second full-size fallback file would be pure
repo weight of exactly the kind this correction removes.

### Sign In on logo-hover is presentation, not security
Sign In left the top-level nav (an item only the owner uses) and sits beside
the logo, revealed on hover AND keyboard focus. Hiding the link does not make
/auth harder to find and is not meant to: RLS and the admin role are the
boundary. The value is a header that does not advertise internal tooling to
readers. Two guardrails written into the component: the logo stays a Link
(the original defect was a button-that-opened-a-dropdown), and the reveal has
`focus-visible` + `group-focus-within` — a hover-only control is invisible to
keyboard users, defect 6.6's exact class. Touch has no hover; the mobile
drawer carries its own Sign In.

### The barrel lesson (written down because it will recur)
The mandate asked to "lazy-load KaTeX"; the real cause was upstream:
`components/editorial/index.ts` re-exported `EssayEditor`, so EVERY public
reading page importing `ArticleShell` from the barrel dragged the entire
editing graph — TipTap, ProseMirror, KaTeX — into its static bundle. The
pattern to watch for: **a barrel file that mixes reading components with
editing components couples every reader to the editor.** Rule adopted: the
editorial barrel exports reading components only; editing surfaces are
imported by direct path; `tests/unit/readingPathWeight.test.ts` pins it.
Related trap, same family: a CSS-only dynamic import gets hoisted by Vite
into the importing chunk — lazy CSS must ride inside a lazy JS module.

### The test-count guard, and why "vitest failed" was not enough
Chosen mechanism: CI runs vitest with a JSON report and
`scripts/assert-test-count.mjs` fails the build when the total drops below a
floor (245) or any suite fails. The floor is raised when tests are added and
lowered only in the commit that deliberately deletes tests, naming them.
Two lessons from proving it: (1) vitest does exit non-zero on an
import-crashed suite, but a piped `tail` swallowed that exit — the guard is
belt-and-braces against every way the signal can be lost, including future
reporter/config changes; (2) an unused NAMED import of a nonexistent module
is silently type-elided by esbuild and never resolves — the intentional break
in a guard proof must be a bare side-effect import.

### Session practice: never hang on a non-terminating command
Recorded for every future session: `vitest run`, never watch mode; dev and
preview servers always backgrounded with their PID recorded for cleanup,
never run in the foreground. This session's container restart killed exactly
such background servers — the work survived because nothing interactive was
holding the terminal.

### Pre-rendered cards go stale until a redeploy — a real limitation, named
Found by review, and true: publishing or editing an essay in the writer
studio changes Supabase only. Nothing rebuilds the site, so the pre-rendered
`dist/<path>/index.html` for a NEW essay does not exist (it shares the
generic card) and for an EDITED essay keeps the old title/description/dates
until the next deploy. JavaScript-capable visitors always see the current
page — this affects crawlers only, which is exactly the audience the feature
was built for, so it is not cosmetic.

Deliberately NOT fixed in the client: the obvious shortcut is to POST a
Vercel deploy hook from the publish flow, but that URL would ship inside the
public admin bundle, and anyone who loaded it could trigger unlimited
rebuilds. The correct remedies, both owner-side and server-side:
1. A Supabase Database Webhook on `essays` (UPDATE where `published`) →
   the Vercel deploy hook URL. The secret stays in Supabase, never the
   browser. One-time setup; publishing then refreshes cards on its own.
2. Or simply hit "Redeploy" in Vercel after a publishing session.
Recorded rather than half-built, because option 1 needs a hook URL that only
the owner can mint.

### Accounting essays are skipped by the prerender, and say so
Accounting rows canonicalise to PAGE-level URLs — `/accounting/fsli/:slug`,
`/accounting/consolidation/:topic`, `/accounting/statutory-reporting` — that
inline several essays. Writing one essay's `og:title` there would let an
arbitrary essay speak for the whole page (last writer wins); writing it at
`/essays/:slug` instead would advertise a doorway that redirects. Both are
wrong, so those rows are skipped and NAMED in the build log, along with any
two essays that collide on one path (which fails the build). Page-level
cards for the FSLI surfaces are separate work on a separate object.
