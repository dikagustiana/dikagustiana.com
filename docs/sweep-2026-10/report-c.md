# Laporan fase C — Home: Glimpse holds every essay, About removed

- **Branch:** `sweep/c-home` (draft PR; Dika yang merge).
- **Base:** `main` @ `0487609` ("Merge pull request #58 from dikagustiana/world-v2/e-quality").
- **SHA awal:** `048760967c60be64095df084eee9c9b49bff75d4`
- **SHA akhir:** lihat commit terakhir di PR (commit laporan ini sendiri mengubah SHA akhir).
- **Cakupan:** PRD R2 (Glimpse memuat semua essay terbit) dan R8 (About dihapus); keputusan owner D3(a), D4(a), D5(a) (PRD §1.3, disalin ke `docs/sweep-2026-10/DECISIONS.md` di fase 0).
- **Migrasi / env:** tidak ada. Fase ini tidak butuh `apply_migration`, tidak menyentuh Vercel, dan tidak meregenerasi `types.ts`.

## Daftar commit (`git log --reverse --oneline 0487609..HEAD`)

- `555ba86` Fill the homepage glimpse with every published essay
- `6919dd1` Carry the argument and Changed my mind on Home, under the glimpse
- `7f3bd38` Point links into the chain map at the homepage
- `34ddb33` Remove About from the navigation and the footer
- `e849205` Delete the About page; /about forwards to the homepage
- `34ffb42` Hold the glimpse e2e to 3 starred and 18 other published essays
- `3c9a15b` Record the homepage and the /about redirect in the route docs
- `0aed2ba` Raise MIN_TESTS to 1160 for the homepage suites
- `8d7759e` Add phase C stills: Home at 1440 and 390 with the new glimpse
- `e7ee60e` Make the homepage's fragment jump arrival-only and throw-free
- `64e0640` Drop the compact reading path's pointer to the full form
- `973b835` Say what chainMapHref's address actually opens on the homepage
- `1f7a3ff` Raise MIN_TESTS to 1162 for the fragment-jump tests
- `c49c859` Record the glimpse fill rule and About's removal in DECISIONS
- (commit laporan ini)

## Yang dibangun per kriteria terima

### R2 — Glimpse memuat semua essay terbit

| Kriteria | Di mana / bagaimana | Tes yang membuktikan |
|---|---|---|
| R2.1 dua query dalam satu hook, gabung, potong `limit`, fallback 42703, nama hook tetap, komentar header diperbarui | `src/hooks/queries/useSelectedEssays.ts`. Read 1 = `is_selected = true and published = true`, urut `selected_rank asc nulls last, created_at desc`. Read 2 = `is_selected = false and published = true`, urut `created_at desc`. Keduanya `.limit(limit)` dan jalan paralel (`Promise.all`). Hasilnya digabung (1) lalu (2); essay yang kembali dari kedua read tampil sekali; lalu `.slice(0, limit)`. Fallback 42703 hanya di read 1, satu-satunya yang menyebut rank. Header komentar ditulis ulang. Pemanggil tidak berubah (`Index.tsx`: `useSelectedEssays(GLIMPSE_LIMIT)`, `GLIMPSE_LIMIT = 30`). | `tests/unit/selectedOrder.test.tsx` › "the homepage order", dijalankan terhadap tabel essays yang diemulasi (`tests/unit/helpers/essaysTable.ts`): dua query; bintang urut rank, bintang tanpa rank sesudahnya, lalu sisanya newest first; tanpa bintang; batas 30 tanpa memotong yang berbintang; fallback 42703; essay dari dua read tampil sekali; error lain tidak memicu fallback |
| R2.2 `useFeaturedFinanceEssay` tidak berubah | `src/hooks/queries/useFinance.ts` tidak disentuh (`git diff --stat 0487609..HEAD -- src/hooks/queries/useFinance.ts` kosong) | `selectedOrder.test.tsx` › "places the Finance landing's featured essay by the same order" |
| R2.3 entri DECISIONS 2026-10-10 | `docs/DECISIONS.md` "# 2026-10-10 — The glimpse holds every published essay; the star decides who leads" (21 terbit, 3 berbintang, D3(a)). Tiga paragraf entri 2026-10-09 (baris 28, 44–45, 49–52 di `0487609`) ditandai superseded di tempat | — (dokumen) |
| R2.4 tes unit dan e2e diperluas | `tests/unit/glimpse.test.tsx` › "the homepage row": baris diisi query Home sendiri, 3 berbintang lalu 18 newest first; section absen bila tidak ada yang terbit. `tests/e2e/glimpse.spec.ts` men-seed 3 berbintang, 18 tidak, dan 1 draft berbintang, dalam urutan yang bukan urutan owner maupun recency; mock menjawab seperti PostgREST (filter/order/limit) | `selectedOrder.test.tsx`, `glimpse.test.tsx`, `glimpse.spec.ts` (urutan 21 judul tanpa draft; 1440 tombol/panah; 390 swipe tanpa scroll samping; reduced motion) |
| R2.5 screenshot Home ≥ 21 kartu dari Preview (data production) | Screenshot mock (3 + 18) ada di tabel di bawah. Screenshot Preview ditambahkan orchestrator setelah PR ada | — (lihat "Yang tidak terverifikasi") |

