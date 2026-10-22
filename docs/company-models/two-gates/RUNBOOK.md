# Runbook: model manual Finance in Action (dua jalur masuk)

Untuk Dika. Semua perintah di bawah lengkap dan siap disalin; yang tidak terisi hanya **password database**,
yang Dika ketik sendiri ke `.env.local` (langkah 1.3). Spesifikasi: `PRD.md` dan `PLAN.md` di folder ini.

## 0. Gambaran singkat

- Halaman `/finance/finance-in-action` membaca satu view: **`fia.model_packages`**. Isinya gabungan dua jalur:
  - **FSRE**: paket yang di-approve lewat pipeline FSRE (`fsre_published.model_packages`, tidak diubah).
  - **Manual**: paket yang Dika masukkan sendiri ke tabel `fia.manual_release` dengan skrip
    `scripts/fia/publish-manual.ts`, tanpa menulis SQL.
- Satu ticker hanya tampil sekali: yang **tanggal approve-nya paling baru** menang; kalau persis sama, FSRE
  menang (D2). Paket dengan gate **`failed`** tidak pernah tampil, dari jalur mana pun (D5).
- Status baris manual:
  - `staged`: tersimpan di database, **belum tampil**. Boleh diganti atau dihapus.
  - `published`: **tampil** di situs. Tidak bisa diubah atau dihapus; hanya bisa ditarik.
  - `withdrawn`: sudah ditarik, **final**. Tidak bisa diterbitkan lagi.
- Revisi = **versi baru**: ubah `meta.version` di file paket (misalnya `INDY-2025Q4-r1` → `INDY-2025Q4-r2`),
  lalu terbitkan versi baru itu.
- Standar tidak turun: sebelum menulis apa pun, skrip menjalankan pemeriksaan yang sama dengan situs (kontrak
  JSON Schema v3.1, aturan paket, sub-industri terdaftar, rumus, provenance `filings`), lalu database
  memeriksa lagi. Paket `SYNTHETIC` selalu ditolak.

Perintah ditulis untuk Terminal di Mac (zsh/bash). Kalau memakai Windows PowerShell, perintah `npx ...` sama
persis; perintah yang berbeda diberi versi PowerShell di bawahnya.

## 1. Persiapan pertama kali (sekali saja)

### 1.1 Yang dibutuhkan

Node.js 22 dan git (sudah ada kalau Dika pernah menjalankan situs di laptop). Cek:

```
node --version
git --version
```

`node --version` harus `v22.x.x`.

### 1.2 Ambil repo dan pasang dependensi

Kalau repo belum ada di laptop:

```
git clone https://github.com/dikagustiana/dikagustiana.com.git
cd dikagustiana.com
```

Kalau sudah ada, masuk ke foldernya (`cd` ke folder `dikagustiana.com`). Lalu (PR sudah di-merge, jadi
semuanya dari `main`):

```
git checkout main
git pull
npm ci
```

### 1.3 Buat `.env.local` (tempat password database)

Di folder repo, jalankan:

```
printf 'SUPABASE_DB_URL=postgresql://postgres.asypkbkiebjvvpimewfp@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres\nSUPABASE_DB_PASSWORD=\n' > .env.local
```

PowerShell:

```
Set-Content -Path .env.local -Value "SUPABASE_DB_URL=postgresql://postgres.asypkbkiebjvvpimewfp@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres","SUPABASE_DB_PASSWORD="
```

Lalu buka `.env.local` dengan editor teks (misalnya `open -e .env.local` di Mac, `notepad .env.local` di
Windows) dan **ketik password database setelah `SUPABASE_DB_PASSWORD=`**, tanpa spasi dan tanpa tanda kutip.
Simpan. Password boleh mengandung `@`, `#`, `/`; tidak perlu diubah apa-apa.

- Password database = password yang dibuat saat project Supabase dibuat. Kalau lupa: Supabase → Project
  Settings → Database → **Reset database password**. Hati-hati: alat lain yang memakai password lama akan
  berhenti tersambung.
- Skrip hanya membaca `.env.local` (bukan `.env`, bukan environment) dan **tidak pernah mencetak** isinya.

