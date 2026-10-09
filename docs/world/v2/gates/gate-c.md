# Gate C: activity and night

Branch `world-v2/c-activity` from `main` at `ee0c49f` (phase B merged), 9 October 2026. PRD v2 §3.7, §3.8,
§3.12, Appendix C, §7 C1–C3; mega prompt §5, tasks 1–4. Gate mode: continue.

## 1. Ringkasan

1. **Setiap keluarga bangunan punya aktivitas** (`FAMILY_ACTIVITY`, 44 keluarga): asap/uap dari cerobong yang
   benar-benar digambar, ekskavator dan truk angkut di tambang, pumpjack mengangguk, flare berkedip, konveyor,
   forklift di dok, riak kolam, harvester, perahu, truk kayu, crane dermaga, pesawat taxi dan lepas landas, mobil
   di overpass, crane menara berputar, hoist naik-turun, beacon berkedip, pejalan kaki di pintu (band street).
2. Builder tiap keluarga kini mengembalikan **titik jangkar** (cerobong, pintu, dok, crane…), jadi aktivitas berdiri
   tepat di bentuk yang digambar.
3. Semua **ter-instance**: 32 jenis aktivitas, ribuan instance, ±664 lampu, ±28 draw call tambahan di hero
   (anggaran aktivitas 60; hero 188 → 216, anggaran 900). Di ponsel asap dan uap dimatikan (PRD §3.14).
4. Aktivitas **berhenti bersama jam dunia** dan **berulang sama dengan seed** (diuji).
5. **Malam untuk semua**: pukul 20:00 jendela setiap bangunan menyala hangat-redup, perusahaan yang dipublikasikan
   lebih terang dalam warna aksen, lampu dan genangan cahayanya di sepanjang setiap jalan dan di depan setiap
   blok (125 dari 125 blok), kiln dan flare berpijar, kapal dan crane berlampu. Hari = **enam menit** dari 10:00.
6. Agar cahaya terbaca, engine menggelapkan permukaan tak bercahaya sendiri; veil shell dikurangi 0,55 → 0,25.
7. **Palang jembatan timbang** kini terangkat saat ada kendaraan di gerbang (tertunda dari fase B).
8. Layer energi: jalur listrik dari pylon PLTU ke gardu tiap wilayah lalu ke **setiap blok (125 dari 125)**,
   dengan pulsa berjalan; layer cold-chain: cold store diberi tint; pita bursa menyala di malam hari.
9. Probe hero: **181 dari 208** kendaraan bergerak, **3,8 px/s**, draw call 216. Build flag-off **identik byte
   demi byte** dengan `main` (210 berkas, termasuk poster).
10. 37 keluarga yang ada di dunia punya frame masing-masing; 7 keluarga tidak dipakai oleh blok mana pun
    (O-V2-9).

## 2. Evidence

### 2.1 The probe, before and after

`node scripts/world/probe.mjs <url> --out …` on a flag-on build, Chromium 1440 × 900, SwiftShader; before: gate B
(`docs/world/frames/v2/gate-b/probe.json`), after: this branch (`gate-c/probe.json`, `probe-phone.json`). From this
gate the probe measures the trucks' speed over two seconds (it was one): SwiftShader draws about two frames a
second, so one slow frame halved a one-second reading (the hero read 2.6, 4.1, 4.6 and 6.0 px/s on four one-second
runs of one build).

| view | moving on screen: B → **C** | truck px/s: B → **C** | draw calls: B → **C** | click at INTP |
|---|---|---|---|---|
| home (hero) | 177 of 208 → **181 of 208** | 3.6 → **3.8** | 188 → **216** | **company** |
| whole (map) | 255 of 280 → **242 of 284** | 3.2 → **2.7** | 217 → **249** | **company** |
| estate | 198 of 200 → **194 of 199** | 5.7 → **3.2** | 157 → **184** | **company** |
| street (6 px/m) | 33 of 34 → **32 of 32** | 12.2 → **24.4** | 92 → **120** | **company** |
| inside (12 px/m) | 9 of 9 → **8 of 8** | 51.4 → **53.4** | 86 → **114** | **company** |
| phone home | 42 of 45 → **41 of 44** | 4.7 → **5.6** | 98 → **124** | **company** |

