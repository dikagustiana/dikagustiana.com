# Gate 3: the exposed company, the data boundary, the think tank

Branch `feat/kawasan-industri`, 8 October 2026. Companions: `docs/world/gate-2.md`,
`docs/world/frames/` (three frames re-shot here), `docs/world/think-tank-tags.json`,
`docs/world/review-tags.md`, `supabase/migrations/20261008120000_essay_world_tags.sql`.

## 1. Ringkasan

1. Phase E–H selesai di enam commit (12–17): cakram tanda kondisi di dunia dan strip bacaan, kontrol jarak yang mengikuti kamera, drill-down energi v0; highlight rantai (satu tingkat atau rantai penuh, terukur solid, perkiraan putus-putus dan berlabel, sisanya diredupkan); batas data dengan API sesuai §8.1; enam interior arketipe dengan stasiun dan tabel sinonim; whiteboard di dinding belakang; think tank dengan dua kamar, kind, evidence dan falsifier.
2. Tiga uji §8.3 hijau dan outputnya ada di §2: dunia dan board berjalan melawan klien Supabase yang melempar error pada insert/update/upsert/delete/rpc/storage/channel dan tidak pernah memicunya; setiap angka di board berasal dari field paket yang dipublikasikan, ditulis formatter rumah; perusahaan tanpa paket tidak menampilkan angka; outage terbaca "Status unavailable" di mana-mana, bukan "No model yet".
3. Penjaga tambahan: tes aturan gagal kalau ada modul di `src/world/{engine,world,interiors,sim}` yang mengimpor data layer FIA, link register, atau boundary; di development `Part.text` melempar kalau angka berupa rupiah, persen, ribuan, atau satuan sampai ke builder. Satu-satunya pengecualian adalah whiteboard (`Part.note`), yang menerima string yang sudah diformat shell; tes aturan menahan `Part.note` hanya di modul itu.
4. Tag think tank sementara: `docs/world/think-tank-tags.json` masih kosong (bentuknya ada di dalam file); satu usulan entri di `review-tags.md` (`indonesias-reindustrialization-bet`, thesis). Mas yang menulisnya; agen tidak menulis apa pun ke database.
5. File migrasi `20261008120000_essay_world_tags.sql` di-commit di sini: empat kolom nullable di `public.essays` (`world_kind`, `world_tags`, `world_evidence`, `world_falsifier`) plus indeks GIN, tanpa tabel/policy/role/view/function baru. **BLOCKED, tidak diterapkan di mana pun** (rule 3: backup belum pernah sukses, item B); tidak ada branch Supabase dan tidak ada Postgres lokal yang dicoba di sesi ini. Status produksi: `fsre_published` masih tidak terbaca (item A).
6. Tiga frame yang tertunda dari gate 2 sudah diambil ulang: `exposed-company-whiteboard-mock` (INTP terbuka dengan interior PROC, lima penanda stasiun, whiteboard di dinding utara), `think-tank-section` (dua kamar di bukit), `overlay-reindustrialisation-marks` (cakram bernomor di dunia). Mock tetap hanya di skrip capture.
7. Hasil pengikatan driver dari fixture SYNTHETIC lewat boundary: fuel→main line, power→main line, raw→receiving, packaging→packing, sga→despatch; label saja yang menyeberang, tanpa angka. Deskripsi baris dicocokkan dulu, physical unit hanya kalau deskripsi tidak menyebut stasiun (D18).
8. Semua cek hijau di commit ini: tsc bersih, eslint 0 error / 22 warning, 1.005 unit test lulus (floor 1.001), `check:world` bersih (23 file, 19 terpasang; 4 pending adalah data/placement yang memang bukan modul engine).
9. Lisensi Factory Yard masih pending (rule 10): PR tetap draft. Keputusan yang perlu Mas lihat ada di §3.2 (O4–O7), terutama O5: menerapkan migrasi ke branch/lokal setelah backup jalan.
10. Gate 3 dicatat; lanjut ke Phase I (commit 18, kualitas) dan gate 4 (laporan, decision log, NOTICE, draft PR) sesuai "please continue until everything is finished".