### 1.4 Pastikan `.env.local` tidak ikut ke git

```
git check-ignore -v .env.local
```

Harus keluar: `.gitignore:38:.env.local	.env.local`. Kalau **tidak ada output**, berhenti dan jangan commit apa pun;
kirim pesan ke Claude Code.

### 1.5 Cek sambungan

```
npx vite-node scripts/fia/publish-manual.ts --list
```

- Harapan (migrasi sudah diterapkan di production 22 Okt, bagian 2.1): `Manual rows (0), times in WIB:` dan
  `What the site shows (fia.model_packages, 0):` (angkanya naik setelah Dika menerbitkan paket).
- Kalau keluar `the database refused it: relation "fia.manual_release" does not exist`, sambungannya berhasil
  tetapi ke database lain: periksa nama project di baris `SUPABASE_DB_URL` (harus `asypkbkiebjvvpimewfp`).
- Kalau muncul `Tenant or user not found`: buka `.env.local`, ganti `aws-0` menjadi `aws-1` di baris
  `SUPABASE_DB_URL`, simpan, jalankan lagi. (Atau salin string dari Supabase → tombol **Connect** →
  **Session pooler**, tempel sebagai `SUPABASE_DB_URL=...`; biarkan `[YOUR-PASSWORD]` di dalamnya, karena
  baris `SUPABASE_DB_PASSWORD` yang dipakai.)

## 2. Fase 6 dan fase 0: menyalakan jalur manual

### 2.1 Yang sudah dikerjakan (22 Okt 2026)

Atas instruksi Dika ("Merge. Selesain semua sampai selesai"), Claude Code menjalankan langkah database fase 6 di
production lewat Supabase MCP. Bukti lengkap: `output/production-phase6.txt`.

| Langkah | Hasil |
|---|---|
| Fingerprint FSRE sebelum migrasi | `total \| - \| 229 \| 201cddfeaa5ae54387a05fa5e47d6d79`, sama dengan snapshot pagi (`fsre-snapshot.md`) |
| Migrasi `fia_two_gates` lewat `apply_migration` (file pada commit `15dbd35`) | `{"success":true}`; kontrak, fungsi, view, kolom dan trigger di production identik (md5) dengan database lokal yang dibangun dari file yang sama |
| Tes SQL `fia_manual_release.sql` | `fia_manual_release: 86 PASS, 0 FAIL`, satu transaksi yang di-rollback; `fia.manual_release` tetap 0 baris |
| Fingerprint FSRE sesudah migrasi dan tes | Identik dengan sebelum (A7) |
| PR #76 | Di-merge ke `main` sesudah CI hijau |

Merge itu aman walau bagian 2.2 belum dikerjakan: build Production belum punya `VITE_FIA_LIVE`, dan build tanpa
flag itu tidak membaca `fia` sama sekali. Halaman production tetap halaman legacy sampai langkah D.

### 2.2 Yang tersisa (Dika, urut)

Claude Code tidak punya akses ke pengaturan Data API Supabase maupun ke project Vercel ini, jadi langkah berikut
tetap di tangan Dika. Urutannya penting: kalau `VITE_FIA_LIVE` dinyalakan sebelum `fia` di-expose, halaman
menampilkan "The published models are not available yet…". Jadi: expose, cek, **baru** nyalakan flag.

**Langkah A. Expose skema `fia` ke Data API.** Supabase → **Project Settings** → **Data API** → **Exposed
schemas** → tambahkan `fia` (jangan hapus yang sudah ada, termasuk `fsre_published`) → **Save**.

**Langkah B. Cek view yang akan dibaca situs** (anon, kunci publik situs):

```
VITE_SUPABASE_URL=https://asypkbkiebjvvpimewfp.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_T8D6Uq_flTdtQT5mZuYVsw_nfgiZ203 npx vite-node scripts/world/check-published.ts
```

PowerShell:

```
$env:VITE_SUPABASE_URL="https://asypkbkiebjvvpimewfp.supabase.co"; $env:VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_T8D6Uq_flTdtQT5mZuYVsw_nfgiZ203"; npx vite-node scripts/world/check-published.ts
```

