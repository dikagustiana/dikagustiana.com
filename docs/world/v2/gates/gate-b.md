# Gate B: flows

Branch `world-v2/b-flows` from `main` at `51ec415` (phase A merged), 9 October 2026. PRD v2 §3.6, §3.11, §5,
§6, §7 B1–B6, Appendix A; mega prompt §4, tasks 1–8. Gate mode: continue.

## 1. Ringkasan

1. Lalu lintas v1 (truk berputar di jalur generik) **diganti aliran barang**: setiap link registry yang barangnya
   bergerak menjadi rute dari **bay kirim lot pemasok** ke **bay terima lot pelanggan** di graf jalan (140 aliran:
   129 link, 6 retur, 3 ekspor bahan mentah, 2 impor).
2. Jenis kendaraan mengikuti kelas barang (Lampiran A): dump/hopper, tanker, reefer, box/kontainer, van, bus.
   Truk digambar 1,25 × ukuran (≥ 15 m), jadi **18,8 px** di hero (v1: 5 px).
3. Siklus: keluar dari pintu lot → **berhenti 1,5 s di jembatan timbang** tiap gerbang yang dilewati (saat
   bermuatan) → bongkar 2 s di bay → kembali kosong dengan tone lebih terang → hilang di rumah.
4. Ritme per kelas: 30 s *expected*, 18 s *measured-light*, 10 s *measured-heavy*; ponsel separuh. Batas
   **300 / 120** kendaraan; spawn ditahan bila antrean bay atau jembatan timbang ≥ 5, atau > 15 % armada berdiri.
5. Probe hero: **177 dari 208** kendaraan di layar bergerak, **3,6 px/s** (SwiftShader), semua (283/283) punya asal,
   tujuan, dan muatan. Draw call hero 188, peta 217 dengan 300 kendaraan hidup (anggaran 900 / 1.300).
6. Kapal curah memuat di dermaga (palka terisi), kapal kontainer membawa impor, kereta ulang-alik yard–pelabuhan,
   crane berayun; koin + garis uang dengan layer kredit; pejalan kaki di trotoar kota dan teras think tank.
7. Kartu kendaraan: jenis, muatan, dari (ticker · sub-industri), ke, status link, "Illustrative traffic; see the
   model for figures", tombol pemasok/pelanggan. Kartu gerbang menghitung aliran **dengan kata**. Tanpa angka.
8. Klik/hover kendaraan bekerja lewat **instancing** (satu InstancedMesh per jenis; id instance → entitas).
9. Build flag-off identik dengan `main` kecuali `poster-far.svg` (jalan berubah di B2), pengecualian yang sama
   dengan gate A.
10. Ditunda sesuai urutan: animasi palang timbang & aktivitas bay (C), Follow & pulsa governance/regulation (D).

## 2. Evidence

### 2.1 The probe, before and after

`node scripts/world/probe.mjs <url> --out …` on a flag-on build (`VITE_WORLD_KAWASAN=true VITE_FIA_PREVIEW=true`,
dead Supabase URL), Chromium 1440 × 900, stage 1,246 × 700, SwiftShader. Before: `main` at `48eb458`
(`docs/world/frames/v2/baseline/probe.json`) and after phase A (`gate-a/probe.json`). After: this branch
(`docs/world/frames/v2/gate-b/probe.json`, `probe-phone.json`). The probe now also reports the trucks' on-screen
length (drawn length × px/m, the measure v1's 5 px was taken by), the goods vehicles that report an origin, a
destination and a load, and the vehicles seen weighing and unloading during its second.

| view | px/m | vehicles on screen and moving: v1 → A → **B** | truck px/s: v1 → A → **B** | truck length | with origin, destination, load | draw calls: v1 → A → **B** | click at INTP |
|---|---|---|---|---|---|---|---|
| home (hero) | 0.42 → 1.25 | 47 of 47 → 27 of 27 → **177 of 208** | 1.4 → 4.3 → **3.6** | 5 → **18.8 px** | 0 of 122 → **283 of 283** | 317 → 236 → **188** | **company** |
| whole (map, 300 live) | → 0.78 | → 41 of 41 → **255 of 280** | → 15.4 → **3.2** | **11.6 px** | **301 of 301** | → 283 → **217** | **company** |
| estate | 1.33 → 1.49 | 24 of 24 → 25 of 25 → **198 of 200** | 34.3 → 45.2 → **5.7** | **22.3 px** | **301 of 301** | 682 → 206 → **157** | **company** |
| street (6 px/m) | → 6 | → 4 of 4 → **33 of 34** | → 10.4 → **12.2** | **90 px** | **301 of 301** | → 91 → **92** | **company** |
| inside (12 px/m) | 14.84 → 12 | 0 → 0 → **9 of 9** | → 0 → **51.4** | **180 px** | **297 of 297** | 95 → 80 → **86** | **company** |
| phone home (390 px) | → 1.00 | → 11 of 11 → **42 of 45** | → **4.7** | **15 px** | **120 of 120** | → 116 → **98** | **company** |

The truck length counts every goods vehicle but the town's parcel vans (a van is 6 m as drawn, 7.5 px at the hero;
decision O-V2-7). On SwiftShader a frame takes about half a second; a frame now runs up to a quarter of a second of
the world (it ran a tenth), so the probe's px/s is closer to the world's own pace, but still below a real GPU's
(a truck at 10–12 m/s is 12–15 px/s at 1.25 px/m). The probe's px/s differs between views with how many frames
SwiftShader drew in its second, not with the vehicles' speeds. Page errors: none.