The probe ran again after the review's fixes (§4.1, 10–13); the two-second reading still swings by about a pixel a
second between runs of one build on SwiftShader (the first run of this branch read 4.4 at the hero).

Every goods vehicle still reports its origin, destination and load (284 of 284 at the hero); trucks 18.8 px.

The activity in the world (`window.world.activity().counts`): smoke 98 stacks, steam 4, dust 5, compressor 4,
plume 4; forklifts 106, walkers at 129 doors, conveyors 22, kilns 16, pumpjacks 12, beacons 6, ripples 8,
aerators 3, excavators 5, haul loops 5, quay cranes 4, planes 2, straddle carriers 2, loaders 2, overpass lanes 2,
parking 2, ambulances 2, exchange bands 2, tower cranes 2, hoists 2, log trucks 2, harvester 1, boat 1, shunter 1;
5 weighbridge booms; 664 lamps; 125 of 125 blocks lit after dark; the energy line feeds 125 of 125 blocks.

### 2.2 Tests and checks

```
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest.json && node scripts/assert-test-count.mjs vitest.json
assert-test-count: 1133 tests, 0 failed, 0 failed suite(s) (floor 1129)    # before: 1119; floor was 1115
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ npm run check:world
wired files clean · load order ok · no Factory Yard code in src/
$ npm run typecheck        (clean)
$ npm run test:e2e:world
11 passed                    # 10 before; one new: night at 20:00 and every family's activity by day
```

New unit tests (14, `tests/unit/worldActivity.test.ts`): every family has an activity entry of kinds the activity
draws (a test over `FAMILY_ACTIVITY` against `BUILDING_FAMILIES`); every family's builder returns the anchors its
activity stands on, at the sizes it is drawn at, inside its box; every kind of each family that stands in the world
is shown; the activity and lamps within their draw-call budget at the district band, instanced (instances ≥ 30 ×
calls); paused with the clock; replayed with the seed; the doors' walkers at the street band only, the energy
layer's line and pulses, the cold-chain layer's tint; the energy line from the power plant to every block, its
pulses posed when the layer is shown, even paused; the vehicles' scale carried once (a forklift and a car at 1.25 ×
their metric length); no smoke or steam on a phone, the lamps kept; the weighbridges' booms up and down; a
six-minute day from 10:00; at 20:00 every zone's windows warm, the published brighter, lamps on, pools shown, 125 of
125 blocks lit; the exchange's band lit in the accent after dark.

Rewritten: the chain test's translucency count skips what is translucent by design, a lamp's pool of light and
the cold-chain tint (PRD v2 §3.8, §3.12), as it already skipped the cast shadow. The debug API's `tick(dt)` now
runs an exact dt (it read it back from the clock, and floating point sometimes ran one step fewer), so a seed and
a number of frames always give the same world. None of the protected tests was relaxed.

### 2.3 The flag-off build and the chunks

```
$ npx vite build --outDir dist-off-main   (main at ee0c49f, flag off) → 210 files
$ npx vite build --outDir dist-off-c      (branch, flag off)          → 210 files
$ diff <(sha256 of every file in main) <(sha256 of every file on the branch)    (no difference)
$ node scripts/world/assert-world-flag.mjs
assert-world-flag: no world code in dist/ (flag off).
```

Flag-on chunks (bytes, gzip −9), `main` at `ee0c49f` → C: `world-scene` 106,347 / 41,340 → 126,835 / 48,502 (budget
120 kB gzipped); `WorldFrame` 266,501 / 44,119 → 266,501 / 44,118; `layout.generated` and the three.js chunks
unchanged. (Gate B's `WorldFrame` figure, 241,030, was its branch's before `main` moved; `main`'s own build is the
baseline here.)

