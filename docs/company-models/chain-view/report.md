# Laporan: Finance in Action, chain view (sisi situs)

Branch `feat/fia-chain-view`, worktree `C:\work\dika-fia-chain`. Spesifikasi: `PRD.md`, `PLAN.md`, `PROMPT-site.md`
di folder ini. Semua default dan usulan PRD §4 (D-M1 sampai D-C2) **disetujui pemilik pada 22 Okt 2026** dengan
kalimat "kerjain aja, bikin langsung semuanya"; dicatat juga di `docs/DECISIONS.md` (entri 2026-10-22, chain view).

## 1. SHA dan commit

- Start: `836faf1` (origin/main, "Show the glimpse's arrows on a phone too").
- End: commit terakhir branch ini (`chore(fia)` yang membawa laporan ini); SHA persisnya ada di PR.

| # | Commit | Isi |
|---|---|---|
| 1 | `19e1ee0` docs(fia) | PRD, PLAN, PROMPT-site, PROMPT-model apa adanya |
| 2 | `d8c7ed5` feat(fia) | `downstreamLines` di tipe, skema, validasi, fixture, tes (D-C1) |
| 3 | `e99b1f0` feat(fia) | Pill tahap di index, anchor `stage-<id>` / `band-<id>` |
| 4 | `19016dc` feat(fia) | Rail perusahaan, kartu angka kunci, kartu model (Reset / Full screen / Download) |
| 5 | `9fdb692` feat(fia) | Panel Along the chain (D-C2) |
| 6 | `3452e52` feat(fia) | Sankey aliran biaya per unit + tabel |
| 7 | `f7dc085` feat(fia) | Kartu link level perusahaan |
| 8 | `24d05b6` feat(chain) | Homepage: kotak tahap (jarak finance) ke Section 06 |
| 8a | `dca23a7` feat(fia) | PGEO di slate (J411, D-M5), tambahan scope dari koordinator |
| 9 | chore(fia) | Aksesibilitas/responsif (select kartu link di 360 px, teks sankey, label homepage), screenshot, laporan, DECISIONS |

## 2. Output CI (dijalankan lokal, Windows 11, Node 24, 22 Okt 2026)

eslint, typecheck, vitest dan assert-test-count dijalankan ulang setelah commit PGEO; python, check:world dan
kedua build dijalankan setelah perubahan kode situs terakhir (sebelum PGEO, yang hanya mengubah `slate.json` dan
satu tes).

Perintah sama dengan `.github/workflows/ci.yml`. Dua catatan lingkungan, keduanya sudah ada di `main` sebelum
pekerjaan ini dan bukan akibatnya:

- **8 tes gagal di Windows saja**: 7 di `tests/unit/workbookViewer.test.tsx` dan 1 di
  `tests/unit/worldEngineRules.test.ts`. Gagal yang sama persis muncul pada run baseline di `836faf1` sebelum
  satu baris pun diubah (1395 tes, 8 gagal). CI GitHub di `main` @ `836faf1` hijau (Linux). Tidak ada tes chain
  view yang gagal.
- **`npm run build` berhenti di langkah pertama** (`scripts/world/render-poster.mjs`, `ERR_UNSUPPORTED_ESM_URL_SCHEME`,
  path `C:` di loader ESM Windows). Langkah sisanya (`vite build && assert-no-synthetic && assert-world-flag &&
  prerender`) dijalankan langsung, dua kali: tanpa flag dan dengan `VITE_FIA_LIVE=true`.

Output panjang (vitest, build) dipotong ke bagian yang berarti; selain itu apa adanya.

