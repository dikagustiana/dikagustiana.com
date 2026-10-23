# PRD: Finance in Action, model yang nyambung ke industry chain

Pemilik: Dika. Disusun 22 Okt 2026. Repo: `dikagustiana/dikagustiana.com` (`main` @ `836faf1`).
Database: Supabase `asypkbkiebjvvpimewfp`. Dokumen pendamping: `PLAN.md`, `PROMPT-site.md`, `PROMPT-model.md`.
Meneruskan, tidak mengganti: `docs/company-models/implementation-brief-v3.1.md` dan `docs/company-models/two-gates/*`.

## 1. Masalah

Cek 22 Okt di production dan di `main`:

1. **Belum ada satu model pun yang terbit.** Section 06 menampilkan 7 perusahaan (PTBA, ITMG, INDY, ADRO, INTP,
   SMGR, BREN), semuanya "Planned; no model yet". Jalur manual (`fia.manual_release`, `publish-manual.ts`) sudah
   jalan sejak 22 Okt, tapi belum ada paket v3.1 yang dibuat. Model INDY, ADRO, BREN sudah ada dalam format
   FSRE lama (`Downloads\FSRE_v23_all.zip`, 21 Okt; juga `INDY_fsre.json`, `ADRO_fsre.json`, `BREN_fsre.json`,
   17 Okt) dengan kunci `reported/ops/model/derived/assumptions/forecast/checks/sources`, bukan `ModelPackage`
   v3.1, jadi belum bisa masuk `publish-manual.ts`.
2. **Chain berhenti di level sub-industri.** Register link hanya punya `coal-to-cement` (A121 → B121), dan semua
   bobotnya `null`, jadi garisnya putus-putus. Halaman model tidak menunjukkan perusahaan di hulu dan hilirnya.
3. **Peta chain di homepage tidak nyambung ke model.** Kotak "Geological extraction" atau "Primary processing" di
   `/?distance=finance` tidak membawa ke perusahaan di tahap itu. Dua halaman ini hidup terpisah.
4. **Tampilan model padat tapi tidak langsung terbaca.** Isinya sudah lengkap (grid, driver tree, unit economics,
   peer band, workpaper), tapi tidak ada ringkasan angka kunci di atas dan model tidak dikemas dalam satu kartu
   seperti StockMap (oyenza.trade).

## 2. Tujuan

1. **Model asli terbit** untuk 7 perusahaan di slate, dari laporan keuangan mereka sendiri, lewat jalur manual,
   dengan kontrak v3.1 utuh (setiap angka sourced punya dokumen, halaman, catatan).
2. **Link coal → cement terukur**: cost share dan demand share bersumber, sehingga garisnya tegas dan "one tonne
   of cement, split along the chain" menghasilkan angka.
3. **Chain di level perusahaan**: dari model SMGR orang bisa melihat dan mengklik PTBA/ITMG/ADRO/INDY sebagai
   pemasok kiln fuel, dan sebaliknya.
4. **Aliran biaya per unit (sankey)** di halaman model: biaya per tonne mengalir dari sub-industri hulu, garis yang
   tersambung ke link register bisa diklik ke perusahaan hulu.
5. **Tata letak ala StockMap**: pill tahap chain, daftar perusahaan di kiri, kartu angka kunci, model dalam satu
   kartu besar dengan legenda sel dan tombol Reset / Full screen / Download.
6. **Homepage ↔ Section 06 nyambung**: kotak tahap di peta chain (jarak finance) membawa ke tahap yang sama di
   Section 06, dengan jumlah model terbit.

## 3. Bukan tujuan

- Data pasar: harga saham, P/E, market cap, target harga (constraint 5 brief v3.1, lihat D-M1).
- Spreadsheet engine baru (Univer, dll.). Grid dan formula engine yang sudah ada tetap dipakai.
- Library grafik baru. Semua grafik situs SVG buatan sendiri; sankey juga.
- Mengubah pipeline FSRE, skema `fsre*`, atau view `fia.model_packages`.
- Menyimpan angka perusahaan asli di repo situs (constraint 2 brief v3.1). Paket asli hanya ada di database.
- Auth, admin, authoring, TipTap.

## 4. Keputusan

