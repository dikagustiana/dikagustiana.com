# Gate 1: the registry

Branch `feat/kawasan-industri`, 8 October 2026. Companions: `docs/world/review-registry.md`,
`docs/world/sources/SOURCES.md`, `docs/world/discovery.md`.

## 1. Ringkasan

1. Phase B selesai di tiga commit (vendor engine + NOTICE, `createWorld`/`dispose`, typing + check script) dan Phase C selesai di commit ini: registry 130 sub-industri IDX-IC, 125 ditempatkan, 126 link `expected`, dua kamar think tank aktif.
2. Semua angka diturunkan dari file sumber di `docs/world/sources/` oleh generator (`npm run build:registry`), deterministik dan idempoten; tes membandingkan file hasil dengan yang di-commit byte per byte, jadi setiap perubahan penempatan terlihat di `review-registry.md`.
3. Dokumen IDX-IC resmi tidak bisa diunduh dari lingkungan ini (idx.co.id dan gopublic.idx.co.id menjawab 403); yang dipakai adalah transkripsi dari dua halaman sekunder yang mengutip BEI dan cocok dengan tabel Mas (35/69/130/125), di-hash dan dikunci; sepuluh koreksi ejaan dicatat di SOURCES.md. Mas tinggal taruh PDF resminya (item N).
4. Daftar emiten per sub-industri diambil dari lembarsaham.com (sekunder, 963 emiten, 8 Oktober 2026); hanya ticker, nama, tanggal berdiri dan IPO yang disimpan. 27 sub-industri kosong di sana (termasuk B147 jasa pertambangan dan E744 toko khusus, yang patut Mas cek), 10 cuma punya satu emiten.
5. Pasangan contoh: slate FSRE (INTP, SMGR; PTBA, ITMG) dipakai; sisanya diusulkan generator dengan aturan mekanis "dua emiten yang paling lama tercatat" (192 usulan, 64 slot kosong). Semua `proposed`; Mas ganti lewat `companies.tsv`.
6. Semua 130 penempatan `proposed` (Appendix A), termasuk default D1 (A111 ring + anneks kilang) dan D2 (D231 ring + anneks olahan); jasa bisnis, media, TI dan telko digantung ke aliran informasi rantai karena tidak ada simpulnya.
7. Rekomendasi D1–D9 ada di §3.2; yang paling perlu Mas putuskan: D3 (bangunan putus-putus untuk yang tanpa emiten; default: digambar), D9 (minta file lisensi MIT ke pemilik Factory Yard), plus S1–S4 di §3.3.
8. Semua cek hijau: lint 0 error, typecheck bersih, 950 unit test lulus (floor 946), `check:world` bersih untuk modul yang sudah terpasang (26 modul vendored masih `pending` sampai Phase D), build jalan tanpa chunk world.
9. Lisensi Factory Yard masih belum ada dan backup masih belum pernah sukses (tidak diubah di fase ini); PR tetap draft dan tidak ada migrasi yang diterapkan.
10. Berhenti di gate 1. Setelah "lanjut": Phase D (placement, builder dunia, poster, shell React) sampai gate 2.

## 2. Evidence

Commands on this branch at the gate 1 commit (Node v22.22.0):