## 3. Frames

`docs/world/frames/v2/`:

- `gate-c-night.png` — the hero at 20:00: windows warm, lamps and their pools along every road, the kilns' glow.
- `gate-c-night-street.png` — the street band at 20:00 over INTP: lit windows, lamp heads and pools, kilns, smoke.
- `gate-c-day-street.png` — the street band by day over INTP: stack smoke, forklifts, conveyors, walkers at doors.
- `gate-c-boom.png` — the east gate at the street band: the boom up over a truck on the weighbridge.
- (All frames re-shot after the review's fixes.)
- `families/<family>.png` — one frame per family that stands in the world (37), at 3.5 px/m by day, centred on one
  of its sites: the activity Appendix C lists for it.
- `gate-c/probe-*.png` — the probe's frames.

## 4. Decisions

### 4.1 Made by the agent

1. **Builders return their anchors** (`Drawn.act`), so an activity stands on what was drawn (a stack's top, a
   building's door, a dock's front) rather than on a guess from the box.
2. **One InstancedMesh per model**; statics (lamps, pools, pump frames, kilns) are posed once and only what moves
   re-uploads each frame. The activity's time advances with the simulation's steps and is posed once a frame.
3. **The engine darkens the world at night** (every unlit fill, the solids' material and the lines sink toward the
   primary token, `NIGHT_SINK` 0.6), and the shell's veil drops from 0.55 to 0.25; with the veil alone over
   everything, nothing could look lit. "The veil as today" is kept as the veil's colour and its ramp.
4. **Every building's windows** light warm and dim in a new `dim` fill; the published company's in the accent,
   lightened (lightness ≥ 0.86) so it reads brighter.
5. **A lamp at every form's front** as well as along every road (one every 44 m, alternating sides), so the
   windowless families (well pads, depots, scrap yards) are lit after dark too.
6. **The day is six minutes** (PRD v2 §3.8); it was eight.
7. **The boom** lifts while any vehicle is within 16 m of the gate.
8. Puffs are low balls (icosahedra), shrinking as they rise instead of fading (instances share one opaque
   material).
9. The probe's speed window is two seconds (§2.1).
10. **The energy line** runs from the power plant's last pylon to a substation at each region's label anchor and
    from there to every block's kerb anchor: one line per block, pulses every 18 m. A hidden layer's pulses are not
    posed; showing the layer poses them on the next frame, even paused. (Review finding on the pull request.)
11. **Phones draw no puffs** (smoke, steam, dust, vents, the plume): PRD v2 §3.14. (Review finding.)
12. **The vehicles' scale is carried by the instances only**; the activity's models were scaled in their geometry
    as well, so they stood at 1.5625 ×. (Review finding.)
13. **The exchange's band** draws with its own glow material, light by day and lit in the accent after dark, above
    the darkened world (PRD v2 §3.8). (Review finding.)

### 4.2 Needed from the owner

- **O-V2-8.** Night darkens the engine itself and the veil only finishes it (0.25). Keep, or prefer a darker veil
  with dimmer lights?
- **O-V2-9.** Seven families have no block in the layout (quarry, field, market-hall, minimarket, clinic,
  scrap-yard, compost-site): their activity is defined and unit-tested on their builders, but nothing in the
  world shows it. Keep the families for later sub-industries, or retire them from the list?

## 5. Deviations

- **"A frame per family"**: 37 frames, one per family that stands in the world; the seven families no block uses
  have no frame (O-V2-9).
- **Smoke fades by shrinking**, not by transparency, so all puffs stay one opaque instanced draw.
- **The veil** is lighter (decision 3).

## 6. The pull request

https://github.com/dikagustiana/dikagustiana.com/pull/56