### R8 — About dihapus

| Kriteria | Di mana / bagaimana | Tes yang membuktikan |
|---|---|---|
| R8.1 `About.tsx` dihapus; `/about` → `/`; 301 bila `vercel.json` mengelola redirect | `src/pages/About.tsx` dan lazy import-nya dihapus. Route `/about` → `AboutRedirect` (`<Navigate to={{ pathname: '/', search, hash }} replace />`). `vercel.json` hanya punya `rewrites` dan `headers`, tanpa `redirects`, jadi redirect cukup client-side tanpa 301. `/about` tidak ada di sitemap, dan `scripts/prerender.mjs` hanya menulis halaman essay | `tests/e2e/journeys.spec.ts` › "an old About link lands on the homepage, with the address and the fragment it carried"; `smoke.spec.ts` › "renders About (redirects to /) (/about)" |
| R8.2 About hilang dari `navConfig.ts`, `MainNav.tsx`, `MobileNav.tsx`, `Footer.tsx`; tautan `ReadingPath.tsx:462` diganti | Item About dihapus dari `navConfig.ts` (catatan Home kini menjelaskan ke mana argumen pindah), dari `MainNav.tsx`, dan dari daftar "Sections" di `Footer.tsx`. `MobileNav.tsx` membaca `navSections` dari `navConfig.ts`, jadi ikut berubah tanpa disunting. Di `ReadingPath.tsx`, penunjuk "...are on the About page." pada bentuk `compact` dihapus dan tidak diganti kalimat baru | `tests/unit/siteChrome.test.tsx` (header tanpa About; footer tanpa About); `navConfig.test.ts` › "has no About door..." |
| R8.3 `ReadingPath` + `ChangedMind` di bawah `Glimpse`, id sama, copy sama; `IndustryChainSection` tidak dipasang | `src/pages/Index.tsx`: `IndustryChainPreview` → `Glimpse` → `ReadingPath` (bentuk penuh, `#the-argument`) → `ChangedMind` (`#changed-my-mind`). Komponennya sama dengan di About. Ditambah `useFragmentOnArrival()` supaya tautan ke fragment benar-benar mendarat | `tests/unit/homePage.test.tsx` (6 kasus: urutan peta → glimpse → argumen → changed my mind; bentuk penuh; lompat setelah fetch selesai dan tidak bila pembaca sudah scroll; fragment yang bukan percent-encoding valid tanpa throw; lompat hanya saat tiba; argumen tetap ada tanpa essay terbit); `journeys.spec.ts` › "thirty seconds..." dan "three minutes..." |
| R8.4 `useSelectedEssays(8)` hilang; hook tetap | Pemanggil `useSelectedEssays(8)` hilang bersama `About.tsx`; hook tetap dipakai Home | `selectedOrder.test.tsx`, `glimpse.test.tsx` |
| R8.5 tes/skrip yang menyebut `/about` diperbarui; `MIN_TESTS` tidak turun | `smoke.spec.ts` (`/about` sebagai redirect; uji kapasitas header pindah ke `/`). `journeys.spec.ts`. `chain.spec.ts` (membuka peta Home sampai detail). Unit `chainPlate`, `chainColumn`, `chainMarks`, `ChainAudit` (`/about` → `/`). `fiaIndex` dan `fiaModelPage` (`chainMapHref` → `/?…`). `scripts/world/capture-frames.mjs` (landing saja). `MIN_TESTS`: 1148 → 1160 → 1162 (aktual 1166) | output vitest + assert di bawah |
| R8.6 entri DECISIONS; `:53`, `:71-79`, `:125-129` superseded; `ROUTE_VERIFICATION.md`, `INVENTORY.md` diperbarui | Entri "# 2026-10-10 — About is removed; the argument and Changed my mind move to the homepage". Catatan "*(Superseded 2026-10-10: ...)*" dipasang di ketiga tempat. `ROUTE_VERIFICATION.md`: baris `/about` kini redirect. `INVENTORY.md`: baris `/` dan `/about` diperbarui. `docs/response-2026-09-14-v5/linking-into-the-map.md` tidak lagi menawarkan `/about` | — (dokumen) |
| R8.7 SEO About hilang; tidak ada tautan internal lain ke `/about` | `SEO` About hilang bersama halamannya. Grep di bawah: sisanya hanya route redirect, tes redirect, dan dua URL eksternal di fixture | grep di bawah |

