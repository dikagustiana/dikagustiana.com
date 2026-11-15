# Paket D: menulis versi Indonesia di admin

Tujuan: pemilik bisa menulis, menyimpan, menerbitkan, dan menarik versi Indonesia sebuah
esai. Bergantung pada Paket A dan B. Bisa dikerjakan bersamaan dengan Paket C.

Baca dulu `src/components/brief/BriefEditor.tsx` dan `src/pages/BriefEditorPage.tsx`,
serta catatan "Delegated decision 1" di `docs/DECISIONS.md` (sekitar baris 2400). Halaman
ini mengikuti pola yang sama: tempat tersendiri yang tidak pernah memuat atau menulis isi
panjang berbahasa Inggris.

## D1. Rute dan halaman

- Rute baru: `/admin/writer/:section/:slug/id`, dibungkus `RequireAdmin`, dimuat lazy,
  didaftarkan di `src/App.tsx` di samping rute `/brief`.
- Halaman: `src/pages/TranslationEditorPage.tsx`, dengan komponen utama di
  `src/components/translation/TranslationEditor.tsx`.
- Dua tab di dalamnya: **Panjang** dan **Ringkas**.

## D2. Isi halaman

Tab Panjang:
- Judul (wajib), snippet, deck, poin kunci (daftar), keterangan gambar, catatan revisi,
  waktu baca.
- Editor isi dengan kemampuan yang sama dengan editor esai panjang. Pakai konfigurasi
  ekstensi TipTap yang sama dengan `src/components/writer/WriterEditor.tsx` (lihat
  `src/lib/tiptap/extensions.ts`). Jangan membuat daftar ekstensi kedua.

Tab Ringkas:
- Editor dengan skema terbatas yang sama dengan Brief (paragraf, tebal, miring, tautan),
  penghitung kata, dan pita target 500–600 kata dari `src/lib/brief.ts`.

Di kedua tab:
- Tautan "Buka esai Inggris" ke halaman publik esai itu di tab baru, sebagai rujukan saat
  menulis. Halaman ini sendiri tidak memuat isi Inggris.
- Indikator status simpan seperti di `BriefEditor` (tersimpan, menyimpan, belum disimpan,
  galat).

## D3. Aturan simpan

| Aksi | Yang ditulis |
|---|---|
| Mengetik | Cadangan ke `essay_revisions` dengan `change_type` `id_autosave` (tab Panjang) atau `id_brief_autosave` (tab Ringkas). Baris `essay_translations` tidak disentuh bila versi itu sudah terbit. |
| Simpan | Menulis baris `essay_translations` (membuat bila belum ada, `published = false`). Mencatat revisi `id_manual_save` atau `id_brief_manual_save`. |
| Terbitkan | `published = true`, `published_at` diisi bila masih kosong. Revisi `id_publish`. |
| Tarik | `published = false`. Revisi `id_unpublish`. |

Syarat terbit: judul terisi dan paling sedikit satu dari isi Panjang atau Ringkas tidak
kosong. Versi yang hanya berisi Ringkas boleh terbit (lihat PRD, perilaku pembaca nomor 3).

Aturan yang dibawa dari autosave esai panjang (`src/hooks/useEssayAutosave.ts`):
- Untuk versi yang belum pernah terbit, cadangan otomatis juga menulis barisnya, supaya
  muat ulang menemukan teksnya. Untuk versi yang sudah terbit, hanya Simpan yang menulis
  baris.
- Penjagaan `updated_at`: tab yang ketinggalan tidak boleh menimpa tulisan yang lebih
  baru. Tulisannya tetap aman di revisi.
- Pemulihan ditawarkan, tidak pernah diterapkan sendiri.

## D4. Revisi dan autosave

- Perluas `RevisionBody` di `src/lib/revisions.ts` menjadi
  `'long' | 'brief' | 'id_long' | 'id_brief'`, dan perbarui `changeTypesForBody`,
  `autosaveTypeForBody`, serta tipe `RevisionChangeType`.
- `useEssayAutosave` sekarang menulis ke tabel `essays` pada jalur `persistToEssay`.
  Untuk versi Indonesia targetnya `essay_translations`. Dua pilihan, pilih yang
  perubahannya paling kecil terhadap jalur lama:
  1. beri hook itu parameter target tulis, atau
  2. tulis hook kedua yang memakai fungsi murni yang sama dari `revisions.ts`.

  Apa pun pilihannya: perilaku untuk `body: 'long'` dan `body: 'brief'` tidak boleh
  berubah, dan uji yang ada untuk keduanya harus lulus tanpa diubah.
- Tambahkan uji yang membuktikan pemisahan: pemulihan untuk `long` tidak pernah
  mengajukan baris `id_autosave`, pemulihan untuk `id_long` tidak pernah mengajukan baris
  `autosave` atau `brief_autosave`, dan seterusnya untuk keempat badan. Ini pagar yang
  mencegah esai Inggris 26.000 karakter ditawari untuk diganti dengan versi lain.

## D5. Pintu masuk

Catatan: Brief saat ini hanya bisa dibuka dari antrean di admin
(`src/components/admin/BriefQueue.tsx`); editor esai tidak punya tautan ke sana. Versi
Indonesia butuh pintu masuk yang lebih langsung:

- Di `src/pages/AdminContent.tsx`: kolom atau lencana status versi Indonesia per esai:
  kosong, "ID draf", atau "ID terbit", yang sekaligus menjadi tautan ke
  `/admin/writer/:section/:slug/id`. Ambil dengan satu kueri ringan ke
  `essay_translations` (`essay_id, published`), tanpa isi.
- Di `src/components/writer/WriterEditor.tsx`: tautan "Versi Indonesia", hanya untuk esai
  yang barisnya sudah ada. Tempatkan di dekat pengaturan tulisan; pilih letak yang tidak
  mengubah tata letak editor.
- Antrean seperti `BriefQueue` tidak dibuat di tahap ini. Bila pemilik menginginkannya,
  itu tambahan terpisah.

## D6. Uji

- Uji unit untuk fungsi murni yang diperluas di `revisions.ts`, ditambahkan ke
  `tests/unit/revisions.test.ts`. Uji tulis autosave yang ada di
  `tests/unit/autosaveWrites.test.tsx` adalah acuan untuk jalur baru.
- Uji komponen: syarat terbit; Simpan tidak menerbitkan; Tarik tidak menghapus isi.
- Uji bahwa halaman ini tidak pernah mengirim `update` ke tabel `essays`. Tiru cara
  `BriefEditor` diuji untuk jaminan serupa (komentarnya menyebut "GATE B2").

## Selesai bila

- Uji D6 lulus, dan semua uji autosave serta Brief yang lama lulus tanpa diubah.
- Alur lengkap dicoba dengan tangan di lingkungan lokal terhadap satu esai uji: tulis,
  muat ulang (pemulihan ditawarkan), simpan, terbitkan, lihat di halaman publik, tarik,
  pastikan hilang dari halaman publik. Tulis hasil tiap langkah di ringkasan akhir. Bila
  langkah ini butuh menulis ke database live, minta izin pemilik dulu dan hapus data
  ujinya sesudahnya.
