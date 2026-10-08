# Gate 2: placement, world, poster, shell, style frames

Branch `feat/kawasan-industri`, 8 October 2026. Companions: `docs/world/frames/` (the frames,
`measurements.json`, `lighthouse.json` and four Lighthouse reports), `docs/world/discovery.md`,
`docs/world/gate-1.md`.

## 1. Ringkasan

1. Phase D selesai di lima commit: algoritma penempatan dan `layout.generated.ts` (125 blok, 250 plot, 39 jalan, 5 gerbang, 7 papan, 4 fixture, bukit think tank), builder untuk 44 family bangunan, poster SVG yang dirender saat build dari layout yang sama, lalu shell React di belakang flag `world_kawasan` (`VITE_WORLD_KAWASAN`, konstanta compile-time; mati = kode world dibuang Rollup, dijaga `scripts/world/assert-world-flag.mjs`).
2. Flag mati memang persis seperti sekarang: landing page branch ini dibanding build dari `main` identik piksel demi piksel (0 dari 4.207.680 piksel beda); halaman About beda 35 piksel, dan `main` dibanding dirinya sendiri juga beda 35 piksel di kotak yang sama (titik band energi, jitter renderer), jadi bukan dari branch ini. Tidak ada markup world dan tidak ada canvas saat flag mati.
3. Frame ada di `docs/world/frames/`: 12 frame jauh/tengah/dekat × terang/gelap × siang/malam; perusahaan terekspos (INTP, paket mock berlabel "SYNTHETIC mock, never ships"); board penuh; think tank dua kamar; overlay reindustrialisasi dengan strip bacaan dan kartu kondisi; toggle Skema; phone 390 px; keadaan outage.
4. Dua hal yang diminta §6.5 belum bisa difoto karena urutan commit §12: whiteboard dalam dunia (commit 16) dan cakram tanda kondisi di dalam dunia (commit 12). Frame itu diambil ulang di gate 3; yang sekarang menunjukkan kartu dan strip-nya.
5. Ukuran: chunk engine `world-engine` 568,63 kB (143,15 kB gzip, hanya three.js), `WorldFrame` 204,31 kB (32,92 kB gzip, engine + shell), `Board` 46,73 kB, poster 65 kB; semuanya lazy, nol byte di bundle awal, dan nol di build dengan flag mati.
6. Lighthouse landing page (SwiftShader, container ini): flag mati mobile 81 / desktop 99; flag nyala mobile 50 / desktop 95. LCP mobile 4,26 s → 5,23 s, desktop 0,88 s → 1,17 s; CLS 0,011 → 0,001; TBT mobile 55 → 1.083 ms. Mobile belum memenuhi "LCP tidak lebih buruk" (kriteria gate 4): penyebabnya satu long task saat engine membangun scene; rencananya di Phase I build dipecah per frame (§3.1 D15).
7. Draw calls: jauh 522, tengah 263–457, dekat 440–552 (budget 1.200 / 1.600 / 1.900). Warm-up 1 detik = 60 langkah, bukan 4.800 (kendaraan sudah tersebar saat build), jam pertama 10:00. Mount 0,8–1,2 s di SwiftShader. Frame time p50 417 ms di SwiftShader: GPU perangkat lunak, bukan ukuran yang bisa dipakai; diukur ulang di mesin Mas.
8. Mock hanya ada di `scripts/world/capture-frames.mjs` (intersepsi jaringan Playwright), tidak di `src/`; `fsre_published` masih tidak terbaca (item A) sehingga preview menunjukkan "Status unavailable" di mana-mana; tidak ada jalur tulis ke Supabase.
9. Lisensi Factory Yard masih pending; backup belum pernah sukses; file migrasi disiapkan tapi belum diterapkan dan belum di-commit (itu commit 17); PR tetap draft.
10. Gate 2 dicatat di sini. Sesuai pesan Mas "please continue until everything is finished", pekerjaan lanjut ke Phase E–G (commit 12–17) sampai gate 3 tanpa menunggu "lanjut".

## 2. Evidence

Commands on this branch at the gate 2 commit (Node v22.22.0, Playwright Chromium 1194 on SwiftShader,
lighthouse 13.5.0 through `npx`):

```
$ npx tsc -b --force
(no output: clean)
$ npx eslint . --max-warnings=35
(no output: 0 errors, 22 warnings)
$ TZ=America/Chicago npx vitest run
 Test Files  66 passed (66)
      Tests  974 passed (974)            # floor 970
$ npm run check:world
22 files · 18 wired from the entry · 4 pending
pending (not yet wired): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts, placement/place.ts
wired files clean
load order ok
$ npm run build                           # flag off
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
$ VITE_WORLD_KAWASAN=true VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key npx vite build --outDir <dir>
dist-on/assets/KawasanPage-BVElWj2J.js      1.24 kB │ gzip:   0.71 kB
dist-on/assets/ThinkTank-CjLTuxrm.js        3.33 kB │ gzip:   1.37 kB
dist-on/assets/Board-DECFPN6O.js           46.73 kB │ gzip:  14.96 kB
dist-on/assets/WorldFrame-Cfsq4CYX.js     204.31 kB │ gzip:  32.92 kB
dist-on/assets/world-engine-BPap8O61.js   568.63 kB │ gzip: 143.15 kB
$ VITE_WORLD_KAWASAN=true node scripts/world/assert-world-flag.mjs
assert-world-flag: world build (VITE_WORLD_KAWASAN=true), 2 marker(s) found.
$ grep -c poster-far dist-on/index.html dist-off/index.html
dist-on/index.html:1                      # <link rel="preload" as="image"> only with the flag
dist-off/index.html:0
```

