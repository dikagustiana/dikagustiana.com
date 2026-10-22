# Plan: Finance in Action, dua jalur masuk model

Pasangan `PRD.md`. Satu branch: `feat/fia-two-gates` dari `main` @ `b6fd24c`. Satu draft PR. Dika yang merge,
menjalankan migrasi, dan menyalakan env.

## Fase

| Fase | Isi | Pelaksana | Bergantung pada | Gate Dika |
|---|---|---|---|---|
| 0 | Nyalakan `VITE_FIA_LIVE` di Production, redeploy, cek halaman | Dika | — | screenshot A1 |
| 1 | Bootstrap: simpan PRD/PLAN/PROMPT di `docs/company-models/two-gates/`, catat HEAD, snapshot objek `fsre*` (read-only) | Claude Code | — | — |
| 2 | Migrasi `fia` + tes SQL | Claude Code | 1, D3, D4, D5 | apply migrasi |
| 3 | Situs baca `fia.model_packages`, tes, `check-published` | Claude Code | 2 (kode boleh lebih dulu) | merge |
| 4 | Skrip `publish-manual.ts` + runbook | Claude Code | 2 | — |
| 5 | Slate dan sub-industri INDY, ADRO, BREN | Claude Code | D6, D7 | merge |
| 6 | Apply migrasi, expose skema `fia`, deploy, verifikasi A2–A10 di production | Dika (+ Claude Code membaca hasil) | 2–5 merged | laporan akhir |

Fase 0 bebas dan bisa dikerjakan sekarang. Fase 3, 4, 5 saling bebas setelah fase 2 ditulis.

## Fase 0 (Dika, sekarang)

1. Vercel → project **dikagustiana-com** → Settings → Environment Variables.
2. Pastikan `VITE_FIA_LIVE` = `true` untuk Production. Kalau belum ada: Add → Key `VITE_FIA_LIVE`, Value `true`,
   centang Production saja → Save.
3. Pastikan **tidak ada** `VITE_FIA_PREVIEW` di Production.
4. Deployments → deployment Production teratas → ⋯ → Redeploy (tanpa build cache).
5. Buka `https://dikagustiana.com/finance/finance-in-action`. Harus tampil "The chain, read one company at a time"
   dengan PTBA, ITMG, INTP, SMGR berstatus "Planned; no model yet".

## Fase 2, sketsa migrasi (rujukan, bukan final)

File: `supabase/migrations/20261022100000_fia_two_gates.sql`.

```sql
create extension if not exists pg_jsonschema with schema extensions;
create schema if not exists fia;

-- kontrak yang dipakai database; tes unit memastikan isinya = model-package.schema.json
create table fia.contract_schema (version text primary key, schema jsonb not null);
insert into fia.contract_schema values ('proposal-v3.1', $json$ ...isi model-package.schema.json... $json$::jsonb);

create table fia.manual_release (
  ticker text not null check (ticker ~ '^[A-Z0-9]{2,8}$'),
  version text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  package jsonb not null,
  status text not null default 'staged' check (status in ('staged','published','withdrawn')),
  approved_by text, approved_at timestamptz, note text,
  created_at timestamptz not null default now(), created_by text not null default current_user,
  updated_at timestamptz not null default now(),
  primary key (ticker, version),
  check (package->'meta'->>'ticker' = ticker),
  check (package->'meta'->>'version' = version),
  check (package->'meta'->>'contentHash' = content_hash),
  check (package->'meta'->>'provenance' = 'filings'),
  check (status <> 'published' or (approved_by is not null and approved_at is not null)),
  check (status <> 'published' or not jsonb_path_exists(package, '$.workpaper.gates[*] ? (@.status == "failed")'))
);
-- trigger BEFORE INSERT/UPDATE: jsonb_matches_schema((select schema::json from fia.contract_schema
--   where version = 'proposal-v3.1'), new.package) wajib true
-- trigger BEFORE UPDATE: kalau old.status = 'published', hanya status -> 'withdrawn' (+ updated_at) yang boleh
-- trigger BEFORE DELETE: tolak kalau old.status = 'published'
alter table fia.manual_release enable row level security;
revoke all on fia.manual_release, fia.contract_schema from anon, authenticated;

create view fia.model_packages as
with candidates as (
  select p.package->'meta'->>'ticker' as ticker, p.version, 'fsre'::text as channel, p.content_hash,
         p.approved_by, p.approved_at, p.package
  from fsre_published.model_packages p
  union all
  select m.ticker, m.version, 'manual', m.content_hash, m.approved_by, m.approved_at,
         jsonb_set(jsonb_set(m.package, '{meta,status}', '"published"'), '{workpaper}',
           (m.package->'workpaper') || jsonb_build_object('approvedBy', m.approved_by,
             'approvedAt', to_char(m.approved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
  from fia.manual_release m where m.status = 'published'
)
select distinct on (ticker) ticker, version, channel, content_hash, approved_by, approved_at, package
from candidates
where not jsonb_path_exists(package, '$.workpaper.gates[*] ? (@.status == "failed")')
order by ticker, approved_at desc nulls last, (channel = 'fsre') desc;

grant usage on schema fia to anon;
grant select on fia.model_packages to anon;
```

