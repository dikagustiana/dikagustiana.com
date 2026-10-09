# Gate A: scale, pointing, companies

Branch `world-v2/a-scale` from `main` at `48eb458`, 9 October 2026. PRD v2 §3.1–§3.5, §3.11, §4.1 (`does`),
§5, §7 A1–A6; mega prompt §3, tasks 1–12. Gate mode: continue.

## 1. Ringkasan

1. Dunia dipadatkan dari 2.270 × 1.090 m menjadi **1.493 × 776 m** konten (+80 m slab di tiap sisi); ring road
   50 m di luar estate, busur geologi/biologi 20 m di luar ring road, gateway menempel gerbang timur, kota 50 m
   di timur gateway.
2. Tampilan awal sekarang **hero**: **1,25 px/m** (sebelumnya 0,42), blok 40 m = **71 px** (sebelumnya 24 px).
   `Whole` jadi peta di **0,77–0,84 px/m**; ponsel 390 px dibuka di **1,0 px/m**. Tombol `H` kembali ke hero.
3. **Perusahaan = bangunan**: tiap blok punya dua lot (≥ 18 × 24 m) yang digambar dengan bentuk keluarganya
   sendiri, papan blok di tengah depan, rambu tepi jalan dengan ticker, bar status per lot; keluarga besar
   (tambang, dermaga, apron, dst.) memakai unit kantor 10 × 8 m.
4. Probe: **klik di anchor INTP memilih INTP** di hero, Whole, estate, street (6 px/m) dan inside (12 px/m),
   desktop dan ponsel. Sebelumnya selalu memilih gedung B121.
5. **Hover**: label di langit (`INTP · Indocement Tunggal Prakarsa Tbk`, nama sub-industri, joint gerbang), garis
   tepi, kursor pointer; engine menemukan objeknya dalam **≤ 16 ms**. Long-press di layar sentuh.
6. Keyboard: `[` `]` per perusahaan (196, urutan registry), `Shift+[` `]` per blok (125), `Enter` membuka kartu.
7. Kartu perusahaan v2 tanpa model: apa yang dikerjakan, status listing + alasan, pemasok/pelanggan sebagai
   tombol, "What a model would show"; "expected, not measured" hanya sekali per kartu. Tanpa angka.
8. Kolom `does` untuk **196 perusahaan** — draf agen, **57 ditandai perlu dicek**: mohon tinjau
   `docs/world/v2/review-does.md`.
9. Poster = bingkai hero (20,3 KB, batas 24 KiB). Build flag-off identik dengan `main` kecuali `poster-far.svg`.
10. Belum dikerjakan di A (sesuai urutan): arti pergerakan kendaraan (B), aktivitas & malam (C), rantai bergerak
    dan label garis rantai lama (D), Lighthouse (E).

## 2. Evidence

### 2.1 The probe, before and after

`node scripts/world/probe.mjs <url> --out …` on a flag-on build (`VITE_WORLD_KAWASAN=true VITE_FIA_PREVIEW=true`,
dead Supabase URL), Chromium 1440 × 900, stage 1,246 × 700, SwiftShader. Before: `main` at `48eb458`
(`docs/world/frames/v2/baseline/probe.json`; it matches the committed 9 October baseline,
`docs/world/frames/v1-probe/probe.json`, within noise). After: this branch at `c03acdc`
(`docs/world/frames/v2/gate-a/probe.json`, `probe-phone.json`).