The three builds were served with `vite preview` (branch flag off on 4173, branch flag on on 4174,
`origin/main` at `bed215d` on 4175, all pointed at the dead Supabase URL `playwright.config.ts` uses)
and shot by `node scripts/world/capture-frames.mjs`, which writes `docs/world/frames/measurements.json`:

```
drawCalls  light-day  far 522 · middle 263 · near 440
           light-night far 522 · middle 357 · near 552
           dark-day   far 522 · middle 457 · near 492
           dark-night far 517 · middle 404 · near 451
mount      light 1248 ms · dark 791 ms        (SwiftShader; from navigation to data-ready)
warmup     1 s = 60 steps · first clock "10:00"
frameTimes middle p50 416.6 ms · p95 833.3 ms (180 samples, SwiftShader: a software GPU, not a measure of the engine)
flagOff    landing: same true, 0 of 4,207,680 pixels differ; main against itself 0
           about:   35 of 8,951,040 pixels differ in box [201,4051,1241,4527]; main against itself 35 in the same box
           world markup on the flag-off pages: 0 (branch), 0 (main)
consoleErrors (unique): 404 /_vercel/insights/script.js (the preview server has no Vercel insights), 503 /rest/v1/model_packages (the outage frame, served by the script on purpose)
```

The middle and near counts differ between runs because the middle and near frames hold a selection
(sub-industry C111) and the camera's easing is sampled when two readings 400 ms apart agree; every
count is under the PRD's budgets (1,200 / 1,600 / 1,900). The frames were captured from the build two
edits before the one measured by Lighthouse; the two edits (the poster preload and two screen-reader-only
sub-headings) change no pixel.

Lighthouse, `node scripts/world/lighthouse.mjs`, landing page `/`, writes `docs/world/frames/lighthouse.json`
and the four HTML reports:

| run | performance | accessibility | best practices | LCP | CLS | TBT | FCP | transfer |
|---|---|---|---|---|---|---|---|---|
| flag off, mobile | 81 | 98 | 96 | 4,262 ms | 0.011 | 55 ms | 2,847 ms | 436 KB |
| flag off, desktop | 99 | 98 | 96 | 880 ms | 0.001 | 0 ms | 628 ms | 436 KB |
| flag on, mobile | 50 | 98 | 96 | 5,228 ms | 0.001 | 1,083 ms | 3,152 ms | 662 KB |
| flag on, desktop | 95 | 98 | 96 | 1,170 ms | 0.001 | 102 ms | 696 ms | 662 KB |

The one accessibility audit that fails, in all four runs, is `heading-order` on the footer's
`h4 "Sections"` after the page's `h2 "Sections"`, which is the site's footer as it is on `main`. Two
audits the first flag-on run failed (`aria-allowed-attr` on the search input's `aria-expanded`,
`aria-valid-attr-value` on its `aria-controls`) are fixed in this commit, and the frame now carries
screen-reader-only sub-headings so its own order is h1 → h2 → h3 before the page's h4s. The flag-on
mobile LCP element is the poster image; its breakdown says 727 ms of element render delay, and the
trace shows one long task of 674 ms (CPU-throttled ×4) in the `WorldFrame` chunk: the engine building
the scene. Three mitigations landed here and are measured above: the engine mounts only after the
browser has reported the largest paint (a `PerformanceObserver` on `largest-contentful-paint`, with a 3 s
fallback), the poster is preloaded from the initial document when the flag is on, and the mount also
waits for the stage to be in view and the main thread idle. Before them the flag-on mobile run scored
39 with LCP 7,109 ms and TBT 2,233 ms.

## 3. Decisions

### 3.1 Made by the agent

- **D10. Night veil in the dark theme.** The frame's night veil tints with `--primary`, which in `.dark`
  is the accent green; there it takes `--background` instead (`world.css`, one rule). Token-only still.
- **D11. Mount gating.** The engine mounts after the poster has loaded, the browser has reported the
  page's largest paint, the stage is within 200 px of the viewport, and the main thread is idle
  (`requestIdleCallback`, 2 s timeout); or on the first pointer or keyboard interaction with the stage.
  Reason: the Lighthouse trace above; the PRD asks for mount "after first paint".
