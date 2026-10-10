# Laporan fase B — FSLI pages show the essay

Site sweep Oktober 2026, fase B (PRD R1; keputusan Dika D1(a) dan D2(a)).

- **Branch:** `sweep/b-fsli`
- **Base:** `main` @ `0487609` ("Merge pull request #58 from dikagustiana/world-v2/e-quality")
- **SHA awal:** `048760967c60be64095df084eee9c9b49bff75d4`
- **SHA akhir:** lihat commit terakhir di PR (commit laporan ini sendiri mengubahnya)

## Daftar commit

`git log --reverse --format='%h %s' 0487609..HEAD`, sebelum commit laporan ini:

```
e4f7058 Mark the FSLI component-flag migration as applied
cc9c29b Add fsli_pages.covered_by_slug for line items without an essay
fa3baa9 Build the FSLI table of contents from essay headings
90a1b22 Render the linked essay as the FSLI page body
a88f139 Point an FSLI page without an essay at the one covering it
2a902d5 List related FSLI line items from the same category
e50b889 Test the FSLI page body, cover sentence and related items
427bb46 Add an end-to-end spec for the FSLI line-item page
bfeeebd Size the FSLI essay title with the essay page's title class
73db9b7 Add phase B screenshots of the FSLI pages against mock data
6e019e0 Say the FSLI component flag is applied in the page type's comment
826e9ad Keep the covered pages' updated date when the mapping is applied
a933dba Give FSLI headings ids from their words, unique across the page
b82fdc0 Measure the FSLI highlight on arrival and not across line items
0cd5dec Record phase B's FSLI decisions in DECISIONS.md
c8162ad Mark the superseded FSLI passages in DECISIONS.md in place
```

Ditambah satu commit terakhir: laporan ini (`docs/sweep-2026-10/report-b.md`).

Commit `6e019e0` sampai `b82fdc0` adalah perbaikan dari dua review independen; alasan tiap perbaikan ada di pesan commit-nya.

## Yang dibangun, per kriteria terima

