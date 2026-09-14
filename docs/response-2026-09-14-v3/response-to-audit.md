# U01–U10, one by one

Version 3 · 14 September 2026 · baseline for every finding below: `66d78b4`, the
post-v2 `main` the audit inspected. Each finding was revalidated against that
state before anything was changed; where the audit's description still held, it
is quoted as reproduced rather than assumed.

Affected earlier findings are named where a v3 change touches them. The original
1–21 and A01–A10 are **not** reopened as a backlog.

---

## U01 · High · The short map had no first explanatory encounter — **resolved**

**Evidence.** *source-observed:* `ChainPlateCompact` is `role="img"` with no
`JointHit`, no `BandHit`, no `ShiftMark` and no chip — the Energy band v2 added is
drawn, not selectable. *runtime-verified (Chromium 1348×936, local production
build, 14 Sep 2026):* the short plate offered a distance control, a scenario
control and one button, and nothing that named a question.

**Disposition.** Resolved. The short plate now carries one bounded question, the
relation it turns on, the boundary of the case, and one labelled action that
opens the single reading on this map written against evidence rather than as an
illustration — `PILOT`: the Energy layer, read as finance, under the green
transition, which is `basis: 'assessed'` and the only one that is.

What the entrance says, in the words that shipped:

> **Every stage on this chain buys electricity. Who chooses what kind, and when
> is it chosen?**
>
> Energy is a band beneath the chain, not a stage on it: it takes no title and
> sells no goods, and every stage above it is a customer. That makes the kind of
> power a decision someone else makes, at a moment you can name — and on the one
> case this map reads against evidence, it is made plant by plant rather than by
> the grid, in the same decision that approves the plant.
>
> Distribution on this chain moves goods. The electricity network is a different
> network: this reading is about the power chosen for one plant, not a finding
> about national network capacity.
>
> **[ Explore the power decision ]**
> Opens the full chain at the Energy layer, read as finance, under the
> green-transition scenario. The case: Indonesian nickel processing, and the
> captive generation built alongside it. The reading names its dates; the essay
> behind it carries the source.

Three things that shape it are refusals, not omissions:

- The relation is bounded to "the one case this map reads against evidence"
  rather than stated of new processing capacity in general. The author's own
  `now.economy` line is about the case; generalising it here would have made the
  map assert something the essay does not.
- The caution is the U01 acceptance condition, met before the reader arrives
  rather than after: an asset-vintage and captive-power case is not advertised as
  a national network-distribution finding, and the shared word *distribution*
  does not get to supply a causal argument.
- No dates and no thresholds. The map's own rule is that nothing in
  `src/data/industryChain.ts` carries a figure (the unit test `carries no figures
  anywhere` enforces it, and it caught a first draft of this copy that said
  "commissioned 2025–2035"). The regulation, the article, the threshold and the
  years are in the reading and in the essay behind it.

**Files.** `src/data/industryChain.ts` (`CHAIN_COPY.opening`),
`src/components/industry-chain/ChainPlate.tsx` (`PILOT`, `openPilot`, the compact
header).

**Verification.** *runtime-verified:* `/` at 1280 and 1348 — the action sets
`data-lens="finance"`, `data-shift="green"`, opens the region "Energy", and that
region carries `[data-basis="assessed"]` and `[data-mechanism="contract"]`. The
descriptive default and unrestricted exploration survive: the reader lands in the
ordinary full map with "No shift" and both exits present. Reached by keyboard in
26 tab stops from the top of the document, with focus landing on the reading's
heading. End-to-end: *"the short plate asks one bounded question and its action
lands on the assessed reading"*; unit: *"lands the labelled action on the one
reading written against evidence, in the state it was written in"*.

**Remaining dependency.** None for the entrance. The reading it opens is the
author's and unchanged. Continues original findings 3 and 7.

---

## U02 · High · Distance, scenario and expansion were coupled — **resolved**

**Evidence.** *source-observed at `66d78b4`:* `chooseLens` and `chooseShift` both
began `setExpanded(true)`. *runtime-verified:* pressing the already-active
"No shift" — which changes nothing at all — swapped the short plate for the full
one.

