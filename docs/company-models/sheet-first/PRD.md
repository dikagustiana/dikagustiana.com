# PRD: Finance in Action, halaman model "sheet-first" (bentuk StockMap)

Pemilik: Dika. Disusun 24 Okt 2026. Repo: `dikagustiana/dikagustiana.com` (`main` @ `b8044af`).
Dokumen pendamping: `ARCHITECTURE.md`, `DESIGN.md`, `PLAN.md`.
Meneruskan, tidak mengganti: `docs/company-models/implementation-brief-v3.1.md` (constraint 1–15),
`docs/company-models/chain-view/*` (D-M1…D-C2), `docs/company-models/two-gates/*`.

Status: **disetujui Dika 24 Okt 2026 (semua usulan D-S3–D-S9), belum ada kode**.

## 1. Masalah

Pembanding: StockMap by Oyenza, `oyenza.trade/dashboard/#models-ADRO`, dilihat 24 Okt 2026 di Chrome Dika
(akses login; browser headless ditolak 403). Halaman kita: `/finance/finance-in-action/:ticker` (preview) dan
index `/finance/finance-in-action` (production).

1. **Model kita ada di urutan ke-7.** `FiaModelPage.tsx` menyusun: rail perusahaan, header, provenance, kartu
   angka, driver, along the chain, unit economics, sankey, peer, why, *lalu* model, lalu workpaper. Di StockMap,
   spreadsheet adalah halaman itu sendiri: muncul di layar pertama, tepat di bawah kartu angka.
2. **Grid kita tidak terasa seperti spreadsheet.** Tidak ada huruf kolom, nomor baris, kotak nama sel, atau
   formula bar. Tab sheet ada di atas. Tinggi baris 44px membuat satu layar hanya muat sekitar 12 baris, padahal
   StockMap muat sekitar 35. Padahal alamat sel di paket kita sudah gaya Excel (kolom A label, B unit, C periode
   pertama, baris 1 header, `rows[n]` di baris n+2; `contract/types.ts`), dan formulanya sama dengan yang ditulis
   ke `.xlsx`. Bahannya sudah ada, tapi tidak ditampilkan.
3. **Navigasi perusahaan memakan satu kolom.** Rail kiri 11rem (`CompanyRail.tsx`) menyempitkan grid. StockMap
   memakai baris tab perusahaan berlogo di atas, sehingga grid mendapat lebar penuh.
4. **Belum ada model yang terbit** (cek 24 Okt: `fia.model_packages` HTTP 200, 0 paket). Ini masalah terpisah
   (jalur publish, `two-gates/RUNBOOK.md`), tetapi artinya perubahan ini hanya bisa dinilai di preview (fixture
   SYNTHETIC) sampai paket diterbitkan.

## 2. Tujuan

1. **Model di layar pertama.** Di 1440×900 tanpa scroll terlihat: pill tahap, tab perusahaan, baris perusahaan,
   kartu angka, toolbar model, formula bar, dan minimal 15 baris grid.
2. **Grid berbahasa Excel.** Huruf kolom dan nomor baris yang sama persis dengan file `.xlsx` hasil Download,
   kotak nama (`MODEL!E14`), formula bar yang menampilkan rumus asli, kolom A–B dan header beku, tab sheet di
   bawah, zoom, tinggi baris rapat di pointer halus.
3. **Pindah perusahaan lewat tab** se-sub-industri lalu se-tahap, tanpa kehilangan `?connections=on`.
4. **Tidak ada yang hilang.** Driver, along the chain, unit economics, sankey, peer, why, workpaper, inspector,
   lens, edit asumsi, dan Download tetap ada dan tetap teruji. Hanya urutan dan bentuknya yang berubah.
5. **Tetap memakai tema situs** (constraint 4): token, font, dan dark mode situs. Yang ditiru adalah tata letak,
   bukan warna atau merek StockMap.

## 3. Bukan tujuan

- Data pasar. Kartu "P/E 2026E" dan "IDX closed / harga live" di StockMap tidak ditiru (constraint 5, D-M1).
- Mengubah index `/finance/finance-in-action`. Index chain tetap seperti sekarang (pilihan Dika 24 Okt: opsi
  "halaman model saja").
- Tema gelap khusus FIA (pilihan Dika 24 Okt: ikut tema situs).
- Spreadsheet engine atau grid library baru (Univer, Handsontable, AG Grid). StockMap sendiri memakai grid
  buatan sendiri (`div.md-sheet`, tanpa library global, observasi 24 Okt). Kita juga tetap memakai `Workbook` +
  `ModelGrid`.
