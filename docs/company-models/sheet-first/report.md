# Laporan: halaman model sheet-first

Spesifikasi: `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `PLAN.md` di folder ini (D-S1 sampai D-S9 disetujui Dika
24 Okt 2026). Dikerjakan 24 Okt 2026 di sesi Claude Code cloud, dengan fixture SYNTHETIC
(`VITE_FIA_PREVIEW=true`). Keputusan dicatat juga di `docs/DECISIONS.md` (entri 2026-10-24).

## 1. Branch, SHA dan commit

- Start: `b8044af` (origin/main, "Merge pull request #78 from dikagustiana/feat/fia-coal-cement-link").
- Branch: `claude/jolly-fermi-uwickk`, bukan `feat/fia-sheet-first` seperti di PLAN: sesi cloud ini hanya boleh
  push ke branch tersebut. Isinya sama dengan yang direncanakan untuk `feat/fia-sheet-first`.

| Fase | Commit | Isi |
|---|---|---|
| S1 | `b79759e` docs(fia) | PRD, ARCHITECTURE, DESIGN, PLAN apa adanya |
| S2 | `a0c398c` feat(fia) | `view/sheetAddress.ts`: `addressOf`, `keyFromAddress`, `columnLetters`, `formulaBarContent` + test K2, K3, K4 |
| S7 (data) | `e56fb10` feat(fia) | `view/checksSheet.ts` + worksheet Checks di Download + test |
| S3–S6, S8 | `4a3145d` feat(fia) | Grid berchrome Excel, formula bar + kotak nama, footer (tab, zoom, status), kartu model baru, inspector di kartu, kepala halaman (pill, tab perusahaan, baris perusahaan), urutan seksi + navigasi seksi |
| S9 | `5351f09` test(fia) | Suite e2e preview `fia-sheet-first.spec.ts` (K1, K2, K6–K9), `playwright.fia.config.ts`, `@axe-core/playwright` |
| S10 | commit `docs(fia)` yang membawa laporan ini | Laporan, screenshot, entri DECISIONS |

S3 sampai S8 jadi satu commit, bukan satu per fase: grid, formula bar, footer, kartu, dan halaman saling
bergantung (props `ModelGrid` dan `ModelCard` berubah bersama halaman), jadi commit per fase tidak akan lolos
typecheck di tengah jalan. S7 dipecah: lapisan data dan export lebih dulu (berdiri sendiri), tampilannya ikut
commit grid.

## 2. Output pemeriksaan (Linux, Node 22, 24 Okt 2026)

Perintah sama dengan `.github/workflows/ci.yml`, dijalankan setelah commit terakhir kode:

| Perintah | Hasil |
|---|---|
| `npx eslint . --max-warnings=35` | 0 error, 22 warning (sama dengan baseline `b8044af`; tidak ada warning baru) |
| `npm run typecheck` | hijau |
| `TZ=America/Chicago npx vitest run` + `assert-test-count` | 110 file, 1489 test lulus (baseline 108 file, 1451 test); floor 1447 ok |
| `python3 -m unittest discover -s scripts/tests` | OK |
| `npm run check:world` | ok |
| `npm run build` (tanpa flag) | build hijau; `assert-no-synthetic` dan `assert-world-flag` lulus. Langkah `prerender` mencetak `essay fetch failed — HTTP 401` karena kunci Supabase palsu di sesi ini; perilaku lama, dicatat di `playwright.config.ts` |
| `VITE_FIA_LIVE=true vite build` + `assert-no-synthetic` | lulus: "none of 13 fixture values and no preview page chunk in dist/" |
| `VITE_FIA_PREVIEW=true vite build` + `assert-no-synthetic` | lulus (fixture diizinkan) |
| `npx playwright test -c playwright.fia.config.ts` | 12 test lulus |

Catatan e2e: Chromium di container ini revisi 1243, sedangkan `@playwright/test` 1.56.1 mencari revisi 1194.
Suite dijalankan lewat config pembungkus di luar repo yang hanya menambah `launchOptions.executablePath`;
config di repo tidak diubah untuk itu. CI tidak menjalankan e2e (tidak ada langkah e2e di `ci.yml`), sama seperti
`test:e2e:world`.

## 3. Kriteria terima

| # | Hasil | Bukti |
|---|---|---|
| K1 | **Lulus.** Di 1440×900 (fixture XCOA, dengan catatan SYNTHETIC) terlihat pill tahap, tab perusahaan, baris perusahaan, kartu angka, toolbar, formula bar, dan 15 baris data grid (baris bernomor 2–16) tanpa scroll | e2e `K1 … fifteen rows of the grid`; `screenshots/model-xcoa-1440.jpg`. Paket asli tanpa catatan provenance mendapat ±1 baris lagi |
| K2 | **Lulus.** Untuk 10 sel per sheet (Model, Reported, Assumptions, Checks): alamat kotak nama, huruf kolom dan nomor baris yang disorot di grid sama dengan sel di `.xlsx` hasil Download, yang memuat rumus yang sama (formula) atau angka yang sama (nilai), dan label baris yang sama di kolom A | unit `fiaSheetAddress.test.ts` (semua sel tiap fixture lewat `ADDRESSING`, 10 sampel per sheet dari ExcelJS, semua sel Checks); e2e `K2` (file Download dibuka ExcelJS) |
| K3 | **Lulus.** Formula bar sel formula = `=` + `cell.formula` persis, untuk setiap sel formula keempat fixture (>100 sel) | unit `the formula bar (K3)` |
| K4 | **Lulus.** `model!C5` (dan `MODEL!C5`, `'Model'!$C$5`, `c5` di sheet Model) memilih sel itu, fokus dan menggulirnya ke tampilan, berpindah sheet bila perlu; alamat salah (kolom A/B, baris 1, di luar sheet, sheet tak dikenal, bukan alamat) memberi pesan di bawah kotak, pilihan dan fokus tidak berpindah | unit `keyFromAddress (K4)`, `the formula bar and the name box`; e2e `the name box goes to a typed cell` |
| K5 | **Lulus.** Urutan tab = `companyRail()` (sub-industri dulu, lalu sisa tahap), aktif `aria-current="page"` bukan link, yang belum dimodelkan tidak di-link dan status glyph+kata, `?connections=on` terbawa di link | unit `the company tabs (… K5)` |
| K6 | **Lulus.** `pointer: fine`: tiap baris grid 28px (garis termasuk). `pointer: coarse` (emulasi sentuh): tombol sel ≥44px. Semua kontrol di luar grid (pill, tab, baris perusahaan, kartu model, navigasi seksi) ≥44×44px di keduanya | e2e `K6 … under a mouse`, `under a finger` |
| K7 | **Lulus.** Grid satu tab stop; panah/Home/End memilih; F2 dan Enter mengedit asumsi, Escape membatalkan dan fokus kembali ke sel; tab sheet dengan panah; Escape keluar full screen dan fokus kembali ke tombol | unit `the grid from the keyboard (K7)`, `full screen`; e2e `K7` |
| K8 | **Lulus (terang).** axe (wcag2a/aa, 2.1, 2.2 AA) pada `#main-content`: 0 pelanggaran di sheet Model, di Checks dengan sel terpilih, dan dengan Connections on + sel terpilih. Legenda berisi contoh angka + kata. Situs hanya terang (DECISIONS 2026-10-09), jadi tidak ada tema gelap untuk diperiksa | e2e `K8` |
| K9 | **Lulus.** 360, 768, 1024, 1440: `scrollWidth ≤ clientWidth` halaman, juga dengan sel terpilih (panel bawah) dan Connections on; grid sendiri menggulir di dalam kartunya | e2e `K9` ×4; `screenshots/model-xcoa-{360,768,1024,1440}.jpg` |
| K10 | **Lulus.** Test lama lulus atau diganti padanannya (§4); typecheck, lint, build, `assert-no-synthetic` hijau | §2 |

