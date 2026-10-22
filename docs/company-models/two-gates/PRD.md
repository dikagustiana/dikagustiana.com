# PRD: Finance in Action, dua jalur masuk model (FSRE dan manual)

Pemilik: Dika. Disusun 22 Okt 2026. Repo: `dikagustiana/dikagustiana.com` (`main` @ `b6fd24c`).
Database: Supabase `asypkbkiebjvvpimewfp`. Dokumen pendamping: `PLAN.md`, `PROMPT.md`.

## 1. Masalah

Section 06 (`/finance/finance-in-action`) hanya membaca satu pintu: view `fsre_published.model_packages`. Sebuah
model baru tampil kalau ada baris `fsre.package_release` berstatus `published` **dan** baris `fsre.manifest` untuk
perusahaan dan wave yang sama, dengan stage `partner_reviewed`/`closed`, `stage_status = passed`,
`dika_approved = true`. Per 22 Okt kedua tabel kosong (0 baris).

Akibatnya setiap model wajib lewat seluruh pipeline FSRE (manifest, wave, stage). Model yang dibuat atau
diperbaiki di luar pipeline, misalnya hasil revisi INDY/ADRO/BREN oleh GPT atau model buatan Dika sendiri, tidak
punya jalan masuk.

Temuan lain dari pengecekan 22 Okt:

- Production masih menampilkan halaman legacy ("0 of 0 models available"), bukan Section 06 baru yang sudah ada
  di `main`. Keputusan D12(a) (10 Okt) menolak tampilan itu. Kemungkinan `VITE_FIA_LIVE` belum menyala atau
  belum di-redeploy; belum bisa diverifikasi dari sesi ini.
- View FSRE memaksa `meta.status = "published"`, sehingga paket dengan gate `failed` akan tampil sebagai Published.

## 2. Tujuan

1. Dua jalur masuk ke satu halaman: **jalur FSRE** (tidak diubah) dan **jalur manual** (baru).
2. Jalur manual tidak menurunkan standar. Paket manual tetap wajib lolos kontrak situs (`model-package.schema.json`
   proposal v3.1) dan seluruh validasi `buildRegistry`. Yang dilewati hanya tahapan pipeline FSRE.
3. Paket dengan gate `failed` tidak pernah tampil, dari jalur mana pun.
4. Dika bisa memasukkan, mengganti dan menarik model manual tanpa menulis SQL.

## 3. Bukan tujuan

- Mengubah pipeline FSRE, skema `fsre`, `fsre_private`, `fsre_status`, atau view `fsre_published.*`.
- Mengubah kontrak paket (proposal v3.1).
- Membangun halaman admin atau upload di situs. Auth, admin, authoring dan editor tidak disentuh.
- Membuat atau memperbaiki model INDY/ADRO/BREN (pekerjaan terpisah, lihat prompt GPT 21 Okt).

## 4. Keputusan

| # | Hal | Keputusan | Status |
|---|---|---|---|
| D1 | Dua jalur | FSRE dan manual, digabung di satu view yang dibaca situs | Disepakati 22 Okt |
| D2 | Satu ticker ada di dua jalur | Yang `approved_at`-nya paling baru menang; kalau sama persis, FSRE menang | Disepakati 22 Okt |
| D3 | Pemilik objek database | Skema baru `fia`, dimiliki repo situs (migrasi di `supabase/migrations/`). Skema `fsre*` tetap milik `fsre-skills` dan tidak disentuh, supaya migrasi FSRE berikutnya tidak menimpa jalur manual | **Usulan, konfirmasi** |
| D4 | Validasi kontrak di database | Aktifkan `pg_jsonschema` (tersedia, belum terpasang). Insert manual yang tidak lolos JSON Schema ditolak database | **Usulan, konfirmasi** |
| D5 | Paket dengan gate `failed` | Tidak tampil, dari kedua jalur. Jalur manual menolaknya saat status `published`; view gabungan menyaringnya juga untuk jalur FSRE | **Usulan, konfirmasi** |
| D6 | Penempatan INDY, ADRO, BREN | INDY dan ADRO di A121 Coal production (pair satu sama lain); BREN di sub-industri baru panas bumi di `band-energy` (kode dan nama ditetapkan Dika) | **Default, konfirmasi** |
| D7 | Depth dan Capital in Motion | Ketiganya `executive`. INDY [3, 8], ADRO [3, 9], BREN [4, 6] | **Default, konfirmasi** |

## 5. Kebutuhan

### R1. Jalur manual di database

- Tabel `fia.manual_release`: `ticker`, `version`, `content_hash`, `package` (jsonb), `status`
  (`staged` / `published` / `withdrawn`), `approved_by`, `approved_at`, `note`, `created_at`, `created_by`,
  `updated_at`. Unik per (`ticker`, `version`).
- Database menolak baris yang:
  - tidak lolos JSON Schema kontrak v3.1 (D4);
  - `package.meta.ticker` ≠ `ticker`, `package.meta.version` ≠ `version`, atau `package.meta.contentHash` ≠
    `content_hash` (64 heksadesimal);
  - `package.meta.provenance` ≠ `filings`;
  - berstatus `published` tanpa `approved_by` dan `approved_at`;
  - berstatus `published` dengan gate `failed` di `workpaper.gates` (D5).