Harapan: `check-published: fia.model_packages HTTP 200, 0 package(s)`. Kalau keluar
`published models answered 406 (not-available)`, langkah A belum tersimpan (atau tunggu satu menit lalu
ulangi). Kalau `(refused)`, kirim output-nya ke Claude Code. **Jangan lanjut ke langkah D sebelum ini HTTP 200.**

**Langkah C. Hapus tabel bantu tes.** Supabase → **SQL Editor** → **New query** → tempel
`drop table fia_private.test_fixture_scratch;` → **Run**. Harapan: `Success. No rows returned`. Tabel ini dibuat
Claude Code untuk menjalankan tes SQL di production (file tesnya terlalu besar untuk satu panggilan MCP) dan hanya
berisi teks fixture SYNTHETIC; skemanya tidak di-expose dan tabelnya tanpa grant, jadi tidak mendesak. Supabase
MCP menahan `DROP` sampai Dika mengonfirmasi, dan tiga percobaan habis waktu menunggu, jadi tabelnya masih ada.

**Langkah D. Fase 0: nyalakan halaman live** (PLAN fase 0):

1. Vercel → project **dikagustiana-com** → Settings → Environment Variables.
2. Pastikan `VITE_FIA_LIVE` = `true` untuk Production. Kalau belum ada: Add → Key `VITE_FIA_LIVE`, Value `true`,
   centang Production saja → Save.
3. Pastikan **tidak ada** `VITE_FIA_PREVIEW` di Production.
4. Deployments → deployment Production teratas → ⋯ → Redeploy (tanpa build cache). Nilai flag ditanam saat
   build, jadi tanpa redeploy tidak ada yang berubah.

**Langkah E. Verifikasi production.** Buka `https://www.dikagustiana.com/finance/finance-in-action` (dengan
`www`, lihat catatan di bawah): harus tampil "The chain, read one company at a time" dengan PTBA, ITMG, INDY,
ADRO, INTP, SMGR, BREN berstatus "Planned; no model yet", tanpa kalimat "not available". Ulangi perintah langkah
B. Kirim ke Claude Code: output langkah B dan screenshot halaman (A1).

**Catatan domain.** `https://dikagustiana.com` (tanpa `www`) masih dialihkan 308 ke project Vercel lama
`dika-s-digital-studio`, yang tampil layar putih. Ini sudah ada sejak Agustus dan tidak terkait PR ini; langkah
perbaikannya ada di `docs/review/claude-audit.md` §1.2 (pindahkan domain apex ke project `dikagustiana-com`).

### 2.3 Menjalankan ulang tes atau fingerprint

Keduanya boleh diulang kapan saja dari laptop (tes di-rollback, fingerprint hanya membaca):

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fia_manual_release.sql
npx vite-node scripts/fia/run-sql.ts supabase/tests/fsre_fingerprint.sql > fsre-now.txt
grep '^total' fsre-now.txt
```

PowerShell untuk baris terakhir: `Select-String '^total' fsre-now.txt`

Baris terakhir tes harus `fia_manual_release: 86 PASS, 0 FAIL`; setiap baris lain diawali `PASS` atau `FAIL`
dengan nama aturannya. Baris `total` fingerprint berubah hanya kalau FSRE menjalankan migrasinya sendiri; itu
boleh, asalkan bukan karena migrasi dari repo ini.

## 3. Memeriksa paket (`--check`), tidak menulis apa pun

```
npx vite-node scripts/fia/publish-manual.ts --check ~/Downloads/INDY.json
```

(Ganti `~/Downloads/INDY.json` dengan lokasi file paket. Di Windows misalnya `C:\Users\Dika\Downloads\INDY.json`.)

- Lolos: baris terakhir `OK: INDY INDY-2025Q4-r1 passes the site's checks and can be published.`
- Lolos tapi ada gate `failed`: `OK to stage: ...` (boleh disimpan sebagai staged, tidak boleh diterbitkan).
- Ditolak: `Refused: INDY fails the site's checks, N reason(s); nothing written.` diikuti satu baris per alasan,
  dengan kata-kata yang sama dengan yang dipakai situs. Arti tiap alasan: bagian 8.
