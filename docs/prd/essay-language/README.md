# Pilihan bahasa per esai (EN · ID): paket kerja

Disusun 15 November 2026. Status: **rencana, belum ada kode yang ditulis.**
Dokumen ini adalah pintu masuk bagi siapa pun yang mengerjakannya.

## Apa yang diminta

Tiap esai sudah punya dua versi: panjang (Full) dan ringkas (Brief). Pemilik ingin tiap esai
juga bisa punya versi Bahasa Indonesia, dipilih pembaca di halaman esai itu sendiri, dengan
cara yang sama seperti memilih Full atau Brief. Tampilan situs (menu, footer, halaman daftar)
tetap berbahasa Inggris.

## Isi folder

| Berkas | Isi | Bergantung pada |
|---|---|---|
| [00-PRD.md](00-PRD.md) | Perilaku yang diminta, batas cakupan, keputusan pemilik yang masih terbuka | — |
| [01-DATA.md](01-DATA.md) | Paket A: tabel `essay_translations`, RLS, jenis revisi baru | 00 |
| [02-BACA.md](02-BACA.md) | Paket B: fungsi murni dan hook untuk membaca versi Indonesia | A |
| [03-PEMBACA.md](03-PEMBACA.md) | Paket C: tombol `EN · ID` di halaman esai | B |
| [04-PENULIS.md](04-PENULIS.md) | Paket D: tempat menulis versi Indonesia di admin | B |
| [05-SEO-BUILD.md](05-SEO-BUILD.md) | Paket E: `?lang=id`, `hreflang`, sitemap, prerender | C |
| [06-VERIFIKASI.md](06-VERIFIKASI.md) | Paket F: uji dan daftar periksa sebelum digabung | A–E |
| [LANGKAH-DIKA.md](LANGKAH-DIKA.md) | Yang hanya bisa dilakukan pemilik | — |

Urutan: A, lalu B, lalu C dan D (boleh bersamaan), lalu E, lalu F.

## Sebelum mulai

1. Baca `00-PRD.md` sampai habis. Bagian "Keputusan terbuka" berisi tiga hal yang belum
   dijawab pemilik. Tiap paket menulis nilai bawaan yang dipakai bila belum ada jawaban.
   Kalau jawaban pemilik berbeda dari bawaan, paket yang terdampak disebut di sana.
2. Baca catatan Brief di `docs/DECISIONS.md` (judul "2026-08-03 — The Brief companion",
   sekitar baris 2373). Fitur ini sengaja meniru pola Brief, dan beberapa aturannya dipakai
   ulang apa adanya.
3. Kerjakan di branch baru `feat/essay-language` yang dibuat dari `main`.

## Keadaan repo saat dokumen ini ditulis

- `main` bersih, sama dengan `origin/main` (commit `c384c71`).
- Ada branch lokal `feat/i18n-id` berisi dua berkas yang belum di-commit:
  `src/i18n/locale.ts` dan `src/i18n/t.ts`. Itu sisa percobaan menerjemahkan seluruh
  tampilan situs lewat awalan `/id`, yang **bukan** yang diminta pemilik. Keduanya tidak
  dipakai paket ini. Hapus dua berkas itu dan branch-nya setelah pemilik setuju; jangan
  dibawa ke `feat/essay-language`.
- `scripts/books/` adalah folder tak terlacak yang sudah ada sebelumnya. Bukan bagian
  pekerjaan ini; jangan disentuh.

## Aturan yang tidak boleh dilanggar

1. **Tidak ada teks esai yang dibuat mesin.** Tidak ada langkah di paket ini yang
   menerjemahkan, meringkas, atau mengusulkan isi esai. Ini aturan Brief yang berlaku juga
   di sini, kecuali pemilik memutuskan lain di K2.
2. **Database live tidak diubah tanpa izin pemilik.** Migrasi diuji dulu dalam transaksi
   yang dibatalkan, lalu berhenti dan minta izin. Cara menerapkannya ada di
   `docs/RUNBOOK.md`: lewat `apply_migration`, tidak pernah lewat perintah CLI Supabase.
3. **Jalur simpan esai panjang berbahasa Inggris tidak berubah perilakunya.** Autosave,
   pemulihan, dan penerbitan esai yang sudah ada harus tetap lulus uji yang sama.