Temuan axe yang diperbaiki sebelum lulus: huruf kolom, nomor baris, dan tanda "forecast"/"year" memakai
`text-muted-foreground` di atas `bg-muted` seperti di DESIGN §4, dan kontrasnya gagal 4.5:1; diganti
`text-foreground` (DESIGN §4 mengizinkan ini bila kontras gagal). Status di tab perusahaan aktif juga.

## 4. Test lama yang diganti atau diubah

| Test lama | Padanan baru |
|---|---|
| `fiaModelTop` "the company rail …" (`RAIL_LABEL`) | "the company tabs …" (`COMPANY_TABS_LABEL`): urutan, `aria-current`, link hanya yang dimodelkan, status kata, + `?connections=on` (K5) |
| `fiaModelTop` "holds the tabs, the legend and Download …" | "holds the legend, the formula bar, the grid, the tabs under it and Download … in reading order" |
| `fiaModelPage` "names the company … quarters and status": teks `Q4 25; full statements to Q4 25` dan link pair di header | kalimat fakta `17 filings, Q1 24 to Q4 25; full statements to Q4 25; reported in rupiah.`; pair SCOA kini tab perusahaan, tidak diulang di baris perusahaan |
| `fiaModelPage` "has three tabs …" (`Reported, Model, Assumptions`, legenda dengan label kind) | empat tab `Model, Reported, Assumptions, Checks` (urutan PRD R2.4), Model aktif; legenda dengan kata DESIGN §6 dan arti tiap kind |
| `fiaExport` nama sheet | + `Checks` di akhir |

