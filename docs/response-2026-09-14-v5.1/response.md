# V5.1 response: what was done, what was measured, and what is not known

Version 5.1 · 15 September 2026 · branch `claude/vigilant-ritchie-n4aqrb`.

**Reviewed:** `claude/kind-hopper-3nhkce` at `201fa4e`, from baseline `058bf12`. The V5 records
were read before anything was changed and are not rewritten; `docs/response-2026-09-14-v5/`
stands as written.

**Delivered:** three commits on `claude/vigilant-ritchie-n4aqrb`, plus this record.

| Commit | What it is |
| --- | --- |
| `29ef3d5` | The map: the reading path, the five-group overview, the finance split, the energy anatomy, the narrow rails, the laptop measurements, the card |
| `872ad7a` | `scripts/capture-chain-review.mjs` — the review artefact's capture, fixture and manifest |
| `499b91f` | The 34 pictures and `manifest.json`, captured at `872ad7a` with the source tree clean |

Companion records: `decisions.md` (what this supersedes, with the superseded wording kept) and
`overview-map.md` (every group, member, boundary, return and address, generated from the records
themselves).

Nothing is merged, deployed or published. No Supabase schema, RLS policy, index, auth setting,
Vercel configuration or CMS content was touched, and none was read to write any of this.

---

## 1. The problem this pass was given

A reader arriving at the entrance met a drawing whose labels were 10.4 CSS pixels on a 1280px
laptop, a card that said no essay reads this yet under every element — including the two elements
that do have essays — and two claims the prose made that the drawing did not: that finance
attaches only to transformation stages, and that "energy" is one undifferentiated input.

Each of those is fixed below, and each is measured or exercised rather than asserted.

---

## 2. The card to the essay, at rest

The reviewed `ChainTargetPanel` took its essay list from the ACTIVE SHIFT TARGET. With no
overlay on — the state a reader arrives in — `shiftTarget(null, id)` returns nothing, so the
list was empty for every element on the page.

What replaced it:

- **`ESSAY_ASSOCIATIONS`** hangs off the ELEMENT id. Each row carries the slug, the title, what
  the essay reads at that element, the state it was read under (`under?: ShiftId`), and the
  basis of that reading.
- **`essaysFor(id, shift)`** returns the same rows at rest and under an overlay. It sets
  `evidence: true` only where the row's `under` is the overlay that is on AND that element's
  reading under it is `assessed` rather than `scenario`. A scenario reading's essay is shown as
  related writing with its context named; it is never relabelled as a general finding.
- **`useChainEssays`** asks the content interface for exactly the slugs the map names, through
  the same published filter the rest of the site uses, and returns each essay's canonical
  address. A destination present in that index is described as published; one the query does not
  answer for is described as unchecked. No keyword matching, no stub presented as an essay.

Energy exposes both of its essays with no overlay on. Changing distance does not erase them: the
distance changes the lead, not the list. `band-credit` — working capital and trade credit —
shows the genuinely empty card, because no essay reads it yet.

Addresses are untouched: the parameter names, the slugs, direct links, reload, history and focus
restoration are all as V5 left them, and the tests that hold them are unchanged.

---

## 3. The overview as an abstraction

Five groups replace two boxes: origins, processing and intermediation, manufacturing and
packaging, distribution and retail, use and recovery.

Every group's members, boundary connections, internal relationships, return destinations, public
addresses, and what an overlay may say about it are in `overview-map.md`, generated from
`src/data/industryChain.ts` so it cannot drift from the drawing. In summary:

- **A group is a frame, not a stage.** Four of the five keep their members drawn inside the
  frame. One — distribution and retail — is a box, and folds exactly two internal transfers.
  No group carries a margin, no group inherits a member's status, and no overlay may speak for a
  group as though it were one conversion.
- **Boundaries stay doors.** Every joint crossing a group's edge is drawn and selectable at both
  levels, with its border (export, import) intact.
- **Returns keep their destinations.** Six returns, five destinations, each its own arrow at
  both levels. Nothing collapses into a single arrow back to processing.
- **The folded transfers keep their addresses.** `?node=wholesale-retail` opens the detail with
  that transfer revealed and its reading open. Captured at 390 and 1280 as
  `detail-from-address`.