| Kriteria | Di mana / bagaimana | Bukti (tes) |
|---|---|---|
| **R1.1** Essay jadi isi halaman: header line item + kartu angka (tidak berubah) → judul essay sebagai h2 pertama, snippet sebagai lede, lalu `ArticleBody`; tidak ada kerangka, "Not written yet", atau heading "Related Essays" | `src/pages/FsliDetail.tsx`: konstanta `contentSections` / `issueSections` / `exampleSections` dihapus, begitu juga blok "Related Essays". Essay dari `useFsliEssayBodies` dirender tepat setelah kartu angka; judul memakai `editorial-title` dan snippet `editorial-subtitle` (kelas yang sama dengan halaman essay), dalam lebar 728px yang sama dengan body. `src/components/fsli/FsliContentSection.tsx` dan `useFsliSections` (`src/hooks/queries/useFsliPages.ts`) dihapus karena tidak punya pembaca lain. Tabel `fsli_sections` tidak disentuh. | `tests/unit/fsliDetail.test.tsx:137` ("renders the essay as the body: its title the first h2, its snippet the lede, then the essay"); `tests/e2e/fsli.spec.ts:124` (h2 pertama = judul essay, lede tampil, `Not written yet` 0, heading `Related Essays` 0) |
| **R1.2** TOC "On this page" dari h2/h3 essay, `id` stabil (slug judul + indeks bila duplikat); cari-di-halaman tetap | `src/lib/fsliToc.ts` (`buildFsliToc`, `fsliTocIds`): heading dibaca dari `content` essay (TipTap JSON atau HTML lama, lewat `contentToHtml`), h3 bersarang di bawah h2-nya. `id` = slug kata-kata heading, `-2`, `-3`… hanya bila slug itu sudah dipakai di halaman; `root` dan `main-content` dicadangkan. Id dibuat sekali per halaman dan diteruskan ke `ArticleBody` lewat prop baru opsional `headingIds` (`src/components/editorial/ArticleBody.tsx`); halaman essay tidak mengirim prop itu sehingga id posisional `section-N-<slug>`-nya tidak berubah. `src/components/fsli/FsliOnThisPage.tsx` menerima entri baru, kotak "Find in page..." tetap ada, h2 yang cocok membawa semua h3-nya. Scroll-spy di `FsliDetail` mengukur sekali saat heading tiba (tidak hanya saat scroll) dan state-nya terikat ke slug line item. | `tests/unit/fsliToc.test.tsx:39,60,78,85,94,99,107,113,129` (9 tes: nesting, id yang sama dengan yang dirender `ArticleBody` untuk JSON dan HTML, id bertahan saat heading ditambah di atasnya, indeks hanya pada duplikat, id halaman tidak dipakai, h3 tanpa h2, tanpa heading, essay kedua, id posisional halaman essay); `tests/unit/fsliDetail.test.tsx:152,165,236,245`; `tests/e2e/fsli.spec.ts:124` (TOC berisi tiga heading essay, `#test-heading-two` ada, pencarian "two" menyisakan satu entri) |
| **R1.3** Halaman tanpa essay, D2(a): kolom `fsli_pages.covered_by_slug` + kalimat "Covered in …"; aman bila kolom belum ada | `supabase/migrations/20261010100000_fsli_covered_by.sql` (header "NOT APPLIED TO PRODUCTION; owner applies via apply_migration"): `ADD COLUMN IF NOT EXISTS covered_by_slug text REFERENCES public.fsli_pages (slug) ON UPDATE CASCADE ON DELETE SET NULL`, lalu delapan pemetaan persis seperti R1.3 sebagai `UPDATE … WHERE covered_by_slug IS NULL`; tiga `other-*-assets` tetap NULL. Trigger `update_fsli_pages_updated_at` dimatikan di sekitar UPDATE dalam satu transaksi supaya tanggal "Updated" delapan halaman itu tidak berubah. Kode: `FsliPage.covered_by_slug?` diketik lokal di `useFsliPages.ts`; `src/components/fsli/FsliCoveredBy.tsx` merender "Covered in <judul essay>" dengan tautan ke halaman line item penutup (judul jatuh ke judul halaman penutup bila halaman itu belum punya essay). Kedua query di `useFsliPages.ts` memakai `select *`, jadi sebelum migrasi kuncinya tidak ada dan dibaca sebagai "tidak tercakup". `src/integrations/supabase/types.ts` tidak diubah. | `tests/unit/fsliDetail.test.tsx:191,269,279,287` (tidak ada kalimat cover di samping essay; kalimat dan tautannya; fallback judul; tanpa cover dan tanpa kolom); `tests/e2e/fsli.spec.ts:153` (teks "Covered in Test Essay on Restricted Cash", `href` `/accounting/fsli/restricted-cash`, klik membuka essay-nya) dan `:172` (tanpa essay dan tanpa cover: halaman berhenti di kartu angka); uji migrasi di Postgres 16 lokal (output di bawah) |
| **R1.4** "Related line items" dari `fsli_pages.category` yang sama | `src/components/fsli/FsliRelatedItems.tsx`: kategori halaman ini, dirinya dikecualikan, urutan laporan (`sort_order`), maksimal 8 | `tests/unit/fsliDetail.test.tsx:309,314`; `tests/e2e/fsli.spec.ts:172` (`other-current-assets` hanya menampilkan "Cash and cash equivalents" dan "Restricted cash" dari seed lancar) |
| **R1.5** Header `20261009090000_fsli_component_flag.sql` diperbarui | Baris 4: "Applied to production (date unknown; column verified present 2026-10-10)." (`e4f7058`). Komentar `FsliPage.is_component` di `useFsliPages.ts` disesuaikan (`6e019e0`). | Diff file; tidak ada tes (komentar SQL) |
| **R1.6** Tes unit pembangun TOC; e2e `tests/e2e/fsli.spec.ts` (essay terbit dan kasus tanpa essay); `MIN_TESTS` naik | `tests/unit/fsliToc.test.tsx` (9), `tests/unit/fsliDetail.test.tsx` (11), `tests/e2e/fsli.spec.ts` (3, baru). `MIN_TESTS` di `scripts/assert-test-count.mjs`: 1148 → 1168 (aktual 1172), dengan klausa baru di depan komentar konstanta | Output `vitest` dan `assert-test-count` di bawah |
| **R1.7** Screenshot 1440 dan 390 | Mock Playwright untuk `cash-and-cash-equivalents`, `trade-receivables-net`, `restricted-cash-non-current` (tabel di bawah). Screenshot Preview Vercel menyusul setelah PR ada. | File PNG di `docs/sweep-2026-10/screenshots/b/` |

