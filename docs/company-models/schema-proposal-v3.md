# `finance_models`: schema proposal v3 (written proposal only)

Status: **proposal, not applied.** Nothing in this session writes to `asypkbkiebjvvpimewfp`.
It is applied only after the owner approves the v3.1 package contract and FSRE P-2 (open
items 3 and 5 of the brief).

## Today

`public.finance_models` (live, read-only inspection, 4 October 2026): `id`, `slug`,
`number`, `name`, `description`, `depth` (enum `model_depth`: foundation, executive,
institutional), `version`, `last_updated`, `documentation` (jsonb), `module_references`
(uuid[]), `excel_file_url`, `is_flagship`, `is_published`, `sort_order`, `created_at`,
`updated_at`. 0 rows. RLS: anon reads published rows; admins write.

## What the viewer needs from the database

The viewer reads one JSON package per model version (`src/lib/finance-in-action/contract/`).
The package itself is FSRE's output and belongs in FSRE's published schema
(`fsre_published.model_snapshots`, FSRE `db/postgres/0003_published.sql`), which is not on
the project yet. `finance_models` should stay the site's own listing: one row per company in
the section, holding what the index needs without opening any package, and pointing at the
published package version.

## Proposed change

```sql
-- PROPOSAL ONLY. Do not run until the owner approves the v3.1 contract and FSRE P-2.
create type public.fia_status as enum ('published', 'preview', 'in_progress', 'not_started');

alter table public.finance_models
  add column ticker            text,               -- IDX ticker, upper case; URL slug is lower(ticker)
  add column sub_industry_code text,               -- FSRE / IDX-IC sub-industry code, e.g. A121
  add column chain_stage       text,               -- a STAGES id, or band-energy / band-logistics
  add column status            public.fia_status not null default 'not_started',
  add column condition_ids     smallint[] not null default '{}', -- section 05 condition numbers
  add column package_version   text,               -- meta.version of the published package
  add column package_hash      text,               -- meta.contentHash, hex sha-256
  add column latest_quarter    text,               -- meta.asOf.latestQuarter, for the index row
  add constraint finance_models_ticker_key unique (ticker),
  add constraint finance_models_ticker_upper check (ticker = upper(ticker)),
  add constraint finance_models_package_hash_hex check (package_hash ~ '^[0-9a-f]{64}$'),
  add constraint finance_models_published_needs_package
    check (status <> 'published' or (package_version is not null and package_hash is not null));
```

Notes:

- `chain_stage` is validated in the viewer against `industryChain.ts`, not in the database,
  so the chain map stays the one source of stage ids (constraint 6). A check constraint
  would be a second list.
- `condition_ids` are validated in the viewer against `capitalConditions.ts` for the same
  reason.
- `provenance` is not a column: the database only ever lists real companies. Synthetic
  fixtures live in the repository behind `VITE_FIA_PREVIEW` and never in a table.
- `slug` stays (the existing route reads it). For the new rows it equals `lower(ticker)`.
- `excel_file_url`, `documentation`, `module_references` and `is_flagship` stay for the
  existing pages; the v3.1 viewer does not read them.
- RLS needs no change: anon keeps reading `is_published` rows only. Whether `is_published`
  should follow `status in ('published', 'preview')` is an owner decision.
- The package is fetched from `fsre_published.model_snapshots` by `(company_id, wave_id)`
  and checked against `package_hash` before rendering: a package whose hash differs from the
  listed one is not shown.

## Contract additions recorded in the Commit 0 report

These change the v3.1 package shape and need the owner's approval with it:

1. `meta.chainStage` may also be `band-energy` or `band-logistics`.
2. Cell addressing convention (sheet id, header row 1, `rows[n]` at row `n + 2`, columns A
   label, B unit, C first period).
3. Optional `meta.rounding: { decimals }`.
4. Optional `peerBand[].rowRef`.
5. Optional `meta.conditionNotes` and `workpaper.preparedBy`.
