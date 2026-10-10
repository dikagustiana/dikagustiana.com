# Laporan fase E — PSAK 338 workbook viewer

- Branch: `sweep/e-workbook`, base `main` @ `0487609` (PRD R4, §1.2.4, Bagian 3 "Phase E", keputusan D8–D11 dan D15–D17).
- SHA awal: `048760967c60be64095df084eee9c9b49bff75d4`
- SHA akhir: lihat commit terakhir di PR (commit laporan ini sendiri mengubahnya).
- Fase ini tidak mengandung migrasi, perubahan env, perubahan Vercel, atau perubahan `src/integrations/supabase/types.ts`. Tidak ada file world yang disentuh.

## Commit

Urut dari yang tertua (`git log --reverse 0487609..HEAD`), dengan commit laporan ini di akhir:

1. `49dfdf9` Commit the owner's dummy PSAK 338 workbook as the viewer's source
2. `8846107` Build the working paper JSON from the workbook with exceljs
3. `5176a51` Write the working paper build report beside the JSON
4. `d39a284` Test the working paper build against the committed workbook
5. `46f4300` Share the seeded generator between the workbook suites
6. `939c9d7` Read the working paper's formula references once per load
7. `6c4a545` Write the working paper's cells in the site's number convention
8. `bc00254` WIP: workbook viewer components (step E3, interrupted, not verified)
9. `c82894a` Add the workbook sanitizer the committed source was cleaned with
10. `c881e44` Commit the PTBA reference with its DATA block emptied
11. `00e9e9a` Finish the sheet grid's scrolling, cell names and run-on labels
12. `f186029` Add the viewer's sheet tabs, name box and formula bar
13. `343785a` Add the working paper's inspector, cell legend and toolbar
14. `e78377e` Orchestrate the workbook viewer with its place in the URL
15. `d4c9b86` Load the viewer near the viewport beside an always-present Method
16. `c651168` Replace the working paper simulation with the PSAK 338 viewer
17. `a4c71c0` Delete the four-entity working paper, AccountRow and their tests
18. `9851017` Test the workbook viewer and its page section
19. `e7b537c` Set the copy status under the toolbar, out of its row
20. `b32edb4` Add screenshots of the working paper viewer at 1440 and 390
21. `807cede` Set the grid's headers and idle tabs on the background token
22. `3eadee8` Retake the viewer screenshots with the lighter headers and tabs
23. `d4d9b45` Open the page at the working paper when a link names a cell
24. `afb7965` Test the working paper viewer in the browser, with its click time
25. `df068fd` Open a linked working paper at the viewer, not at its heading
26. `7acda9c` Add the viewer's step-four screenshots: links, a phone's error and jump
27. `a83b0e8` Record the workbook viewer replacing the hand-built working paper
28. `e90c891` Describe the workbook viewer in the consolidated reporting route row
29. `01092c0` Hold the browser test's grid checks to the grid, not the page scroll
30. `0f32bba` Jump to a linked working paper instead of gliding to it
31. `f376cac` Steady the browser test: an instant scroll and a rendered grid
32. `41c3d74` Give the working paper entry the click times of every run
33. `3b34b08` Hold the viewer's place in state, writing the URL at most every 300 ms
34. `254f8e6` Give the grid the focus after a jump from the inspector
35. `34819ba` Draw the frozen corner only when columns are frozen
36. `97925c8` Let a click through a run-on label reach the cell under it
37. `3c5bae1` Lay each sheet out to every cell a formula names on it
38. `a7cc84c` Round working paper figures on Excel's 15-digit decimal
39. `81fb544` Report the sheet frozen while scrolled as a known difference
40. `6cf5664` Hold the build test to the workbook's cell count, both ways
41. `c87fc53` Mark every visitor string in the viewer's copy with its source
42. `a214ea5` Name the workbook as Dika's in the Method panel's source line
43. `a09e9ee` Describe the PSAK 338 workbook on the Accounting landing row
44. `75634a2` Raise the test floor to 1193 for the working paper review's tests
45. `b8471ff` Launch the throttled browser from the playwright fixture
46. `aa60ad5` Count the working paper's eleven browser cases in the route row
47. `c57d0fc` Add screenshots of the working paper review's fixes at 1440 and 390
48. `23460d7` Record D10's blue beside the typed figures' blue as open for the owner
49. `d8a81b0` Complete the working paper entry with D15 to D17 and the page's edits
50. Commit laporan ini: `Write the phase E report` (SHA-nya ada di PR).

Commit `bc00254` mencatat jeda sesi. Pekerjaan E3 yang terputus di-commit apa adanya sebagai WIP, lalu dilanjutkan di atasnya tanpa menulis ulang riwayat: commit 11 dan sesudahnya membaca, memperbaiki, dan menyelesaikan isinya.

## Keputusan owner D15–D17 (10 Oktober 2026) dan pelaksanaannya

Dika memutuskan D15–D17 pada 10 Oktober 2026, setelah langkah E1 melaporkan isi file sumber. Teks keputusannya ada di `docs/sweep-2026-10/DECISIONS.md` pada branch `sweep/0-bootstrap`, bagian "Keputusan tambahan — 10 Oktober 2026 (fase E)". Laporan ini sengaja tidak menyebut nama perusahaan yang dihapus.

- **D15, nama perusahaan nyata dihapus.** Dijalankan dengan `npm run sanitize:workbook` (`scripts/consolidation/sanitize-workbook.ts`, commit `c82894a`). Skrip menunjuk sel lewat alamatnya, bukan lewat nama, sehingga nama itu tidak pernah tertulis di repo. Hasilnya: 26 nilai sel dikosongkan (formatnya tetap) dan 5 label dipotong bagian namanya. Tidak ada angka, formula, atau nilai cache yang berubah. Skrip hanya menerima file asli (sha256-nya dipatok), jadi daftar alamatnya tidak bisa terpakai pada file lain.
- **D16, metadata dihapus.** Skrip yang sama menghapus properti penulis, path OneDrive dan revision pointer, semua komentar sel dan komentar berutas beserta daftar penulisnya, serta 73.336 defined name warisan. Empat print range milik sheet tetap ada.
- **D17, referensi PTBA.** `docs/consolidation/reference/Company_models__PTBA.html` di-commit (`c881e44`) dengan DATA block dikosongkan. Angka laporan (`rep`) dan register sumber (`docs`) dikosongkan. Kunci struktur yang tidak memuat angka tetap ada. Contoh angka di legenda diganti `1.234`. File ini hanya referensi visual dan tidak ikut dikirim ke situs.
- **Verifikasi oleh orkestrator** (saat membersihkan, dengan file asli di tangannya):
  - perbandingan sel per sel dengan openpyxl atas 31.869 sel berbeda tepat di 31 sel yang diedit;
  - LibreOffice membuka ke-33 sheet;
  - `git log -p` branch bebas dari nama dan metadata itu.
  Riwayat branch ditulis ulang sebelum push pertama, jadi file asli tidak pernah sampai ke GitHub.