4. **Tidak ada push, merge ke `main`, atau deploy tanpa izin pemilik.**
5. Tiap paket selesai bila `npm run typecheck`, `npm run lint`, dan `npm run test:unit`
   lulus, ditambah syarat di bagian "Selesai bila" paket itu. Bila ada yang gagal, laporkan
   dengan keluarannya; jangan menandai selesai.

## Setelah selesai

Tulis ringkasan "apa yang dibangun" di bagian bawah berkas ini, mengikuti bentuk
`docs/prd/foundations-of-knowing/README.md`: apa yang berubah, di mana berbeda dari
rencana, dan buktinya. Catat keputusan baru di `docs/DECISIONS.md`.

---

# Apa yang dibangun (15 November 2026)

Dikerjakan di branch `feat/essay-language`, semua commit lokal, belum di-push. Pemilik bilang
"jalanin langsung"; K1–K3 tidak dijawab, jadi bawaan dipakai: `?lang=id`, teks ditulis pemilik,
selalu Inggris dulu.

## Per paket

| Paket | Hasil |
|---|---|
| A. Data | `supabase/migrations/20261115120000_essay_translations.sql`: tabel, RLS, trigger `updated_at`, 7 jenis revisi `id_*`. Uji akses `docs/db/verify/05_essay_translations_acceptance.sql` memeriksa dirinya sendiri. **Belum diterapkan.** Dry-run di database live dalam transaksi yang dibatalkan: semua lulus, jumlah baris sebelum = sesudah (284 esai, 261 revisi). `types.ts` ditambah dengan tangan (generator tipe tidak tersedia). |
| B. Baca | `src/lib/essayLanguage.ts` (aturan murni), `src/hooks/queries/useEssayTranslation.ts`. Pembacaan gagal = `null`, tidak pernah galat halaman. |
| C. Pembaca | `LanguageToggle`, `useEssayLanguageView` dipakai kedua kerangka; lima halaman esai terhubung. Tombol Bagikan dan salin-tautan-judul membawa `?lang=id`. |
| D. Penulis | `/admin/writer/:section/:slug/id` (`TranslationEditor`): Full memakai `EssayEditor` + toolbar yang sama dengan esai Inggris; Brief memakai skema Brief. Lencana `ID draft / ID live / + ID` di Writer's Desk; tautan "Indonesian" di editor esai (tab baru). |
| E. SEO/build | `SEO.tsx` (`lang`, `alternates`), hreflang di HTML prerender, kembaran `?lang=id` di sitemap. |
| F. Verifikasi | Lihat di bawah. |

## Berbeda dari rencana

1. **Autosave versi Indonesia selalu hanya cadangan** (rencana: ikut menulis baris selama draf). Aturan seragam Brief; pemulihan tetap menangkap tab yang mati.
2. **Pengalihan kanonis kini membawa `?lang=id`** (`EssayRedirect`). Tidak ada di rencana; ditemukan saat membuat tautan "View it live": `/essays/<slug>?lang=id` mendarat di versi Inggris.
3. **`bodyForChangeType`** di `revisions.ts`. Tanpa ini `writeRevision` menganggap `id_autosave` milik esai Inggris dan tidak pernah menggabungkan cadangan beruntun.
4. **`<html lang>` diatur lewat efek, bukan Helmet** (Helmet menghapus atribut yang ia kelola saat dilepas).
5. **Tabel yang belum ada hanya memberi peringatan di build**, supaya kode yang tergabung sebelum migrasi tidak mematahkan deploy.
6. **Label admin berbahasa Inggris** (Full, Brief, Save, Publish), seragam dengan admin lain. Rencana menyebut "Panjang/Ringkas".
7. **Uji aksesibilitas dipersempit.** Halaman esai sudah punya temuan kontras sebelum fitur ini (dek `.editorial-subtitle`, label "Text" ukuran huruf). Uji memastikan tombol bahasa bersih dan versi Indonesia tidak menambah temuan.

## Daftar periksa (06-VERIFIKASI.md)

