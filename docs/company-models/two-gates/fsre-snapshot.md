# Snapshot `fsre*` sebelum migrasi `fia` (fase 1, PRD A7)

Diambil 22 Okt 2026 oleh Claude Code dari Supabase `asypkbkiebjvvpimewfp` (production), **hanya baca**
(`SELECT` lewat Supabase MCP; tidak ada DDL, grant, atau baris yang ditulis). Repo ini publik, jadi yang
dicatat di sini hanya digest, bukan definisi objek FSRE.

## Cara mengambil

Query: `supabase/tests/fsre_fingerprint.sql` (satu `SELECT`). Setiap baris = satu objek di `fsre`,
`fsre_private`, `fsre_status`, `fsre_published` (schema, tabel/view/sequence beserta kolom, grant dan teks
view, constraint, index, function, trigger, policy, type, default privilege) dan md5 dari semua yang
mendefinisikannya. Baris `outside-dependants` menghitung view di luar `fsre*` yang bergantung pada objek
`fsre*`. Baris `total` = jumlah objek dan md5 seluruh daftar.

## Hasil (production, sebelum migrasi)

| Hal | Nilai |
|---|---|
| Jumlah objek | 229 |
| Digest `total` | `201cddfeaa5ae54387a05fa5e47d6d79` |
| `outside-dependants` | 0 |
| Digest `relation:v fsre_published.model_packages` | `75c9abc8ad226e8812e639132a3f19bd` |
| md5 `pg_get_viewdef('fsre_published.model_packages', true)` | `0db4e9f1c92072b35b82ff200c8fb1d7` |
| Digest `function fsre.approve_package(p_company text, p_version text, p_approver text)` | `625e621adc1ff29007524f5eaee916eb` |
| Baris di `fsre_published.model_packages` | 0 |
| Kolom `fsre_published.model_packages` | `company_id, version, wave_id, content_hash, approved_by, approved_at, package` (tidak ada kolom `ticker`; view `fia` mengambil ticker dari `package.meta.ticker`) |
| Hak `anon` | `USAGE` pada `fsre_published`, `SELECT` pada `fsre_published.model_packages` |
| Hak `postgres` | anggota `anon`, `authenticated`, `service_role`, `fsre_owner` (dan peran FSRE lain); bukan superuser |
| Skema `fia` | belum ada |
| `pg_jsonschema` | tersedia versi 0.3.3, belum terpasang |
| Versi server | PostgreSQL 17.6 |
| Default privilege global (tanpa skema) | tidak ada, jadi objek baru di `fia` hanya mendapat grant yang ditulis migrasi |

## Membandingkan sesudah migrasi (fase 6, Dika)

Jalankan query yang sama sesudah migrasi diterapkan (perintah di `RUNBOOK.md`). Baris `total` harus
persis `229 | 201cddfeaa5ae54387a05fa5e47d6d79` dan `outside-dependants` harus `0`. Kalau berbeda, jangan
lanjut; kirim output-nya ke Claude Code. (Catatan: kalau `fsre-skills` menjalankan migrasinya sendiri di
antara dua pengambilan, digest berubah karena FSRE, bukan karena migrasi ini; bandingkan per baris.)

Di database lokal (Postgres 16 + `pg_jsonschema` 0.3.3, dengan stand-in FSRE yang meniru kolom dan teks view
production) seluruh output fingerprint sebelum dan sesudah migrasi identik baris per baris; lihat `report.md`.