- `--check` tidak tersambung ke database sama sekali.

## 4. Menyimpan tanpa menampilkan (`--stage`)

```
npx vite-node scripts/fia/publish-manual.ts --stage ~/Downloads/INDY.json --note "revisi GPT 21 Okt, belum direview"
```

Harapan: `Staged: INDY INDY-2025Q4-r1. Not shown until published.` Menjalankan `--stage` lagi dengan versi
yang sama mengganti salinan staged-nya. `--note` boleh dihilangkan.

## 5. Menerbitkan (`--publish`)

```
npx vite-node scripts/fia/publish-manual.ts --publish ~/Downloads/INDY.json --by "Dika Gustiana Irawan"
```

Harapan:

```
Published: INDY INDY-2025Q4-r1, approved by Dika Gustiana Irawan.
The site now shows INDY from this row (manual INDY-2025Q4-r1).
```

- Waktu approve diisi otomatis oleh database (saat itu juga).
- Kalau versi ini sudah staged, baris staged itu yang diterbitkan; kalau belum ada, langsung dibuat sebagai published.
- Kalau keluar `The site shows INDY as fsre ...`: bukan error; FSRE punya approval yang lebih baru (D2).
- Situs membaca ulang saat halaman dibuka; muat ulang `https://dikagustiana.com/finance/finance-in-action`.

## 6. Menarik (`--withdraw`)

```
npx vite-node scripts/fia/publish-manual.ts --withdraw INDY INDY-2025Q4-r1
```

Harapan: `Withdrawn: INDY INDY-2025Q4-r1. The site now shows INDY as nothing.` (atau versi lain yang menang).
Ditarik itu final: untuk menampilkan lagi, terbitkan versi baru.

## 7. Melihat daftar (`--list`)

```
npx vite-node scripts/fia/publish-manual.ts --list
```

Menampilkan semua baris manual (ticker, versi, status, siapa dan kapan approve, dalam WIB, catatan) lalu apa
yang sedang tampil di situs per ticker dan dari jalur mana (`fsre` atau `manual`).

Kalau paket FSRE yang seharusnya tampil tidak ada di daftar itu: kemungkinan view FSRE sedang tidak bisa dibaca
(misalnya migrasi `fsre-skills` mengganti kolomnya atau mencabut grant `anon`). Jalur FSRE lalu dikosongkan dan
jalur manual tetap tampil; database mencatat `WARNING: fia.model_packages: the FSRE channel cannot be read and
is left out (...)` di log (Supabase → Logs → Postgres). Kirim pesan itu ke Claude Code.

## 8. Arti setiap pesan

### Dari pemeriksaan paket (sebelum menulis)

| Pesan (awal baris) | Artinya | Yang dilakukan |
|---|---|---|
| `meta.provenance synthetic is not filings; production shows models built from filings only` | Paket sintetis/fixture. Production hanya menerima paket dari laporan keuangan. | Pakai paket asli dengan `"provenance": "filings"`. Fixture `SYNTHETIC` memang selalu ditolak. |
| `meta.subIndustry X is not a sub-industry the section lists, ...` | Kode sub-industri di paket belum ada di `sub-industries.json`. | Pakai kode yang terdaftar: INDY/ADRO `A121`, BREN `J411` (Electric utilities). Sub-industri baru masuk lewat PR ke `sub-industries.json`. |
| `meta.contentHash is ...; the package hashes to ...` | Isi paket berubah setelah hash dihitung. | Kosongkan nilainya di file (`"contentHash": ""`); skrip menghitung dan memakai hash yang benar. |
| `note: meta.contentHash was empty; ...` | Bukan error. Hash dihitung oleh skrip. | Tidak perlu apa-apa. |
| `... (model-package.schema.json)` | Bentuk JSON tidak sesuai kontrak v3.1. Awal baris menunjukkan lokasinya, misalnya `sheets[0].rows[3].cells[2]`. | Perbaiki bagian itu di model/paket. |
| `meta.chainStage ... is not a chain map stage or spanning layer` | Posisi rantai salah. | Pakai id rantai yang ada (`stage-extraction` untuk batu bara, `band-energy` untuk panas bumi). |
| `meta.conditionIds condition N is not in section 05` | Nomor kondisi Capital in Motion tidak ada. | Pakai nomor 1–21. |
| `... does not name a row`, `has N cells for M periods`, `unitEconomics...`, `peerBand[...]`, pesan rumus | Isi model tidak konsisten (referensi baris, jumlah sel, unit economics, rumus). | Perbaiki di model; pesan ini sama persis dengan yang akan ditampilkan situs. |
| `workpaper.gates[i] ... failed; ... cannot be published` | Ada gate yang gagal (D5). | Boleh `--stage`, tidak boleh `--publish` sampai gate diperbaiki. |
| `is not JSON` / `cannot read ...` | File rusak atau lokasi salah. | Cek lokasi file (seret file ke Terminal untuk menyalin lokasinya). |
| `--publish needs --by "<the approver's name>"` | Nama approver belum diisi. | Tambahkan `--by "Dika Gustiana Irawan"`. |