- **Pemeriksaan ulang saya di sesi ini.** Hanya sisi file yang di-commit; file asli tidak ada di sini.
  - openpyxl menghitung 31.843 sel bernilai (= 31.869 − 26), 15.485 formula, dan 119 teks kosong.
  - LibreOffice headless membuka file dan menghasilkan 33 sheet.
  - `docProps/core.xml` hanya berisi tanggal dibuat dan diubah, tanpa penulis.
  - `xl/workbook.xml` berisi 4 `definedName` (print range); tidak ada bagian komentar atau *person*.
  - Dalam `0487609..HEAD` hanya ada satu blob xlsx (`d511c76`, sha256 `cda94c8e…c6c2db`) dan satu blob HTML referensi.

## Apa yang dibangun, per kriteria

| Kriteria | Di mana / bagaimana | Bukti (tes) |
|---|---|---|
| R4.1 pipeline data | `scripts/consolidation/build-workbook.ts` dan `workbook.ts`, dijalankan dengan `npm run build:workbook` (exceljs). Membaca `docs/consolidation/source/pt-dummy-psak-338.xlsx` dan menulis `public/consolidation/pt-dummy-psak-338.workbook.json` (bentuknya di `src/lib/workbook/types.ts`). Per sheet: nama, urutan, `hidden`, dimensi, lebar kolom, tinggi baris, baris/kolom tersembunyi, merge, freeze. Per sel: alamat, nilai cache, formula tanpa `=`, dan gaya terindeks (number format, bold, alignment, border atas/bawah, warna merah/biru D10). Hasilnya deterministik, dan sha256 sumber tercatat di header JSON. `.gitattributes` menandai xlsx sebagai binary serta JSON dan report ber-LF. | `tests/unit/workbookBuild.test.ts`: "rebuilds the committed JSON and build report byte for byte", "records the committed xlsx's sha256 and size in the JSON header" |
| R4.2 sanitasi | D9: sheet hidden dan kosong tidak ikut. Build gagal bila aturan menjatuhkan sheet selain tepat tiga sheet D9. Defined name tidak ikut. Catatan kerja (heuristik: ≤ 6 huruf kecil di luar kolom A–C) dilaporkan ke `docs/consolidation/build-report.md`: 29 sel. Tidak ada nilai yang diubah. | "leaves out exactly the hidden sheet and the two empty ones D9 names"; "publishes every cell exceljs reads with a value or a formula on a published sheet, with that formula, and no other" |
| R4.3 viewer | Komponen di `src/components/workbook/`: `WorkbookViewer` (orkestrasi, `?sheet=&cell=`), `SheetTabs`, `NameBox`, `FormulaBar`, `SheetGrid` (virtualisasi baris dan kolom, header sticky, merge, lebar kolom dari file, freeze pane), `CellInspector` (alamat, nilai terformat, nilai mentah, formula, chip precedent, tombol lompat antar-sheet, dependents, status error), `Legend`, `Toolbar` (Copy cell address, Full screen, Download .xlsx). Viewer tidak mengedit dan tidak menghitung ulang; panel Method memuat kalimat R4.3 verbatim. | `tests/unit/workbookViewer.test.tsx` (19 tes: 15 viewer + 4 section), mis. "renders only the window of a large sheet, and the selected cell wherever it is", "selects a cell on a click: …formula with \"=\"" |
| R4.4 interaksi | Parser `src/lib/workbook/refs.ts` membaca A1, rentang, kolom/baris utuh, `Sheet!A1`, dan `'Sheet Name'!A1:B9`, termasuk nama sheet dengan spasi, `&`, tanda hubung di depan, atau spasi di akhir. Graf precedent dan dependent dibangun sekali per muat (`buildRefGraph`). Precedent di sheet yang sama diberi outline. Rujukan antar-sheet menjadi tombol lompat dengan Back (stack ≤ 50). Keyboard: panah, Home/End, Ctrl+Home, Page Up/Down, Enter (buka inspector), Esc, dan Ctrl+G (Go To, termasuk `Sheet!A1`). `src/lib/workbook/format.ts` memakai formatter FIA: `1.234`, `(665)`, nol accounting sebagai `–`, tanggal `31 Dec 2024`, dan pembulatan seperti Excel (15 digit desimal). | `tests/unit/workbookRefs.test.ts` (14 tes, termasuk 50 formula nyata ber-seed dan seluruh 15.476 formula); `tests/unit/workbookFormat.test.ts` (9 tes); di suite viewer: "moves with the arrows, Home and End, Ctrl+Home and Page Down; Enter opens the inspector and Esc closes it", "goes to a typed address with Ctrl+G…", "jumps across sheets from the inspector, and Back returns" |
| R4.5 bahasa visual | Memakai token `--fia-*` dan `LENS_ROLES` FIA (▲ precedent, ▼ dependent), ditambah empat token baru `--wb-red`, `--wb-blue`, `--wb-error-bg`, `--wb-error-fg` (kontrasnya tercatat di komentar `src/index.css`). Font grid adalah `font-sans` situs dengan `tabular-nums`. Tidak ada font baru, jadi CSP di `vercel.json` tidak berubah. Legenda: from the workbook, formula, error, merah dan biru D10, hidden. Di 1440, grid dan inspector berdampingan (≥ 1024 px). Di 390, inspector menjadi bottom sheet dan tab bisa digeser. Mode gelap tidak ada karena situs light only (lihat Pertentangan). | e2e "the inspector is a bottom sheet and the tabs scroll" (390); screenshot di tabel bawah |
| R4.6 halaman | Bagian 4 `src/pages/ConsolidatedReporting.tsx` diganti `WorkingPaperSection`: judul R4.6 verbatim, lede OWNER-REPLACEABLE (default PRD), viewer, dan panel Method (`MethodPanel`: sumber, tahun, nilai cache, sheet D9, 49 sel error D8, baris/kolom tersembunyi, konvensi angka, tombol unduh). `src/data/consolidationWorkingPaper.ts`, `AccountRow`, dan `tests/unit/consolidationWorkingPaper.test.ts` dihapus, dan `docs/DECISIONS.md` mencatatnya (entri 2026-10-10). | suite "the working paper section" (4 tes); e2e `smoke.spec.ts` "renders Consolidated reporting" |
| R4.7 kinerja | JSON 1.701.069 byte (≤ 4 MB, satu file), tidak masuk bundle. Viewer punya chunk sendiri (`WorkbookViewer-*.js` 39,52 kB, gzip 13,84 kB). Keduanya di-fetch saat section berjarak ≤ 600 px dari viewport (IntersectionObserver), atau langsung bila URL menyebut sheet/sel. Waktu klik ke formula bar diukur dengan `performance.now()`. Bila chunk atau JSON gagal dimuat, muncul pesan gagal, sementara Method dan unduhan tetap tampil. | "fetches the workbook only when the section nears the viewport…", "keeps the Method panel and the download when the workbook does not load…"; e2e "a click on a cell reaches the formula bar in under 50 ms" (run ini: 5,6–20,4 ms ke DOM, ≤ 46,2 ms ke frame berikutnya) |
| R4.8 verifikasi angka | Build test: 300 sel formula ber-seed (nilai cache dan formula sama dengan hasil baca ulang exceljs), 33 sheet dan 15.485 formula sebelum sanitasi, 31.843 sel bernilai (bukan ~17 ribu seperti di PRD, lihat Pertentangan), 49 sel error, merah/biru. Parser: 50 formula nyata ber-seed. e2e `tests/e2e/workbook.spec.ts` (11 kasus): `Consol SoFP 24!D9` menampilkan `=D114+D53` dengan dua precedent ber-outline; lompat ke `Elimination 2024` lalu Back. | `workbookBuild.test.ts` (9 tes), `workbookRefs.test.ts`, output e2e di bawah |
| R4.9 kesamaan dengan Section 06 | Token dan legenda FIA dipakai langsung (`text-fia-sourced`, `LENS_ROLES`, `formatNumber`, `colLetter`). Tidak ada primitif yang diekstrak ke `src/components/workbook/primitives/` (R4.9 membolehkan, tidak mewajibkan). `ModelGrid` dan kontrak v3.1 tidak disentuh: `git diff 0487609..HEAD -- src/components/finance-in-action src/lib/finance-in-action` kosong. | typecheck dan seluruh suite FIA hijau |
| Langkah 8 (dokumen) | Entri `docs/DECISIONS.md` 2026-10-10 (dilengkapi di `d8a81b0`); baris `/accounting/consolidated-reporting` di `docs/ROUTE_VERIFICATION.md`. | — |