- Baris `published` tidak bisa diubah isinya dan tidak bisa dihapus. Yang boleh hanya status ke `withdrawn`.
  Revisi = baris baru dengan `version` baru.
- Tidak ada grant ke `anon` atau `authenticated` untuk tabel ini; RLS menyala tanpa policy.

### R2. Satu view untuk situs

- View `fia.model_packages` = paket dari `fsre_published.model_packages` (kanal `fsre`) digabung paket dari
  `fia.manual_release` berstatus `published` (kanal `manual`).
- Satu baris per ticker, aturan D2. Paket dengan gate `failed` disaring (D5).
- Kolom: `ticker`, `version`, `channel`, `content_hash`, `approved_by`, `approved_at`, `package`. Di `package`,
  `meta.status` diisi `published` dan `workpaper.approvedBy/approvedAt` diisi dari baris, sama seperti view FSRE.
  `channel` tidak masuk ke `package`, jadi kontrak tidak berubah.
- `anon` hanya SELECT pada view ini. Skema `fia` di-expose ke Data API.

### R3. Situs membaca view baru

- `src/lib/finance-in-action/published.ts`: skema `fsre_published` → `fia`. Penanganan error (`not-available`,
  `refused`, `failed`) tetap.
- Tes, `scripts/world/check-published.ts`, dan komentar yang menyebut `fsre.approve_package` sebagai satu-satunya
  jalan diperbarui.
- Tidak ada perubahan tampilan.

### R4. Alat masuk manual untuk Dika

- Skrip `scripts/fia/publish-manual.ts`: membaca file paket JSON, menjalankan validasi yang sama dengan situs
  (`validate.ts`, `buildRegistry` dengan `requireListedSubIndustry`), menghitung atau memeriksa `contentHash`, lalu
  insert ke `fia.manual_release`. Mode: `--check` (validasi saja, tanpa tulis), `--stage`, `--publish`,
  `--withdraw <ticker> <version>`.
- Koneksi lewat `SUPABASE_DB_URL` di `.env.local` (tidak pernah di-commit, tidak pernah dicetak).
- Runbook berbahasa Indonesia dengan perintah siap salin, nilai Dika sudah terisi kecuali rahasia.

### R5. Daftar perusahaan

- `sub-industries.json` dan `fixtures/slate.json` memuat INDY, ADRO, BREN sesuai D6 dan D7, berstatus
  `not_started` sampai paketnya masuk. Tanpa ini paket ditolak dengan alasan `meta.subIndustry`.

### R6. Halaman live di production

- `VITE_FIA_LIVE=true` di Vercel Production, `VITE_FIA_PREVIEW` tidak ada, redeploy. Langkah Dika.

## 6. Kriteria terima

| # | Kriteria | Bukti |
|---|---|---|
| A1 | Production menampilkan Section 06 baru dengan slate "Planned; no model yet" | Screenshot `/finance/finance-in-action` |
| A2 | Migrasi jalan bersih di database kosong dan di database dengan view FSRE | Log apply + tes SQL |
| A3 | Tes SQL: setiap aturan R1 punya kasus negatif yang ditolak dan satu kasus positif yang diterima, dalam transaksi yang di-rollback | Output `supabase/tests/fia_manual_release.sql` |
| A4 | Aturan D2: ticker di dua kanal tampil sekali, yang terbaru menang; seri → FSRE | Tes SQL |
| A5 | Paket dengan gate `failed` tidak muncul di `fia.model_packages` dari kanal mana pun | Tes SQL |
| A6 | `anon` bisa SELECT `fia.model_packages`, tidak bisa membaca atau menulis `fia.manual_release` | Tes SQL dengan `set role anon` |
| A7 | `fsre*` tidak berubah | Diff `pg_get_viewdef` dan daftar objek sebelum/sesudah |
| A8 | Situs membaca `fia`; CI hijau (eslint plafon, typecheck, vitest, `assert-test-count` tidak turun, build, `assert-no-synthetic` live) | Output CI |
| A9 | `publish-manual.ts --check` menolak paket rusak dengan alasan yang sama dengan situs; fixture SYNTHETIC selalu ditolak di `--publish` karena provenance | Output skrip |
| A10 | `check-published.ts` terhadap production: HTTP 200, 0 paket (sebelum ada model) | Output skrip |

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Paket manual sekitar 1–3 MB; Table Editor dan SQL editor Supabase berat untuk tempel | Jalur utama skrip R4; Table Editor hanya cadangan |
| `pg_jsonschema` berperilaku beda dari validator situs (draft-07) | Database = lapis pertama, `buildRegistry` di situs tetap lapis terakhir; tes memastikan fixture yang valid lolos keduanya |
| Skema JSON di migrasi menyimpang dari `model-package.schema.json` | Skema disimpan di tabel `fia.contract_schema` oleh migrasi; tes unit membandingkannya dengan file kontrak |
| Migrasi FSRE kelak mengganti `fsre_published.model_packages` | View `fia` hanya membaca kolom `package`, `approved_by`, `approved_at`, `version`, `content_hash`; tes A7 dan catatan di `DECISIONS.md` |
| Model manual melewati review yang ada di FSRE | Gate `failed` diblok; approve wajib nama dan tanggal; `channel` tercatat; revisi selalu versi baru |
