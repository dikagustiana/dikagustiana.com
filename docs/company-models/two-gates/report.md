# Laporan: Finance in Action, dua jalur masuk (FSRE dan manual)

Pelaksana: Claude Code, 22 Okt 2026. Spesifikasi: `PRD.md`, `PLAN.md`, `PROMPT.md` di folder ini. Fase 1–5
dikerjakan; fase 0 dan 6 milik Dika (langkahnya di bagian 5 dan `RUNBOOK.md`). Draft PR: https://github.com/dikagustiana/dikagustiana.com/pull/76.

**Database production tidak ditulis sama sekali.** Yang dilakukan di production hanya `SELECT` (lewat Supabase
MCP) dan satu `GET` anonim ke PostgREST dengan kunci publik situs. Migrasi dan tes SQL dijalankan di Postgres
lokal; hasilnya di bagian 2.2.

## 1. SHA dan commit

| | SHA |
|---|---|
| Awal (`main`, HEAD saat clone) | `b6fd24c` |
| Akhir (commit terakhir sebelum laporan ini; laporan dan `output/` di-commit sesudahnya) | `5590a00` |

Branch: `claude/fia-two-gates-gslvkn` (lihat 3.2 no. 1 soal nama branch).

| Commit | Isi |
|---|---|
| `bf23f8b` | `docs(fia)`: PRD.md, PLAN.md, PROMPT.md apa adanya (commit pertama, sesuai prompt) |
| `a350387` | `docs(fia)`: snapshot `fsre*` production sebelum migrasi (`fsre-snapshot.md`) dan query fingerprint `supabase/tests/fsre_fingerprint.sql` |
| `b5e86df` | `feat(fia)`: migrasi `20261022100000_fia_two_gates.sql` dan tes SQL `fia_manual_release.sql` |
| `9e98ea5` | `feat(fia)`: situs membaca `fia.model_packages` (`published.ts`, `check-published.ts`), tes `fiaTwoGates.test.ts` |
| `b993f9d` | `feat(fia)`: `publish-manual.ts`, `run-sql.ts`, `db.ts`, `manual-release.ts`, tes `fiaPublishManual.test.ts`, dependency `pg` |
| `1be460b` | `feat(fia)`: INDY, ADRO, BREN di slate dan sub-industri baru (D6, D7), screenshot, `MIN_TESTS` 1344 → 1380 |
| `7dfc1e4` | `docs(fia)`: RUNBOOK.md, DECISIONS.md D1–D7, `.env.example`; perbaikan prioritas password di `db.ts` dan satu kasus tes SQL yang rapuh |
| `01697f1` | `docs(fia)`: `schema-proposal-v3.md` menyebut `fia.model_packages` |
| `5590a00` | `fix(fia)`: temuan review independen (3.4): pembaca FSRE tidak lagi menjatuhkan jalur manual, CLI tidak lagi berkata "Nothing written" sesudah commit, tes A6 diperketat, approval masa depan ditolak, trigger `ENABLE ALWAYS`; `MIN_TESTS` 1380 → 1384 |

## 2. Output verifikasi

Output lengkap apa adanya ada di `output/` (satu file per perintah). Di bawah: kutipan yang menentukan.

### 2.1 CI, perintah yang sama dengan `.github/workflows/ci.yml`

Dijalankan pada `5590a00`; setiap file di `output/ci-*.txt` dimulai dengan perintahnya dan diakhiri `[exit N]`.

```
$ npx eslint . --max-warnings=35
✖ 22 problems (0 errors, 22 warnings)
[exit 0]
```
Baseline `main`: 22 warning; plafon 35. Ke-22 warning ada di file yang tidak disentuh branch ini
(`output/ci-1-eslint.txt`).

```
$ npm run typecheck
> vite_react_shadcn_ts@0.0.0 typecheck
> tsc -b --force
[exit 0]
```

```
$ TZ=America/Chicago npx vitest run --reporter=default --reporter=json --outputFile=vitest-report.json
 Test Files  100 passed (100)
      Tests  1388 passed (1388)
[exit 0]
$ node scripts/assert-test-count.mjs vitest-report.json
assert-test-count: 1388 tests, 0 failed, 0 failed suite(s) (floor 1384)
assert-test-count: ok
[exit 0]
```
`main`: 1348 tes, floor 1344. Branch ini: +40 tes (14 `fiaTwoGates`, 25 `fiaPublishManual`, 1 slate D7), floor
dinaikkan dua kali (1380, lalu 1384 = aktual − 4), tidak pernah diturunkan.

```
$ python3 -m unittest discover -s scripts/tests -v
Ran 60 tests in 1.105s
OK
[exit 0]
$ python3 scripts/fs_check.py data/fs/phe/fy2024/statements.json --failures-only
RULE  EXPECTED  ACTUAL  DIFF  RESULT

175 rules: 175 passed, 0 failed.
[exit 0]
$ npm run check:world
40 files · 37 wired from the entry · 3 pending
pending (not wired from the entry): data/boundary.ts, placement/empty.ts, placement/layout.generated.ts
wired files clean
load order ok
no Factory Yard code in src/
[exit 0]
$ npm run build
> node --experimental-strip-types scripts/world/render-poster.mjs && vite build && node scripts/assert-no-synthetic.mjs && node scripts/world/assert-world-flag.mjs && node scripts/prerender.mjs
✓ built in 10.23s
assert-no-synthetic: no "SYNTHETIC" in dist/ (preview flag off).
assert-world-flag: no world code in dist/ (flag off).
prerender: SKIPPED — no VITE_SUPABASE_PUBLISHABLE_KEY in this environment. The SPA build is complete; per-essay share cards are NOT pre-rendered. Expected on CI (no secrets); a deploy would fail instead of skipping.
[exit 0]
$ VITE_FIA_LIVE=true npx vite build && VITE_FIA_LIVE=true node scripts/assert-no-synthetic.mjs
✓ built in 17.10s
assert-no-synthetic: live build; none of 11 fixture values and no preview page chunk in dist/.
[exit 0]
```

