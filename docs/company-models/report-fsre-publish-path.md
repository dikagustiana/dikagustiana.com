# Laporan: FSRE publish path, repo dikagustiana.com (M4, bagian M5)

Pelaksana: Claude Code, 8 Okt 2026. PRD: Personal OS `docs/lab/fsre-publish-path/PRD.md` §6.3.
Branch: `feat/fia-live`, draft PR https://github.com/dikagustiana/dikagustiana.com/pull/44. Dika yang merge, dan Dika yang menyalakan `VITE_FIA_LIVE` di production setelah paket asli pertama (O3).

## 1. SHA dan commit

| | SHA |
|---|---|
| Awal (acuan PRD, HEAD `main` saat clone) | `bed215d` |
| Akhir | `46825d8` |

| Commit | Isi |
|---|---|
| `5f55c92` | `feat(fia)`: flag `__FIA_LIVE__`, registry published-only (`live.ts`, `useLiveRegistry.ts`), halaman dipecah jadi body + wrapper preview/live, error `not-available` / `refused` / `failed` (`published.ts`, `PublishedNote`), `tests/unit/fiaLive.test.tsx`, `MIN_TESTS` 921 → 957 |
| `62623aa` | `build`: `assert-no-synthetic.mjs` memeriksa build live terhadap **nilai fixture** (versi, content hash, kode sub-industri, id link) dan chunk halaman preview; menolak dua flag sekaligus |
| `1f07ecd` | `docs(fia)`: `schema-proposal-v3.md` membaca `model_packages` (G9) |
| `46825d8` | `fix(fia)`: paket dengan sub-industri yang tidak ada di `sub-industries.json` masuk `rejected` dengan alasan, bukan hilang diam-diam (temuan M5); `MIN_TESTS` 958 |

## 2. Output verifikasi (asli, perintah yang sama dengan `.github/workflows/ci.yml`)

```
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)        (baseline main: 22; plafon 35)
$ npm run typecheck                            > tsc -b --force   (bersih)
$ TZ=America/Chicago npx vitest run --reporter=default --reporter=json --outputFile=vitest-report.json
 Test Files  60 passed (60)
      Tests  962 passed (962)
$ node scripts/assert-test-count.mjs vitest-report.json
assert-test-count: 962 tests, 0 failed, 0 failed suite(s) (floor 957)   → setelah commit terakhir floor 958
assert-test-count: ok
$ npm run build
✓ built in 8.41s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
prerender: SKIPPED — no VITE_SUPABASE_PUBLISHABLE_KEY in this environment. (seperti di CI)
$ VITE_FIA_LIVE=true npx vite build && VITE_FIA_LIVE=true node scripts/assert-no-synthetic.mjs
✓ built in 16.92s
assert-no-synthetic: live build; none of 11 fixture values and no preview page chunk in dist/.
$ (kontrol negatif) VITE_FIA_PREVIEW=true npx vite build; VITE_FIA_LIVE=true node scripts/assert-no-synthetic.mjs
assert-no-synthetic: a live build (VITE_FIA_LIVE=true) carries a fixture:
  dist/assets/FiaIndexPage-CwZB9hiP.js is a preview page chunk
  dist/assets/FiaModelRoute-BVYqd4SY.js is a preview page chunk
  dist/assets/unitEconomics-Ck9rHPk9.js carries SCEM.SYNTHETIC.json: version SCEM-2025Q4-r1-SYNTHETIC
$ VITE_FIA_LIVE=true VITE_FIA_PREVIEW=true node scripts/assert-no-synthetic.mjs
assert-no-synthetic: VITE_FIA_LIVE=true together with VITE_FIA_PREVIEW=true. The live section carries no fixture; unset one of them.   (exit 1)
```

## 3. Apa yang dibangun (PRD §6.3)

**A. Jalur production (G7).** `vite.config.ts` mendefinisikan `__FIA_LIVE__` dari `VITE_FIA_LIVE === 'true'` (pola `__FIA_PREVIEW__`). `App.tsx`: preview → `FiaIndexPage`/`FiaModelRoute`; live → `FiaLiveIndexPage`/`FiaLiveModelRoute`; keduanya mati → halaman lama, tidak berubah. Body halaman (`FiaIndex.tsx`, `FiaModelRouter.tsx`) menerima hook registry sebagai prop, sehingga modul live tidak pernah mengimpor `preview.ts` (glob fixture). `live.ts`: hanya paket `provenance === 'filings'` yang masuk `buildRegistry`; yang lain masuk `rejected` dengan alasan; slate (`slate.json`, nama dan ticker saja), `sub-industries.json`, `links.json` asli. Index tanpa paket = slate berstatus "Planned; no model yet."

**B. Error yang rapi (G8).** `published.ts` melempar `PublishedReadError{reason}`: `not-available` (404, atau kode PostgREST `PGRST106`/`42P01`), `refused` (401/403), `failed` (lainnya). `PublishedNote` di live menampilkan satu kalimat per kasus tanpa angka (`COPY.liveNotAvailable` / `liveRefused` / `liveFailed`); di preview tetap kalimat lama plus alasan. Fixture tidak pernah menjadi fallback di live.

**C. Dokumen (G9).** `schema-proposal-v3.md` kini menyebut `fsre_published.model_packages` (0004_live) sebagai yang dibaca situs; `model_snapshots`/`workbooks` adalah jalur `tools/publish.py`.