- **Identity is enforced, geometry is not.** The two plates are emitted by separate layout
  functions from the same records; the build throws if the mark order computed on the detail
  differs from the overview's.

The canvas goes from 1660×930 to 1212×862. That is what makes the overview legible on a laptop
without shrinking a single label, and it is the point of the regrouping rather than a side
effect of it.

---

## 4. The finance split, completed

V5 renamed one band into two but gave asset and project finance `attaches: 'stages'` — Energy's
attachment coordinates — so the drawing said assets exist only where goods are transformed.

- **Purpose, recipient and arrangement are separate.** Asset and project finance now attaches to
  nine named recipients: the five stages plus distributor, wholesaler, retail and recovery. It
  also names the three supporting layers it funds — logistics, cold chain, energy — because a
  warehouse, a reefer fleet and a generator are assets someone financed.
- **Working capital keeps the joints**, because a transfer is what it bridges — but the card no
  longer defines it by the diamond at that transfer; it says what it does and on what terms.
- **The green overlay's project-finance reading moved to `band-capital`**, where it belongs,
  with its status and basis unchanged and its mechanism named as risk allocation. `band-credit`
  now has no target under that shift, which is the truthful outcome; no status was manufactured
  to fill it.
- **The panel classifies by what a layer does, not where it attaches.** `chargedAtJoints(band)`
  requires a margin as well as an attachment; `setsTerms(band)` is the layer that sets terms
  without earning a fee at the transfer. A joint's card now shows three lists — charged here,
  setting the terms here, standing behind it — so contract governance is no longer read as
  taking a cut of a move.

---

## 5. Energy in the drawing

The band carries an anatomy: a line for the network, a filled point for generation, open circles
for the connection at the function, and a named mark for generation on site. The distinction a
reader had to open a disclosure to find is now in the drawing.

What it does not say: that every energy input follows a public grid (self-supply is drawn and
named), that electricity distribution is goods distribution (they are separate layers with
separate ticks), or that any one component is Indonesia's binding constraint. The reading says
which one binds depends on location and timing.

Under an overlay, a mechanism that is not a price says so: the lit band names it — "A contract
is renegotiated" on energy, "Risk moves to another party" on asset finance — so a capacity,
connection or contract intervention is not misdescribed as a price change. The chip is drawn at
run time inside the lit band, because the interactive band paints over the static overlay layer.

Public policy, infrastructure, finance and a carbon tax are not four mandatory stages anywhere
in the records: they are separate mechanisms on separate layers, and the overlay names whichever
one a reading is about.

---

## 6. The narrow overview

At 360 and 390 the seven enabling layers no longer follow the entire goods chain as a catalogue.
They run beside it: rails exactly as tall as the groups they span, ticked at the rows where each
attaches, in a grid whose first column is the chain and whose other seven are the layers. A
reader meets the dependency while reading the chain, not after it.

- The physical sequence and the cross-cutting layers stay distinct: the chain runs down, the
  layers run beside it, and a tick is an attachment rather than a step.
- The broad structure is reachable without traversing every transfer: five group frames, each
  with its own name, and the transfers between them folded into one line each.
- Each rail carries a name lane and a tick lane. Asset finance attaches at its recipients, the
  first of which is the first group on the page, so its name and its first tick wanted the same
  pixels; the rails now hold both. An e2e test at 360 and 390 asserts that no name leaves its
  rail and no tick is drawn over a name.
- The page never scrolls sideways at either width, with or without an overlay.

---

## 7. Readability, measured

Method: `getComputedStyle(node).fontSize` × (`svg.getBoundingClientRect().width` ÷
`svg.viewBox.baseVal.width`), after `document.fonts.ready`, in Chromium 141 at device scale 1.
Not a source font size in viewBox units. The reviewed commit was built and served from a
worktree at `201fa4e` and measured the same way in the same browser, so the two columns are
comparable.

"Smallest label" is the minimum across every text class in the plate — joint chips, layer names
and notes, group names, return labels, lane names, flow labels, callouts, borders — not the
stage names.

**The overview, rendered CSS pixels**