### `npx eslint . --max-warnings=35` (22 warning, plafon 35)
```
C:\work\dika-fia-chain\src\components\EssayEditLink.tsx
  25:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\editorial\ArticleToc.tsx
  25:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\editorial\EssayEditor.tsx
  584:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\editorial\FigureBlock.tsx
  201:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  206:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\editorial\FontSizeToggle.tsx
  19:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\editorial\ImageBlock.tsx
  101:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components
  128:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\ui\badge.tsx
  29:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\ui\button.tsx
  53:18  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\ui\sonner.tsx
  24:19  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\components\writer\WriterValidation.tsx
  67:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\contexts\AuthContext.tsx
  124:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

C:\work\dika-fia-chain\src\pages\DevelopmentFinanceEssayPage.tsx
  57:6  warning  React Hook useEffect has a missing dependency: 'loadEssay'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\work\dika-fia-chain\src\pages\FinanceEssayPage.tsx
   81:6   warning  React Hook useEffect has a missing dependency: 'loadEssay'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  130:46  warning  Unexpected any. Specify a different type                                                                      @typescript-eslint/no-explicit-any
  132:22  warning  Unexpected any. Specify a different type                                                                      @typescript-eslint/no-explicit-any
  137:36  warning  Unexpected any. Specify a different type                                                                      @typescript-eslint/no-explicit-any
  145:26  warning  Unexpected any. Specify a different type                                                                      @typescript-eslint/no-explicit-any

C:\work\dika-fia-chain\src\pages\GreenTransitionEssayPage.tsx
  76:6  warning  React Hook useEffect has a missing dependency: 'loadEssay'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\work\dika-fia-chain\src\pages\NextBigThingEssayPage.tsx
  63:6  warning  React Hook useEffect has a missing dependency: 'loadEssay'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

C:\work\dika-fia-chain\src\pages\NotFound.tsx
  18:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

✖ 22 problems (0 errors, 22 warnings)

exit 0
```

### `npm run typecheck`
```
> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force

exit 0
```

### `npx vitest run --reporter=default --reporter=json --outputFile=vitest-report.json` (TZ=America/Chicago)
Run terakhir: 9 gagal = 8 baseline Windows di atas + 1 `tests/unit/tracker_copy.test.tsx` ("Unable to find
role heading Sector register", timeout di bawah beban; dijalankan sendiri: 51/51 lulus; tidak disentuh pekerjaan
ini). Run sebelumnya (sebelum PGEO) gagal tepat 8 baseline. Baris gagal dan ringkasan:
```
   × the tracker page with the entries published > says "paused" or "archive" at most once, and none of the banned phrases 1444ms
   × the workbook viewer > shows the sheets as tabs in workbook order, the first open, and opens another as a new history entry 748ms
   × the workbook viewer > selects a cell on a click: the name box gives its address and the formula bar its formula with "=" 331ms
   × the workbook viewer > jumps across sheets from the inspector, and Back returns 551ms
   × the workbook viewer > jumps to a precedent past the last row with a value onto that cell, not the last row 309ms
   × the workbook viewer > keeps up with a held arrow key, writing the URL at most every 300 ms, and moves on when the browser refuses a write 12613ms
   × the workbook viewer > follows the URL when it changes under the viewer, as the browser's Back changes it 152ms
   × the workbook viewer > goes to a typed address with Ctrl+G, on this sheet or another, and says when there is no such cell 414ms
   × engine code rules > draws unguarded text (Part.note) only on the whiteboard 12ms
 FAIL  tests/unit/tracker_copy.test.tsx > the tracker page with the entries published > says "paused" or "archive" at most once, and none of the banned phrases
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > shows the sheets as tabs in workbook order, the first open, and opens another as a new history entry
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > selects a cell on a click: the name box gives its address and the formula bar its formula with "="
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > jumps across sheets from the inspector, and Back returns
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > jumps to a precedent past the last row with a value onto that cell, not the last row
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > keeps up with a held arrow key, writing the URL at most every 300 ms, and moves on when the browser refuses a write
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > follows the URL when it changes under the viewer, as the browser's Back changes it
 FAIL  tests/unit/workbookViewer.test.tsx > the workbook viewer > goes to a typed address with Ctrl+G, on this sheet or another, and says when there is no such cell
 FAIL  tests/unit/worldEngineRules.test.ts > engine code rules > draws unguarded text (Part.note) only on the whiteboard
...
 Test Files  3 failed | 104 passed (107)
      Tests  9 failed | 1435 passed (1444)
     Errors  8 errors
   Start at  20:13:48
   Duration  127.63s (transform 30.11s, setup 49.05s, collect 99.39s, tests 556.82s, environment 76.19s, prepare 14.77s)

JSON report written to C:/work/dika-fia-chain/vitest-report.json
exit 1
```

