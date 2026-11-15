# Paket A: data

Tujuan: tempat menyimpan versi Indonesia, dengan aturan akses yang benar, dan cadangan
otomatis yang tidak bisa tertukar dengan versi lain.

## A1. Tabel `public.essay_translations`

Satu baris per esai per bahasa.

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | uuid, kunci utama | `gen_random_uuid()` |
| `essay_id` | uuid, wajib | FK ke `essays(id)`, `ON DELETE CASCADE` |
| `locale` | text, wajib | `CHECK (locale IN ('id'))` |
| `title` | text, wajib | judul Indonesia |
| `snippet` | text | padanan `essays.snippet` |
| `content_json` | jsonb | isi panjang, TipTap JSON. `NULL` = tidak ada versi Full |
| `brief_json` | jsonb | isi ringkas, skema terbatas seperti Brief. `NULL` = tidak ada Brief |
| `presentation` | jsonb | hanya kunci yang diterjemahkan: `deck`, `key_takeaways`, `hero_caption`, `revision_note` |
| `read_time` | text | padanan `essays.read_time` |
| `published` | boolean, wajib, bawaan `false` | |
| `published_at` | timestamptz | diisi saat pertama terbit |
| `created_at`, `updated_at` | timestamptz, wajib | |

Tambahan:
- `UNIQUE (essay_id, locale)`.
- Trigger `BEFORE UPDATE` yang memanggil `public.update_updated_at_column()`, fungsi yang
  sama dengan `update_essays_updated_at`.
- Tidak ada kolom HTML. Alasannya sama dengan Brief (lihat komentar di
  `supabase/migrations/20260803090000_essay_brief_companion.sql`): HTML diturunkan saat
  dibaca, supaya tidak ada dua salinan yang bisa berbeda.
- Yang **tidak** disalin ke tabel ini: referensi, gambar, genre, penempatan, tanggal,
  penulis. Semuanya tetap dibaca dari baris `essays`.

## A2. Aturan akses (RLS)

Aktifkan RLS. Tiru bentuk kebijakan `essays` di
`supabase/migrations/20260731030000_baseline_cms.sql`, termasuk pemeriksaan admin yang
ditulis langsung di atas `user_roles` (bukan lewat `has_role()`).

| Kebijakan | Untuk | Syarat |
|---|---|---|
| select, `anon` | pembaca | `published = true` **dan** esai induknya `published = true` |
| select, `authenticated` | pengguna masuk | syarat di atas, **atau** admin |
| insert / update / delete | `authenticated` | admin saja |

Syarat "esai induk terbit" penting: bila esai Inggris ditarik dari tayang, versi
Indonesianya ikut tidak terbaca.

## A3. Jenis revisi baru di `essay_revisions`

Cadangan versi Indonesia memakai tabel `essay_revisions` yang sama, dibedakan lewat
`change_type`, persis seperti Brief. Tambahkan ke `essay_revisions_change_type_check`:

```
id_autosave, id_manual_save, id_publish, id_unpublish, id_rollback,
id_brief_autosave, id_brief_manual_save
```

Kenapa lewat `change_type` dan bukan kolom `locale` baru: semua pembaca revisi yang ada
sudah menyaring dengan daftar `change_type` (`changeTypesForBody` di
`src/lib/revisions.ts`), jadi jenis baru otomatis tidak ikut terbaca. Kolom baru dengan
nilai bawaan akan membuat setiap kueri lama, yang tidak menyaring kolom itu, ikut
mengambil baris Indonesia.

**Periksa sebelum lanjut:** semua pembacaan `essay_revisions` di `src/` saat ini ada di
`src/hooks/useEssayAutosave.ts` (baris 78, 101, 144, 164). Pastikan tiap `select` di sana
menyaring `change_type`. Bila ada yang tidak, perbaiki dulu dan tulis ujinya. Pembaca yang
tidak menyaring akan menawarkan mengganti esai Inggris dengan cadangan versi Indonesia.

## A4. Berkas migrasi

- Satu berkas: `supabase/migrations/<cap-waktu>_essay_translations.sql`, dengan komentar
  yang menjelaskan alasan seperti migrasi Brief.
- Sertakan pemeriksaan prasyarat di dalam migrasi (misalnya: tabel belum ada).
- Tambah berkas uji SQL di `docs/db/verify/` mengikuti pola yang ada di sana, yang
  membuktikan: `anon` tidak bisa membaca baris draf; `anon` tidak bisa membaca baris
  terbit bila esai induknya tidak terbit; `anon` tidak bisa menulis; admin bisa semuanya.

## A5. Menerapkan

1. Jalankan migrasi dalam transaksi yang dibatalkan (dry-run) terhadap database live.
   Laporkan hasilnya.
2. **Berhenti. Minta izin pemilik.**
3. Setelah diizinkan: terapkan lewat `apply_migration` dengan nama = nama berkas tanpa
   ekstensi (`docs/RUNBOOK.md`, bagian migrasi). Jangan pernah `supabase db push` atau
   `db reset`.
4. Perbarui `src/integrations/supabase/types.ts` dengan cara di `docs/RUNBOOK.md` bagian
   "Regenerate types" (ganti seluruh berkas, jangan digabung manual).
5. Jalankan uji SQL di A4 terhadap database live dan catat hasilnya.

## Selesai bila

- Migrasi sudah diterapkan dan tercatat dengan nama yang sama dengan berkasnya.
- Uji akses di A4 lulus, dengan keluarannya dicatat.
- `types.ts` memuat `essay_translations`, dan `npm run typecheck` lulus.
- Tidak ada baris di `essays` atau `essay_revisions` yang berubah. Buktikan dengan jumlah
  baris sebelum dan sesudah.