## 2. Evidence

```
$ TZ=America/Chicago npx vitest run tests/unit/worldBoundary.test.tsx tests/unit/worldPeerBand.test.ts
 ✓ tests/unit/worldBoundary.test.tsx (5 tests)
   ✓ the world and the board run against a client that throws on writes, and the index is read once
   ✓ a company without a package shows no figure, and the think tank reads the essays through the same client
   ✓ an outage reads unavailable everywhere, never absence
   ✓ the boundary’s own API: statuses, flows and bindings from one cached request; an outage is unavailable and retried next time
   ✓ a scene builder throws in development when a figure reaches it
 ✓ tests/unit/worldPeerBand.test.ts (5 tests)
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest-report.json && node scripts/assert-test-count.mjs vitest-report.json
assert-test-count: 1005 tests, 0 failed, 0 failed suite(s) (floor 1001)
assert-test-count: ok
$ npx tsc -b --force
(no output: clean)
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ npm run check:world
23 files · 19 wired from the entry · 4 pending
pending (not yet wired): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts, placement/place.ts
wired files clean
load order ok
$ node scripts/world/capture-frames.mjs --only exposed,thinktank,overlay
exposed {"ticker":"INTP","placed":{"fuel":"line","power":"line","raw":"receiving","packaging":"packing","sga":"despatch"},"lit":null}
marks 8
frame exposed-company-mock · exposed-company-whiteboard-mock · board-mock · think-tank-section · think-tank-mock · overlay-reindustrialisation-marks · overlay-reindustrialisation
consoleErrors (unique): 404 /_vercel/insights/script.js (the preview server has no Vercel insights)
```

The no-write test's client: `supabase.from(table)` returns a builder whose `select/eq/neq/order/limit/in/is/filter/range/gte/lte/or` chain and resolve to two mock essay rows, and whose `insert/update/upsert/delete/rpc` throw; `supabase.rpc`, `storage.from` and `channel` throw too; a counter records every attempt and reads 0 after the world, the board of a published mock, the board of a company without a package and the outage path. The published index is mocked at the data layer's one function (`fetchPublishedPackages`); the request is made once per session.

Published-only: every numeric token on the board of the mock package (tickers and sub-industry codes aside) is checked against the set of figures the package can produce — every cell value through `formatNumber` at 0–2 decimals, `formatDelta`, `formatPercent`, the periods' labels, the version and as-of strings, the condition numbers, the sources' pages and notes, the peer-band values — and the set of unexplained tokens is empty. A company without a package produces no numeric token at all.

Chunk sizes at this commit (flag on): `WorldFrame` 228.55 kB (41.50 kB gzip; engine, interiors, chain, marks, stations, whiteboard and the shell), `world-engine` 570.90 kB (143.88 kB gzip, three.js), `Board` 46.73 kB; the flag-off build is unchanged and `assert-world-flag` still finds no world code in it.

## 3. Decisions

### 3.1 Made by the agent