| Viewport | | Plate drawn at | Scale | Stage names | Node names | Smallest label | Map scrolls sideways |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1280 | 201fa4e | 1232px of 1660×930 | 0.742 | 13.4px | 11.1px | 10.4px | no |
| 1280 | this branch | 1232px of 1212×862 | 1.017 | 18.3px | 15.2px | 14.2px | no |
| 1440 | 201fa4e | 1392px of 1660×930 | 0.839 | 15.1px | 12.6px | 11.7px | no |
| 1440 | this branch | 1392px of 1212×862 | 1.149 | 20.7px | 17.2px | 16.1px | no |
| 1920 | 201fa4e | 1760px of 1660×930 | 1.06 | 19.1px | 15.9px | 14.8px | no |
| 1920 | this branch | 1760px of 1212×862 | 1.452 | 26.1px | 21.8px | 20.3px | no |

**The detail, rendered CSS pixels**

| Viewport | | Plate drawn at | Scale | Stage names | Node names | Smallest label | Map scrolls sideways |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1280 | 201fa4e | 1232px of 1717×957 | 0.718 | 12.9px | 10.8px | 10px | no |
| 1280 | this branch | 1717px of 1717×917 | 1 | 18px | 15px | 14px | yes |
| 1440 | 201fa4e | 1392px of 1717×957 | 0.811 | 14.6px | 12.2px | 11.4px | no |
| 1440 | this branch | 1717px of 1717×917 | 1 | 18px | 15px | 14px | yes |
| 1920 | 201fa4e | 1760px of 1717×957 | 1.025 | 18.5px | 15.4px | 14.4px | no |
| 1920 | this branch | 1760px of 1717×917 | 1.025 | 18.5px | 15.4px | 14.4px | no |

**Correcting V5 on 1600px.** V5's record states that "the target is met at 1600 and above and is
not met at 1280". That sentence is about STAGE NAMES only. V5's own table, two lines above it,
records 16.3px stage names, 13.6px node names and 12.7px small labels at 1600 — so at the width
V5 called passing, the joint chips, layer names, return labels and lane names, which are what a
reader operates the map with, were still under the target. Measured here on the same commit by
the same method, the reviewed detail plate's smallest label reaches 14px only at 1920 (14.4px),
and the reviewed overview's only at 1920 (14.8px). The correct statement about the reviewed
build is that the target was met for one label class at 1600 and for the map as a whole at about
1920. This record therefore reports the smallest label in every table, and the e2e assertion
added here checks every class rather than the largest one.

At 1280 the overview's smallest label goes from 10.4px to 14.2px, and the detail's from 10.0px
to 14.0px. Every text class in both plates clears 14px at 1280; the full class-by-class figures
are in section 10.

**Smaller secondary labels, and why they remain usable.** One: the layer rail's short name in
the narrow column, at 12px. At 14px its line box is wider than the 24px rail and the name is set
over its own ticks. The rail's accessible name is the layer's full name, the same layer is named
at full size in the card the rail opens, and nothing has to be read off the rail to operate the
map. The reason is recorded in `chain-review.css` beside the rule. Nothing else in the map is
below 14px at any width tested.

**What was done before widening anything.** The overview was regrouped, its labels wrapped and
its rows reflowed; the canvas fell from 1660 to 1212 units, which is where the gain comes from.
The figure's breakout, which V5 introduced, is unchanged. The detail — which no regrouping can
fit into 1280px at one pixel per unit — is drawn at 1:1 and the box around it scrolls.

**Horizontal overflow.** `document.documentElement.scrollWidth <= clientWidth` holds at 360,
390, 768, 1280, 1440, 1600 and 1920, with an overlay on, the detail open, a card open and the
narrow sheet open. The map-local scroll is a property of the box around the figure, not of the
page; the note under the figure appears only while that box actually overflows.

---

## 8. The card, and the four corrections

The card gives the selected object, a brief reading at the chosen distance, the essays that read
it, and — where there is a reading — its status, its basis and the case that basis was read
against.

- **The case is named.** `BASIS.assessed.card` is "Read against", followed by the case itself.
  For Energy under the green transition that is: Indonesian nickel downstreaming — RKEF and HPAL
  plants and the captive generation built alongside them, in the commissioning window the essay
  dates. "A specific case" no longer appears where the case is unnamed.
- **Qualifications sit next to the claim.** Each status and basis has a one-line card form; the
  long definitions moved one disclosure down, where they are unchanged and in the same order.
