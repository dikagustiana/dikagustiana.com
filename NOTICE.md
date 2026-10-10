# NOTICE

Third-party code and the terms it enters this repository under. Rule 10 of
`docs/world/MEGA-PROMPT-kawasan-industri.md`: the Factory Yard engine code may
be merged only once this file records either its licence or the author's
written permission for use on a public site. On this branch there is no
Factory Yard code left to merge (below).

## Factory Yard

- Source: https://github.com/Khalidabdi1/factory at commit
  `148758ae19a9b2201245485bf3619ab5e742f8f4` (7 October 2026).
- Licence: **none on record.** The repository carries no `LICENSE` file at
  that commit, and `package.json` declares no `license`. Permission for use
  on a public site: **pending.**
- **On the branch `claude/world-engine-fallback`, no Factory Yard code
  remains.** The nine files that were adapted from it (their first comment
  line read "Adapted from Factory Yard (github.com/Khalidabdi1/factory,
  commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce)") are
  replaced by implementations original to this repository:
  - `src/world/engine/theme.ts`
  - `src/world/engine/context.ts`
  - `src/world/engine/world/ground.ts`
  - `src/world/engine/kernel/path.ts`
  - `src/world/engine/kernel/iso.ts`
  - `src/world/engine/kernel/math.ts`
  - `src/world/engine/kernel/part.ts`
  - `src/world/engine/sim/clock.ts`
  - `src/world/engine/view/index.ts`
- How the replacements were written: the required API was taken from the
  callers only (every import of these modules across `src/`, `tests/` and
  `scripts/`, and the declared signatures), and the bodies were written
  fresh from that contract, the three.js documentation, general isometric
  geometry and ai-iso-skill (below). No body, comment, constant table or
  structure of the Factory Yard files was copied or paraphrased. The
  random generator is mulberry32 (Tommy Ettinger, public domain), the
  algorithm the placement already relied on, so the committed layout is
  unchanged.
- `scripts/world/check-engine.mjs`, which had been written after Factory
  Yard's `scripts/check-yard.mjs`, is rewritten as well, with the same
  checks and one more: it fails if any file under `src/` carries Factory
  Yard's adaptation header or a link to its repository. A unit test
  (`tests/unit/worldEngineRules.test.ts`) holds the same rule.
- Comments in `src/world/interiors/base.ts` and `src/world/engine/types.ts`
  still name Factory Yard as the source of an idea ("after …", "… kept");
  those files were not among the files taken. (`src/world/sim/traffic.ts`,
  which did too, was removed in Kawasan v2 phase B, replaced by
  `src/world/sim/flows.ts` and `roads.ts`, written fresh.)
- With this branch merged, rule 10 of
  `docs/world/MEGA-PROMPT-kawasan-industri.md` no longer depends on the
  author's answer: the world ships without Factory Yard code. If a licence
  or the author's written permission arrives, record it here with its date
  and channel.

## Kawasan v2 (October 2026)

- Nothing new was taken from a third party in Kawasan v2 (phases A to E,
  `docs/world/v2/`). The road graph and its routing (`sim/roads.ts`), the
  flows (`sim/flows.ts`), the vehicles (`sim/vehicles.ts`), the activity and
  the lamps (`sim/activity.ts`), the chain on the roads (`engine/chain.ts`)
  and Follow (`engine/follow.ts`) are original to this repository. The
  travelling dashes use three.js's own `LineMaterial` (`dashOffset`), under
  the three.js licence below.
- ai-iso-skill's ideas were not used again beyond what is recorded below:
  the new models are drawn through the existing `Part` kernel, whose face
  plane is the one ai-iso-skill describes.
- Lighthouse (`lighthouse@13.5.0`, Apache-2.0) is run through `npx` by
  `scripts/world/lighthouse.mjs` to measure the page; it is not a dependency
  and nothing of it ships.

## ai-iso-skill

- Source: https://github.com/MrBongoC/ai-iso-skill (commit
  `44b4da7714148eef547cc1b102e433472dfe3531`, 4 October 2026).
- What is used: the face-plane kernel (a face as an origin and two in-plane
  axes, with TOP, FRONT and SIDE taking the face's top-left corner, +x
  down-right, +y down-left, +z up), "a box is its three visible faces", and
  the monochrome vocabulary (body and deck fills, structure and detail
  lines, one live colour). The files that use it say so in their first
  line: `src/world/engine/kernel/iso.ts`, `src/world/engine/kernel/part.ts`
  and `src/world/engine/theme.ts`.
- Licence: MIT, reproduced in full:

```
MIT License

Copyright (c) 2026 Tolga Cohce

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## three.js

- Package: `three@0.186.1` (https://threejs.org), a runtime dependency added
  for the world's renderer.
- Licence: MIT, reproduced in full:

```
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
