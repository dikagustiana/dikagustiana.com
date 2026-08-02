# Handoff — design session

For the account that has `design-direction`, `ui-audit` and `motion-craft`. Those skills do
not exist in the environment that did the writing-surface work, which is why the audit below
was done by hand. This is what you should not have to rediscover. It is a handoff, not a
history — the full record is `docs/GATE_LEDGER.md`, `docs/DECISIONS.md` and
`docs/UI_AUDIT_WRITING.md`.

Base: `main` @ `8dbd238` (PR #12).

## Typography and measure — already decided, already measured

These were set explicitly, not inherited. If you change them, change them on purpose.

| Where | Value | Notes |
|---|---|---|
| Editor canvas (`.essay-prose`) | `max-width 680px`, `font-size 18px`, `line-height 31.5px` (1.75) | Applied to `p`, `h2`, `h3`, `ul`, `ol`, `blockquote`, `pre` |
| Reader (`.prose-editorial`) | same 680px measure, same 18px / 31.5px | `--measure: 680px`, `--measure-wide: 780px` |
| Figures | `min(780px, 100vw - 2rem)` | Deliberately wider than the text column — measured at **768px** against a 680px paragraph |
| Headings | `h2` 1.625rem / 650, `h3` 1.25rem / 650, both `var(--font-display)` | `h1` is the essay title, a database field, not a body block. The schema allows h2 and h3 only |
| Canvas gutter | `pl-10`, `sm:pl-16` | The gutter `+` pulls into it at `-left-8`. Not decorative — see below |

**`prose-editorial` had no CSS rules at all before this.** The class was applied to every
published essay body and defined nowhere. Whatever the reader saw was browser defaults plus
whatever Tailwind reset left behind. If a redesign moves to a typography plugin, the class
name is load-bearing: `ArticleBody` renders `<article className="prose-editorial …">` and the
figure-width rule keys off `.prose-editorial > figure`.

## What the manual ui-audit found

Full table with Before / After / Why in `docs/UI_AUDIT_WRITING.md`. In one line each:

- A persistent formatting toolbar and a selection bubble menu were two surfaces for one job.
  The persistent one is deleted.
- The insert menu mixed five reformat items with four insert items. The reformat items moved
  to the bubble menu.
- Title and subtitle each had two inputs writing one column. Collapsed to one.
- Body paragraphs had no `font-size`, `line-height` or `max-width` on the writing surface.
- ~130px of chrome sat above the first editable line. Now 48px to the title.
- A live word count and read time in the corner, while drafting.
- The status chip said "Saved" for content that lived only in a backup.
- The thin bar overflowed horizontally at 375px once the chip grew.
- The gutter `+` sat over the first ~28px of the current line and swallowed clicks.

**Deliberately not fixed, with reasons:**

- **The eight-action bubble menu was not extended.** The small set is the design decision:
  every post comes out stylistically consistent without the writer choosing. Adding
  underline, colour or font-size controls would undo that, and nothing in the corpus needs
  them.
- **The drag handle was left as-is** — opacity 0 until the canvas is hovered. It is the only
  way to reorder a block without cut-and-paste, and it is already quiet.
- **`tsconfig.app.tsbuildinfo` is tracked and churns in every diff.** Noise, not a defect;
  untracking it is a one-line change nobody has made.
- **The reader's meta row order** (topic badge, author, date, read time) was not tuned beyond
  putting the masthead first and demoting the topic badge out of the top slot.

## Gate-verified — do not silently undo

Each of these was measured on running software, not reasoned about. Changing any of them is
fine; changing them *by accident* is the failure mode.

1. **The bubble menu has exactly eight actions** — bold, italic, strikethrough, link,
   heading, subheading, quote, list — and formatting is reachable from nowhere else. With no
   selection the only titled button on the page is `Insert block`.
2. **The gutter `+` and the slash command share one item list**, `src/lib/tiptap/insertMenu.ts`.
   Both entry points returned string-equal lists. Two menus that drift apart is the thing this
   prevents; if you restyle either, keep the single source.
3. **Zero validation while drafting.** An empty stub shows no error, no warning, no word
   count, no read time. Validation speaks only in the publish modal. This was a deliberate
   posture change, not an oversight.
4. **Reduced motion.** `html { scroll-behavior: smooth }` is gated behind
   `prefers-reduced-motion: no-preference`; unconditional smooth scrolling made even
   `behavior: 'auto'` glide. `ReadingProgress` is rAF-coalesced and compositor-only.
5. **No horizontal scroll at 375px** — on the canvas, with the insert menu open, and on the
   reader. `scrollWidth == clientWidth == 375` in all three. Two regressions were found here
   by measurement alone; assume a redesign can reintroduce one.
6. **The insert menu flips above the caret** when it will not fit below, measured after paint.
   Reading `offsetHeight` before the rows exist returns 0 and the flip never fires.

## The six bugs the gates caught

Briefly, because a redesign can reintroduce several of them.

1. **Strikethrough silently stopped rendering on publish.** Published pages pass
   `essays.content` — the HTML column — to `ArticleBody`, so its "legacy HTML" branch is the
   **live path, not a fallback**. It named `strong`, `em` and `code` but not `s`/`u`/`sup`/
   `sub`/`br`; unnamed tags fall through to `processChildren`, which returns the children
   unwrapped. The words survive, the formatting does not. Guarded by
   `tests/unit/articleBodyInline.test.tsx`.
2. **A figure reloaded with `src=""`.** `figure` and `linkCard` pre-escaped their `data-*`
   JSON before handing it to `renderHTML`, which builds DOM that escapes attribute values
   again. `JSON.parse` threw and every attribute fell back to its default. The rule now lives
   in `src/lib/tiptap/attrJson.ts`: raw for `renderHTML`, escaped for the string serializer,
   tolerant on read.
3. **`content` and `content_json` can diverge, silently — read this one if you touch
   serialization.** `EssayEditor` mirrors the document into React state as HTML and pushes
   external changes back with `setContent`. If a node's `renderHTML` output does not survive
   parse-and-re-serialise **byte for byte**, the mirror never settles: the editor re-parses
   its own output on every keystroke, `content` advances, `content_json` freezes, and the row
   ends up holding two documents that disagree. `linkCard` did exactly this, because its `<a>`
   was claimed by StarterKit's Link mark — ProseMirror gathers every *mark* rule before any
   *node* rule, so at equal priority the mark wins. Fixed with `priority: 100` on the parse
   rule plus an echo guard on the mirror, and guarded by
   `tests/unit/editorHtmlRoundTrip.test.ts`.
4. **Word lists pasted as flat paragraphs with a stray `·`.** Attribute stripping ran before
   list detection, so every check for `mso-list` / `MsoListParagraph` read an already-emptied
   attribute; and the block walk iterated `body.children`, which for Word clipboard HTML is
   one `<div class=WordSection1>` wrapper. Guarded by `tests/unit/pasteFromWord.test.ts`.
5. The thin bar overflowed at 375px once the status chip grew from `Draft` to
   `Draft · Saved 06:42 PM`.
6. The gutter `+` intercepted clicks meant for the text.

## The content contract is five places, not four

Any new block type must go through all of them. Place five was added by finding (3) above.

1. `src/lib/tiptap/extensions.ts` — registered in both `getEditorExtensions()` and
   `getSchemaExtensions()`
2. `src/lib/tiptap/serialize.ts` — HTML and markdown
3. `ArticleBody` — **both** the JSON renderer and the legacy HTML branch, because the HTML
   branch is what published pages actually use
4. the `sanitizeHtml` allowlist — a block missing here does not error, it vanishes on publish
5. **round-trip stability** — `getHTML()` → parse → `getHTML()` must be byte-identical

## Things that are true and will save you a query

- **`npm run typecheck` is `tsc -b --force`.** A bare `tsc --noEmit` compiles **zero** files
  against this solution-style `tsconfig.json` and exits 0. It has already reported clean on a
  broken homepage once.
- **A JSX comment placed as a sibling of the root element inside `return (` is a syntax
  error** that has taken this site down twice. `{/* … */}` directly after `) : (` is the
  shape to watch.
- **Chromium in the sandbox cannot complete TLS to `*.supabase.co`.** Browser gates route
  Supabase through Node (`scratchpad/supabaseRoute.mjs`). TLS verification is never disabled.
- **One admin account exists**, the owner's. Any browser gate needs it, or a temporary
  identity created and deleted in the same session.
- **`fa-07-01` is the reference essay**: 21,946 characters, 81 `content_json` blocks (80
  rendered — one is an empty paragraph `ArticleBody` drops), 13 headings, md5
  `b36b8ba5e4593c80e3727f07006e7f15`. It is the only substantial published body; use it to
  measure reading-surface changes, and check the md5 afterwards.
- **The other 160 essays are placeholder stubs with real titles and no bodies.** They are the
  owner's to write. A design that looks good only with 3,000 words of text will look broken
  across most of the site.
