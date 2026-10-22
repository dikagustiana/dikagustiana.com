# Plan: Finance in Action, model yang nyambung ke industry chain

Pasangan `PRD.md`. Dua jalur kerja yang berjalan paralel:

- **Jalur A (model)**: agen membangun paket di folder privat `C:\work\fia-models\`, satu sesi per perusahaan,
  pakai `PROMPT-model.md`. Dika review dan menerbitkan.
- **Jalur B (situs)**: satu branch `feat/fia-chain-view` dari `main` @ `836faf1`, satu draft PR, pakai
  `PROMPT-site.md`. Dikerjakan dengan fixture SYNTHETIC, tidak menunggu jalur A.

## Fase

| Fase | Isi | Pelaksana | Bergantung pada | Gate Dika |
|---|---|---|---|---|
| 0 | Konfirmasi D-M1…D-C2; siapkan folder `C:\work\fia-models\`; `git pull` repo lokal (lokal masih `41efad9`, 348 commit di belakang) | Dika | — | keputusan |
| A1 | **PTBA pilot**: kumpulkan sumber, bangun paket, `--check` bersih, workpaper | Agen (PROMPT-model) | 0 | review baris per baris |
| A1p | Terbitkan PTBA: `--stage`, cek di preview/production, `--publish` | Dika (RUNBOOK two-gates §4–5) | A1 | publish |
| A2 | ITMG dari nol; ADRO, INDY dari model FSRE v23 lewat adapter (D-M7). Bisa 3 sesi paralel | Agen | A1 disetujui (pola PTBA jadi rujukan) | review + publish |
| A3 | SMGR, INTP (2 sesi paralel) | Agen | A1 disetujui | review + publish |
| A4 | BREN dari model FSRE v23 (D-M7), + PGEO dari nol kalau D-M5 | Agen | A1 disetujui, D-M5 | review + publish |
| A5 | Ukur link `coal-to-cement`: intensity, cost share, demand share, pass-through; isi `downstreamLines` | Agen (PROMPT-model §Link) | A2, A3 terbit | review, lalu jadi commit di jalur B |
| B1 | Bootstrap: simpan PRD/PLAN/PROMPT di `docs/company-models/chain-view/`, catat HEAD | Agen (PROMPT-site) | 0 | — |
| B2 | Register: `downstreamLines` di tipe, skema, validasi, fixture SYNTHETIC | Agen | B1, D-C1 | — |
| B3 | Index: pill tahap, anchor `#stage-<id>` | Agen | B1 | — |
| B4 | Halaman model: rail, kartu angka kunci, kartu model (tab + legenda + Reset/Full screen/Download) | Agen | B1 | — |
| B5 | Panel Along the chain (D-C2) | Agen | B2 | — |
| B6 | Sankey aliran biaya per unit + tabel padanan | Agen | B2 | — |
| B7 | Kartu link level perusahaan | Agen | B2 | — |
| B8 | Homepage: kotak tahap (finance) → anchor Section 06 dengan jumlah | Agen | B3 | — |
| B9 | Aksesibilitas dan responsif, screenshot 360/768/1024/1440, report, draft PR | Agen | B2–B8 | merge |
| C | Gabung: masukkan angka link A5 ke `links.json` (link register memang data situs; bukan angka perusahaan, tetapi angka sektor bersumber — lihat catatan), deploy, verifikasi K1–K9 | Agen + Dika | A5, B9 merged | laporan akhir |

Jalur B tidak menunggu jalur A. Fase A2, A3, A4 saling bebas setelah A1 disetujui.

Catatan fase C: `links.json` sudah ada di repo dan memang memuat angka link (constraint 10 brief v3.1). Angka
sektor bersumber (rasio, porsi) bukan angka laporan perusahaan, jadi boleh di repo. Kalau sebuah nilai link
diturunkan dari laporan satu perusahaan (misalnya cost share dari catatan SMGR), Dika memutuskan apakah nilai itu
ditaruh di repo atau link register dipindah ke database. Default: ditaruh di repo dengan `source` lengkap.

## Fase 0 (Dika, sekarang)

1. Jawab D-M1…D-C2 di `PRD.md` §4 (cukup "setuju semua" atau sebut yang diubah).
2. Buat folder: `mkdir C:\work\fia-models`.
3. Perbarui repo lokal:
   ```
   cd C:\work\dikagustiana.com
   git checkout main
   git pull origin main
   ```
4. Pastikan `.env.local` berisi `SUPABASE_DB_URL` (RUNBOOK two-gates §1.3) supaya `publish-manual.ts` bisa jalan.
5. Kalau agen tidak bisa mengunduh dari idx.co.id (situsnya sering memblok otomatisasi), unduh sendiri ke
   `C:\work\fia-models\<TICKER>\sources\`: laporan keuangan kuartalan dan tahunan 2024–2026 (PDF), annual report
   2025, dan rilis/presentasi operasi kuartalan dari situs IR perusahaan.

Untuk INDY, ADRO, BREN: salin `Downloads\FSRE_v23_all.zip` ke `C:\work\fia-models\_fsre-v23\` dan ekstrak di
sana. Adapter (`C:\work\fia-models\_adapter\`) dibangun sekali di sesi pertama yang menyentuhnya dan dipakai
ketiganya.

## Fase A, per perusahaan (agen)

Struktur folder:

```
C:\work\fia-models\PTBA\
  sources\        PDF asli + sources.md (daftar dokumen, URL, tanggal unduh, SHA-256)
  extract\        tabel hasil ekstraksi per dokumen (CSV), satu file per catatan
  build\          skrip pembangun paket (TypeScript/Python), membaca extract\, menulis package.json
  package.json    paket final ModelPackage v3.1
  workpaper.md    keputusan, asumsi forecast dan alasannya, tie-out, eskalasi, least-confident items
  review.md       checklist review untuk Dika (dari PROMPT-model §8)
```

Perintah cek (dari repo situs):

```
cd C:\work\dikagustiana.com
npx vite-node scripts/fia/publish-manual.ts --check C:\work\fia-models\PTBA\package.json
```

Terbit (Dika): RUNBOOK two-gates §4 (`--stage`) dan §5 (`--publish --by "Dika Gustiana Irawan"`).

## Fase B, urutan commit (agen)

1. `docs(fia)`: PRD, PLAN, PROMPT-site, PROMPT-model apa adanya di `docs/company-models/chain-view/`.
2. `feat(fia)`: `downstreamLines` di `contract/links.ts`, `link-register.schema.json`, validasi, fixture, tes.
3. `feat(fia)`: index, pill tahap + anchor.
4. `feat(fia)`: halaman model, rail + kartu angka kunci + kartu model.
5. `feat(fia)`: panel Along the chain.
6. `feat(fia)`: sankey aliran biaya per unit + tabel.
7. `feat(fia)`: kartu link level perusahaan.
8. `feat(chain)`: homepage, kotak tahap → Section 06.
9. `chore(fia)`: aksesibilitas, responsif, screenshot, report.

## Fase C (gabung)

1. Agen membuat commit kecil di branch baru `feat/fia-coal-cement-link`: nilai link dari A5 ke `links.json`.
2. Dika merge, Vercel deploy.
3. Agen membuka production dan memeriksa K1–K9, menulis `docs/company-models/chain-view/report-final.md`.

## Perkiraan beban

Tanpa ukuran terukur. Pilot PTBA paling berat (menetapkan pola ekstraksi dan struktur unit economics batubara);
perusahaan berikutnya di sub-industri yang sama memakai pola itu. Jalur B kira-kira sebesar commit 3–7 brief v3.1.
