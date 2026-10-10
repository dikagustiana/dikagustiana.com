# Gate D: chain, stories, follow

Branch `world-v2/d-stories` from `main` at `5d63df6` (phase C merged), 10 October 2026. PRD v2 §3.9, §3.10,
§3.12 (pulses), §3.13, §7 D1–D4; mega prompt §6, tasks 1–7. Gate mode: continue.

## 1. Ringkasan

1. Memilih blok atau perusahaan kini menyalakan rantainya **di jalan yang benar-benar dilalui barang**: garis
   putus-putus berjalan ke arah pelanggan (panjang untuk link terukur, pendek untuk yang diharapkan), lot terkait
   diberi garis tepi terangkat, sisanya diredupkan. Tidak ada label di jalur; "expected, not measured" cukup sekali
   di kartu; jalur yang disorot (hover) menampilkan catatan link-nya.
2. Memilih kendaraan menyalakan rutenya dan dua lotnya; "Show full chain" membingkai ulang kamera di band distrik.
3. **Enam cerita** di `docs/world/sources/stories.tsv` (milik pemilik), tiap hop dipetakan ke kode yang ditempatkan
   dan ke link register; dua link baru diusulkan agar cerita tersambung (O-V2-10).
4. Kontrol **Stories** di header (tombol di layar lebar, select di ponsel), strip hop dengan kelas barang dan joint
   yang dilintasi, kartu cerita; tombol `S` berganti cerita.
5. **Follow**: kamera menumpang truk dari lot pertama, berhenti di setiap bay dengan kartu lot selama 4 detik (atau
   Spasi), lanjut dengan truk hop berikutnya dari lot itu, dan berakhir dengan kartu cerita; `F` mengikuti kendaraan
   terpilih; Esc atau drag keluar. Satu perjalanan **60–90 detik**: selama menumpang dunia dipercepat, jam tetap.
6. Hop tanpa kendaraan (listrik, jasa, uang ke hulu) ditelusuri kamera sepanjang rutenya; truk yang terjebak antrean
   ditinggal dan kamera meluncur ke bay-nya.
7. Pulsa **governance** (ke hulu, dari pelanggan) dan **regulation** (ke hilir) di rute setiap link.
8. **Search** menemukan cerita menurut judul dan kendaraan menurut muatan ("coal").
9. Probe hero: **182 dari 211** kendaraan bergerak, **4,7 px/s**, draw call 216 (sama dengan C); cerita yang menyala
   di peta 317 draw call (anggaran 900). Build flag-off **identik byte demi byte** dengan `main` (210 berkas).
10. Untuk pemilik: O-V2-10 (pemetaan cerita dan dua link baru), O-V2-11 (dunia dipercepat selama Follow).

## 2. Evidence

### 2.1 The probe, before and after

`node scripts/world/probe.mjs <url> --out …` on a flag-on build, Chromium 1440 × 900, SwiftShader, the two-second
speed window of gate C; before: gate C (`docs/world/frames/v2/gate-c/probe.json`), after: this branch
(`gate-d/probe.json`, `probe-phone.json`).

| view | moving on screen: C → **D** | truck px/s: C → **D** | draw calls: C → **D** | click at INTP |
|---|---|---|---|---|
| home (hero) | 181 of 208 → **182 of 211** | 3.8 → **4.7** | 216 → **216** | **company** |
| whole (map) | 242 of 284 → **198 of 283** | 2.7 → **1.6** | 249 → **249** | **company** |
| estate | 194 of 199 → **191 of 198** | 3.2 → **2.9** | 184 → **184** | **company** |
| street (6 px/m) | 32 of 32 → **25 of 26** | 24.4 → **23.3** | 120 → **120** | **company** |
| inside (12 px/m) | 8 of 8 → **8 of 8** | 53.4 → **31.2** | 114 → **114** | **company** |
| phone home | 41 of 44 → **44 of 44** | 5.6 → **6.5** | 124 → **124** | **company** |

Every goods vehicle still reports its origin, destination and load (289 of 289 at the hero); trucks 18.8 px. Nothing
lit draws nothing more: the chain, the story and the pulses draw only when lit or shown (the frames' readings: Cement
lit at the estate 235 calls, "From well to shelf" lit on the map 317, both pulse layers on at the estate 184). The
map's reading is lower than at gate C (198 of 283 moving, 1.6 px/s); the map is not the measure of B2 (the hero is),
and the two new links add two flows; the hero's reading is up.