- Mengubah kontrak v3.1, `fia.contract_schema`, atau view `fia.model_packages` (kecuali D-S5 dipilih).
- Menyalin kode, ikon, logo, atau teks StockMap. Screenshot StockMap tidak disimpan di repo publik.
- Fitur "+" (tambah sheet), mengetik formula baru, atau menyimpan edit (constraint 12).

## 4. Keputusan

| # | Hal | Usulan | Status |
|---|---|---|---|
| D-S1 | Cakupan | Halaman model saja; index tetap | **Diputuskan Dika 24 Okt** |
| D-S2 | Tema | Ikut tema situs, termasuk dark mode situs | **Diputuskan Dika 24 Okt** |
| D-S3 | Tinggi baris vs quality floor "touch target 44px" (brief §Quality floor) | Rapat 28px hanya saat `pointer: fine` (mouse/trackpad); 44px saat `pointer: coarse` (sentuh). 28px masih di atas WCAG 2.5.8 (24px). Grid tetap satu tab stop dengan panah | **Disetujui Dika 24 Okt** |
| D-S4 | Sheet "Checks" | Sheet virtual hanya-baca, diturunkan dari `tieOut` setiap sel dan baris `gap_*`: satu baris per pemeriksaan (sel, sumber eksternal, selisih, status). Tidak ikut kontrak; ikut Download sebagai sheet tambahan | **Disetujui Dika 24 Okt** |
| D-S5 | Baris pita seksi (StockMap: "WHAT THEY SELL", "SEGMENTS") | v1 tanpa pita. Nanti bisa lewat `style: "section"` opsional di kontrak (perlu perubahan skema di DB, jalur two-gates) | **Disetujui Dika 24 Okt** |
| D-S6 | Inspector | Tetap ada (pembeda kita: provenance per sel). Di ≥1280px menjadi panel kanan *di dalam* kartu model, bisa dilipat; di bawahnya tetap panel bawah. Kolom inspector luar halaman dihapus | **Disetujui Dika 24 Okt** |
| D-S7 | Posisi buka grid | Saat dibuka, grid menggulir horizontal sehingga kuartal terakhir yang dilaporkan dan forecast terlihat (StockMap membuka di kolom P). Kolom A–B tetap beku | **Disetujui Dika 24 Okt** |
| D-S8 | Logo perusahaan di tab | v1 tanpa logo: monogram ticker dengan token situs. Logo emiten butuh sumber dan izin; ditunda | **Disetujui Dika 24 Okt** |
| D-S9 | Kartu angka | Tetap 5 peran yang ada (`keyFigures.ts`: volume, pendapatan/unit, biaya/unit, laba operasi/unit, laba pemilik), satu baris di ≥1024px | **Disetujui Dika 24 Okt** |

## 5. Kebutuhan

### R1. Kepala halaman
- **R1.1 Pill tahap.** `StagePills` yang sudah ada dipakai ulang di halaman model. Pill tahap perusahaan ini
  ditandai `aria-current`; klik → `INDEX_PATH#stage-<id>`.
- **R1.2 Tab perusahaan** menggantikan rail kiri. Isinya dari `companyRail()`: se-sub-industri dulu, lalu
  sisa tahap, dengan pemisah berlabel. Perusahaan aktif `aria-current="page"` (bukan link); yang belum
  dimodelkan tampil tanpa link dengan status glyph+kata (constraint 13). Di ponsel menggulir ke samping dan
  menjaga tab aktif tetap terlihat.
- **R1.3 Baris perusahaan** (pengganti `ModelHeader` yang tinggi): nama, ticker, sub-industri (link), satu kalimat
  fakta ("N laporan, Q1 24 sampai Q2 26; full statements to Q2 26; dilaporkan dalam US$"), status, dan
  Connections toggle. Badge SYNTHETIC tetap.
- **R1.4 Kartu angka** satu baris (D-S9), tinggi lebih rendah dari sekarang.

### R2. Kartu model ("The model")
- **R2.1 Toolbar:** judul, legenda sel inline sebagai chip (Sourced / Formula / Assumption / Missing, dengan
  contoh angka, bukan hanya warna), Reset (hanya setelah edit), Full screen, Download .xlsx (satu-satunya aksi
  utama).
