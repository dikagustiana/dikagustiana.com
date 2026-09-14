# What only the author can settle — this pass

Version 3 · 14 September 2026. Four items. Nothing recorded as resolved in the
v1/v2 handoff is re-asked here; the ten items in
[`../response-2026-09-14/editorial-handoff.md`](../response-2026-09-14/editorial-handoff.md)
stand as they are.

---

## 1 · The short plate's entrance copy — accept, amend or replace

Shipped, and written to be replaceable: every word is in
`src/data/industryChain.ts` under `CHAIN_COPY.opening`, and nothing else depends
on its wording.

It was written under three constraints, and each is worth checking against your
own reading of the case:

- **The relation is bounded to the assessed case.** The line reads "on the one
  case this map reads against evidence, it is made plant by plant rather than by
  the grid". Your own `now.economy` line says "Power for new processing capacity
  is being decided plant by plant rather than by the grid" — a statement about
  Indonesian nickel. If that generalises further in your view, the bound can be
  loosened; if it should be narrower still, say so and it narrows.
- **The caution is load-bearing.** "Distribution on this chain moves goods. The
  electricity network is a different network: this reading is about the power
  chosen for one plant, not a finding about national network capacity." It exists
  so the one Assessed label on this map is not read as a national
  network-distribution finding. If you would rather put it after the reading than
  before it, that is a one-line move.
- **No figures.** The map's own rule (`carries no figures anywhere`) excludes
  dates and thresholds, so the entrance points at the reading and the essay for
  them. A first draft saying "commissioned 2025–2035" was caught by that test.

**An alternative opening question, if you want one less about agency and more
about timing:** *"The electricity a plant will still be burning in the 2050s is
chosen in the decision that approves the plant. Where does that decision sit on
this chain?"* Same case, same bound; it leads with the horizon rather than with
the actor.

---

## 2 · The one serious alternative explanation — where it should live

The audit asks the featured reading to carry "one serious alternative explanation
or condition under which the proposed intervention would not resolve the
problem". The reading already carries two of your own, and this pass moved
neither:

- `action.economy`: repricing energy "is not what moves this element. A captive
  plant already under construction is choosing a vintage, not responding to a
  price."
- `holds.finance`: where finance binds, it usually binds on **timing** rather
  than on lifetime returns, and "treating a timing failure as inadequate returns
  spends the subsidy on the wrong problem."

**The decision:** whether either is prominent enough where it sits — both are
below "Where it stands" in a panel a reader has to scroll — or whether one should
be raised into the entrance so a reader meets the counter-case before the
argument. No code change is needed either way; it is one more line in
`CHAIN_COPY.opening` if you want it raised.

---

## 3 · The apex origin — one configuration change, unchanged since v1

Re-observed on 14 September 2026 at 09:26 UTC: `https://dikagustiana.com/` still
returns **308 → `https://dika-s-digital-studio.vercel.app/`**, and that origin
still serves a build without the favicon links, `og:url` or absolute `og:image`
that this repository has emitted since 2 August 2026. `www` serves the current
build (`last-modified: 14 Sep 2026 08:48:33 GMT`).

`SITE_ORIGIN` is the apex, so every canonical URL and every `og:url` this build
emits — including a shared map reading, which U05 has just made restore correctly
— points at the redirecting host.

**Two ways to close it, both yours:**

1. Point the apex at the project that serves `www`, in Vercel's domain settings.
   Nothing in this repository changes.
2. Or make `www` canonical and change one constant (`src/lib/siteOrigin.ts`),
   which is a code change this branch has deliberately not made, because choosing
   a canonical origin is a decision about the site's identity rather than a bug.

This session could not read the Vercel project configuration to prepare anything
more precise: the reachable account lists one team and no projects, exactly as
the v1 record found. The deployed commit and the repository each origin builds
from remain unverified.

---

## 4 · What the map draws, if its type is to get larger

Not a copy decision, but it is yours rather than the interface's.

Measured this session: the wide plate's smallest meaningful labels render at
9.9px at the 1280px breakpoint and 10.9px at 1440. Raising the type in the
generator does not fix it — 14 units to 16 grew the drawing's own coordinate
space by 4.2% and returned about a pixel, while shrinking every target and every
stage label. A breakpoint high enough to matter would hand every ordinary laptop
the long column instead.

What is left is the drawing's content: the wide plate carries two origin fans,
eleven joints with a chip each, six enabling layers, two borders, four rails, the
retail formats and the return flows. Fewer elements at the same width is more
pixels per element, and which elements a *reader arriving for the first time*
needs is an editorial question about the map, not a layout one.

**No change is proposed and none was made.** It is recorded so that the next
person measuring the type knows the obvious fix was tried and what it cost.
