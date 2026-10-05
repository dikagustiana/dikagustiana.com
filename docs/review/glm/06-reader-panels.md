# Phase 7 — Reader panels

Four reads of the site. Where a verdict depends on production (currently blank — F1/F32),
the panel records what the reader hits **today**, then what they would hit **once the
owner repairs the pipeline**, since the fix is owner-side and imminent. Quotes are exact,
from the local build of the current branch (which is what production should be serving)
or from live observations as marked.

## Reader 1 — CFO of an emerging-market multinational, sent one essay by a colleague, on a phone

**Today:** the colleague's link is `https://dikagustiana.com/essays/…`. The apex domain
308s to `dika-s-digital-studio.vercel.app`, which renders **a blank white page** (observed
and screenshotted 2026-10-05). URL bar says "dika-s-digital-studio". The CFO closes the
tab in under five seconds; the colleague's recommendation dies with it. **Verdict: lost
before the first sentence.**

**After redeploy:** the phone view of the site is genuinely good — mobile homepage leads
with the serif H1 "The industry chain" and the line "Nothing here is complicated. It only
looks that way from the wrong distance." (screenshot, 390×844). On an essay: serif body,
table of contents, a back-link to the section. Where they stop reading: (a) no byline or
credential line in the essay furniture to answer "why should I trust this person with a
capital-allocation claim?" — the bio lives only on `/about` and the footer ("A
practitioner and (trying to be a good) problem solver by day; a sketcher of Indonesia's
industrialization by night" — charming, wrong register for this reader); (b) no related
reading and no chain context at the end of an essay, so the visit ends when the essay
does. What would have kept them: a one-line author-credibility block on essay pages, and
2–3 related pieces (the data for both exists: `RelatedContent.tsx` is built and used by
zero essay pages; `chainPlacement.ts` knows essay↔stage relations).

## Reader 2 — scholarship panel member, ten minutes, homepage URL

**Today:** types `dikagustiana.com`, gets redirected to a raw project URL with a blank
page. Conclusion drawn in those ten seconds: *not a serious, finished thing.* Ten minutes
wasted; application impression damaged. **Verdict: actively harmful today.**

**After redeploy:** second 0–10: the thesis, in the owner's own words, as the H1 — clear
(G2.1 pass). Minute 1–3: `/about` states the method in first person — "State the
question, the position, its scope and its consequence early. Keep observed evidence,
inference and judgment visibly apart." and "Where a claim is unchecked, say so rather
than writing around it" — a panel member can quote this back. Minute 3–8: one essay
(content-level checks BLOCKED-LIVE) and the finance landing's "A working syllabus, kept
in public. Every question stays listed whether or not it has been answered yet" — honesty
that reads as maturity. Where they stop: the **Learning** nav item — "IELTS Preparation:
Band 7+ Methodology" and "Each book listed here fights a specific ignorance" are a
different person's site; a panel member cross-checking seriousness meets study notes and
a personal library. What would have kept them: Learning demoted out of the main
navigation (owner decision — the content stays either way), and a "start here" reading
path surfaced on the homepage (the About page's curated reading path exists but is one
click away).

## Reader 3 — research lead at an energy-transition / industrial-policy organisation, judging rigour and method

**After redeploy (today they see nothing):** the tracker's banner is the first rigour
signal: "PAUSED ARCHIVE · JANUARY 2025 TO Q2 2025 … written across January 2025–June
2025, and paused there" — declaring a stop beats faking continuity, and the About page
promises "the transition tracker carries dated corrections rather than [writing around
unchecked claims]". The homepage's shift lenses (reindustrialisation (8), green
transition (8)) read as a method: the same chain, two readings, one at a time. Where they
stop: essay-level verification is the whole game for this reader, and two supports are
missing from the product itself — no Verification Register support or check anywhere in
the writing tool (grep: no "Verification" in src/), and the boundaries/limits sections
that the e2e journey pins ("three minutes: the scope, the comparison, the objection and
the limits are all on the page") exist only because the author imposes them on himself.
What would have kept them: the register visible per essay (BLOCKED-LIVE — re-verify after
redeploy), and the tracker resumed or explicitly handed off to a dated note.

## Reader 4 — the owner as author, publishing a new essay on a weekday evening

The flow works: open `/admin/writer/finance/x`, write (autosave every 2 s, chip flips
Saved/Backed up, "Backed up" honestly for published essays), press publish, clear the
validation gate (deck line required, genre, figures, references), choose placement in the
PublishModal, live. The safety nets are real and now tested (19 new tests on the write
path). What bites on a weekday evening: (1) **the public site does not learn about the
essay** — publishing writes the database; the crawler-facing surfaces (per-essay cards,
sitemap, RSS, prerendered pages) are build artifacts, and nothing anywhere triggers a
build on publish — no deploy hook exists in the repo, and today the pipeline is broken
besides (F31). The essay appears in the SPA immediately and is invisible to WhatsApp
previews and search until a successful rebuild; (2) a brand-new essay has **no net before
the first manual save** (`canAutosave` requires the row); (3) small trust-eroders in the
chip: "Unknown error" instead of causes, and the recovery banner offering a stale backup
after a routine save+reload. What would have kept him: a rebuild trigger wired to
publishing (owner-side: Vercel deploy hook secret + a tiny workflow), and the two chip
fixes (Phase 10 orders).