### 2.2 Tes SQL, di Postgres lokal dengan `pg_jsonschema`

**Lingkungan.** Tidak ada Docker daemon di sesi ini, jadi bukan image `supabase/postgres`. Yang dipakai:
PostgreSQL 16.15 (paket Ubuntu) dengan **`pg_jsonschema` 0.3.3** (versi yang ditawarkan project production,
dibangun dari tag `v0.3.3` dengan `cargo pgrx` 0.12.6). Peran disusun seperti Supabase: superuser
`supabase_admin`; `postgres` bukan superuser, anggota `anon`, `authenticated`, `service_role`; skema
`extensions` dengan default ACL yang sama dengan production (fungsi tidak bisa dieksekusi `PUBLIC`).
Migrasi dan tes dijalankan **sebagai `postgres`**, seperti `apply_migration` dan SQL Editor di production
(objek migrasi lama di production dimiliki `postgres`; dicek read-only).

Dua database baru:
- `run_empty`: tanpa skema FSRE sama sekali (A2, "database kosong");
- `run_fsre`: dengan stand-in FSRE: `fsre.package_release` dan `fsre.manifest` dengan kolom production
  (`information_schema`, dibaca 22 Okt) dan view `fsre_published.model_packages` dengan teks
  `pg_get_viewdef` production, grant `anon` seperti production. Stand-in ini hanya di scratchpad sesi, tidak
  di-commit (definisinya milik `fsre-skills`, repo ini publik).

Beda dengan production yang tidak tertutup di sini: versi server (16 vs 17.6), `CREATE EXTENSION` lewat
supautils (di lokal ekstensi sudah dipasang superuser, jadi baris itu `skipping`), PostgREST asli.

**A2: migrasi.** Bersih di kedua database (`output/run_empty-2-migration.txt`, `output/run_fsre-2-migration.txt`):

```
$ psql (postgres) -d run_fsre -f supabase/migrations/20261022100000_fia_two_gates.sql
psql:supabase/migrations/20261022100000_fia_two_gates.sql:63: NOTICE:  schema "extensions" already exists, skipping
CREATE SCHEMA
psql:supabase/migrations/20261022100000_fia_two_gates.sql:64: NOTICE:  extension "pg_jsonschema" already exists, skipping
CREATE EXTENSION
DO
CREATE SCHEMA
COMMENT
CREATE SCHEMA
COMMENT
CREATE TABLE
COMMENT
INSERT 0 1
CREATE TABLE
COMMENT
CREATE FUNCTION
CREATE TRIGGER
CREATE FUNCTION
CREATE TRIGGER
CREATE FUNCTION
CREATE TRIGGER
CREATE TRIGGER
CREATE FUNCTION
CREATE VIEW
COMMENT
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
REVOKE
REVOKE
REVOKE
GRANT
GRANT
GRANT
NOTIFY
[exit 0]
```

**A7 lokal: fingerprint `fsre*` sebelum dan sesudah migrasi identik** (`output/run_fsre-1…`, `-3…`, `-4…`):

```
$ psql (postgres) -d run_fsre -f supabase/tests/fsre_fingerprint.sql   # before
kind | schema | name | digest
constraint | fsre | manifest.manifest_pkey | 9410801fc3a0efb2b27d9f651284c0c4
constraint | fsre | package_release.package_release_pkey | 9410801fc3a0efb2b27d9f651284c0c4
index | fsre | manifest_pkey | 33cfef7eae28fd61a705ebeded5966c2
index | fsre | package_release_pkey | 28f4b6e5485c757763f1fbf2dbf4dbc1
outside-dependants | - | - | 0
relation:r | fsre | manifest | 7145b0bd7d15c41bfc8f1b5a75b6a3e1
relation:r | fsre | package_release | 5e6ab0b1f17e0dbe9946ff2dabe818db
relation:v | fsre_published | model_packages | f5e8a4024a765a1552850fe8f5b87bc6
schema | fsre | fsre | 3e6e809a646762a850487c1ba32c11b1
schema | fsre_published | fsre_published | de7ff9ab58e0a9e75a5b62162d6bd81f
total | - | 10 | 0223689600a03d6785c7c2a879a22c93
(11 rows)
[exit 0]
$ diff <before> <after>   # header line aside
IDENTICAL
```

`outside-dependants` tetap 0: view `fia` tidak tercatat bergantung pada objek `fsre*` (pembaca FSRE ada di
fungsi plpgsql). Production (read-only, sebelum migrasi): 229 objek, `total` `201cddfeaa5ae54387a05fa5e47d6d79`,
`outside-dependants` 0 (`fsre-snapshot.md`); pembandingan sesudah migrasi = langkah Dika (bagian 5).

**A3–A6: tes SQL (86 kasus).** Satu transaksi, `ROLLBACK` di akhir. Hasil sama di kedua database
(`output/run_empty-5-sql-tests.txt`, `output/run_fsre-5-sql-tests.txt`; di bawah `run_fsre`, baris hasil saja):

