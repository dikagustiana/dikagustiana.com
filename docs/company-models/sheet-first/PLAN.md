# Plan: halaman model sheet-first

Pasangan `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`. Satu branch `feat/fia-sheet-first` dari `main` @ `b8044af`,
satu draft PR. Dikerjakan dengan fixture SYNTHETIC (`VITE_FIA_PREVIEW=true`); tidak menunggu publish paket asli.

## Fase

| Fase | Isi | Pelaksana | Bergantung | Gate Dika |
|---|---|---|---|---|
| 0 | D-S3…D-S9 disetujui Dika 24 Okt | Dika | — | selesai |
| S1 | Branch, simpan dokumen ini, catat HEAD; ukur ukuran grid (sel per sheet) fixture + paket lokal | Agen | 0 | — |
| S2 | `sheetAddress.ts` (+ test K2, K4) dan `formulaBarContent` (+ test K3) | Agen | S1 | — |
| S3 | `ModelGrid` chrome: huruf kolom, nomor baris, beku A–B + header, viewport tinggi tetap, density D-S3, sorot header, `GridRow` memo | Agen | S2 | — |
| S4 | `FormulaBar` + `NameBox` (lompat ke sel), edit asumsi lewat `CellEditor` | Agen | S2, S3 | — |
| S5 | Footer: `SheetTabs` dipindah ke bawah, `ZoomControl`, `StatusLine`; posisi buka D-S7 | Agen | S3 | — |
| S6 | `ModelCard` tata letak baru: toolbar dengan legenda inline, Inspector di dalam kartu (D-S6) | Agen | S4, S5 | — |
| S7 | Sheet Checks virtual + worksheet di Download (bila D-S4 ya) | Agen | S3 | — |
| S8 | Kepala halaman: `StagePills` mode link, `CompanyTabs`, `CompanyBar`; susun ulang `FiaModelPage` + `SectionNav`; hapus `CompanyRailNav`/`ModelHeader` yang tak terpakai | Agen | S6 | — |
| S9 | Test: adaptasi `fiaModelTop`, `workbookViewer`, `workbook.spec`; baru `fia-sheet-first.spec` (K1, K6–K9); axe | Agen | S8 | — |
| S10 | Screenshot 360/768/1024/1440 terang+gelap, report (`report.md`: K1–K10 per butir, test lama yang diganti), draft PR | Agen | S9 | review + merge |
| S11 | Setelah merge dan paket terbit (two-gates RUNBOOK): cek di production dengan paket asli (PTBA dulu) | Agen + Dika | S10, publish | laporan akhir |

S2 → S3 → (S4, S5, S7 paralel) → S6 → S8 → S9 → S10. Satu commit per fase, pesan
`feat(fia): …` seperti riwayat chain-view.

## Definisi selesai per commit

- `npm run typecheck`, `npm run lint`, `npm run test:unit` hijau.
- Tidak ada literal angka baru di komponen (konstanta di `layout.ts`), copy baru di `copy.ts`.
- `npm run build` (dengan dan tanpa `VITE_FIA_PREVIEW`) dan `assert-no-synthetic` lulus di S8 ke atas.

## Perkiraan

| Fase | Ukuran |
|---|---|
| S2 | kecil (fungsi murni + test) |
| S3 | besar (inti visual) |
| S4, S5, S7 | sedang |
| S6, S8 | sedang (susun ulang, banyak test terdampak) |
| S9, S10 | sedang |

## Fase 0 (Dika, sekarang)

1. Jawab D-S3 (density), D-S4 (Checks), D-S5 (pita seksi, default tunda), D-S6 (inspector), D-S7 (posisi buka),
   D-S8 (logo, default tunda), D-S9 (kartu angka).
2. Terpisah dari plan ini: terbitkan paket (`.env.local` + `publish-manual.ts`), supaya S11 bisa dinilai dengan
   angka asli.
