# Laporan fase A — navigation dropdown

Branch `sweep/a-nav`, dari `origin/main` @ `0487609`. PRD R7 (temuan 7: "Dropdown navbar hilang saat kursor
turun"), konteks §1.2.7, Bagian 3 "Phase A". Tidak ada migrasi, tidak ada perubahan env, tidak ada perubahan
data. Perubahan kode: `src/components/header/NavDropdown.tsx` dan satu baris `src/components/header/MainNav.tsx`
(lihat §5).

- SHA awal: `048760967c60be64095df084eee9c9b49bff75d4` (`origin/main`, "Merge pull request #58 from
  dikagustiana/world-v2/e-quality").
- SHA akhir: lihat commit terakhir di PR.

## Commit

Dari `git log --reverse --format='%h %s' 0487609..HEAD`, terlama dulu:

1. `4ad5221 Keep header dropdowns open across the trigger-panel seam`
2. `79254a1 Move focus into a header dropdown only on a keyboard open`
3. `8fbb66b Raise the unit test floor to 1159 for the dropdown suite`
4. `951aa82 Add phase A screenshots of the four header dropdowns`
5. `6d336ac Return focus to the chevron on Escape only from inside the menu`
6. `769d947 Close the open header menu at once when another opens`
7. `e6d12cc Line the Learning menu up with its label's right edge`
8. `7403e01 Describe the nav e2e suite's two layout tests in its header`
9. `8957580 Pin that a pointer click opens a header menu without moving focus`
10. `f1786e8 Raise the unit test floor to 1162 for the dropdown review fixes`
11. `22c44f0 Retake the Learning dropdown screenshot with the panel in view`
12. `743fac2 Record phase A's header dropdown decisions in DECISIONS.md`
13. (commit ini) `Write the phase A report on the header dropdowns`

Commit 5–11 adalah perbaikan hasil review atas commit 1–4.

## 1. Yang dibangun, per kriteria terima

Nomor baris `NavDropdown.tsx` di bawah merujuk ke HEAD branch ini.

| Kriteria | Di mana / bagaimana | Tes yang membuktikan |
|---|---|---|
| **R7.1** celah `mt-1` diganti | Panel `role="menu"` sekarang berada di dalam wrapper `absolute top-full z-50 pt-1` (`:249`). Celah 4 px menjadi padding transparen wrapper itu, jadi termasuk hit area. Posisi dan tampilan panel sama seperti sebelumnya (top-full + 4 px). Tidak memakai pseudo-element. | e2e `nav.spec.ts:72` (kursor diam di celah selama 2 × 150 ms, menu tetap terbuka); e2e `nav.spec.ts:51` × 4 (lintasan lurus) |
| **R7.2** penutupan ditunda 150 ms dan batal bila kursor masuk lagi; `onMouseLeave` di wrapper yang mencakup trigger dan panel | `NAV_DROPDOWN_CLOSE_DELAY_MS = 150` (`:30`). `handlePointerLeave` memasang `setTimeout` (`:95-100`), `handlePointerEnter` membatalkannya (`:90`), dan timer dibersihkan saat unmount (`:78`). `onMouseEnter`/`onMouseLeave` ada di wrapper luar (`:195-196`) yang memuat trigger dan panel. Tambahan dari review: membuka satu menu langsung menutup menu lain yang masih menunggu delay (`closeOpenMenu`, `:38`, `:83`). | unit `navDropdown.test.tsx:61`, `:71`, `:83`, `:105`, `:122`; e2e `nav.spec.ts:96` |
| **R7.3** fokus ke item pertama hanya saat dibuka lewat keyboard; Escape menutup dan mengembalikan fokus ke chevron; klik di luar menutup | `focusFirstOnOpen` (`:50`) hanya di-set oleh `openFromKeyboard` (`:73`), yaitu oleh ArrowDown (`:157`) atau oleh Enter/Space yang menghasilkan klik ber-`detail === 0` (`handleToggleClick`, `:106-109`). Hover dan klik pointer (`detail ≥ 1`) tidak memindahkan fokus. Escape menutup menu dan memfokuskan chevron hanya bila fokus ada di dalam menu (`:137-139`). Klik di luar dan klik item tetap menutup. | unit `:94` (hover tidak memindahkan fokus), `:136` (klik pointer tidak memindahkan fokus), `:151` × 3 (Enter, Space, ArrowDown → fokus item pertama), `:164` (label Learning), `:172` (Escape → chevron), `:184` (Escape pada menu yang dibuka pointer), `:196` (klik di luar, klik item) |
| **R7.4** `prefers-reduced-motion` dihormati; tidak ada regresi `MobileNav` | Tidak ada animasi atau transisi baru. Delay 150 ms adalah timer, bukan gerak. `MobileNav.tsx` tidak berubah (tidak ada di `git diff --stat 0487609..HEAD`). | suite e2e yang sudah ada (`smoke.spec.ts`) hijau; screenshot 390 px |
| **R7.5** tes unit dan e2e | `tests/unit/navDropdown.test.tsx` (14 tes) dan `tests/e2e/nav.spec.ts` (7 tes). Tiap tes lintasan memanggil `hover()` pada label, lalu `page.mouse.move` ke tengah item terakhir dalam garis lurus (2 px per langkah), lalu mengklik item dan memeriksa URL: Accounting → Statutory Reporting, Finance → Finance in Action, The Next Big Thing → Growth, Learning → IELTS. | lihat §2 |
| Di luar R7 (ditemukan saat mengambil screenshot) | Panel Learning (`w-48`, rata kiri dengan label terakhir) keluar dari tepi kanan halaman. Pada viewport 1280 px tepi kanannya di 1344 px, sehingga halaman bisa digulir ke samping selama menu terbuka. Ada prop baru `align?: 'start' \| 'end'` (`:22`), dan `MainNav.tsx:114` memberi `align="end"` pada Learning. | e2e `nav.spec.ts:131` (pada 1280 dan 1440 px: tepi kanan setiap panel ≤ lebar viewport dan `scrollWidth === clientWidth`) |

### Bukti bahwa tes-tes ini benar-benar menangkap kesalahannya

Saya jalankan ulang di langkah finalisasi ini. Setiap varian dipasang sementara di worktree lalu dikembalikan
dengan `git checkout`, dan `git status --short` kosong setelahnya.

Komponen asli (`git show 0487609:src/components/header/NavDropdown.tsx`), e2e:

```
$ CI=1 flock /tmp/claude-0/e2e.lock npx playwright test tests/e2e/nav.spec.ts
  ✘  2 [chromium] › tests/e2e/nav.spec.ts:51:3 › Accounting: a straight line from the label to "Statutory Reporting" keeps the menu open, and the item navigates (7.2s)
  ✘  1 [chromium] › tests/e2e/nav.spec.ts:51:3 › Finance: a straight line from the label to "Finance in Action" keeps the menu open, and the item navigates (8.2s)
  ✘  3 [chromium] › tests/e2e/nav.spec.ts:51:3 › The Next Big Thing: a straight line from the label to "Growth" keeps the menu open, and the item navigates (7.9s)
  ✘  4 [chromium] › tests/e2e/nav.spec.ts:51:3 › Learning: a straight line from the label to "IELTS" keeps the menu open, and the item navigates (7.0s)
  ✘  5 [chromium] › tests/e2e/nav.spec.ts:72:1 › a pointer resting in the seam between label and panel keeps each menu open (6.3s)
  ✘  6 [chromium] › tests/e2e/nav.spec.ts:96:1 › moving from one menu to the next closes the first at once, so its panel cannot take the pointer (6.8s)
  ✘  7 [chromium] › tests/e2e/nav.spec.ts:131:1 › each panel opens inside the viewport, at the narrowest desktop width too (1.3s)
  ...
    Error: Learning at 1280px: the panel's right edge
    Expected: <= 1280
    Received:    1344.28125
  ...
  7 failed
```

Komponen asli, unit:

```
$ npx vitest run tests/unit/navDropdown.test.tsx
   × NavDropdown under a pointer > closes 150 ms after the pointer leaves, and not before 13ms
   × NavDropdown under a pointer > stays open when the pointer comes back within 150 ms 37ms
   × NavDropdown under a pointer > does not move focus when the pointer opens it 18ms
   × NavDropdown under a pointer > clears a pending close when it unmounts 16ms
   × NavDropdown under a pointer's click > does not move focus into the menu when a click opens it 47ms
   × NavDropdown under a keyboard > closes a menu the pointer opened on Escape and leaves focus where it was 17ms
 Test Files  1 failed (1)
      Tests  6 failed | 8 passed (14)
```

Varian "delay saja" (HEAD, tetapi wrapper memakai `mt-1` alih-alih `pt-1`):

```
$ CI=1 flock /tmp/claude-0/e2e.lock npx playwright test tests/e2e/nav.spec.ts
  ✓  2 [chromium] › tests/e2e/nav.spec.ts:51:3 › Accounting: a straight line from the label to "Statutory Reporting" keeps the menu open, and the item navigates (2.1s)
  ✓  1 [chromium] › tests/e2e/nav.spec.ts:51:3 › Finance: a straight line from the label to "Finance in Action" keeps the menu open, and the item navigates (3.1s)
  ✓  3 [chromium] › tests/e2e/nav.spec.ts:51:3 › The Next Big Thing: a straight line from the label to "Growth" keeps the menu open, and the item navigates (2.8s)
  ✓  4 [chromium] › tests/e2e/nav.spec.ts:51:3 › Learning: a straight line from the label to "IELTS" keeps the menu open, and the item navigates (1.8s)
  ✓  6 [chromium] › tests/e2e/nav.spec.ts:96:1 › moving from one menu to the next closes the first at once, so its panel cannot take the pointer (1.8s)
  ✓  7 [chromium] › tests/e2e/nav.spec.ts:131:1 › each panel opens inside the viewport, at the narrowest desktop width too (2.8s)
  ✘  5 [chromium] › tests/e2e/nav.spec.ts:72:1 › a pointer resting in the seam between label and panel keeps each menu open (6.3s)
  ...
    Error: Accounting: the seam is inside the hover area
  ...
  1 failed
  6 passed (22.1s)
```

Jadi delay 150 ms saja menyembunyikan celah dari kursor yang cepat, tetapi tidak dari kursor yang lambat. Hanya
tes `:72` yang membuktikan bahwa celah itu sendiri sudah hilang; karena itu tes tersebut ditambahkan di luar
daftar R7.5.

## 2. Output verifikasi

Dijalankan ulang di langkah finalisasi, di HEAD `22c44f0`, sebelum commit DECISIONS dan laporan ini (keduanya
hanya mengubah dokumen). Semua dari `/home/user/wt/a`. `$W` adalah folder scratch sesi (`…/scratchpad/work-a`),
di luar repo.

```
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)

lint exit=0
```

Baseline 22 peringatan, dan tidak ada peringatan baru (tidak ada file `src/components/header/*` di daftar
peringatan).

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
$ TZ=America/Chicago npx vitest run --reporter=dot --reporter=json --outputFile=$W/vitest.json
 ...
 ✓ tests/unit/navDropdown.test.tsx (14 tests) 1602ms
 ...
 Test Files  86 passed (86)
      Tests  1166 passed (1166)
   Duration  255.59s (transform 13.28s, setup 26.65s, collect 43.70s, tests 579.30s, environment 61.67s, prepare 12.23s)

vitest exit=0

$ node scripts/assert-test-count.mjs $W/vitest.json
assert-test-count: 1166 tests, 0 failed, 0 failed suite(s) (floor 1162)
assert-test-count: ok
```

`MIN_TESTS` naik dari 1148 ke 1159 (commit `8fbb66b`, 11 tes), lalu ke 1162 (commit `f1786e8`, 3 tes). Jumlah
aktual 1166 = 1152 (baseline fase 0) + 14.

```
$ CI=1 flock /tmp/claude-0/e2e.lock npx playwright test
Running 82 tests using 2 workers
  ...
  ✓  37 [chromium] › tests/e2e/nav.spec.ts:51:3 › Accounting: a straight line from the label to "Statutory Reporting" keeps the menu open, and the item navigates (3.1s)
  ✓  38 [chromium] › tests/e2e/nav.spec.ts:51:3 › Finance: a straight line from the label to "Finance in Action" keeps the menu open, and the item navigates (4.1s)
  ✓  39 [chromium] › tests/e2e/nav.spec.ts:51:3 › The Next Big Thing: a straight line from the label to "Growth" keeps the menu open, and the item navigates (3.4s)
  ✓  40 [chromium] › tests/e2e/nav.spec.ts:51:3 › Learning: a straight line from the label to "IELTS" keeps the menu open, and the item navigates (2.2s)
  ✓  42 [chromium] › tests/e2e/nav.spec.ts:96:1 › moving from one menu to the next closes the first at once, so its panel cannot take the pointer (2.6s)
  ✓  41 [chromium] › tests/e2e/nav.spec.ts:72:1 › a pointer resting in the seam between label and panel keeps each menu open (4.4s)
  ✓  43 [chromium] › tests/e2e/nav.spec.ts:131:1 › each panel opens inside the viewport, at the narrowest desktop width too (4.9s)
  ...
  ✓  82 [chromium] › tests/e2e/smoke.spec.ts:96:7 › the header holds its navigation › no sideways scroll at 1440px with a 24px root font (1.1s)

  82 passed (1.4m)
e2e exit=0
```

82 = 75 (baseline fase 0) + 7 tes `nav.spec.ts`.

```
$ flock /tmp/claude-0/e2e.lock sh -c 'VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key VITE_SUPABASE_PROJECT_ID=test npx vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs'
...
✓ built in 15.22s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
build exit=0
```

Grep angka ticker slate (harus kosong):

```
$ git grep -nE "\b(PTBA|ITMG|INTP|SMGR)\b" -- src public tests scripts supabase | grep -E "[0-9]{1,3}([.,][0-9]{3})+" ; echo "exit=$?"
exit=1
```

Output kosong. `exit=1` adalah kode keluar `grep` terakhir dan berarti tidak ada baris yang cocok. Fase ini tidak
menambah data apa pun: tidak ada angka emiten dan tidak ada data SAMB.

### Tes e2e yang flaky, sudah ada sebelum fase ini

`tests/e2e/chain.spec.ts:75` (`/about` pada 1280 px; popover harus berada di dalam figure) kadang gagal di
`expect(inside).toBe(true)` (`chain.spec.ts:133`). Pada run penuh di atas tes ini lulus. Saya ulangi di langkah
finalisasi:

```
# HEAD branch ini
$ CI=1 flock /tmp/claude-0/e2e.lock npx playwright test tests/e2e/chain.spec.ts:75 --repeat-each=20
  1 failed
    [chromium] › tests/e2e/chain.spec.ts:75:1 › /about at 1280px draws one wide plate whose names are readable, with every joint reachable and one reading beside it
  19 passed (54.3s)

# NavDropdown.tsx dan MainNav.tsx dari 0487609 (header asli), --repeat-each=20
  20 passed (48.3s)

# header asli, --repeat-each=40
  2 failed      (keduanya di  > 133 |   expect(inside).toBe(true);)
  38 passed (1.0m)
```

Kegagalan yang sama muncul dengan header asli (2 dari 40), jadi tes ini sudah flaky sebelum fase A. Tes ini
mengklik joint di peta lalu membaca posisi popover, dan header tidak terlibat. Fase ini tidak menyentuhnya. Tes
ini bisa membuat run e2e penuh merah tanpa sebab dari PR ini. Menurut R8.5, fase C mengganti rute tes ini
(`/about` → `/`).

## 3. Screenshot

Semua screenshot diambil dari **mock Playwright** (`tests/e2e/mockSupabase.ts`, build produksi lokal, tabel
kosong atau dummy, tanpa data production) oleh spec sementara yang sudah dihapus sebelum commit. Kursor
diletakkan di item terakhir setiap menu, jadi item itu tampil dalam keadaan hover. Setiap PNG sudah saya buka dan
periksa isinya. Screenshot dari Vercel Preview akan ditambahkan oleh orkestrator setelah PR dibuat.

| Path | Isi | Sumber |
|---|---|---|
| `docs/sweep-2026-10/screenshots/a/dropdown-accounting-open-1440.png` | Home 1440 px, menu Accounting terbuka: FSLI Detail, Consolidated Reporting, Statutory Reporting (hover) | mock Playwright |
| `docs/sweep-2026-10/screenshots/a/dropdown-finance-open-1440.png` | Menu Finance terbuka, enam item sampai Finance in Action (hover) | mock Playwright |
| `docs/sweep-2026-10/screenshots/a/dropdown-the-next-big-thing-open-1440.png` | Menu The Next Big Thing terbuka, Technology … Growth (hover) | mock Playwright |
| `docs/sweep-2026-10/screenshots/a/dropdown-learning-open-1440.png` | Menu Learning terbuka, rata kanan dengan labelnya dan utuh di dalam layar; IELTS (hover) | mock Playwright |
| `docs/sweep-2026-10/screenshots/a/dropdown-learning-open-1280.png` | Sama, pada 1280 px (lebar terkecil yang menampilkan nav desktop, `xl`); panel tidak terpotong | mock Playwright |
| `docs/sweep-2026-10/screenshots/a/mobile-header-390-unchanged.png` | Home 390 px: header mobile (logo dan tombol drawer) tidak berubah; dropdown desktop tidak tampil di lebar ini | mock Playwright |

Tidak ada screenshot dropdown pada 390 px, karena di bawah 1280 px header memakai drawer `MobileNav`, bukan
`NavDropdown`.

## 4. Keputusan yang saya ambil sendiri

1. **Padding, bukan pseudo-element.** R7.1 menawarkan dua cara. Dengan padding transparen pada wrapper absolut,
   celah menjadi bagian dari hit area tanpa mengubah kotak panel itu sendiri, sehingga posisi dan tampilan panel
   tetap sama persis.
2. **Pembukaan lewat keyboard dikenali dari `click.detail === 0`,** bukan dari handler keydown Enter/Space. Klik
   yang dihasilkan keyboard (atau aktivasi screen reader) ber-`detail` 0, sedangkan klik pointer mulai dari 1.
   Membatalkan aktivasi bawaan Space di keydown tidak bisa diandalkan di semua browser. Klik pointer pada menu
   yang tertutup membukanya tanpa memindahkan fokus; pada menu yang terbuka, klik menutupnya seperti sebelumnya.
3. **Label Learning bisa dibuka lewat keyboard seperti chevron.** Label itu sendiri adalah tombol menu karena
   Learning tidak punya halaman landing. R7.3 hanya menyebut chevron, tetapi tanpa perluasan ini pengguna
   keyboard di Learning kehilangan fokus ke item pertama yang sebelumnya mereka dapat.
4. **Escape memindahkan fokus ke chevron hanya bila fokus ada di dalam menu.** R7.3 berbunyi "Escape tetap
   menutup dan mengembalikan fokus ke chevron". Pada menu yang dibuka lewat hover, fokus tidak pernah masuk ke
   menu. Menarik fokus ke chevron yang tidak pernah difokuskan berarti memindahkan fokus tanpa diminta, dan
   justru itu kesalahan yang diperbaiki R7.3. Untuk menu yang dibuka lewat keyboard, perilakunya persis seperti
   R7.3.
5. **Delay 150 ms tetap berlaku di bawah `prefers-reduced-motion`.** Delay itu timer, bukan gerak, dan tidak ada
   yang dianimasikan.
6. **Hanya satu menu terbuka pada satu waktu, lewat satu handle tingkat modul (`closeOpenMenu`).** Delay punya
   efek samping. Menu yang baru ditinggalkan masih tergambar 150 ms di atas tetangganya (lebih akhir di DOM,
   z-index sama). Kursor yang bergerak ke daerah tumpang-tindih masuk lagi ke menu lama, sehingga menu tujuan
   tertutup. Saya memilih handle tingkat modul, bukan context atau state bersama, karena hanya penutupan yang
   perlu melintas antar-instance.
7. **Tiga tes e2e tambahan di luar daftar R7.5:** kursor diam di celah (`:72`), perpindahan antar-menu (`:96`),
   dan panel di dalam viewport pada 1280/1440 px (`:131`). Alasan untuk `:72` ada di §1: varian delay saja lulus
   semua tes lintasan lurus.
8. **Tes unit menggerakkan pointer dengan pasangan `fireEvent.mouseOut`/`mouseOver` di fake timer,** supaya delay
   bisa diukur sampai milidetik. `user-event` menunggu timer sendiri di antara langkah dan macet di fake timer.
   Tes keyboard memakai `user-event` dengan timer asli. Tes unmount menghitung timer relatif terhadap baseline,
   supaya timer lain yang tidak berkaitan tidak mematahkannya.
9. **Panel Learning dibuat rata kanan (`align="end"` di `MainNav.tsx`)** walaupun di luar R7. Tanpa itu panel
   terpotong di tepi kanan dan halaman bisa digulir ke samping selama menu terbuka (lihat §5 butir 1).

## 5. Pertentangan PRD/prompt/repo

1. **Bagian 3 "Phase A" membatasi edit ke `NavDropdown.tsx` saja (plus tes), tetapi fase ini juga mengubah satu
   baris `MainNav.tsx`** (`align="end"` pada Learning). Bagian 1 R7 tidak membatasi file. Perubahan ini juga
   dibutuhkan R7.5 ("item terlihat dan bisa diklik") untuk Learning, karena tanpa perubahan itu panel Learning
   terpotong di tepi kanan. Alternatif yang tetap dalam satu file (mengukur lalu membalik posisi di dalam
   `NavDropdown`) lebih rumit untuk hasil yang sama. Kalau Dika ingin batas satu file dipegang ketat, perubahan
   ini perlu dibalik (commit `e6d12cc` beserta tes `nav.spec.ts:131` dan screenshot Learning di `22c44f0`), dan
   Learning akan kembali terpotong.
2. **R7.2 / §1.2.7:** di `0487609`, `onMouseLeave` sudah terpasang di wrapper yang memuat trigger dan panel
   (`NavDropdown.tsx:106-112` di `0487609`, panel di `:160-168`; PRD menulis `:107-113`). Jadi syarat wrapper R7.2 sudah terpenuhi sebelum fase ini.
   Satu-satunya kesalahan adalah margin `mt-1` di luar hit area, dan R7.1 adalah perbaikan intinya. Ini
   klarifikasi, bukan pertentangan.
3. **R7.3 menyebut "Enter/Space/ArrowDown pada chevron".** Pembukaan lewat keyboard diperluas ke label Learning
   (§4 butir 3), dan Escape mengembalikan fokus ke chevron hanya bila fokus ada di menu (§4 butir 4).
4. **Bagian 3 meminta screenshot setiap dropdown pada 1440 px, sedangkan §2.2 dan prompt fase meminta 1440 dan
   390.** Pada 390 px tidak ada dropdown desktop, jadi screenshot 390 menunjukkan header mobile yang tidak
   berubah.
5. **Tidak ada D-number untuk R7.** Keputusan D1–D14 tidak membahas header. Karena itu entri `docs/DECISIONS.md`
   fase ini tidak mengimplementasikan D-number apa pun, dan tidak menggantikan entri lama: belum ada entri yang
   mencatat perilaku hover dropdown.

## 6. Yang menunggu Dika

Fase ini tidak membutuhkan migrasi, regenerasi `types.ts`, atau perubahan env Vercel.

1. **Review PR fase A di Vercel Preview** (setelah orkestrator membuat draft PR dari `sweep/a-nav`). Di desktop
   dengan lebar jendela ≥ 1280 px:
   - arahkan kursor ke **Accounting**, turunkan pelan-pelan dalam garis lurus ke **Statutory Reporting**, lalu
     klik. Menu tidak boleh hilang di tengah jalan;
   - ulangi untuk **Finance → Finance in Action**, **The Next Big Thing → Growth**, dan **Learning → IELTS**;
   - buka **Learning** pada lebar 1280 px. Panel harus utuh di dalam layar, tanpa scrollbar horizontal;
   - dengan keyboard: Tab ke chevron Accounting dan tekan Enter, maka fokus pindah ke "FSLI Detail". Tekan
     Escape, maka menu tertutup dan fokus kembali ke chevron.
2. **Putuskan soal satu baris di luar `NavDropdown.tsx`** (§5 butir 1): terima, atau minta perubahan itu dibalik.
3. **Merge** draft PR fase A di GitHub. Dika yang merge; saya tidak push dan tidak merge.

## 7. Yang tidak terverifikasi

1. **Firefox dan Safari/WebKit tidak dijalankan.** `playwright.config.ts` hanya memuat project `chromium`. Jadi
   belum terverifikasi apakah klik dari Enter/Space di browser itu ber-`detail` 0, dan apakah celah 4 px
   berperilaku sama.
2. **Screen reader nyata (NVDA, JAWS, VoiceOver) tidak diuji.** Asumsinya, aktivasi virtual mereka ber-`detail` 0
   sehingga fokus pindah ke item pertama.
3. **Perangkat sentuh dengan lebar ≥ 1280 px** (tablet landscape yang menampilkan nav desktop) tidak diuji.
   Logika toggle chevron pada menu yang sudah terbuka (menutup menu) sama seperti sebelumnya.
4. **Vercel Preview dan production tidak diperiksa.** Semua pemeriksaan dijalankan lokal (mock Playwright, build
   lokal).
5. **`MobileNav`:** tidak ada file yang berubah dan suite e2e yang ada hijau, tetapi fase ini tidak menulis tes
   baru untuknya.

## 8. Kandidat pembersihan

1. Folder scratch sesi `…/scratchpad/work-a/` (salinan varian `NavDropdown` dan log tes), di luar repo.
2. `dist/` dan `test-results/` di worktree (keluaran build dan Playwright, sudah masuk `.gitignore`).
3. Tes flaky `tests/e2e/chain.spec.ts:75` (§2). Ini bukan bagian fase ini, tetapi perlu ditangani di fase C (yang
   memindahkan rute `/about`) atau di PR terpisah, supaya CI tidak merah tanpa sebab.

## Text awaiting the owner

Tidak ada. Fase ini tidak menambah teks yang dibaca pengunjung. Label menu dan `aria-label` (`<label> submenu`)
sudah ada sebelumnya, dan tidak ada string UI baru.