```
PASS  D4 contract: fia.contract_schema holds proposal-v3.1, a valid JSON Schema (draft-07)  (got proposal-v3.1:true:http://json-schema.org/draft-07/schema#, expected proposal-v3.1:true:http://json-schema.org/draft-07/schema#)
PASS  D4 contract: the SYNTHETIC fixture as filed matches the stored schema  (got true, expected true)
PASS  D4 contract: the schema's $ref definitions are applied (a bad rowRef does not match)  (got false, expected false)
PASS  D4 contract: the stored contract cannot be changed  (refused: 23514 contract_schema_insert_only, fia.contract_schema proposal-v3.1 cannot be changed or deleted; a new contract is a new row)
PASS  D4 contract: the stored contract cannot be deleted  (refused: 23514 contract_schema_insert_only, fia.contract_schema proposal-v3.1 cannot be changed or deleted; a new contract is a new row)
PASS  D4 contract: the stored contract cannot be truncated  (refused: 23514 contract_schema_no_truncate, fia.contract_schema cannot be truncated)
PASS  FSRE reader: reads every row of fsre_published.model_packages, or none where it does not exist  (got true, expected true)
PASS  FSRE reader: anon reads fia.model_packages with the FSRE channel in it, without an error  (got true, expected true)
PASS  A7 fsre untouched: no view outside fsre* depends on an fsre* object  (got 0, expected 0)
PASS  R1 positive: a filings package that matches the contract is staged  (accepted)
PASS  R1 JSON Schema: a cell without a kind is refused  (refused: 23514 manual_release_contract, fia.manual_release XCOA r-schema-1 does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 JSON Schema: a key the contract does not have is refused  (refused: 23514 manual_release_contract, fia.manual_release XCOA r-schema-2 does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 JSON Schema: a rowRef that is not <sheet>!<row> is refused  (refused: 23514 manual_release_contract, fia.manual_release XCOA r-schema-3 does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 JSON Schema: a sourced cell without a source is refused  (refused: 23514 manual_release_contract, fia.manual_release XCOA r-schema-4 does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 JSON Schema: a meta.status outside the enumeration is refused  (refused: 23514 manual_release_contract, fia.manual_release XCOA r-schema-5 does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 JSON Schema: a staged row edited into a package that does not match is refused  (refused: 23514 manual_release_contract, fia.manual_release XCOA XCOA-2025Q4-r1-SYNTHETIC does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 meta.ticker: a ticker column other than meta.ticker is refused  (refused: 23514 manual_release_meta_ticker, new row for relation "manual_release" violates check constraint "manual_release_meta_ticker")
PASS  R1 meta.ticker: a ticker that is not 2 to 8 capitals or digits is refused  (refused: 23514 manual_release_contract, fia.manual_release xcoa r-meta-2 does not match the contract (model-package.schema.json, proposal v3.1))
PASS  R1 meta.version: a version column other than meta.version is refused  (refused: 23514 manual_release_meta_version, new row for relation "manual_release" violates check constraint "manual_release_meta_version")
PASS  R1 meta.contentHash: a content_hash column other than meta.contentHash is refused  (refused: 23514 manual_release_meta_content_hash, new row for relation "manual_release" violates check constraint "manual_release_meta_content_hash")
PASS  R1 meta.contentHash: a content_hash that is not 64 lower-case hex digits is refused  (refused: 23514 manual_release_content_hash_format, new row for relation "manual_release" violates check constraint "manual_release_content_hash_format")
PASS  R1 provenance: the SYNTHETIC fixture as filed (provenance synthetic) is refused  (refused: 23514 manual_release_provenance_filings, new row for relation "manual_release" violates check constraint "manual_release_provenance_filings")
PASS  R1 provenance: provenance fixture is refused  (refused: 23514 manual_release_provenance_filings, new row for relation "manual_release" violates check constraint "manual_release_provenance_filings")
PASS  R1 published approved: published without approved_by is refused  (refused: 23514 manual_release_published_approved, new row for relation "manual_release" violates check constraint "manual_release_published_approved")
PASS  R1 published approved: published with a blank approved_by is refused  (refused: 23514 manual_release_published_approved, new row for relation "manual_release" violates check constraint "manual_release_published_approved")
PASS  R1 published approved: published without approved_at is refused  (refused: 23514 manual_release_published_approved, new row for relation "manual_release" violates check constraint "manual_release_published_approved")
PASS  R1 published approved: a staged row moved to published without an approver is refused  (refused: 23514 manual_release_published_approved, new row for relation "manual_release" violates check constraint "manual_release_published_approved")
PASS  R1 approval time: published with an approval time in the future is refused (it would win D2 until withdrawn)  (refused: 23514 manual_release_approved_not_future, fia.manual_release XCOA r-time-1: approved_at 2026-10-23 08:19:14.610916+00 is in the future)
PASS  R1 approval time: a staged row moved to published with a future approval time is refused  (refused: 23514 manual_release_approved_not_future, fia.manual_release XCOA XCOA-2025Q4-r1-SYNTHETIC: approved_at 2026-10-23 08:19:14.610916+00 is in the future)
PASS  R1 approval time: published with the approval time now is accepted  (accepted)
PASS  R1 published approved: published with an approver and a time is accepted  (accepted)
PASS  R1 failed gate: published with a failed gate is refused  (refused: 23514 manual_release_published_no_failed_gate, new row for relation "manual_release" violates check constraint "manual_release_published_no_failed_gate")
PASS  R1 failed gate: a staged row with a failed gate moved to published is refused  (refused: 23514 manual_release_published_no_failed_gate, new row for relation "manual_release" violates check constraint "manual_release_published_no_failed_gate")
PASS  R1 failed gate: staged with a failed gate is accepted (it is not shown)  (accepted)
PASS  R1 failed gate: published with passed and passed_with_escalation gates is accepted  (accepted)
PASS  R1 unique: a second row for the same ticker and version is refused  (refused: 23505 manual_release_pkey, duplicate key value violates unique constraint "manual_release_pkey")
PASS  R1 unique: the same ticker under a new version is accepted  (accepted)
PASS  R1 status: a new row that is withdrawn is refused  (refused: 23514 manual_release_new_row_status, a new fia.manual_release row is staged or published, not withdrawn)
PASS  R1 status: a status outside staged, published and withdrawn is refused  (refused: 23514 manual_release_status_known, new row for relation "manual_release" violates check constraint "manual_release_status_known")
PASS  R1 staged editable: a staged row can be edited  (accepted)
PASS  R1 staged editable: a staged row can be deleted  (accepted)
PASS  R1 staged editable: an edit keeps created_by and created_at  (got true, expected true)
PASS  R1 published locked: its package cannot be edited  (refused: 23514 manual_release_published_locked, fia.manual_release XCOA XCOA-r2 is published: it can only be withdrawn)
PASS  R1 published locked: its note cannot be edited  (refused: 23514 manual_release_published_locked, fia.manual_release XCOA XCOA-r2 is published: it can only be withdrawn)
PASS  R1 published locked: its approver cannot be edited  (refused: 23514 manual_release_published_locked, fia.manual_release XCOA XCOA-r2 is published: it can only be withdrawn)
PASS  R1 published locked: it cannot go back to staged  (refused: 23514 manual_release_published_locked, fia.manual_release XCOA XCOA-r2 is published: it can only be withdrawn)
PASS  R1 published locked: it cannot be withdrawn and edited in one statement  (refused: 23514 manual_release_published_locked, fia.manual_release XCOA XCOA-r2 is published: it can only be withdrawn)
PASS  R1 published locked: it cannot be deleted  (refused: 23514 manual_release_published_locked, fia.manual_release XCOA XCOA-r2 is published and cannot be deleted)
PASS  R1 published locked: the table cannot be truncated  (refused: 23514 manual_release_no_truncate, fia.manual_release cannot be truncated)
PASS  R1 published locked: it can be withdrawn  (accepted)
PASS  R1 withdrawn final: a withdrawn row cannot be published again  (refused: 23514 manual_release_withdrawn_final, fia.manual_release XCOA XCOA-r2 is withdrawn, which is final)
PASS  R1 withdrawn final: a withdrawn row cannot be deleted  (refused: 23514 manual_release_withdrawn_final, fia.manual_release XCOA XCOA-r2 is withdrawn and cannot be deleted)
PASS  R1 withdrawn final: a withdrawn row is not in fia.model_packages  (got 0, expected 0)
PASS  R1 guards always on: the four guard triggers are ENABLE ALWAYS  (got contract_schema_insert_only:A,contract_schema_no_truncate:A,manual_release_guard:A,manual_release_no_truncate:A, expected contract_schema_insert_only:A,contract_schema_no_truncate:A,manual_release_guard:A,manual_release_no_truncate:A)
PASS  R1 no grant: row security is on for both tables, with no policy  (got contract_schema:true:0,manual_release:true:0, expected contract_schema:true:0,manual_release:true:0)
PASS  R1 no grant: neither anon nor authenticated holds any privilege on either table  (got 0, expected 0)
PASS  A5 failed gate: a manual row with a failed gate cannot be published, so cannot reach the view  (refused: 23514 manual_release_published_no_failed_gate, new row for relation "manual_release" violates check constraint "manual_release_published_no_failed_gate")
PASS  A5 failed gate: a manual row with a failed gate can be staged  (accepted)
PASS  A4 D2: a ticker only in the manual channel is shown from it  (got manual:TMAN-r1, expected manual:TMAN-r1)
PASS  A4 D2: a ticker only in the FSRE channel is shown from it  (got fsre:TFSR-f1, expected fsre:TFSR-f1)
PASS  A4 D2: in both, the more recent approval wins: manual  (got manual:TNEW-m1, expected manual:TNEW-m1)
PASS  A4 D2: in both, the more recent approval wins: FSRE  (got fsre:TOLD-f1, expected fsre:TOLD-f1)
PASS  A4 D2: in both with exactly the same approved_at (to the microsecond, other zone), FSRE wins  (got fsre:TTIE-f1, expected fsre:TTIE-f1)
PASS  A4 D2: an FSRE approved_at that is null loses to any manual approval  (got manual:TNUL-m1, expected manual:TNUL-m1)
PASS  A4 D2: an FSRE row with a null approved_at and no rival is shown  (got fsre:TNUF-f1, expected fsre:TNUF-f1)
PASS  A4 D2: two published manual versions: the more recent approval wins  (got manual:TTWO-m2, expected manual:TTWO-m2)
PASS  A4 D2: one row per ticker  (got true, expected true)
PASS  A4 D2: the manual package says published, with the row's approver and time (UTC), and no channel key  (got published | Dika Gustiana Irawan | 2026-10-02T10:00:00Z | false | Dika Gustiana Irawan | manual, expected published | Dika Gustiana Irawan | 2026-10-02T10:00:00Z | false | Dika Gustiana Irawan | manual)
PASS  A4 D2: the view has the columns of PRD R2, in order  (got ticker,version,channel,content_hash,approved_by,approved_at,package, expected ticker,version,channel,content_hash,approved_by,approved_at,package)
PASS  A4 D2: staged rows are not shown  (got none, expected none)
PASS  A5 failed gate: an FSRE package with a failed gate is not shown  (got none, expected none)
PASS  A5 failed gate: a newer FSRE package with a failed gate gives way to the older manual one  (got manual:TFGN-m1, expected manual:TFGN-m1)
PASS  A5 failed gate: no package in the view has a failed gate  (got 0, expected 0)
PASS  A6 anon: anon reads fia.model_packages, both channels  (got TFSR:fsre,TMAN:manual, expected TFSR:fsre,TMAN:manual)
PASS  A6 anon: anon cannot read fia.manual_release  (refused: 42501, permission denied for table manual_release)
PASS  A6 anon: anon cannot insert into fia.manual_release  (refused: 42501, permission denied for table manual_release)
PASS  A6 anon: anon cannot update fia.manual_release  (refused: 42501, permission denied for table manual_release)
PASS  A6 anon: anon cannot delete from fia.manual_release  (refused: 42501, permission denied for table manual_release)
PASS  A6 anon: anon cannot read fia.contract_schema  (refused: 42501, permission denied for table contract_schema)
PASS  A6 anon: anon cannot write fia.contract_schema  (refused: 42501, permission denied for table contract_schema)
PASS  A6 anon: anon holds SELECT on fia.model_packages and no other privilege on it; authenticated holds none  (got anon:SELECT, expected anon:SELECT)
PASS  A6 anon: of fia_private, anon may execute the FSRE reader only (the view calls it), and use the schema not at all  (got false | fsre_packages | 0, expected false | fsre_packages | 0)
PASS  A6 anon: anon cannot call the FSRE reader by name  (refused: 42501, permission denied for schema fia_private)
PASS  A6 authenticated: authenticated cannot read fia.manual_release  (refused: 42501, permission denied for schema fia)
PASS  A6 authenticated: authenticated cannot insert into fia.manual_release  (refused: 42501, permission denied for schema fia)
PASS  A6 authenticated: authenticated cannot read fia.contract_schema  (refused: 42501, permission denied for schema fia)
fia_manual_release: 86 PASS, 0 FAIL
```

