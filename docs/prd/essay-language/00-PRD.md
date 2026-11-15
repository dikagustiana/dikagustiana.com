# PRD: pilihan bahasa per esai

## Keadaan sekarang

- Satu esai adalah satu baris di `public.essays`. Isi panjangnya di `content_json` (dengan
  `content` sebagai HTML lama), isi ringkasnya di `brief_json` (opsional).
- Di halaman esai ada tombol `Full · Brief` (`src/components/editorial/BriefToggle.tsx`).
  Tombol hanya muncul bila Brief ada. Full selalu jadi tampilan awal. Alamat esai tetap
  satu; pilihan Full atau Brief hanya keadaan di browser.
- Brief ditulis di halaman tersendiri (`/admin/writer/:section/:slug/brief`), yang tidak
  pernah memuat isi panjang. Cadangan otomatisnya masuk `essay_revisions` dengan
  `change_type` berawalan `brief_`.

## Yang diminta

Tiap esai bisa punya versi Bahasa Indonesia. Dengan Full dan Brief, satu esai punya sampai
empat sel:

| | Full | Brief |
|---|---|---|
| **EN** | selalu ada | opsional (sudah ada) |
| **ID** | opsional (baru) | opsional (baru) |

### Perilaku untuk pembaca

1. Tombol `EN · ID` muncul di samping `Full · Brief`, hanya bila versi Indonesia esai itu
   sudah diterbitkan. Tanpa versi Indonesia: tidak ada tombol, tidak ada tombol mati,
   tidak ada tulisan "segera hadir".
2. Memilih ID mengganti: judul, deck, isi, Brief, dan poin kunci (key takeaways). Yang
   tidak berganti: tanggal, penulis, gambar utama, daftar referensi, genre, navigasi
   sebelum/sesudah, esai terkait.
3. Versi Indonesia boleh hanya punya Brief, hanya punya Full, atau keduanya. Aturannya:
   - Tombol `Full · Brief` muncul hanya bila bahasa yang sedang dipilih punya dua-duanya.
   - Saat pindah bahasa, tampilan (Full atau Brief) dipertahankan bila selnya ada. Bila
     tidak ada, pindah ke sel yang ada di bahasa itu.
4. Daftar isi di samping mengikuti isi yang sedang tampil. Pada tampilan Brief daftar isi
   disembunyikan, seperti sekarang.
5. Bagian isi yang berbahasa Indonesia diberi atribut `lang="id"`, supaya pembaca layar
   dan pemenggalan kata bekerja benar.

### Perilaku untuk penulis (pemilik)

1. Versi Indonesia ditulis di halaman tersendiri di admin, bukan di editor esai panjang.
2. Versi Indonesia punya status sendiri: draf atau terbit. Draf tidak terlihat pembaca,
   walaupun esai Inggrisnya sudah terbit.
3. Mengetik menghasilkan cadangan otomatis. Bila tab mati sebelum disimpan, cadangan itu
   ditawarkan saat halaman dibuka lagi, tidak pernah diterapkan diam-diam.
4. Daftar esai di admin menunjukkan status versi Indonesia tiap esai: belum ada, draf,
   atau terbit.

## Di luar cakupan

- Menerjemahkan tampilan situs: menu, footer, halaman daftar, kartu esai di beranda. Kartu
  dan daftar tetap memakai judul Inggris.
- Label kerangka artikel ("Key takeaways", "References", "Full", "Brief", tautan kembali)
  tetap Inggris walaupun isi sedang berbahasa Indonesia. Bila pemilik ingin label ini ikut
  berganti, itu pekerjaan kecil lanjutan, bukan bagian paket ini.
- Bahasa ketiga. Rancangan data menyimpan kode bahasa, tetapi hanya `id` yang diizinkan.
- Esai Foundations of Knowing (`src/pages/CriticalThinkingEssay.tsx`) pada tahap pertama.
  Halaman itu tidak memakai kerangka artikel yang sama dan belum punya tombol Brief.
  Lihat Paket C, bagian "Halaman yang tidak ikut".
- Finance in Action, FSLI, tracker, dan halaman non-esai lain.

## Keputusan terbuka (milik pemilik)

Tiga hal ini ditanyakan pada 15 November 2026 dan belum dijawab. Tiap paket memakai nilai
bawaan. Bila jawaban pemilik berbeda, ubah paket yang disebut.

| | Pertanyaan | Bawaan yang dipakai | Bila dijawab lain |
|---|---|---|---|
| **K1** | Apakah versi Indonesia perlu punya tautan sendiri yang bisa dibagikan? | Ya: `?lang=id` pada alamat esai yang sama. | Bila cukup tombol saja: lewati Paket E, dan di Paket C simpan pilihan sebagai keadaan di browser seperti Brief. |
| **K2** | Siapa yang menulis teks Indonesia? | Pemilik menulis sendiri. Tidak ada yang dibuat mesin. | Bila pemilik mau draf terjemahan untuk disunting: itu pekerjaan terpisah di luar paket ini, dan aturan 1 di README harus dicabut pemilik secara tertulis. |
| **K3** | Bahasa awal saat esai dibuka tanpa `?lang`? | Selalu Inggris. | Bila ingin Indonesia otomatis untuk browser berbahasa Indonesia: tambahan kecil di Paket C (`resolveInitialLanguage`). |

## Keterbatasan yang sudah diketahui

**Kartu bagikan di WhatsApp untuk tautan `?lang=id` masih berjudul Inggris.** Prerender
menulis satu berkas HTML statis per alamat esai, dan berkas statis tidak membedakan
parameter `?lang`. Jadi perayap yang tidak menjalankan JavaScript melihat judul dan
deskripsi Inggris; halaman yang terbuka tetap versi Indonesia. Memperbaikinya butuh alamat
berbasis jalur untuk versi Indonesia atau aturan di sisi host, dan itu belum diteliti. Ini
dicatat sebagai pilihan lanjutan di Paket E, bukan dikerjakan sekarang.

## Kenapa tabel baru, bukan kolom baru di `essays`

Brief disimpan sebagai satu kolom di `essays` karena menyimpan Brief berarti langsung
tayang. Versi Indonesia berbeda: ia punya masa draf yang bisa lama, sementara esai
Inggrisnya sudah terbit. Aturan akses (RLS) bekerja per baris, bukan per kolom. Bila draf
Indonesia disimpan di kolom pada baris esai yang sudah terbit, siapa pun bisa membacanya
lewat API. Tabel tersendiri dengan aturan aksesnya sendiri menutup celah itu.