Halaman lain yang ikut berubah:
- Baris Consolidated Reporting di `/accounting` (`src/pages/Accounting.tsx`) sekarang menjelaskan workbook (OWNER-REPLACEABLE).
- Dua kalimat pembuka halaman yang menjelaskan tabel lama dihapus (lihat Keputusan 13).

## Verifikasi (output mentah, 10 Oktober 2026, di HEAD `d8a81b0`)

Lint (`npx eslint . --max-warnings=35`; baseline 22 warning, tidak satu pun dari file workbook):
```
✖ 22 problems (0 errors, 22 warnings)

lint exit=0
```
Typecheck (`npm run typecheck`):
```
> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force

typecheck exit=0
```
`npm run check:world`:
```
> vite_react_shadcn_ts@0.0.0 check:world
> node scripts/world/check-engine.mjs

40 files · 37 wired from the entry · 3 pending
pending (not wired from the entry): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts
wired files clean
load order ok
no Factory Yard code in src/
check:world exit=0
```
Unit penuh (`TZ=America/Chicago npx vitest run --reporter=dot --reporter=json --outputFile=…/vitest.json`), lalu `node scripts/assert-test-count.mjs …/vitest.json`:
```
 Test Files  88 passed (88)
      Tests  1197 passed (1197)
   Start at  05:38:31
   Duration  144.71s (transform 7.01s, setup 18.14s, collect 25.97s, tests 299.20s, environment 47.70s, prepare 8.33s)

vitest exit=0
assert-test-count: 1197 tests, 0 failed, 0 failed suite(s) (floor 1193)
assert-test-count: ok
assert exit=0
```
E2E penuh (`CI=1 flock /tmp/claude-0/e2e.lock npx playwright test`), baris workbook dan ringkasan:
```
  ✓  42 [chromium] › tests/e2e/smoke.spec.ts:56:3 › renders Consolidated reporting (/accounting/consolidated-reporting) (1.2s)
  ✓  76 [chromium] › tests/e2e/workbook.spec.ts:120:3 › the working paper viewer at 1440 › Consol SoFP 24!D9 shows =D114+D53 and outlines its two precedents (5.1s)
  ✓  78 [chromium] › tests/e2e/workbook.spec.ts:185:3 › the working paper viewer at 1440 › a click on an empty cell a label runs on into selects that cell, as in Excel (1.6s)
click-to-inspect, ms (to the DOM / to the next frame): E9 10.4/15.7, D15 8.4/25.3, D17 5.6/17.0, D9 9.7/46.2, D18 11.0/15.6, E9 11.1/12.6, D23 20.4/24.0, D9 9.4/12.7
  ✓  79 [chromium] › tests/e2e/workbook.spec.ts:203:3 › the working paper viewer at 1440 › a click on a cell reaches the formula bar in under 50 ms (2.2s)
  ✓  80 [chromium] › tests/e2e/workbook.spec.ts:246:3 › the working paper viewer at 1440 › a link with ?sheet=&cell= opens that cell (1.6s)
  ✓  81 [chromium] › tests/e2e/workbook.spec.ts:256:3 › the working paper viewer at 1440 › a link opens the page at the viewer, the cell it names on screen (1.6s)
  ✓  82 [chromium] › tests/e2e/workbook.spec.ts:263:3 › the working paper viewer at 1440 › an error cell shows its error, in colour and in words (1.9s)
  ✓  77 [chromium] › tests/e2e/workbook.spec.ts:157:3 › the working paper viewer at 1440 › a reference to 'Elimination 2024' jumps there and Back returns (13.9s)
  ✓  83 [chromium] › tests/e2e/workbook.spec.ts:278:3 › the working paper viewer at 1440 › the arrows move the selection (3.2s)
  ✓  85 [chromium] › tests/e2e/workbook.spec.ts:335:3 › the working paper viewer at 390 › a link opens the page at the viewer, the cell it names on screen below the frozen rows (1.6s)
  ✓  86 [chromium] › tests/e2e/workbook.spec.ts:343:3 › the working paper viewer at 390 › the inspector is a bottom sheet and the tabs scroll (2.1s)
  ✓  84 [chromium] › tests/e2e/workbook.spec.ts:311:3 › the working paper viewer with the browser throttling history updates › a held arrow key moves the selection 260 rows, and the URL follows (13.0s)

  86 passed (1.6m)
e2e exit=0
```
`test:e2e:world` tidak dijalankan, karena tidak ada file di `src/world`, `src/components/world`, `src/lib/world`, `scripts/world`, atau `playwright.world.config.ts` yang berubah (`git diff --stat 0487609..HEAD -- …` kosong).

