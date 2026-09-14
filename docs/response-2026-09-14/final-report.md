# Final report

Version 1 · 14 September 2026

## The problem, as it turned out to be

The audits described a site whose entrances made a learning programme more legible than an
authored judgment, and whose diagnostic labels implied more certainty than the displayed
evidence supported. Both were accurate. Reading the production database made the first half
sharper than the audit could see from source.

**There are five published essays.** Green Transition, Development Finance and Accounting
have none at all — not drafts, none. The curriculum's 161 planned items are real and exactly
match the seed. So the site was not a publication whose entrances undersold it; it was two
completed method essays, one completed argument, a site note, a paused two-issue tracker, and
a large, honest plan — presented through an interface that could not distinguish any of
those from the others.

That changed what the work had to be. Not "surface the writing better" but: **make the
interface tell the truth about how much writing there is**, and give the one completed
argument a fixed entrance.

## What improved

**The tracker stops asserting things it has not checked.** Two claims were contradicted by
primary sources re-fetched this session: RUPTL 2025–2034 was ratified on 26 May 2025 and
published on 3 June, three weeks before the entry saying no progress had been observed; the
OJK instrument called a draft in consultation is TKBI, published since February. Both are
corrected without editing a word of the original text — a dated correction sits above it
with three required parts, the third being what the correction does to the conclusion,
*including where it still stands*. All 22 entries now carry an evidence status, and nine of
them say plainly that nobody has produced a source. Unchecked is not false, and the two
never share a treatment. The archive says it is paused.

**A stranger now meets an argument.** The hero's button leads to a bounded position — nickel
downstreaming, captive power, assets commissioned 2025–2035 — with its case, its comparative
test, its strongest objection, what would falsify it, and what its evidence does not cover.
The claim is stated as the evidence supports it, not in the brief's general form: which of
capacity, access, contract terms or risk allocation binds is a question about a particular
asset, and for a given plant the answer can be finance rather than infrastructure. Three
written steps and two named gaps. About is second in the navigation instead of buried in the
footer.

**The map distinguishes a finding from an illustration.** Fifteen marks are scenarios and
say so. One is assessed, written in full against a real case, linked to the essay that
carries its evidence. The three statuses each say which dimension they read on, because an
obstacle, an activity and a payment condition are not three values of one dial. The three
levers are named as what the map can *draw*, not a theory of industrial change, and a reading
can say when a contract or a capacity problem is what is actually at work. At the Economy
distance the accounting apparatus is gone; moving the control now changes the work.

**Addresses stop lying.** Two essay pages rendered under whatever section and phase the URL
claimed; they now resolve from the row and redirect. A route with no `:phase` segment was
minting `/green-transition/undefined/<slug>`. A category branch that could never fire was
serving as a silent preference. Six error messages told readers an essay was "still there"
after a fetch that could not establish anything. And reads now filter on the column RLS
actually enforces.

**The syllabus stops promising delivery.** "Coming soon" was a schedule commitment repeated
on 159 unwritten rows. Every item stays listed and discoverable; the label is "Planned", and
the meaning is stated once per track rather than implied 159 times.

**The publish gate points at evidence instead of form.** A bounded correction can be published
without padding, in exchange for a source and a statement of what it changes. An argued
position cannot be published with no source at all, which it previously could.

## What was tested

| | |
| --- | --- |
| Unit tests | **519 passing**, 37 files (was 433 in 31). Six new files pin the tracker's evidence contract, the reading path, essay ownership, the publication predicate, the map's condition layer, and the genre gate. |
| End-to-end | **46 passing** (was 39). A new spec walks all six reader journeys. |
| Typecheck | clean |
| Lint | 0 errors, 26 warnings — all pre-existing |
| Layout | 360 / 768 / 1280 px on every changed route: no horizontal overflow. One 108 px overflow was found this way and fixed. |
| Generated files | regenerated through `npm run build:chain`; a latent bug in the generator was fixed, not worked around |
| Production | eight routes, two origins, four static assets, by request, dated |

**Baseline failures**: none. The suite was green at `8898393` and is green now. Where a test
pinned behaviour this work deliberately changed, it was rewritten to pin the corrected
behaviour with a comment saying why — eight tests, each named in its commit.

Two defects were found by looking at rendered pages rather than by reasoning about code: a
`\uXXXX` escape rendering literally in JSX text, and the 108 px overflow. Both are now
guarded by tests.

## What is still uncertain

1. **The thesis is a framing, not a finding.** The comparative test is stated and has never
   been run on a named Indonesian corridor. The flagship essay says so itself. Step 5 of the
   reading path shows this as a gap rather than implying it is settled.
2. **The carbon-tax reversal does not exist in writing.** Verified against all 165 records.
   What is on About is the supplied fact, labelled a recollection, with four named gaps.
3. **Fifteen map marks are scenarios.** Making one a finding needs four written lines in both
   voices and an essay behind it.
4. **Nine tracker claims are unchecked.** Not wrong — uncited.
5. **Production serves two different builds.** The canonical URLs the current build emits
   point at an origin serving a build from before 2 August 2026. Established by request;
   fixing it is a DNS or Vercel change, outside what this work may do.
6. **A nonexistent URL returns HTTP 200.** Recorded, not fixed.
7. **No comprehension has been measured.** The three-reader study is pending; a script is in
   the handoff and nobody has run it.

## The smallest decisions that would finish this

1. **Write the carbon-tax reversal.** Four paragraphs. It is the one place a reader could
   watch a position being revised against evidence, and the site currently has to point at
   the hole. *(Handoff §1.)*
2. **Run the comparative test on one corridor.** One place, one outcome, one horizon,
   four constraints compared. It turns the framing into a finding. *(§2.)*
3. **Point the apex at the current deployment**, or make `www` canonical and change one
   constant. Until then the site's own canonical URLs lead to a build from six weeks before
   the baseline. *(§8.)*
4. **Decide the employment/climate trade-off**, or say why no single criterion governs. The
   question is on the map; the answer is not. *(§5.)*
5. **Accept or reject the five genre assignments**, and the proposed reader, voice and
   success policies. They are proposals, and nothing on the site presents them as settled.
   *(§6, §9.)*

Items 1, 2 and 4 are writing. Item 3 is ten minutes of configuration. Item 5 is a reading
and five clicks.

## What this work did not do

No merge, no deploy, no DNS or Vercel change, no production data written, no CMS content
published, no RLS altered, no schema migration. No essay body was edited — including the
incomplete sentence found in a published essay, which is named in the handoff and left for
its author. No section was created, no route added for a genre, no stub filtered away, and
no map figure invented: the first draft of the one assessed reading carried five magnitudes
and the repository's own no-figures rule caught every one.