| view | px/m before | px/m after | 40 m block before → after | vehicles on screen and moving | draw calls before → after | hover | click at INTP's anchor before → after |
|---|---|---|---|---|---|---|---|
| home | 0.42 | **1.25** (hero) | 24 → **71 px** | 47 of 47 → 27 of 27 | 317 → 236 | pointer, label, pick 9.8 ms | building → **company** |
| whole (map) | (was home) | **0.84** | → 47 px | → 41 of 41 | → 283 | pointer, pick 4.5 ms | → **company** |
| estate | 1.33 | 1.34 | 75 → 76 px | 24 of 24 → 25 of 25 | 682 → 206 | pick 3.2 ms | nothing → **company** |
| street (6 px/m) | — | 6 | → 339 px | → 4 of 4 | → 91 | pick 3.3 ms | → **company** |
| inside (12 px/m) | 14.84 (near) | 12 | 839 → 679 px | 0 of 0 | 95 → 80 | pick 2.6 ms | building → **company** |
| phone home (390 px) | — | **1.00** | → 57 px | 11 of 11 | 116 | pick 14.9 ms | → **company** |

The traffic is still v1's (phase B replaces it); its numbers here are not phase A's measure. The hover label in
every row is `INTP · Indocement Tunggal Prakarsa Tbk`. `hoverPickMs` is the engine's time to find what is under
the pointer; the pointer's round trip in the same run (`hoverMs`, 0.4–1.5 s) waits on SwiftShader's frames,
which take hundreds of milliseconds here, so it is not the engine's latency (decision O-V2-4). The map reads
0.77 px/m in the jsdom test and the frames run, 0.84 in the probe run; both meet A1's 0.75.

### 2.2 Tests and checks

```
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest.json && node scripts/assert-test-count.mjs vitest.json
assert-test-count: 1093 tests, 0 failed, 0 failed suite(s) (floor 1072)        # before: 1076; floor now 1089
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ npm run check:world
36 files · 33 wired from the entry · 3 pending
wired files clean · load order ok · no Factory Yard code in src/
$ npm run typecheck        (clean)
$ npm run test:e2e:world
8 passed                    # 7 before; one new case: click and hover at three bands
```

New unit tests (17): `worldPlacement` (extent and margin; no road through a block; lots inside blocks and apart;
lot size or office unit; bays on the driveway and the driveway clear), `worldV2Scale` (hero ≥ 1.25 px/m and a
block ≥ 60 px; the map ≥ 0.75; the phone ≥ 1.0; `H` and the slider's 0; the bands with hysteresis; lots as
entities; the zone resolver to the lot or the block; hover labels, pointer and outline; a click with pointer
events; the keyboard over companies and blocks), `worldShell` (the company card without a model; a proposed
company's reason with no digit carrying a unit), `worldRegistry` (every `does` line, sourced, no figure, the
review file). Rewritten to the new behaviour, PRD section in the comment: the chain card says "expected, not
measured" once (§3.9); the poster is the hero frame (§3.1); the chain test's translucency count skips the cast
shadow (§3.2). None of the protected tests was relaxed (no-figure, no-write, no-hex, no-data-layer, dispose ×10,
seeded replay, flag-off, test-count floor).

### 2.3 The flag-off build and the chunks

```
$ npx vite build --outDir /tmp/dist-off-main   (main, flag off)   → 210 files
$ npx vite build --outDir /tmp/dist-off-a      (branch, flag off) → 210 files
$ diff <(sha256 of every file in main) <(sha256 of every file on the branch)
< 5ebc6f3b…  ./world/poster-far.svg
> 1ee80d4d…  ./world/poster-far.svg
$ node scripts/world/assert-world-flag.mjs
assert-world-flag: no world code in dist/ (flag off).
```

Identical but for the public poster, the exception `o8-mobile-lcp.md` §2 records.