`tests/e2e/workbook.spec.ts` dan `tests/unit/workbookViewer.test.tsx` (disebut di ARCHITECTURE §7) adalah
viewer working paper konsolidasi (`/accounting/consolidated-reporting`), bukan FIA; tidak memakai `ModelGrid`,
jadi tidak diubah. Test e2e FIA ada di `tests/e2e/fia-sheet-first.spec.ts` yang baru.

Test baru: `fiaSheetAddress.test.ts` (12), `fiaChecksSheet.test.ts` (4), dan `fiaModelTop` dari 7 menjadi 24
test (huruf/nomor, formula bar, kotak nama, edit lewat formula bar, keyboard, zoom, status line, lens, lipat
inspector, Checks, urutan halaman, pill di halaman model, fakta perusahaan). `fiaQuality` (constraint 7: tanpa
literal angka di komponen) kini juga memeriksa delapan komponen baru.

## 5. S1: ukuran grid

| Paket | Periode | Baris per sheet (reported / model / assumptions) | Sel terbanyak per sheet |
|---|---|---|---|
| XCOA, SCOA (SYNTHETIC) | 11 | 13 / 26 / 12 | 286 |
| XCEM, SCEM (SYNTHETIC) | 11 | 12 / 26 / 12 | 286 |

Paket lokal di `C:\work\fia-models\*\package.json` tidak terjangkau dari sesi cloud ini dan belum ada paket
terbit (PRD §1.4), jadi PTBA belum diukur. Jauh di bawah ambang 5.000 sel; virtualisasi tidak dibuat. Baris
grid dipisah sebagai komponen `memo` (`SheetRow`), dan `markOf` di `useModelView` kini hanya berubah bersama
tanda lens, jadi memilih sel tanpa lens hanya merender ulang dua baris. Ukur ulang dengan PTBA di S11.

## 6. Penyimpangan dan keputusan kecil

- **Branch** (§1) dan **granularitas commit** (§1).
- **Kolom B beku mulai 640px.** Di ponsel (360–639px) kolom nomor + A (9rem) + B tidak menyisakan ruang untuk
  satu periode pun, jadi B ikut menggulir; A tetap beku (DESIGN §3).
- **Tanda "forecast" dan "year" pindah ke pita huruf kolom** (`L forecast`, `K year`); header periode satu baris
  dengan kata yang sama untuk pembaca layar. Ini yang memberi K1 ruang 15 baris. Garis putus forecast tetap.
- **Kotak nama 44px di pointer halus juga**, karena K6 meminta semua kontrol non-grid ≥44px.
- **Baris perusahaan dua baris kecil**: nama + badge, lalu sub-industri, kalimat fakta, status; link di baris
  kecil punya target 44px tanpa menambah tinggi baris. Pair hanya disebut bila tidak ada di tab perusahaan
  (mis. `YCEM, not yet modelled` di XCEM).
- **Kata legenda "Not disclosed"** (DESIGN §6); label kind di inspector tetap "Missing" (`CELL_KINDS`).
- **Baris gap**: belum ada definisi `gap_*` di kontrak atau fixture. Dipakai: baris yang id-nya diawali `gap_`
  adalah selisih yang dihitung model sendiri; setiap selnya satu pemeriksaan; "Agrees" bila |nilai| ≤ toleransi
  pembulatan paket (`roundingTolerance`), "Differs" bila lebih, "Not checked" bila kosong.
