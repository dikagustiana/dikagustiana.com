# V5 response: what was done, what was measured, and what is not known

Version 5 · 14 September 2026 · branch `claude/kind-hopper-3nhkce`, from `058bf12`.

Four commits: `0e2dc7e`, `543fb40`, `abdf3a5`, `78059d3`.

Companion records: `decisions.md` (what the owner decided and what it supersedes),
`overview-map.md` (every element at both levels, with the grouping rules) and
`linking-into-the-map.md` (the address contract, for the author writing an essay).

---

## 1. What changed

### The landing page

The hero, the hero artwork and the reading path are gone from the entrance. `HeroSection.tsx`
and `hero-manga-texture.webp` are deleted from the repository; `ReadingPath` still exists and
About still mounts it. The map is the first thing under the header, and its own title carries
the page’s `h1`. Nothing precedes it: no artwork, no argument block, no reading path, no
opening case, no guided route.

`Index.tsx` order is now: header/nav → the map (title, controls, drawing, scope line) → Selected Analysis → Sections → footer.

### The map: one drawing at two levels of grouping

The landing page used to carry a taster — a short plate with no doors, no chips and no marks,
whose distance and shift controls were hidden because neither had anything to act on. It is
replaced by the SAME drawing at a coarser grouping. `scripts/build-chain-plate.mjs` now has one
layout function, `plate(level)`, emitting both levels from the same records, so the two cannot
disagree about what exists, what connects to what, or where a mark sits.

At the overview: ten of eleven joints as doors, all seven enabling layers with their switches,
both borders, all six returns with their own destinations, both money and information rails,
both distances, both overlays, and the marks numbered exactly as the detail numbers them. Two
group boxes stand for seven nodes. `detail` un-groups and does nothing else.

The returns are deliberately not grouped: six returns have five destinations, and the single
"Returns → Primary processing" arrow the taster drew was a claim the chain does not make.

### Finance, split by where it attaches

One finance band could not answer the question a reader arrives with. It is now two:

- **Working capital and trade credit** — bridges a transfer, attaches at the JOINTS.
- **Asset and project finance** — builds or changes what the chain runs on, attaches at the STAGES.

Two attach points is a structural claim the drawing makes, not a rename. The joint panel splits
its layers accordingly: the ones charged at that transfer, and the ones standing behind it. One
list said the money that built the warehouse takes a cut of the move.

### What a door opens is a card

A click used to open four hundred words. It now opens one paragraph and a door: the element read
at the distance that is on, and the essay that argues it, directly beneath. Everything the panel
used to open with is one disclosure below, unchanged and in the same order.

Two things stay on the card and are not folded, because folding either would be dishonest: the
BASIS (assessed or scenario) and what the STATUS reads on.

### The address, and the essay that links to it

Live at both levels. It used to be written only once the preview was expanded, because the short
plate had no state worth sharing. A plain visit still writes nothing; the only address that opens
the detail is one naming an element the grouping folds away.

That is the map — essay direction. The essay — map direction is an editorial act, and essay
bodies are CMS content this pass may not publish, so what is delivered for it is the reference
the author needs: `linking-into-the-map.md` gives every slug, what each opens and when, and
which level a link to it lands on. Its two worked examples and its three refusals are held by
`tests/e2e/mapLinks.spec.ts` in a real browser, so the guide cannot go stale without a red.

---

## 2. What was measured

All figures from Chromium in this environment on 14 September 2026, against the branch head.

### Label size on the wide plate, rendered CSS pixels

Before the figure was allowed out of the prose container:

| Viewport | Plate drawn at | Stage names | Node names | Small labels |
| --- | --- | --- | --- | --- |
| 1280 | 0.708 | 12.7px | 10.6px | 9.9px |
| 1440 | 0.778 | 14.0px | 11.7px | 10.9px |
| 1600 | 0.778 | 14.0px | 11.7px | 10.9px |
| 1920 | 0.778 | 14.0px | 11.7px | 10.9px |

After:

| Viewport | Plate drawn at | Stage names | Node names | Small labels |
| --- | --- | --- | --- | --- |
| 1280 | 0.718 | 12.9px | 10.8px | 10.0px |
| 1440 | 0.811 | 14.6px | 12.2px | 11.4px |
| 1600 | 0.904 | 16.3px | 13.6px | 12.7px |
| 1920 | 1.025 | 18.5px | 15.4px | 14.4px |

The overview, being narrower, renders a little larger at every width.

**The target is met at 1600 and above and is not met at 1280.** 1717 viewBox units do not fit in
a 1280-pixel window, and no breakout changes that. The two ways to close it are named in
section 5.

### Label size in the narrow column at 360px