**Disposition.** Resolved, and not by making the controls expand more carefully.
The coupling existed because the short plate can honour neither control: it has
no chips to re-word and no marks to raise. So the controls are not offered where
they do nothing, which is the audit's own rule for an inert control. The short
plate shows its labelled entrance and the button to the full chain; the distance
and the scenario appear where they mean something, and each then changes only
what it names. There is no third distance.

The way back is now reachable from both ends of a figure taller than the screen:
beside the controls and under the map. Collapsing drops the shift and the reading
— the short plate has neither — and keeps the distance and the layer switches,
because the short plate draws neither and the reader did not ask to lose them.

**Files.** `src/components/industry-chain/ChainPlate.tsx`.

**Verification.** *runtime-verified:* compact and full states; both distances;
both scenarios; "No shift" pressed while already active, twice; every
already-active control; the detail level unchanged by all of them. The live
status line (`role="status"`) names distance, scenario, mark count and open
target without rereading the map. Unit: *"offers no distance and no scenario
while it is short"*, *"changes only what each control names once the chain is
open, and never the detail level"*, *"offers the way back beside the controls as
well as under the map"*.

**Superseded tests.** Three unit tests and one end-to-end test pinned the old
coupling and the single exit. Each is rewritten to pin the new contract with the
reason written above it, not deleted.

---

## U03 · High · Proportional fit shrank the reading — **partly resolved, and measured**

**Evidence.** *runtime-verified (Chromium, local production build, 14 Sep 2026),
at the 1280px breakpoint where the figure is 1216px wide and one viewBox unit is
0.7082 screen pixels:*

| Door | Before | After |
| --- | --- | --- |
| joint diamond | 25.5px | 25.5px |
| joint chip | **12.7px** | 24.1px |
| layer switch | **8.5px** | 24.1px |
| numbered mark | **15.6px** | 24.1px |
| layer band | 18.4px (× 999px wide) | 18.4px (× 999px wide) |

Label ink at that width: a 14-unit label is 9.9px, an 18-unit label 12.7px. At
1440 (figure 1336px): 10.9px and 14.0px.

**Disposition — the targets: resolved.** Three of the five doors were below a
comfortable target while the drawing looked composed. Each is now enlarged by a
*transparent* hit shape around the drawn one — the idiom `JointHit` already used
for its diamond — sized at 34 units, which clears 24px at the breakpoint. The
room comes from the plate's height, which costs nothing: the scale is set by its
**width**, so a taller plate is not a smaller one. The reading lane's two chip
rows went from 24 units apart to 36 and the layer bands from 30 to 38; the
viewBox is 1717×919, was 1717×851 — the width is unchanged, so nothing shrank.

Two things the generator did not know and now does: a mark has an ink radius and
a hit radius and they do different jobs (using the ink radius for both is how a
mark's target came to sit on a chip's target); and a `fill="transparent"`
presentation attribute loses to any stylesheet rule, so the hit shapes carry a
class the generated CSS keeps unpainted. The first attempt drew them as rings.

**Disposition — the type: not resolved, and the reason is measured, not argued.**
Raising the small type was tried: `T_SMALL` 14 → 16 in the generator grew the
viewBox from 1717 to 1789 (+4.2%), which handed back most of the nominal gain
(14u→9.9px becomes 16u→10.9px, a net +1.0px) and shrank *every* target and every
18-unit stage label by 4.2% to pay for it. A proportional plate cannot be made
legible by scaling its own type. The alternatives are a breakpoint high enough to
matter — 14 units reaches 12px only at about 1535px of viewport, which would hand
every ordinary laptop the 8,000-pixel column — or fewer elements on the plate,
which is an editorial decision about the map's content and not a UI one. It is in
the handoff as such.

**Disposition — the band: measured and deliberately left.** 18.4px tall, and the
only way to make it taller is to take the gap out from under the band beneath it,
which overlaps an adjacent action to fix a target that is already a strip 999
pixels wide. The end-to-end test asserts this as an exception rather than letting
it pass silently.

**Files.** `scripts/build-chain-plate.mjs` (row pitch, `CHIP_HIT_H`,
`MARK_INK_R`/`MARK_HIT_R`, the `.cp-hit-area` rule), regenerated
`ChainPlateSvg.tsx` and `chain-plate.css`, plus `JointHit.tsx`, `LayerSwitch.tsx`,
`ShiftMark.tsx`.