Build (`flock /tmp/claude-0/e2e.lock sh -c 'VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'`). Peringatan chunk > 500 kB berasal dari `editor-*.js` (871,67 kB), yang sudah ada sebelum fase ini:
```
dist/assets/pt-dummy-psak-338-CK0vr-V0.xlsx            601.13 kB
dist/assets/ConsolidatedReporting-Bp2dAHzH.js           13.89 kB │ gzip:   5.36 kB
dist/assets/WorkbookViewer-fByuDCAI.js                  39.52 kB │ gzip:  13.84 kB
✓ built in 14.54s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
build exit=0
```
Data sheet tidak ada di chunk JS mana pun, dan JSON disalin dari `public/`:
```
$ grep -l "Consol SoFP 24" dist/assets/*.js; echo "grep exit=$?"
grep exit=1
$ ls -l dist/consolidation/
-rw-r--r-- 1 root root 1701069 Oct 10 10:43 pt-dummy-psak-338.workbook.json
$ gzip -9c public/consolidation/pt-dummy-psak-338.workbook.json | wc -c
308927
```
Grep angka ticker (hasilnya harus kosong):
```
$ git grep -nE "\b(PTBA|ITMG|INTP|SMGR)\b" -- src public tests scripts supabase | grep -E "[0-9]{1,3}([.,][0-9]{3})+" ; echo "exit=$?"
exit=1
```
Pemeriksaan ulang file workbook yang di-commit (D15–D16):
```
$ python3 -I -c "<openpyxl: hitung sel bernilai, formula, teks kosong>" docs/consolidation/source/pt-dummy-psak-338.xlsx
31843 15485 119
$ soffice --headless --convert-to ods … pt-dummy-psak-338.xlsx; unzip -p pt-dummy-psak-338.ods content.xml | grep -o '<table:table table:name="[^"]*"' | wc -l
convert …/pt-dummy-psak-338.xlsx as a Calc document -> …/pt-dummy-psak-338.ods using filter : calc8
33
$ unzip -p … docProps/core.xml
…<dcterms:created xsi:type="dcterms:W3CDTF">2025-07-27T05:29:47Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2025-12-23T08:53:40Z</dcterms:modified></cp:coreProperties>
$ grep -o "<definedName [^>]*>" xl/workbook.xml | wc -l
4
$ git rev-list --objects 0487609..HEAD | grep -iE "\.xlsx$"
d511c76c9417cb84684ca879a8d4e83eec2c3ac5 docs/consolidation/source/pt-dummy-psak-338.xlsx
$ sha256sum docs/consolidation/source/pt-dummy-psak-338.xlsx
cda94c8ede22a84a749d9d1f5ba493445ef44b1d73d4b3c4bdadc51c73d6c2db  docs/consolidation/source/pt-dummy-psak-338.xlsx
```

## Screenshot

Semua screenshot diambil dari mock Playwright (`tests/e2e/mockSupabase.ts`, data seed dummy) pada bundle production, memakai spec sementara yang sudah dihapus. Screenshot Vercel Preview akan ditambahkan orkestrator setelah PR dibuat. Folder: `docs/sweep-2026-10/screenshots/e/`.

Dua catatan:
- Screenshot `e3-*` diambil di langkah E3. Yang memuat panel Method masih menampilkan baris sumber lama; baris sumber yang sekarang terlihat di `e5-method-panel-source-line-*`.
- Header situs di semua screenshot masih memuat "About", karena fase C (yang menghapusnya) ada di branch lain.