## Output verifikasi (asli)

Semua dijalankan dari `/home/user/wt/c`. Kode sama dengan `1f7a3ff`; commit DECISIONS dan laporan hanya mengubah dokumen. E2E dan build berjalan lewat `flock /tmp/claude-0/e2e.lock`.

**Lint**: `npx eslint . --max-warnings=35` (baseline 22, tidak bertambah)
```
/home/user/wt/c/src/pages/NotFound.tsx
  18:17  warning  Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components  react-refresh/only-export-components

✖ 22 problems (0 errors, 22 warnings)
lint exit=0
```

**Typecheck**: `npm run typecheck`
```
> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force

typecheck exit=0
```

**check:world**: `npm run check:world`
```
> node scripts/world/check-engine.mjs

40 files · 37 wired from the entry · 3 pending
pending (not wired from the entry): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts
wired files clean
load order ok
no Factory Yard code in src/
check:world exit=0
```

**Unit penuh**: `TZ=America/Chicago npx vitest run --reporter=dot --reporter=json --outputFile=.../work-c/vitest.json`, lalu `node scripts/assert-test-count.mjs .../work-c/vitest.json`
```
 Test Files  87 passed (87)
      Tests  1166 passed (1166)
   Start at  03:44:06
   Duration  108.26s (transform 5.32s, setup 15.13s, collect 19.56s, tests 223.04s, environment 38.06s, prepare 6.47s)

vitest exit=0
assert-test-count: 1166 tests, 0 failed, 0 failed suite(s) (floor 1162)
assert-test-count: ok
```

**E2E penuh**: `CI=1 flock /tmp/claude-0/e2e.lock npx playwright test`
```
Running 76 tests using 2 workers
...
  ✓  76 [chromium] › tests/e2e/smoke.spec.ts:97:7 › the header holds its navigation › no sideways scroll at 1440px with a 24px root font (788ms)

  76 passed (59.9s)
e2e exit=0
```

**World E2E**: `CI=1 flock /tmp/claude-0/e2e.lock npm run test:e2e:world`
```
Running 14 tests using 1 worker
...
  ✓  13 [chromium] › tests/e2e/world.spec.ts:346:1 › Skema swaps the world for the schematic in place, and back (8.1s)
  ✓  14 [chromium] › tests/e2e/world.spec.ts:359:3 › reduced motion › shows the schematic and one line, and never mounts the engine (5.5s)

  14 passed (4.1m)
world exit=0
```

**Build checks**: `flock /tmp/claude-0/e2e.lock sh -c 'VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'`
```
✓ built in 8.86s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
build exit=0
```

**Grep angka ticker**: `git grep -nE "\b(PTBA|ITMG|INTP|SMGR)\b" -- src public tests scripts supabase | grep -E "[0-9]{1,3}([.,][0-9]{3})+" ; echo "exit=$?"` (output kosong; exit=1 berarti grep tidak menemukan apa pun)
```
exit=1
```

