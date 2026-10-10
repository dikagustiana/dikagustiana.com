# Laporan fase 0 — bootstrap

Branch `sweep/0-bootstrap`, dari `origin/main` @ `0487609`. Tidak ada perubahan kode di fase ini: hanya
`docs/sweep-2026-10/` dan satu entri di `docs/DECISIONS.md`.

- SHA awal: `048760967c60be64095df084eee9c9b49bff75d4` (`origin/main`, "Merge pull request #58 from
  dikagustiana/world-v2/e-quality").
- SHA akhir: lihat commit terakhir di PR fase 0 (daftar commit di bawah).

## Commit

1. `docs(sweep): the October 2026 sweep's decisions, phase table and copy folder`
2. `docs(sweep): phase 0 report and the sweep's entry in DECISIONS`

## 1. HEAD dan diff sejak `0487609`

```
$ git status --short
(kosong sebelum fase 0 dimulai)

$ git fetch origin && git rev-parse origin/main
048760967c60be64095df084eee9c9b49bff75d4

$ git diff --stat 0487609..origin/main
(kosong)
```

HEAD `main` belum bergeser dari commit referensi PRD. Semua rujukan `file:baris` di PRD berlaku untuk titik awal
setiap fase; setiap fase tetap membaca ulang file di HEAD sebelum mengedit.

## 2. Pemeriksaan database (baca saja, project `asypkbkiebjvvpimewfp`)

Dijalankan lewat Supabase `execute_sql` (hanya `select`). Tidak ada DDL, DML, perubahan exposure, atau grant.

```
select 'published_essays' as check_name, count(*)::text as result from essays where published
union all
select 'fsli_sections_with_content', count(*)::text from fsli_sections where length(content) > 0
union all
select 'fsli_pages.is_component', string_agg(column_name, ',') from information_schema.columns
  where table_name='fsli_pages' and column_name='is_component'
union all
select 'fsre_published.model_packages', count(*)::text from fsre_published.model_packages;

[{"check_name":"published_essays","result":"21"},
 {"check_name":"fsli_sections_with_content","result":"0"},
 {"check_name":"fsli_pages.is_component","result":"is_component"},
 {"check_name":"fsre_published.model_packages","result":"0"}]
```

```
select slug, selected_rank from essays where is_selected and published order by selected_rank;

[{"slug":"indonesias-reindustrialization-bet","selected_rank":1},
 {"slug":"driver-tree-construction","selected_rank":2},
 {"slug":"macro-scenario-construction-for-cfos","selected_rank":3}]
```

```
select slug, sort_order, title from finance_sections order by sort_order;

[{"slug":"fundamentals","sort_order":1,"title":"Fundamentals"},
 {"slug":"strategic-finance","sort_order":2,"title":"Strategic Finance"},
 {"slug":"planning","sort_order":3,"title":"Planning & Forecasting"},
 {"slug":"analytics","sort_order":4,"title":"Financial Analytics"},
 {"slug":"capital-allocation","sort_order":5,"title":"Capital Allocation"}]
```

| Cek | Diharapkan | Hasil |
|---|---|---|
| essay terbit | 21 | 21 |
| essay dibintangi dan terbit | 3 baris | 3 baris (rank 1–3, sesuai PRD §1.2.2) |
| `finance_sections` | 5 | 5 (tanpa baris 06) |
| `fsli_sections` berisi konten | 0 | 0 |
| `fsli_pages.is_component` | 1 baris | ada |
| `fsre_published.model_packages` | 0 | 0 |

### Live path `fsre_published` lewat Data API (anon)

Kunci anon diambil dari `get_publishable_keys` (kunci `anon` legacy, yang dipakai bundle situs). `.env` tidak ada
di checkout ini. Kunci tidak dicetak.

```
$ curl -i ${VITE_SUPABASE_URL}/rest/v1/model_packages?select=package \
    -H 'apikey: <anon>' -H 'Accept-Profile: fsre_published'
HTTP/2 200
content-type: application/json; charset=utf-8
content-length: 2
content-range: */*
content-location: /model_packages?select=package
content-profile: fsre_published
sb-project-ref: asypkbkiebjvvpimewfp

[]
```

```
$ VITE_SUPABASE_URL=… VITE_SUPABASE_PUBLISHABLE_KEY=<anon> npx vite-node scripts/world/check-published.ts
check-published: HTTP 200, 0 package(s)
exit 0
```

**`fsre_published` sudah di-expose di Data API dan anon bisa membacanya (`200 []`).** Bukan `PGRST106`, jadi
fase F langkah 2 tidak terblokir. Paket pertama belum ada (0 baris).

## 3. Branch world terhadap `main`

```
$ git ls-remote --heads origin | grep -E 'world-v[23]/'
dcafc393c29538e3f8994f6e2f6c154229a2d7c5	refs/heads/world-v2/a-scale
5b81f5a0cb249ae7583f7b69a042079448353aa3	refs/heads/world-v2/b-flows
a5b61f0bd5732c92c4ec147aa16e906c1da7d445	refs/heads/world-v2/c-activity
9073cf598c1d6aed0e07491852201c5e916eb97b	refs/heads/world-v2/d-stories
9725f5ad971cdf0ca94e7ec4293e76770adeab79	refs/heads/world-v2/e-quality

world-v2/a-scale: ahead=0 behind=45
world-v2/b-flows: ahead=0 behind=31
world-v2/c-activity: ahead=0 behind=21
world-v2/d-stories: ahead=0 behind=9
world-v2/e-quality: ahead=0 behind=1
```

(`ahead` = `git rev-list --count origin/main..origin/<branch>`.) Tidak ada branch `world-v2/*` yang mendahului
`main`, dan belum ada branch `world-v3/*`. Kelima branch v2 sudah sepenuhnya ter-merge dan boleh dihapus kapan
saja oleh Dika (tidak saya hapus).

## 4. Keadaan awal pemeriksaan repo (sebelum perubahan apa pun)

Dijalankan di `0487609` dengan `npm ci` bersih, Node v22.22.0.

```
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)        exit 0

$ npm run typecheck
> tsc -b --force                              exit 0

$ TZ=America/Chicago npx vitest run --reporter=json --outputFile=…
 Test Files  85 passed (85)
      Tests  1152 passed (1152)
$ node scripts/assert-test-count.mjs …
assert-test-count: 1152 tests, 0 failed, 0 failed suite(s) (floor 1148)
assert-test-count: ok

$ npx playwright test
  75 passed (47.1s)
```

Lint baseline 22 peringatan (batas 35). `MIN_TESTS` = 1148, aktual 1152.

## 5. Pengingat: backup belum berjalan (di luar sweep)

Secret backup GitHub Actions masih kosong (PRD §1.2.3) dan **sweep ini tidak memperbaikinya** (PRD §1.5). Bukti
dari GitHub Actions (baca saja):

- `backup.yml` ("Content backup"): 69 run, lima terakhir semuanya `failure`, terakhir run #70 pada
  2026-10-10 00:01 UTC. Membutuhkan secret `VITE_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
  (`.github/workflows/backup.yml:41-42`).
- `db-backup.yml` ("Full database backup"): 5 run, semuanya `failure`, terakhir run #5 pada 2026-10-10
  00:17 UTC. Membutuhkan `SUPABASE_DB_URL` (`db-backup.yml:47,73,93,103`) dan, untuk enkripsi artefak,
  `BACKUP_PASSPHRASE` (`:172`).

Langkah untuk Dika: GitHub → repo → Settings → Secrets and variables → Actions → New repository secret, isi
keempat nama di atas, lalu Actions → "Full database backup" → Run workflow untuk membuktikannya. Org Supabase
masih free plan (tanpa backup otomatis), jadi workflow ini satu-satunya backup.

## 6. Pertentangan dan temuan yang memengaruhi rencana

1. **CI tidak menjalankan e2e.** Prompt (cara kerja #3) menyebut CI harus hijau untuk `lint`, `typecheck`,
   `test:unit`, `test:e2e`. `.github/workflows/ci.yml` di `0487609` menjalankan eslint, typecheck, vitest +
   `assert-test-count`, `check:world`, dan `npm run build`, **tanpa Playwright**. Saya tidak menambah e2e ke CI
   (di luar cakupan sweep); di setiap fase saya menjalankan `npm run test:e2e` (dan `test:e2e:world` bila
   relevan) secara lokal dan menempel output aslinya di laporan fase.
2. **Nama branch.** Sesi ini dibuka dengan branch kerja `claude/opus-site-sweep-d68k41`; prompt meminta satu
   branch per fase dengan nama PRD §2.1 (`sweep/0-bootstrap`, `sweep/a-nav`, …). Saya mengikuti nama PRD untuk
   PR fase. Kalau push ke `sweep/*` ditolak, saya laporkan dan memakai branch sesi.
3. **Bukti izin Factory Yard (D14) tidak terlampir.** Lampiran sesi hanya tiga: PRD, `Company_models__PTBA.html`,
   dan `DGI - PT Dummy and Its subsidiaries PSAK 338.xlsx`. Jadi D14 tetap BELUM: `NOTICE.md` tidak diubah, tidak
   ada file Factory Yard yang dibaca, disalin, atau diport.
4. **Fase W terblokir** oleh dua prasyarat prompt sekaligus: D14 kosong, dan "Phases A–D merged" (W1 dimulai
   setelah A–D merge supaya `Index.tsx` stabil, PRD §2.1). Saya tidak membuat branch `world-v3/*` di sesi ini.
   Catatan kecil: prompt bagian "Reference state" menulis clone FY "only after `NOTICE.md` records the owner's
   written permission", sedangkan PRD D14 mengizinkan audit side-by-side dari clone lokal sebelum izin; PRD yang
   berlaku, tetapi W1 tetap menunggu A–D merge.
5. **`vercel.json` tidak mengelola redirect.** Isinya hanya `rewrites` (SPA ke `/index.html`) dan `headers`; tidak
   ada kunci `redirects`. Untuk fase C (R8.1) ini berarti `/about` cukup dialihkan di sisi klien (`<Navigate>`)
   sesuai PRD ("kalau tidak, cukup client-side + prerender").
6. **Akses Vercel dari sesi ini terbatas.** Vercel MCP menolak `list_deployments` (403) dan
   `filter_project_envs` (404) untuk project `dikagustiana-com` (`prj_uDxnSJx2kP4vBqtJicdkw1hnDr7Q`). Status env
   production (`VITE_WORLD_KAWASAN`, `VITE_FIA_LIVE`, `VITE_FIA_PREVIEW`) **tidak terverifikasi** dari sisi saya;
   PRD §1.2.3 menyatakannya tidak diset di production. URL Preview untuk screenshot fase B, C, F akan saya ambil
   dari status deployment di PR GitHub.

## 7. Keputusan yang saya ambil sendiri

- Kunci anon untuk `curl` diambil dari Supabase `get_publishable_keys` karena `.env` tidak ada di checkout; ini
  kunci publik yang sama dengan yang dibundel situs.
- `docs/sweep-2026-10/DECISIONS.md` menyalin PRD §1.3 baris per baris (termasuk paragraf status dan dua catatan
  O-V2 / review-registry di bawah tabel), dengan tiga kalimat pengantar di atasnya.
- Kolom Status di `README.md` diisi "diblokir" untuk W1–W4 dengan sebabnya, bukan "belum mulai", supaya jelas
  bahwa yang menunggu adalah Dika.

## 8. Yang menunggu Dika

| Apa | Langkah persis |
|---|---|
| Secret backup | Lihat §5. |
| D14 (izin Factory Yard) | Lampirkan bukti tertulis (tanggal · kanal · kutipan verbatim · cakupan publik/modifikasi/atribusi) di sesi berikutnya; fase W1 baru dimulai setelah itu dan setelah PR A–D merge. |
| Review PR fase 0 | Merge bila setuju (dokumen saja). |

## 9. Yang tidak terverifikasi

- Env Vercel production/preview (lihat §6.6): API Vercel menolak akses dari sesi ini.
- Isi secret GitHub Actions: tidak bisa dibaca dari mana pun; yang terverifikasi hanya bahwa kedua workflow
  gagal di setiap run.

## Text awaiting the owner

Tidak ada. Fase 0 tidak menambah teks yang dibaca pengunjung.