### 2.2 Tests and checks

```
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest.json && node scripts/assert-test-count.mjs vitest.json
assert-test-count: 1148 tests, 0 failed, 0 failed suite(s) (floor 1144)    # before: 1133; floor was 1129
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ npm run check:world
wired files clean · load order ok · no Factory Yard code in src/
$ npm run typecheck        (clean)
$ npm run build:registry
build-registry: 35 / 69 / 130 / 125 · 175 links · 6 stories · … · 0 file(s) written
$ npm run test:e2e:world
13 passed                    # 11 before; new: a story lit end to end, Follow ridden to the end
```

New unit tests (15): the chain on the roads (one level with travelling dashes, outlines, the rest dimmed, no label;
a hovered route's note; a vehicle's own route and its two lots; a measured link's long dashes and the full chain
framed at the district band); the six stories resolve to placed codes and links, and a bad story is refused (a hop
that is no link, goods not the link's, a figure, an unplaced code); the six stories lit end to end, the rupiah
upstream with the banks and a measured hop, a selection's chain over a story; Follow (a story ridden end to end in
60–90 s with the lot's card at each bay; a glided hop and the clock's own pace; Space, Escape, the arrows and
follow(null); F and the card's Follow; a vehicle ridden home); the governance and regulation pulses; search by
story and by load, and the engine's vehicle for a load.

Rewritten, each citing its section: the chain test (PRD v2 §3.9: routes on the roads replace v1's straight lines
with a label on each expected one; the counts per link, the dimming, the restore and the dispose are asserted as
before) and the vehicle card's actions (§3.11: Follow · Open the supplier · Open the customer). None of the protected
tests was relaxed.

### 2.3 The flag-off build and the chunks

```
$ npx vite build --outDir dist-off-d      (branch, flag off) → 210 files
$ diff -rq dist-off-main dist-off-d       (main's flag-off build, identical through phase C)
(no difference)
$ node scripts/world/assert-world-flag.mjs
assert-world-flag: no world code in dist/ (flag off).
```

Flag-on chunks (bytes, gzip −9), C → D: `world-scene` 126,835 / 48,502 → 139,810 / 53,755 (budget 120 kB gzipped);
`WorldFrame` 266,501 / 44,118 → 272,312 / 45,646.

## 3. Frames

`docs/world/frames/v2/`:

- `gate-d-chain.png` — Cement selected at the estate: its links' routes on the roads with travelling dashes, the
  linked lots outlined, the rest dimmed; the card's one "expected, not measured" note.
- `gate-d-route-hover.png` — a lit route under the pointer: its link's note ("Coal burnt as kiln fuel in cement").
- `gate-d-story.png` — "From well to shelf" lit end to end and framed; the strip's seven hops with their goods and
  the joints they cross; the story's card.
- `gate-d-pulses.png` — the estate with the governance and regulation layers on.
- `gate-d-follow-ride.png`, `gate-d-follow-stop.png`, `gate-d-follow-end.png` — Follow on "Palm": riding the first
  hop's truck; stopped at Mayora's bay with its card; the end, with the story's card.
- `gate-d-search.png` — "coal": the coal sub-industries, the Coal story and the loads that carry coal.
- `gate-d/probe-*.png` — the probe's frames.

## 4. Decisions

### 4.1 The stories' mapping, for the owner (PRD v2 §10.3, Appendix B)

Every hop is a link of the register; the goods are the link's (an upstream story's hops carry money, `none`).