**Grep `/about` (R8.7)**: `grep -rn "/about" src tests scripts docs --include=*.ts --include=*.tsx --include=*.mjs; echo "exit=$?"`
```
src/App.tsx:167:            <Route path="/about" element={<AboutRedirect />} />
tests/unit/linkCardRender.test.tsx:25:  authorUrl: 'https://www.noahpinion.blog/about',
tests/unit/editorHtmlRoundTrip.test.ts:35:  authorUrl: 'https://www.noahpinion.blog/about?a=1&b=2',
tests/e2e/journeys.spec.ts:200:  await page.goto('/about');
tests/e2e/journeys.spec.ts:206:  await page.goto('/about?lens=green&distance=finance&node=energy');
tests/e2e/journeys.spec.ts:214:  await page.goto('/about#changed-my-mind');
tests/e2e/smoke.spec.ts:14:  { path: '/about', name: 'About (redirects to /)' },
exit=0
```

## Screenshot

Semua screenshot ada di `docs/sweep-2026-10/screenshots/c/` dan diambil dengan **mock Playwright** (`tests/e2e/mockSupabase.ts`, bundle production). Seed-nya: 3 essay berbintang (rank 1–3), yaitu tiga judul reading path yang sudah ada di seed tes repo, ditambah 18 essay tanpa bintang bertitel placeholder "Sample essay N". Semua data dummy; tidak ada angka emiten. Screenshot **Preview Vercel** dengan data production (R2.5, ≥ 21 kartu) ditambahkan orchestrator setelah PR ada.

| File (1440 / 390) | Isi | Sumber |
|---|---|---|
| `home-top-1440.png`, `home-top-390.png` | Atas Home: header tanpa About (7 label di 1440), peta tetap yang pertama | mock Playwright |
| `home-full-1440.png`, `home-full-390.png` | Home utuh: peta → Glimpse → The argument → What I changed my mind about → footer | mock Playwright |
| `home-glimpse-1440.png`, `home-glimpse-390.png` | Awal baris: Indonesia's Reindustrialization Bet, Driver Tree Construction, Macro Scenario Construction for CFOs (urut rank), lalu yang tak berbintang newest first | mock Playwright |
| `home-glimpse-end-1440.png`, `home-glimpse-end-390.png` | Ujung baris: kolom terakhir "Sample essay 21", tombol kanan nonaktif | mock Playwright |
| `home-the-argument-1440.png`, `home-the-argument-390.png` | `#the-argument` di Home, bentuk penuh (case, comparison, objection, limits, path 1–5) | mock Playwright |
| `home-changed-my-mind-1440.png`, `home-changed-my-mind-390.png` | `#changed-my-mind` di Home | mock Playwright |
| `about-redirect-to-changed-my-mind-1440.png`, `about-redirect-to-changed-my-mind-390.png` | `/about#changed-my-mind` mendarat di Home, tepat di section itu di bawah header sticky | mock Playwright |
| `footer-1440.png`, `footer-390.png` | Footer "Sections" tanpa About | mock Playwright |
| `nav-drawer-390.png` | Drawer navigasi ponsel tanpa About | mock Playwright |

## Keputusan yang saya ambil sendiri

1. **Redirect membawa query dan fragment.** R8.1 menulis `<Navigate to="/" replace />` polos. Saya mempertahankan query dan fragment karena alamat peta (`?lens=&distance=&node=`, `useChainUrl.ts`) juga dibaca peta Home, dan essay menautkan `#the-argument` / `#changed-my-mind` (alasan D4). Redirect polos membuang keduanya.
2. **Tanpa 301 di server.** `vercel.json` tidak mengelola redirect, jadi sesuai R8.1 redirect cukup client-side. Akibatnya `GET /about` di production tetap 200 (SPA), lalu browser pindah ke `/`.
3. **Home melompat sendiri ke fragment (`useFragmentOnArrival`).** PRD tidak memintanya. Kedua section baru tergambar setelah data datang, sedangkan browser mencari fragment sebelum itu, sehingga muatan segar berhenti di atas. Lompatan dilakukan sekali, setelah fetch selesai, dikurangi tinggi header, dan tidak dilakukan bila pembaca sudah scroll. Fragment yang bukan percent-encoding valid dicari apa adanya. Tanpa ini, alasan D4 tidak terpenuhi di praktik.
4. **Penunjuk About di `ReadingPath` bentuk `compact` dihapus, tidak ditulis ulang.** Kalimat pengganti akan menjadi teks baru yang tidak ditulis Dika. Bentuk `compact` saat ini tidak dipasang di mana pun.
5. **`chainMapHref` dan contoh alamat peta menunjuk `/`.** Peta yang sama ada di Home dan membaca alamat yang sama. Layer membuka bacaannya. Stage tanpa overlay dibuang peta, sehingga peta terbuka di distance finance tanpa seleksi, sama seperti di About.
6. **`IndustryChainSection` tetap diekspor** walau tidak dipasang, karena `tests/unit/worldShell.test.tsx` merendernya.
7. **Tiap read memakai `.limit(limit)` dan jalan paralel.** Lebih sederhana dan tanpa round-trip tambahan. Biayanya paling banyak 30 baris yang dibuang `slice`.
8. **`capture-frames.mjs` hanya membandingkan landing.** Tidak ada halaman lain yang memasang peta.
9. **Catatan superseded juga dipasang di tiga paragraf aturan glimpse lama** (baris 28, 44–45, 49–52 di `0487609`), selain tiga tempat yang diminta R8.6. Ketiganya langsung bertentangan dengan D3(a); sejarahnya tidak dihapus.
10. **Teks khusus admin di `FinanceWorkspace.tsx`.** "...drives the homepage, About and the Finance landing alike" dipangkas menjadi "...drives the homepage and the Finance landing alike". Ini hanya penghapusan kata, dan hanya admin yang melihatnya.