Sesudah tes: `manual_release rows: 0`, dan `fia_private.fsre_packages()` kembali ke pembaca plpgsql asli
(`output/run_*-6-after-rollback.txt`): tidak ada yang tertinggal.

**Jalur FSRE asli, ujung ke ujung (lokal saja, di-rollback; `output/fsre-channel-end-to-end.txt`).**

```
anon sees, FSRE only:|SYNP|fsre|SYNP-FY25-r1-SYNTHETIC|published|2026-10-01T10:00:00Z
anon sees, manual newer:|SYNP|manual|SYNP-m2
fia_manual_release: 86 PASS, 0 FAIL
```

Paket manual yang dibaca `anon` dari view lolos `buildLiveRegistry` situs tanpa penolakan
(`output/site-reads-manual-package.txt`):

```
{"rows":1,"rejected":[],"shown":[["XCOA","XCOA-2025Q4-r2-local","published","Dika Gustiana Irawan","2026-10-22T08:26:38Z"]],"company":"published"}
```

**Satu jalur tidak menjatuhkan jalur lain (lokal, di-rollback; `output/fsre-channel-resilience.txt`).** Grant
`anon` dicabut, lalu satu kolom diganti nama, di stand-in FSRE:

```
1. both readable, as anon:|MANU:manual, SYNP:fsre
psql:resilience.sql:18: WARNING:  fia.model_packages: the FSRE channel cannot be read and is left out (42501: permission denied for view model_packages)
2. FSRE revokes anon, as anon:|MANU:manual
psql:resilience.sql:23: WARNING:  fia.model_packages: the FSRE channel cannot be read and is left out (42703: column p.approved_by does not exist)
3. FSRE renames a column, as anon:|MANU:manual
```