```
$ npm run -s build:registry
build-registry: 35 / 69 / 130 / 125 · 126 links · 130 placements proposed · 192 companies proposed · 64 slots empty · 3 file(s) written
$ npm run -s build:registry          # a second run changes nothing
build-registry: 35 / 69 / 130 / 125 · 126 links · 130 placements proposed · 192 companies proposed · 64 slots empty · 0 file(s) written
$ TZ=America/Chicago npx vitest run tests/unit/worldRegistry.test.ts
 ✓ tests/unit/worldRegistry.test.ts (10 tests)
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest-report.json && node scripts/assert-test-count.mjs vitest-report.json
assert-test-count: 950 tests, 0 failed, 0 failed suite(s) (floor 946) assert-test-count: ok
$ npx eslint . --max-warnings=35
(no output: 0 errors, 22 warnings)
$ npm run typecheck                  # tsc -b --force
(no output: clean)
$ npm run check:world
pending (not yet wired): kernel/graph.ts, models/people.ts, models/port.ts, models/train.ts, models/vehicles.ts, models/works.ts, sim/cars.ts, sim/core.ts, sim/forklifts.ts, sim/freight.ts, sim/homes.ts, sim/people.ts, sim/person.ts, sim/port.ts, sim/roadnet.ts, sim/roads.ts, sim/train.ts, sim/trucks.ts, world/industry.ts, world/interiors.ts, world/port.ts, world/rail.ts, world/range.ts, world/towers.ts, world/town.ts, world/woods.ts · 57 unresolved reference(s) in pending files wired files clean load order ok
```

Phase B evidence, from the commits `2668671`, `223a6d3` and `db10c64`: `tests/unit/worldEngineMount.test.ts` (5 tests: ten mounts and disposes with no listener, frame or canvas left; idempotent dispose; two seeded worlds; the debug API; no import side effects) and `tests/unit/worldEngineRules.test.ts` (3 tests: no hex outside `theme.ts`, no `Math.random()`, no DOM ids) pass in the run above. Files still carrying the vendoring pragma, listed by `npm run check:world` as pending: kernel/graph.ts, models/{people,port,train,vehicles,works}.ts, sim/{cars,core,forklifts,freight,homes,people,person,port,roadnet,roads,train,trucks}.ts, world/{industry,interiors,port,rail,range,towers,town,woods}.ts (26 files).

The issuer snapshot: `scripts/world/fetch-issuers.py`, 146 pages fetched on 8 October 2026 (one page per sub-industry, paginated at 20), 963 tickers, 0 without a name, 0 in two sub-industries. Sub-industries the source lists as empty (27): B145, B147, C111, C132, C142, D411, E121, E122, E511, E522, E721, E744, F221, G221, G222, G313, G314, G411, I232, J431, K121, K131 and the five Z codes. With one issuer (10): A221, C221, E212, E311, F111, G311, G414, H112, J312, J421.

Hashes locked in `docs/world/sources/citation.json`: classification table `930eb4e59d9c55af8a17a7cdfa81d40ffbb34f6243ed56e241071f4c1cb0a77a`; issuer snapshot as recorded there.

## 3. Decisions

### 3.1 Made by the agent

1. **Example pairs by a mechanical rule, not by judgement.** Where `companies.tsv` leaves a slot empty, the generator proposes the sub-industry's earliest-listed issuers (by IPO date in the snapshot) with that rule as the reason. The rule is defensible (the longest run of filings to model), uses no market data, and is visibly a default: every such row says `proposed` and names the rule. The owner replaces any pair by one line in `companies.tsv`.
2. **The FSRE first slate sits where the PRD says** (INTP, SMGR on B121; PTBA, ITMG on A121), as `proposed` until the owner marks those placements `owner`.
3. **One secondary source for issuers,** because the exchange's site answered 403 from this environment (SOURCES.md). Only ticker, name and two dates are kept from it.
4. **The classification is a transcription** cross-checked between two secondary pages that cite BEI and against the owner's counts, with ten spelling corrections listed in SOURCES.md. Its hash locks the generator; the official PDF's hash replaces it when the owner supplies the file.
5. **Business services, media, IT and telecom hang on the chain's information flow** (`flow-info-demand`), water utilities on the energy band, insurers and investment services on the asset-finance band, because the chain data file has no node for them. Each row's note says so; the owner can point any of them elsewhere in `placement.tsv`.
6. **Rooms:** the two default rooms are on, the two switchable ones are defined and off, in `ROOMS` (`src/lib/world/registry/generate.ts`).