## Pertentangan PRD/prompt/repo

1. **Grep `/about`.** Bagian 3 fase C langkah 4 meminta grep di `src tests scripts docs` hanya menyisakan redirect dan entri DECISIONS historis. Bagian 1 R8.7 memakai `--include=*.ts --include=*.tsx --include=*.mjs`. Tanpa filter, `docs/` berisi banyak laporan historis yang menyebut `/about` (`docs/review/glm/*`, `docs/response-2026-09-14*/`, `GATE_LEDGER.md`, `SESSION_LOG.md`, `docs/world/*.md`, `REVIEW-2026-08.md`). Menulis ulang laporan-laporan itu berarti mengubah sejarah. Bagian 1 yang diterapkan.
2. **Jumlah entri DECISIONS.** Bagian 3 "How to work" no. 10 meminta satu entri per fase. Bagian 3 fase C langkah 5, PRD R2.3 dan R8.6 meminta dua. Dua entri ditulis.
3. **Repo vs PRD (tidak mengubah desain).** `docs/INVENTORY.md` menulis `/` memakai `useSelectedEssays(4)`, padahal `0487609` sudah memakai `GLIMPSE_LIMIT = 30`. Sudah diperbaiki.

## Yang menunggu Dika

1. Review dan merge draft PR fase C. Tidak ada migrasi, perubahan env Vercel, atau regenerasi `types.ts`.
2. Konflik merge yang pasti terjadi (untuk orchestrator saat rebase): setiap fase menambah entri di puncak `docs/DECISIONS.md`. Selain itu, fase D (R6.5) menyunting `docs/DECISIONS.md:112-129` (hitungan `0487609`), bersebelahan dengan catatan superseded fase C di "Owner-protected surfaces left alone". Pertahankan kedua sisi.
3. Setelah merge, cek production (baca saja):
   - `https://www.dikagustiana.com/`: Glimpse memuat semua essay terbit (21 per 10 Okt), dengan tiga berbintang di depan urut rank.
   - `https://www.dikagustiana.com/about#changed-my-mind`: alamat menjadi `/#changed-my-mind` dan halaman berhenti di section itu.
   - `https://www.dikagustiana.com/about?distance=finance&node=energy`: alamat menjadi `/?distance=finance&node=energy` dan bacaan Energy terbuka.
4. Opsional: 301 di server, lewat PR terpisah, dengan `"redirects": [{ "source": "/about", "destination": "/", "permanent": true }]` di `vercel.json`. Belum diuji. Perilaku query dan fragment harus dicek di Preview dulu.
5. Opsional: atur bintang dan urutan di Admin → Content → "Homepage order". Essay tanpa bintang otomatis menyusul newest first.

## Yang tidak terverifikasi