`docs/DECISIONS.md` mendapat satu entri "# 2026-10-10 — FSLI pages: the essay is the body (site sweep, phase B)" (D1(a), D2(a)), yang menyebut dua entri yang digantikannya dengan barisnya di `0487609`: "2026-08-01 (session 7) — FSLI empty state over seeded prose" (`:2414-2430`) dan, di "FSLI prose is authored as essays, not in a second editor", kalimat "Legacy `fsli_sections` content still renders read-only…" (`:2615-2616`). Kedua bagian itu tetap utuh dan diberi catatan "(Superseded 2026-10-10 …)" di tempatnya.

## Output verifikasi (asli)

Semua dijalankan dari `/home/user/wt/b` pada pohon kerja akhir sebelum commit laporan (`c8162ad`; perbedaannya dengan commit-commit kode hanya dokumen).

Lint (`npx eslint . --max-warnings=35`; baseline 22 warning, tidak bertambah):

```
✖ 22 problems (0 errors, 22 warnings)

exit=0
```

Typecheck (`npm run typecheck`):

```
> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force

exit=0
```

`npm run check:world`:

```
40 files · 37 wired from the entry · 3 pending
pending (not wired from the entry): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts
wired files clean
load order ok
no Factory Yard code in src/
exit=0
```

Unit penuh (`TZ=America/Chicago npx vitest run --reporter=dot --reporter=json --outputFile=…/vitest.json`) lalu `node scripts/assert-test-count.mjs …/vitest.json`:

```
 Test Files  87 passed (87)
      Tests  1172 passed (1172)
   Start at  03:27:24
   Duration  111.25s (transform 6.77s, setup 16.78s, collect 22.05s, tests 226.14s, environment 38.95s, prepare 6.92s)

exit=0
assert-test-count: 1172 tests, 0 failed, 0 failed suite(s) (floor 1168)
assert-test-count: ok
exit=0
```

E2E penuh (`CI=1 flock /tmp/claude-0/e2e.lock npx playwright test`), baris FSLI dan ringkasan:

```
  ✓  26 [chromium] › tests/e2e/fsli.spec.ts:124:1 › a line item with a published essay shows the essay as its body (672ms)
  ✓  27 [chromium] › tests/e2e/fsli.spec.ts:153:1 › a line item without an essay names the line item whose essay covers it (812ms)
  ✓  28 [chromium] › tests/e2e/fsli.spec.ts:172:1 › a line item with neither an essay nor a cover ends at its figures (817ms)
  ✓  44 [chromium] › tests/e2e/smoke.spec.ts:56:3 › renders FSLI list (/accounting/fsli) (1.0s)
…
  ✓  78 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1440px with a 24px root font (844ms)

  78 passed (1.3m)
exit=0
```

Build checks (`flock /tmp/claude-0/e2e.lock sh -c 'VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'`):

```
✓ built in 9.54s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
exit=0
```

Grep angka ticker slate (`git grep -nE "\b(PTBA|ITMG|INTP|SMGR)\b" -- src public tests scripts supabase | grep -E "[0-9]{1,3}([.,][0-9]{3})+" ; echo "exit=$?"`), hasil kosong:

```
exit=1
```

Migrasi `20261010100000_fsli_covered_by.sql` diterapkan dua kali di Postgres 16 lokal sekali pakai (cluster `initdb` sementara, dihapus setelahnya). Skema minimal: fungsi `update_updated_at_column`, tabel `fsli_pages` dan trigger `update_fsli_pages_updated_at` seperti di `20260731020000_baseline_finance.sql`, 16 baris dummy dengan `updated_at = 2026-09-30`:

```
--- first apply
BEGIN
ALTER TABLE
COMMENT
ALTER TABLE
UPDATE 1
UPDATE 3
UPDATE 2
UPDATE 1
UPDATE 1
ALTER TABLE
COMMIT
                      slug                       |               covered_by_slug               |       updated_at
-------------------------------------------------+---------------------------------------------+------------------------
 advances-prepayments-non-current                | advances-prepayments-current                | 2026-09-30 00:00:00+00
 corporate-dividend-taxes-receivable-non-current | corporate-dividend-taxes-receivable-current | 2026-09-30 00:00:00+00
 other-current-assets                            |                                             | 2026-09-30 00:00:00+00
 other-non-current-assets                        |                                             | 2026-09-30 00:00:00+00
 other-non-current-assets-final                  |                                             | 2026-09-30 00:00:00+00
 other-non-current-receivables                   | due-from-government                         | 2026-09-30 00:00:00+00
 other-receivables-net                           | due-from-government                         | 2026-09-30 00:00:00+00
 related-parties                                 | trade-receivables-net                       | 2026-09-30 00:00:00+00
 restricted-cash-non-current                     | restricted-cash                             | 2026-09-30 00:00:00+00
 third-parties                                   | trade-receivables-net                       | 2026-09-30 00:00:00+00
 trade-receivables-net-non-current               | trade-receivables-net                       | 2026-09-30 00:00:00+00
(11 rows)

 covered | restamped
---------+-----------
       8 |         0
(1 row)

            tgname            | tgenabled
------------------------------+-----------
 update_fsli_pages_updated_at | O
(1 row)

--- second apply (re-run)
BEGIN
psql:/tmp/pgb-8mkL/20261010100000_fsli_covered_by.sql:38: NOTICE:  column "covered_by_slug" of relation "fsli_pages" already exists, skipping
ALTER TABLE
COMMENT
ALTER TABLE
UPDATE 0
UPDATE 0
UPDATE 0
UPDATE 0
UPDATE 0
ALTER TABLE
COMMIT
…
 covered | restamped
---------+-----------
       8 |         0
(1 row)
…
 update_fsli_pages_updated_at | O
```

`npm run test:e2e:world` tidak dijalankan: fase ini tidak menyentuh `src/world`, `src/components/world`, `src/lib/world` atau `scripts/world` (PRD §1.6).

## Screenshot

Semua di `docs/sweep-2026-10/screenshots/b/`, diambil dengan **mock Playwright** (bundle production, Supabase palsu `tests/e2e/mockSupabase.ts`, data dummy: angka dan teks essay bukan milik emiten mana pun). Spec sementara yang dipakai sudah dihapus dari repo.

| File | Yang ditampilkan | Sumber |
|---|---|---|
| `fsli-cash-and-cash-equivalents-essay-body-1440-mock.png` | Kartu angka, lalu essay sebagai body (judul h2, lede, heading dan h3), "On this page" berisi heading essay dengan kotak cari, "Related line items" kategori lancar | mock Playwright |
| `fsli-cash-and-cash-equivalents-essay-body-390-mock.png` | Halaman yang sama di 390 px: kartu angka, essay penuh, tanpa rail | mock Playwright |
| `fsli-trade-receivables-net-essay-body-1440-mock.png` | Essay kedua sebagai body, TOC dengan h3 bersarang | mock Playwright |
| `fsli-trade-receivables-net-essay-body-390-mock.png` | Halaman yang sama di 390 px | mock Playwright |
| `fsli-restricted-cash-non-current-covered-by-1440-mock.png` | Halaman tanpa essay: kartu angka lalu "Covered in <judul essay>" bertaut ke `restricted-cash`; tanpa TOC; related items kategori tidak lancar | mock Playwright |
| `fsli-restricted-cash-non-current-covered-by-390-mock.png` | Halaman yang sama di 390 px | mock Playwright |

Screenshot dari Vercel Preview (data production, baca saja) untuk R1.7 ditambahkan oleh orchestrator setelah PR ada. Sebelum migrasi diterapkan, Preview akan menampilkan `restricted-cash-non-current` berhenti di kartu angka tanpa kalimat "Covered in …" (kolomnya belum ada), dan itu perilaku yang benar.