| File | Isi | Sumber |
|---|---|---|
| `e3-viewer-sofp-default-1440.png` | Viewer saat dibuka: sheet SOFP, A1 terpilih, inspector di kanan, legenda dan toolbar di atas grid | mock Playwright |
| `e3-viewer-consol-sofp-24-d9-1440.png` | `Consol SoFP 24!D9`: formula bar `=D114+D53`, nilai `–` merah, inspector dengan dua chip precedent dan kalimat tipe merah D10 | mock Playwright |
| `e3-precedents-outlined-sofp-j22-1440.png` | `SOFP!J22` `=SUM(J12:J20)`: rentang precedent ber-outline putus-putus, dependent `J35` | mock Playwright |
| `e3-cross-sheet-jump-elimination-2024-g82-1440.png` | Setelah lompat antar-sheet ke `Elimination 2024!G82`: tombol Back, chip `'Detail Elimination BS'!L12` dengan ikon lompat, dependent G2/H83/I84 diberi warna | mock Playwright |
| `e3-error-cell-cf-23-restated-o4-1440.png` | Sel error `CF 23 Restated!O4` `#REF!` dengan isian error dan kalimat D8 di inspector | mock Playwright |
| `e3-full-screen-1440.png` | Viewer full screen (Fullscreen API): toolbar, tab, grid, dan inspector | mock Playwright |
| `e3-inspector-bottom-sheet-390.png` | 390: inspector sebagai bottom sheet untuk `Consol SoFP 24!D9` | mock Playwright |
| `e3-viewer-consol-sofp-24-390.png` | 390: `Consol SoFP 24!H9` dengan formula bar dan tombol Inspector; tab bisa digeser | mock Playwright |
| `e3-legend-and-method-390.png` | 390: legenda di bawah grid dan awal panel Method (baris sumber lama) | mock Playwright |
| `e3-load-failure-1440.png` | JSON gagal dimuat: pesan gagal, sementara panel Method dan tombol Download .xlsx tetap tampil (baris sumber lama) | mock Playwright |
| `e3-method-panel-1440.png` | Panel Method lengkap: sumber (baris lama), tahun, nilai cache, sheet D9, 49 sel error per sheet, baris/kolom tersembunyi, konvensi angka, unduhan | mock Playwright |
| `e4-hero-sheet-sofp-390.png` | 390: sheet pertama (SOFP) saat dibuka, dengan judul, lede, toolbar, dan tab | mock Playwright |
| `e4-error-cell-cf-23-restated-o4-inspector-390.png` | 390: sel error `CF 23 Restated!O4` dengan inspector bottom sheet | mock Playwright |
| `e4-cross-sheet-jump-elimination-2024-g82-390.png` | 390: setelah lompat ke `Elimination 2024!G82`, dengan tombol Back di formula bar | mock Playwright |
| `e4-link-opens-at-viewer-consol-sofp-24-d9-1440.png` | Tautan `?sheet=Consol SoFP 24&cell=D9` membuka halaman langsung di viewer, D9 terpilih | mock Playwright |
| `e4-link-opens-at-viewer-consol-sofp-24-d9-390.png` | Sama di 390: D9 terlihat di bawah baris frozen | mock Playwright |
| `e5-frozen-rows-on-their-columns-consol-sofp-24-d9-1440.png` | Baris frozen sejajar dengan kolomnya (setelah perbaikan sudut frozen) | mock Playwright |
| `e5-frozen-rows-on-their-columns-consol-sofp-24-d9-390.png` | Sama di 390: kolom frozen dilepas tanpa bergeser 2 px | mock Playwright |
| `e5-click-under-run-on-label-selects-c15-1440.png` | Klik di bagian label yang meluber ke C15 memilih C15 ("Empty in the workbook."), seperti di Excel | mock Playwright |
| `e5-click-under-run-on-label-selects-c15-390.png` | Sama di 390 | mock Playwright |
| `e5-jump-past-last-row-consol-sofp-23-22-k131-1440.png` | Lompat ke `'Consol SoFP 23 & 22'!K131`, di bawah baris bernilai terakhir, mendarat tepat di K131 dengan tombol Back | mock Playwright |
| `e5-jump-past-last-row-consol-sofp-23-22-k131-390.png` | Sama di 390, dengan inspector bottom sheet | mock Playwright |
| `e5-excel-rounding-bs-rp-2023-z29-1440.png` | `-BS-RP Disclosure 2023!Z29` tampil `52.876.483.666` seperti di Excel (nilai mentah `…665.49999`), dengan empat precedent berupa rentang | mock Playwright |
| `e5-excel-rounding-bs-rp-2023-z29-390.png` | Sama di 390 | mock Playwright |
| `e5-method-panel-source-line-1440.png` | Panel Method dengan baris sumber sekarang: "Source: Dika Gustiana's dummy PSAK 338 consolidation workbook for PT Dummy C …" | mock Playwright |
| `e5-method-panel-source-line-390.png` | Sama di 390, dengan legenda di atasnya | mock Playwright |
| `e5-accounting-landing-consolidated-reporting-row-1440.png` | `/accounting`: baris Consolidated Reporting dengan deskripsi baru, standing "1 worked example" | mock Playwright |
| `e5-accounting-landing-consolidated-reporting-row-390.png` | Sama di 390 | mock Playwright |

Tidak ada screenshot mode gelap, karena situs light only (lihat Pertentangan).

## Keputusan yang saya ambil sendiri

