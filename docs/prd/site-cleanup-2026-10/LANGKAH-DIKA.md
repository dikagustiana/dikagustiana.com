# Langkah yang Dika jalankan (site cleanup 2026-10)

Urutannya: 1 → 2 → 3. Jangan merge PR #80 sebelum langkah 1 selesai, karena halaman Books akan error tanpa tabel barunya.

## 1. Migration Books (Supabase SQL Editor)

1. Buka https://supabase.com/dashboard/project/asypkbkiebjvvpimewfp/sql/new
2. Buka file `20261024100000_books_shelves.sql`, salin **seluruh** isinya, tempel ke editor.
3. Klik **Run**. Hasil yang benar: "Success. No rows returned".

## 2. Hapus lecture notes dari esai (terminal di laptop)

Sekali saja, buat file `.env.local` di folder repo `dikagustiana.com` (kalau sudah ada untuk script FIA, lewati). Isinya dua baris. Salin string koneksi dari Supabase → tombol **Connect** → **Session pooler** (contoh di bawah hanya bentuknya; host `aws-0`/`aws-1` ikuti yang tertera di dashboard), dan password database Anda:

```
SUPABASE_DB_URL="postgresql://postgres.asypkbkiebjvvpimewfp@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
SUPABASE_DB_PASSWORD="password-database-anda"
```

Lalu di terminal, dari folder repo:

```
git fetch origin claude/optimistic-gates-rovcj7
git checkout claude/optimistic-gates-rovcj7
npm ci
npx vite-node scripts/content/strip-lecture-notes.ts
```

Itu dry run (tidak menulis apa pun). Hasil yang benar: "36 essays change" dan tidak ada "problem". Jika ada problem (misalnya draft yang belum punya edit), berhenti dan kirim outputnya ke Claude.

Kalau bersih, jalankan:

```
npx vite-node scripts/content/strip-lecture-notes.ts -- --apply
```

Hasil yang benar di baris terakhir: "verify: 0 essays mention the lecture notes; 0 changed essays out of sync; 0 citation problems". Script juga menulis backup di `backups/essays-lecture-notes-<waktu>.json` — simpan file itu.

## 3. Coba di preview, lalu merge

- Preview: https://dikagustiana-com-git-claude-o-e0f4fd-dikagirawan-4804s-projects.vercel.app
- `/admin/books` → **Add shelf** → **Add book** (satu Free dengan PDF dan License note, satu Paid dengan link https://) → nyalakan Published → Save.
- Cek `/books-academia`: buku gratis bisa Download, buku berbayar membuka link Buy.
- Kalau semua benar, merge PR #80.

## Kalau perlu dibatalkan

- Esai: `npx vite-node scripts/content/restore-from-backup.ts backups/essays-lecture-notes-<waktu>.json`
- Skema Books: salin isi `20261024100100_books_shelves_down.sql` ke SQL Editor → Run.