- **The 25–50 word lead range was treated as an editorial target.** The Energy finance lead is
  50 words because that is where the sentence ended; nothing was padded to reach a floor or cut
  to reach a ceiling.

The four claims the brief named as wrong are corrected. The superseded wording is quoted in full
in `decisions.md`; what now stands:

**Energy, read as Economy**

> Electricity can be available in aggregate yet unavailable to a particular function. Generation, network capacity and connection are distinct constraints, and which one binds depends on location and timing; a price change alone does not say which.

(37 words)

**Energy, read as Finance**

> What is sold here is heat, motion and light, purchased or generated on site, and the two configurations carry different exposures. Owning generation adds investment and funding commitments while fuel, maintenance and other operating costs remain. The question is which configuration can serve the process reliably, and on what terms.

(50 words)

**Asset and project finance, read as Finance**

> What is sold here is money against an asset rather than against a trading cycle: priced off what the asset can earn, on a tenor and terms the arrangement sets. It fails differently from working capital: sound lifetime returns can still miss debt service while the asset ramps.

(48 words)

**`band-capital.means` — on tenor, and on the three roles**

> Funds the assets a function needs before it can trade at all, and funds replacing them when they wear out. It is priced off what the asset can earn rather than off a trading cycle; how long it is committed, and on what terms it can be drawn or withdrawn, depends on the arrangement — a term loan, a lease, project debt and sponsor equity each answer differently. Who provides it, who pays for it over the asset’s life, and who bears the loss if it fails are three separate questions; they can sit with one party or with several. An asset that ramps can miss debt service on sound lifetime returns; that is a timing problem and it needs a timing instrument — grace, sculpted amortisation, a reinvestment facility held outside senior maturity — not more subsidy. A guarantee or a concession moves who carries the risk of building; it does not make the risk disappear.

**`CHAIN_COPY.panel` — on the three roles**

> Capital provider, payer over the asset’s life and loss bearer are three roles; they can sit with one party or with several. A guarantee moves the third; it does not remove it.

**`band-energy.means` — on what a single price hides**

> Fuel and power enter each function as purchased inputs or through self-supply — drawn as an input rising into every stage, because every conversion needs heat, motion and light and none makes them. For electricity the input has three parts a single price hides: generation, the network that carries it, and the connection at the function — or generation at the function itself. This layer describes their cross-cutting role; it does not imply that energy cannot be owned or that its sale is a net commission. Market prices, tariffs and subsidies affect the cost.

**`band-energy.note` — under the band's name**

> fuel and power into every function · purchased, or generated on site · subsidy

**The assessed case, named on the card**

> Indonesian nickel downstreaming — RKEF and HPAL plants and the captive generation built alongside them, in the commissioning window the essay dates

The two Energy leads the brief supplied were refined against the existing voice rather than
pasted: the map's readings open by naming what is at stake at that element, and "what is sold
here is" is the finance lane's own formula, used at every other layer.

No essay was published or invented, no personal reversal was written, and no empirical position
was added. The corrections remove claims; they do not substitute new ones. The extended material
the old Energy lead carried is not lost — the three-part distinction is in the drawing and in
`band-energy.means`, one disclosure below the lead — and the essay remains the route to the full
argument.

---

## 9. What was exercised

**Gates, on the delivered tree.**

| Gate | Result |
| --- | --- |
| `vitest run` | 566 passed, 38 files |
| `assert-test-count` | 566 tests, 0 failed, floor 561 |
| `playwright test` | 72 passed |
| `eslint . --max-warnings=35` | 26 warnings, 0 errors |
| `tsc -b --force` | clean |
| `npm run build` | clean; prerender skipped, no publishable key in this environment |

**Behaviour covered by new tests**, each written against the risk rather than against a count:

- An essay association on an element is discoverable with NO overlay on, and the same row is
  marked as evidence only under the overlay it was read under.
- A scenario reading's essay keeps its context and is not presented as a general finding.
- Asset finance's attachments are its recipients, including the three non-stage ones, and it
  names the layers it funds.
- Every group's boundary joints are drawn at both levels, and every return keeps its own
  destination.