1. **Baris dan kolom tersembunyi tetap digambar** dengan ukuran yang tersimpan, header-nya diarsir dan tercantum di legenda; tidak diciutkan seperti di Excel. Alasan: setiap sel yang dibaca formula harus bisa dilihat dan dipilih.
2. **Inspector**: di layar ≥ 1024 px menjadi panel kanan yang terbuka sejak awal; di layar sempit menjadi bottom sheet yang awalnya tertutup. Dibuka dengan Enter, klik pada sel yang sudah terpilih, atau tombol Inspector di formula bar; ditutup dengan Esc atau X. Alasan: di ponsel, bottom sheet yang selalu terbuka menutupi separuh grid.
3. **URL dan riwayat**: pindah sheet menambah entri riwayat; gerak sel di sheet yang sama mengganti entri (replace). Posisi disimpan di state viewer dan ditulis ke URL paling sering sekali per 300 ms; bila browser menolak penulisan, penolakan itu ditangkap. Alasan: Chrome membuang update riwayat lewat sekitar 200 per 10 detik dan Safari melempar error lewat 100, sehingga tombol panah yang ditahan membekukan seleksi. Viewer juga punya stack Back sendiri (≤ 50) untuk chip, lompat antar-sheet, dependent, dan Go To. Setiap sheet dibuka kembali di sel terakhir yang dipilih di sana.
4. **Scroll**: lompatan (chip, Go To, Back) menempatkan sel tujuan di tengah; gerak dengan keyboard hanya menggulir seperlunya, seperti di Excel. Freeze pane diikuti, tetapi dilepas bila memakan lebih dari 60 % lebar atau 50 % tinggi grid. Alasan: di ponsel, freeze 3 kolom mengisi seluruh layar.
5. **Area sheet** diperluas sampai setiap sel yang dirujuk formula. Dengan begitu, lompatan ke sel di bawah baris bernilai terakhir (mis. `'Consol SoFP 23 & 22'!K131`) mendarat di sel itu, bukan di sel lain yang kemudian formulanya keliru ditampilkan.
6. **Pembulatan seperti Excel**: angka dibulatkan pada desimal 15 digit, half away from zero, sebelum diformat. Alasan: `toFixed` membulatkan nilai biner, dan tiga sel menampilkan digit terakhir yang berbeda dari Excel (…665 vs …666).
7. **`CF 23 as Restated`** dibekukan di Excel dengan tampilan yang dimulai dari A5. Viewer menghitung freeze dari A1 (baris 1–8). Perbedaan ini dicatat di `build-report.md`, karena membekukan baris 1–12 akan mengisi lebih dari separuh grid di laptop.
8. **Tidak ada primitif yang diekstrak** (R4.9 membolehkan, tidak mewajibkan). Tidak ada komponen yang benar-benar dipakai bersama `ModelGrid` tanpa merombaknya. Viewer memakai `LENS_ROLES`, token `--fia-*`, `formatNumber`, dan `colLetter` milik FIA secara langsung.
9. **Angka yang diketik** memakai warna sourced FIA (R4.9: token dan legenda yang sama). Biru D10 adalah biru lain yang mirip: 24 dari 32 sel birunya berupa label, 8 berupa angka hasil formula. Keduanya juga disebut dengan kata-kata di nama aksesibel sel dan di inspector. Pilihan akhirnya dicatat sebagai keputusan terbuka untuk Dika.
10. **Full screen** memakai Fullscreen API pada viewer saja. Bila API ditolak, viewer mengisi halaman dengan posisi fixed, dan Esc keluar dari mode itu. F11 tidak dicegat; tombol mengikuti `document.fullscreenElement`, jadi full screen milik browser tidak mengacaukannya. Label tetap "Full screen" dengan `aria-pressed`; string "Exit full screen" dari WIP dibuang.
11. **Download** berupa `<a download>` ke xlsx yang di-commit, diimpor dengan `?url` Vite. Hasilnya hanya ada satu binary di repo, disajikan sebagai aset same-origin ber-hash dengan nama D11. CSP tidak perlu diubah.
12. **Pemuatan**: `rootMargin` 600 px. Bila URL menyebut sheet atau sel, viewer langsung dimuat dan halaman langsung dibuka di viewer (lompatan instan, bukan smooth scroll yang bisa terhenti oleh klik pertama pembaca).
13. **Dua kalimat pembuka halaman dihapus**: "This working paper shows how that is done, step by step, on an illustrative four-entity group under PSAK 110. The figures are round numbers, not a company's accounts." Keduanya menjelaskan tabel yang sudah dihapus, jadi tidak lagi benar. Tidak diberi pengganti, supaya tidak ada teks karangan.
14. **Baris Consolidated Reporting di `/accounting`** masih menjelaskan tabel PSAK 110 lama. Teksnya diganti dengan kalimat yang disusun dari judul dan lede R4.6, ditandai OWNER-REPLACEABLE. Standing tetap "1 worked example".
15. **Header baris/kolom dan tab yang tidak aktif** dipindah dari `--secondary` ke `--background`. Teks muted di atas `--secondary` terukur 4,42:1 (di bawah AA); di atas `--background` 4,82:1.
16. **Tata letak**: di layar sempit legenda diletakkan di bawah grid, supaya grid tidak terdorong satu layar ke bawah; di layar lebar legenda dan toolbar di atas grid, seperti di referensi. Status "Copied" diletakkan di bawah toolbar, di luar barisnya, sehingga selalu tersedia bagi pembaca layar tanpa memakan tempat.
17. **Daftar di panel Method** (sheet D9 dan 49 sel error) ditulis di `src/lib/workbook/method.ts`, supaya panel tetap tampil tanpa JSON; sebuah tes memastikan isinya sama dengan JSON. JSON tetap satu file 1,7 MB, di bawah batas 4 MB R4.7.
18. **Baris sumber di Method** menyebut workbook sebagai milik Dika (R4.6: "workbook dummy buatan Dika") dan menulis "PT Dummy C" seperti judul R4.6, bukan "PT Dummy - C" seperti di sel workbook. Tetap OWNER-REPLACEABLE.
19. **Di langkah ini**: entri `docs/DECISIONS.md` fase E dilengkapi (`d8a81b0`) dengan nomor baris entri yang digantikan (`:94` di `0487609`), pelaksanaan D15–D17, perubahan halaman di sekitar viewer, R4.9, dan waktu klik terbaru (≤ 46 ms ke frame berikutnya di run ini; entri sebelumnya menulis 41 ms).

## Pertentangan PRD/prompt/repo

1. **Profil workbook di PRD §1.2.4 berbeda dengan file.** Jumlah sheet (33) dan formula (15.485) cocok. Selebihnya berbeda:
   - Sel: PRD "~17 ribu"; terukur 31.843 sel bernilai (15.485 formula + 16.358 konstanta; 31.789 di sheet yang dipublikasikan). exceljs dan openpyxl menghitung sama.
   - Font merah: PRD 969; terukur 1.532 (969 argb `FFFF0000` + 563 indexed 10).
   - Font biru: PRD 30; terukur 32 (30 argb `FF0000FF` + 2 indexed 12).
   Angka PRD tampaknya hanya menghitung satu cara penulisan warna. Tes memakai angka terukur, dan `build-report.md` menaruh keduanya berdampingan.
2. **Mode gelap (R4.5) dan screenshot mode gelap (Bagian 3 Phase E langkah 7) bertentangan dengan repo.** Situs light only sejak entri `docs/DECISIONS.md` 2026-10-09 "Light only, stated" (palet `.dark` sudah dihapus). Jadi "mode gelap mengikuti token situs" berarti tidak ada mode gelap, dan tidak ada screenshot gelap.
3. **R4.7 "Halaman tanpa viewer (JS gagal)" dan arsitektur situs.** Situs ini SPA, dan `scripts/prerender.mjs` hanya me-render rute essay. Kriteria ini saya tafsirkan sebagai: bila chunk viewer atau JSON gagal dimuat, Method dan unduhan tetap tampil (sudah diuji). Dengan JavaScript mati sama sekali, halaman ini tidak tampil, sama seperti semua halaman non-essay.
4. **Ukuran sheet di R4.3** ("399 baris × 33 kolom dan 1015 baris × 23 kolom") berasal dari `<dimension>` yang tersimpan di XML sheet (SOFP `A1:W1015`, `-BS-RP Disclosure 2023` `A1:AB399`, `BS RP Disclosure 2024` `A1:AG348`), yang ikut menghitung baris yang hanya berformat. Dimensi yang dipublikasikan adalah sel bernilai dan merge (SOFP `A1:P81`), diperluas sampai sel yang dirujuk formula. Desain tidak berubah karena grid tervirtualisasi untuk ukuran berapa pun.
5. **Bagian 3 Phase E langkah 1** meminta `Company_models__PTBA.html` di-commit apa adanya, sedangkan keputusan owner D17 (yang lebih baru) meminta DATA block dikosongkan. Yang dijalankan adalah D17.
6. **R4.4 "F11/tombol untuk full screen"**: tombol memakai Fullscreen API; F11 dibiarkan dipakai browser (full screen seluruh jendela), dan tombol mengikuti status itu. Mencegat F11 berarti mengambil alih tombol milik browser.
7. **R4.1 "freeze pane"**: satu sheet (`CF 23 as Restated`) dibekukan saat tampilannya sedang tergulir. exceljs tidak membaca titik awal tampilan, jadi builder membacanya dari XML sheet dan melaporkan perbedaannya (lihat Keputusan 7).

