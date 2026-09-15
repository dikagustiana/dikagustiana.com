# What V5.1 decides, and what it supersedes

Version 5.1 · 15 September 2026 · branch `claude/vigilant-ritchie-n4aqrb`.

The V5 records are not rewritten. `docs/response-2026-09-14-v5/` stands as it was written on
14 September, including the parts this pass overturns. This file says what changed, why, and on
whose authority — and keeps the superseded wording, so nothing substantive is lost by being
replaced.

Where a decision was settled by the V5.1 brief rather than by this pass, the brief is named as
the authority. Where the reason is a measurement, the measurement is in `response.md`.

---

## 1. Structure and drawing

**The overview groups five ways, not two.** V5 drew two group boxes standing for seven nodes and
kept ten of eleven joints, seven bands and six returns at 1660×930. V5.1 draws five groups —
origins, processing and intermediation, manufacturing and packaging, distribution and retail,
use and recovery — as frames whose members stay drawn, and folds exactly two internal transfers
(`j-distributor-wholesaler`, `j-wholesale-retail`) into the distribution box. The brief asked
for fewer major horizontal groups and named the candidates; these are those candidates, with
`stage-packaging` kept parallel to manufacturing rather than beneath it. Element-by-element
consequences are in `overview-map.md`. V5's counts were never immutable and the brief said so.

**A group is a frame, not a conversion stage.** Members keep their own boxes, their own status
and their own addresses. No group carries a margin, no group takes a member's status, and every
boundary joint is a door at both levels. The two folded joints resolve to the detail when their
address is used, with the target revealed.

**The detail plate is 1717×917, the overview 1212×862.** V5's single `plate(level)` becomes
`plateDetail()` and `plateOverview(orderFrom)`: the same records, the same identities and the
same mark order — asserted, not assumed — but not the same geometry. The brief permitted this
explicitly; V5's one-layout-function rule was a means to consistency, and the consistency is now
enforced by a check instead.

**Asset and project finance attaches to its recipients.** V5 gave it `attaches: 'stages'`, which
reused Energy's attachment coordinates and said, in the drawing, that only transformation stages
have assets. It now attaches to nine named recipients — the five stages plus distributor,
wholesaler, retail and recovery — and names the three supporting layers it also funds. Working
capital keeps the joints, where a transfer is what it bridges.

**The green overlay's project-finance reading moves to the layer it is about.** V5 put it on
`band-credit`, leaving `band-capital` with no overlay target at all. The reading is now
`band-capital`'s, with its status and basis unchanged (moving, scenario) and its mechanism named
as risk allocation. No status was invented to fill the empty band; the band that lost the target
simply has none under this shift, which is the truthful outcome.

**Energy is drawn as three things.** Generation, network and connection at the function, with
generation on site as its own mark, are on the band itself rather than inside a disclosure. The
taxonomy stays functional: no actor is named, and contract rights, access and decision authority
remain expressible through the layers that hold them.

**The narrow overview puts the layers beside the chain.** V5 listed them after it. They are now
rails as tall as the groups they span, ticked where each attaches. Each rail carries a name lane
and a tick lane so a name is never set over its own marks; the rails are 24px wide.

---

## 2. The reading path

**Essays belong to the element, not to a shift target.** V5 read them from
`ShiftTarget.articles`, so at rest — the state a reader arrives in — every card reported that no
essay reads this yet. `ESSAY_ASSOCIATIONS` now hangs off the element id; `essaysFor(id, shift)`
returns the same rows at rest and under an overlay, and marks a row as evidence only where the
overlay it was read under is on and that reading is assessed. Scenario evidence is never
relabelled as a general finding, and an association stored under one state is never hidden in
another.

**Published is checked, not assumed.** The card distinguishes a destination verified present in
the index it queries from one it has not checked, through the same published filter the rest of
the site uses. It never infers an essay from keyword matching and never presents an unwritten
stub as a finished essay.

---

## 3. Readability

**A map-local sideways scroll is permitted for the detail.** V5 recorded that the 14px target
could not be met on the detail below about 1600px, and named a figure-local scroll as a
possibility it declined because it contradicted a tested principle of this site. The V5.1 brief
settled it: the ban is on the PAGE scrolling sideways. The detail is now drawn at no less than
one CSS pixel per unit and the box around it scrolls when the window is narrower; the page never
scrolls sideways at any width tested. The overview, which is the level a reader meets, fits
without scrolling at every width from the breakpoint up.

**V5's "the target is met at 1600 and above" was a claim about stage names only.** Its own table
shows small labels at 12.7px at that width — under the target — and the sentence above the table
read as if the plate as a whole passed. Section 7 of `response.md` re-measures both plates on the
reviewed commit and on this one, class by class, and reports the smallest label rather than the
largest.

**The narrow column's 14px floor keeps one recorded exception.** The rail name on a phone stays
at 12px. Its accessible name is the layer's full name, the same layer is named at full size in
the card the rail opens, and nothing has to be read off the rail to operate the map. The reason
is in `chain-review.css` beside the rule.

---

## 4. Superseded wording, kept

The four corrections the brief named, and the two Energy leads it supplied, replaced the
following. Every string below is quoted from `201fa4e:src/data/industryChain.ts`.

**`band-capital.means` — asset finance as universally committed for the asset's life, and its three roles as necessarily three parties**

