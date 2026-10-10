# Laporan akhir — site sweep Oktober 2026

Ditulis 10 Oktober 2026, setelah semua fase yang bisa dikerjakan punya draft PR dengan CI hijau. Fase W terblokir.
Rincian, output verifikasi mentah, dan keputusan per fase ada di `report-<fase>.md` di branch masing-masing.
Keputusan Dika ada di `DECISIONS.md` (D1–D14 dari PRD, D15–D17 ditambahkan 10 Okt).

## 1. Status

| Fase | Isi | PR | CI | Menunggu |
|---|---|---|---|---|
| 0 | Bootstrap, keputusan, laporan ini | [#59](https://github.com/dikagustiana/dikagustiana.com/pull/59) | hijau | review, merge |
| A | R7 dropdown navbar | [#60](https://github.com/dikagustiana/dikagustiana.com/pull/60) | hijau | review (satu baris `MainNav.tsx` di luar cakupan), merge |
| B | R1 FSLI: essay sebagai isi halaman | [#62](https://github.com/dikagustiana/dikagustiana.com/pull/62) | hijau | merge, migrasi `fsli_covered_by`, regenerasi types |
| C | R2 Glimpse + R8 About dihapus | [#63](https://github.com/dikagustiana/dikagustiana.com/pull/63) | hijau | merge |
| D | R6 Capital in Motion | [#61](https://github.com/dikagustiana/dikagustiana.com/pull/61) | hijau | merge, lalu migrasi `capital_in_motion_title` |
| E | R4 viewer workbook PSAK 338 | [#65](https://github.com/dikagustiana/dikagustiana.com/pull/65) | lihat PR | keputusan warna biru dan lainnya (§2.E), merge |
| F | R5 Section 06 | [#64](https://github.com/dikagustiana/dikagustiana.com/pull/64) | hijau | merge, env Vercel, redeploy, lalu migrasi `finance_section_06` |
| W1–W4 | R9, R10, R3 world | — | — | **terblokir**: D14 (bukti izin Factory Yard) kosong, dan A–D belum merge |

CI repo (`.github/workflows/ci.yml`) tidak menjalankan Playwright. Setiap laporan fase menempel output
`npx playwright test` lokal (dan `test:e2e:world` untuk fase C, yang menyentuh `scripts/world`).

## 2. Yang menunggu Dika, dengan langkah persis

### Urutan merge dan konflik
Semua PR berangkat dari `main` @ `0487609`. Dua file pasti bentrok antar-PR: konstanta `MIN_TESTS` di
`scripts/assert-test-count.mjs` dan entri teratas `docs/DECISIONS.md`. Merge dalam urutan apa saja. Saya
berlangganan aktivitas semua PR: setiap kali satu PR merge, saya merge `main` ke PR lain yang bentrok,
menghitung ulang `MIN_TESTS` (aktual − 4), menggabungkan entri DECISIONS, memvalidasi, lalu push.

### A — #60
- Terima atau tolak satu baris di luar `NavDropdown.tsx`: `align="end"` untuk Learning di `MainNav.tsx`. Tanpa
  baris itu panel Learning keluar layar pada 1280 px.

### B — #62
1. Merge.
2. Supabase `apply_migration` pada `asypkbkiebjvvpimewfp`, name `fsli_covered_by`, query = isi penuh
   `supabase/migrations/20261010100000_fsli_covered_by.sql`. Cek:
   `select slug, covered_by_slug from public.fsli_pages where covered_by_slug is not null order by slug;`
   harus 8 baris.
3. Regenerasi `src/integrations/supabase/types.ts` (`docs/RUNBOOK.md` §4, `generate_typescript_types`, timpa
   seluruh file), `npm run typecheck`, commit di PR susulan.

### C — #63
- Merge. Tidak ada migrasi atau env.

### D — #61
1. Merge dan tunggu deploy production.
2. `apply_migration`, name `capital_in_motion_title`, query = isi penuh
   `supabase/migrations/20261010120000_capital_in_motion_title.sql`. Migrasi ini hanya mengubah data, jadi types tidak
   perlu diregenerasi.
3. Opsional (D7): kalau ingin ada premise, tulis `docs/sweep-2026-10/copy/capital-in-motion-premise.md`.

### E — #65
1. **Dua biru.** D10 menjaga warna biru workbook ("input manual"), sementara legenda PTBA/Finance in Action juga
   menggambar angka yang diketik dengan biru. Pilih (a) angka yang diketik pakai tinta biasa, atau (b) biru D10 diberi
   tanda kedua.
2. Arti merah/biru D10: konfirmasi atau koreksi terhadap 10 + 10 contoh di `docs/consolidation/build-report.md`.
3. 29 catatan kerja (`oke`, `ok`, `n`, `l`): hapus di Excel atau biarkan.
4. Selisih profil PRD: ~17 ribu sel, 969 merah, dan 30 biru terukur sebagai 31.843, 1.532, dan 32. Selisih warna
   berasal dari sel yang memakai palet berindeks.
5. Kode tiga huruf STL, PSD, KLI, SLL, SLB, ALI masih ada; kalau ingin dihapus juga, sampaikan di sesi dan sertakan
   file asli.
6. Viewer tanpa mode gelap (situs light only sejak 2026-10-09): konfirmasi.
7. 35 teks OWNER-REPLACEABLE (§4).
8. Merge.

### F — #64 (urutan penting)
1. Merge.
2. Vercel → project `dikagustiana-com` → Settings → Environment Variables → `VITE_FIA_LIVE` = `true`, **Production
   saja**. Pastikan `VITE_FIA_PREVIEW` tidak diset untuk Production.
3. Redeploy Production. Di log build harus ada
   `assert-no-synthetic: live build; none of 11 fixture values and no preview page chunk in dist/.`
4. Buka `https://www.dikagustiana.com/finance/finance-in-action` lalu beri tahu sesi, supaya saya verifikasi (slate,
   tanpa SYNTHETIC).
5. **Baru setelah itu** `apply_migration`, name `finance_section_06`, query = isi penuh
   `supabase/migrations/20261010110000_finance_section_06.sql`. Urutan ini menjaga supaya kartu 06 tidak pernah
   menautkan halaman legacy "0 of 0 models".
6. Nanti: approve paket PTBA pertama di Personal OS 4F, lalu beri tahu sesi. Saya validasi terhadap kontrak v3.1
   dan menulis diff kontrak kalau ditolak.
7. Rollback: hapus env, redeploy. Kalau migrasi sudah diterapkan, hapus juga barisnya (`report-f.md` §6.9).

### W — terblokir
- Lampirkan bukti izin tertulis pemilik `Khalidabdi1/factory` (tanggal · kanal · kutipan verbatim · cakupan) untuk
  D14, setelah PR A–D merge. Baru setelah itu W1 dimulai.

### Di luar sweep (pengingat dari fase 0)
- Secret backup GitHub Actions masih kosong; kedua workflow backup gagal di setiap run. Isi `VITE_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE` di Settings → Secrets and variables →
  Actions, lalu jalankan "Full database backup".

## 3. Yang tidak terverifikasi

- **Vercel Preview tidak dibuka.** Preview di balik SSO, dan konektor Vercel sesi ini ditolak (403/404) untuk
  project ini. Sebagai gantinya, screenshot "production data" untuk B, C, F diambil dari build production lokal
  branch masing-masing, membaca Supabase production sebagai anon, hanya GET. Kode build sama dengan HEAD PR.
- **Status env Vercel production** (`VITE_WORLD_KAWASAN`, `VITE_FIA_*`) tidak bisa dibaca dari sesi ini.
- **Tiga migrasi** (B, D, F) belum pernah dijalankan ke database mana pun. B diuji di Postgres 16 lokal dengan skema
  minimal; D dan F tidak.
- **R5.4 (paket PTBA nyata)** belum bisa diuji: 0 paket terbit.
- **Browser lain** (Firefox, WebKit), screen reader nyata, dan perangkat sentuh lebar tidak diuji. Playwright repo
  hanya menjalankan Chromium.
- **Fase E: workbook bersih** diverifikasi dengan exceljs, openpyxl, dan LibreOffice, tidak dengan Microsoft Excel.
- Rincian lain per fase ada di bagian "Yang tidak terverifikasi" laporan masing-masing.

## 4. Text awaiting the owner

| Fase | Teks | Lokasi |
|---|---|---|
| A, C, D | Tidak ada teks baru | — |
| B | "Covered in <judul essay>". Teks ini dari D2(a) dan PRD, jadi bukan teks baru atas nama Dika. | `src/components/fsli/FsliCoveredBy.tsx` |
| E | 35 string OWNER-REPLACEABLE: lede (default PRD R4.6), label legenda, pesan inspector, pesan gagal, panel Method. Tabel lengkap dengan file:baris ada di `report-e.md` §"Text awaiting the owner". | `src/lib/workbook/copy.ts`, `src/pages/Accounting.tsx` |
| F | Deskripsi kartu 06: "Company models of IDX-listed companies, rebuilt from their own filings and ordered along the industry chain." (sama dengan `COPY.seoDescription`) | `supabase/migrations/20261010110000_finance_section_06.sql` |
| F (sudah ada sebelum sweep, pertama kali tampil di production setelah D12(a)) | h1 "The chain, read one company at a time" dan subjudulnya | `src/lib/finance-in-action/copy.ts:9-13` |

## 5. Kandidat pembersihan (tidak disentuh)

- **Legacy Finance in Action:**
  - `src/pages/FinanceInActionIndex.tsx`, `FinanceModelDetail.tsx`,
    `src/components/finance-in-action/ModelAdminPanel.tsx`, `src/hooks/queries/useFinanceModels.ts`;
  - bucket `finance-models` dan tabel `finance_models` (0 baris).
- **Tabel `fsli_sections`** (tidak lagi dibaca setelah B) beserta policy, grant, dan entri types-nya.
- **Interface `FsliPage` tulisan tangan:** bisa diganti tipe hasil generator setelah migrasi B diterapkan dan types
  diregenerasi.
- **Kode yang tidak lagi dipasang:**
  - `IndustryChainSection` (`ChainPlate.tsx`), sekarang hanya dipakai tes;
  - bentuk `compact` di `ReadingPath.tsx`.
- **Fallback 42703 yang sudah tidak perlu:** fallback `selected_rank` di `useSelectedEssays`,
  `useFeaturedFinanceEssay` dan panel admin (kolomnya sudah ada di production).
- **Komentar basi:**
  - `src/data/capitalConditions.ts:2`;
  - header `20261009140000_essay_selected_rank.sql`;
  - `DECISIONS.md` 2026-08-02 "`capital-allocation` stays out of the nav".
- **Tes e2e flaky** `tests/e2e/chain.spec.ts:75`: gagal 2/40 juga dengan kode asli. Fase C memindahkan rutenya ke
  `/`; flakiness-nya belum diselidiki.
- **Branch `world-v2/*`:** kelimanya sudah sepenuhnya di `main`.
- **Branch sesi `claude/opus-site-sweep-d68k41`:** tidak dipakai, karena PR memakai nama branch PRD.

## 6. Pertentangan yang dicatat (ringkas)

- **PTBA reference (Bagian 3 vs §1.6).** Bagian 3 meminta referensi PTBA di-commit apa adanya, padahal §1.6 melarang
  angka emiten nyata. Dika memutuskan D17: di-commit dengan DATA block kosong.
- **CI dan e2e.** Prompt menyebut CI menjalankan e2e, padahal `ci.yml` tidak. e2e dijalankan lokal.
- **Mode gelap (R4.5).** R4.5 meminta mode gelap, tetapi situs light only, jadi viewer tanpa mode gelap.
- **`PublishedNote` (R5.3).** R5.3 mengharapkan `PublishedNote` tampil, padahal komponen itu hanya muncul saat
  pembacaan gagal. Pembacaan kosong yang sukses tidak memunculkan catatan, dan menambah kalimat berarti copy baru
  atas nama Dika.
- **Profil workbook (§1.2.4).** Hitungan sel dan warna berbeda dari ukuran terukur (§2.E butir 4).
- Rincian per fase ada di bagian "Pertentangan" tiap laporan.