| story | hops (codes) | goods per hop | what Appendix B asked, and what is not there |
|---|---|---|---|
| Coal | A121 Coal Production → J411 Electric Utilities → B121 Construction Materials → J211 Heavy Constructions & Civil Engineering | bulk · none · bulk | "energy to every estate block" is the energy layer's line (C3), not a hop; coal to the cement kiln (A121 → B121) is a link beside the story |
| Cement | B121 Construction Materials → J211 Heavy Constructions & Civil Engineering → H111 Real Estate Development & Management | bulk · none | the quarry and the town have no lot (the quarry family stands nowhere, O-V2-9; the town's households are not a sub-industry): the story starts at the cement plant and ends at the estate's developer |
| From well to shelf | A111 Oil & Gas Production & Refinery → B111 Basic Chemicals → B131 Containers & Packaging → D222 Processed Foods → E711 Consumer Distributors → D113 Supermarkets & Convenience Stores → C222 Environmental & Facilities Services → B111 Basic Chemicals | liquid · bulk · boxed · boxed · boxed · bulk · bulk | households are not a sub-industry: the shelf hands its packaging to recovery directly, through a **new link D113 → C222** ("packaging and waste from the shops collected for recovery") |
| Palm | D232 Plantations & Crops → D222 Processed Foods → E711 Consumer Distributors → D113 Supermarkets & Convenience Stores | bulk · boxed · boxed | the mill and the refinery are inside D232 and D222 (no sub-industry of their own); D232 → B111 (palm oil into oleochemicals) is a link beside it |
| Nickel | B146 Diversified Metals & Minerals → B144 Iron & Steel → J113 Marine Ports & Services | bulk · bulk | "export by ship" through a **new link B144 → J113** ("smelted metal shipped out through the port"); the raw-export road beside it is the flows' raw export (phase B), named in the standfirst |
| The rupiah upstream | D113 → E711 → D222 → D232, against the goods; G111 Banks lit beside it | none · none · none | "processor → mine" reads as the food chain's farm; the banks are lit, not ridden |

### 4.2 Made by the agent

1. **Routes from the flows' road graph**: a link's routes run from each supplier lot to a customer lot in turn (the
   flows' own pairing), along the lanes the vehicles drive; a link that moves nothing (electricity, a service) is
   drawn on the same roads.
2. **Two dash patterns** in the live tone, long for a measured link and short for an expected one, travelling at
   9 m/s of the frame's clock towards the customer (against the goods in an upstream story), paused with the world.
3. **Raised outlines** are the lot's box from the ground to over its form, drawn over everything; a route's pointer
   target is an invisible ribbon seven metres wide, so the hover label finds it at the district band.
4. **A story frames itself** at the district band; a hop's button frames that hop; a selection's chain replaces a
   story (and clearing the story never clears that chain).
5. **Follow sends the hop's vehicle** out of the lot the ride stands at rather than waiting for the next to leave;
   the world runs up to ten times faster while riding, at the rate the rest of the story needs to fit 75 seconds,
   read every frame; the clock keeps its own pace. A vehicle that has not moved for five seconds is left where it
   stands and the camera glides the rest of its way to the bay (queues at the estate's cross road held a ride for
   most of a minute). The camera rides at 3 px/m.
6. **S** lights the stories in turn, then none. The strip names the joints a hop's routes cross (the gates' joints)
   and says the hop's place in words.
7. **Search**: a load is a link whose goods move in vehicles; its result selects a vehicle on the road, else sends
   one. **Pulses**: one every 120 m of every link's first route, built when the layer is first shown.

### 4.3 Needed from the owner

- **O-V2-10.** The stories' mapping (§4.1) and the two links added for them (D113 → C222, B144 → J113): keep,
  change, or drop a hop?
- **O-V2-11.** Follow speeds the world up while it rides (up to ten times) so a story takes 60–90 seconds. Keep, or
  prefer real-time rides that take several minutes for the long stories?

## 5. Deviations

- **Follow sends a vehicle** rather than mounting "the next vehicle leaving the story's first lot", and runs the
  world faster while riding (§4.2, 5), to keep the ride within 60–90 seconds; a vehicle stuck in a queue is left and
  its way glided.
- **Hops no vehicle carries** (electricity, construction, money upstream) are glided along their routes. The rupiah
  story is glided against the goods; its coins are the credit layer's (a coin runs back against every laden vehicle),
  not a ride of their own.
- **The cement story** starts at the cement plant and ends at the estate's developer (no quarry, no town lot).
- **The strip's hop numbers** stay as the buttons' marks (as the shift strip's), hidden from the reader; the
  status line says the hop's place in words.

## 6. The pull request

https://github.com/dikagustiana/dikagustiana.com/pull/57