### `node scripts/assert-test-count.mjs vitest-report.json`
```
assert-test-count: 1444 tests, 9 failed, 6 failed suite(s) (floor 1440)
assert-test-count: failing tests or suites — red.
exit 1
```
Jumlah 1444 = 1395 baseline + 49 tes baru; `MIN_TESTS` naik 1391 ke 1440 di commit 2 sampai 8 (di commit yang
menambah tes). Merah di sini hanya karena tes gagal yang dijelaskan di atas; jumlahnya di atas lantai.

### `python3 -m unittest discover -s scripts/tests -v` (ekor)
```
----------------------------------------------------------------------
Ran 60 tests in 1.350s

OK
exit 0
```

### `python3 scripts/fs_check.py data/fs/phe/fy2024/statements.json --failures-only`
```
RULE  EXPECTED  ACTUAL  DIFF  RESULT

175 rules: 175 passed, 0 failed.
exit 0
```

### `npm run check:world`
```
> vite_react_shadcn_ts@0.0.0 check:world
> node scripts/world/check-engine.mjs

40 files · 37 wired from the entry · 3 pending
pending (not wired from the entry): data\boundary.ts, placement\empty.ts, placement\layout.generated.ts
wired files clean
load order ok
no Factory Yard code in src/
exit 0
```

### `npm run build` (ekor; berhenti di render-poster, lihat catatan)
```
    at defaultLoadSync (node:internal/modules/esm/load:146:3)
    at #loadAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:806:12)
    at #loadSync (node:internal/modules/esm/loader:838:53)
    at ModuleLoader.load (node:internal/modules/esm/loader:787:26)
    at ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:498:31)
    at #getOrCreateModuleJobAfterResolve (node:internal/modules/esm/loader:564:36)
    at afterResolve (node:internal/modules/esm/loader:611:52)
    at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:617:12)
    at node:internal/modules/esm/loader:636:32 {
  code: 'ERR_UNSUPPORTED_ESM_URL_SCHEME'
}

Node.js v24.21.0
exit 1
```

### Build tanpa flag: `vite build && assert-no-synthetic && assert-world-flag && prerender` (baris non-aset)
```
vite v5.4.21 building for production...
transforming...
Browserslist: browsers data (caniuse-lite) is 16 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
✓ 2162 modules transformed.
computing gzip size...
- Using dynamic import() to code-split the application
✓ built in 11.47s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
prerender: SKIPPED — no VITE_SUPABASE_PUBLISHABLE_KEY in this environment. The SPA build is complete; per-essay share cards are NOT pre-rendered. Expected on CI (no secrets); a deploy would fail instead of skipping.
exit 0
```

### Build live: sama, dengan `VITE_FIA_LIVE=true` (baris non-aset)
```
vite v5.4.21 building for production...
transforming...
Browserslist: browsers data (caniuse-lite) is 16 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
✓ 2240 modules transformed.
computing gzip size...
- Using dynamic import() to code-split the application
✓ built in 19.96s
assert-world-flag: no world code in dist/ (flag off).
prerender: SKIPPED — no VITE_SUPABASE_PUBLISHABLE_KEY in this environment. The SPA build is complete; per-essay share cards are NOT pre-rendered. Expected on CI (no secrets); a deploy would fail instead of skipping.
exit 0
```

## 3. Screenshot

