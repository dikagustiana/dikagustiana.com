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

Kalau sudah ada, masuk ke foldernya (`cd` ke folder `dikagustiana.com`). Lalu:

- **Sebelum PR di-merge** (fase 6 di bawah memakai skrip dari branch PR):

  ```
  git fetch origin
  git checkout claude/fia-two-gates-gslvkn
  git pull
  npm ci
  ```

- **Sesudah PR di-merge** (pemakaian sehari-hari):

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

- Sebelum migrasi diterapkan (fase 6), jawaban yang benar adalah:
  `the database refused it: relation "fia.manual_release" does not exist` dan
  `meaning: the fia schema is not in this database yet; apply the migration first (RUNBOOK.md)`.
  Itu artinya **sambungan berhasil**; tabelnya saja yang belum ada.
- Sesudah migrasi: `Manual rows (0), times in WIB:` dan `What the site shows (fia.model_packages, 0):`.
- Kalau muncul `Tenant or user not found`: buka `.env.local`, ganti `aws-0` menjadi `aws-1` di baris
  `SUPABASE_DB_URL`, simpan, jalankan lagi. (Atau salin string dari Supabase → tombol **Connect** →
  **Session pooler**, tempel sebagai `SUPABASE_DB_URL=...`; biarkan `[YOUR-PASSWORD]` di dalamnya, karena
  baris `SUPABASE_DB_PASSWORD` yang dipakai.)

## 2. Fase 6: menyalakan jalur manual (sekali, urut, sebelum merge)

Urutannya penting: kalau PR di-merge sebelum langkah 2–4, situs membaca skema `fia` yang belum ada dan
menampilkan kalimat "The published models are not available yet…". Jadi: migrasi, expose, tes, **baru** merge.
Prasyarat terpisah (fase 0): `VITE_FIA_LIVE=true` di Vercel Production, `VITE_FIA_PREVIEW` tidak ada.

**Langkah 1. Simpan fingerprint FSRE sebelum migrasi.**

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fsre_fingerprint.sql > fsre-before.txt
grep '^total' fsre-before.txt
```

PowerShell: `Select-String '^total' fsre-before.txt`

Harapan (snapshot 22 Okt, `fsre-snapshot.md`): `total | - | 229 | 201cddfeaa5ae54387a05fa5e47d6d79`. Kalau
berbeda, FSRE kemungkinan sudah menjalankan migrasinya sendiri sejak 22 Okt; itu boleh, yang penting langkah 5
sama dengan langkah 1.

**Langkah 2. Terapkan migrasi.** Pilih satu cara (README repo: jangan `supabase db push`).

- Cara A (seperti migrasi sebelumnya, tercatat di riwayat migrasi Supabase): di Claude Code, tempel kalimat ini:

  > Terapkan `supabase/migrations/20261022100000_fia_two_gates.sql` dari branch `claude/fia-two-gates-gslvkn`
  > ke project Supabase `asypkbkiebjvvpimewfp` dengan `apply_migration`, nama `fia_two_gates`. Saya
  > menyetujui penulisan ini. Sesudahnya jalankan `list_migrations` dan tunjukkan baris terakhir.

- Cara B (SQL Editor): salin isi file ke clipboard,

  ```
  pbcopy < supabase/migrations/20261022100000_fia_two_gates.sql
  ```

  PowerShell: `Get-Content supabase/migrations/20261022100000_fia_two_gates.sql -Raw | Set-Clipboard`

  lalu Supabase → **SQL Editor** → **New query** → tempel → **Run**. Harapan: `Success. No rows returned`.

**Langkah 3. Expose skema `fia` ke Data API.** Supabase → **Project Settings** → **Data API** → **Exposed
schemas** → tambahkan `fia` (jangan hapus yang sudah ada, termasuk `fsre_published`) → **Save**.

**Langkah 4. Jalankan tes SQL** (satu transaksi, di-rollback; tidak ada yang tertinggal):

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fia_manual_release.sql
```

Baris terakhir harus: `fia_manual_release: 86 PASS, 0 FAIL`. Setiap baris lain diawali `PASS` atau `FAIL`
dengan nama aturannya.

**Langkah 5. Fingerprint FSRE sesudah migrasi, bandingkan:**

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fsre_fingerprint.sql > fsre-after.txt
diff fsre-before.txt fsre-after.txt && echo IDENTIK
```

PowerShell: `if (-not (Compare-Object (Get-Content fsre-before.txt) (Get-Content fsre-after.txt))) { "IDENTIK" }`

Harus keluar `IDENTIK`. Kalau tidak, **jangan merge**; kirim kedua file ke Claude Code.

**Langkah 6. Cek view yang akan dibaca situs** (anon, kunci publik situs):

```
VITE_SUPABASE_URL=https://asypkbkiebjvvpimewfp.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_T8D6Uq_flTdtQT5mZuYVsw_nfgiZ203 npx vite-node scripts/world/check-published.ts
```

PowerShell:

```
$env:VITE_SUPABASE_URL="https://asypkbkiebjvvpimewfp.supabase.co"; $env:VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_T8D6Uq_flTdtQT5mZuYVsw_nfgiZ203"; npx vite-node scripts/world/check-published.ts
```

Harapan: `check-published: fia.model_packages HTTP 200, 0 package(s)`. Kalau keluar
`published models answered ... (not-available)`, langkah 3 belum tersimpan (atau tunggu satu menit lalu
ulangi). Kalau `(refused)`, kirim output-nya ke Claude Code.

**Langkah 7. Merge PR** di GitHub, tunggu deploy Vercel Production selesai.

**Langkah 8. Verifikasi production.** Buka `https://dikagustiana.com/finance/finance-in-action`: harus tampil
"The chain, read one company at a time" dengan PTBA, ITMG, INDY, ADRO, INTP, SMGR, BREN berstatus "Planned;
no model yet", tanpa kalimat "not available". Ulangi perintah langkah 6. Kirim ke Claude Code: output langkah
4, 5, 6 dan screenshot halaman.

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
| `meta.subIndustry X is not a sub-industry the section lists, ...` | Kode sub-industri di paket belum ada di `sub-industries.json`. | Pakai kode yang terdaftar (INDY/ADRO: `A121`). Untuk BREN, kode panas bumi harus ditetapkan dulu (lihat `report.md`, OWNER-DECISION) dan masuk lewat PR. |
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
| `meaning: the fia schema is not in this database yet; apply the migration first` | Migrasi belum diterapkan. | Fase 6, langkah 2. |
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