Flag-on chunks (bytes, gzip −9): `world-scene` 78,744 / 30,905 → 87,180 / 33,769 (budget 120 kB gzipped);
`layout.generated` 60,248 / 11,880 → 77,872 / 14,669 (lots, bays, driveways); `WorldFrame` 194,824 / 28,833 →
234,525 / 33,765 (the registry's `does` lines and the cards); `three-core`, `three-renderer`, `three-addons`
unchanged byte for byte.

## 3. Frames

`docs/world/frames/v2/`:

- `gate-a-hero.png` — the home view: the estate at 1.25 px/m, every company its own building, shadows, region tones.
- `gate-a-district.png` — Whole, the map, at the district band: everything packed into one frame.
- `gate-a-street.png` — the street band over INTP: the lots, kerb signs with tickers, the block's signboard, mark and name.
- `gate-a-company-card.png` — a click on INTP's building at the hero: the hover label and the company card v2.
- `gate-a-phone.png` — a phone at 390 px after "Start the world": the hero at 1 px/m.
- `gate-a/probe-*.png` — the probe's frames at each view, desktop and phone; `baseline/probe-*.png` before.

## 4. Decisions

### 4.1 Made by the agent

1. **Lot size.** "24 × 18 m along the front" is read as 18 m along the front and 24 m deep, either way round;
   a block grows only where two such lots would not fit (the town's towers, shops and depots stand on 44 × 28 m
   blocks; every estate and ring block keeps its size). The town is therefore one five-column grid.
2. **The hero's floor is 1.25 px/m**, above the PRD's 1.2, so a 40 m block is 71 px; the hero's ground lives in
   the layout (`layout.hero`) so the engine and the poster frame the same thing.
3. **Whole fits every drawn point**, not the slab's box, so the map gains zoom from the empty corners.
4. **Bands by zoom** with a hysteresis of a tenth either side of 4 and 10 px/m.
5. **A lot opens as its section** by redrawing its zone without it (each block draws from its own seeded
   generator, so the redraw is identical); this keeps a zone one merged part instead of 250 lot meshes.
6. **Every lane a block faces** is a road in the layout (estate rows, gateway lanes, the port lane, the town's
   row streets), so phase B's graph has a road in front of every lot.
7. **companies.tsv lists every company** so the `does` column covers all 196: the earliest-listed rule's picks
   are copied with their exact reason and source, and the rule still fills any slot the file leaves empty.
8. **The `does` lines are the agent's drafts** from its knowledge of each issuer, each with the instruction to
   check it against the issuer's latest annual report; the issuers' own pages (idx.co.id) answer 403 here.
9. **The block's status mark and name moved to its front kerb**, the glyph 5 m wide so it reads at the district band.
10. The weighbridge's plate belongs to its gate's part, so pointing at the plate finds the gate.

### 4.2 Needed from the owner

- **O-V2-1.** Review the 196 lines in `docs/world/v2/review-does.md`, the 57 marked **check** first.
- **O-V2-2.** The town's blocks grow to 44 × 28 m so each holds two lots: keep, or prefer halved forms on the
  old footprints (PRD §10 decision 1 covers only the large families).
- **O-V2-3.** `companies.tsv` now holds every company's row: keep (one table for company facts), or move the
  `does` lines to their own table and leave the rule's picks to the generator.
- **O-V2-4.** The 150 ms hover (A2) is met by the engine (≤ 16 ms to pick); on SwiftShader the pointer's round
  trip is frame-bound. Please confirm on the Vercel preview with a GPU.

## 5. Deviations

- **"Blocks keep their sizes"** (mega prompt §3.1): kept for every family whose block already held two lots;
  grown in the town (decision 1).
- **"Keep every existing road id"**: every gate id and every named road (`ring`, the radials, `main`,
  `raw-export`, `recovery`, `haul-geo`, `estate-spine`, `estate-cross`, `gateway-spine`, `hill-road`) is kept;
  the town's numbered streets follow the new grid (`town-street-1…14`, `town-cross-15`, `-16`, where there were
  25 and 26–27), and lanes are added.
- **Hover ≤ 150 ms** is evidenced as the engine's pick time and in jsdom; SwiftShader cannot show a 150 ms round trip.
- **The chain's per-line "expected, not measured" labels in the world** remain until phase D replaces the chain
  drawing; the card already says it once.
- **Lighthouse** is phase E's (mega prompt §7.2); not measured here.

## 6. The pull request

See the pull request for `world-v2/a-scale` (link added on the pull request page; this note is part of it).