### 2.2 Tests and checks

```
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest.json && node scripts/assert-test-count.mjs vitest.json
assert-test-count: 1117 tests, 0 failed, 0 failed suite(s) (floor 1113)    # before: 1093; floor was 1089
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ npm run check:world
38 files · 35 wired from the entry · 3 pending
wired files clean · load order ok · no Factory Yard code in src/
$ npm run typecheck        (clean)
$ npm run test:e2e:world
10 passed                    # 8 before; two new: a vehicle's card by a click, a weighbridge stop and an unloading
```

New unit tests (20, `tests/unit/worldFlows.test.ts`): the roads' two lanes per edge kept right; the route cache, the
route end to end and its weighbridge stops; the raw-export road taken by the export trucks and by no other route
(but the two pits whose driveway joins it); goods → vehicle kind and every truck ≥ 18 px at the hero; a flow per
moving link, the six returns between their lots, the raw export and the imports; every vehicle's origin, destination
and load (B1); the cap on a laptop and a phone, the world starting full; the cadence by class and the phone's half;
a heavy flow's share at the cap; the roads kept moving (three in four on the move in the sixth minute); the
weighbridge's 1.5 s on the gate's plate and the bay's 2 s (B3); nothing left behind by spawn and despawn, and the
lighter tone on the way back; a coin per laden vehicle with the credit layer; ships, the train and walkers (B5); the
fleet's draw calls the same at three hundred as at a few (B6); counts in words; the vehicle's card (no digit in any
row), the gate's card in words, a vehicle picked through its instance.

Rewritten to the new behaviour, PRD section in the comment: the scene's entity count names the flows' kinds (§3.6);
every mover's card carries the traffic line, now read from the card (§3.11); the layers switch the goods, the
reefers and the coins, and a measured link sends its vehicles more often instead of adding trucks to the main road
(§3.6); the gate's hover is tested with the goods layer off, since a vehicle weighing on the plate is what the
pointer finds there (§3.4, §3.6). None of the protected tests was relaxed (no-figure, no-write, no-hex,
no-data-layer, dispose ×10, seeded replay, flag-off, test-count floor).

### 2.3 The flag-off build and the chunks

```
$ npx vite build --outDir dist-off-main   (main at 51ec415, flag off) → 210 files
$ npx vite build --outDir dist-off-b      (branch, flag off)          → 210 files
$ diff <(sha256 of every file in main) <(sha256 of every file on the branch)
< 1ee80d4d…  ./world/poster-far.svg
> 3dd2c62c…  ./world/poster-far.svg
$ node scripts/world/assert-world-flag.mjs
assert-world-flag: no world code in dist/ (flag off).
```

Identical but for the public poster, the exception `o8-mobile-lcp.md` §2 records: B2 joined the west gate's radial
to the estate's cross road and ran the main road into the estate, and the poster draws the roads.

Flag-on chunks (bytes, gzip −9), phase A → B: `world-scene` 87,180 / 33,769 → 106,523 / 41,415 (budget 120 kB
gzipped); `layout.generated` 77,872 / 14,669 → 207,811 / 36,356 (the road graph: 874 nodes, 941 edges);
`WorldFrame` 234,525 / 33,765 → 241,030 / 34,768; `three-core` 183,406 / 50,198 → 186,581 / 50,997 (the
`InstancedMesh` class, now used); `three-renderer` and `three-addons` the same size.

## 3. Frames

`docs/world/frames/v2/`:

- `gate-b-home-flows.png` — the hero with the flows: goods vehicles on their routes between the lots, drawn at 1.25 ×.
- `gate-b-gate-stop.png` — the east gate at the street band: a laden truck on the weighbridge, the queue behind it.
- `gate-b-port.png` — the port: the bulk ship loading (its hold filling), the container ship, the crane, the trucks.
- `gate-b-vehicle-card.png` — a click on a truck at the street band: the hover label and the vehicle's card.
- `gate-b/probe-*.png` — the probe's frames at each view, desktop and phone.

## 4. Decisions

### 4.1 Made by the agent

1. **A vehicle weighs laden.** It stops on every weighbridge it crosses on the way out; on the way back, empty, it
   drives on (PRD §3.6 describes the stop in the laden leg). Weighing both ways halved the gates' throughput and the
   queues at the east gate reached back through the estate.
2. **The cap is a ceiling, and the spawner watches the roads.** A flow sends nothing while five of its vehicles queue
   at the customer's bay (PRD), while five wait at a weighbridge on its way, while three stand on one lane of its way,
   or while more than a sixth of the fleet stands (`JAM_HOLD` 0.15). Without these holds the demand (140 flows at a
   vehicle per 30 s is about a thousand vehicles in flight) far exceeds what the roads carry, and queues grew until
   most of the fleet stood. Live vehicles float between about 220 and 300.
3. **Traffic rules, kept few:** a vehicle follows whatever stands ahead within 40 m across every lane of its route
   (many lanes are shorter than a truck); a queue standing past a crossing of roads is not joined until it moves; of
   two vehicles bound for one lane the nearer to the junction goes first; one leaving a driveway gives way to a road
   vehicle about to pass; two that still overlap (merged at once) separate, the one behind falling back; a ring of
   vehicles each waiting on the next is broken after 8 s. Measured over ten simulated minutes: 12–24 % of the fleet
   standing at any moment (queues at gates and junctions), and a unit test holds the roads to three in four moving.
4. **A trip starts at the lot's door**: the vehicle's tail at the door and its front on the driveway, short of the
   road, which it joins by giving way. It unloads at the receiving bay and turns round there.
5. **Every truck is 12–13.4 m long** before the 1.25 scale (a box truck and a dump truck were 9 and 10.5 m), so every
   truck is ≥ 18 px at the hero. The town's vans stay a van's size (decision O-V2-7).
6. **A link with an unplaced end runs from or to the container quay** (PRD: "imports and exports").
7. **A frame runs up to 0.25 s of the world** (it was 0.1 s), so a slow device keeps nearer real time; a hidden tab
   still does not burst.
8. **Models that turn keep every face** (`Part.cull = false`): the kernel drops faces looking away from the iso
   camera as it builds, which is right for buildings and wrong for a vehicle that turns.
9. **Tones:** dark cabs and chassis, mid-tone bodies, the container in the accent, the return truck's skip in the grass
   slope's tone; empty vehicles lighter by 18 %. Tokens only.
10. The debug API gains `pause(on)`, `flows()` and each vehicle's `facts` in `all()`; they are for the probe and the
    tests, behind `?debug`.

### 4.2 Needed from the owner

- **O-V2-5.** Vehicles weigh only on the laden leg. Keep, or weigh both ways (the gates then queue far more)?
- **O-V2-6.** The spawner holds when more than 15 % of the fleet stands, so the live count floats below 300. Keep the
  hold, or prefer a full 300 with longer queues?
- **O-V2-7.** Parcel vans are 6 m as drawn, 7.5 px at the hero, below the 18 px every truck meets. Keep a van's
  size, or draw parcels as small box trucks?

## 5. Deviations

- **The boom lifting** at the weighbridge and the bay's dock activity are phase C's (activity per family).
- **The governance and regulation pulses** (optional in B) and **Follow** are phase D's.
- **"Links whose supplier or customer is unplaced … drawn as a ship call"**: such a link's trucks run to or from the
  container quay; the container ship's own call stands for the sea leg (one ship, not one per link).
- **`three-core` grew by 0.8 kB gzipped** with the `InstancedMesh` class, which instancing (D-V2-11) needs; the PRD's
  "three.js chunks unchanged" was written before instancing was chosen.
- **The poster** changed with the roads (§2.3).
- **SwiftShader's px/s** stays a fraction of a real GPU's; 3.6 px/s at the hero meets the probe's 3, the real-GPU 8
  waits for the Vercel preview (O-V2-4).

## 6. The pull request

https://github.com/dikagustiana/dikagustiana.com/pull/55