Semua di `screenshots/`, dibuat dengan `scripts/fia/screenshots.mjs` (Playwright, panggilan Supabase dicegat).
Kecuali `live-*`, build memakai `VITE_FIA_PREVIEW=true`, jadi yang tampil hanya fixture SYNTHETIC dan slate
(nama + ticker, tanpa angka).

| Layar | 360 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Index (pill tahap) | `index-360.jpg` | `index-768.jpg` | `index-1024.jpg` | `index-1440.jpg` |
| Model SCEM (rail, kartu, kartu model, Along the chain, sankey) | `model-scem-360.jpg` | `model-scem-768.jpg` | `model-scem-1024.jpg` | `model-scem-1440.jpg` |
| Homepage, jarak finance | `home-finance-360.jpg` | `home-finance-768.jpg` | `home-finance-1024.jpg` | `home-finance-1440.jpg` |

Tambahan: `sankey-scem-360.png`, `sankey-scem-1440.png` (sankey dan tabel); `along-chain-scem-360.png`,
`along-chain-scem-1440.png`; `linkcard-company-360.png`, `linkcard-company-1440.png` (kartu link level
perusahaan); `fullscreen-scoa-1024.jpg` (kartu model full screen); `not-available-xcem-1440.png` (keadaan
"Not available: volumes not disclosed"); `live-index-1440.jpg` dan `live-home-finance-1440.jpg` (flag seperti
production: `VITE_FIA_LIVE=true`, preview mati, belum ada model terbit, jadi slate tampil "planned").
Screenshot production asli tidak diambil.

Pemeriksaan responsif (Playwright pada build preview): `scrollWidth - clientWidth` = 0 di 360/768/1024/1440 untuk
index, SCEM, XCEM, index dengan kartu link terbuka, dan homepage finance. Satu-satunya temuan (kartu link 360 px,
67 px karena opsi select panjang) diperbaiki di commit 9. Tidak ada kontrol di `main` (di luar SVG, grid dan
breadcrumb) yang tingginya di bawah 44 px.

## 4. Penyimpangan dan pilihan sendiri

1. **Format anchor**: `stage-<stage id>` dan `band-<band id>`, jadi `#stage-stage-extraction` dan
   `#band-band-energy`, persis contoh prompt; satu helper `positionAnchor` dipakai index, pill, strip, breadcrumb
   dan homepage. Dua tes lama yang memegang anchor lama diperbarui.
2. **Semua layer kini punya section** di index (dulu layer tanpa sub-industri disembunyikan), supaya pill
   "Logistics and warehousing" punya tujuan.
3. **Periode kartu angka kunci**: kuartal reported terakhir di `unitEconomics.periods` (bukan FY), agar kuartal
   yang sama setahun sebelumnya ada untuk pill YoY. Pill YoY juga muncul di kartu lain bila periode tahun lalu punya
   rincian catatan; tidak ada pembanding untuk basis nol atau negatif. Judul kartu laba memakai label subtotal
   terakhir ("Operating profit per tonne"); kalau hanya ada laba bruto, judulnya ikut. Tanpa volume, kartu per unit
   berkata "Not available: volumes not disclosed" (constraint 9), bukan "Not in this model".
4. **Rail**: perusahaan yang punya paket ditautkan (sama dengan index); tanpa paket didaftar tanpa tautan. Di
   preview XCEM berstatus "Preview" dan tetap ditautkan.
5. **Download .xlsx dipindah** dari header ke kartu model agar tetap satu-satunya aksi primer. Saat full screen,
   inspector ikut masuk ke kartu (instance kedua) supaya sel terpilih tetap terbaca.
