# Paket B: membaca versi Indonesia

Tujuan: satu tempat untuk logika "sel mana yang tampil", berupa fungsi murni yang bisa
diuji tanpa database, dan satu hook untuk mengambil datanya. Paket C dan D memakai ini;
jangan menyalin logikanya ke halaman.

## B1. `src/lib/essayLanguage.ts` (fungsi murni, tanpa React, tanpa Supabase)

Tiru gaya `src/lib/brief.ts` dan `src/lib/revisions.ts`.

```ts
export type EssayLanguage = 'en' | 'id';
export type EssayView = 'full' | 'brief';   // pindahkan dari BriefToggle.tsx, ekspor ulang di sana

/** Sel mana saja yang ada untuk satu esai. en.full selalu true. */
export interface EssayCells {
  en: { full: true; brief: boolean };
  id: { full: boolean; brief: boolean } | null;   // null = tidak ada versi Indonesia terbit
}
```

Fungsi yang dibutuhkan:

| Fungsi | Tugas |
|---|---|
| `parseLanguageParam(value)` | `'id'` → `'id'`; apa pun selain itu → `'en'` |
| `essayCells(essay, translation)` | menyusun `EssayCells`. Isi dianggap ada hanya bila tidak kosong; pakai `isEmptyBrief` dan `isEmptyDoc` yang sudah ada |
| `availableLanguages(cells)` | `['en']` atau `['en','id']` |
| `resolveSelection(cells, wanted)` | menerima `{language, view}` yang diminta, mengembalikan sel yang benar-benar ditampilkan (aturan di bawah) |
| `viewsFor(cells, language)` | tampilan yang ada untuk satu bahasa; menentukan apakah tombol `Full · Brief` muncul |

Aturan `resolveSelection`, urut:
1. Bahasa yang diminta tidak tersedia → pakai `en`.
2. Tampilan yang diminta ada di bahasa itu → pakai.
3. Tidak ada → pakai tampilan lain yang ada di bahasa itu.
4. `en.full` selalu ada, jadi hasilnya tidak pernah kosong.

Satu fungsi lagi untuk menyusun apa yang ditampilkan:

```ts
/** Field esai yang berganti menurut bahasa. Yang tidak diterjemahkan jatuh ke nilai Inggris. */
export function localizedEssayFields(essay, translation, language): {
  title: string; snippet: string | null; deck: string | null;
  keyTakeaways: string[] | undefined; heroCaption: string | null;
  revisionNote: string | null; readTime: string | null;
  content: unknown;   // content_json bahasa itu
  brief: unknown;     // brief_json bahasa itu
}
```

Aturan jatuh-balik: judul Indonesia wajib ada (kolomnya `NOT NULL`). Untuk `deck`,
`hero_caption`, `revision_note`: bila tidak diisi di versi Indonesia, tampilkan nilai
Inggris. Untuk `key_takeaways`: bila tidak diisi, **jangan** tampilkan poin kunci Inggris
di bawah esai Indonesia; sembunyikan bagiannya.

## B2. Hook `src/hooks/queries/useEssayTranslation.ts`

- `useEssayTranslation(essayId)` mengambil baris `essay_translations` dengan
  `locale = 'id'` untuk esai itu. RLS sudah menyaring yang belum terbit untuk pembaca.
- Tiru bentuk hook di `src/hooks/queries/useEssays.ts` (React Query, kunci kueri, cara
  menangani galat).
- Tidak ada baris adalah keadaan biasa, bukan galat: kembalikan `null`.
- Kueri terpisah dari kueri esai. Jangan menambahkannya ke `ESSAY_CARD_COLUMNS` atau ke
  kueri daftar: daftar dan kartu tidak butuh versi Indonesia, dan isi panjangnya besar.

## B3. Uji

`tests/unit/essayLanguage.test.ts`, mengikuti `tests/unit/brief.test.ts`. Minimal:

- Tiap dari delapan kombinasi ketersediaan sel Indonesia dan Brief Inggris.
- Meminta `id` saat versi Indonesia tidak ada → `en`.
- Meminta `id` + `full` saat versi Indonesia hanya punya Brief → `id` + `brief`.
- Pindah dari `id` + `brief` ke `en` saat Inggris tidak punya Brief → `en` + `full`.
- Dokumen kosong (hanya paragraf kosong) dihitung tidak ada.
- `parseLanguageParam` untuk `id`, `ID`, `en`, kosong, dan nilai asing.
- Jatuh-balik `localizedEssayFields`, termasuk aturan poin kunci.

## Selesai bila

- Uji di B3 lulus.
- Tidak ada komponen atau halaman yang diubah di paket ini, kecuali memindahkan tipe
  `EssayView` (dengan ekspor ulang supaya impor lama tetap jalan).