- A folded transfer's address resolves to the detail with the target revealed.
- A direct URL restores the same reading across a real page load; history and focus survive.
- Every label class in the overview renders at 14px or more at 1280 and 1440.
- The narrow overview keeps the layers beside the chain; no rail name leaves its rail and no
  tick is drawn over a name, at 360 and 390.
- No page-level horizontal scroll at any tested width.

**The pictures.** 34 images and a manifest in `screenshots/`, captured at `872ad7a` with the
source tree clean, Chromium 141.0.7390.37 (Playwright), device scale 1. Every backend call is
intercepted and answered from a labelled local fixture of three published essays, named in the
manifest on every row; no production content was read.

| State | What it shows | Files |
| --- | --- | --- |
| `home-overview` | Default Home: the overview, Economy, no overlay, nothing open. | `360-home-overview.png` · `390-home-overview.png` · `768-home-overview.png` · `1280-home-overview.png` · `1440-home-overview.png` · `1920-home-overview.png` |
| `home-detail` | Home with the detail shown: every function under its own box; wider than a laptop window, it scrolls sideways inside the map. | `390-home-detail.png` · `768-home-detail.png` · `1280-home-detail.png` · `1440-home-detail.png` · `1920-home-detail.png` |
| `home-finance` | The overview read as finance: every joint chip re-worded, the lane named Finance. | `390-home-finance.png` · `1280-home-finance.png` |
| `home-reindustrialisation` | The reindustrialisation overlay at the overview: eight marks, the export cut moving right, the domestic-input callout. | `390-home-reindustrialisation.png` · `1280-home-reindustrialisation.png` · `1440-home-reindustrialisation.png` |
| `home-green` | The green transition overlay at the overview: eight marks, the price arriving at consumption → recovery, the mechanism named on the energy and asset-finance bands. | `360-home-green.png` · `390-home-green.png` · `768-home-green.png` · `1280-home-green.png` · `1440-home-green.png` · `1920-home-green.png` |
| `card-energy-essay` | A card with an essay: Energy under the green transition at the finance distance — the assessed reading, its case named, the essay as the evidence behind it, verified published in the fixture. | `360-card-energy-essay.png` · `390-card-energy-essay.png` · `768-card-energy-essay.png` · `1280-card-energy-essay.png` · `1440-card-energy-essay.png` · `1920-card-energy-essay.png` |
| `card-energy-rest` | The same element with no overlay on: the essay is still there, as related writing with its context kept, not as evidence. | `390-card-energy-rest.png` · `1280-card-energy-rest.png` |
| `card-empty` | A genuinely empty card: working capital and trade credit, which no essay reads yet. | `390-card-empty.png` · `1280-card-empty.png` |
| `detail-from-address` | A detail target revealed from an overview address: the transfer inside the distribution-and-retail box opens the detail with its reading. | `390-detail-from-address.png` · `1280-detail-from-address.png` |

An unfamiliar-reader check was not available in this environment. What is recorded here instead
is an author-and-agent walkthrough of the captured states: each picture was opened and read
against what the brief says a first-time reader should be able to recognise. That is an
evaluation by the people who built it, not user testing, and it is not evidence that a reader
who has never seen the map recognises anything. No user-testing result is claimed anywhere in
this record.

---

## 10. Label sizes class by class, at 1280

| Label class | Overview 1280, `201fa4e` | Overview 1280, delivered | Detail 1280, `201fa4e` | Detail 1280, delivered |
| --- | --- | --- | --- | --- |
| stage name | 13.4px | 18.3px | 12.9px | 18px |
| node name | 11.1px | 15.2px | 10.8px | 15px |
| joint chip | 10.4px | 14.2px | 10px | 14px |
| layer name | 10.4px | 14.2px | 10px | 14px |
| layer note | 10.4px | 14.2px | 10px | 14px |
| group name | — | 14.2px | — | 14px |
| return label | 10.4px | 14.2px | 10px | 14px |
| lane name | 10.4px | 14.2px | 10px | 14px |
| flow label | 10.4px | 14.2px | 10px | 14px |
| callout | 10.4px | 14.2px | 10px | 14px |

"Group name" has no reviewed-commit column because the reviewed overview had no group names to
draw. At 1440 every delivered class is 16.1px or more on the overview and 14px on the detail; at
1920, 20.3px and 14.4px.

---

