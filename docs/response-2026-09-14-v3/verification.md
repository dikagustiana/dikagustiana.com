# Verification record

Version 3 · 14 September 2026. Three kinds of evidence are kept apart throughout:
**screenshots** establish appearance, **interaction checks** establish behaviour,
and **nothing here establishes comprehension** — no unfamiliar reader has used
any of it.

## Environment

| | |
| --- | --- |
| Build under test | `vite build` of this branch, served by `vite preview` at `http://127.0.0.1:4173` |
| Backend | none. `VITE_SUPABASE_URL=http://127.0.0.1:54321`; every `rest/v1`, `auth/v1` and `storage/v1` request intercepted and answered locally. **No production backend was contacted.** |
| Content | three published essay rows seeded in the interceptor so the reading path resolves its destinations. **A labelled local fixture, not production content.** |
| Browser | Chromium via Playwright, Linux, headless |
| Motion | `reducedMotion: 'reduce'` for measurement runs, so a value is never read mid-transition. Behaviour under the default (animated) setting was exercised separately and is polled rather than assumed. |
| Date | 14 September 2026 |

**Not exercised, and not claimed:** a physical phone or tablet, a real
touchscreen, a screen reader, a non-Chromium engine, an authenticated admin
surface, and production. The narrow layout is an emulated viewport.

## The journeys the audit asked for

| Journey | Result |
| --- | --- |
| **The first meaningful exploration** | `/` at 1280 and 1348 → "Explore the power decision" → the full chain at Finance + Green transition with the Energy reading open, `[data-basis="assessed"]`, `[data-mechanism="contract"]`, the linked essay, and the written trade-off beneath the map. **Pass.** |
| **Both distances on the same target** | Wide: the reading stays open and re-reads. Narrow (360, 390): Economy → Finance → Economy inside the sheet, the target never closes, the text changes and returns exactly, one `data-voice` value at a time. **Pass.** |
| **Return / collapse** | Two exits once open — beside the controls and under the map, both `aria-expanded="true"`, both returning the short plate, both dropping the shift and the reading and keeping the distance and the layer switches. **Pass.** |
| **Fresh-tab sharing** | `/?distance=finance&lens=green&node=energy` copied into a **fresh page load** restores element, distance and scenario, and brings the figure into view. A plain `/` visit stays compact with no query. `?distance=economy` stays compact. `?lens=reindustrialisation&node=recovery` opens the overlay, refuses the element, cleans the parameter. **Pass.** |
| **Panel / header clearance** | At 1348×936, figure top at 0, −8, −100, −300, −600: heading and Close clear of the sticky header and inside the viewport wherever the figure has room; popover always inside the figure; title and Close pinned while the body scrolls; Escape closes. **Pass.** |
| **Responsive scale** | See the tables below. **Pass, with one measured exception recorded.** |
| **Home → a completed essay** | The reading path's first step resolves to a real route and is a link; steps 2 and 3 likewise; steps 4 and 5 are marked "Not written" and are not links. **Pass** (against the local fixture — see the note on content above). |

## Viewports actually inspected

Layout and horizontal overflow, `/` and `/about`, with the map expanded where it
has a control to expand it:

| viewport | layout | horizontal scroll |
| --- | --- | --- |
| 360 | column | no |
| 390 | column | no |
| 768 | column | no |
| 1024 | column | no |
| 1279 | column | no |
| 1280 | wide plate | no |
| 1440 | wide plate | no |

`/green-transition` was checked at the same seven widths: no horizontal scroll;
it does not carry the map.

## Rendered scale and target geometry

At the 1280px breakpoint the figure is 1216px wide against a 1717-unit viewBox,
so one unit is 0.7082 screen pixels. At 1440 the figure is 1336px and one unit is
0.7781px. These are measured, not derived from the font declarations.

| Door | 1280, before | 1280, after | 1440, after |
| --- | --- | --- | --- |
| joint diamond | 25.5px | 25.5px | 28.0px |
| joint chip | 12.7px | **24.1px** | 26.5px |
| layer switch | 8.5px | **24.1px** | 26.5px |
| numbered mark | 15.6px | **24.1px** | 26.5px |
| layer band | 18.4px | 18.4px | 20.2px |

42 targets measured under each scenario at each width; **no two overlap**,
compared as shapes rather than bounding boxes.

Label ink, measured: a 14-unit label is 9.9px at 1280 and 10.9px at 1440; an
18-unit label 12.7px and 14.0px. The type is **not** fixed by this pass and the
reason is a measurement, not a judgement: raising `T_SMALL` from 14 to 16 grew
the viewBox from 1717 to 1789, returning +1.0px net while shrinking every target
and every stage label by 4.2%.

## Enlarged text

Root font raised from 16px to 20, 24 and 28px — a reader's own default, not
browser zoom.

| | |
| --- | --- |
| Wide reading at 24px / 1348×936 | popover 452→928 under a 97px header; heading 505→542; Close 483→521; body scrolls. **Pass.** |
| Narrow sheet at 24px / 390×844 | sheet 127→844; its Close 152→196 (44px); distance row pinned at 128→248; no horizontal overflow. **Pass.** |
| Header at 16 / 20 / 24px, widths 1024–1440 | no horizontal scroll; no clipped label. **Pass.** |
| **360px at a 28px root font** | document 368px against a 360px viewport — a 8px overflow, from single long words (a hero headline, an email address, a chip label) exceeding their boxes. **Present at the baseline, several different causes, not introduced here, not fixed here.** |