- **Selisih di Checks** ditulis dengan desimal angka yang diperiksanya, seperti di inspector (`2`, bukan `2,00`).
- **Posisi buka (D-S7)**: bila lebar tidak cukup untuk tiga kuartal sebelum kuartal terakhir dan forecast
  sekaligus, forecast didahulukan; kuartal terakhir yang dilaporkan selalu terlihat.
- **Dua cacat lama diperbaiki**: fokus hilang ke `body` setelah editor sel ditutup dengan Enter/Escape; dan teks
  `sr-only` di dalam baris yang menggulir bisa melebarkan halaman ponsel.
- **Dependensi baru**: `@axe-core/playwright` 4.13.0 (dev, versi persis) untuk K8.

## 7. Screenshot (`screenshots/`, tema terang saja)

| File | Isi |
|---|---|
| `model-xcoa-1440.jpg`, `-1024.jpg`, `-768.jpg`, `-360.jpg` | Layar pertama di empat lebar, 900px tinggi |
| `model-xcoa-1024-touch.jpg` | 1024px dengan emulasi sentuh: baris 44px |
| `model-xcoa-1440-connections.jpg` | Connections on, Revenue FY 25 terpilih: ▲ precedent, ▼ dependent, formula bar `=SUM(model!G4:J4)` |
| `checks-xcoa-1440.jpg` | Sheet Checks, selisih Cost of revenue FY 25 terpilih; inspector menunjukkan tie-out |
| `fullscreen-scem-1440.jpg` | Full screen, `assumptions!M3` lewat kotak nama |

## 8. S11: production dengan paket PTBA (24 Okt 2026)

Dicek setelah merge `0c9e380` (PR #79), di `https://dikagustiana.com/finance/finance-in-action/ptba`, dengan
paket PTBA yang terbit di `fia.model_packages` (bukan fixture). Chromium headless, skrip di luar repo yang
menjalankan pemeriksaan yang sama dengan `fia-sheet-first.spec.ts`, diadaptasi ke label PTBA.

| # | Hasil |
|---|---|
| K1 | **Lulus.** 1440×900: pill tahap, tab perusahaan (ADRO, INDY, ITMG, PTBA), baris perusahaan, kartu angka, toolbar, formula bar, dan 15 baris data grid terlihat; `scrollY` 0 |
| D-S7 | **Lulus.** Grid terbuka di Q4 25, FY 25, Q1 26, Q2 26 (kuartal terakhir), Q3 26E, Q4 26E |
| K2 | **Lulus.** 40 sel (10 per sheet: Model, Reported, Assumptions, Checks): alamat kotak nama, huruf kolom dan nomor baris yang disorot sama dengan sel di `.xlsx` hasil Download, yang memuat rumus atau angka yang sama. Dua sel kolom "As filed" di Checks (E16, E20) kosong di keduanya; layar menulisnya "—" |
| K6 | **Lulus.** Pointer halus: setiap baris 28px. Emulasi sentuh (1024px): sel minimal 44px, tidak ada kontrol di luar grid di bawah 44×44px |
| K8 | **Lulus.** axe (WCAG 2.0/2.1/2.2 A dan AA): 0 pelanggaran di Model, Checks, dan Connections on dengan sel terpilih |
| K9 | **Lulus.** 360, 768, 1024, 1440: `scrollWidth = clientWidth`, juga dengan Connections on |
| Checks | 41 pemeriksaan dari paket asli (fixture hanya 1–2) |

**Ukuran grid PTBA** (11 periode): Reported 99 baris / 1.089 sel, Model 42 / 462, Assumptions 22 / 242,
Checks 41 baris. Di bawah ambang 5.000 sel. Waktu dari klik sampai frame berikutnya, kasus terberat (Connections
on, sheet Reported, 10 klik): median 42ms, maksimum 73ms; dengan CPU diperlambat 4× (perkiraan laptop
menengah) median 152ms, maksimum 201ms. Virtualisasi belum perlu, tetapi maksimum di 4× sudah di ambang INP
200ms: ukur ulang bila paket berikutnya jauh lebih panjang.

Screenshot: `screenshots/prod-ptba-1440.jpg`, `screenshots/prod-ptba-360.jpg`.