- **D18. Description before unit.** A cost line's description says what the line is ("raw material cost per tonne of clinker"); its physical unit only how it is measured ("Rp thousand per tonne of clinker"). The matcher reads the description first and the unit only when the description names no station, so "per tonne of clinker" does not drag the raw-material line to the kiln. Whole tokens, case-insensitive, the synonym table applied first, the station hit most wins, ties to the earlier station in the archetype's order (PRD §7.8's order).
- **D19. The whiteboard's figures.** Mega prompt §8.1 forbids a figure reaching a scene builder; §9.3 asks the whiteboard for figures. Resolved by shape: the shell computes `WhiteboardContent` (strings by the house formatter, labels at twelve characters, bar lengths as fractions) and the engine draws it through `Part.note`, the one text path the guard does not check, held to `src/world/engine/whiteboard.ts` by a rule test. Everything else in scene code goes through `Part.text`, which throws in development on a rupiah amount, a percentage, a thousands-grouped number or a number with a unit.
- **D20. The whiteboard is an entity.** Clicking it opens the board (PRD §7.7) because its group carries an entity whose one action is open-board; the frame answers that selection. An exposed company's section is built at once (the view only toggles it), so the board exists before the next frame.
- **D21. The chain highlight dims by material swap.** No veil: everything outside the chain swaps its shared theme materials for translucent clones, re-tinted each frame so the night blend holds, restored on clear. Vehicles and marks keep moving. The card carries a measured link's weight; the engine never sees it.
- **D22. The energy drill-down v0** (discovery item D) lists the energy band's three lines and links to Capital in Motion 12 (Duration Mismatch, PLN) and 17 (Stranded Asset Risk Pricing, PLN Coal Fleet Pre-Retirement) by number, from the condition card and from the layer card. An in-frame chain with a back control is new content and waits for the owner.
- **D23. Mark discs on carriers only.** A joint's mark sits on its gate, a border's on its signpost, a stage's or node's at its region's label anchor; a layer's or a return vehicle's mark is read from the strip (no fixed place in the world). The strip's click frames the carrier.
- **D24. The migration stays a file.** Rule 3 is still unmet (no backup has ever succeeded), so the file is committed and applied nowhere, not even to a branch or a local database; the gate 3 item is BLOCKED, as discovery item B's default said.

### 3.2 Needed from the owner (new since gate 2)

- **O4.** Write `docs/world/think-tank-tags.json` (the one proposed entry is in `review-tags.md`); until then every piece is untagged and lights nothing.
- **O5.** Set the backup secrets and run the workflows once (item B); then say whether the migration should be rehearsed on a Supabase branch or a local database (item C). Applying it to production is yours (rule 2).
- **O6.** The whiteboard's three drivers are ranked by the line's total at the latest reported period as a share of cost of revenue (cost lines plus the unsplit remainder). Confirm that is the share you mean, or name another.
- **O7.** The INTP frames use the SYNTHETIC cement fixture; the real package needs item A (expose `fsre_published`).

## 4. Deviations

- Mega prompt §9.2 asks the board's waterfall bars themselves to light stations on hover; the model page's `UnitEconomics` component is reused unchanged (§14), so the board lights stations from its own "Drivers in the drawing" list under Main drivers (hover and focus), and selecting a station marker is not wired back to the board's bars (the card is).
- §9.4's driver tree: `DriverTree` draws precedents and dependents from the package's formula graph when it carries one, else "Driver tree not available for this model"; "show full chain" on the tree is the model page's own control and is not added here.
- §10: no essay page links into the world; PRD §7.10's two-way links are piece → buildings (lit while the piece is open) and building → pieces (the card's Related analyses), both built.
- The migration was not applied anywhere (D24); no branch result to report.
- `getModelStatuses()`, `getFlowWeights()` and `bindStations()` exist as §8.1 names them, over the same one request the frame's hook uses; the frame keeps using the hook (react-query cache) rather than the promise API, so the two are the same data twice-cached for a session, never two requests.

## 5. Licence and backup state

- **Licence (rule 10):** unchanged since gate 0. `NOTICE.md` records ai-iso-skill's MIT and Factory Yard as "permission pending". The pull request stays a draft.
- **Backups (rule 3):** unchanged. No backup artifact exists; no migration was applied anywhere.
- **Production (rules 1, 2):** nothing on `main`, nothing on Vercel's production settings, nothing on the Supabase project; every build and test here pointed at `http://127.0.0.1:54321` or a mocked client.

## 6. Preview URL

Not readable from this session (item P, `403` on Vercel's deployments list at gate 2); the owner reads it from the Vercel dashboard for branch `feat/kawasan-industri`. The preview needs `VITE_WORLD_KAWASAN=true` (and `VITE_FIA_PREVIEW=true` for the model links, item K) on its environment to show the world.
