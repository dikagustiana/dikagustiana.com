# Response to audit — findings 1–21 and additions A01–A10

Version 1 · 14 September 2026
Against: `Dikagustiana-Intellectual-Audit-2026-09-13-v1.md` and
`Dikagustiana-Deep-Audit-Addendum-2026-09-14-v1.md`. Neither audit is edited.

## Baseline

`origin/main` was `8898393680742477a208aea84e0f3d61d16f0ed8` when this work began on
14 September 2026 — **identical to the audit baseline**, so no finding was pre-empted by
intervening work and nothing here reinstates an older implementation. Work is on
`claude/kind-hopper-3nhkce`, branched from that commit.

## Evidence labels used below

- **Source-observed** — demonstrable in the repository at `8898393`.
- **Runtime-verified** — observed in a named environment, dated, with the method stated.
- **Externally verified** — supported by a named primary source, re-fetched this session.
- **Inferred** — interpretation or predicted consequence.
- **Unverified** — needs evidence or access not available here.

## Dispositions used

**Fixed** · **Partly resolved** · **Editorial draft awaiting author judgment** ·
**Blocked** · **Superseded**

## What the evidence pass established before anything was edited

Runtime-verified against the production Supabase project `asypkbkiebjvvpimewfp` on
14 September 2026, through already-authorised read-only access:

| | |
| --- | --- |
| Essay rows | **165** |
| Published | **5** |
| Curriculum stubs (161) across modules (49), tracks (5) | matches the planned inventory exactly |
| Green Transition essays | **0** |
| Development Finance essays | **0** |
| Accounting essays | **0** |
| `published` vs `status` disagreement | **0 rows** |
| RLS read gate on `essays` | `published = true` (`essays_select_anon_published`) |
| `slug` uniqueness | enforced (`essays_slug_key`) |
| Essays mentioning the carbon-tax reversal | **0 of 165** |