Catatan: view berjalan dengan hak pemiliknya, jadi `anon` membaca `fsre_published` dan `fia.manual_release`
lewat view saja. Tes A6 membuktikan `anon` tidak bisa membaca tabelnya langsung.

Tes: `supabase/tests/fia_manual_release.sql`, satu transaksi, `rollback` di akhir, setiap kasus mencetak
`PASS`/`FAIL` dengan nama aturan. Fixture: salinan `XCOA.SYNTHETIC.json` dengan provenance diganti `filings`
**hanya di dalam transaksi tes** (tidak pernah di-commit sebagai data), plus varian rusak per aturan.

## Fase 3

- `published.ts`: `SCHEMA = 'fia'`; komentar kepala menyebut dua kanal.
- `tests/unit/fiaPublished.test.tsx`: header `Accept-Profile: fia`.
- `scripts/world/check-published.ts`: teks menyebut `fia.model_packages`.
- Tes baru: isi `fia.contract_schema` di file migrasi = `model-package.schema.json` (parse blok `$json$…$json$`).
- `MIN_TESTS` naik, tidak pernah turun.

## Fase 4

- `scripts/fia/publish-manual.ts` (jalan dengan `npx vite-node`), dependency `pg` kalau belum ada.
- Mode: `--check <file>`, `--stage <file>`, `--publish <file> --by "Dika Gustiana Irawan"`,
  `--withdraw <TICKER> <VERSION>`, `--list`.
- `--check` memanggil validator situs yang sama; `--stage`/`--publish` hanya jalan kalau `--check` bersih.
- Rahasia: `SUPABASE_DB_URL` dari `.env.local`; skrip tidak pernah mencetaknya; `.env.local` sudah di-ignore
  (cek).
- Runbook: `docs/company-models/two-gates/RUNBOOK.md`, bahasa Indonesia, perintah lengkap siap salin.

## Fase 5

- `sub-industries.json`: entri baru BREN (kode dan nama dari Dika, `chainStage: "band-energy"`, `unit: "MWh"`,
  catatan satu kalimat). Cek dulu bahwa `band-energy` diterima `CHAIN_POSITIONS`; kalau tidak, berhenti dan lapor.
- `fixtures/slate.json`: INDY, ADRO (A121), BREN, `status: "not_started"`, depth dan conditionIds sesuai D7.
- Pair A121 sekarang empat perusahaan; cek tampilan pair dan peer band tidak rusak.

## Fase 6 (Dika)

1. Supabase → SQL editor → jalankan isi file migrasi (atau `supabase db push` kalau CLI terpasang).
2. Supabase → Project Settings → Data API → Exposed schemas → tambah `fia` → Save.
3. Merge PR, tunggu deploy Vercel.
4. Jalankan tes SQL dan `check-published.ts` (perintah lengkap ada di runbook). Kirim output ke Claude Code untuk
   laporan akhir.
