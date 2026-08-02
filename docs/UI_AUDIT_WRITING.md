# UI audit — the writing surface (manual pass)

`ui-audit` is not available in this environment; a previous session confirmed it absent and
this one confirmed it again. This is the manual substitute, run over the writing surface
after the reshape, at 1440×900 and 375×812, in a real browser against the live project.

Findings are ordered by what a writer would hit first. Every "after" was measured, not
assumed — the measurements are in `docs/GATE_LEDGER.md` under the writing-surface session.

## Hierarchy and competing surfaces

| Before | After | Why |
|---|---|---|
| A persistent formatting toolbar **and** a selection bubble menu, both offering bold/italic/headings | The persistent toolbar is deleted; formatting exists only on selection | Two surfaces for one job. The standing one wins the writer's attention while they are trying to write, and it is the one that is wrong most of the time — it offers heading buttons when nothing is selected to make a heading of. |
| The insert menu mixed nine items: five that reformat existing text, four that insert a block | Five insert items only; the five formatting items moved to the bubble menu | "Turn this paragraph into a heading" and "put a table here" are different verbs. A menu that does both makes the writer read all nine rows to find either. |
| Two inputs for the title (`WriterMetadata` "Title *" and the canvas placeholder), two for the subtitle | One of each, at the top of the canvas | Two controls writing one column is a bug waiting for the day they disagree. |
| Sidebar and settings panel visible while drafting | Nothing but the column; everything else in a modal at the publish boundary | The specification's point: the screen either helps you write or it does not. |

## Proportion and measure

| Before | After | Why |
|---|---|---|
| Body paragraphs had no `font-size`, `line-height` or `max-width` on the writing surface — inherited from nowhere in particular, and `.prose-editorial` had **no CSS rules at all** | 680px measure, 1.125rem, line-height 1.75, set explicitly on both surfaces | A measure that happens by accident is a measure nobody chose. It also meant the writer and the reader saw different line lengths, so line breaks and rhythm could not be judged while writing. |
| ~130px of toolbar and border before the first editable line | 48px to the title, 339px to the first body line — and everything in between is the title and subtitle themselves | Chrome above the writing is the most expensive space on the page. |
| A live word count and read time in the corner | Removed from the drafting view | A number that updates while you type is a number you watch. It belongs at the publish boundary, where it informs a decision. |

## Legibility and state

| Before | After | Why |
|---|---|---|
| The status chip said "Saved" regardless of whether the text was in the `essays` row or only in `essay_revisions` | "Saved" for an unpublished essay (it really is in the row), "Backed up" for a published one | A chip that overstates teaches the writer to trust a net that is not there. |
| A failed autosave was quiet | `Save failed` / `Backup failed` in destructive colour, with the error as the tooltip | A silent failure is worse than no autosave. |
| The bar overflowed horizontally at 375px once the chip grew from "Draft" to "Draft · Saved 06:42 PM" | Groups shrink in a fixed order — the back label first, then the chip truncates; the two buttons never shrink | Found by a gate, not by looking: the page scrolled sideways only after autosave had run once. |

## Interaction

| Before | After | Why |
|---|---|---|
| The gutter `+` sat at the text's left edge, over the first ~28px of the current line, and intercepted clicks meant for the text | Pulled into a reserved gutter (`-left-8` into 2.5rem of padding, 4rem from `sm:`) | The caret did not go where it was put. An asymmetric margin on a phone is the cheaper cost. |
| `/` typed inside a code block opened the insert menu | A slash inside a code block stays a slash | In a code block, `/` is content. |
| Nothing advertised the slash command; it was the only way to insert | The `+` is visible on canvas hover and on focus, and opens the same list | An affordance nobody can see is not an affordance. |
| The insert menu could open below the fold on a line near the bottom of the viewport | Measured after paint, and flips above the caret when it will not fit — verified at both viewports | Reading `offsetHeight` before the rows exist returns 0, and the flip never triggers. |

## Not changed, deliberately

- **The bubble menu's eight actions.** The small set is the design decision, not a
  limitation: every post ends up stylistically consistent without the writer thinking
  about it. Nothing that used to render stopped rendering — the five items that moved
  from the insert menu are all still applicable, from the selection toolbar.
- **The drag handle.** It is quiet (opacity 0 until the canvas is hovered) and it is the
  only way to reorder a block without cut-and-paste.
- **The sticky table of contents on the reader side.** The specification has none; it was
  built last session at the owner's request. Kept, and raised as a question rather than
  resolved — see `docs/DECISIONS.md`.
