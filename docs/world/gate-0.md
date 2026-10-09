# Gate 0: discovery and plan

Branch `feat/kawasan-industri`, 8 October 2026. Companion: `docs/world/discovery.md`.

## 1. Ringkasan

1. Phase A selesai: `docs/world/discovery.md` memetakan peta rantai, flag, data layer Finance in Action, skema esai, routing, tema, tes, backup, Factory Yard, dan lisensi, lengkap dengan file dan nomor baris.
2. Tidak ada kode produk yang ditulis; cuma dua commit dokumen di branch ini, `main` tidak disentuh, database tidak disentuh (hanya pembacaan metadata dan satu request anon REST yang sama persis dengan jalur `published.ts`).
3. Temuan paling penting: skema `fsre_published` **belum di-expose** di Data API (PGRST106), jadi jalur baca model yang ada sekarang gagal 406 dan keberadaan paket INTP tidak bisa diketahui dari situs sampai Mas expose skemanya.
4. Backup **belum pernah berhasil**: 67 run content backup dan 3 run full backup semuanya gagal karena secret kosong; aturan 3 belum terpenuhi, jadi migrasi tag esai nanti cuma ditulis sebagai file, tidak diterapkan di mana pun sampai secret diisi.
5. Beberapa asumsi PRD tidak cocok dengan repo: tidak ada hero di landing (peta rantai adalah layar pertama dan membawa h1), tidak ada komponen drill-down listrik, tidak ada baris bukti `(value, source, year, link)` di data, tidak ada theme switch, tidak ada section "Industry analysis", dan `peers.ts` menggambar band dari dua titik.
6. Flag situs adalah konstanta build-time (`__FIA_PREVIEW__`); `world_kawasan` akan mengikuti pola yang sama (`VITE_WORLD_KAWASAN`), sehingga dengan flag mati chunk world tidak ikut ter-bundle sama sekali.
7. Baseline hijau: lint 0 error / 22 warning, typecheck bersih, 932 unit test lulus (floor 921), 72 e2e lulus.
8. Factory Yard `148758a` sudah diperiksa file per file: 29 file diporting (2 apa adanya, 5 diketik, 22 diadaptasi), 44 tidak, `index.ts` ditulis ulang jadi `createWorld`; **belum ada file lisensi** di repo itu, ai-iso-skill MIT © 2026 Tolga Cohce.
9. Yang perlu Mas lihat: 18 keputusan A–R di `discovery.md` §10.3 (masing-masing sudah ada default-nya), terutama A (expose skema), B (secret backup), D (drill-down), F (layar pertama), H (tema).
10. Yang terblokir: URL preview Vercel tidak bisa dibaca dari sesi ini (403), migrasi tidak boleh diterapkan sampai backup jalan, dan PR nanti tetap draft sampai `NOTICE.md` memuat izin Factory Yard.

## 2. Evidence

Commands run on this branch at `f618e9f` (plus the untracked discovery document), Node v22.22.0:

```
$ npm ci --no-audit --no-fund            # ok
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)    # exit 0
$ npm run typecheck                      # tsc -b --force, no output, exit 0
$ TZ=America/Chicago npx vitest run --reporter=default --reporter=json --outputFile=vitest-report.json
 Test Files  59 passed (59)
      Tests  932 passed (932)
   Duration  36.02s
$ node scripts/assert-test-count.mjs vitest-report.json
assert-test-count: 932 tests, 0 failed, 0 failed suite(s) (floor 921)
assert-test-count: ok
$ CI=1 npx playwright test
  72 passed (45.5s)                      # exit 0
```

Published models, through the site's own anonymous read path (key redacted):

```
$ curl -sS -H "apikey: <publishable key>" -H "Accept-Profile: fsre_published" \
    "https://asypkbkiebjvvpimewfp.supabase.co/rest/v1/model_packages?select=package->meta->>ticker"
HTTP 406
{"code":"PGRST106","details":null,"hint":"Only the following schemas are exposed: public, graphql_public","message":"Invalid schema: fsre_published"}
```

Read-only Supabase management calls: `get_project` → `ACTIVE_HEALTHY`, Postgres 17.6.1.155,
ap-southeast-1; `list_tables(fsre_published)` → `{"tables":[]}`; `list_branches` → `[]`;
`list_migrations` → 21 versions (four not in the repository, named in `discovery.md` §4.3). No SQL
was executed.

Backups (GitHub Actions, read-only): `backup.yml` 67 runs, latest 37706401014 failed at "Dump all
content" with `FATAL: VITE_SUPABASE_URL not set`; `db-backup.yml` 3 runs, latest 37707478786 failed
at "Refuse to run without the connection secret", `no dump to package`, no artifact uploaded.

Factory Yard clone at `148758ae19a9b2201245485bf3619ab5e742f8f4`: 74 `.ts` files, 13,362 lines,
44 with `// @ts-nocheck`, no `LICENSE` file (`ls` output quoted in `discovery.md` §9).

File integrity of the first commit: SHA-256 of the committed copies equals the owner's uploads
(`PRD` `d446832f…ca5`, `MEGA-PROMPT` `7f3e7a8f…e04`, `idx-ic-subsektor.tsv` `4d16e2bf…54d`).

## 3. Decisions

Made by the agent, with the reason:

1. The branch's first commit was amended once to correct its author to the environment's configured identity (it had been stamped with the owner's name by mistake); the branch had one commit and no other reader, so a force-with-lease push was safe.
2. `world_kawasan` will be a build-time constant like `__FIA_PREVIEW__`, because that is the site's only flag mechanism and it gives dead-code elimination for free.
3. The world will not import `preview.ts` (SYNTHETIC fixtures), only `published.ts` and `registry.ts`, so `assert-no-synthetic.mjs` keeps holding.
4. Tests go under `tests/unit/` and `tests/e2e/`, the repository's convention; the poster is committed as well as generated, with a drift test.

Needed from the owner, numbered A–R in `discovery.md` §10.3, each with the default that will be
used if unanswered. The five that change the most: **A** expose `fsre_published` in the Data API;
**B** set the backup secrets and run both workflows; **D** what the energy drill-down opens;
**F** the world as the landing page's first screen carrying the `h1`; **H** no theme button in the
frame.

## 4. Deviations

- From the mega prompt §3 layout: tests under `tests/`, board page under `src/pages/world/`, flag at `src/lib/world/flag.ts`, poster committed. Reasons in `discovery.md` §10.1.
- From the PRD: items D, E, F, H, I, Q in `discovery.md` §10.3 are places where the PRD describes repository state that does not exist; the defaults keep the PRD's intent without adding data the PRD forbids.

## 5. Licence and backup state

- **Licence (rule 10):** Factory Yard has no licence file at `148758a` and no written permission is on record. ai-iso-skill is MIT, © 2026 Tolga Cohce. The pull request cannot be marked ready until `NOTICE.md` records one or the other; this will be repeated at every gate.
- **Backups (rule 3):** not verified; both workflows fail on missing secrets and have never uploaded an artifact. No migration will be applied anywhere until a run succeeds.

## 6. Preview URL

Not retrievable from this session: `GET /v7/deployments` for project `dikagustiana-com`
(team `dikagirawan-4804s-projects`) answered `403 forbidden`. The branch is pushed; if the Vercel
Git integration is on, the preview is the deployment for `feat/kawasan-industri` in the Vercel
dashboard, or the GitHub deployment status on commit `f618e9f`.
