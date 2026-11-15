# Paket F: verifikasi sebelum digabung

Tujuan: bukti bahwa fitur bekerja dan tidak ada yang lama yang rusak. Dikerjakan setelah
Paket A sampai E.

## F1. Data uji

Uji e2e butuh paling sedikit satu esai dengan versi Indonesia. Jangan membuat data uji di
database live tanpa izin pemilik.

Urutan pilihan:
1. Periksa bagaimana uji e2e yang ada menyediakan data esai (`tests/e2e`,
   `playwright.config.ts`, dan `docs/e2e-live-testing.md`). Bila memakai tiruan jaringan
   atau fixture, tambahkan baris `essay_translations` dengan cara yang sama.
2. Bila uji hanya bisa berjalan terhadap data live: berhenti dan tanyakan pemilik esai
   mana yang boleh diberi versi Indonesia uji, atau tunggu pemilik menulis versi Indonesia
   pertamanya.

Teks Indonesia di fixture adalah teks uji buatan (misalnya "Judul uji"), bukan terjemahan
esai sungguhan. Jangan pernah memasukkan teks uji ke database live sebagai versi terbit.

## F2. Daftar periksa

Perintah, semuanya harus lulus, dengan keluaran dicatat:

```
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Perilaku, diperiksa di browser pada 360px dan 1440px:

| # | Yang diperiksa | Hasil yang diharapkan |
|---|---|---|
| 1 | Esai tanpa versi Indonesia | Tidak ada tombol bahasa. Halaman sama dengan sebelum fitur. |
| 2 | Esai dengan versi Indonesia lengkap | Tombol `EN · ID` muncul. ID mengganti judul, deck, isi, poin kunci. |
| 3 | Versi Indonesia hanya Ringkas | Memilih ID menampilkan Ringkas. Tombol `Full · Brief` tidak muncul saat ID. |
| 4 | Versi Indonesia hanya Panjang, Inggris punya Brief | Dari EN + Brief pindah ke ID → tampil ID + Full. |
| 5 | `?lang=id` dibuka langsung | Versi Indonesia tampil tanpa kedipan versi Inggris. |
| 6 | `?lang=id` pada esai tanpa versi Indonesia | Versi Inggris tampil, parameter hilang dari alamat. |
| 7 | Versi Indonesia berstatus draf | Pembaca yang tidak masuk tidak melihat tombol, dan permintaan API langsung ke `essay_translations` tidak mengembalikan barisnya. |
| 8 | Esai Inggris ditarik dari tayang | Versi Indonesianya ikut tidak terbaca lewat API. |
| 9 | Daftar isi | Mengikuti judul bagian dalam bahasa yang tampil. |
| 10 | Papan ketik saja | Tombol bahasa bisa dicapai dan dipakai; fokus terlihat. |
| 11 | Pembaca layar | Isi Indonesia berada di dalam elemen ber-`lang="id"`. |
| 12 | Bagikan (`ShareButton`) saat ID | Tautan yang disalin memuat `?lang=id`. Periksa: komponen itu sekarang memakai `pathname` saja, jadi kemungkinan perlu diubah. |
| 13 | Salin tautan judul bagian (`LinkableHeading`) saat ID | Tautan memuat `?lang=id` dan `#id-bagian`. Sama: sekarang memakai `pathname` saja. |
| 14 | Admin: tulis, muat ulang, pulihkan, simpan, terbitkan, tarik | Tiap langkah bekerja; esai Inggris tidak berubah (`updated_at` dan isi sama). |
| 15 | Admin: pemulihan esai Inggris setelah menulis versi Indonesia | Tidak pernah menawarkan cadangan versi Indonesia. |

Baris 7, 8, dan 15 adalah yang paling penting: ketiganya menjaga draf dari bocor dan esai
dari tertimpa. Jangan menandai paket selesai bila salah satunya belum dibuktikan.

## F3. Laporan

Tulis di bagian bawah `README.md` folder ini:
- apa yang dibangun, per paket;
- di mana hasilnya berbeda dari rencana, dan kenapa;
- hasil tiap baris daftar periksa, dengan bukti (keluaran perintah, tangkapan layar di
  `shots/`);
- yang belum dikerjakan atau belum bisa dibuktikan, dinyatakan terang;
- keterbatasan terbuka: kartu bagikan Indonesia (Paket E4) dan esai Foundations (Paket C).

Lalu berhenti. Penggabungan ke `main` dan deploy menunggu izin pemilik.
