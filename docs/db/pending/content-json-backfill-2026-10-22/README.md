# content_json backfill for the accounting import — NOT APPLIED

The 36 essays of the accounting batch of 11 Oct 2026 (30 FSLI essays and the six-part consolidation
series) were stored with `content_json = null`. The Writer Studio stores both `content` (HTML) and
`content_json` (the TipTap document it was serialised from), and `scripts/accounting-import/import.ts`
now does too. This file brings the 36 existing rows to that format. Public pages read `content` only,
so nothing a reader sees changes.

## What it writes

`backfill.sql` is one transaction with one guarded statement per essay (`rows.json` lists them):

- `content_json` = `generateJSON(content)` over the app's schema (`getSchemaExtensions`), the document a
  re-run of the import would write. Each was checked to re-serialise **byte for byte** to the stored
  `content`, and to survive a second round trip.
- Guards: `section = 'accounting'`, `content_json is null`, and `md5(content)` equal to the content the
  document was built from (read 22 Oct 2026). A row edited in the Studio since is skipped.
- One `migration` revision per written row, carrying the document, as the import writes.
- `updated_at` is **kept**. The `update_essays_updated_at` trigger stamps `now()` on every update,
  which would date all 36 essays 22 Oct: share-card versions, sitemap and feed dates,
  `article:modified_time`, and an "Updated" line on the series pages, for a change no reader can see.
  The transaction disables that one trigger and re-enables it before `commit`. DDL is transactional, so
  an error rolls the trigger state back too. This needs the table owner (`postgres`), which the SQL
  editor, the Supabase MCP and a session-pooler connection as `postgres` all are.

Running the import script itself would also need the source markdown, which stays out of the repo,
and would bump `updated_at`. This file needs neither.

## Rehearsal (local PostgreSQL 16, production DDL for the touched tables and trigger)

Loaded the 36 live rows with one prior revision each, then:

| run | result |
|---|---|
| 1 | 36 rows written; `content` md5 unchanged ×36; `updated_at` unchanged ×36; 36 revisions (no. 2, `migration`, document equal to the row's); trigger enabled again |
| 2 | 0 rows, 0 revisions (idempotent) |
| 3 | after editing one row's `content` and nulling another's `content_json`: the edited row skipped, the other filled |

## Apply

With the session-pooler connection string as `postgres`:

```sh
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f docs/db/pending/content-json-backfill-2026-10-22/backfill.sql
```

The file is 2.4 MB, more than one MCP `execute_sql` request carries. Through the MCP, run it one
essay per call, each wrapped in the same `begin; alter table … disable trigger …; <statement>;
alter table … enable trigger …; commit;`.

## Verify

```sql
select count(*) filter (where content_json is not null) as filled,
       count(*) filter (where updated_at <> '2026-10-12 09:47:08.318531+00') as dates_moved
  from public.essays
 where id in (<the 36 ids in rows.json>);
-- expected: filled = 36, dates_moved = 0 (all 36 rows carried that updated_at on 22 Oct 2026)
```

## Roll back

```sql
begin;
alter table public.essays disable trigger update_essays_updated_at;
update public.essays set content_json = null
 where section = 'accounting' and id in (<the 36 ids in rows.json>);
delete from public.essay_revisions
 where change_type = 'migration'
   and change_summary like 'content_json backfilled:%';
alter table public.essays enable trigger update_essays_updated_at;
commit;
```