**Verification.** *runtime-verified* at 1280 and 1440, under both scenarios: 42
targets measured, minimum 24.1px for joint, chip, switch and mark; **no two
targets overlap**, measured by shape rather than bounding box (two circles set
diagonally have boxes that cross and edges that do not). Viewports inspected for
layout and overflow: 360, 390, 768, 1024, 1279, 1280, 1440 on `/` and `/about` —
no horizontal scroll at any of them. See `verification.md` for what was *not*
exercised: no physical device, no touch hardware, no screen reader.

---

## U04 · High · Mobile comparison required leaving the reading — **resolved**

**Evidence.** *source-observed:* the narrow layout opens a modal `Sheet`; the
distance words live in the lead paragraph, outside it. The underlying state
already kept a valid target across a distance change (`canOpen` does not consult
the distance).

**Disposition.** Resolved. The distance rides inside the sheet, above the
reading, as the same two-position control the full map uses, labelled "Read this
as". One voice at a time — the previously rejected two-voice panel is not back.
The sheet itself no longer scrolls; a box inside it does, so the distance control
and the sheet's own Close both stay put through a long reading.

**Files.** `src/components/industry-chain/ChainPlate.tsx`,
`src/data/industryChain.ts` (`controls.sheetDistance`).

**Verification.** *runtime-verified at 360×740 and 390×844:* open Energy under
the green transition, then Economy → Finance → Economy without closing; the same
target stays open, the reading's text changes and changes back exactly, and the
set of `data-voice` values is always a single value. Scrolling the reading to its
end leaves the distance control and the Close in the viewport. Escape dismisses
and returns focus to the row that opened it; no horizontal scroll. End-to-end:
*"the narrow sheet switches distance without losing the target"*.

**Not exercised.** A real phone, a real touchscreen, and a screen reader. The
viewport is emulated; that is stated rather than implied.

---

## U05 · High · Home wrote an exploration URL and did not restore it — **resolved**

**Evidence.** *runtime-verified, reproduced before any change (Chromium 1348×936,
local production build, 14 Sep 2026):* exploring Finance + Green transition +
Energy from the landing page produced
`/?distance=finance&lens=green&node=energy`; opening that exact address in a
fresh load returned `{lens: "economy", shift: null, view: "compact", panel:
null}` — every parameter intact and the reading gone. *source-observed:*
`initialChainUrl(variant === 'full')` gated reading on the full variant only.

**Disposition.** Resolved. Both variants read the address, and the preview opens
itself when one asks for something the short plate cannot draw — a scenario, an
element, or the finance distance. A plain visit is untouched: nothing is written,
and `distance=economy` alone leaves it short, because that is what the short
plate already shows and the writer never emits it.

The published meanings are unchanged (`distance` = Economy/Finance, `lens` = the
scenario, `node` = a permanent slug), as is the history policy — `replaceState`,
so a click is not a back-button step. An element the named scenario does not mark
is still refused and the parameter still dropped, on the landing page as on
About.

One thing the audit did not ask for and the fix needed: a shared reading arrives
thousands of pixels below the fold, and the panel focuses its own heading with
`preventScroll` on purpose. The figure is now brought to the reader once, only
when the address actually asked for a reading, and a fragment in the same address
wins.

**Files.** `src/components/industry-chain/useChainUrl.ts` (`asksForFullChain`),
`src/components/industry-chain/ChainPlate.tsx`.

**Verification.** *runtime-verified:* the explored address copied into a **fresh
page load** (`about:blank` in between, not a client-side navigation) restores the
element, the distance and the scenario, and the figure is in view; a plain `/`
visit is compact with no query; `?distance=economy` stays compact;
`?lens=reindustrialisation&node=recovery` opens the overlay, refuses the element
and cleans the parameter. Unit and end-to-end tests pin all five.

**Remaining dependency.** The link is only as good as the origin that serves it —
see U10. Continues original finding 14.

---

## U06 · Medium · Visual grammar was only partly available without hover — **partly resolved**

**Evidence — the part that was a real failure.** *runtime-verified, reproduced
before any change:* closing a reading opened from a joint's **text chip** dropped
focus to `<body>`. The chip is `aria-hidden`, outside the tab order, and
`focus()` on an element a browser cannot focus does nothing — so a keyboard
reader was returned to the top of the document. The audit asked for this to be
checked and for a failure to be reported only if reproduced. It reproduced.

