# Langkah yang Dika jalankan (transition data layer)

Kode, migration, tes, workflow, dan layar admin sudah ada di branch ini. Yang tersisa butuh
akses produksi, key, atau keputusan editorial kamu. Urutan: 1 → 2 → 3 → 4 → 5.

## 1. Migration (Supabase SQL Editor)

**Status 24 Okt 2026:** bagian 1 (9 tabel, enum, helper, RLS terkunci tanpa policy) sudah
diterapkan Claude lewat konektor (migration `transition_data_layer_1_tables`). Sisanya tertahan
karena permintaan konfirmasi konektor tidak sampai ke layar.

1. Buka https://supabase.com/dashboard/project/asypkbkiebjvvpimewfp/sql/new
2. Salin **seluruh** isi `docs/prd/transition-data-layer/JALANKAN-INI.sql`, tempel, **Run**.
   Hasil yang benar: "Success. No rows returned". Satu transaksi: kalau gagal, tidak ada yang berubah.
3. Uji: salin isi `supabase/tests/transition_data_layer.sql`, Run. Baris terakhir harus
   **"65 passed, 0 failed"**. Semua yang ditulis tes ini dibatalkan (ROLLBACK).

Situs aman sebelum langkah ini: halaman tracker tetap menampilkan register; bagian grafik baru
muncul setelah ada grafik yang publish.

Membatalkan: isi `supabase/rollback/20261024120000_transition_data_layer_down.sql` → Run.

## 2. Secrets GitHub Actions

GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:

| Nama | Isi |
|---|---|
| `VITE_SUPABASE_URL` | URL project (sekaligus menyelesaikan P0 backup) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Project Settings → API). Migration membatasi key ini: hanya bisa menulis staging dan log, tidak bisa publish melewati aturan. |
| `EMBER_API_KEY` | Daftar gratis di https://ember-energy.org/data/api/ (email) |

## 3. Tarik data pertama

GitHub → Actions → **Transition data fetch** → Run workflow:

1. `source = imf` → harus hijau. Di `/admin/transition-data`, lima seri IMF berstatus published.
2. `source = ember` → kalau merah, buka log-nya. Pesan seperti "series Total not in the answer;
   it has …" atau "no field …" berarti nama di spesifikasi Ember beda dengan jawabannya. Kirim log
   itu ke Claude; perbaikannya satu baris di `pipelines/transition/registry.py`.

Setelah itu workflow jalan sendiri tiap Senin 02:13 WIB. Revisi > 25% tidak dipublish otomatis:
muncul di admin, kamu cek ke sumber, centang, Publish.

Uji G1: ambil 10 nilai acak dari tabel di halaman grafik ("Show the values as a table"),
cocokkan ke situs IMF/Ember. Selisih harus 0.

## 4. Data manual (G2)

`/admin/transition-data` → pilih seri → **One value** atau **Paste CSV**
(kolom `period_start,value,vintage,source_url,source_locator`):

- `pln.idn.spklu_units`: unit SPKLU **PLN saja**, dari siaran pers PLN sendiri.
- `bei.idxcarbon.volume`: volume per kuartal dari **rilis BEI/IDXCarbon asli** (bukan Bisnis.com).
  `period_start` = awal kuartal (2025-01-01 untuk Q1).
- `djppr.idn.green_sukuk`: nilai tiap penerbitan dari rilis DJPPR.

`vintage` = tanggal dokumen sumber; `source_locator` = halaman/tabel/paragraf (wajib).
**Run the checks** → **Publish through the gate**.

## 5. Judul temuan dan publish grafik (G3)

Masih di `/admin/transition-data`, bagian **Charts and the chain**:

1. Ganti tiap judul `[Finding: …]` dengan satu kalimat temuan → **Save title** → **Publish**.
   Judul berkurung siku ditolak database.
2. Isi status tiap mata rantai (opsional; kosong = jumlah grafik).
3. Esai pilot: di editor, ketik `/` → **Tracker chart** → pilih grafik.
4. Tinjau Verification Register untuk tiap grafik yang publish.

Lalu merge PR. Setelah migration diterapkan, generate ulang `src/integrations/supabase/types.ts`
(opsional; kode sekarang memakai cast seperti `tracker_entry`).

## Keputusan yang masih kamu pegang

Lihat `04-STATUS.md`, bagian terakhir. Default yang dipakai: indeks + embed, bahasa Inggris,
kebijakan cukup lewat penanda register, ambang R7 25% (bisa per seri), esai pilot belum dipilih.
