# Gate 4: quality, report, the draft pull request

Branch `feat/kawasan-industri`, 8 October 2026. Companions: `docs/world/report.md` (architecture,
counts, tests, performance, what remains, the decision log), `docs/world/gate-3.md`, `NOTICE.md`.

## 1. Ringkasan

1. Phase I selesai (commit 18) dan laporan akhir ada di `docs/world/report.md` (commit 19): arsitektur yang terbangun, siapa membaca apa, hitungan registry, setiap penempatan/pasangan/link yang masih `proposed` atau `expected`, hasil tes, pengukuran, apa yang ada di balik flag, apa yang tinggal untuk Mas, dan decision log D1–D29 beserta item A–R, S1–S4, O1–O8.
2. Semua cek hijau di commit terakhir: tsc bersih; eslint 0 error / 22 warning; 1.010 unit test lulus (floor 1.006); `check:world` bersih; `npm run build` flag mati lolos `assert-no-synthetic` dan `assert-world-flag`; suite Playwright repo 72 lulus; suite Playwright dunia 7 lulus (`npm run test:e2e:world`, SwiftShader).
3. Suite dunia menguji smoke §11 persis: nol error konsol setelah 600 detik simulasi, draw call di bawah budget, deskripsi canvas, setiap place/layer/overlay, drill-down, `[`/`]` ke 125 bangunan, keyboard, perusahaan terekspos + board dibuka/ditutup dengan fokus kembali, perusahaan tanpa model tanpa angka, 390 px, Skema, reduced motion.
4. Lighthouse mobile flag nyala naik dari 39 (gate 2) ke 74; TBT 2.233 → 34 ms; CLS 0,001 (lebih baik dari flag mati 0,011); desktop 95 (LCP 1,12 s vs 0,89 s). LCP mobile 5,27 s masih 0,98 s di atas flag mati 4,30 s di preview tanpa kompresi ini; sebabnya poster 65 KB (≈13 KB terkompresi di Vercel) dan render di belakang chunk rute. Butuh keputusan Mas (O8).
5. Dua perilaku baru yang ditemukan tes dan pengukuran: di ponsel dunia mulai pada sentuhan pertama dengan tombol "Start the world" di atas poster (D25), dan chunk shell tidak lagi menarik three.js (D26) sehingga ponsel mengunduh 494 KB bukan 636 KB.
6. `NOTICE.md` tidak berubah: ai-iso-skill MIT, three.js MIT, Factory Yard **masih pending** (rule 10). Karena itu pull request dibuka sebagai **draft** dan tidak ditandai siap; tidak ada merge.
7. Tidak ada tulisan ke Supabase di jalur kode mana pun (tes klien yang melempar), tidak ada migrasi diterapkan, tidak ada perubahan produksi/Vercel; setiap build dan tes menunjuk ke `127.0.0.1:54321` atau klien tiruan.
8. Yang tinggal untuk Mas ada di `report.md` §6: lisensi, ekspos `fsre_published`, backup lalu migrasi, flag preview, review registry (130 penempatan, 64 slot pasangan kosong), tag think tank, LCP mobile, URL preview.
9. Frame yang diambil ulang di gate ini: `phone-390` (tombol start, kartu sebagai bottom sheet) dan `overlay-reindustrialisation-marks` (cakram bersebelahan); 22 frame + 4 laporan Lighthouse di `docs/world/frames/`.
10. Berhenti di gate 4. PR draft terbuka dengan laporan tertaut; menunggu "lanjut" Mas dan lisensi sebelum PR ditandai siap (§14 mega prompt).

## 2. Evidence

```
$ npx tsc -b --force
(no output: clean)
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest-report.json && node scripts/assert-test-count.mjs vitest-report.json
assert-test-count: 1010 tests, 0 failed, 0 failed suite(s) (floor 1006)
assert-test-count: ok
$ npm run check:world
23 files · 19 wired from the entry · 4 pending (data/boundary.ts, placement/empty.ts, placement/layout.generated.ts, placement/place.ts)
wired files clean · load order ok
$ npm run build
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
$ VITE_WORLD_KAWASAN=true VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key npx vite build --outDir <dir>
Board-pux7AHym.js          43.87 kB │ gzip:  13.80 kB
WorldFrame-C4Ny5CFZ.js    222.52 kB │ gzip:  39.12 kB
world-engine-CYcCDkzk.js  570.90 kB │ gzip: 143.88 kB
$ npx playwright test
  72 passed (2.9m)
$ npm run test:e2e:world
  ✓ starts without a console error, runs 600 simulated seconds clean, and keeps its draw calls under the budgets (40.3s)
  ✓ every place button, every layer, each overlay with its strip, the energy drill-down and back, and the cycle through every building (38.8s)
  ✓ exposes a company (card, section, whiteboard, station markers), opens and closes the board with focus returning to the stage, and lights its chain (14.2s)
  ✓ a company without a model opens a board that says so and carries no figure (4.4s)
  ✓ at 390 px the world starts by hand, nothing scrolls sideways, and the card is a bottom sheet (3.4s)
  ✓ Skema swaps the world for the schematic in place, and back (10.5s)
  ✓ reduced motion › shows the schematic and one line, and never mounts the engine (4.5s)
  7 passed (2.2m)
$ node scripts/world/lighthouse.mjs                      # docs/world/frames/lighthouse.json
off-mobile  80 / 98 · LCP 4,295 ms · CLS 0.011 · TBT 43 ms · 436 KB
off-desktop 99 / 98 · LCP 891 ms · CLS 0.001 · TBT 0 ms · 436 KB
on-mobile   74 / 98 · LCP 5,271 ms · CLS 0.001 · TBT 34 ms · 494 KB
on-desktop  95 / 98 · LCP 1,123 ms · CLS 0.001 · TBT 120 ms · 676 KB
```

