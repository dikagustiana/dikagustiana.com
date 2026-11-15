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