## 11. What is verified, what is a prior report, and what is not known

**Verified in this pass, in this container.**

- Every measurement in sections 7 and 10: taken in Chromium 141 at device scale 1, on builds of
  `201fa4e` and of this branch, by the same method.
- Every gate result in section 9: run on the delivered tree, output read.
- Every behaviour in section 9's second list: exercised by a test that fails when the behaviour
  is removed.
- The 34 pictures: captured from a production build of `872ad7a` with the source tree clean.

**Reported earlier, not re-checked here.**

- **Two production origins serving different builds.** V5 recorded, from the v2 pass, that
  `www.dikagustiana.com` serves a current build while the apex 308-redirects to an older Vercel
  deployment, and that `SITE_ORIGIN` is the apex. Nothing in this pass looked at DNS, at Vercel
  or at either origin. It is carried forward as an earlier report, not as a finding of this
  pass, and not as a fact.
- **The 161 curriculum stubs across 49 modules.** Unchanged by this pass and not re-counted
  here. They remain in the curriculum surfaces and are not on Home.

**Not known, and not inferable from this branch.**

- **Anything about the database.** No Supabase schema, table, policy or index was read or
  altered. `useChainEssays` describes the shape of a query this frontend sends; it is not
  evidence of what exists in production, and nothing in this record should be read as a claim
  about the production content index. Whether the three essays the reading path names are
  published in production is unknown here: they are published IN THE CAPTURE FIXTURE, which is
  labelled as such on every manifest row.
- **Prerender.** `npm run build` skips it without a publishable key, so per-essay share cards
  are not exercised in this environment. Expected on CI; a deploy would fail rather than skip.
- **One browser.** Chromium in this container. Not Safari, not Firefox, not a real device. Text
  rendering, and therefore wrapping inside the generated boxes, can differ — and the generator
  still sizes boxes with an average-character-width estimate rather than measured metrics.
- **Hyphenation.** `hyphens: auto` is set on the narrow column but this Chromium has no
  dictionary for it, so the column is also given the width its longest words need. On a browser
  that does hyphenate, the breaks will be better, not worse.

---

## 12. Unresolved substantive questions

These are questions about the argument, not about the code. None is answered here, and none
should be answered by a change to the map alone.

1. **Whether asset finance's recipient list is the right cut.** Nine recipients are named. A
   packaging line and a reefer fleet are both financed assets, but one sits inside a
   transformation stage and the other inside a layer. The drawing now says both are financed; it
   does not say whether they should be read as the same kind of commitment.
2. **What "generation on site" covers.** It is drawn as one mark. Captive coal, on-site solar
   and a standby diesel set are different exposures with different contracts, and the map does
   not distinguish them. Whether it should is an editorial question about how much anatomy one
   band can carry before it stops being a map.
3. **Whether the green transition's asset-finance reading should stay a scenario.** It is
   marked scenario and moving, which is what the essay supports. If an assessed reading is ever
   written for it, the mark's form changes and the card gains a named case; that is a writing
   decision, not a code one.
4. **Whether the distribution-and-retail box should stay collapsed.** It is the only group that
   folds its internal transfers. The two folded addresses resolve, but a reader who wants to
   compare a distributor's spread with a wholesaler's must open the detail to see both.
5. **Where an essay's own text should link back into the map.** V5 delivered the address
   contract for the author. Nothing in this pass writes those links, because essay bodies are
   CMS content and this brief does not authorise publishing.

---

## 13. What this pass does not claim

The hero is still gone, both drawings still carry the same identities, and every card has an
essay heading or an honest absence of one — but none of those is the test. What is claimed is
narrower and is the part that was measured:

- At 1280 and 1440 the overview's labels are legible at the size the brief asked for, and the
  structure a reader has to recognise — movement of goods, the three kinds of flow, the layers
  that support and constrain several functions at once — is drawn at that size without a
  scroll.
- Choosing a relationship leads into writing where writing exists, with no overlay required, and
  says so honestly where it does not.
- The relationships the drawing asserts — what finance attaches to, what energy is, where a
  return goes, what a group contains — are the relationships the records hold, and a test fails
  if they diverge.

Whether a first-time reader on an ordinary laptop actually recognises those things is not
established by this record. It would take a reader who has not seen the map before.