## Yang menunggu Dika

Fase ini tidak butuh migrasi, `apply_migration`, regenerasi types, atau langkah Vercel. Yang dibutuhkan dari Dika:

1. **Arti warna D10.** Buka `docs/consolidation/build-report.md`, bagian "Font colours (D10)", tabel "Ten red cells" dan "Ten blue cells". Bila maknanya salah, tulis koreksi di `docs/sweep-2026-10/DECISIONS.md` (baris D10) lewat PR. String yang ikut berubah ada di `src/lib/workbook/copy.ts:42,44,106,108`.
2. **Biru D10 vs biru angka yang diketik.** Pilih salah satu (lihat entri `docs/DECISIONS.md` 2026-10-10, bagian "D8 to D11 as built"):
   - (a) angka yang diketik digambar dengan warna tinta biasa, sehingga legenda viewer berbeda dari Finance in Action; atau
   - (b) warna D10 diberi tanda kedua di samping warnanya.
   Sampai Dika memilih, tidak ada yang diubah.
3. **29 catatan kerja** (`build-report.md`, bagian "Work notes (R4.2): 29": `oke`, `ok`, `n`, `l` di 29 sel). Putuskan apakah dihapus di Excel atau dibiarkan. Situs tidak mengubah workbook.
4. **Selisih profil PRD** (Pertentangan 1). Konfirmasi bahwa ~17 ribu sel, 969 merah, dan 30 biru dibaca sebagai 31.843, 1.532, dan 32, atau sebutkan cara hitung yang dimaksud.
5. **Kode tiga huruf** yang masih ada di workbook (STL, PSD, KLI, SLL, SLB, ALI). Bila ingin dihapus juga, sampaikan di sesi dan sertakan file asli. Skrip sanitasi hanya menerima file asli (sha256-nya dipatok), jadi daftar alamatnya diperluas, lalu `npm run sanitize:workbook` dan `npm run build:workbook` dijalankan ulang dan hasilnya di-commit bersama.
6. **Light only.** Konfirmasi bahwa viewer tetap tanpa mode gelap (Pertentangan 2). Mode gelap adalah keputusan untuk seluruh situs, bukan untuk fase E saja.
7. **Teks OWNER-REPLACEABLE** (35 string, daftarnya di bawah). Setujui atau ganti di `src/lib/workbook/copy.ts` dan `src/pages/Accounting.tsx`.
8. **Bila workbook diganti** (karena butir 3, butir 5, atau perbaikan 49 sel error D8, yang memang pekerjaan Dika di luar sweep), nama-nama di file baru perlu ditinjau ulang di sesi, lalu:
   ```
   cp <file-bersih>.xlsx docs/consolidation/source/pt-dummy-psak-338.xlsx
   npm run build:workbook
   TZ=America/Chicago npx vitest run tests/unit/workbookBuild.test.ts tests/unit/workbookViewer.test.tsx tests/unit/workbookRefs.test.ts tests/unit/workbookFormat.test.ts
   ```
   Tes akan gagal sampai `src/lib/workbook/method.ts` (daftar sheet D9 dan sel error) dan angka di `tests/unit/workbookBuild.test.ts` disesuaikan dengan `build-report.md` yang baru. xlsx, JSON, dan build report di-commit bersama.
9. **Review dan merge PR fase E**, setelah orkestrator menambahkan screenshot Vercel Preview.

## Yang tidak terverifikasi

- **Screenshot Vercel Preview**: belum ada, karena PR belum dibuat. Orkestrator menambahkannya setelah PR ada.
- **Fullscreen API bersama F11 di browser headed**: Chromium headless memang masuk full screen untuk screenshot, tetapi mode isi-halaman (fallback) hanya diuji di tes unit.
- **Vercel Analytics**: belum diketahui apakah skrip remote-nya menghitung `replaceState` (gerak sel) sebagai page view. Ini tidak bisa diperiksa offline.
- **Clipboard di browser nyata**: hanya diuji unit dengan `navigator.clipboard` tiruan.
- **Pembaca layar**: tidak ada assistive technology yang dijalankan; role dan `aria-label` hanya diuji unit.
- **Browser lain**: e2e hanya berjalan di Chromium. Batas riwayat Safari (error lewat 100 update per 10 detik) hanya diuji lewat tes unit yang menolak penulisan. Firefox dan Safari tidak dijalankan.
- **Klik < 50 ms di laptop nyata**: diukur di Chromium headless di container ini (4 core, dipakai bersama agen lain): 5,6–20,4 ms ke DOM dan ≤ 46,2 ms ke frame berikutnya. Waktu ke frame berikutnya ikut bergantung pada beban mesin.
- **Perbandingan file asli vs file bersih (D15–D16)**: dijalankan orkestrator dengan file asli, yang sengaja tidak ada di repo maupun di sesi ini. Saya hanya mengulang pemeriksaan sisi file yang di-commit (lihat bagian Verifikasi). `npm run sanitize:workbook` tidak bisa dijalankan ulang di sini karena butuh file asli.

## Kandidat pembersihan