## Keputusan yang saya ambil sendiri

1. **`useFsliSections` dan `FsliContentSection` dihapus, tabel `fsli_sections` dibiarkan.** Keduanya tidak punya pembaca lain setelah kerangka hilang. Menghapus tabel adalah perubahan skema yang tidak diminta PRD; tabel itu dicatat sebagai kandidat pembersihan.
2. **Kolom baru dibaca lewat `select *`, bukan pola 42703.** Kedua query di `useFsliPages.ts` (`useFsliPages`, `useFsliPage`) sudah `select *` dan tidak pernah menyebut nama kolom (pembaca lain, `useUnifiedContent`, memilih kolom tertentu tanpa kolom baru), jadi sebelum migrasi tidak ada error 42703 yang perlu ditangkap: kuncinya tidak ada dan dibaca sebagai NULL. Ini memenuhi maksud R1.3 ("aman bila kolom belum ada") tanpa request gagal tambahan.
3. **FK `ON UPDATE CASCADE ON DELETE SET NULL`.** PRD hanya menulis `references fsli_pages(slug)`. `useUnifiedContent` menghapus baris `fsli_pages` langsung, jadi menghapus halaman penutup tidak boleh gagal karena halaman yang menunjuknya, dan tidak boleh ikut menghapusnya.
4. **Trigger `updated_at` dimatikan di sekitar pemetaan, dalam satu transaksi.** Tanpa itu delapan halaman akan menampilkan "Updated <tanggal migrasi diterapkan>" padahal isinya tidak berubah. Setiap UPDATE hanya menyentuh baris yang masih NULL, jadi menjalankan ulang aman dan pointer yang diubah Dika belakangan tidak ditimpa.
5. **"Covered in" memakai judul essay halaman penutup, jatuh ke judul halaman bila essay belum ada,** dan tidak merender apa pun sampai query essay selesai, supaya teks tautan tidak berganti di depan pembaca. Kalimatnya tanpa titik di akhir, persis bentuk "Covered in <essay title>" di Bagian 3.
6. **Skema id heading baru hanya di halaman FSLI.** Halaman essay tetap memakai id posisional `section-N-<slug>` karena anchor-nya mungkin sudah dibagikan dan R1 tidak menjangkau halaman itu. Konsekuensinya: anchor lama di halaman FSLI (id kerangka seperti `#definition`, dan id posisional essay di bawah "Related Essays") tidak berlaku lagi.
7. **Halaman tanpa essay dan tanpa cover berhenti di kartu angka,** tanpa empty state dan tanpa garis pemisah. Rail "On this page", termasuk kotak cari, hanya tampil bila ada heading untuk dicari. Kotak cari tetap ada di setiap halaman yang punya TOC (R1.2).
8. **Judul essay memakai `editorial-title`** (kelas judul halaman essay), karena pada 26px judul itu tampil lebih kecil dari h2 31px di dalam body-nya sendiri (`bfeeebd`).
9. **Highlight TOC diukur saat heading tiba dan diikat ke slug line item** (`b82fdc0`): halaman yang dibuka di tengah langsung punya highlight, dan highlight dari line item sebelumnya tidak terbawa ke heading dengan id yang sama.
10. **Tiga halaman di-screenshot** (`cash-and-cash-equivalents`, `trade-receivables-net`, `restricted-cash-non-current`), gabungan R1.7 dan Bagian 3 langkah 6.
11. **Catatan "(Superseded 2026-10-10 …)" di tempat** pada dua bagian `docs/DECISIONS.md` yang digantikan. R1 tidak memintanya; saya menambahkannya supaya pembaca entri lama tidak menganggapnya masih berlaku, mengikuti catatan amandemen yang sudah ada di file itu (mis. "[AMENDED 2026-08-03 …]").

## Pertentangan PRD/prompt/repo

