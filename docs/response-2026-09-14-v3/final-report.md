# Final report

Version 3 · 14 September 2026 · four commits on `claude/epic-wright-rcs1ur`,
continuing `66d78b4`.

## What the audit was right about, and what it turned out to be

The audit's sentence was that the site "now explains why its apparatus is
intellectually responsible, but still makes the reader do too much work to
experience a useful explanation." Reproducing its findings before changing
anything made that sharper in one direction and narrower in another.

**Sharper:** the two bounded defects were not near-misses. A link the map wrote
from the landing page restored *nothing* — `?distance=finance&lens=green&node=energy`
returned Economy, No shift, short, with every parameter intact. And the reading
panel did not merely clip: scrolled a little further, its whole head left the
screen while its middle stayed visible, because the popover was clamped to a
figure taller than the space under the page header.

**Narrower:** the compact map's problem was not that it needed more controls. It
had two, and neither could do anything — the short plate has no chips to re-word
and no marks to raise. The controls were coupled to expansion *because* they were
inert, which is also why pressing the already-active "No shift" swapped the whole
plate. Offering a reader a control that cannot act is worse than offering none,
and the fix was to stop offering them there and give the plate one question and
one labelled action instead.

## What changed

**A link that records an exploration now restores it.** Both variants read the
address; the preview opens itself when an address asks for something the short
plate cannot draw; a plain visit is untouched. A shared reading is also brought
into view rather than left four thousand pixels below the fold.

**Three controls, three contracts.** Detail, distance and scenario each change
only what they name. The way back sits at both ends of a figure taller than the
screen.

**One question on the short plate, and one labelled action.** It opens the single
reading on this map written against evidence rather than as an illustration, at
the distance and under the scenario it was written in — and it says so before it
does it. It names the relation, not the noun, and it bounds the case: the
electricity network is a different network from the goods distribution on this
chain, and the reading is not a claim about national network capacity.

**A reading that keeps its own title and its own Close.** Placement now
intersects the figure with the part of it a reader can see, accounts for the
sticky header by measuring it, re-places on scroll, and pins the reading's
identity and dismissal while the evidence scrolls under them. The narrow sheet
had the same defect in the same shape and got the same fix.

**The distance, inside the narrow reading.** Economy → Finance → Economy on a
phone without closing the reading and hunting for the element again.

**Doors sized to the screen they are drawn on.** Chip, switch and mark were
12.7px, 8.5px and 15.6px at the breakpoint while the drawing looked composed; all
three are 24.1px now, with no two targets overlapping. The room came from the
plate's height, which costs nothing, because the scale is set by its width.

**A faded door is still a door.** Both fades come back whole under keyboard
focus; a stepped-back group keeps its names readable while its geometry recedes;
and a hidden layer now says that hiding it changes the drawing, not whether the
service is bought — with the way back to the whole drawing beside it.

**One necessary reading, then the method, then the gaps.** The reading path keeps
its order, every destination and both gaps, and stops giving all five the same
introductory weight. The map's section moved from 2452px down the document to
1783px, and the entrance now offers a route to it.

**A header that holds its navigation.** Found by the enlarged-text check: at
1024px a label was clipped mid-word, and at a 24px root font the navigation gave
the whole document a horizontal scrollbar at every width up to 1440.

## What v2's work was kept

All of it. Nothing was reset, reverted or rewritten around.

The two distances, the exclusive scenarios, the single-voice panel, the
Assessed/Scenario distinction and the one assessed reading, the condition layer's
four lines and its status forms, the numbered marks as positions rather than
ranks, the permanent slugs and the published URL parameter names, the
`replaceState` history policy, the narrow column as a real layout rather than a
shrunken plate, the reading path's order and its named gaps, the hero artwork and
its call to the argument, About in the navigation, the corrected error states, and
the written trade-off beneath the map — which this pass integrated rather than
deleted: it is what a reader meets immediately after the featured reading opens.

Four tests pinned behaviour this pass deliberately changed. Each was rewritten to
pin the new contract with the reason written above it. None was deleted, none
weakened, and the test-count floor rose in the same commit that added the tests.

## What was actually tested

| | |
| --- | --- |
| Unit | **525 passing**, 37 files (was 519) |
| End-to-end | **63 passing** (was 46) |
| Typecheck | clean |
| Lint | 0 errors, 26 warnings — all pre-existing |
| Viewports | 360, 390, 768, 1024, 1279, 1280, 1440 on `/` and `/about`; no horizontal scroll at any |
| Enlarged text | root font at 20, 24 and 28px |
| Generated files | regenerated through `npm run build:chain`; the generator changed, never its output |
| Production | two origins, nine requests, by request, dated |

Everything above ran against a local production build with **no backend**: every
Supabase call intercepted, three essay rows seeded as a **labelled local
fixture**. No production data was read or written.

Details, measurements and the list of what was *not* exercised are in
[`verification.md`](./verification.md).

## What is still uncertain

1. **No comprehension was measured.** Nobody unfamiliar has used any of this. The
   three-reader study is still the v1 handoff's proposal and still unrun. Tab
   stops, pixel positions and passing tests are not a substitute for it.
2. **Nothing was exercised on a real device.** No phone, no touchscreen, no
   screen reader, no non-Chromium engine. The narrow layout is an emulated
   viewport and is described as one.
3. **Neither public origin could be rendered from this session.** Both hosts'
   tunnels close mid-exchange after six seconds — including `www`, which `curl`
   retrieves without trouble. So the audit's blank apex page is neither confirmed
   nor refuted here. The HTTP layer *is* established, and re-dated.
4. **The deployed commit is still unverifiable.** The reachable Vercel account
   lists one team and no projects, as in v1.
5. **The apex still redirects to an origin serving a different build.** One
   configuration change, outside what this work may do, and the reason a
   correctly-restoring shared link still lands somewhere else in production.
6. **The wide plate's smallest labels are 9.9px at the breakpoint.** The obvious
   fix was tried and measured: raising the type grew the drawing's coordinate
   space and returned about a pixel while shrinking every target. What is left is
   an editorial question about what the map draws.
7. **Fifteen of the sixteen marks are still scenarios**, and the map still says
   so on every one of them. This pass featured the one that is not; it did not
   promote any of the others.
8. **One overflow is left and is not this pass's:** 360px at a 28px root font,
   4–8px of document, several different causes, present at the baseline.

## What would finish this

1. **Point the apex at the current deployment**, or make `www` canonical and
   change one constant. Ten minutes, and the link contract this pass completed
   starts working for people who are not already on `www`. *(Handoff §3.)*
2. **Read the entrance copy and keep, amend or replace it.** It is four strings
   in one file and nothing depends on its wording. *(§1.)*
3. **Decide whether the counter-case should be raised into the entrance** or stay
   where you wrote it, inside the reading. *(§2.)*
4. **Run the three-reader exercise.** Every claim in this document about a
   reader's experience is a claim about pixels and tab stops until someone does.

## What this work did not do

No merge, no deploy, no DNS or Vercel change, no production data written, no CMS
content published, no RLS altered, no schema migration, no inspection of the
stale mirror repository. No essay body was edited. No second map, no second
reading-path component, no new top-level section, no legend, no Sankey, no
simulator, no numerical magnitude on the map — a first draft of the entrance copy
carried a date range and the repository's own no-figures test caught it.