**Bukti bundle.** Dua lapis: tes import-graph (`fiaLive.test.tsx`, "no fixture reaches the live bundle": modul yang terjangkau dari `FiaLiveIndexPage`/`FiaLiveModelRoute` lewat import statis tidak memuat berkas `SYNTHETIC` maupun `preview.ts`, dengan `FiaIndexPage` sebagai kontrol yang memang memuatnya) dan `assert-no-synthetic.mjs` pada dist build live (nilai-nilai fixture dibaca dari berkas fixture saat cek, jadi cek tidak bisa inert diam-diam).

## 4. Perbedaan repo vs PRD, dan keputusan sendiri

| # | Hal | Keputusan / alasan |
|---|---|---|
| 1 | PRD: "buktikan fixture tidak di-glob" dengan marker `SYNTHETIC` | Kata `SYNTHETIC` **memang ada** di kode viewer (badge, catatan provenance, aturan kontrak bahwa paket sintetis menyebut dirinya), jadi build live selalu memuat kata itu walau tanpa fixture. Pengecekan build live memakai nilai fixture (versi, content hash, kode sub-industri, id link) + nama chunk halaman preview. Build tanpa flag tetap diperiksa persis seperti sebelumnya. |
| 2 | PRD: "Halaman menampilkan kalimat yang jujur ('Model belum bisa dimuat')" | Teks situs British English (aturan repo), jadi kalimatnya `The published models could not be loaded…` dst. Tiga kalimat, tanpa angka, diuji. |
| 3 | Halaman dipecah (body + dua wrapper) | Satu-satunya cara yang bisa dibuktikan supaya chunk preview (dengan fixture) tidak ikut saat live: `FiaIndexPage` lama mengimpor `usePreviewRegistry` → `preview.ts` → glob fixture. Default export `FiaIndexPage`/`FiaModelRoute` dipertahankan, tes lama tidak berubah. |
| 4 | `registry.ts` menolak sub-industri yang tidak terdaftar (di luar daftar PRD) | Temuan M5: paket golden SYNP dari suite membawa `subIndustry: "SYNPROC"`, tidak ada di `sub-industries.json` maupun di daftar sintetis preview, dan halaman **tidak menampilkan apa-apa dan tidak mengatakan apa-apa**. Sekarang masuk `rejected` dengan alasan. Berlaku untuk preview juga (fixture-nya terdaftar semua, tes lama tetap hijau). Konsekuensi praktis: `sub-industries.json` harus memuat sub-industri pilot **sebelum** paket asli pertama di-approve. |
| 5 | `slate.json` berada di folder `fixtures/` | Dipakai di live (nama/ticker saja, tanpa angka, tanpa marker); tidak dipindah karena PRD menyebutnya sebagai slate. |
| 6 | `MIN_TESTS` | Dinaikkan dua kali (957, lalu 958 = aktual − 4), tidak pernah turun. |

## 5. Bagian M5 yang menyentuh repo ini

Situs di-build dari working tree dengan `VITE_SUPABASE_URL=http://127.0.0.1:54329` ke stand-in PostgREST (Python, menjalankan `SELECT package FROM fsre_published.model_packages` sebagai `anon` di Postgres scratch 16 dengan 0000→0005; **bukan** PostgREST asli), disajikan `vite preview --host 127.0.0.1`, dan dibaca Chromium lewat Playwright (`scratchpad/m5/site_check.mjs`). Permintaan yang tercatat di setiap putaran: `GET /rest/v1/model_packages?select=package Accept-Profile=fsre_published` (satu-satunya panggilan `/rest/v1/`).

| Putaran | Keadaan database | Build live | Build preview |
|---|---|---|---|
| 1 (sebelum fix §4.4) | r1 `filings`, `SYNPROC`, published | tidak ada alert, SYNP **tidak tampil, tanpa penjelasan**; empat perusahaan slate "planned"; tidak ada kata SYNTHETIC | sama, plus banner preview |
| 1 (setelah fix) | sama | alert "Not shown: … SYNP: meta.subIndustry SYNPROC is not a sub-industry the section lists…" | alert yang sama |
| 2 | r2 `synthetic`, `SYN-CEM`, published; r1 withdrawn | alert "Not shown: … SYNP: meta.provenance synthetic is not filings; production shows models built from filings only"; tidak ada kata SYNTHETIC di halaman | SYNP tampil di index; `/finance/finance-in-action/synp` membuka model page "Synthetic Process Co (SYNTHETIC) SYNP" dengan 51 sel grid |

Yang **tidak terverifikasi** di sini: PostgREST asli (header `Accept-Profile`, kode `PGRST106` saat schema belum di-expose) dan deploy Vercel. Keduanya menunggu bring-up database (fsre-skills PR #1) dan preview deploy oleh Dika.

## 6. Yang menunggu Dika

| Langkah | Perintah persis |
|---|---|
| Preview deploy Vercel branch `feat/fia-live` dengan `VITE_FIA_LIVE=true` (dan `VITE_FIA_PREVIEW` kosong) | Vercel → project situs → Deployments → branch `feat/fia-live` → Environment Variables (Preview) `VITE_FIA_LIVE=true` → Redeploy. Harapan: `/finance/finance-in-action` menampilkan empat perusahaan slate sebagai planned dan kalimat "The published models are not available yet…" sampai database FSRE hidup; tidak ada SYNTHETIC. |
| Merge PR #44 | GitHub |
| Production: `VITE_FIA_LIVE=true` | Baru setelah paket asli pertama di-approve di 4F (O3). |
| `sub-industries.json` memuat sub-industri pilot | Sebelum paket asli pertama; kalau tidak, situs menolaknya dengan alasan `meta.subIndustry`. |