- **R2.2 Formula bar:** kotak nama (`SHEET!A1`) yang bisa diketik untuk lompat ke sel (alamat salah → pesan,
  tidak lompat), lalu isi sel terpilih:
  formula → `=` + rumus mesin (sama dengan `.xlsx`); sourced → angka + "from <dokumen>, p. N"; assumption →
  angka, bisa diedit di tempat (memakai `CellEditor`); missing → "Not disclosed". Hanya-baca untuk sel non-asumsi.
- **R2.3 Grid:** baris huruf kolom (A, B, C… memakai `colLetter`) dan kolom nomor baris (1…), header periode di
  baris 1 seperti `.xlsx`; kolom A dan B beku, header beku; area grid punya tinggi tetap
  (`min(70vh, …)`) dan menggulir sendiri; garis putus forecast dan bayangan kolom FY tetap; tinggi baris D-S3.
- **R2.4 Tab sheet di bawah** grid (Model, Reported, Assumptions, + Checks bila D-S4), perilaku keyboard tab
  yang sama dengan sekarang.
- **R2.5 Zoom** 70–150% dalam langkah 10, tombol − / + dan angka persen; hanya mengubah ukuran grid; tidak
  disimpan di luar halaman (constraint 12 tidak dilanggar, ini preferensi tampilan).
- **R2.6 Baris status** di bawah: periode dan baris sel terpilih dalam kata; jika lens aktif, jumlah precedent
  dan dependent.
- **R2.7 Inspector** sesuai D-S6.
- **R2.8 Full screen** tetap dialog modal dengan focus trap (perilaku `ModelCard` sekarang).

### R3. Isi di bawah model
Urutan baru di bawah kartu model: How it makes money (driver), Unit economics, Cost flow (sankey), Along the
chain, Where it sits (peer), Why this link matters, Workpaper. Tambah navigasi seksi kecil (anchor) di bawah
kartu model. Isi tiap seksi tidak berubah.

### R4. Tetap berlaku
Constraint 4, 5, 7, 12, 13, 14 brief v3.1; satu formatter angka (`format.ts`); tidak ada literal angka di
komponen; Download dimuat saat tombol ditekan.

## 6. Kriteria terima

| # | Kriteria | Cara cek |
|---|---|---|
| K1 | Di 1440×900, toolbar model, formula bar, dan ≥15 baris grid terlihat tanpa scroll | Playwright screenshot + hitung baris di viewport |
| K2 | Alamat di kotak nama dan huruf/nomor di grid sama dengan sel di `.xlsx` hasil Download untuk 10 sel acak, di setiap sheet | unit test terhadap `ADDRESSING` + e2e buka file dengan ExcelJS |
| K3 | Formula bar sel formula menampilkan `=` + `cell.formula` persis | unit test |
| K4 | Mengetik `model!C5` di kotak nama memilih sel itu dan menggulirnya ke tampilan; alamat salah tidak memindahkan pilihan | unit test |
| K5 | Tab perusahaan: urutan sama dengan rail lama (test `fiaModelTop` diadaptasi), `?connections=on` terbawa | unit test |
| K6 | `pointer: coarse` → baris ≥44px; `pointer: fine` → 28px; semua kontrol non-grid ≥44px | e2e dengan emulasi |
| K7 | Keyboard: satu tab stop grid, panah/Home/End, Enter/F2 edit asumsi, tab sheet dengan panah, Escape keluar full screen | unit + e2e |
| K8 | Kontras 4.5:1 terang dan gelap, tanpa makna warna saja (legenda berisi kata) | axe di e2e |
| K9 | 360, 768, 1024, 1440: tidak ada scroll horizontal halaman (grid boleh menggulir di dalam kartunya) | screenshot |
| K10 | Semua test lama lulus atau diganti dengan padanan yang dicatat di report; `typecheck`, `lint`, `build` hijau; `assert-no-synthetic` lulus | CI |

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Baris rapat menurunkan target sentuh di bawah quality floor | D-S3: rapat hanya untuk pointer halus |
| Grid dengan banyak tombol (baris × periode) lambat saat zoom/lens | Ukur di paket terbesar (PTBA: hitung sel); virtualisasi baris hanya bila >5.000 sel atau INP >200ms |
| Inspector di dalam kartu menyempitkan grid | Bisa dilipat; default terlipat <1440px |
| Meniru terlalu dekat merek pihak ketiga | Hanya pola tata letak umum spreadsheet; token, font, copy, ikon milik situs |
| Halaman tetap kosong di production karena 0 paket terbit | Bukan cakupan PRD ini; jalankan publish (two-gates RUNBOOK) terpisah |