**`pg_jsonschema` vs validator situs.** `jsonb_matches_schema` menerima skema kontrak apa adanya (draft-07,
`$id` `urn:…`, `$ref` ke `#/definitions/…` ter-resolve: rowRef yang salah ditolak), menerima kelima paket
SYNTHETIC, dan menolak yang rusak. Uji paritas dengan ajv (yang dipakai tes kontrak repo):

```
parity: 2005 packages (5 as filed, 2000 single mutations), 2005 agree, 0 disagree; pg_jsonschema accepted 309, refused 1696
```
(Mutasi tunggal berbenih atas kelima paket: hapus kunci, null, ganti tipe, angka negatif/pecahan, array/objek
kosong, kunci tambahan, nilai enum salah, string kosong. `output/parity-ajv-pg_jsonschema.txt`.) Tidak ada
perbedaan, jadi kondisi berhenti "pg_jsonschema menolak fixture yang diterima situs, atau sebaliknya" tidak
terjadi.

### 2.3 A9: `publish-manual.ts`

`output/a9-publish-manual.txt`, dijalankan **tanpa `.env.local`**, sehingga penolakan terbukti tidak pernah
sampai ke tahap koneksi:

```
$ npx vite-node scripts/fia/publish-manual.ts --publish src/data/finance-in-action/fixtures/XCOA.SYNTHETIC.json --by "Dika Gustiana Irawan"
publish-manual: src/data/finance-in-action/fixtures/XCOA.SYNTHETIC.json
  XCOA XCOA-2025Q4-r1-SYNTHETIC, provenance synthetic, sub-industry SYN-COAL
Refused: XCOA fails the site's checks, 1 reason(s); nothing written.
  meta.provenance synthetic is not filings; production shows models built from filings only
[exit 1]

$ npx vite-node scripts/fia/publish-manual.ts --check scratchpad/XCOA.broken.local.json
publish-manual: scratchpad/XCOA.broken.local.json
  XCOA XCOA-broken, provenance filings, sub-industry A121
  note: meta.contentHash was empty; the package hashes to e83f4bf5c37f7cf5e300f0420c95708d556fb748216dfc8a88170fc2a1d79671, which is what will be written
Refused: XCOA fails the site's checks, 1 reason(s); nothing written.
  meta.chainStage nowhere is not a chain map stage or spanning layer
[exit 1]
```
(`XCOA.broken.local.json` = salinan XCOA dengan provenance `filings`, sub-industri A121 dan `chainStage`
rusak, hanya di scratchpad; tidak di-commit.) Kalimat penolakan adalah milik `validatePackage` /
`buildLiveRegistry`, dicetak `<path> <message>` seperti `RejectedPackages` di halaman; tes unit membandingkan
keduanya. Alur `--stage`, `--publish`, `--list`, `--withdraw` dicoba ke database lokal `run_fsre` dengan skrip
versi akhir (`output/a9-db-modes-local.txt`): staged, staged ulang, publish tanpa `--by` (exit 2), publish,
publish ulang (ditolak: sudah published), withdraw, withdraw ulang, withdraw versi yang tidak ada (ditolak),
semuanya sesuai; `.env.local` sementara untuk itu sudah dihapus.

### 2.4 Production, hanya baca

- Snapshot `fsre*`: `fsre-snapshot.md`.
- `check-published` dari branch ini terhadap production **hari ini** (sebelum migrasi):
  ```
  check-published: fia.model_packages published models answered 406 (not-available)
  ```
  PostgREST menjawab `PGRST106 Invalid schema: fia`; situs menggolongkannya `not-available`. Pembacaan lama
  (`Accept-Profile: fsre_published`) menjawab `HTTP 200`. Karena itu urutan fase 6: migrasi dan expose
  **sebelum** merge. A10 (HTTP 200, 0 paket dari `fia`) baru bisa dibuktikan sesudah langkah Dika.

### 2.5 Yang tidak terverifikasi di sini

Migrasi di production (PG 17.6, `CREATE EXTENSION` lewat supautils); PostgREST asli terhadap `fia`; host
pooler (`aws-0` vs `aws-1`, tidak dicoba karena butuh percobaan login); deploy Vercel; A1 (fase 0).