**Disposition.** Resolved: a chip hands back its joint, which is the door in the
tab order and the one the reader means.

**Evidence — the general grammar.** *source-observed:* the static geometry reads
its definition through one delegated `mouseover` on the figure; the doors (joints,
bands, switches, marks) have their own keyboard handlers.

**Disposition.** Partly resolved, deliberately. The audit rules out putting every
decorative path into the tab order and rules out making every static box pretend
to be a button, and both rules are kept. What is added is one line in the existing
introduction naming what opens — no legend, nothing under the map:

> Two things open: a diamond on the chain, and a band beneath it — each gives the
> margin cut there, read at the distance that is on. Under a shift, a numbered
> disc opens my reading of what that shift does to the element it sits on. The
> rest of the plate names itself under the pointer.

The last clause is a limitation stated rather than papered over. A pointer that
does not hover still gets no per-shape definition from the static geometry; the
`<desc>` on the plate carries the whole grammar for a screen reader, and that is
not the same thing.

The chosen first reading and the distinctions it needs *are* reachable without
hover: the entrance states the one grammatical fact the reading turns on (Energy
is a layer, not a stage), and the panel carries the Assessed/Scenario distinction
and what each status reads on.

**Files.** `src/components/industry-chain/ChainPlate.tsx` (`focusableTrigger`),
`src/data/industryChain.ts` (`CHAIN_COPY.doorsLead`).

**Verification.** *runtime-verified:* a chip-opened reading returns focus to
`.cp-hit[data-id="j-wholesale-retail"]`, a labelled `role="button"`; the pilot is
reachable and operable by keyboard alone. End-to-end assertions for both.

**Remaining.** Hover-only definitions on decorative geometry, unchanged and named.

---

## U07 · Medium · Fading could obscure the next question — **resolved**

**Evidence.** *runtime-verified, with the two fades measured together for the
first time:*

- A group stepped back by Finance isolation was faded as a whole, so a stage
  **name** inside it came out at an effective opacity of **0.1** — a name you
  cannot read, in the half of the plate a reader consults to decide which
  comparison to make next.
- A layer switched off fades to **0.18**, and its keyboard focus ring faded with
  it. An indicator at 0.18 is not an indicator.
- `isolationSet` returns `null` for a band, so opening a *layer* at the finance
  distance does not isolate at all. That is by design, not a defect, and it is
  why the first measurement showed no isolation: the check has to be run on a
  joint.

**Disposition.** Resolved, three ways.

1. What steps back under isolation is now the **geometry**: shapes recede to 0.1
   and names stay legible a step behind at 0.45, while the isolated neighbourhood
   keeps full strength. CSS cannot restore a child through its parent's opacity,
   so the fade had to move off the group and onto its shapes.
2. Both fades come back whole while a keyboard reader holds focus, and go back
   when focus leaves. Never for a pointer: a mouse reader has the pointer to tell
   them where they are.
3. A faded band is easy to read as a claim, and it is not one. Beside the
   controls, only while a layer is off, the map now says: *"One layer is hidden
   from the drawing — which changes what is drawn, not whether the service is
   bought or whether its constraint has gone"*, with **Show every layer** beside
   it. Nothing offered that before.

The repaired label contrast under ordinary shift highlighting
(`chain-review.css`) is untouched and was not conflated with either fade.

**Files.** `scripts/build-chain-plate.mjs` (regenerated `chain-plate.css`),
`src/components/industry-chain/ChainPlate.tsx`, `src/data/industryChain.ts`.

**Verification.** *runtime-verified:* Finance + green transition + a hidden
logistics layer + an open joint reading, all at once — `data-isolate` set,
stepped-back shape 0.1, stepped-back name 0.45, kept name 1, hidden band 0.18;
keyboard focus on a stepped-back joint and on a hidden band both measure 1;
"Show every layer" clears every `[data-hidden]` and the notice with it. No copy
or animation says a constraint was solved. Screenshot:
`screenshots/after-u07-isolated.png`.

---

## U08 · High · The evidence panel could lose its own title and Close — **resolved**