> Funds the assets a function needs before it can trade at all, and funds replacing them when they wear out. Priced off what the asset earns across its life rather than off a trading cycle, so it is committed for years and cannot be withdrawn at a quarter’s notice. Who provides it, who pays for it over that life, and who bears the loss if it fails are three separate questions and usually three separate parties. An asset that ramps can miss debt service on sound lifetime returns; that is a timing problem and it needs a timing instrument — grace, sculpted amortisation, a reinvestment facility held outside senior maturity — not more subsidy. A guarantee or a concession moves who carries the risk of building; it does not make the risk disappear.

**`band-capital.read.finance` — the same commitment claim in the finance reading**

> What is sold here is money committed for the life of an asset, priced off the coverage that asset will produce rather than off a trading cycle. It fails differently from the band above it: sound lifetime returns can still miss debt service while the asset ramps.

**`band-energy.means` — energy as one undifferentiated input**

> Fuel and power enter each function as purchased inputs or through self-supply — drawn as an input rising into every stage, because every conversion needs heat, motion and light and none makes them. This layer describes their cross-cutting role; it does not imply that energy cannot be owned or that its sale is a net commission. Market prices, tariffs and subsidies affect the cost.

**`band-energy.read.economy` — the three shortages, at length**

> Energy intensity, stage by stage — heaviest in extraction and primary processing. Where the state pays part of the price, the subsidy is a fiscal line every stage draws on. Read as a price, this layer hides three different shortages: whether the electricity exists at all (generation), whether the network can carry it to where the plant is (network capacity), and whether the plant can attach to that network on a workable timetable (connection). Only the first is usually counted, and a stage can be short of the third while the first two are adequate.

**`band-energy.read.finance` — self-generation moving energy out of operating cost**

> What is sold here is heat, motion and light: every conversion needs them and none makes them. Fuel and power sit inside cost of sales at every stage, at a price set outside the chain, so a change is passed on or absorbed in the conversion margin. The exception is where a stage builds its own supply: a captive plant moves energy out of cost of sales and into the capital structure, sized to the process and contracted for its life, which is a different exposure with a different remedy.

**`band-energy.note` — under the band's name**

> enters every stage from below · fuel · power · subsidy

**Green transition, `band-credit.condition.action` — project finance discussed on the working-capital band**

> Three roles, usually three different parties. Capital comes from sponsors and their lenders, and increasingly from state balance sheets: a new public allocator was established by statute at the moment this vintage is being set. Payment over the asset’s life comes from the buyer of the processed product through the price, and from the public wherever a guarantee or a concession is granted. The loss, if the liability arrives, falls on whoever still holds the asset — and where that is a state entity, on the public a second time.

**Green transition, `band-credit.condition.read` — the same, at length**

> Read the change in tenor before anything else. A working-capital facility is priced off a cash conversion cycle; project debt against a processing asset is priced off coverage across the asset’s life, and the two fail differently. Debt-service coverage — cash available for debt service over scheduled service — can fail in the first years on a project whose lifetime returns are sound, while loan-life coverage tests something else entirely. A timing failure needs a different instrument from inadequate returns. And a guarantee moves a defined risk to the guarantor: it lowers funding cost because of that transfer, and written over commodity losses it has not removed a risk, it has bought one.

**`CHAIN_COPY.panel` — the three roles as three parties**

> Capital provider, payer over the asset’s life, and loss bearer are three roles and usually three parties. A guarantee moves the third; it does not remove it.


The replacements are quoted in full in section 8 of `response.md`. What each correction changes
is stated there too; in short: an owned generator adds investment and funding commitments and
does not remove fuel, maintenance or the rest of operating cost; asset finance is priced off the
asset on the tenor and terms its arrangement sets, not universally committed for the asset's
life; and provider, payer and loss bearer are three roles that can sit with one party or with
several.

The extended material is not deleted. The three-shortage argument that the old Energy economy
lead carried is now in the drawing (generation, network, connection, generation on site) and in
`band-energy.means`, which the card opens one disclosure below the lead.

---

## 5. Test assertions replaced, and why

Each of these held a V5 decision in place. None was loosened; each was rewritten to the decision
that replaced it.

| Assertion | Held | Replaced by |
| --- | --- | --- |
| `expect(18 * scale).toBeGreaterThanOrEqual(12)` and `expect(14 * scale).toBeGreaterThanOrEqual(9.5)` | A source font size in viewBox units multiplied by the scale, at thresholds below the target | Computed `font-size` × scale after `document.fonts.ready`, every label class, floor 14, at 1280 and 1440 |
| `expect(under).toHaveCount(1)` with `data-chain-scope` | Nothing but the scope line may follow the figure | The scroll note, which appears only while the box actually overflows |
| `groups only nodes, and only into boxes whose members all resolve to records above` | Two node-only group boxes | Five groups, frames and box alike, with stages as members |
| `hides exactly the grouped members and the joints internal to them, and nothing else` | Everything inside a group is hidden at the overview | `OVERVIEW_HIDES`: only the collapsed box's members and the two folded joints |
| `draws the same elements at both levels but for the grouped ones` | One layout function, identical geometry | Same records, same identities, same mark order — asserted between the two plates — with geometry free to differ |
| `backs an assessed mark with at least one essay` | An assessed reading must have an essay on its shift target | An assessed reading must be backed by an essay association on the element, readable at rest |
| `splits the layers on a joint into the ones charged there and the ones standing behind it` | Two lists, by attachment point | Three lists, by what the layer does: charged at this transfer, setting its terms, standing behind it |

No test was added to freeze an element count. The counts that are asserted — seven rails, five
groups, two folded joints — are the structural claims the drawing makes, and each is asserted
against the records rather than against a number typed into the test.
