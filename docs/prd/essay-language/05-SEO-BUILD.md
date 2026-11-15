# Paket E: SEO, sitemap, dan build

Tujuan: mesin pencari tahu bahwa sebuah esai punya dua bahasa, dan build tidak rusak.
Bergantung pada Paket C. **Lewati seluruh paket ini bila pemilik menjawab K1 "cukup
tombol".**

## E1. `src/components/SEO.tsx`

Tambah dua prop opsional. Tanpa keduanya, keluaran harus sama persis dengan sekarang.

- `lang?: 'en' | 'id'`: mengatur `<html lang>` lewat `htmlAttributes` milik Helmet, dan
  `og:locale` (`en_US` atau `id_ID`).
- `alternates?: { en: string; id: string }`: menulis
  `<link rel="alternate" hreflang="en">`, `hreflang="id"`, dan `hreflang="x-default"`
  (menunjuk ke versi Inggris).

Canonical:
- Sekarang canonical dibentuk dari asal produksi + `pathname`, tanpa parameter. Untuk
  versi Indonesia canonical harus menyertakan `?lang=id`, supaya dua bahasa tidak dianggap
  satu halaman.
- Hanya `lang=id` yang boleh masuk canonical. Parameter lain tetap dibuang seperti
  sekarang.

Kerangka artikel (Paket C) mengirim `lang`, `alternates`, serta judul dan deskripsi dalam
bahasa yang sedang tampil. `alternates` hanya dikirim untuk esai yang punya versi
Indonesia terbit.

`index.html` tetap `lang="en"`. Atributnya diganti saat halaman berjalan.

## E2. Sitemap

- Sitemap dibangun di `scripts/lib/siteFeeds.mjs` dari hasil
  `scripts/lib/publishedEssays.mjs`.
- Tambah satu pembacaan saat build: daftar `essay_id` (atau slug) yang punya versi
  Indonesia terbit. Pembacaan ini publik, sama seperti pembacaan esai.
- Untuk esai itu, tulis entri kedua dengan `?lang=id`, dan pasangan
  `xhtml:link rel="alternate"` di kedua entri.
- Bila pembacaan gagal, build harus gagal dengan pesan yang jelas, mengikuti aturan
  "gagal dengan keras" yang sudah ada di `scripts/prerender.mjs`. Jangan diam-diam
  menghasilkan sitemap tanpa versi Indonesia.
- RSS (`buildFeed`) tidak berubah: tetap Inggris.

## E3. Prerender

- HTML statis per esai tetap satu, untuk alamat tanpa parameter, dengan meta Inggris.
- Tambahkan tag `hreflang` ke HTML statis esai yang punya versi Indonesia, supaya tag itu
  ada di HTML mentah dan cocok dengan yang ditulis `SEO.tsx` setelah halaman berjalan.
- Jangan mengubah gambar kartu bagikan.

## E4. Yang sengaja tidak dikerjakan: kartu bagikan Indonesia

Tautan `...?lang=id` yang dibagikan di WhatsApp akan menampilkan kartu berjudul Inggris,
karena berkas statis tidak membedakan parameter. Halaman yang terbuka tetap versi
Indonesia.

Ini belum diteliti lebih jauh. Dua arah yang mungkin, keduanya butuh keputusan pemilik dan
pembuktian di host:
1. Alamat berbasis jalur untuk versi Indonesia, sehingga prerender bisa menulis berkas
   kedua dengan meta Indonesia. Ini menambah rute dan perlu dicek terhadap rute yang ada
   (misalnya bentuk empat segmen `/finance/:track/:moduleSlug/:essaySlug` yang sekarang
   dipakai untuk pengalihan).
2. Aturan di sisi host yang menyajikan berkas lain bila ada `?lang=id`. Belum dipastikan
   apakah ini bisa mendahului berkas statis di Vercel.

Catat di ringkasan akhir sebagai keterbatasan terbuka. Jangan memilih salah satu tanpa
pemilik.

## E5. Uji

- Uji unit untuk pembentukan canonical dan `alternates`.
- Uji sitemap yang ada (`tests/unit/siteFeeds.test.ts`) diperluas dengan satu esai
  dwibahasa dan satu esai Inggris saja.
- `npm run build` lulus dari awal sampai akhir, termasuk `assert-no-synthetic`,
  `assert-world-flag`, dan `prerender`.

## Selesai bila

- Uji E5 lulus.
- HTML statis sebuah esai dwibahasa di `dist/` memuat tiga tag `hreflang`; HTML esai yang
  hanya Inggris tidak berubah satu bait pun dibanding build sebelum paket ini. Buktikan
  dengan `diff` atas `dist/` sebelum dan sesudah.
