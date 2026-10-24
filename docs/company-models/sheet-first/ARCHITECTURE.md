# Arsitektur: halaman model sheet-first

Pasangan `PRD.md`. Basis: `main` @ `b8044af`. Prinsip: **susun ulang dan perluas yang sudah ada**. Tidak ada
engine, library, route, atau kontrak baru. Semua angka tetap datang dari `Workbook` (`useModelView`).

## 1. Yang sudah ada dan dipakai ulang

| Bagian | File | Peran di desain baru |
|---|---|---|
| State model | `viewer/model/useModelView.ts` | Tidak berubah: `wb`, `values`, `selected`, `select`, `edits`, `reset`, lens |
| Alamat sel | `lib/finance-in-action/engine/address.ts` (`colLetter`, `colIndex`, `cellKey`, `parseKey`) + `ADDRESSING` di `contract/types.ts` | Sumber huruf kolom, nomor baris, kotak nama, lompat ke sel |
| Rumus | `Cell.formula` (sintaks mesin, sama dengan `.xlsx`) | Isi formula bar |
| Penjelasan | `model/explain.ts` (`explainFormula`, `sourceLine`, `sourcedInputs`) | Inspector, dan teks sourced di formula bar |
| Grid | `viewer/model/ModelGrid.tsx` | Diperluas (chrome Excel), bukan diganti |
| Kartu | `viewer/model/ModelCard.tsx` | Tetap pemilik Full screen + focus trap; tata letak dalamnya berubah |
| Editor | `viewer/model/CellEditor.tsx`, `model/scenario.ts` (`isEditable`) | Dipakai di grid dan formula bar |
| Kartu angka | `KeyFigures.tsx`, `keyFigures.ts` | Tetap; hanya kelas tata letak |
| Daftar perusahaan | `companyChain.ts` (`companyRail`) | Data untuk tab perusahaan |
| Pill tahap | `viewer/StagePills.tsx` | Dipakai ulang di halaman model |
| Export | `export/xlsx.ts` | Tetap; + sheet Checks bila D-S4 |

## 2. Pohon komponen baru

```
FiaModelPage                      (pages/finance-in-action/FiaModelPage.tsx, disusun ulang)
├─ StagePills  mode="link"        (prop baru: tautan ke INDEX_PATH#stage-<id>, current = tahap paket)
├─ CompanyTabs                    (BARU, menggantikan CompanyRailNav; data companyRail())
├─ CompanyBar                     (BARU, menggantikan ModelHeader; ModelHeader dihapus bila tak dipakai lagi)
├─ ProvenanceNote                 (tetap, dipadatkan ke dalam CompanyBar)
├─ KeyFigures                     (tetap)
├─ ModelCard id="fia-model"       (tetap, isi baru)
│  ├─ toolbar: judul · CellLegend(inline) · Reset · Full screen · Download
│  ├─ FormulaBar                  (BARU)  NameBox + isi sel / CellEditor
│  ├─ body (grid | inspector)     grid kiri; Inspector kanan ≥1280px, bisa dilipat (D-S6)
│  │  └─ ModelGrid                (DIPERLUAS) huruf kolom, nomor baris, beku, viewport, zoom, density
│  └─ footer: SheetTabs (dipindah dari ModelGrid) · ZoomControl (BARU) · StatusLine (BARU)
├─ SectionNav                     (BARU, kecil: anchor ke seksi di bawah)
└─ Section × 7                    (isi tetap: drivers, UE, sankey, along chain, peers, why, workpaper)
```

`CompanyRailNav` dan export `RAIL_LABEL` diganti `CompanyTabs` + `COMPANY_TABS_LABEL` (navigasi tetap
`<nav aria-label>` agar test bisa dipindah satu-satu).

## 3. State dan aliran data

```
pkg ──► useModelView(pkg, lens) ──► view {wb, values, selected, select, edits, markOf, …}
                                         │
         FiaModelPage local state:       │
         sheet: SheetId | 'checks'  ─────┼──► ModelGrid(sheetId) ──► view.select(key)
         zoom: number (0.7–1.5)     ─────┤          ▲
         inspectorOpen: boolean          │          │ goTo(key)
                                         └──► FormulaBar(view, sheet) ── NameBox: parse → key → setSheet + select + scrollIntoView
```