### Dari database (saat menulis)

| Pesan | Artinya | Yang dilakukan |
|---|---|---|
| `Refused: X V is already published; nothing written. A revision is a new version (meta.version).` | Versi itu sudah terbit dan terkunci. | Ubah `meta.version` di file, kosongkan `contentHash`, terbitkan lagi. |
| `Refused: X V is already withdrawn; ...` | Versi itu sudah ditarik (final). | Sama: versi baru. |
| `Refused: there is no manual row X V ...` | Ticker/versi salah ketik. | Lihat `--list`. |
| `X V is already withdrawn; nothing changed.` | Sudah ditarik sebelumnya. | Tidak perlu apa-apa. |
| `the database refused it: ...` lalu `meaning: ...` | Database menolak dan menjelaskan aturannya: kontrak tidak cocok, ticker/versi/hash beda dengan isi paket, provenance bukan filings, publish tanpa approver, waktu approve di masa depan, gate failed, baris published terkunci, withdrawn final. | Biasanya sudah tertangkap oleh pemeriksaan; kalau muncul, kirim output-nya ke Claude Code. |
| `meaning: the fia schema is not in this database yet; apply the migration first` | Database yang disambung belum punya skema `fia`. Production sudah (2.1), jadi `.env.local` menunjuk ke project lain. | Periksa `SUPABASE_DB_URL` (langkah 1.3). |
| `(The write stands. What the site shows for X could not be read: ...)` | Penulisan **sudah berhasil** (published/withdrawn); hanya pembacaan tampilan sesudahnya yang gagal. | Jangan ulangi perintahnya; cek dengan `--list`. |

### Sambungan

| Pesan | Artinya | Yang dilakukan |
|---|---|---|
| `no .env.local in ...` | Perintah dijalankan di luar folder repo, atau `.env.local` belum dibuat. | `cd` ke folder repo; langkah 1.3. |
| `.env.local has no SUPABASE_DB_URL line` / `has no SUPABASE_DB_PASSWORD line` | Baris itu hilang atau kosong. | Langkah 1.3. |
| `password authentication failed` | Password salah. | Ketik ulang password di `.env.local`. |
| `Tenant or user not found` | Host pooler bukan milik project ini. | Ganti `aws-0` menjadi `aws-1` (langkah 1.5). |
| `getaddrinfo ENOTFOUND` / `timeout` | Internet putus atau diblokir jaringan kantor. | Coba jaringan lain. |

## 9. Kalau perlu mundur

- Situs kembali membaca FSRE saja: revert PR di GitHub (tombol **Revert** pada PR yang sudah di-merge), tunggu
  deploy. Database tidak perlu diubah.
- Membatalkan migrasi: hanya selama **belum ada** baris published di `fia.manual_release`; perintahnya ada di
  kepala file migrasi (bagian DOWN). Minta Claude Code menjalankannya dengan persetujuan eksplisit.
