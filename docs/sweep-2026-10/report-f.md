# Laporan fase F — Section 06 on the Finance landing, live path ready

Branch `sweep/f-fia`, dari `origin/main` @ `0487609` (PRD R5, konteks §1.2.5, Bagian 3 "Phase F", keputusan
D12(a)). Semua commit lokal; push dan PR dikerjakan orkestrator.

- SHA awal: `048760967c60be64095df084eee9c9b49bff75d4` (`origin/main`, "Merge pull request #58 from
  dikagustiana/world-v2/e-quality").
- SHA akhir: lihat commit terakhir di PR (commit laporan ini mengubahnya, jadi tidak bisa ditulis di sini).

## Commit

`git log --reverse --format='%h %s' 0487609..HEAD`, urut dari yang pertama:

1. `69d8081` Add finance_sections row 06 for Finance in Action
2. `e540c67` Describe the Finance landing's six numbered cards truthfully
3. `6f5bcf6` Test section 06 on the Finance landing and pin its route order
4. `a1d30c6` Add phase F screenshots: section 06 card and the live index
5. `95f80a9` Say the live flag goes on in production now, per D12(a)
6. `1d79519` Tell the owner to apply section 06 after the live flag deploy
7. `44a7168` Tell the Finance in Action page from a track index in the 06 test
8. `bf35706` Draw the 06 test's sixth row from the migration file itself
9. `ae6c319` Record phase F's section 06 and D12(a) decisions in DECISIONS.md
10. `bd4e59f` Raise the unit test floor to 1155 for the phase F review fixes
11. `6699f89` Complete phase F's DECISIONS entry with R5.2, R5.4 and R5.5
12. (commit laporan ini) Add the phase F report

Commit 5–10 adalah perbaikan dari dua review independen atas implementasi (1–4); alasan tiap perbaikan ada di
badan pesan commit-nya.

## 1. Yang dibangun, per kriteria penerimaan

| Kriteria | Di mana / bagaimana | Bukti (tes) |
|---|---|---|
| **R5.1** migrasi baris 06 | `supabase/migrations/20261010110000_finance_section_06.sql:34-38`: `INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES ('finance-in-action', 'Finance in Action', '<COPY.seoDescription>', 'Table', 6) ON CONFLICT (slug) DO NOTHING;`. Deskripsi = `COPY.seoDescription` (`src/lib/finance-in-action/copy.ts:15`), ditandai OWNER-REPLACEABLE di header migrasi (`:21-26`). Header juga menulis "NOT APPLIED TO PRODUCTION; owner applies via apply_migration" dan urutan penerapan (setelah deploy flag, `:9-14`). `ON CONFLICT (slug)` sah karena `slug text NOT NULL UNIQUE` (`20260731020000_baseline_finance.sql:65`). | `tests/unit/financeLandingSection06.test.tsx:118` "is finance-in-action, titled Finance in Action, sort_order 6, described by COPY.seoDescription": tes mem-parse tuple `VALUES` dari file migrasi itu sendiri, jadi salah ketik slug, sort_order, atau deskripsi yang menyimpang dari `copy.ts` menggagalkan suite. |
| **R5.1** kartu 06 menautkan ke `/finance/finance-in-action`, route eksplisit lebih dulu | `FinanceLanding.tsx:118` menautkan setiap baris ke `sectionHref(slug)` = `/finance/<slug>` (`:29-31`, tidak diubah). `App.tsx:172-173` mendeklarasikan `/finance/finance-in-action` dan `/:modelSlug` sebelum `/finance/:track` (`:176`) dan `/finance/:track/:slug` (`:180`); tidak ada perubahan di `App.tsx`. | `financeLandingSection06.test.tsx:130` (enam kartu urut sort_order, bernomor 01–06), `:137` (kartu 06 bernomor 06, `href` = `/finance/finance-in-action`, deskripsinya), `:145` (klik kartu membuka halaman Finance in Action, bukan track index: baris "models available" ada, catatan kurikulum tidak), `:160` (kontrol: track index di alamat yang sama memang menggambar h1 yang sama, jadi h1 saja tidak cukup), `:184` (urutan deklarasi di `App.tsx`), `:190` (route yang menang di `matchRoutes` untuk `/finance/finance-in-action` dan `/finance/finance-in-action/ptba`). |
| **R5.1** komentar header `FinanceLanding.tsx` | `FinanceLanding.tsx:6-8` kini "One numbered card per finance_sections row, in sort_order: the four curriculum tracks (01-04), capital-allocation (05) and finance-in-action (06, …)", menggantikan "Four equal domain entry points". Komentar `sectionHref` (`:24-28`) menjelaskan kenapa `/finance/<slug>` membuka halaman sendiri untuk dua slug itu. | Komentar saja; perilaku dibuktikan tes di baris atas. |
| **R5.2** live path terhadap production, baca saja | Dijalankan di fase 0 (10 Okt 2026), `docs/sweep-2026-10/report-0.md` §2: `curl …/rest/v1/model_packages?select=package` dengan `Accept-Profile: fsre_published` dan kunci anon → `HTTP/2 200`, body `[]`; `scripts/world/check-published.ts` → `check-published: HTTP 200, 0 package(s)`. Bukan `PGRST106`, jadi langkah 2 Bagian 3 tidak memblokir. Tidak dijalankan ulang di fase ini (§7). | Output asli di `report-0.md` §2. |
| **R5.3** D12(a): `VITE_FIA_LIVE=true` di Production | Langkah Vercel untuk Dika di §6. Komentar yang masih menyebut aturan lama O3 diperbarui: `src/lib/finance-in-action/flag.ts:10-18`, `.env.example:14-20`; catatan "O3 DIGANTI" di `docs/company-models/report-fsre-publish-path.md:6` dan `:92`. Build lokal dengan `VITE_FIA_LIVE=true` lulus `assert-no-synthetic` (§2). Verifikasi production setelah redeploy menunggu langkah Dika. | `tests/unit/fiaLive.test.tsx:128` "draws the slate as planned with nothing published, and nothing synthetic anywhere" (tanpa banner, tanpa `role=status`); screenshot `fia-live-nothing-published-*.png` dari build `VITE_FIA_LIVE=true` (§3). |
| **R5.4** paket PTBA nyata | Belum bisa: `fsre_published.model_packages` 0 baris (fase 0). Menunggu Dika approve di 4F (§6). Tidak ada perubahan kontrak situs, tidak ada tulisan ke schema `fsre*`. | — |
| **R5.5** sub-industri slate | `src/data/finance-in-action/sub-industries.json` memuat `A121` dan `B121`; slate (`fixtures/slate.json`) hanya PTBA, ITMG (A121), INTP, SMGR (B121). Tidak ada yang ditambah. | `tests/unit/fiaContract.test.ts:313-324` ("the slate"): empat ticker itu, dan setiap `subIndustry` slate ada di `sub-industries.json`. |
| **R5.6** tes unit kartu 06 (mock 6 baris), smoke e2e tetap hijau, tanpa angka emiten | 7 tes di `financeLandingSection06.test.tsx` (mock 6 baris; baris ke-6 dari file migrasi). Smoke route `tests/e2e/smoke.spec.ts:22` (`/finance/finance-in-action`) lulus. | `smoke.spec.ts:56:3 › renders Finance in action (/finance/finance-in-action)` ✓ (§2); `assert-no-synthetic` dan grep ticker kosong (§2). |
| **R5.7** legacy tidak dihapus | `FinanceInActionIndex.tsx`, `FinanceModelDetail.tsx`, `ModelAdminPanel.tsx`, `useFinanceModels.ts`, bucket `finance-models` tidak disentuh; dicatat di §8. | — |
| Lantai tes | `scripts/assert-test-count.mjs`: `MIN_TESTS` 1148 → 1153 (`6f5bcf6`, aktual 1157) → 1155 (`bd4e59f`, aktual 1159), klausa baru di depan komentar sesuai gaya file. | `assert-test-count: ok` (§2). |
| `docs/DECISIONS.md` | Satu entri di puncak: "# 2026-10-10 — Finance in Action is card 06 on /finance, and goes live now (site sweep, phase F)" (`ae6c319`, dilengkapi `6699f89`): baris 06, D12(a), O3 yang di-supersede (di `report-fsre-publish-path.md:4` dan `:87` pada `0487609`), urutan flag-lalu-migrasi, kenapa production tanpa paket tidak menampilkan `PublishedNote`, R5.2, R5.4, R5.5, R5.7, dan bahwa tidak ada entri di file itu yang di-supersede. | — |

## 2. Output verifikasi (asli)

Lint, typecheck, `check:world`, unit, dan e2e dijalankan di `/home/user/wt/f` pada HEAD `bd4e59f`; build dan grep
ticker dijalankan setelah entri DECISIONS dilengkapi (`6699f89`, hanya dokumen). Kode identik dengan commit
laporan ini. Node v22.22.0.

```
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)

exit=0
```

Baseline 22 peringatan; tidak bertambah.

```
$ npm run typecheck

> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force

exit=0
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
exit=0
```

```
$ TZ=America/Chicago npx vitest run --reporter=dot --reporter=json --outputFile=…/work-f/vitest.json
 Test Files  86 passed (86)
      Tests  1159 passed (1159)
   Start at  03:49:36
   Duration  122.70s (transform 6.51s, setup 18.41s, collect 23.82s, tests 243.70s, environment 45.75s, prepare 8.54s)

JSON report written to …/work-f/vitest.json
exit=0

$ node scripts/assert-test-count.mjs …/work-f/vitest.json
assert-test-count: 1159 tests, 0 failed, 0 failed suite(s) (floor 1155)
assert-test-count: ok
exit=0
```

```
$ npx vitest run tests/unit/financeLandingSection06.test.tsx tests/unit/fiaLive.test.tsx tests/unit/fiaContract.test.ts
 Test Files  3 passed (3)
      Tests  80 passed (80)
```

```
$ CI=1 flock /tmp/claude-0/e2e.lock npx playwright test
  ✓  46 [chromium] › tests/e2e/smoke.spec.ts:56:3 › renders Finance in action (/finance/finance-in-action) (931ms)
  …
  ✓  74 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1348px with a 24px root font (1.1s)
  ✓  75 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1440px with a 24px root font (1.1s)

  75 passed (56.0s)
exit=0
```

`test:e2e:world` tidak dijalankan: fase F tidak menyentuh `src/world`, `src/components/world`, `src/lib/world`, atau
`scripts/world`.

Build dengan konfigurasi CI (flag mati):

```
$ flock /tmp/claude-0/e2e.lock sh -c 'VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'
✓ built in 11.56s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
exit=0
```

Build dengan konfigurasi Production menurut D12(a) (`VITE_FIA_LIVE=true`, `VITE_FIA_PREVIEW` tidak diset):

```
$ flock /tmp/claude-0/e2e.lock sh -c 'VITE_FIA_LIVE=true VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && VITE_FIA_LIVE=true node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'
✓ built in 17.87s
assert-no-synthetic: live build; none of 11 fixture values and no preview page chunk in dist/.
assert-world-flag: no world code in dist/ (flag off).
exit=0
```

Baris `assert-no-synthetic: live build; …` inilah yang harus muncul di log build Vercel Production (§6).

Grep angka ticker (harus kosong):

```
$ git grep -nE "\b(PTBA|ITMG|INTP|SMGR)\b" -- src public tests scripts supabase | grep -E "[0-9]{1,3}([.,][0-9]{3})+" ; echo "exit=$?"
exit=1
```

Tidak ada baris yang cocok (exit 1 dari `grep` berarti tidak ada match). Fase F tidak menambah angka emiten maupun
data SAMB.

## 3. Screenshot

Semua diambil dari bundle production (Playwright terhadap `vite build` + preview) dengan Supabase mock
(`tests/e2e/mockSupabase`) dan spec sementara `tests/e2e/zz-shots-f.spec.ts` yang sudah dihapus sebelum commit. Dua
screenshot `/finance` memakai build konfigurasi Playwright biasa (flag mati); empat screenshot
`/finance/finance-in-action` memakai build terpisah dengan `VITE_FIA_LIVE=true` yang dilayani di port lain. Seed
`finance_sections` berisi lima judul dan deskripsi dari migrasi seed plus baris 06 dari migrasi fase ini; tidak ada
angka. Nav masih memuat "About" karena branch ini berangkat dari `0487609` (penghapusan About ada di fase C).
Screenshot Vercel Preview ditambahkan oleh orkestrator setelah PR ada.

| File | Isi | Sumber |
|---|---|---|
| `docs/sweep-2026-10/screenshots/f/finance-landing-six-sections-1440.png` | `/finance` dengan enam kartu 01–06; kartu 06 "Finance in Action" dengan deskripsi `COPY.seoDescription`, menautkan ke `/finance/finance-in-action`. Keadaan **setelah migrasi diterapkan** (production kini masih 5 kartu) | mock Playwright |
| `docs/sweep-2026-10/screenshots/f/finance-landing-six-sections-390.png` | Sama, lebar 390 | mock Playwright |
| `docs/sweep-2026-10/screenshots/f/fia-live-nothing-published-1440.png` | `/finance/finance-in-action` dari build `VITE_FIA_LIVE=true`, baca `model_packages` dijawab `200 []`: "Section 06", h1, slate PTBA/ITMG/INTP/SMGR "Planned; no model yet.", tanpa banner SYNTHETIC, tanpa `PublishedNote`. **Ini yang akan tampil di production** setelah redeploy D12(a) | mock Playwright |
| `docs/sweep-2026-10/screenshots/f/fia-live-nothing-published-390.png` | Sama, lebar 390 | mock Playwright |
| `docs/sweep-2026-10/screenshots/f/fia-live-published-note-not-available-1440.png` | Halaman yang sama dengan baca yang gagal (mock `404` + `PGRST106`): `PublishedNote` "The published models are not available yet, so the companies below are listed as planned." di atas slate. **Bukan** keadaan production hari ini; hanya menunjukkan jalur kegagalan | mock Playwright |
| `docs/sweep-2026-10/screenshots/f/fia-live-published-note-not-available-390.png` | Sama, lebar 390 | mock Playwright |

Keenam PNG sudah saya buka satu per satu dan isinya sesuai keterangan di atas.

## 4. Keputusan yang saya ambil sendiri

- **Deskripsi kartu 06 memakai kalimat yang sudah ada di repo**, `COPY.seoDescription` (`copy.ts:15`), bukan kalimat
  baru, sesuai PRD R5.1 ("deskripsi dari copy.ts, OWNER-REPLACEABLE"). Dika bisa menggantinya di tempat lewat Finance
  Workspace (`/finance-workspace`, "Section Metadata") tanpa migrasi baru.
- **Urutan penerapan dibalik untuk fase ini: deploy flag dulu, baru migrasi** (atau dalam satu sesi). Kartu 06 muncul
  begitu barisnya ada, tanpa deploy; pada build tanpa flag kartu itu membuka halaman legacy "0 of 0 models
  available" yang ditolak D12. Ditulis di header migrasi (`:9-14`), di `DECISIONS.md`, dan di §6.
- **SQL migrasi mengikuti PRD R5.1 apa adanya** (`on conflict (slug) do nothing`), tanpa blok `DO $assert$` seperti
  migrasi fase D: kedua hasilnya (baris baru, atau baris yang sudah ada) sama-sama benar, jadi tidak ada keadaan gagal
  yang perlu ditangkap.
- **`sectionHref` dan `App.tsx` tidak diubah.** Tautan `/finance/finance-in-action` dari kartu sudah benar karena
  route eksplisit dideklarasikan lebih dulu dan React Router meranking segmen statis di atas segmen dinamis apa pun
  urutannya. Karena itu tes mengunci keduanya: urutan deklarasi yang diminta PRD dan route yang menang.
- **Tes membedakan halaman Finance in Action dari track index dengan lebih dari h1**, karena `/finance/:track` membaca
  baris 06 berdasarkan slug dan menggambar h1 yang sama ("Finance in Action"). Mock Supabase di tes itu dibuat
  menghormati `.eq()` (sebelumnya selalu menjawab baris pertama, sehingga tes lolos karena kebetulan). Tes kontrol
  membuktikan kesamaan h1 itu nyata. Dengan route eksplisit dihapus dari `App.tsx`, tes gagal (dicoba saat review,
  `44a7168`).
- **Baris ke-6 tes diambil dari file migrasi**, bukan ditulis ulang di tes, supaya yang dites adalah yang akan
  diterapkan Dika (`bf35706`).
- **`PublishedNote` tidak diubah untuk baca kosong yang sukses.** Lihat §5.1.
- **Komentar yang menyebut O3 diperbarui, bukan dihapus riwayatnya**: `flag.ts`, `.env.example`, dan dua catatan di
  `report-fsre-publish-path.md` (laporan lama tetap utuh, hanya diberi catatan "O3 DIGANTI 2026-10-10").
- **Pemeriksaan live path (R5.2) tidak diulang di fase ini.** Fase 0 menjalankannya pada hari yang sama dengan hasil
  `200 []`; sesi fase F diperintahkan tidak menyentuh Supabase production. Pemeriksaan ulang dilakukan setelah
  redeploy Dika (§6, §7).
- **Entri DECISIONS tidak menandai apa pun "superseded" di dalam `DECISIONS.md`.** O3 bukan entri di file itu; ia
  dicatat di `report-fsre-publish-path.md`, dan di sanalah catatannya. Bagian "Numbering was rejected, deliberately"
  (entri 2026-08-03, baris 1357 pada `0487609`) disebut di entri baru sebagai tidak di-supersede: keputusannya tentang
  homepage, dan "06" adalah nama section itu sendiri (`COPY.section`).
- **Screenshot tambahan** di luar yang diminta: jalur kegagalan `PublishedNote` (mock `PGRST106`), supaya Dika
  melihat bagaimana halaman production bicara kalau schema suatu hari tidak ter-expose. Diberi label jelas bahwa itu
  bukan keadaan production.

## 5. Pertentangan PRD/prompt/repo

1. **R5.3 mengharapkan production menampilkan "slate dan `PublishedNote`".** Dengan jawaban production hari ini
   (`200 []`), `PublishedNote` tidak tampil: komponen itu hanya bicara saat baca gagal (`not-available`, `refused`,
   `failed`; `PublishedNote.tsx:11`, FSRE publish path G8), dan `fiaLive.test.tsx:128` mengunci bahwa baca kosong yang
   sukses tidak menggambar catatan status. Kode dipertahankan: baca kosong bukan kegagalan, dan kalimat untuk keadaan
   itu akan menjadi copy baru atas nama Dika. Verifikasi production yang benar: slate tampil, tidak ada `SYNTHETIC`,
   tidak ada elemen `[data-published-failure]`. Kalau Dika ingin satu kalimat untuk "belum ada paket terbit", itu
   teks baru yang harus Dika tulis.
2. **Urutan PRD §2.3** (langkah 3 migrasi, langkah 4 env Vercel) terbalik dari urutan yang aman untuk fase F (lihat
   §4). Bagian 1 tidak menetapkan urutan; urutan aman dipakai dan dicatat.
3. **PRD §1.2.5 masih mengutip O3** ("`VITE_FIA_LIVE=true` di production dinyalakan Dika setelah paket pertama
   di-approve"), sedangkan D12(a) memutuskan "sekarang". D12(a) adalah keputusan owner yang lebih baru dan menang;
   O3 ditandai diganti di `report-fsre-publish-path.md`.
4. **Prompt orkestrator vs Bagian 3 langkah 2.** Bagian 3 meminta pemeriksaan live path di fase F; prompt fase ini
   menyatakan Supabase production tidak diperlukan. Diselesaikan dengan bukti fase 0 (hari yang sama, `200 []`) dan
   pemeriksaan ulang setelah redeploy.
5. **Screenshot Vercel Preview** (cara kerja #4: fase F juga di Preview dengan data production): Preview berada di
   balik SSO (HANDOFF fase 0) dan PR belum ada; ditambahkan orkestrator setelah PR dibuat.
6. **`docs/sweep-2026-10/DECISIONS.md` dan `report-0.md` dirujuk tetapi belum ada di branch ini**; keduanya dibuat di
   `sweep/0-bootstrap`, sedangkan branch ini berangkat dari `0487609`. Rujukannya benar setelah PR fase 0 merge.
7. **CI tidak menjalankan e2e** (dicatat di laporan fase 0 §6.1). e2e dijalankan lokal; output di §2.

## 6. Yang menunggu Dika

Urutan penting: **langkah 2–4 sebelum langkah 5.**

| # | Apa | Langkah persis |
|---|---|---|
| 1 | Review dan merge PR fase F | Periksa PR (screenshot Preview ditambahkan orkestrator), lalu merge ke `main`. |
| 2 | `VITE_FIA_LIVE=true` di Vercel Production (D12(a)) | Vercel → project `dikagustiana-com` → Settings → Environment Variables → Add New: Key `VITE_FIA_LIVE`, Value `true`, Environments: **Production saja** (jangan centang Preview: Preview memakai `VITE_FIA_PREVIEW=true`, dan dua flag bersamaan menggagalkan build). Pastikan **tidak ada** `VITE_FIA_PREVIEW` untuk Production; kalau ada, hapus untuk Production. Lewat CLI setara: `vercel env add VITE_FIA_LIVE production` (isi `true`), lalu `vercel env ls production` dan pastikan `VITE_FIA_PREVIEW` tidak tercantum. |
| 3 | Redeploy Production | Flag dibaca saat build, jadi perlu build baru: Vercel → Deployments → deployment Production teratas (setelah merge langkah 1) → ⋯ → Redeploy. Di log build, pastikan ada baris persis `assert-no-synthetic: live build; none of 11 fixture values and no preview page chunk in dist/.` dan `assert-world-flag: no world code in dist/ (flag off).`; tempel kedua baris di PR. |
| 4 | Cek production | Buka `https://www.dikagustiana.com/finance/finance-in-action`: eyebrow "Section 06", h1 "The chain, read one company at a time", PTBA, ITMG, INTP, SMGR masing-masing "Planned; no model yet.", tidak ada kata `SYNTHETIC`, tidak ada kotak status di atas judul. Lalu beri tahu sesi berikutnya supaya saya memverifikasi dan menempel hasilnya (R5.3). |
| 5 | Terapkan migrasi baris 06 | **Setelah langkah 4** (atau dalam sesi yang sama dengan redeploy): Supabase `apply_migration` pada project `asypkbkiebjvvpimewfp`, `name: "finance_section_06"`, `query`: isi lengkap `supabase/migrations/20261010110000_finance_section_06.sql`. Sesuai README "Database & migrations": jangan `supabase db push` atau perintah CLI migrasi lain. Cek: `select slug, title, sort_order from public.finance_sections order by sort_order;` harus 6 baris, terakhir `finance-in-action · Finance in Action · 6`. Lalu `/finance` menampilkan kartu 06 yang membuka halaman langkah 4. |
| 6 | Regenerasi types | **Tidak perlu**: migrasi hanya menambah data, bukan skema. Kalau tetap ingin, ikuti `docs/RUNBOOK.md` §4 (`generate_typescript_types` → `src/integrations/supabase/types.ts`, REPLACE); diff-nya harus kosong. |
| 7 | Deskripsi kartu 06 (opsional) | Kalau ingin kalimat sendiri: setelah langkah 5, `/finance-workspace` → Section Metadata → Finance in Action → ubah deskripsi. Default di "Text awaiting the owner". |
| 8 | Approve paket PTBA pertama di Personal OS 4F (R5.4) | Setelah approve, beri tahu sesi berikutnya. Saya membaca `model_packages` sebagai anon (baca saja), memvalidasi terhadap `src/lib/finance-in-action/contract/model-package.schema.json`, membuka `/finance/finance-in-action/ptba` di Preview, dan mengambil screenshot. Kalau `live.ts` menolak paketnya, saya menulis `docs/company-models/contract-diff-2026-10.md` untuk `fsre-skills` (P-2); kontrak situs tidak diubah. |
| 9 | Rollback (bila perlu) | Flag: Vercel → Settings → Environment Variables → hapus `VITE_FIA_LIVE` (Production) → Redeploy; halaman kembali ke legacy. Kalau migrasi sudah diterapkan, kartu 06 lalu membuka halaman legacy "0 of 0 models available", jadi hapus juga barisnya: `delete from public.finance_sections where slug = 'finance-in-action';` (data, bukan skema; lewat SQL editor atau `execute_sql`). |

## 7. Yang tidak terverifikasi

- **Live path tidak dijalankan ulang di fase F.** Bukti `200 []` berasal dari fase 0 (10 Okt 2026); sesi ini tidak
  membaca Supabase production. Akan dicek lagi setelah redeploy langkah 3.
- **Production dengan `VITE_FIA_LIVE=true` belum ada**: langkah 2–4 milik Dika. Status env Vercel tidak bisa dibaca
  dari sesi ini (fase 0 §6.6: API Vercel menolak, 403/404), jadi saya tidak tahu apakah `VITE_FIA_PREVIEW` saat ini
  diset untuk Production.
- **Migrasi belum pernah dijalankan** terhadap database mana pun (tidak ada Supabase lokal; production read-only).
  Validitas `ON CONFLICT (slug)` dibuktikan dari definisi tabel di file migrasi baseline, bukan dari database.
- **Kartu 06 dengan data production** belum terlihat: production tetap 5 kartu sampai migrasi diterapkan; screenshot
  `/finance` memakai seed yang meniru hasil migrasi.
- **R5.4** tidak bisa diuji: belum ada paket terbit (0 baris). Kecocokan bentuk paket FSRE (`fsre-workbook`) dengan
  kontrak situs `proposal-v3.1` belum diketahui.
- **Suite e2e default membangun bundle dengan flag mati**, jadi halaman live hanya dibuktikan oleh tes unit
  (`fiaLive.test.tsx`, mock) dan oleh screenshot dari build `VITE_FIA_LIVE=true`; tidak ada spec e2e permanen untuk
  build live.
- **Screenshot Vercel Preview** belum ada; ditambahkan orkestrator setelah PR dibuat.

## 8. Kandidat pembersihan

- **Halaman dan aset legacy Finance in Action** (PRD R5.7, tidak dihapus di sweep ini, menunggu keputusan terpisah):
  `src/pages/FinanceInActionIndex.tsx`, `src/pages/FinanceModelDetail.tsx`,
  `src/components/finance-in-action/ModelAdminPanel.tsx`, `src/hooks/queries/useFinanceModels.ts`, bucket storage
  `finance-models`, tabel `finance_models` (0 baris di production menurut PRD §1.2.5). Setelah D12(a) berjalan di
  Production, cabang "kedua flag mati" di `App.tsx:80-93` hanya dipakai build tanpa flag (tes unit, lokal, Preview
  tanpa flag).
- **Konflik merge `MIN_TESTS`** (`scripts/assert-test-count.mjs`): fase A–E juga menaikkannya dari 1148. Yang merge
  belakangan menghitung ulang (aktual − 4) dan menggabungkan klausa komentarnya.
- **Konflik merge `docs/DECISIONS.md`**: fase lain juga menyisipkan entri 2026-10-10 di puncak file. Pertahankan semua
  entri. Nomor baris yang dirujuk entri fase F mengacu ke `0487609` (1337, 1357; `report-fsre-publish-path.md:4`,
  `:87`), jadi tidak bergeser.
- **Mock baris 05 di `financeLandingSection06.test.tsx:75`** masih berjudul "Capital Allocation". Setelah migrasi fase D
  (`20261010120000_capital_in_motion_title.sql`) diterapkan, judul production menjadi "Capital in Motion"; tes tetap
  benar (mock-nya mandiri) tetapi bisa diselaraskan saat fase D dan F sama-sama merge.
- **Komentar baseline `20260731020000_baseline_finance.sql:3,55`** masih menyebut `finance_sections` sebagai "the 4
  tracks"; file migrasi yang sudah diterapkan, jadi dibiarkan.

## Text awaiting the owner

| File:baris | Teks default | Catatan |
|---|---|---|
| `supabase/migrations/20261010110000_finance_section_06.sql:36` (penanda OWNER-REPLACEABLE di `:21-26`) | "Company models of IDX-listed companies, rebuilt from their own filings and ordered along the industry chain." | Deskripsi kartu 06 di `/finance` (`finance_sections.description`). Bukan kalimat baru: sama dengan `COPY.seoDescription` (`src/lib/finance-in-action/copy.ts:15`), dipakai sesuai PRD R5.1. Bisa diganti di Finance Workspace setelah migrasi (§6 langkah 7). |

Fase ini tidak menambah kalimat baru lain yang dibaca pengunjung. Dua teks OWNER-REPLACEABLE yang **sudah ada** di
repo sebelum fase ini akan **pertama kali tampil di production** begitu D12(a) dijalankan, jadi saya ingatkan di sini:

| File:baris | Teks default | Catatan |
|---|---|---|
| `src/lib/finance-in-action/copy.ts:9-10` | "The chain, read one company at a time" | h1 halaman Finance in Action; "draft H1 from brief §5.1". |
| `src/lib/finance-in-action/copy.ts:11-13` | "Each model rebuilds a listed company's operation from its own filings: volumes, capacity, cost per unit. Two companies per sub-industry, ordered along the chain from extraction to end users, so a weak link can be compared with its neighbours rather than guessed at." | Subjudul halaman yang sama; "draft subhead from brief §5.1". |