### 3.2 Open decisions D1–D9 from the PRD §18: recommendation and the default used if unanswered

| # | Decision | Recommendation | Default used now |
|---|---|---|---|
| D1 | "Produksi & penyulingan migas" (A111): ring with a refinery annex, or estate with wells in the ring? | **Ring, with a refinery annex in the estate's primary block.** The listed companies are upstream producers first; the refinery is one annex, not the home. | Ring with annex (`placement.tsv` A111) |
| D2 | Fish, meat and poultry (D231): ring with a processing annex, or estate? | **Ring, with a processing annex.** Farming is the origin; processing of the same company is drawn as the annex. | Ring with annex (D231) |
| D3 | Sub-industries with no listed issuer: dotted buildings or left out? | **Draw them, dotted.** The address exists before the company does, and the coverage figure's denominator stays 125. | Drawn, dotted (the generator keeps them; the snapshot shows which have `n = 0`) |
| D4 | Z1 and Z2: no buildings, or notes in the money layer? | **No buildings.** Listed investment products are not production; a note on the money layer's card can name them later. | No buildings (zone `unplaced`) |
| D5 | Think-tank rooms at launch: two or four? | **Two** (The Next Big Thing, Industry analysis), with the other two switchable, as the registry has them. | Two on |
| D6 | Number format on the board: the site's formatter or the house format? | **They are the same thing:** `src/lib/finance-in-action/format.ts` already is the house format (point thousands, comma decimals, brackets). Use it. | The site's formatter |
| D7 | Lit windows at night only with a published model? | **Yes.** It is the one place published data changes motion and it conveys coverage honestly. | Lit only with a model |
| D8 | English labels, Indonesian names on the card? | **Yes.** `nameEn` on buildings and signs, `nameId` on the card, both from the classification table. | English labels |
| D9 | Factory Yard: ask for a licence file or written permission? | **Ask the author for an MIT licence file** on the repository; it settles the question for every later port too. Written permission is the fallback and is recorded verbatim in NOTICE.md either way. | Nothing can be defaulted: the pull request stays a draft until one exists |

### 3.3 Needed from the owner (new since gate 0)

| # | Question | Default |
|---|---|---|
| S1 | Is the earliest-listed rule acceptable as the proposal rule for the pairs the FSRE slate does not cover? | Yes; the owner overrides by row |
| S2 | May lembarsaham.com stand as the secondary issuer source until the exchange's list is reachable or the owner supplies IDX's own list? | Yes, labelled secondary |
| S3 | The ten spelling corrections in SOURCES.md: keep, or revert to the secondary rendering until the official PDF is checked? | Keep |
| S4 | Information-flow, energy-band and asset-finance anchors for the sub-industries the chain has no node for (3.1 item 5): acceptable, or should `presentation.ts` carry a separate "not on the chain" state? | As placed |

## 4. Deviations

- Mega prompt §5.1 says the official classification is committed "as a file or a cited reference with a hash". The file could not be downloaded; the reference is cited and the hash is the transcription's (SOURCES.md). Deviation recorded, owner action requested (gate 0 item N).
- Mega prompt §5.2 says pairs are proposed "with a one-line reason each (for example: discloses volumes and capacity; largest by revenue…)". Disclosure-based reasons need filings this environment cannot read; the reason given is the mechanical rule above. The owner's `companies.tsv` carries judgement-based reasons.
- `review-registry.md` is also generated (not hand-written), so the snapshot test compares it byte for byte.

## 5. Licence and backup state

- **Licence (rule 10):** unchanged since gate 0: Factory Yard has no licence file and no permission is on record; `NOTICE.md` says "pending"; the pull request stays a draft.
- **Backups (rule 3):** unchanged since gate 0: both workflows still fail on missing secrets (not re-checked this phase; no migration has been or will be applied until a run succeeds).

## 6. Preview URL

Not retrievable from this session (Vercel deployments list answers 403); see gate 0 §6.