## Keyboard and focus

| Check | Result |
| --- | --- |
| Reach the first reading from the top of `/` with Tab alone | 26 stops to "Explore the power decision"; Enter opens the reading and focus lands on its heading inside the panel. |
| Escape from a reading opened by the labelled entrance | Focus returns to the figure — the button that opened it no longer exists, the map having replaced it. |
| Escape from a reading opened by a joint's **text chip** | **Was `<body>`. Now `.cp-hit[data-id="…"]`, a labelled `role="button"`.** |
| Keyboard focus on a joint stepped back by Finance isolation | effective opacity 1 (was 0.1) |
| Keyboard focus on a switched-off layer | effective opacity 1 (was 0.18) |
| Escape from the narrow sheet | Dismisses, and returns focus to the row that opened it. |

## Document hierarchy on the landing page

Measured in a 1348×936 document client area:

| | before | after |
| --- | --- | --- |
| `#the-argument` | 585px | 585px |
| `#industry-chain` | 2452px | **1783px** |
| the map's figure | 2820px | **2330px** |
| document height | 4478px | 3987px |

At 390px wide: `#industry-chain` 4032px → **2579px**; document 7359px → 6198px.

No claim is made that any of these is a threshold. They are two measurements of
the same page in the same browser at the same size.

## Public origins

By HTTP request, 14 September 2026, 09:26 UTC — see `response-to-audit.md` §U10
for the table. **Neither origin could be rendered in a browser from this
session**: every tunnel to both hosts closed mid-exchange after six seconds, the
session's own proxy recording `ws_closed_mid_exchange` for
`www.dikagustiana.com:443` and `dikagustiana.com:443` alike. The audit's blank
apex render is therefore neither confirmed nor refuted here.

## Automated suites

| | before | after |
| --- | --- | --- |
| Unit (vitest) | 519 in 37 files | **529 in 38 files** |
| End-to-end (Playwright, Chromium) | 46 | **63** |
| Typecheck | clean | clean |
| Lint | 0 errors, 26 warnings | 0 errors, 26 warnings (all pre-existing) |
| Generated files | — | regenerated through `npm run build:chain`; the generator was changed, never its output |

**One failure this pass introduced and CI caught, recorded rather than quietly
fixed.** `prefersReducedMotion()` checked that `window` exists but not that
`window.matchMedia` does — jsdom has no such function, and neither do some
embedded browsers. The first caller to reach it from inside a
`requestAnimationFrame` (this pass's scroll-into-view) therefore threw
`window.matchMedia is not a function` *after* the test that scheduled it had
already passed, so vitest reported an unhandled error and a non-zero exit while
every test still read green. The local check that missed it grepped the output
for failures instead of reading the exit code; the CI job did not. `motion.ts`
now guards the function as `useMediaQuery` always has, `scrollIntoView` is called
optionally because jsdom does not implement it either, and four tests in
`tests/unit/motion.test.ts` pin both the absent-matchMedia path and the reading
of the query. All five CI steps — eslint at its warning ceiling, typecheck,
vitest under `TZ=America/Chicago` with the JSON reporter, the count floor, and
the build — were then run locally as CI runs them, each exit code checked.

**Baseline failures: none.** Four tests pinned behaviour this pass deliberately
changed — three unit and one end-to-end, covering the control coupling and the
single exit. Each is rewritten to pin the new contract with the reason written
above it; none was deleted and none was weakened. The test-count floor in
`scripts/assert-test-count.mjs` is raised from 515 to 521 in the same commit that
adds the tests.

New coverage added for failure paths this pass established: the shared-reading
URL contract in both directions, the separated control contracts, the labelled
entrance landing on an assessed reading, the two exits, target size and
non-overlap measured in a real browser, the popover's clearance of the sticky
header at five scroll positions, the chip focus-return path, the two fades under
keyboard focus, the layer-restore control, and twelve header-capacity cases
across three font sizes and four widths.

## Screenshots

All in the site's own navy theme, Chromium, 14 September 2026.

| File | What it shows |
| --- | --- |
| `before-u08-overlap.png` | The reading's Close and heading behind the sticky header. |
| `after-wide-reading.png` | The same reading, head clear, body scrolling, inside the figure. |
| `before-nav-1024.png` | "The Green Transition" over three lines and "The Next Big Thing" clipped mid-word. |
| `after-nav-1024.png` | The drawer at the same width. |
| `after-nav-1348-24px.png` | Seven labels over two rows at a 24px root font, nothing truncated. |
| `after-home-compact-map.png` | The short plate's question, relation, caution and labelled action. |
| `after-pilot-open.png` | One click later: the assessed Energy reading, and the written trade-off beneath the map. |
| `after-home-argument.png` | The ranked reading path: one necessary reading, then the methods. |
| `after-narrow-sheet.png` | The distance control inside the narrow reading. |
| `after-u07-isolated.png` | Isolation, a switched-off layer, and the names still readable. |
| `after-about-map.png` | The full plate at 1440 with the wider reading lane. |