6. **Along the chain**: link ke/dari sub-industri di layer (energy/logistics) jadi kelompok sendiri ("Energy and
   logistics layers"); "This stage" berupa satu kalimat. Kartu link dibuka di section itu; node hulu sankey membuka
   kartu yang sama dan menggulung ke sana.
7. **Sankey**: aliran = semua baris cost/unsplit + subtotal terakhir (laba operasi); subtotal antara (laba bruto)
   tidak digambar karena sudah terpecah. Rugi digambar sebagai simpul terpisah berarsir di bawah revenue. Node hulu
   tanpa perusahaan terbit juga membuka kartu link. Judul: "Where a unit of cement goes".
8. **Fixture SYNTHETIC kedua**: link `syn-power-to-cement` (tak terukur) dari sub-industri SYNTHETIC baru
   `SYN-POWER` di `band-energy`, `downstreamLines` ke baris `power` SCEM/XCEM, supaya sankey punya dua simpul hulu.
9. **Kartu link**: dua select dipindah dari baris driver ke bawah judul "One [unit] of [product], split along the
   chain"; muncul bila sisi itu punya minimal satu perusahaan terbit (dulu minimal dua).
10. **Homepage**: label "n models"/"planned" di pojok kanan bawah kotak tahap, dipancarkan generator plate
    (`scripts/build-chain-plate.mjs`, `<StageModelsHit>` setelah semua hit lain), lalu `npm run build:chain`
    dijalankan ulang (selain 14 baris StageModelsHit dan satu import, hasil generator identik). Jumlah dari feed yang
    di-lazy-load `ChainPlate` menurut flag build; di production ini menambah satu request baca model terbit di
    homepage (query key sama dengan Section 06). Tes memastikan markup jarak economy identik dan urutan keyboard
    lama tidak berubah. Kolom sempit (ponsel) mendapat tautan HTML yang sama di bawah nama tahap.
11. **`scripts/fia/screenshots.mjs`**: dua perubahan kecil agar jalan di Windows (`shell` untuk `npx`, `taskkill`
    untuk menghentikan server).
12. **Validasi `downstreamLines`** juga menolak baris berperan revenue/subtotal (input hanya di cost atau unsplit)
    dan ticker di luar sub-industri hilir. Isu tampil di index sebagai catatan "Ignored".

**Token baru**: tidak ada. Sankey memakai `--primary`, `--fia-cost`, `--fia-unsplit`, `--destructive`,
`--muted-foreground`, `--background`, `--foreground`, `--ring`; konstanta geometri baru `SANKEY` di
`lib/finance-in-action/layout.ts`. Tidak ada dependensi baru.

## 5. Item terbuka untuk pemilik

1. **Label "n models" di homepage kecil** (sekitar 9 px di lebar 1440 karena plate diskalakan) dan rapat dengan
   baris nama tahap. Seluruh kotak bisa diklik, tapi label lebih besar butuh ruang di layout generator (mis. kotak
   tahap lebih tinggi), yang mengubah plate di kedua jarak. Perlu keputusan.
2. **`coal-to-cement.downstreamLines` masih kosong**: diisi dari jalur A (A5) setelah SMGR/INTP terbit; sampai itu
   sankey model nyata tidak punya simpul hulu.
3. **8 tes Windows dan `render-poster.mjs` di Windows** (lihat §2) sudah ada di `main`; CI Linux yang menentukan.
4. **Kontras** teks baru memakai token yang ada (`foreground`, `muted-foreground`, `accent`) dan label sankey diberi
   halo latar; belum diukur dengan alat kontras otomatis.
5. **PGEO (D-M5)** sudah di slate (`dca23a7`), nama dan ticker saja. Peer band BREN tampil begitu BREN dan PGEO
   sama-sama terbit.
6. **Info dari jalur model (koordinator, belum diverifikasi di sini)**: paket PTBA, ADRO dan SMGR lulus
   `publish-manual --check` di folder privat (bukan di repo). Untuk `downstreamLines` nanti: SMGR memuat
   batubara di baris unit economics `fuel_power` (link `coal-to-cement`). Sesuai prompt, `links.json` tetap `{}`
   di PR ini.
7. Tidak ada keputusan PRD §4 yang menghalangi pekerjaan situs; D-M2 sampai D-M7 milik jalur model, tidak
   disentuh di sini.