## 3. Koreksi atas sketsa PLAN, perbedaan dokumen, dan keputusan sendiri

### 3.1 Koreksi atas sketsa SQL di PLAN

| # | Sketsa PLAN | Yang dibangun | Alasan |
|---|---|---|---|
| 1 | View menyebut `fsre_published.model_packages` langsung | Dibaca lewat `fia_private.fsre_packages()`, plpgsql, SECURITY INVOKER, `to_regclass` dulu | (a) View yang menyebut objek yang tidak ada gagal dibuat, jadi A2 "database kosong" (dan stack lokal `supabase start`) mustahil. (b) View langsung mencatat dependensi: `DROP VIEW` oleh FSRE gagal, `DROP … CASCADE` ikut menghapus view situs, dan fingerprint `outside-dependants` berubah 0 → 1 (A7). Invoker: `anon` melihat paket FSRE sejauh grant FSRE sendiri. |
| 2 | Skema `fia` saja | Ditambah `fia_private` (tidak di-expose) untuk pembaca FSRE dan fungsi trigger | `anon` wajib bisa EXECUTE pembaca agar view jalan; di skema yang di-expose, fungsi itu jadi endpoint RPC yang memberi paket FSRE tanpa saringan D5. Tanpa USAGE di `fia_private`, `anon` tidak bisa memanggilnya langsung (diuji). |
| 3 | `check (package->'meta'->>'ticker' = ticker)` (juga version, contentHash, provenance) | `IS NOT DISTINCT FROM` | `=` dengan kunci hilang = NULL, dan CHECK lolos pada NULL. |
| 4 | Trigger: `jsonb_matches_schema(...)` "wajib true" | `IS NOT TRUE` → tolak; skema kontrak tidak ada → tolak; detail = 5 error pertama `jsonschema_validation_errors` | Fungsi `STRICT`: skema NULL memberi NULL, dan `IF NOT NULL` tidak menolak. |
| 5 | Published wajib `approved_by is not null` | Juga tidak boleh kosong/spasi (`btrim`) | Nama approver kosong bukan approval. |
| 6 | Kunci baris published: trigger update/delete | Ditambah: `withdrawn` final (tidak bisa diubah/dihapus); baris baru tidak boleh langsung `withdrawn`; `updated_at` diisi trigger; `created_at/by` tidak bisa diubah; **`TRUNCATE` ditolak** | Trigger baris tidak jalan pada `TRUNCATE`, jadi tanpa trigger statement baris published bisa hilang. |
| 7 | `fia.contract_schema` biasa | Insert-only (update/delete/truncate ditolak), CHECK `jsonschema_is_valid` | Mengubah baris kontrak diam-diam akan melonggarkan validasi jalur manual. |
| 8 | `revoke all … from anon, authenticated` | Juga dari `PUBLIC`, di level skema, dan EXECUTE fungsi dari `PUBLIC`; RLS juga di `contract_schema` | Default Postgres memberi EXECUTE fungsi ke `PUBLIC`. Production tidak punya default privilege global (dicek), jadi grant di migrasi adalah satu-satunya. |
| 9 | `order by ticker, approved_at desc nulls last, (channel='fsre') desc` | Sama, ditambah `version desc, content_hash` | Sketsa sudah benar untuk D2 (termasuk `NULLS LAST`; `DESC` saja menaruh NULL di depan). Tambahan membuat seri di dalam satu kanal deterministik. |
| 10 | Saringan gate `failed` di view | Sama, sebelum `DISTINCT ON` | Lihat 3.3 no. 3. |
| 11 | `create extension … with schema extensions` | Ditambah `create schema if not exists extensions` dan cek bahwa ekstensi ada di `extensions` | Pemanggilan ditulis `extensions.…`; stack lokal belum tentu punya skemanya. |
| 12 | — | `NOTIFY pgrst, 'reload schema'` | Supaya PostgREST memuat view baru. |
| 13 | Tes: fixture + varian | Untuk kasus lintas kanal (A4, A5), pembaca FSRE diganti stand-in dari tabel temporer **di dalam transaksi tes**; pembaca asli diuji terpisah | Menulis ke `fsre.*` (walau di-rollback) dilarang. Stand-in SECURITY DEFINER karena `anon` tidak punya akses ke skema temporer sesi. |
| 14 | Fase 6: SQL Editor atau `supabase db push` | `apply_migration` (seperti 36 migrasi sebelumnya) atau SQL Editor | README repo melarang `supabase db push`. |
| 15 | — | Pembaca FSRE menangkap `insufficient_privilege`, `undefined_table/column`, `invalid_schema_name`, `datatype_mismatch`, `cannot_coerce`, `undefined_function`: jalur FSRE kosong + `WARNING`; kolom di-cast ke tipe yang dijanjikan | Tanpa ini, masalah di sisi FSRE (grant dicabut, kolom diganti) menggagalkan seluruh view, jadi paket manual ikut hilang (temuan review, 3.4 no. 1). |
| 16 | — | Approval lebih dari satu menit di masa depan ditolak (trigger, `manual_release_approved_not_future`) | D2 mengurutkan menurut waktu; tanggal masa depan menang terus sampai ditarik. CHECK tidak boleh bergantung pada jam. |
| 17 | — | Keempat trigger penjaga `ENABLE ALWAYS` | `session_replication_role = replica` (setelan restore data) melewati trigger biasa. |

### 3.2 Perbedaan antara prompt, PRD/PLAN dan repo

1. **Nama branch.** Prompt: `feat/fia-two-gates`. Sesi ini ditetapkan bekerja dan push hanya ke
   `claude/fia-two-gates-gslvkn` (dibuat dari `main` @ `b6fd24c`, isi identik). Semua kerja ada di sana; tidak
   ada push ke branch lain.