**Evidence.** *runtime-verified, reproduced before any change (Chromium 1348×936,
local production build, 14 Sep 2026).* With the figure's top just above the
viewport, the popover's Close sat at y≈21–47 and its heading at y≈58–82, under a
sticky header occupying y=0–65. Scrolled further, the reading's entire head left
the screen while its middle stayed visible: at a figure offset of −300 the
popover began at y≈−292. Screenshot: `screenshots/before-u08-overlap.png`.

The cause is not a placement bug. The popover was clamped to the **figure**,
correctly, and the figure is not the reader's viewport: the wide plate is taller
than the space under the header on an ordinary laptop.

**Disposition.** Resolved. Placement now intersects the figure with the part of
it a reader can actually see — the band between the bottom of anything stuck to
the top of the window and the bottom of the viewport — caps the reading's height
to that band so its body scrolls instead, and re-places once per frame as the
page scrolls. The header's height is measured, not assumed, and only elements
actually `position: sticky` or `fixed` count.

Two things preserved: the reading stays **inside the figure**, so the brief's
rule that the eye stays near the selected element is not traded away; and where
the figure has genuinely left the readable band, the old rule stands and the
reading scrolls away with the map it belongs to, rather than detaching and
floating over the page.

Scroll ownership is now visible as well as real: the reading's title, its status
badge and its Close are pinned inside the popover while the evidence scrolls
under them. On a narrow screen the same defect had the same shape — the sheet
scrolled and carried its own Close off the top — and is fixed the same way, by
moving the scrolling into a box inside the sheet.

The single voice, the scenario/assessment wording, the evidential limits and the
route to the supporting essay are untouched. Nothing was shortened.

**Files.** `src/components/industry-chain/chainPlacement.ts` (a `Band`
parameter), `ChainPopover.tsx`, `ChainTargetPanel.tsx`, `ChainPlate.tsx`.

**Verification.** *runtime-verified* at 1348×936 at five scroll positions, with
the figure's top at 0, −8, −100, −300 and −600 relative to the viewport: heading
and Close clear of the header and inside the viewport wherever the figure has
room, the popover always inside the figure, Escape closing. Also at a **24px root
font**: popover 452→928 in a 936px viewport under a 97px header, heading at
505→542, Close at 483→521, body scrolling. The narrow sheet at 390×844 with the
same enlarged font: sheet 127→844, its Close 152→196 (44px), the distance row
pinned, no horizontal overflow. Screenshot: `screenshots/after-wide-reading.png`.

**Not established.** A physical phone. The `Assessed` label continues to mean
what the data file says it means — read against a specific case, with the essay
that carries the evidence linked below — and this pass did not re-check that
essay's claims.

---

## U09 · High · The argument entrance had become another long prerequisite — **resolved**

**Evidence.** *runtime-verified (Chromium, document client area 1348×936, 14 Sep
2026), reproduced before any change:* `#the-argument` began at 585px, the chain
section at **2452px**, the map's figure at **2820px**, the document 4478px. The
audit's measurement, independently reproduced to the pixel. Three displayed
reading times of 10, 21 and 20 minutes.

**Disposition.** Resolved by ranking what was already there, without reordering
it, shortening a destination or dropping a gap.

- **One necessary reading, in full.** Step 1 keeps its number, its links, its
  reasoning, what it establishes, its destination and its reading time.
- **The two methods, grouped and optional**, under "Then, if you want the method
  it rests on". Their titles, link chips, reading times and links are all still
  on the page; their reasoning sits behind one disclosure.
- **The two gaps, grouped and named**, under "Two steps of this argument are not
  written" — numbered 4 and 5, each marked "Not written", each with its full
  account of what is missing behind one disclosure. Nothing is hidden from a
  crawler or a screen reader: a closed `details` is in the document.
- **A route to the map** from the entrance itself: "The same claim is on the map
  below: the chain, and the power decision under it."

Result, measured the same way: the chain section at **1783px** (was 2452), the
map figure at **2330px** (was 2820), the document 3987px (was 4478). At 390px
wide, the chain section at 2579px (was 4032). The map's own introduction is the
next ~550px, and it now opens with the question rather than with two inert
controls.