| # | Hal | Keputusan | Status |
|---|---|---|---|
| D-M1 | Data pasar ala StockMap (P/E, P/B) | Tidak. Kartu angka kunci diisi angka operasi dari paket: volume, pendapatan per unit, biaya per unit, laba operasi per unit, masing-masing dengan pembanding tahun lalu | **Default, konfirmasi** |
| D-M2 | Tempat kerja model asli | Folder privat di luar repo situs: `C:\work\fia-models\<TICKER>\` (sumber PDF, workpaper, `package.json` final). Bukan git publik | **Default, konfirmasi** |
| D-M3 | Siapa yang menerbitkan | Agen hanya menjalankan `publish-manual.ts --check`. `--stage` dan `--publish` dijalankan Dika setelah review | **Default, konfirmasi** |
| D-M4 | Urutan model | PTBA dulu sebagai pilot ujung ke ujung; setelah Dika setuju, ITMG, ADRO, INDY, lalu SMGR, INTP, lalu BREN | **Default, konfirmasi** |
| D-M5 | Pasangan BREN | Tambah PGEO (Pertamina Geothermal Energy) di J411 supaya peer band BREN bisa tampil (aturan ≥ 2 perusahaan terbit) | **Usulan, konfirmasi** |
| D-M7 | INDY, ADRO, BREN yang sudah ada | Tidak dibangun dari nol: agen memetakan model FSRE v23 ke `ModelPackage` v3.1 lewat satu adapter, lalu memeriksa ulang setiap angka sourced ke PDF aslinya. Angka yang tidak bisa ditelusuri ke dokumen jadi `missing` atau asumsi berlabel, bukan `sourced` | **Default, konfirmasi** |
| D-M6 | Periode | 8 kuartal terakhir dengan laporan lengkap + FY terakhir + 2 kuartal forecast, sama dengan fixture | **Default, konfirmasi** |
| D-C1 | Sambungan biaya ke hulu | Field opsional baru di register link (data situs, bukan kontrak paket): `downstreamLines: { [ticker]: ueLineId }`, yaitu baris unit economics hilir yang memuat input ini. Kontrak v3.1 dan `fia.contract_schema` tidak berubah | **Usulan, konfirmasi** |
| D-C2 | Chain level perusahaan | Diturunkan, tidak disimpan: perusahaan hulu = semua perusahaan di sub-industri `from` dari link yang `to`-nya sub-industri perusahaan ini (dan sebaliknya). Tidak ada edge perusahaan-ke-perusahaan yang ditulis tangan, karena tidak ada sumber kontrak pasokan per perusahaan | **Default, konfirmasi** |

## 5. Kebutuhan

### Jalur A. Model (konten)

**A1. Paket per perusahaan.** Satu `ModelPackage` v3.1 per ticker, `provenance: "filings"`, dengan:
- sheet Reported (angka dari laporan, `kind: sourced`, `source` lengkap: issuer, dokumen, periode, halaman, nomor
  catatan), Model (formula), Assumptions (asumsi forecast dengan `note` alasannya);
- volume fisik (tonne coal sold, tonne cement sold, MWh) dari laporan atau rilis operasi resmi; tanpa volume, unit
  economics tidak dibuat (constraint 9);
- unit economics dari catatan beban pokok pendapatan, setiap baris dengan driver fisiknya; sisa yang tidak bisa
  dipecah = baris `unsplit` dengan `contains`;
- tie-out ke laporan (laba bersih, pendapatan, total aset minimal) dengan status `agrees`/`differs`;
- workpaper gates terisi jujur, termasuk `passed_with_escalation` kalau ada;
- `contentHash` dihitung oleh `publish-manual.ts`.

**A2. Link terukur.** Untuk `coal-to-cement`: `intensity` (tonne coal per tonne cement), `costShare` (biaya bahan
bakar kiln ÷ beban pokok semen), `demandShare` (porsi volume batubara domestik yang dijual ke industri semen),
`passThrough` kalau datanya cukup. Setiap nilai bersumber. Yang tidak bersumber tetap `null` (constraint 10).

### Jalur B. Situs

**B1. Tata letak index ala StockMap.** Pill tahap chain (dari `STAGES`/`BANDS`, bukan daftar baru) dengan jumlah
perusahaan; memilih pill menggulung ke tahap itu. Setiap tahap punya anchor `#stage-<id>`. Isi index sekarang
(filter, status, lens Connections) tetap.

**B2. Halaman model ala StockMap.**
- Rail perusahaan di kiri (sebaris di ponsel): perusahaan di sub-industri yang sama dan tahap yang sama.
- Kartu angka kunci (D-M1), semuanya dihitung dari baris paket, tanpa angka literal di komponen.
- Model dalam satu kartu: tab Reported / Model / Assumptions, legenda sel (sourced, formula, assumption, missing),
  tombol Reset (hanya setelah edit), Full screen, Download .xlsx.