Two of those reframed findings substantially: the Green Transition section has no essays at
all (so Finding 17's query bug is real but presently inert), and the carbon-tax reversal is
genuinely absent from the whole corpus rather than only from the entrances.

---

## Work package A — evidential trust

### Finding 1 · Critical · Contradicted tracker premise — **Fixed**

**Evidence.** Source-observed: `trackerIssues.ts`, entry
`geothermal-pricing-framework-revision`, `publishedAt: '2025-06-15'`, body asserting "No
material progress was observed on the long-awaited RUPTL update" and a key observation
calling the delay "the single binding constraint". Externally verified (re-fetched
14 Sep 2026): [ESDM](https://esdm.go.id/id/media-center/arsip-berita/kementerian-esdm-resmi-merilis-dokumen-ruptl-pln-2025-2034)
— RUPTL PLN 2025–2034 announced and ratified **26 May 2025**, published **3 June 2025**.

**Done.** A `Correction` type with three required parts (claim / correction / **effect**)
plus dated sources; rendered **above** the text it corrects, with the original kept verbatim
under "As published … — unedited". The effect line refuses the opposite overclaim: approval
of a plan is not procurement, and the obstacles the issue documents elsewhere are untouched.
A second, issue-level correction covers the Q2 framing. A claim/source/outcome ledger covers
all 22 entries (`tracker-claim-ledger.md`).

**Files.** `src/data/trackerIssues.ts`, `src/components/tracker/TrackerEvidence.tsx`,
`src/pages/GreenTransitionTracker{,Detail,Essay,Archive}.tsx`.
**Verification.** `tests/unit/trackerEvidence.test.ts` — 19 tests, including that the body
still contains the original sentence, that no correction predates the text it corrects, and
that the effect line does not overclaim.

### Addition A01 · OJK taxonomy chronology — **Fixed**

**Externally verified** (re-fetched): [OJK](https://keuanganberkelanjutan.ojk.go.id/keuanganberkelanjutan/ArticleList/View/1776)
— the instrument is **TKBI**, second edition introduced **11 Feb 2025** at PTIJK,
disseminated **24 Feb 2025**. The tracker called it a draft in consultation on 1 Mar 2025
and again through Q2. Corrected in both places. The surviving point is kept explicitly: a
published taxonomy is not a lending obligation, and this tracker produced no evidence on
whether bank behaviour changed.

### Finding 2 · High · A stale quarterly promise — **Fixed**

No sourced continuation exists, so the default applies: `TRACKER_COVERAGE` marks the archive
**paused**, names the period covered, and carries `lastSubstantiveUpdate` — the date the
*content* changed, not the date of a build. "Latest Issue" is gone from three pages; issue
cards show the period covered rather than only a publication date. The open questions are
preserved as the questions each issue was asking.

### Addition A06 · Direction versus divergence — **Fixed**

`READING_META` gives each quarterly label a `means` and an `excludes`; Fragmenting states
that divergence is **not a direction** and is not exclusive of advance or regression within
a subsector. Each issue carries `readingBasis` naming the instruments its label was read
from. The Q2 claim that sector-specific positioning was "the only rational allocation
posture" assessed no price, horizon, mandate, downside or pricing-in: "only" is withdrawn in
a correction, the narrower divergence claim stands, and the live preview copy is rewritten
to a scoped statement.

---

## Work package B — encounterable judgment

### Finding 3 · High · No fixed entrance to the thesis — **Partly resolved**

**Runtime-verified.** The strongest completed work bearing on the claim is
`indonesias-reindustrialization-bet` (13 428 characters, published, selected). Its body was
read in full before being used. It already carries a bounded case, a strongest objection
(option value of delay), explicit falsification conditions, and a paragraph stating that its
evidence is largely not Indonesian.

**Done.** `src/data/readingPath.ts` states the argument as the evidence supports it, not in
the brief's general form: the outcome, the geography, the horizon, the definition of energy
in play (**captive generation**, not "distribution" in general), the mechanism, the
comparative test, the objection, the falsifiers and the limits. `ReadingPath` renders it
under the hero and in full on About.

**Why "partly".** Only one of the four conceptual links has a completed argument behind it.
The component says so rather than concealing it. **A04's comparative test is stated but has
never been run on a named Indonesian corridor** — that is step 5 of the path, shown as a
gap.

### Addition A04 · Comparing binding-constraint explanations — **Partly resolved**

The four candidate constraints — insufficient capacity, restricted access, inflexible
contracts, unacceptable risk allocation — are named and held distinct, with the outcome,
location and horizon fixed. The IEA 2022 Java-Bali/Sumatra finding is why the general form
of the thesis is not asserted; the narrowed claim is what appears. The comparison is a
**test**, not a finding, and the page says which.

### Finding 4 · High · The four-cell taxonomy misdescribes the site — **Partly resolved**

No new sections were created and no database field added. The Sections list now shows what
is behind each door, computed from published rows — three of five held nothing, and every
row looked identical. Section labels come from one shared map instead of three that
disagreed (the homepage printed `finance` in lower case beside hand-written labels).
`ConceptualLink` keeps subject, distance and purpose apart in the reading path. **A compact
mapping of every published piece to its home and useful lenses is in the handoff** — it is
five essays, and assigning them is the author's.

### Finding 12 · High · The main invitation bypasses curation — **Fixed**

The hero CTA is "Start with the argument" and targets `#the-argument` — the reading path,
directly under the hero. About is second in the main nav, after Home, and in `navSections`
(so it is in the mobile sheet too). The artwork and the navy theme are untouched. Verified
at 360 / 768 / 1280 px with no horizontal overflow on any route tested.

### Finding 13 · High · The carbon-tax reversal is inaccessible — **Editorial draft awaiting author judgment**

**Runtime-verified**: searched all 165 essay records, published and draft, for
`carbon[ -]tax`, `carbon[ -]pric`, and reversal language. One essay mentions carbon pricing;
**none** contains the reversal. So it is absent from the corpus, not merely from the
entrances.

**Done.** `ChangedMind` on About states the one thing that is supplied — the reported fact of
the reversal, labelled as a recollection — quotes the revised position from the essay that
carries it, says explicitly that it is *not* "infrastructure first, carbon pricing later",
and names the four missing pieces. Nothing is reconstructed: no dated quotation, no
undergraduate paper, no workplace revelation. The exact draft the author would need to
approve is in the handoff.

### Finding 19 · Medium · Curation is a set, not an argument — **Fixed**

The argument's order and its reasons live in the repository, so publishing an unrelated
essay cannot reshuffle it. Destinations resolve against what is published at render time
through the existing `essayUrl` builder; an unpublished step renders as unwritten and never
as a dead link. The "Selected Analysis" strip stays a recency feed and now says so. **No
schema change** — the existing `is_selected` flag is untouched.

---

## Work package C — the map

### Finding 5 · High + Addition A03 · Provisional markings look established — **Fixed**

Every condition carries a required `basis`. Fifteen are `scenario` — which is what the
file's own comment already said they were — and the panel states that before anything else,
rather than silently omitting the empty lines. One is `assessed`. A test refuses the word to
any mark whose four lines are not written in both voices and which links no essay. The three
statuses now each say **which dimension** they read on (obstacle / activity / payment
condition), and `STATUS_NOTE` says they are not exclusive and not a scale. The existing
honesty about missing essays is preserved.

### Addition A02 · The three levers are not a theory — **Fixed**

`MECHANISMS` names what the three levers cannot express: capacity, contract terms, operating
rights, risk allocation. A condition can name the one actually at work, and the panel prints
it beside the lever. The pilot uses it: the map can only draw a repricing, and what moves
captive power is a contract. No fourth control was added.

### Finding 6 · High · Economic language contradicts itself — **Fixed**

The standfirst no longer says margins add up to an economy — it contradicted `CHAIN_COPY.basis`
three fields below it. `Unpriced` no longer says a joint "economically does not exist"; it
says no money changes hands, and that unpriced activity is inside the production boundary.

### Finding 7 · High + Addition A05 · Energy, logistics, cold chain — **Fixed**

Energy is three shortages, not one price: generation, network capacity, connection at the
plant gate. It is on the **short version** now, where it was previously invisible — and the
compact generator's canvas height follows the band count, because it was a constant that
silently clipped a third band. Logistics states which fleet and drop pattern its floor is a
floor under, and stops deriving an emissions boundary from revenue presentation: purchased
transport carries fuel, purchased electricity **and** refrigerant into the buyer's indirect
account, per the GHG Protocol; gross-versus-net is a question about control of the goods.
Cold chain is a different burden, not a second floor.

### Addition A07 · Funding roles and tenor — **Fixed**

Capital provider, payer over life and loss bearer are named as three roles and usually three
parties, printed with any written `funds` line. The credit band states the tenor change from
a working-capital cycle to an asset's life, and that a guarantee **moves** a risk rather than
removing it. The pilot's `funds` lines work all three roles.

### Finding 8 · High · Employment — **Partly resolved**

`ShiftCriterion` on the reindustrialisation shift names the motive, the four distinctions a
value-added number cannot make (construction versus durable, gross versus net, quality,
public cost per job), and a **labelled hypothetical** where every arrow on the overlay points
the right way and the motive still fails. The shift's own reading says a border cut is one
mechanism and not a stand-in for reindustrialisation. **The trade-off is prepared, not
answered** — naming a governing constraint is the author's decision, and the field says so.

### Finding 9 · Medium · Accounting governs both distances — **Fixed**

At the Economy distance the principal/agent control test and the lines of the financial
statements are gone; the value-added basis appears instead. Moving the distance control now
changes the explanatory work rather than the label. Four existing tests were updated to pin
the corrected behaviour; the Accounting section is untouched.

### Finding 10 · Medium · Geometric order mistaken for analytical order — **Fixed**

`markOrderNote` says the numbers are positions on the drawing and renumber with the overlay.
Energy was **not** moved to first: the generated order is preserved, and what changed is the
claim made about it. Single-overlay inspection is kept, and `TENSIONS` writes out where the
two shifts compete for the same electricity, in both voices, linked to the element. Generated
files were regenerated through `npm run build:chain`.

### Finding 14 · Medium + Addition A09 · Essay links and sharing — **Fixed**

Opening the short version from the landing page now puts the state in the address, so a
reading reached from there can be sent — the previous rule made that impossible at exactly
the moment someone wants to share. Slugs are unchanged. `CONDITION_AS_OF` dates the
condition layer and is printed in the panel and over the map. The one assessed mark links
the essay that carries its evidence, bidirectionally in substance: the essay is named in the
reading path and the mark names the essay.

**Not done, deliberately.** Reproducing an *old* reading from an old link. The URL identifies
the element, not the version of the assessment, and the interface does not pretend
otherwise — it dates the assessment instead.

---

## Work package D — addresses and failures

### Finding 15 · High · An address can misstate an essay's home — **Fixed**

`GreenTransitionEssayPage` and `DevelopmentFinanceEssayPage` matched on the globally unique
slug and rendered under whatever section and phase the URL claimed. Both now resolve
placement from the row and redirect a disagreeing URL to the canonical one, through the same
`essayUrl` builder whose branches are pinned to the route table. The explicit
`/green-transition/climate-finance/:slug` route declares no `:phase` segment, so `useParams`
returned `undefined` and sibling links read `/green-transition/undefined/<slug>` — nothing
interpolates a route param into a path now, and a test greps for the shape.
`EssayBySlug` told the shell every placement-less essay was a finance essay, which drove
"Continue reading" off the wrong section.

**Verification.** `tests/unit/essayOwnership.test.tsx` — correct ownership, wrong phase,
wrong section, no placement, the climate-finance route, and the undefined-segment grep.

### Finding 16 · Medium · Identity outlasting placement — **Superseded in part, verified in the rest**

**Runtime-verified**: `slug` carries a `UNIQUE` constraint (`essays_slug_key`), and all 165
rows have distinct slugs. The audit's speculative collision concern does not apply. No
canonical migration was undertaken; `/essays/`, the legacy finance routes and the
four-segment redirect are untouched and covered by the existing `essayUrl` route-table test.

### Finding 17 · High, conditional + Addition A08 · Query failure looks like no writing — **Fixed**

`GreenTransitionPhaseFeed`'s category branch **could never fire**: the projection selected
the joined section's slug and not the category's own, then filtered on `c.slug`, so
`categoryIds` was always empty and the fallback served every request. Dead code that looked
like a working preference is removed rather than repaired blind. Both phase pages now
distinguish loading, empty and failed. Six places told a reader "the essay is still there"
after a fetch that failed — a failed fetch establishes neither existence nor absence.

**Runtime-verified, which the audit could not be**: RLS gates reads on `published`, not on
`status`; `status` is the writer's workflow label and nothing in the database consults it.
Reader queries and reader-facing gates now use `published`; admin surfaces keep `status`.
The two agreed on all 165 rows that day, which is exactly why it needed a test rather than a
comment. **No RLS was changed and no access rule weakened.**

---

## Work package E — the syllabus and the desk

### Finding 11 · High · The syllabus looks like an undelivered product — **Fixed**

All 161 planned items remain listed, discoverable and inert. "Coming soon" — a delivery
promise nobody made, repeated 159 times — is now "Planned", with the meaning stated once per
track index rather than implied on every row. Counts stay derived from rows, so a planned
inventory and a published count never share a denominator. Nothing was filtered, hidden or
manufactured, and no stub's question was erased.

### Finding 18 · Medium · Form enforced harder than evidence — **Fixed**

A piece can declare what kind of piece it is, and the gate follows. A correction gets a short
floor and no takeaway requirement, and must cite a source and say what it changes. An argued
position must cite a source. An exploratory piece is warned rather than blocked. A piece that
declares nothing validates exactly as before. The genre and the revision note ride in the
existing `presentation` jsonb — **no migration** — and the revision note is shown to readers
above the article. The tracker's equivalent discipline is work package A.

### Finding 20 · Medium · A genre has not earned another section — **Partly resolved**

Four genres are defined by their **evidential contract**, not their tone. No `/op-ed` route,
no new column, no cadence. None of the five published essays declares one; the vocabulary
renders nothing when absent, so it makes no promise about work that does not exist.
**Proposed assignments for the five published pieces are in the handoff**, for the author.

---

## Work package F — what production serves

### Finding 21 · Medium, conditional · SEO source is not deployment proof — **Partly resolved**

Production was reachable throughout. `docs/response-2026-09-14/production-observations.md`
records every observation with its URL, date and method. In summary:

- **Two origins serve different builds.** `www` serves a build matching the repository;
  the apex 308-redirects to a host serving a build that predates commit `c739e1a`
  (2 August 2026). Runtime-verified.
- **Every canonical URL and `og:url` points at the apex**, which redirects to the stale
  origin, where the per-essay files do not exist. Runtime-verified.
- **Per-essay share cards work on `www`** — the discoverability claim is supported by
  crawler-visible output there, and absent on the apex.
- **A nonexistent URL returns HTTP 200** with the generic shell. Recorded, not fixed: the
  proper fix is a configuration or rendering change the audit is explicit should not be
  prescribed from here.
- **One defect fixed in source**: a deck ending in a newline lands inside the `content`
  attribute of five tags. Whitespace is now collapsed in both the runtime and build-time
  paths. Not yet visible in production, which needs a deploy.
- **Deployment identity is unverifiable** from this session: the reachable Vercel account
  lists no projects.

---

## Addition coverage index

| Addition | Disposition | Where |
| --- | --- | --- |
| A01 | Fixed | Work package A |
| A02 | Fixed | Work package C — `MECHANISMS` |
| A03 | Fixed | Work package C — `ConditionBasis`, `STATUS.reads` |
| A04 | Partly resolved | Work package B — stated as a test; not yet run on a named corridor |
| A05 | Fixed | Work package C — logistics, cold chain, reporting boundary |
| A06 | Fixed | Work package A — `READING_META`, the withdrawn "only" |
| A07 | Fixed | Work package C — three funding roles, tenor |
| A08 | Fixed | Work package D — six error messages |
| A09 | Fixed (identity), deliberately limited (history) | Work package C — `CONDITION_AS_OF` |
| A10 | Satisfied | One assessed reading; the pattern is not propagated |

## Addition A10 — the execution gate

The bounded case is **Indonesian nickel downstreaming: RKEF and HPAL plants and the captive
generation built alongside them, commissioned 2025–2035**. It was chosen because it is what
the one completed argument on this site is actually about, and its body was read in full
before use.

It was used to test, once:

- **both map distances** — the reading is written in the economy voice and the finance voice,
  and they do different work;
- **the status meaning** — the status is `Moving`, and that is not good news: investment is
  under way and its direction is the problem. A status that could only mean progress could
  not have said that;
- **the intervention mechanism** — the map can only draw a repricing, and what moves this
  element is a contract. That is where the three-lever vocabulary broke, and it is why
  `MECHANISMS` exists;
- **the route to a completed essay** — the mark links the essay, and the essay is step 1 of
  the reading path.

**The pattern was not propagated.** The other fifteen marks remain scenarios and say so.
Independent work — the tracker corrections, the routing repairs, the error states, the
curriculum labels, the authoring gate — was completed in full regardless, as the gate
requires.

## Standing limitations

- **No production data was changed**, no CMS content published, no RLS altered, no
  deployment or DNS touched, and nothing was merged.
- The three-unfamiliar-reader study is **pending**: a script is in the handoff, and no
  participants have run it. Nothing here reports measured comprehension.
- The nine "no source cited" tracker claims are **unchecked, not false**, and the interface
  now says which.
- Fifteen map marks are **scenarios**, not findings.