1. **R1.7 vs Bagian 3 langkah 6.** R1.7 menyebut screenshot untuk `cash-and-cash-equivalents` dan `restricted-cash-non-current`; Bagian 3 menambah `trade-receivables-net`. Tidak saling meniadakan; saya mengambil gabungannya (tiga halaman).
2. **R1.3 / Bagian 3 langkah 3 menyebut pola 42703.** Di repo, `fsli_pages` dibaca dengan `select *`, jadi kolom yang belum ada tidak pernah menghasilkan 42703. Maksud PRD terpenuhi dengan "kunci tidak ada = NULL" (keputusan 2 di atas).
3. **PRD §2.3 langkah 3 menulis `npx supabase gen types …` "sesuai README".** README bagian "Database & migrations" tidak memuat perintah regenerasi tipe; perintahnya ada di `docs/DB_READINESS.md:81` (CLI) dan `docs/RUNBOOK.md:112` (`generate_typescript_types`). Langkah di bawah memakai keduanya.
4. Rujukan baris PRD §1.2.1 cocok dengan `0487609` (kerangka di `FsliDetail.tsx:19-46`, blok "Related Essays" di sekitar `:285-303`, `is_component` sudah ada di `types.ts` hasil generator). Tidak ada perbedaan yang mengubah desain.

## Yang menunggu Dika

1. **Review dan merge PR** fase B (draft). Kode aman di production sebelum atau sesudah migrasi.
2. **Terapkan migrasi** `supabase/migrations/20261010100000_fsli_covered_by.sql` ke project `asypkbkiebjvvpimewfp` lewat `apply_migration` (README "Database & migrations"; jangan `supabase db push`):
   - `project_id`: `asypkbkiebjvvpimewfp`
   - `name`: `fsli_covered_by`
   - `query`: seluruh isi file `supabase/migrations/20261010100000_fsli_covered_by.sql`, apa adanya (termasuk `BEGIN;` / `COMMIT;`, seperti `20260731040000_seed_surviving_content.sql` yang sudah diterapkan).
   - Cek (baca saja): `select slug, covered_by_slug from public.fsli_pages where covered_by_slug is not null order by slug;` harus 8 baris dengan pemetaan R1.3; `select tgname, tgenabled from pg_trigger where tgname = 'update_fsli_pages_updated_at';` harus `O` (trigger menyala lagi). Halaman `/accounting/fsli/restricted-cash-non-current` harus menampilkan "Covered in …" dengan tanggal "Updated" yang sama seperti sebelum migrasi.
3. **Regenerasi tipe** setelah migrasi diterapkan, ganti seluruh file (jangan digabung):
   - lewat MCP: `generate_typescript_types` untuk `asypkbkiebjvvpimewfp` → timpa `src/integrations/supabase/types.ts` (`docs/RUNBOOK.md:112`), atau
   - lewat CLI: `npx supabase gen types typescript --project-id asypkbkiebjvvpimewfp > src/integrations/supabase/types.ts` (`docs/DB_READINESS.md:81`).
   - Lalu `git diff src/integrations/supabase/types.ts` (harus menambah `covered_by_slug` di `fsli_pages` Row/Insert/Update beserta relasi FK-nya; perbedaan lain berarti tipe sudah tertinggal dari skema sebelumnya), `npm run typecheck`, dan commit di PR susulan.
4. **Vercel:** tidak ada perubahan env untuk fase ini. Preview dibuat otomatis oleh PR; production ikut ter-deploy saat merge.

## Yang tidak terverifikasi

1. **Screenshot Preview Vercel dengan data production (R1.7):** butuh PR dan deployment Preview; ditambahkan orchestrator.
2. **Migrasi di production:** belum diterapkan (gate Dika). Hanya diuji di Postgres 16 lokal dengan skema minimal (tanpa RLS, policy, grant, dan baris production). Nama trigger `update_fsli_pages_updated_at` diambil dari `20260731020000_baseline_finance.sql:436`, tidak dicek ke production di fase ini.
3. **Essay production yang sebenarnya (13 essay FSLI):** struktur heading `content_json`-nya dan hasil TOC-nya tidak dicek ke database di sesi ini (database tidak dibaca di fase B). Yang terverifikasi hanya mock dan tes unit untuk bentuk TipTap JSON dan HTML lama.
4. **Keberadaan kolom `is_component` di production** (dasar header R1.5) diambil dari PRD §1.2.1 (diperiksa 10 Okt 2026), tidak diperiksa ulang di fase ini.
5. **`npm run test:e2e:world`** tidak dijalankan (fase ini tidak menyentuh path world; lihat di atas).