- **Turunan alamat (fungsi murni, baru)** di `lib/finance-in-action/view/sheetAddress.ts`:
  - `addressOf(wb, key) → { sheet, col: 'E', row: 14, text: 'MODEL!E14' }` dari `wb.address(key)`
    (`periodIndex` + `ADDRESSING`, baris dari indeks baris sheet).
  - `keyFromAddress(wb, text) → key | null`: terima `E14`, `model!E14`, huruf kecil; kolom A/B → `null` (label
    dan unit bukan sel nilai) dengan alasan untuk pesan.
  - `columnLetters(periodCount) → string[]` untuk baris huruf.
  Satu sumber untuk grid, formula bar, dan test K2.
- **Isi formula bar (fungsi murni, baru)** `formulaBarContent(wb, key, values) → { kind, text, editable }` di
  modul yang sama; komponen hanya merender.
- **Sheet Checks (D-S4)**: `lib/finance-in-action/view/checksSheet.ts`, `checksRows(pkg, wb, values)` membentuk
  baris virtual `{label, unit, cells}` dari setiap `cell.tieOut` dan baris `gap_*`. Tidak menjadi `Sheet` paket;
  `ModelGrid` menerima prop `rows` opsional untuk sheet virtual, read-only (`canEdit` false). Export menambah
  satu worksheet dari fungsi yang sama.
- **Zoom**: CSS variable `--fia-grid-scale` pada wrapper grid. Ukuran font dan tinggi baris dihitung dari token
  dan variabel (bukan `transform: scale`, supaya hit-target dan sticky benar).
- **Density (D-S3)**: kelas Tailwind dengan varian media `pointer-fine:` (tambah ke `tailwind.config` sebagai
  `screens: { 'pointer-fine': { raw: '(pointer: fine)' } }`). Default (sentuh) 44px; `pointer-fine:h-7`.
- **Posisi buka (D-S7)**: efek sekali saat paket/sheet berganti: `scrollLeft` viewport ke kolom kuartal
  terakhir yang dilaporkan dikurangi 3 kolom, dihitung dari `pkg.meta.asOf.latestQuarter` → indeks periode.
- **Lompat ke sel**: `refs` sel yang sudah ada di `ModelGrid` + `scrollIntoView({block:'nearest', inline:'nearest'})`;
  sticky kolom A/B diperhitungkan dengan `scroll-padding-left` pada viewport.

## 4. Routing dan URL

Tidak berubah: `/finance/finance-in-action/:modelSlug`. `CompanyTabs` memakai `modelPath(ticker)` dan membawa
`location.search` (lens). Sheet aktif dan sel terpilih tidak masuk URL di v1.

## 5. Batas yang dijaga

- Tidak ada literal angka di komponen (constraint 7): batas zoom, langkah, density, offset kolom buka
  disimpan di `lib/finance-in-action/layout.ts` (`LIMITS`, sudah ada).
- Satu formatter (`format.ts`) untuk grid, formula bar, status line.
- Teks UI di `copy.ts` (British English).
- Live build: modul baru tidak mengimpor fixture (`live.ts` / `assert-no-synthetic`).
- Edit tetap di memori halaman (constraint 12); zoom dan status lipat inspector juga di memori.

## 6. Performa

Grid saat ini merender satu `<button>` per sel. Ukur sebelum mengoptimalkan: hitung sel paket terbesar di
`C:\work\fia-models\*\package.json` (lokal, tidak masuk repo) dan fixture SYNTHETIC. Ambang: virtualisasi baris
hanya bila >5.000 sel per sheet atau INP >200ms di profil laptop menengah. `ModelGrid` dipisah menjadi
`GridRow` memo supaya pilihan sel tidak merender ulang semua baris.

## 7. Test

| Lapisan | File | Isi |
|---|---|---|
| Unit murni | `tests/unit/fiaSheetAddress.test.ts` (baru) | `addressOf`/`keyFromAddress`/`columnLetters` vs `ADDRESSING`; K2, K4 |
| Unit murni | `tests/unit/fiaChecksSheet.test.ts` (baru, D-S4) | baris dari `tieOut`, status, selisih |
| Komponen | `tests/unit/fiaModelTop.test.tsx` (ubah) | rail → tab (K5), kartu model: formula bar, tab bawah, zoom |
| Komponen | `tests/unit/workbookViewer.test.tsx` (cek) | sesuaikan bila memakai `ModelGrid` |
| E2E | `tests/e2e/workbook.spec.ts` (ubah) + `fia-sheet-first.spec.ts` (baru) | K1, K6, K7, K8, K9; Download dibuka ExcelJS untuk K2 |