**One copy change, and it is the one the audit named.** Step 4's gap note said
"Checked on 14 September 2026 against all 165 essay records, published and
draft". That reports an operation on the database, not what a reader can inspect.
It now reads: *"Not written. As of 14 September 2026 nothing published on this
site states the original argument, the assumption that failed, or what remains
uncertain."* The check itself stands and its trail is in the v1 record
(`docs/response-2026-09-14/final-report.md`, "What is still uncertain", item 2)
— a **prior-agent report**, not re-established here.

The hero artwork, its reserved composition, the section list and the About page's
full form of the path are untouched. No second reading-path component exists.

**Files.** `src/components/argument/ReadingPath.tsx`, `src/data/readingPath.ts`.

**Verification.** *runtime-verified:* document positions above, at 1348, 1280 and
390; every step title, state and destination present; both disclosures open to
the same prose the full form prints; the existing unit tests for the path —
including *"keeps the gaps visible when nothing resolves at all"*, which asserts
every step title is in the document — pass unchanged. Screenshot:
`screenshots/after-home-argument.png`.

**Not measured.** Comprehension. No reader has been asked whether this is
clearer; that is the study in the v1 handoff and nobody has run it. Continues
original findings 3, 11, 12 and 19.

---

## U10 · High, cause unverified · The two public entrances — **carried forward, dated, not fixed**

**Evidence, established in this session by HTTP request on 14 September 2026,
09:26 UTC.**

| Request | Result |
| --- | --- |
| `https://www.dikagustiana.com/` | 200, 1 985 bytes, `last-modified: Mon, 14 Sep 2026 08:48:33 GMT`. Serves the current build: favicon links, `og:url`, absolute `og:image`. |
| `https://dikagustiana.com/` | **308 → `https://dika-s-digital-studio.vercel.app/`** |
| that target | 200, 1 139 bytes, `last-modified: Thu, 10 Sep 2026 17:24:11 GMT`. No favicon links, no `og:url`, no `twitter:image`, `og:image` is the relative `/logo.png`. |
| that target's `/assets/index-tLuHZmHp.js` | 200, 137 525 bytes |
| that target's `/assets/index-z8XTXeRR.css` | 200, 141 291 bytes |
| that target's `/og-image.png` | 200, **1 139 bytes, `text/html`** — the SPA shell; the file is not there |
| `https://www.dikagustiana.com/og-image.png` | 200, 53 103 bytes, `image/png` |
| `https://www.dikagustiana.com/apple-touch-icon.png` | 200, 57 135 bytes, `image/png` (two attempts) |
| `https://www.dikagustiana.com/this-page-does-not-exist-9f3a` | **200**, 1 985 bytes — the soft 404, unchanged |

**What this session could not establish, and says so rather than inferring it.**

- *unverified:* **whether either origin renders.** Chromium in this environment
  cannot reach either host — every tunnel closes mid-exchange after six seconds
  (`ws_closed_mid_exchange`, recorded by the session's own proxy for both
  `www.dikagustiana.com:443` and `dikagustiana.com:443`), including `www`, which
  `curl` retrieves without trouble. So the audit's observation that the apex
  ended at a blank rendered page is **neither confirmed nor refuted here**. What
  is established is that a blank render there would not be a missing bundle: the
  apex target's own JavaScript and CSS both resolve at full size.
- *unverified:* **the deployed commit, and which repository each origin builds
  from.** `list_teams` returns one team (`team_qkOkuTIM75I336YmxaGlDwWZ`, hobby
  plan) and `list_projects` on it returns an empty list — the same result the v1
  record reports. The hostname matching the stale mirror repository's name
  remains a coincidence worth checking, not a finding.
- *prior-agent report:* that the apex build predates commit `c739e1a`
  (2 August 2026). The served bytes here are consistent with it; the inference is
  the v1 record's and is not re-derived.

**Disposition.** Carried forward with new dated observations. Nothing was
changed: no DNS, no canonical origin switched for convenience, no Vercel
configuration touched, and the stale mirror repository was not inspected. The
configuration handoff is in `editorial-handoff.md` §3.

**Why it still matters to this pass.** U05 makes a shared map reading restore
correctly. `SITE_ORIGIN` is the apex, so the canonical URL the current build
emits for any page still points at a host that redirects to an origin where the
map's current behaviour does not exist. The link contract is now correct in the
source and still lands somewhere else in production. That is one configuration
change, not a code change.