| Perintah | Hasil |
|---|---|
| `npm run typecheck` | lulus |
| `npm run lint` | 0 galat (22 peringatan, semuanya di berkas lama) |
| `npm run test:unit` | 1842 lulus, 11–12 gagal. 11 gagal identik di `main` yang bersih (books ×3, workbookViewer ×7, worldEngineRules ×1). Yang ke-12, `worldBoundary`, berselang-seling di bawah beban penuh dan lulus 3/3 bila sendiri; tidak mengimpor kode yang diubah. |
| `npm run build` | berhenti di `scripts/world/render-poster.mjs` pada Windows (path `c:` ditolak loader ESM; berkas tidak diubah). Langkah sisanya dijalankan satu per satu: `vite build`, `assert-no-synthetic`, `assert-world-flag` lulus; prerender dilewati karena tidak ada kunci publik lokal, seperti di CI. |
| `npm run test:e2e` | 107 lulus, 1 gagal (`books.spec.ts` @1440), yang juga gagal di `main` yang bersih. |

| # | Butir | Bukti |
|---|---|---|
| 1 | Esai tanpa versi Indonesia tidak berubah | HTML kedua kerangka identik dengan `main` untuk 8 kombinasi (perbandingan sementara, dihapus setelah lulus); e2e "shows no language toggle" |
| 2 | ID mengganti judul, dek, isi, poin kunci | unit `essayLanguageShell` + e2e |
| 3 | Versi hanya Ringkas | unit `essayLanguageShell` |
| 4 | EN+Brief → ID tanpa Brief | unit `essayLanguage` (semua 8 kombinasi) |
| 5 | `?lang=id` tanpa kedipan | unit (tidak ada judul selama memuat) + e2e muat ulang |
| 6 | `?lang=id` tanpa versi Indonesia | unit + e2e (parameter hilang) |
| 7 | Draf tidak terbaca anon | uji SQL, dry-run live |
| 8 | Esai ditarik → terjemahan ikut tak terbaca | uji SQL, dry-run live |
| 9 | Daftar isi ikut bahasa | `useEssayLanguageView` (`tocHtml` dari isi Indonesia); belum ada uji khusus |
| 10 | Papan ketik | e2e |
| 11 | `lang="id"` | unit + e2e |
| 12 | Bagikan membawa `?lang=id` | kode (`languageQuery`); belum ada uji khusus |
| 13 | Salin tautan judul membawa `?lang=id` | kode; belum ada uji khusus |
| 14 | Alur admin ujung ke ujung | **belum**: butuh tabel di database. Yang terbukti: buka → judul → Simpan hanya menulis `essay_translations` dan revisi `id_*` (unit, Supabase tiruan) |
| 15 | Pemulihan Inggris tidak menawarkan cadangan Indonesia | unit `revisions` (4×4 badan) |

Tangkapan layar: `shots/essay-id-360.png`, `shots/essay-id-1440.png` (data uji, Supabase tiruan).

## Belum dikerjakan atau belum terbukti

- **Migrasi belum diterapkan.** Menunggu izin pemilik. Setelah diterapkan: jalankan uji SQL di A4 lagi terhadap database live, lalu butir 14 dengan satu esai uji.
- Pembacaan build untuk tabel yang belum ada menangani kode `PGRST205` dan `42P01`; kode yang benar-benar dikembalikan proyek ini belum dilihat langsung (kunci publik tidak ada di lingkungan lokal).
- Prerender belum dijalankan ujung ke ujung dengan esai dwibahasa (dilewati tanpa kunci).
- Penyaring anotasi referensi hanya mengenali judul "References" berbahasa Inggris; isi Indonesia dirender dari JSON apa adanya.
- Keterbatasan dari rencana tetap: kartu WhatsApp berbahasa Inggris untuk tautan `?lang=id`; esai Foundations of Knowing belum punya tombol; label kerangka tetap Inggris.

## Kejadian selama pengerjaan

`npm ci` untuk memasang paket yang hilang (`@dnd-kit`, `epubjs`, `pdfjs-dist`) gagal di tengah jalan karena `esbuild.exe` sedang dipakai `vite-node` dari sesi Claude lain, dan sempat menghapus sebagian `node_modules`. Dipulihkan dengan `npm install` (lockfile tidak berubah). Proses sesi lain itu tidak dimatikan, tetapi sempat berjalan di atas `node_modules` yang tidak lengkap.