2. **PR mengikuti PLAN "fase 3–5 setelah fase 2"**, semuanya dalam satu draft PR seperti prompt.
3. **RLS tanpa policy (PRD R1) vs README "zero tables without a policy".** Dibangun sesuai PRD. Invarian README
   ditulis untuk tabel `public` yang punya grant default; di sini tidak ada grant sama sekali. Kalau Dika ingin
   invarian itu berlaku juga, satu policy restriktif `USING (false)` tidak mengubah perilaku.
4. **PLAN fase 3 "MIN_TESTS naik"**: naik di commit fase 5 (saat jumlah akhir diketahui), 1344 → 1380.
5. **PLAN fase 4 "dependency `pg`"**: dipasang sebagai devDependency (alat lokal, bukan bundel situs).

### 3.3 Keputusan saya sendiri

1. **Password terpisah dari URL.** `.env.local` memakai `SUPABASE_DB_URL` (terisi) dan `SUPABASE_DB_PASSWORD`
   (diketik Dika), supaya password dengan `@ # /` tidak perlu di-encode. Konfigurasi koneksi dibangun dari
   bagian-bagian URL karena `node-postgres` membiarkan nilai `connectionString` menimpa opsi di sebelahnya
   (ditemukan dan diperbaiki di `7dfc1e4`, ada tesnya). URL dan password tidak pernah dicetak.
2. **TLS** ke pooler terenkripsi tanpa verifikasi sertifikat secara default; `SUPABASE_DB_CA` (opsional)
   mengaktifkan verifikasi. Host langsung `db.…supabase.co` hanya IPv6, jadi runbook memakai session pooler
   (`aws-0-ap-southeast-1`); kalau ternyata `aws-1`, pesan error skrip menyebut perbaikannya.
3. **D5 disaring sebelum memilih.** Kalau paket terbaru suatu ticker punya gate `failed`, paket valid yang
   lebih lama tetap tampil (bukan kosong). Dapat diubah kalau Dika lebih suka ticker itu kosong.
4. **`--check` juga menolak paket SYNTHETIC**, karena memakai aturan live situs (`buildLiveRegistry`); A9 hanya
   mewajibkan di `--publish`.
5. **`contentHash` kosong dihitung skrip** (SHA-256 paket dengan `contentHash` kosong, aturan fixture); hash
   yang salah ditolak dengan nilai yang benar disebut.
6. **`run-sql.ts`** (tidak ada di PLAN): menjalankan tes SQL dan fingerprint tanpa psql, dengan `.env.local`
   yang sama. Migrasi sengaja **tidak** dianjurkan lewat alat ini (README: `apply_migration`).
7. **Pesan skrip berbahasa Inggris** (kalimat situs dipakai apa adanya); runbook menjelaskan artinya dalam bahasa
   Indonesia.
8. **Kunci publik situs** (`sb_publishable_…`) ditulis di runbook untuk `check-published`: kunci ini memang
   dikirim ke setiap pengunjung situs; bukan rahasia.
9. **BREN**: `unitNoun` `electricity`, catatan satu kalimat tentang panas bumi; **nama ADRO** "Alamtri Resources
   Indonesia" (nama emiten ADRO sejak restrukturisasi 2024); lihat 4.
10. **Komentar world registry** (`generate.ts` → `links.generated.ts`, di-generate ulang) dan `.env.example`
    menyebut `fia.model_packages`; `schema-proposal-v3.md` diberi catatan.
11. **Screenshot** build live dengan slate baru: `screenshots/`.

### 3.4 Temuan review independen dan tindak lanjutnya

Sesudah semua fase selesai, satu agen review terpisah membaca migrasi, tes SQL dan skrip tanpa diberi kesimpulan
saya. Temuannya diperiksa ulang satu per satu:

| # | Temuan | Tindak lanjut |
|---|---|---|
| 1 | Error di pembaca FSRE (grant `anon` dicabut, kolom diganti nama/tipe) menggagalkan `fia.model_packages`, sehingga paket manual ikut hilang; komentar migrasi mengklaim sebaliknya | Diperbaiki (3.1 no. 15), dibuktikan di stand-in lokal (2.2), komentar dikoreksi |
| 2 | `publish-manual` mencetak "Nothing written" dan exit 1 kalau pembacaan tampilan **sesudah COMMIT** gagal (publish, withdraw); ulangan lalu ditolak "already published" | Diperbaiki: penulisan yang sudah commit dilaporkan tetap berlaku, exit 0; dua tes unit |
| 3 | Paket FSRE yang lebih baru tapi ditolak situs karena alasan lain (misalnya provenance bukan `filings`) tetap menang D2 dan menyembunyikan paket manual yang valid | **Tidak diubah**: sesuai R2 (hanya saringan D5). Menyaring provenance di view juga akan menghapus paket FSRE sintetis yang ditampilkan build preview dan catatan "Not shown" di halaman. Keputusan Dika (4 no. 6) |
| 4 | Tes "anon cannot write through fia.model_packages" menerima 55000, yang muncul sebelum cek hak, jadi lolos walau `DELETE` di-grant | Diganti dengan cek `has_table_privilege` (anon hanya SELECT, authenticated tidak ada) dan cek EXECUTE di `fia_private` |
| 5 | Kecil: approval masa depan; trigger bisa dilewati `session_replication_role = replica`; komentar kepala `db.ts` usang; TLS tanpa verifikasi bisa disadap jaringan yang mampu MITM | Dua pertama diperbaiki (3.1 no. 16, 17); komentar diperbaiki; TLS tetap seperti 3.3 no. 2, dengan peringatan di komentar dan opsi `SUPABASE_DB_CA` |

## 4. OWNER-DECISION dan hal yang perlu dikonfirmasi

