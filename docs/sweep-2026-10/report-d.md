# Laporan fase D — Capital in Motion tidied

Branch `sweep/d-capital`, dari `origin/main` @ `0487609` (PRD R6, konteks §1.2.6, Bagian 3 "Phase D",
keputusan D6(a) dan D7). Semua commit lokal; push dan PR dikerjakan orkestrator.

- SHA awal: `048760967c60be64095df084eee9c9b49bff75d4` (`origin/main`, "Merge pull request #58 from
  dikagustiana/world-v2/e-quality").
- SHA akhir: lihat commit terakhir di PR (commit laporan ini mengubahnya, jadi tidak bisa ditulis di sini).

## Commit

`git log --reverse --format='%h %s' 0487609..HEAD`, urut dari yang pertama:

1. `d07b191` Add a migration that titles the capital-allocation card Capital in Motion
2. `dc5d691` Name the Finance menu's fifth track Capital in Motion
3. `7d623a2` Remove the premise block from Capital in Motion
4. `83af9b9` Show only the layer label in a capital condition card's meta line
5. `3fec3c9` Mark two 2026-10-09 decisions superseded for Capital in Motion
6. `b7dcbea` Raise the unit test floor to 1151 for the Capital in Motion tests
7. `a863105` Add phase D screenshots of Capital in Motion
8. `05dc877` Point the superseded notes at the Capital in Motion entry
9. `ca72dfa` Record the Capital in Motion decisions in DECISIONS
10. (commit laporan ini) Add the phase D report

## 1. Yang dibangun, per kriteria penerimaan

| Kriteria | Di mana / bagaimana | Bukti (tes) |
|---|---|---|
| **R6.1 / D6(a)** satu nama "Capital in Motion"; URL tetap | Label nav `src/config/navConfig.ts:48` (`'Capital in Motion'`, path tetap `/finance/capital-allocation`). Kartu `/finance` lewat migrasi `supabase/migrations/20261010120000_capital_in_motion_title.sql` (`UPDATE public.finance_sections SET title = 'Capital in Motion' WHERE slug = 'capital-allocation'` + blok `DO $assert$` yang menggagalkan migrasi kalau baris tidak ada). Breadcrumb (`FinanceInMotion.tsx:35`), SEO (`:39`) dan h1 (`:47`) sudah "Capital in Motion", tidak diubah. Route, slug, dan redirect legacy (`App.tsx:187-188`) tidak berubah. | `tests/unit/navConfig.test.ts:111` "calls the capital-allocation track by its page name, Capital in Motion": membaca `<SEO title>` dari `FinanceInMotion.tsx` dan mewajibkan label nav sama dengannya. Migrasi **belum dijalankan** di mana pun (lihat §7). |
| **R6.2 / D7** blok PREMISE: D7 kosong, jadi dihapus | Blok `FinanceInMotion.tsx:49-69` (di `0487609`) dihapus seluruhnya. Halaman kini: h1 → subjudul yang sudah ada "Twenty-one conditions I wish I understood earlier." → 21 kondisi. Komentar header file (`:5-9`) menyebut lokasi premise kalau Dika menulisnya nanti, tanpa mengutip teks lama. Penutup di bawah daftar (`:67-73`) tidak disentuh (di luar R6). | `tests/unit/capitalInMotionRoutes.test.tsx:131` "goes from the h1 and its subtitle straight to the conditions: no premise block". |
| **R6.3** meta kartu hanya label layer | `src/components/finance/CapitalConditionCard.tsx:29`: `{getLayerLabel(condition.layer)}`, tanpa ` · Dika Gustiana`. Halaman tidak punya komponen byline, jadi tidak ditambah. | `tests/unit/capitalInMotionRoutes.test.tsx:142` "no condition card carries the author's name: its meta line is the layer label alone" (21 kartu; tidak ada "Dika Gustiana"; meta = label layer). |
| **R6.4** deskripsi kartu `/finance` tetap | Migrasi hanya mengubah `title`; `description` dan `slug` tidak disentuh. | Isi migrasi (35 baris, satu `UPDATE` pada `title`). |
| **R6.5** `docs/DECISIONS.md:112-129` diperbarui; 34 tes lama hijau; tes nama penulis | Catatan bertanggal `*[SUPERSEDED 2026-10-10 …]*` di bawah "Capital Allocation joins the Finance dropdown" dan "Owner-protected surfaces left alone" (commit `3fec3c9`, `05dc877`); entri baru di puncak file "# 2026-10-10 — Capital in Motion: one name, no premise, no author on the cards" (`ca72dfa`) yang menyebut entri yang di-supersede beserta barisnya. | `capitalInMotionRoutes` + `capitalConditionCaseGate`: 36 lulus (34 lama + 2 baru); `navConfig`: 34 lulus (33 lama + 1 baru). Output di §2. |
| Bagian 3 Phase D: screenshot 1440 dan 390 | 8 PNG di `docs/sweep-2026-10/screenshots/d/` (§3). | Diperiksa satu per satu dengan mata. |
| Lantai tes | `scripts/assert-test-count.mjs`: `MIN_TESTS` 1148 → 1151 (aktual 1155 − 4), klausa baru ditaruh di depan komentar sesuai gaya file. | `assert-test-count: ok` di §2. |

## 2. Output verifikasi (asli)

Semua dijalankan di `/home/user/wt/d` pada HEAD `ca72dfa` (kode sama dengan commit laporan ini), Node v22.22.0.

```
$ npx eslint . --max-warnings=35
  18:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

✖ 22 problems (0 errors, 22 warnings)

eslint exit=0
```

Baseline 22 peringatan; tidak ada yang bertambah.

```
$ npm run typecheck
> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force

typecheck exit=0
```

```
$ npm run check:world
> vite_react_shadcn_ts@0.0.0 check:world
> node scripts/world/check-engine.mjs

40 files · 37 wired from the entry · 3 pending
pending (not wired from the entry): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts
wired files clean
load order ok
no Factory Yard code in src/
check:world exit=0
```

```
$ TZ=America/Chicago npx vitest run --reporter=dot --reporter=json --outputFile=…/work-d/vitest.json
 Test Files  85 passed (85)
      Tests  1155 passed (1155)
   Start at  01:27:56
   Duration  177.57s (transform 10.47s, setup 24.41s, collect 37.92s, tests 363.54s, environment 58.10s, prepare 11.18s)

JSON report written to …/work-d/vitest.json
vitest exit=0

$ node scripts/assert-test-count.mjs …/work-d/vitest.json
assert-test-count: 1155 tests, 0 failed, 0 failed suite(s) (floor 1151)
assert-test-count: ok
assert exit=0
```

```
$ npx vitest run tests/unit/capitalInMotionRoutes.test.tsx tests/unit/capitalConditionCaseGate.test.tsx tests/unit/navConfig.test.ts
 Test Files  3 passed (3)
      Tests  70 passed (70)
```

```
$ CI=1 flock /tmp/claude-0/e2e.lock npx playwright test
  ✓  72 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1024px with a 24px root font (927ms)
  ✓  73 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1280px with a 24px root font (1.3s)
  ✓  74 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1348px with a 24px root font (1.0s)
  ✓  75 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1440px with a 24px root font (859ms)

  75 passed (1.1m)
e2e exit=0
```

`test:e2e:world` tidak dijalankan: fase D tidak menyentuh `src/world`, `src/components/world`, `src/lib/world`,
atau `scripts/world`.

```
$ flock /tmp/claude-0/e2e.lock sh -c 'VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'
✓ built in 9.63s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
build exit=0
```

Grep angka ticker (harus kosong):

```
$ git grep -nE "\b(PTBA|ITMG|INTP|SMGR)\b" -- src public tests scripts supabase | grep -E "[0-9]{1,3}([.,][0-9]{3})+" ; echo "exit=$?"
exit=1
```

Tidak ada baris yang cocok (exit 1 dari `grep` berarti tidak ada match). Fase D tidak menambah angka emiten maupun data
SAMB.

## 3. Screenshot

Semua diambil dari bundle production (Playwright, `vite build` + preview) terhadap Supabase mock (`tests/e2e/mockSupabase`),
dengan spec sementara `tests/e2e/zz-shots-d.spec.ts` yang sudah dihapus sebelum commit. Data seed dummy. Screenshot
Vercel Preview ditambahkan oleh orkestrator setelah PR ada.

| File | Isi | Sumber |
|---|---|---|
| `docs/sweep-2026-10/screenshots/d/capital-in-motion-top-1440.png` | Puncak halaman: breadcrumb "Capital in Motion", h1, subjudul, lalu langsung kartu pertama; tanpa blok premise; meta kartu hanya "OPERATIONAL" / "BALANCE SHEET" | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/capital-in-motion-top-390.png` | Sama, lebar 390 | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/capital-in-motion-cards-1440.png` | Grid kartu di tengah daftar: setiap meta hanya label layer (BALANCE SHEET, PORTFOLIO, TRANSITION), tanpa nama penulis | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/capital-in-motion-cards-390.png` | Sama, lebar 390 | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/finance-menu-capital-in-motion-1440.png` | Dropdown Finance di desktop: item kelima "Capital in Motion" | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/finance-menu-capital-in-motion-390.png` | Drawer navigasi mobile, Finance terbuka: "Capital in Motion" | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/finance-landing-card-after-migration-1440.png` | `/finance`, kartu 05 berjudul "Capital in Motion" dengan deskripsi R6.4. **Seed lokal meniru hasil migrasi**; production masih "Capital Allocation" sampai migrasi diterapkan | mock Playwright |
| `docs/sweep-2026-10/screenshots/d/finance-landing-card-after-migration-390.png` | Sama, lebar 390 | mock Playwright |

## 4. Keputusan yang saya ambil sendiri

- **Tes baru masuk ke file yang sudah ada.** Dua tes halaman ditaruh di `tests/unit/capitalInMotionRoutes.test.tsx`
  sebagai `describe` baru ("the index as the owner set it on 10 October 2026"), memakai render `App` dan mock
  Supabase yang sama, bukan file baru. Alasan: suite itu sudah merender route aslinya.
- **Tes nav tidak meng-hard-code label saja.** Tes membaca `<SEO title>` dari `FinanceInMotion.tsx` dan mewajibkan
  label nav sama dengannya, supaya nav dan halaman tidak bisa menyimpang lagi (penyimpangan inilah yang dicatat
  `DECISIONS.md` 2026-10-09).
- **Migrasi diberi blok `DO $assert$`** (pola dari `20260927072835_next_big_thing_growth_category.sql`). Tanpa itu,
  slug yang salah ketik tidak meng-update apa pun dan tetap "berhasil".
- **Jarak header dipertahankan.** Setelah blok premise dihapus, header tetap `mb-5`; `border-b` milik premise ikut
  hilang. Tidak ada styling baru; hasilnya terlihat di screenshot.
- **Komentar tidak mengutip teks yang dihapus**, sesuai aturan repo ("Comments may not quote deleted copy",
  `docs/DECISIONS.md:1441`).
- **Catatan superseded di 112-129 (kini baris 163 dan 182).** Catatan untuk "Owner-protected surfaces left alone"
  menyebut terus terang bahwa entri itu hanya menamai surface About, dan bahwa pass yang sama (`07adda2`) menyimpan
  premise Capital in Motion apa adanya untuk owner; jadi catatannya berlaku untuk Capital in Motion saja.
- **Entri DECISIONS baru** menyebut tiga entri lama berikut barisnya di branch ini: 2026-10-09 "Capital Allocation
  joins the Finance dropdown" (163), 2026-10-09 "Owner-protected surfaces left alone" (182), dan baris tabel
  `CapitalConditionCard.tsx:27` di entri 2026-08-02 "The hero drops its third paragraph, and with it the only byline"
  (1456, baris tabel 1500). Catatan di tempat hanya ditambahkan di 163 dan 182, karena hanya itu yang diminta PRD
  (R6.5); tabel 2026-08-02 adalah potret keadaan saat itu dan cukup disebut dari entri baru.
- **Entri 2026-08-02 "`capital-allocation` stays out of the nav" (baris 1720) tidak ditandai.** Yang membaliknya
  adalah entri 2026-10-09, bukan fase ini (lihat §8).
- **Screenshot tambahan** di luar dua yang diminta: menu Finance (desktop dan drawer mobile) untuk perubahan label,
  dan `/finance` dengan judul pasca-migrasi. Deskripsi empat kartu lain diambil dari migrasi seed baseline; deskripsi
  capital-allocation adalah teks R6.4 di PRD.

## 5. Pertentangan PRD/prompt/repo

1. **R6.5 menyebut surface ini "owner-protected" di `docs/DECISIONS.md:125-129`,** padahal entri itu hanya menamai
   hero About, ReadingPath, ChangedMind, dan peta industry chain, bukan Capital in Motion. Kaitan terdekat adalah
   commit `07adda2` di pass 2026-10-09 yang sama ("Premise and closer kept verbatim pending Q10"). Catatan superseded
   menulis ini apa adanya, tidak mengklaim entri itu mencakup halaman ini.
2. **Prompt implementasi meminta "update navConfig tests that assert the old label",** tetapi tidak ada tes yang
   menegaskan "Capital Allocation": `tests/unit/navConfig.test.ts` hanya mengunci slug dan path. Saya menambah satu
   tes untuk label baru. Nama tes route yang diparametrisasi ikut berubah dengan sendirinya.
3. **`docs/sweep-2026-10/DECISIONS.md` dirujuk tetapi belum ada di branch ini.** File itu dibuat di fase 0
   (`sweep/0-bootstrap`), sedangkan branch ini berangkat dari `0487609`. Rujukannya benar setelah PR fase 0 merge.
4. Bagian 1 R6 dan Bagian 3 Phase D tidak bertentangan. R6.2 vs D7: D7 kosong, jadi blok dihapus, bukan diganti,
   sesuai kedua bagian.

## 6. Yang menunggu Dika

| Apa | Langkah persis |
|---|---|
| Terapkan migrasi judul kartu | Setelah PR fase D merge dan deploy production selesai (supaya nav dan kartu berubah bersamaan): Supabase `apply_migration` pada project `asypkbkiebjvvpimewfp`, `name: "capital_in_motion_title"`, `query`: isi lengkap `supabase/migrations/20261010120000_capital_in_motion_title.sql`. Sesuai README "Database & migrations": jangan `supabase db push` atau perintah CLI migrasi lain. Cek: `select slug, title, description from finance_sections where slug = 'capital-allocation';` harus memberi `title = 'Capital in Motion'` dan deskripsi lama. Kalau baris tidak ada, blok `$assert$` menggagalkan migrasi dan tidak ada yang berubah. |
| Regenerasi types | **Tidak perlu**: migrasi hanya mengubah data, bukan skema. Kalau tetap ingin, ikuti `docs/RUNBOOK.md` §4 (`generate_typescript_types` → `src/integrations/supabase/types.ts`, REPLACE); diff-nya harus kosong. |
| Vercel | Tidak ada perubahan env untuk fase D. Periksa Preview PR (screenshot ditambahkan orkestrator), lalu merge. |
| Premise (opsional, D7) | Kalau ingin ada premise: tulis di `docs/sweep-2026-10/copy/capital-in-motion-premise.md`; dipasang sebagai satu blok prosa (satu warna, satu ukuran) di PR susulan. |
| Merge | Merge PR fase D bila setuju. |

## 7. Yang tidak terverifikasi

- **Migrasi belum pernah dijalankan** terhadap database mana pun, termasuk blok `$assert$`: tidak ada Supabase lokal,
  dan production read-only untuk fase ini.
- **Kartu `/finance` berjudul "Capital in Motion"** hanya diperiksa terhadap data mock yang di-seed dengan judul hasil
  migrasi. Production tetap "Capital Allocation" sampai migrasi diterapkan.
- **Deskripsi capital-allocation di screenshot** diambil dari teks PRD R6.4; production tidak dibaca untuk
  memastikannya.
- **Pembaca lain `finance_sections.title`** (label share card lewat modul, `scripts/lib/publishedEssays.mjs:24`;
  judul track di panel chain, `src/components/industry-chain/useChainModules.ts:55`) juga akan membaca "Capital in
  Motion" untuk modul di track ini. Menurut `docs/DECISIONS.md` (2026-08-02, baris 1720) track ini tidak punya modul;
  jumlah modulnya hari ini tidak saya baca ulang dari production. Kalau ada, perubahannya sejalan dengan D6(a)
  ("di semua tempat").
- **Tidak ada e2e yang membuka `/finance/capital-allocation`**; halaman ini dibuktikan oleh tes unit yang merender
  `App` dan oleh screenshot dari bundle production.
- **Screenshot Vercel Preview** belum ada; ditambahkan orkestrator setelah PR dibuat.

## 8. Kandidat pembersihan

- **Konflik merge `MIN_TESTS`** (`scripts/assert-test-count.mjs`): fase A, B, dan C juga menaikkannya dari 1148. Yang
  merge belakangan harus menghitung ulang (aktual − 4) dan menggabungkan klausa komentarnya.
- **Konflik merge `docs/DECISIONS.md`:** fase 0 dan fase lain juga menyisipkan entri 2026-10-10 di puncak file, dan
  fase C (R8.6) juga menandai "Owner-protected surfaces left alone" sebagai superseded. Pertahankan semua entri dan
  kedua catatan. Nomor baris yang dirujuk entri fase D (163, 182, 1441, 1456, 1500) bergeser bila entri lain masuk di
  atasnya; perbarui saat merge.
- **`docs/DECISIONS.md:1720`** ("`capital-allocation` stays out of the nav", 2026-08-02) belum ditandai superseded,
  padahal entri 2026-10-09 sudah membaliknya. Tidak saya sentuh.
- **`src/data/capitalConditions.ts:2`**: komentar header masih "Capital Allocation Framework — Data layer." (hanya
  komentar, tidak terlihat pengunjung).
- **`tests/unit/capitalInMotionRoutes.test.tsx:5`**: komentar header masih menyebut "the Capital Allocation card"
  sebagai keadaan historis; benar sebagai riwayat, tetapi bisa dirapikan bersama butir di atas.

## Text awaiting the owner

Tidak ada. Fase D tidak menambah kalimat baru yang dibaca pengunjung. Satu-satunya teks baru yang terlihat adalah
label/judul "Capital in Motion" (nav `src/config/navConfig.ts:48` dan `finance_sections.title` lewat migrasi), yaitu
nama pilihan Dika di D6(a). Premise dihapus tanpa pengganti (D7).