- Semua bagian lama (driver tree, unit economics, peer band, condition, workpaper) tetap ada.

**B3. Panel "Along the chain"** di halaman model: Upstream / This stage / Downstream. Isinya perusahaan dari D-C2
dengan status masing-masing, tautan ke modelnya kalau terbit, "not yet modelled" kalau belum. Setiap link
menampilkan apa yang mengalir dan status terukur/belum.

**B4. Aliran biaya per unit (sankey).** SVG buatan sendiri dari `unitEconomics` periode terpilih: harga per unit di
kanan, terpecah ke baris biaya dan laba. Baris yang tercantum di `downstreamLines` sebuah link mendapat simpul hulu
(sub-industri + perusahaan terbitnya) di kiri, bisa diklik. Baris `unsplit` diarsir. Tanpa volume: tidak digambar.
Bisa dibaca tanpa warna (label + nilai di setiap aliran) dan lewat keyboard; ada tabel padanan.

**B5. Kartu link level perusahaan.** "One tonne of cement, split along the chain" bisa memilih perusahaan hulu dan
hilir di antara yang terbit (default: rata-rata sederhana diberi label jelas, atau pilihan pertama; lihat PROMPT).

**B6. Homepage → Section 06.** Pada jarak finance, setiap kotak tahap di peta chain yang punya perusahaan di slate
menampilkan "n models" dan bertaut ke `/finance/finance-in-action#stage-<id>`. Jarak economy tidak berubah.

**B7. Data register.** `links.json` mendapat `downstreamLines` (D-C1); skema `link-register.schema.json` dan
validasinya diperbarui. Fixture SYNTHETIC ikut diperbarui supaya B3–B5 teruji di preview.

## 6. Kriteria terima

| # | Kriteria | Bukti |
|---|---|---|
| K1 | PTBA terbit di production lewat jalur manual, `--check` bersih, semua tie-out wajib `agrees` atau `differs` dengan penjelasan | Output `--check`, screenshot halaman PTBA |
| K2 | 7 perusahaan slate terbit (8 dengan PGEO kalau D-M5 disetujui) | `--list`, screenshot index |
| K3 | `coal-to-cement` tergambar tegas dengan cost share dan demand share bersumber; "one tonne of cement" menampilkan angka | Screenshot lens on + link card |
| K4 | Halaman SMGR menampilkan pemasok hulu A121 di panel Along the chain dan di sankey, bisa diklik ke PTBA dkk. | Screenshot + tes unit |
| K5 | Kartu angka kunci, rail perusahaan, kartu model tampil di 360/768/1024/1440 px tanpa scroll horizontal halaman | 4 screenshot |
| K6 | Kotak tahap di homepage (finance) bertaut ke anchor tahap yang benar dengan jumlah yang sama dengan Section 06 | Tes unit + screenshot |
| K7 | Tidak ada angka perusahaan asli di repo; `assert-no-synthetic` live tetap hijau | Output CI, `git grep` ticker di data |
| K8 | CI hijau: eslint di bawah plafon, typecheck, vitest, `MIN_TESTS` naik, build, build live | Output CI |
| K9 | Aksesibilitas: fokus terlihat, target sentuh ≥ 44 px, kontras ≥ 4,5:1, warna tidak membawa arti sendirian | Catatan pemeriksaan |

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Volume dan rincian beban pokok tidak diungkap per kuartal | Pakai periode yang ada (FY / semester); `unitEconomics.periods` hanya periode dengan rincian catatan; sisanya `missing` |
| Demand share coal → cement tidak ada sumber publik | Biarkan `null`, garis tetap putus-putus; catat di report sebagai item terbuka. Jangan mengarang |
| Biaya bahan bakar semen digabung dengan listrik di catatan | Satu baris "Fuel and power" dengan `downstreamLines` ke coal, plus `caveat` di link yang menyebut gabungan itu |
| Model manual melewati review FSRE | Pilot PTBA ditinjau Dika baris per baris; gate `failed` tetap diblok database; checklist review di PROMPT-model |
| Paket 1–3 MB memperlambat halaman | Ukur bundle dan waktu muat index; index cukup membaca `meta` kalau perlu (catat, jangan optimasi dini) |
| Angka asli bocor ke repo lewat tes atau screenshot | Tes hanya pakai SYNTHETIC; screenshot production disimpan di luar repo atau di `docs/` tanpa data mentah |
