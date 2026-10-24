# Desain: halaman model sheet-first

Pasangan `PRD.md`. Tema: token situs (constraint 4, D-S2). Yang diambil dari StockMap adalah **pola tata letak**,
bukan warna, font, ikon, atau copy.

## 1. Observasi StockMap (24 Okt 2026, `#models-ADRO`, Chrome Dika, 1467×812)

Urutan blok di `#v-models` (DOM): `header.vh` → `nav.md-secs` (pill sektor + jumlah) → `div.md-pick` (tab
perusahaan berlogo, baris perusahaan, 6 kartu angka) → `div.md-band` (kartu model). Kartu model:

- Toolbar: "The model", tiga chip legenda dengan contoh angka (`1,234` biru = dari laporan, `1,234` hitam =
  formula, `8.0%` hijau = asumsi), tombol Reset, Full screen, Download .xlsx.
- Formula bar: kotak nama (`A1`), ✕ ✓ *fx*, isi sel.
- Grid: huruf kolom, nomor baris, kolom A lebar dan beku, dibuka di kolom P (kuartal terbaru dan forecast);
  header forecast diwarnai; pita seksi berlatar ("WHAT THEY SELL · operating data", "SEGMENTS · US$ mn");
  baris "% yoy" miring; sel asumsi hijau; baris ±20px.
- Footer: tab sheet Model / Reported / Checks / Notes, zoom − slider + 100%.
- Kalimat bawah: kuartal = YTD dikurangi kuartal sebelumnya; sheet Checks mengikat model ke tiap laporan.
- Grid buatan sendiri (tidak ada library spreadsheet global); data di-inline di halaman.

Yang **tidak** diambil: kartu P/E (data pasar), status "IDX closed", tema gelap, logo emiten (D-S8), sheet Notes.

## 2. Tata letak 1440px

```
┌ Breadcrumb ─────────────────────────────────────────────────────────────────────────┐
│ (Geological extraction · 4 published) (Primary processing · 2) (Energy · 2) …       │  StagePills
│ ┌PTBA┐ ┌ITMG┐ ┌ADRO┐ ┌INDY┐ │ ┌SMGR┐ ┌INTP┐ …                                       │  CompanyTabs
│  Bukit Asam  PTBA · Coal mining ↗ · 18 filings, Q1 24–Q2 26 · Rp · ● Published  [Connections ○] │ CompanyBar
│ ┌Volume┐ ┌Revenue/t┐ ┌Cost/t┐ ┌Op. profit/t┐ ┌Owners' profit┐                         │  KeyFigures
│ ┌ The model  [1,234 Sourced][1,234 Formula][8.0% Assumption][– Missing]  Reset ⛶ ⤓ ┐ │
│ │ MODEL!E14 │ fx │ =model!E12*model!E13                                              │ │  FormulaBar
│ │    A                       B      …  K      L      M      N      O              │▕│ │
│ │ 1  PTBA                    Unit      Q1 25  Q2 25  FY25   Q1 26  Q2 26  Q3 26E  │▕│ │  Inspector
│ │ 2  Coal sold               Mt        …                                         │▕│ │  (≥1280, lipat)
│ │ …  (≥15 baris terlihat)                                                         │▕│ │
│ │ [Model] [Reported] [Assumptions] [Checks]        − 100% +   Coal sold, Q2 26     │ │  footer
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ How it makes money · Unit economics · Cost flow · Along the chain · Peers · Why · Workpaper │ SectionNav
│ … seksi seperti sekarang …                                                           │
```

## 3. Responsif

| Lebar | Perubahan |
|---|---|
| ≥1280 | Inspector di kanan dalam kartu (22rem), default terbuka di ≥1440, terlipat 1280–1439 |
| 1024–1279 | Inspector sebagai panel bawah (perilaku sekarang); kartu angka satu baris 5 |
| 768–1023 | Kartu angka 3+2; formula bar: kotak nama + isi, tanpa label *fx* |
| 360–767 | Pill dan tab perusahaan menggulir ke samping; kartu angka 2 kolom; formula bar satu baris terpotong (isi penuh di inspector); footer: tab sheet menggulir, zoom disembunyikan (pinch tidak diblokir); grid menggulir di dalam kartu, kolom A dipersempit 9rem |

## 4. Token dan gaya

- Warna sel memakai token yang sudah ada: `text-fia-sourced` (sourced), `text-foreground` (formula), kelas
  assumption/missing dari `CELL_KINDS`. Tidak ada warna baru kecuali bila kontras gagal (cek di kedua tema).
- Header huruf/nomor: `bg-muted text-muted-foreground`, font mono kecil, tabular.
- Sel terpilih: `ring-2 ring-ring ring-inset` (sudah ada); header kolom dan baris sel terpilih ikut disorot
  `bg-secondary` (seperti Excel).
- Kolom FY: `bg-muted` (sudah ada). Batas forecast: garis putus (sudah ada) + label "forecast" di header.
- Baris `total`: tebal + garis atas (sudah ada). Baris `ratio`: miring.
- Density: 28px pointer halus / 44px sentuh (D-S3). Font grid 13px pada zoom 100%.
- Toolbar dan footer: kontrol 44px (quality floor), ikon lucide yang sudah dipakai (`Maximize2`, `Download`, `Minus`, `Plus`).

## 5. Interaksi

| Aksi | Hasil |
|---|---|
| Klik sel / panah | Pilih; kotak nama dan formula bar diperbarui; header kolom/baris disorot; inspector diperbarui |
| Enter / F2 / dobel-klik pada asumsi | Edit di tempat (`CellEditor`); juga bisa di formula bar |
| Ketik di kotak nama + Enter | Lompat (ganti sheet bila perlu, gulir, pilih); salah → pesan di bawah kotak, fokus tetap |
| Tab sheet (klik / ←→) | Ganti sheet; pilihan dibersihkan; posisi buka D-S7 |
| − / + zoom | 70–150%, langkah 10; `Ctrl` + scroll tidak dibajak |
| Full screen / Esc | Seperti sekarang (dialog, focus trap) |
| Connections on | Penanda precedent/dependent di grid seperti sekarang; status line menyebut jumlahnya |

## 6. Copy (British English, masuk `copy.ts`)

- Toolbar legend: "Sourced", "Formula", "Assumption", "Not disclosed".
- Name box label: "Cell address"; error: "No cell at {text}. Use a value cell such as C5."
- Formula bar sourced: "{value}, from {document}, p. {page}".
- Status line: "{row}, {period} · {sheet} sheet".
- Checks sheet means: "Each tie-out of the model to a filing: the cell, the figure as filed, the difference."
- Section nav label: "On this page".

## 7. Aksesibilitas

- Grid tetap `role="grid"` satu tab stop; huruf kolom `role="columnheader"` (aria-hidden bila duplikat label
  periode — label sel sudah menyebut periode), nomor baris aria-hidden; `aria-label` sel tetap kalimat lengkap.
- Kotak nama `<input>` berlabel; formula bar `aria-live="polite"` hanya untuk isi teks, bukan setiap gerak panah
  (debounce).
- Tab sheet di bawah tetap `role="tablist"`; urutan DOM: toolbar → formula bar → grid → tab, sesuai urutan baca.
- Legenda tidak hanya warna (contoh angka + kata), constraint 13.