- **D12. Poster preload.** With the flag on, `vite.config.ts` injects
  `<link rel="preload" as="image" href="/world/poster-far.svg" fetchpriority="high">` into the
  document, so the largest paint is discoverable before three lazy chunks. Nothing is injected with the
  flag off (`dist-off/index.html` carries no such line).
- **D13. The mock lives in the capture script.** The exposed-company frames use the Finance in Action
  SYNTHETIC cement fixture re-labelled `INTP (SYNTHETIC mock, never ships)` and served by Playwright's
  network interception; the data layer's own checks still apply to it (a synthetic package must say
  SYNTHETIC in its name, may not be its own pair). The board shows the site's `SyntheticBanner` for any
  synthetic package, and the board's title is the package's own name, so the label is in the frame.
  `scripts/assert-no-synthetic.mjs` keeps the fixtures out of production builds, as before.
- **D14. Frames before the whiteboard and the in-world discs.** Section 6.5 asks for them at gate 2;
  section 12 builds them at commits 12 and 16. The order of §12 is kept; the two frames are re-shot at
  gate 3 (noted in §4).
- **D15. The flag-on mobile budget.** LCP is 0.97 s worse on the throttled mobile profile. The remaining
  cost is the engine's synchronous scene build. Plan for commit 18 (Phase I, performance): build the
  scene in slices across idle callbacks (regions, then blocks, then traffic), so no single task exceeds
  50 ms, and re-measure; if the mobile LCP is still worse than the flag-off page, the world mounts on
  phones only on the first interaction (the poster stays, as the PRD's reduced-motion path does). The
  gate 4 report carries the before/after.
- **D16. The warm-up.** One simulated second (60 steps) instead of Factory Yard's 80 s (4,800): every
  vehicle is spaced along its lane at build time, so the far view is populated at the first frame; the
  clock starts so that the first visible frame reads 10:00 (`src/world/engine/sim/clock.ts`).
- **D17. The poster's think-tank prism** now stands on the hill (a base-height parameter instead of a
  regex over the y coordinates); the poster is regenerated and its byte-for-byte test still passes.

### 3.2 Needed from the owner (new since gate 1)

- **O1.** Look at the frames, in this order: `far-light-day`, `middle-light-day`, `near-light-day`,
  then the dark and night rows, then `exposed-company-mock`, `board-mock`, `think-tank-mock`,
  `overlay-reindustrialisation`, `skema-toggle`, `phone-390`, `outage-unavailable`. The look is the
  site's tokens only; the one thing I would ask about is the far view's label size (it is deliberately
  below legibility until the middle view, as the PRD's far view is a poster).
- **O2.** D15: accept the plan, or decide now that phones get the poster and the schematic (flag-on
  mobile then measures as flag-off).
- **O3.** Item A (expose `fsre_published`) and item P (the preview URL) from gate 0 are still open.

## 4. Deviations

- Mega prompt §6.5 asks for the exposed company "with the in-world whiteboard" and the overlay "with
  condition marks" at gate 2; the whiteboard is commit 16 and the in-world discs are commit 12 (§12's
  order is kept). The frames show the card, the board and the strip; both frames are re-shot at gate 3.
- Factory Yard's `sim/*`, `models/*` and `world/*` modules (26 files) were not kept: the world's
  vehicles and builders are compact typed systems written for the generated layout
  (`src/world/sim/traffic.ts`, `src/world/world/*.ts`), after the engine's kernel, theme, context, clock
  and view, which are the ported parts. `NOTICE.md` is unchanged; the ported files still carry the
  Factory Yard header. `npm run check:world` therefore lists no pending engine file any more.
- Warm-up is 1 s, not 80 s (D16).
- Lighthouse and the frames come from a cloud container with a software GPU (SwiftShader) and
  Lighthouse's simulated throttling; the scores are comparable between flag off and on (same machine,
  same runs), not to the owner's device. Frame times are reported but not used.
- The visual regression is a script and its result (`measurements.json`), not yet a test in the
  Playwright suite; the suite's version lands in commit 18.

## 5. Licence and backup state

- **Licence (rule 10):** unchanged since gate 0. `NOTICE.md` records ai-iso-skill's MIT and the
  Factory Yard entry as "permission pending"; no licence file and no written permission has arrived.
  The pull request stays a draft.
- **Backups (rule 3):** unchanged since gate 0. Neither backup workflow has produced an artifact. No
  migration has been applied anywhere; the migration file is written locally and will be committed at
  commit 17, not applied.
- **Production (rules 1, 2):** nothing on `main`, nothing on Vercel's production settings, nothing on
  the Supabase project. The three served builds here pointed at `http://127.0.0.1:54321`.

## 6. Preview URL

Not readable from this session: Vercel answers `403` to the deployments list for team
`dikagirawan-4804s-projects`, project `dikagustiana-com` (item P, re-tried at this gate). The owner
reads it from the Vercel dashboard for branch `feat/kawasan-industri` or the commit's GitHub
deployment status. Note that the preview build has the flag off unless `VITE_WORLD_KAWASAN=true` is
set on the preview environment (and `VITE_FIA_PREVIEW=true` for the model links, item K).