1. Screenshot Preview Vercel dengan data production (R2.5): PR belum ada di sesi ini; orchestrator yang menambahkan.
2. Jumlah 21 terbit / 3 berbintang: diambil dari PRD §1.2.2 (cek 10 Okt), tidak di-query ulang karena database read-only dan tidak dibutuhkan.
3. Redirect `/about` di Vercel: hanya diverifikasi di mock Playwright (`vite preview` lokal).
4. Isi essay di database yang menautkan `/about` atau fragment: tidak diperiksa. Redirect menangkap semua `/about...` dan membawa fragment-nya.
5. Dampak SEO: tidak diukur. `/about` memang tidak ada di sitemap.
6. Angka kedalaman section (±1.700 / ±3.700 px) di pesan commit `e849205`: diukur sesi sebelumnya dan tidak saya ukur ulang. Yang terverifikasi adalah perilakunya: section mendarat terlihat di bawah header (`journeys.spec.ts`).

## Kandidat pembersihan

1. Bentuk `compact` di `src/components/argument/ReadingPath.tsx`: tidak dipasang di mana pun.
2. `IndustryChainSection` (`ChainPlate.tsx`): tidak dipasang di halaman mana pun; hanya `worldShell.test.tsx` yang memakainya.
3. Fallback 42703 di `useSelectedEssays`, `useFeaturedFinanceEssay` dan panel admin. PRD §1.2.2 menyatakan `selected_rank` sudah ada di production, dan DECISIONS 2026-10-09 meminta fallback dihapus setelah `types.ts` diregenerasi.
4. Komentar header `supabase/migrations/20261009140000_essay_selected_rank.sql` masih menulis bahwa `is_selected` "says WHO is on the homepage" dan bahwa "About and the Finance landing read the same order". Komentar ini basi sejak D3(a)/D4(a). Migrasinya sudah diterapkan, jadi tidak saya ubah.

## Text awaiting the owner

Tidak ada. Fase C tidak menambah kalimat baru yang dibaca pengunjung. "The argument" dan "Changed my mind" dipasang dengan copy yang sama (D4(a)). Perubahan lain hanya penghapusan: link About di header, drawer dan footer, serta penunjuk About di `ReadingPath` bentuk `compact`. Tidak ada string `OWNER-REPLACEABLE` baru (`git diff 0487609..HEAD -- src | grep OWNER-REPLACEABLE` kosong).

## Tambahan orkestrator: screenshot dengan data production (build lokal, baca saja)

Vercel Preview untuk branch ini ada di balik Vercel Authentication (SSO), dan konektor Vercel sesi ini tidak punya akses ke project `dikagustiana-com` (laporan fase 0 §6.6). Sebagai gantinya, orkestrator membangun branch ini secara lokal sebagai build production (`npx vite build`, semua flag world/FIA tidak diset kecuali disebut), dengan `VITE_SUPABASE_URL` production (`asypkbkiebjvvpimewfp`) dan kunci anon publik. Browser Playwright hanya bicara dengan `vite preview` lokal; setiap request ke `*.supabase.co` diteruskan lewat Node, dan **hanya GET/HEAD** yang diteruskan (selain itu dibatalkan), jadi production hanya dibaca. Kode yang dibangun sama dengan HEAD PR: `git diff <commit build>..HEAD -- src public scripts supabase tests` kosong. Build dari `1f7a3ff`.

Hasil yang diperiksa di halaman (`page.evaluate`, 1440 dan 390 px): **21 kolom Glimpse** (semua essay terbit); empat pertama berurutan *Indonesia's Reindustrialization Bet*, *Driver Tree Construction*, *Macro Scenario Construction for CFOs* (tiga yang dibintangi, urut `selected_rank` 1–3), lalu essay terbaru; `#the-argument` dan `#changed-my-mind` ada di Home; tidak ada tautan `/about` di header maupun footer; `/about` berakhir di `/` (`location.pathname` = `/`). Semua request Supabase 200, tanpa error halaman.

| Path | Isi |
|---|---|
| `screenshots/c/production-data/home-top-1440-production-data.png` | Home 1440 px, bagian atas (peta chain) |
| `screenshots/c/production-data/home-glimpse-1440-production-data.png` | Glimpse 1440 px: tiga essay berbintang dulu, lalu yang terbaru; tombol geser aktif |
| `screenshots/c/production-data/home-argument-1440-production-data.png` | `#the-argument` di Home, 1440 px |
| `screenshots/c/production-data/home-glimpse-390-production-data.png` | Glimpse 390 px |
| `screenshots/c/production-data/about-redirect-390-production-data.png` | `/about` dibuka, berakhir di Home |
