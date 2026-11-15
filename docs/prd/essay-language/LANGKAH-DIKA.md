# Langkah Dika

Yang hanya bisa Anda lakukan atau putuskan. Sisanya dikerjakan tim.

## Sebelum pekerjaan dimulai

**1. Jawab tiga pertanyaan.** Bila tidak dijawab, tim memakai pilihan bawaan.

| | Pertanyaan | Bawaan |
|---|---|---|
| K1 | Versi Indonesia perlu tautan sendiri yang bisa dibagikan (`...?lang=id`), atau cukup tombol di halaman? | Tautan sendiri |
| K2 | Teks Indonesia Anda tulis sendiri, atau mau dibuatkan draf terjemahan untuk disunting? | Anda tulis sendiri |
| K3 | Esai selalu terbuka dalam Inggris dulu, atau otomatis Indonesia untuk browser berbahasa Indonesia? | Selalu Inggris dulu |

**2. Putuskan nasib sisa percobaan.** Ada branch lokal `feat/i18n-id` dengan dua berkas
(`src/i18n/locale.ts`, `src/i18n/t.ts`) dari percobaan yang tidak jadi. Tidak dipakai.
Boleh dihapus?

**3. Periksa satu aturan produk.** Rencana ini mengizinkan versi Indonesia yang hanya
berisi versi ringkas, tanpa versi panjang. Alasannya: menulis ringkasan 600 kata jauh
lebih ringan daripada menulis ulang esai panjang, jadi lebih banyak esai bisa punya versi
Indonesia. Bila Anda ingin versi Indonesia selalu punya versi panjang, katakan sebelum
Paket D dikerjakan.

## Selama pekerjaan

**4. Izinkan migrasi database.** Tim akan menguji migrasi tanpa menyimpannya, melaporkan
hasilnya, lalu berhenti dan menunggu izin Anda sebelum menerapkannya ke database yang
sedang tayang. Migrasi ini hanya menambah satu tabel dan beberapa jenis revisi. Tidak ada
esai yang diubah.

**5. Tentukan esai uji.** Tim butuh satu esai untuk mencoba alur tulis, terbit, dan tarik.
Sebutkan esai mana yang boleh dipakai, atau izinkan tim membuat esai uji yang dihapus
sesudahnya.

## Setelah pekerjaan selesai

**6. Tulis versi Indonesia pertama.** Buka esai di admin, pilih "Versi Indonesia", tulis,
simpan, lalu terbitkan. Buka halaman publiknya dan coba tombol `EN · ID`.

**7. Izinkan penggabungan dan deploy** setelah Anda puas dengan hasilnya.

## Yang perlu Anda tahu

- Kartu pratinjau di WhatsApp untuk tautan versi Indonesia masih akan berjudul Inggris.
  Halaman yang terbuka tetap versi Indonesia. Memperbaikinya butuh pekerjaan terpisah.
- Esai di Foundations of Knowing belum mendukung pilihan bahasa pada tahap ini, karena
  halamannya dibuat dengan cara berbeda dan juga belum punya tombol Brief.
- Menu, footer, dan label seperti "Key takeaways" tetap berbahasa Inggris.