The flag-off runs were measured on the flag-off build before the last two edits (the poster fallback
and the stations module), both dead code with the flag off: `assert-world-flag` found no world code in
the flag-off build after them. The flag-on pair was re-run after each edit; the table carries the last.

## 3. Decisions

### 3.1 Made by the agent

- **D25. A phone starts the world on the first touch.** The poster stays with a "Start the world"
  button; the stage's first pointer or key also starts it. Reason: gate 2's trace, where the engine's
  build was one long task a throttled phone could not absorb behind the largest paint; D15 named this
  fallback. TBT went from 1,083 ms to 34 ms on the mobile profile.
- **D26. The shell's chunk carries no three.js.** The station data, the zone fallback and the matcher
  moved to `src/world/interiors/stations.ts` (no renderer import), so binding a company's lines no
  longer loads the engine's dependency with the shell; the mobile transfer fell from 636 KB to 494 KB.
- **D27. The card keeps the keyboard.** Its title takes focus when it opens, unless the canvas has
  focus (the keyboard is cycling with `[` and `]`); the card is a polite live region, so the title is
  still announced. Found by the browser suite, where the second `]` reached the card instead of the
  canvas.
- **D28. The world's own Playwright config** (`playwright.world.config.ts`, port 4176, the flag on)
  because the repository's config builds with the flag off, as production does; the default config
  ignores `world.spec.ts`. CI runs no Playwright suite today; both run locally.
- **D29. Marks side by side on screen.** A disc that would cover an earlier one at the current zoom
  takes the next slot east of it, decided per frame, so a stage's and a node's marks at one region
  anchor, and a gate's beside them, all read.
- **The poster fallback.** While the world's chunk loads, the chain wrapper renders the same stage with
  the same image (`Poster.tsx`, inline styles); nothing moves when `WorldFrame` takes over. Measured:
  no change in LCP on this preview (the render waits for the lazy route chunk either way), kept for the
  layout's stability.

### 3.2 Needed from the owner (new since gate 3)

- **O8. Mobile LCP.** Accept the first-touch start as the phone's behaviour, with the poster (65 KB,
  ≈13 KB compressed) as its largest paint; or ask for a smaller poster (a simplified far view) and the
  sliced build of D15's first plan, to be measured again on Vercel's compressed serving.
- **O9. The pull request.** It is a draft with this report linked; marking it ready waits on rule 10
  and your "lanjut" at this gate (mega prompt §14).

## 4. Deviations

- Mega prompt §11 "Lighthouse budgets… LCP and CLS no worse than before": CLS holds on both profiles;
  LCP holds on desktop within 0.25 s and misses on the mobile profile by 0.98 s (§1.4, O8).
- §11 "contrast on the board": Lighthouse's accessibility audit (98, the one failing audit is the
  site's footer heading order on `main` too) covers the landing page, not the board's dialog; the
  board uses the site's foreground, muted-foreground and border tokens on the background token, the
  same pairs the model page uses. No separate contrast measurement was run on the board.
- §11 "frame-time sampling… p50 and p95 on the test machine": sampled and reported
  (`measurements.json`, the browser suite's annotation), not asserted, because this machine renders
  on SwiftShader (p50 417 ms, p95 833 ms at the middle view).
- The flag-off visual regression is a script result (`measurements.json`: landing identical to `main`,
  About differing by the same 35 pixels `main` differs from itself) and a unit test (no world markup
  with the flag off), not a Playwright screenshot assertion: screenshot baselines from a software GPU
  would not hold on another machine.
- Vendored Factory Yard files: the ported kernel, theme, context, clock and view carry the header;
  the simulation and world modules were replaced (gate 2, §4). `npm run check:world` lists no pending
  engine file.

## 5. Licence and backup state

- **Licence (rule 10):** `NOTICE.md` is unchanged at this gate: ai-iso-skill MIT (reproduced),
  three.js MIT (reproduced), Factory Yard "none on record, permission pending". The pull request is a
  draft and is not marked ready.
- **Backups (rule 3):** no backup artifact exists; the migration file was applied nowhere.
- **Production (rules 1, 2):** nothing on `main`, nothing on Vercel's production settings, nothing on
  the Supabase project.

## 6. Preview URL

Not readable from this session (item P). The draft pull request's checks tab carries Vercel's preview
deployment for `feat/kawasan-industri` once it builds; the preview shows the world only with
`VITE_WORLD_KAWASAN=true` (and `VITE_FIA_PREVIEW=true` for the model links) on that environment.