- `docs/consolidation/reference/Company_models__PTBA.html` (1.408 baris, DATA kosong) hanya berfungsi sebagai referensi visual. Bisa dihapus setelah Dika menyetujui tampilan viewer; README di `docs/consolidation/` ikut disesuaikan.
- `scripts/consolidation/sanitize-workbook.ts` dan skrip `sanitize:workbook` hanya bisa berjalan pada file asli, yang tidak ada di repo. Saat ini disimpan sebagai catatan cara file dibersihkan, dan bisa dihapus bila tidak akan dipakai lagi (lihat "Yang menunggu Dika" butir 5).
- Screenshot `e3-legend-and-method-390.png`, `e3-method-panel-1440.png`, dan `e3-load-failure-1440.png` memperlihatkan baris sumber Method yang lama, dan sudah digantikan `e5-method-panel-source-line-*`. Boleh dihapus atau dibiarkan sebagai riwayat.
- Ekspor yang hanya dipakai di modulnya sendiri: `ZOOM`, `colWidthPx`, `rowHeightPx`, dan `decodeArea` di `src/lib/workbook/sheet.ts`. Perubahan kecil: bisa dijadikan lokal.

## Text awaiting the owner

Setiap string yang dibaca pengunjung dan bertanda OWNER-REPLACEABLE, dengan file:baris dan teks default-nya (35):

| File:baris | Kunci | Teks default |
|---|---|---|
| `src/lib/workbook/copy.ts:18` | `lede` | The full consolidation workbook, sheet by sheet. Click a cell to see its formula and follow where it comes from. (default PRD R4.6) |
| `src/lib/workbook/copy.ts:32` | `copyFailed` | This browser did not allow copying. |
| `src/lib/workbook/copy.ts:36` | `legendConstant` | from the workbook (istilah R4.5) |
| `src/lib/workbook/copy.ts:38` | `legendFormula` | formula (R4.5) |
| `src/lib/workbook/copy.ts:40` | `legendError` | error (R4.5) |
| `src/lib/workbook/copy.ts:42` | `legendRed` | red type: an adjustment or a reviewer's flag (D10) |
| `src/lib/workbook/copy.ts:44` | `legendBlue` | blue type: a manual input (D10) |
| `src/lib/workbook/copy.ts:46` | `legendHidden` | hidden in the workbook |
| `src/lib/workbook/copy.ts:60` | `backTo` | Back to {address} |
| `src/lib/workbook/copy.ts:62` | `noSuchCell` | No such cell in this workbook. |
| `src/lib/workbook/copy.ts:66` | `gridKeys` (pembaca layar) | Arrow keys move; Enter opens the inspector; Ctrl+G goes to a cell. |
| `src/lib/workbook/copy.ts:68` | `hiddenHeader` (pembaca layar) | {name}, hidden in the workbook |
| `src/lib/workbook/copy.ts:76` | `openInspector` | Open the inspector |
| `src/lib/workbook/copy.ts:86` | `dependents` | Dependents on this sheet (R4.4) |
| `src/lib/workbook/copy.ts:88` | `emptyCell` | Empty in the workbook. |
| `src/lib/workbook/copy.ts:90` | `typedValue` | Typed into the workbook, not worked from other cells. |
| `src/lib/workbook/copy.ts:92` | `errorNote` | Excel could not work this cell out; the error is the workbook's own and is shown as Excel shows it. (D8) |
| `src/lib/workbook/copy.ts:94` | `notPublished` | not published: hidden or empty in the workbook (D9) |
| `src/lib/workbook/copy.ts:96` | `noSuchSheet` | no such sheet in the workbook |
| `src/lib/workbook/copy.ts:98` | `noPrecedents` | None: the formula reads no cell. |
| `src/lib/workbook/copy.ts:100` | `noDependents` | No formula on this sheet reads this cell. |
| `src/lib/workbook/copy.ts:102` | `more` | and {n} more |
| `src/lib/workbook/copy.ts:104` | `goTo` (pembaca layar) | Go to {address} |
| `src/lib/workbook/copy.ts:106` | `fontRed` | Red type in the workbook: an adjustment or a reviewer's flag. (D10) |
| `src/lib/workbook/copy.ts:108` | `fontBlue` | Blue type in the workbook: a manual input. (D10) |
| `src/lib/workbook/copy.ts:110` | `empty` (pembaca layar) | empty |
| `src/lib/workbook/copy.ts:114` | `loading` | Loading the workbook… |
| `src/lib/workbook/copy.ts:116` | `failedTitle` | The workbook viewer did not load |
| `src/lib/workbook/copy.ts:118` | `failedMessage` | The method below and the .xlsx download do not depend on it. (R4.7) |
| `src/lib/workbook/copy.ts:127-128` | `methodSource` | Source: Dika Gustiana's dummy PSAK 338 consolidation workbook for PT Dummy C and its subsidiaries. Its figures are dummy: they are not any company's data. (R4.6) |
| `src/lib/workbook/copy.ts:130` | `methodYears` | Years: 2022, 2023 and 2024. |
| `src/lib/workbook/copy.ts:134` | `methodExcluded` | Sheets left out because the workbook hides them or they hold nothing: (D9; alasan "hidden" / "empty" di `:136`) |
| `src/lib/workbook/copy.ts:138` | `methodErrors` | {n} cells show an Excel error, kept as the workbook has them: (D8) |
| `src/lib/workbook/copy.ts:140` | `methodHidden` | Rows and columns the workbook hides are shown, with their headers hatched. |
| `src/pages/Accounting.tsx:12-13` | `CONSOLIDATED_REPORTING_ROW` | The PSAK 338 working paper of PT Dummy C and its subsidiaries, sheet by sheet: click a cell to see its formula and follow where it comes from. |

String berikut bukan OWNER-REPLACEABLE, karena dikutip dari PRD atau sudah ada di repo:
- judul "Working paper: PT Dummy C and its subsidiaries, PSAK 338" (R4.6);
- "Figures are Excel's own calculated values; the viewer does not recalculate." (R4.3, verbatim);
- "Full screen", "Copy cell address", "Name box", "Formula bar", "Back", "Value", "Raw value", "Formula", "Precedents", "Method" (R4.3, R4.4, R4.6);
- "Download .xlsx", "Inspector", "Close the inspector", "Sheets", "Cell legend", "{sheet} sheet", "Feeds the selection", "Fed by the selection", dan kalimat konvensi angka (konstanta dan copy Finance in Action);
- "Copied" (`ShareButton`);
- nama file unduhan `pt-dummy-psak-338-working-paper.xlsx` (D11).
