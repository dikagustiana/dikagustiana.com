# Gate E: quality

Branch `world-v2/e-quality` from `main` at `584e223` (phase D merged), 10 October 2026. PRD v2 §7 E1–E5, §8; mega prompt §7,
tasks 1–5. Gate mode: continue.

## 1. Ringkasan

1. **Browser suite: 14 kasus hijau** (≥ 12 diminta), termasuk klik lot di tiga band, label hover, kartu kendaraan,
   berhenti di jembatan timbang, cerita menyala, perjalanan Follow sampai akhir, malam pukul 20:00, ponsel 390 px,
   dan jalur keyboard untuk Stories dan Follow.
2. **Anggaran draw call PRD §6 kini diuji** di browser dengan armada berjalan: home ≤ 900, band distrik ≤ 1.300
   (peta tetap ≤ 1.200 seperti v1), band street ≤ 1.600; waktu frame dilaporkan.
3. **Lighthouse** v1 → v2, tiga ronde: LCP ponsel dengan flag menyala 4,23 → 4,28 detik di dua pass terpisah (masih dalam
   rentang ragam antar-run); uji A/B lima ronde berselang-seling: **4,24 → 4,22 detik, CLS 0 → 0** — tidak lebih buruk (E3).
4. **Aksesibilitas**: deskripsi kanvas menyebut tombol baru (S, F, Spasi, Esc); strip cerita dan hop di kartu adalah
   daftar bernomor; label hover juga dibacakan (aria-live); grup kontrol di header kini diberi `role="group"`;
   urutan fokus di kartu cerita diuji.
5. `docs/world/report-v2.md`: arsitektur, probe v1 → A → B → C → D, chunk dan anggaran, deviasi, log keputusan
   D-V2-1…12, dan daftar O-V2-1…11 untuk pemilik; `report.md` §6 menunjuk ke sana.
6. `NOTICE.md`: tidak ada kode pihak ketiga baru di v2; referensi `traffic.ts` yang sudah dihapus diperbaiki.
7. Unit **1.152 tes** hijau (76 tes baru sepanjang v2; lantai 1.148); build flag-off **identik byte demi byte** dengan
   `main` (210 berkas).
8. Probe tidak berubah dari gate D (E tidak menyentuh engine): hero 182 dari 211 bergerak, 4,7 px/s, 216 draw call.
9. Untuk pemilik: daftar O-V2-1…11 di `report-v2.md` §8; flag di produksi tetap keputusan pemilik.

## 2. Evidence

### 2.1 Tests and checks

```
$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=vitest.json && node scripts/assert-test-count.mjs vitest.json
assert-test-count: 1152 tests, 0 failed, 0 failed suite(s) (floor 1148)    # 1076 before v2; 1151 at gate D
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
$ npm run check:world
wired files clean · load order ok · no Factory Yard code in src/
$ npm run typecheck        (clean)
$ npm run test:e2e:world
14 passed                    # 7 before v2; 13 at gate D; one new: the keyboard path
```

The browser suite against PRD v2 E1: click a lot at three bands, the hover label (case 4); a vehicle's card (5); a
weighbridge stop (9); a story lit (6); a Follow ride, a card read at each stop (7); night at 20:00 (10); phone at
390 px (12); the keyboard path through the stories and Follow (8); draw-call budgets asserted and frame times
reported after 600 simulated seconds with zero console errors (1). Mount and dispose ×10 and the seeded replay stay
in the unit suite (E2).

### 2.2 Draw-call budgets (PRD v2 §6), asserted in the browser suite

| view | band | budget | asserted |
|---|---|---|---|
| home (hero) | district | ≤ 900 | ≤ 900 (the probe reads 216) |
| estate | district, with the fleet at work (> 200 live) | ≤ 1,300 | ≤ 1,300 (184) |
| whole (map) | district | ≤ 1,300 | ≤ 1,200, v1's, kept (249) |
| INTP at 6 px/m | street | ≤ 1,600 | ≤ 1,600 (120) |
| B121 at the near view | inside | — | ≤ 1,900, v1's, kept |

### 2.3 Lighthouse (E3)

`node scripts/world/lighthouse.mjs --off <url> --on <url> --runs 3` (lighthouse 13.5.0, simulated throttling),
v1 (`main` at `edc944a`) before, v2 (phase D's head) after; `docs/world/frames/v2/lighthouse/{before,after}/`.

| page | performance | LCP | CLS | TBT |
|---|---|---|---|---|
| flag off, mobile | 79 → 81 | 4.32 → 4.21 s | 0.011 → 0.007 | 116 → 86 ms |
| flag off, desktop | 98 → 98 | 0.88 → 0.90 s | 0.001 → 0.001 | 0 → 0 ms |
| **flag on, mobile** | 81 → 80 | **4.23 → 4.28 s** | **0 → 0** | 59 → 87 ms |
| flag on, desktop | 80 → 83 | 0.94 → 0.92 s | 0 → 0 | 383 → 323 ms |

The flag-on mobile runs spread 4.20–4.32 s before and 4.27–4.40 s after, and the flag-off page (no world code)
moved 108 ms between the passes, so v1 and v2 were measured against each other in one pass, five interleaved rounds
(`lighthouse/ab-mobile/`, where `off` is v1 with the flag on and `on` is v2 with the flag on):

| flag on, mobile, interleaved | LCP median (runs) | CLS | TBT |
|---|---|---|---|
| v1 | 4.24 s (4.24, 4.43, 4.24, 4.24, 4.32) | 0 | 88 ms |
| v2 | **4.22 s** (4.22, 4.22, 4.25, 4.30, 4.18) | **0** | 75 ms |

What the page loads before the poster (its LCP element in both) grew by 1.4 kB: the poster of the new hero (0.5 kB)
and the header's Stories row (0.9 kB). Accessibility scores 98 → 98–99.

### 2.4 The flag-off build

```
$ npx vite build --outDir dist-off-e      (branch, flag off) → 210 files
$ diff -rq dist-off-main dist-off-e       (no difference)
$ node scripts/world/assert-world-flag.mjs
assert-world-flag: no world code in dist/ (flag off).
```

## 3. Frames

- `docs/world/frames/v2/lighthouse/{before,after,ab-mobile}/` — the Lighthouse reports (HTML) and `lighthouse.json`.
- No new world frames: E changes no drawing (gate D's frames stand).

## 4. Decisions

### 4.1 Made by the agent

1. **Lighthouse's "before" is v1** (`edc944a`, the `main` the mega prompt started from), not phase D's `main`: PRD
   v2's measure is "no worse than v1".
2. **An interleaved A/B** settles the flag-on mobile LCP: two separate passes drift by as much as the difference.
3. **The map's draw-call budget stays at v1's 1,200** in the browser suite (PRD v2 allows 1,300 at the district band);
   the near view keeps v1's 1,900.
4. **The header's groups get `role="group"`**, so their names are announced (E3); the poster fallback's header
   follows, unchanged in layout.

### 4.2 Needed from the owner

Nothing new: O-V2-1…11 are collected in `docs/world/report-v2.md` §8.

## 5. Deviations

- **Frame times** are reported by the browser suite on SwiftShader, not asserted (PRD v2 §6 says so); a GPU's
  p95 ≤ 16.7 ms is the owner's to read on the preview.

## 6. The pull request

PR_LINK