## Kandidat pembersihan

1. **Tabel `fsli_sections`** (0 baris berisi konten, tidak lagi dibaca situs setelah fase ini), beserta trigger, grant dan policy RLS-nya (`20260731020000_baseline_finance.sql:492-546`) dan entrinya di `types.ts`. Menghapusnya butuh keputusan dan migrasi terpisah dari Dika.
2. **Interface `FsliPage` tulisan tangan** di `src/hooks/queries/useFsliPages.ts`: setelah tipe diregenerasi, `is_component?` dan `covered_by_slug?` (dan komentar "not yet in the generated types") bisa diganti dengan tipe `fsli_pages` hasil generator.
3. **Id footnote per essay** (`fn-1`, `fnref-1` di `ArticleBody`) akan bentrok bila satu line item punya dua essay ber-footnote di satu halaman. Hari ini tidak ada line item dengan dua essay; dicatat, tidak dikerjakan.

## Text awaiting the owner

Tidak ada. Fase ini tidak menambah konstanta OWNER-REPLACEABLE. Satu-satunya kalimat baru yang dibaca pengunjung adalah "Covered in <judul essay>" (`src/components/fsli/FsliCoveredBy.tsx`), yang berasal dari keputusan D2(a) (PRD §1.3: kolom `fsli_pages.covered_by_slug` + kalimat "Covered in …") dan Bagian 3 Phase B langkah 3 ("shows one sentence "Covered in <essay title>""). Label `aria-label="On this page"` pada navigasi TOC memakai ulang heading "On this page" yang sudah ada.

## Tambahan orkestrator: screenshot dengan data production (build lokal, baca saja)

Vercel Preview untuk branch ini ada di balik Vercel Authentication (SSO), dan konektor Vercel sesi ini tidak punya akses ke project `dikagustiana-com` (laporan fase 0 §6.6). Sebagai gantinya, orkestrator membangun branch ini secara lokal sebagai build production (`npx vite build`, semua flag world/FIA tidak diset kecuali disebut), dengan `VITE_SUPABASE_URL` production (`asypkbkiebjvvpimewfp`) dan kunci anon publik. Browser Playwright hanya bicara dengan `vite preview` lokal; setiap request ke `*.supabase.co` diteruskan lewat Node, dan **hanya GET/HEAD** yang diteruskan (selain itu dibatalkan), jadi production hanya dibaca. Kode yang dibangun sama dengan HEAD PR: `git diff <commit build>..HEAD -- src public scripts supabase tests` kosong. Build dari `0cd5dec`.

| Path | Isi | Hasil yang diperiksa di halaman (dari `page.evaluate`) |
|---|---|---|
| `screenshots/b/production-data/cash-and-cash-equivalents-1440-production-data.png` | 1440 px: header line item, kartu angka, lalu judul essay sebagai h2, lede, awal body; TOC "On this page" dari heading essay | h2 pertama = judul essay; tidak ada "Not written yet"; tidak ada "Related Essays"; 2 request Supabase, semuanya 200 |
| `screenshots/b/production-data/cash-and-cash-equivalents-390-production-data.png`, `…-390-production-data-essay.png` | 390 px: bagian atas, lalu awal body essay | sama |
| `screenshots/b/production-data/trade-receivables-net-1440-production-data.png` | 1440 px, sama seperti di atas untuk `trade-receivables-net` | h2 pertama = judul essay; tanpa "Not written yet" dan "Related Essays" |
| `screenshots/b/production-data/trade-receivables-net-390-production-data.png`, `…-390-production-data-essay.png` | 390 px | sama |
| `screenshots/b/production-data/restricted-cash-non-current-1440-production-data.png`, `…-390-…` | Halaman tanpa essay: header dan kartu angka saja | Tidak ada kalimat "Covered in …" **karena migrasi `20261010100000_fsli_covered_by.sql` belum diterapkan**: kolom tidak ada, halaman membacanya sebagai null (pola 42703), tanpa error. Kalimat itu muncul setelah Dika menerapkan migrasi. |
