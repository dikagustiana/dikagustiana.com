# content_json backfill for the accounting import — APPLIED 2026-10-22

The 36 essays of the accounting batch of 11 Oct 2026 (30 FSLI essays and the six-part consolidation
series) were stored with `content_json = null`. The Writer Studio stores both `content` (HTML) and
`content_json` (the TipTap document it was serialised from), and `scripts/accounting-import/import.ts`
now does too. This brought the 36 existing rows to that format. Public pages read `content` only, so
nothing a reader sees changed.

Applied on the owner's instruction through the Supabase MCP (`execute_sql`, as `postgres`, the table
owner), in one transaction: `apply.sql`, exactly as run. `rows.json` lists the 36 rows.

## How

The import itself was not re-run: its markdown sources stay out of the repo, and its upsert fires the
`update_essays_updated_at` trigger, which would have dated all 36 essays 22 Oct (share-card versions,
sitemap and feed dates, `article:modified_time`, an "Updated" line on the series pages) for a change
no reader can see. The documents (54–105 KB each, 2.4 MB in all) were also too large to pass through
the MCP. So the database built them itself:

1. `pg_temp.tiptap_doc(content)`, a session-temporary function, converts the stored HTML. It covers
   exactly the subset the import's `generateHTML` wrote (p, h2/h3, ul/ol/li, blockquote, hr,
   table/tr/th/td, one of strong/em/code/a per text run, `&amp;` `&lt;` `&gt;`) and raises on
   anything else.
2. Each result had to match the md5 of `generateJSON(content)` over the app's schema
   (`getSchemaExtensions`), computed beforehand, for the row's `content` md5 as read that day.
   Anything short of 36 eligible rows and 36 exact documents raised and rolled back the whole
   transaction.
3. With `update_essays_updated_at` disabled inside the transaction, it wrote `content_json` and one
   `migration` revision per row carrying the document, re-enabled the trigger, and committed.

## Rehearsal (local PostgreSQL 16, production DDL for the touched tables and trigger)

- The converter matched `generateJSON` for 36/36 rows on jsonb equality.
- `apply.sql`, first run: 36 rows and 36 revisions written; `content` and `updated_at` unchanged;
  trigger enabled again; no function left behind.
- Second run: refused ("0 rows eligible") and wrote nothing.

## Result in production

| check | result |
|---|---|
| rows with `content_json` | 36 / 36 |
| `content` md5 unchanged | 36 / 36 |
| `updated_at` unchanged (2026-10-12 09:47:08.318531+00) | 36 / 36 |
| still published | 36 / 36 |
| backfill revisions (`migration`, carrying the document) | 36 |
| `update_essays_updated_at` | enabled (`O`) |
| other essays touched | 0 |
| stored `content_json`, read back through the public API, deep-equal to `generateJSON` output | 36 / 36 |

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
