# V5 decisions — what the owner changed, and what it supersedes

Version 5 · 14 September 2026 · branch `claude/kind-hopper-3nhkce`, from `058bf12`.

`058bf12` was verified as `origin/main` at the start of this work, with no uncommitted
local changes and no unmerged branch carrying newer work. The v2 branch (PR #32) and the
v3 branch (PR #33) are both merged into it.

## The decision

The owner has decided that **the swimlane is the site's primary object**. It is not an
illustration placed after a manifesto, a tutorial, or a reading list. A reader arriving
for the first time meets the structure of economic activity, chooses a relation that
interests them, and goes to an essay for the depth.

Stated as the owner put it:

- The hero is removed. The hero artwork is removed.
- The argument block and the reading path do not precede the swimlane.
- The swimlane is the helicopter view, and it carries the connections through its own
  structure.
- A reader goes deeper into a relation through an essay.
- There is no mandatory opening case and no guided walkthrough.

## What this supersedes

Each of these was a real decision in its own time, recorded and reasoned. None was wrong
when it was made; all are now replaced. Listed so that the source comments and documents
that still argue for them can be read as history rather than as current instruction.

| Superseded | Where it was recorded | Why it existed |
| --- | --- | --- |
| **The hero artwork is a DELIBERATE KEEP** | `src/components/HeroSection.tsx` header comment; `docs/DECISIONS.md` 2026-08-02 and the 2026-08-03 entries | An earlier session deleted the artwork on a misread instruction and the owner reversed that. The keep was protecting the artwork from accidental removal, not from a decision. |
| **The landing page keeps its hero and its short chain** | `docs/DECISIONS.md` (multiple entries, incl. the 2026-08-02 placement note) | Settled a back-and-forth about whether the plate replaces the hero. The later brief put the hero back. |
| **`min-h-[520px]` and `max-w-[55%]` exist to accommodate the artwork; do not reclaim that space** | `src/components/HeroSection.tsx` | A layout constraint that only made sense while the artwork stayed. |
| **The reading path sits directly under the hero, before the map** | v2 work package B; `src/pages/Index.tsx` comment; `docs/response-2026-09-14/response-to-audit.md` finding 12 | The 13 September audit found no fixed entrance to the author's judgment. The answer was a bounded argument above the map. |
| **The hero CTA points at `#the-argument`** | v2; `src/components/HeroSection.tsx` | Same finding: the previous CTA scrolled past the only curated surface to a list of rooms. |
| **One question and one labelled action on the short plate** | v3; `CHAIN_COPY.opening`; `docs/response-2026-09-14-v3/` | The short plate's controls were inert, so v3 gave it a bounded question and a pilot action instead of controls that could not act. V5 fixes the representation instead, which is what makes the controls able to act. |
| **"The ordered argument is above"** | v2; `src/pages/Index.tsx` | True only while the reading path was above the selected strip. |

Two things are **not** superseded and are carried forward unchanged:

- The written material stays. The argument, the reading path, the revision of judgment and
  their data files are kept, and the About page keeps the copies it already had. Nothing
  is moved to About as a new holding area, and nothing is deleted because it left Home.
- The distinction between description, scenario and evidence-based assessment stays, and
  so does everything the two audits corrected. A change of entrance is not a licence to
  re-assert what was withdrawn.

## What this does not authorise

Not decided here, and not done: merging, deploying, production data changes, CMS
publication, schema or RLS changes. The hero removal is authorised and is not re-confirmed
before acting, per the owner's instruction.
