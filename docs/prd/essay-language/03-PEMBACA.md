# Paket C: tombol bahasa di halaman esai

Tujuan: pembaca bisa memilih `EN · ID` di halaman esai. Bergantung pada Paket B.

## C1. Komponen `LanguageToggle`

- Berkas: `src/components/editorial/LanguageToggle.tsx`.
- Bentuk, gaya, dan aksesibilitas sama dengan `BriefToggle.tsx`: dua tombol teks dipisah
  titik tengah, `aria-pressed`, `role="group"`, `aria-label="Essay language"`,
  `data-testid="essay-language-toggle"`.
- Labelnya `EN` dan `ID`, dengan `aria-label` lengkap ("English", "Bahasa Indonesia") dan
  atribut `lang` pada tiap tombol.
- Dirender hanya bila versi Indonesia terbit ada. Pemanggil yang menjaga, seperti pada
  `BriefToggle`.

## C2. Dua kerangka artikel

`src/components/editorial/ArticleShell.tsx` dan `LongformArticleShell.tsx` sekarang
menerima prop `brief` dan menyimpan `view` sebagai state. Ubah keduanya dengan cara yang
sama:

1. Tambah prop opsional `translation` (baris `essay_translations` atau `null`). Tanpa prop
   ini, perilaku harus sama persis dengan sekarang. Ini yang membuat halaman yang belum
   dihubungkan tetap aman.
2. Ganti logika `view` lokal dengan `essayCells` + `resolveSelection` dari Paket B.
3. Field yang ditampilkan (judul, deck, isi, Brief, poin kunci, keterangan gambar, catatan
   revisi, waktu baca) diambil dari `localizedEssayFields`.
4. Letakkan `LanguageToggle` di baris yang sama dengan `BriefToggle`, di bawah blok judul.
   `BriefToggle` muncul hanya bila `viewsFor(cells, language)` berisi dua tampilan.
5. Bungkus judul, deck, isi, dan poin kunci dengan `lang="id"` saat bahasa Indonesia
   dipilih.
6. Daftar isi (`ArticleToc`, di kedua tempatnya) dibangun dari isi yang sedang tampil.
7. Isi Indonesia melewati penanganan yang sama dengan isi Inggris, termasuk
   `publicReferencesHtml` saat `hideReferenceAnnotations` aktif, dan `citedIndexes`
   dihitung dari isi yang sedang tampil.
8. Perilaku yang ada sekarang dipertahankan: saat berpindah ke esai lain (kerangka ini
   tetap hidup saat navigasi sebelum/sesudah), tampilan kembali ke Full. Bahasa mengikuti
   alamat (lihat C3), jadi tidak direset di sini.

Isi Indonesia disimpan sebagai TipTap JSON saja. Periksa bagaimana `ArticleBody` menerima
isi (string JSON atau HTML lama) dan ubah isi Indonesia ke bentuk yang sama, seperti yang
dilakukan untuk Brief sekarang (`JSON.stringify(doc)`).

## C3. Bahasa di alamat (bawaan K1)

- Bahasa dibaca dari `?lang=id` lewat `useSearchParams`, melalui `parseLanguageParam`.
- Memilih bahasa mengubah parameter itu dengan `replace: true`, supaya tombol kembali di
  browser tidak bolak-balik antarbahasa. Memilih `EN` menghapus parameternya, bukan
  menulis `?lang=en`.
- Parameter lain dan `#fragmen` di alamat dipertahankan.
- `?lang=id` pada esai yang tidak punya versi Indonesia: tampilkan Inggris dan hapus
  parameternya dengan `replace`.
- Full atau Brief tetap keadaan di browser, tidak masuk alamat. Ini keputusan lama untuk
  Brief dan tidak diubah.
- Navigasi sebelum/sesudah dan esai terkait tidak membawa `?lang`. Esai berikutnya belum
  tentu punya versi Indonesia.

Bila pemilik menjawab K1 "cukup tombol": simpan bahasa sebagai state seperti `view`, dan
lewati C3 serta Paket E.

## C4. Menghubungkan halaman

Lima halaman memakai kerangka ini dan sudah mengirim `brief`:

| Halaman | Kerangka |
|---|---|
| `src/pages/EssayBySlug.tsx` | ArticleShell |
| `src/pages/GreenTransitionEssayPage.tsx` | ArticleShell |
| `src/pages/NextBigThingEssayPage.tsx` | ArticleShell |
| `src/pages/ConsolidationDetail.tsx` | ArticleShell |
| `src/pages/FinanceEssayPage.tsx` | keduanya: `LongformArticleShell` (baris 246) atau `ArticleShell` (baris 250), dengan `brief` dikirim lewat objek `sharedProps` |

Di tiap halaman: panggil `useEssayTranslation(essay.id)` dan teruskan hasilnya sebagai
`translation`. Halaman tidak menunggu kueri ini untuk menampilkan esai: esai Inggris
tampil dulu, tombol bahasa muncul saat kuerinya selesai. Satu pengecualian: bila alamat
berisi `?lang=id`, tunggu kueri terjemahan sebelum menggambar isi, supaya pembaca tidak
melihat esai Inggris sekejap lalu berganti.

## Halaman yang tidak ikut

`src/pages/CriticalThinkingEssay.tsx` (Foundations of Knowing) menggambar esainya sendiri
dan belum punya tombol Brief. Jangan dihubungkan di paket ini. Catat di ringkasan akhir
bahwa esai Foundations belum mendukung pilihan bahasa, supaya pemilik bisa memutuskan
apakah halaman itu dipindah ke kerangka bersama.

## C5. Uji

- Uji komponen (Testing Library, pola yang ada di `tests/unit`) untuk `LanguageToggle` dan
  untuk tiap kerangka: tanpa `translation` tidak ada tombol bahasa dan hasilnya sama
  dengan sebelum perubahan; dengan `translation` tombol muncul; memilih ID mengganti
  judul dan isi; aturan Brief per bahasa; atribut `lang`.
- Uji e2e (Playwright, `tests/e2e`): buka esai yang punya versi Indonesia, pilih ID,
  periksa alamat berisi `?lang=id`, muat ulang, versi Indonesia masih tampil. Butuh data
  uji; lihat Paket F tentang cara menyediakannya tanpa menulis ke database live.
- Jalankan pemeriksaan aksesibilitas yang ada (`@axe-core/playwright`) pada halaman esai
  dalam kedua bahasa.

## Selesai bila

- Uji C5 lulus.
- Esai tanpa versi Indonesia tampil persis seperti sebelumnya. Buktikan dengan uji e2e
  yang sudah ada untuk halaman esai: semuanya harus lulus tanpa diubah.
- Tangkapan layar halaman esai dalam bahasa Indonesia pada lebar 360px dan 1440px
  disimpan di `docs/prd/essay-language/shots/`.