| # | Hal | Keadaan sekarang | Yang dibutuhkan |
|---|---|---|---|
| 1 | **Kode dan nama sub-industri panas bumi untuk BREN** (D6) | `"code": "OWNER-DECISION"`, `"name": "OWNER-DECISION"` di `sub-industries.json`; slate BREN memakainya. Tampil apa adanya di halaman live (lihat `screenshots/live-energy-layer-1440.png`) | Kode dan nama dari Dika, **sebelum merge** (atau terima tampilan sementara itu). Paket BREN nanti harus memakai kode yang sama di `meta.subIndustry`. |
| 2 | D3, D4, D5, D6, D7 | Dibangun sesuai default PRD §4 | Konfirmasi. |
| 3 | ADRO di A121 | Sejak restrukturisasi 2024, emiten ADRO (Alamtri Resources Indonesia) tidak lagi memegang bisnis batu bara termal; itu pindah ke Adaro Andalan Indonesia (AADI) | Tetap ADRO di A121, atau AADI? |
| 4 | Policy RLS eksplisit | Tanpa policy (PRD R1) | Opsional (3.2 no. 3). |
| 5 | Host pooler | `aws-0-ap-southeast-1.pooler.supabase.com` | Kalau `Tenant or user not found`, ganti ke `aws-1` (runbook 1.5). |
| 6 | Saringan provenance di view | Hanya gate `failed` yang disaring (R2) | Opsional: juga `provenance = 'filings'` di view (3.4 no. 3), dengan konsekuensi pada build preview. |
| 7 | Jalur FSRE yang tidak terbaca | Dikosongkan dengan `WARNING` di log, jalur manual tetap tampil | Konfirmasi bahwa ini lebih baik daripada seluruh halaman gagal (`not-available`/`failed`). |

## 5. Langkah Dika yang tersisa (fase 6, disalin dari `RUNBOOK.md` §2)

Urutannya penting: kalau PR di-merge sebelum langkah 2–4, situs membaca skema `fia` yang belum ada dan
menampilkan kalimat "The published models are not available yet…". Jadi: migrasi, expose, tes, **baru** merge.
Prasyarat terpisah (fase 0): `VITE_FIA_LIVE=true` di Vercel Production, `VITE_FIA_PREVIEW` tidak ada.

**Langkah 1. Simpan fingerprint FSRE sebelum migrasi.**

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fsre_fingerprint.sql > fsre-before.txt
grep '^total' fsre-before.txt
```

PowerShell: `Select-String '^total' fsre-before.txt`

Harapan (snapshot 22 Okt, `fsre-snapshot.md`): `total | - | 229 | 201cddfeaa5ae54387a05fa5e47d6d79`. Kalau
berbeda, FSRE kemungkinan sudah menjalankan migrasinya sendiri sejak 22 Okt; itu boleh, yang penting langkah 5
sama dengan langkah 1.

**Langkah 2. Terapkan migrasi.** Pilih satu cara (README repo: jangan `supabase db push`).

- Cara A (seperti migrasi sebelumnya, tercatat di riwayat migrasi Supabase): di Claude Code, tempel kalimat ini:

  > Terapkan `supabase/migrations/20261022100000_fia_two_gates.sql` dari branch `claude/fia-two-gates-gslvkn`
  > ke project Supabase `asypkbkiebjvvpimewfp` dengan `apply_migration`, nama `fia_two_gates`. Saya
  > menyetujui penulisan ini. Sesudahnya jalankan `list_migrations` dan tunjukkan baris terakhir.

- Cara B (SQL Editor): salin isi file ke clipboard,

  ```
  pbcopy < supabase/migrations/20261022100000_fia_two_gates.sql
  ```

  PowerShell: `Get-Content supabase/migrations/20261022100000_fia_two_gates.sql -Raw | Set-Clipboard`

  lalu Supabase → **SQL Editor** → **New query** → tempel → **Run**. Harapan: `Success. No rows returned`.

**Langkah 3. Expose skema `fia` ke Data API.** Supabase → **Project Settings** → **Data API** → **Exposed
schemas** → tambahkan `fia` (jangan hapus yang sudah ada, termasuk `fsre_published`) → **Save**.

**Langkah 4. Jalankan tes SQL** (satu transaksi, di-rollback; tidak ada yang tertinggal):

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fia_manual_release.sql
```

Baris terakhir harus: `fia_manual_release: 86 PASS, 0 FAIL`. Setiap baris lain diawali `PASS` atau `FAIL`
dengan nama aturannya.

**Langkah 5. Fingerprint FSRE sesudah migrasi, bandingkan:**

```
npx vite-node scripts/fia/run-sql.ts supabase/tests/fsre_fingerprint.sql > fsre-after.txt
diff fsre-before.txt fsre-after.txt && echo IDENTIK
```

PowerShell: `if (-not (Compare-Object (Get-Content fsre-before.txt) (Get-Content fsre-after.txt))) { "IDENTIK" }`

Harus keluar `IDENTIK`. Kalau tidak, **jangan merge**; kirim kedua file ke Claude Code.

**Langkah 6. Cek view yang akan dibaca situs** (anon, kunci publik situs):

```
VITE_SUPABASE_URL=https://asypkbkiebjvvpimewfp.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_T8D6Uq_flTdtQT5mZuYVsw_nfgiZ203 npx vite-node scripts/world/check-published.ts
```

PowerShell:

```
$env:VITE_SUPABASE_URL="https://asypkbkiebjvvpimewfp.supabase.co"; $env:VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_T8D6Uq_flTdtQT5mZuYVsw_nfgiZ203"; npx vite-node scripts/world/check-published.ts
```

Harapan: `check-published: fia.model_packages HTTP 200, 0 package(s)`. Kalau keluar
`published models answered ... (not-available)`, langkah 3 belum tersimpan (atau tunggu satu menit lalu
ulangi). Kalau `(refused)`, kirim output-nya ke Claude Code.

**Langkah 7. Merge PR** di GitHub, tunggu deploy Vercel Production selesai.

**Langkah 8. Verifikasi production.** Buka `https://dikagustiana.com/finance/finance-in-action`: harus tampil
"The chain, read one company at a time" dengan PTBA, ITMG, INDY, ADRO, INTP, SMGR, BREN berstatus "Planned;
no model yet", tanpa kalimat "not available". Ulangi perintah langkah 6. Kirim ke Claude Code: output langkah
4, 5, 6 dan screenshot halaman.