58 labels at 14px, 27 at 16px, 7 at 15px, and 11 uppercase kickers and chips that were at 10 and
11px and are now at 12.5px with the tracking they already carried.

### Horizontal overflow

`document.documentElement.scrollWidth <= clientWidth` holds at 360, 768, 1280, 1440, 1600 and
1920, including with an overlay on, the detail open, a reading open, and the narrow bottom sheet
open. Three of those widths are now permanent tests.

### The generated plates

| | Detail | Overview |
| --- | --- | --- |
| viewBox | 1717 × 957 | 1660 × 930 |
| Joint doors | 11 | 10 |
| Layer doors | 7 | 7 |
| Layer switches | 7 | 7 |
| Marks across both shifts | 16 | 16 |
| Mark order | identical | identical |

### Tests

545 unit tests in 38 files, 66 Playwright tests, all passing. `tsc -b --force` clean.
`eslint . --max-warnings=35` at 26 warnings, all pre-existing. `npm run build` clean.
The test-count floor is raised from 521 to 538.

---

## 3. Screenshots taken

Captured at `/` and `/about` and reviewed: overview at 360, 768 and 1280; the detail at 768 and
1280; the finance distance at the overview and at the detail; each overlay on the detail; the
green overlay at the overview; a card open at the overview; the narrow overview and narrow
detail under an overlay; the narrow reading as a bottom sheet; the bare SVG of each level at
1600. They are working artefacts in the session scratchpad, not committed: three defects they
caught are fixed in `78059d3` and described in its message.

---

## 4. Editorial drafts that need the author

### Six card leads run long

The card target is 25 to 50 words. Two leads written in this pass were cut to fit. Six remain
over, all the owner’s own prose, and cutting an author’s sentences to a word count is not
something an implementation should do quietly. They are named in
`tests/unit/industryChain.test.ts` so each is a known item and a new lead cannot join them:

| Lead | Words |
| --- | --- |
| `j-extraction-processing` finance | 51 |
| `j-retail-consumption` finance | 52 |
| `j-consumption-recovery` finance | 56 |
| `band-logistics` finance | 55 |
| `band-energy` economy | 95 |
| `band-energy` finance | 90 |

The two energy readings matter most: at ninety words a card is the wall the card replaced. Both
carry material (the three shortages; the captive-plant exception) that would sit well in the
folded reading or in an essay.

### Two leads run short

`band-governance` economy and `band-regulation` economy are 20 words each. Short is a smaller
problem than long, and padding a sentence to reach a count is worse than a short one. Named in
the same test.

### The new band’s prose is mine, not the owner’s

`band-capital` — its label, note, span label, `means`, three statement lines and both readings
— was drafted in this pass. It states no magnitude and cites no source, and the repository’s
own no-figures test holds it to that. It should be read as a draft in the owner’s voice.

### Most of the map still leads nowhere

Of sixteen marked targets across the two shifts, one carries an essay. Every other card says
"No essay reads this yet." That is the honest state of a site with five published essays, and
the card now makes it visible where it used to be buried under four hundred words.

---

## 5. Limits of this verification

**Not attempted, by instruction.** No live verification, no Supabase schema change, no RLS
change, no index, no production data, no auth change, no Vercel configuration. Nothing here
adds schema, changes RLS or widens access. The database contract and the production
configuration are not inferred from calling code anywhere in this record.

**One browser.** Chromium in this container. Not Safari, not Firefox, not a real phone. Text
rendering, and therefore wrapping inside the generated boxes, can differ.

**Font metrics are estimated, not measured.** `scripts/build-chain-plate.mjs` sizes boxes with
`est(text, size, 0.6)`, an average-character-width estimate. It is why the two geometry defects
in `78059d3` existed and why a label can still overflow a box with a different font stack.

**The 14px target is not met below about 1600px on the detail plate.** Two ways to close it,
neither taken here because both are larger than this pass:
1. Raise the plate’s source type from 14 to about 17 units and re-flow the layout, which widens
   every box and partly eats the gain.
2. Give the figure its own horizontal scroll below some width, which contradicts an explicit,
   tested principle of this site.

**Prerender is untested here.** `npm run build` skips it with no `VITE_SUPABASE_PUBLISHABLE_KEY`,
so per-essay share cards are not exercised. Expected on CI; a deploy would fail rather than skip.

**Two production origins still serve different builds.** Reported in the v2 pass and unchanged:
`www.dikagustiana.com` serves a current build, while the apex 308-redirects to a Vercel
deployment predating `c739e1a`. `SITE_ORIGIN` is the apex, so canonical URLs and `og:url` resolve
to the stale origin. DNS and Vercel, out of scope here, and not fixed.

**Nothing is deployed and nothing is published.** This is branch work.
