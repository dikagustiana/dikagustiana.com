Finance in Action: two ways in (FSRE and manual), build prompt
You are working in the `dikagustiana/dikagustiana.com` repository. If the current folder is not that repository, find it under the current folder and work there.
Attached with this prompt: `PRD.md` and `PLAN.md` (Indonesian, the owner's language). They are the specification. Where this prompt and they disagree, this prompt wins; record the difference in your report.
First action
Create branch `feat/fia-two-gates` from `main`. Record the HEAD SHA. Save `PRD.md`, `PLAN.md` and this prompt verbatim under `docs/company-models/two-gates/` as the first commit. Then work through phases 1 to 5 of `PLAN.md` without waiting for approval between them. Finish with one draft pull request and the report in section 6. Phase 0 and phase 6 are the owner's; do not attempt them.
1. What this is
Section 06 reads published company models from one view, `fsre_published.model_packages`, which only the FSRE suite can fill. The owner wants a second way in: models he approves himself, without the FSRE pipeline, held to the same contract. Both ways end in one new view, `fia.model_packages`, which the site reads instead.
2. Hard constraints

1. Do not touch `fsre`, `fsre_private`, `fsre_status` or `fsre_published`. No DDL, no grants, no data. They belong to the private `fsre-skills` repository. Read-only inspection is allowed and required (phase 1 snapshot, test A7).
2. No writes to the production database. You write the migration and the SQL tests; the owner applies them. If you have a local Postgres with `pg_jsonschema` (for example the `supabase/postgres` image or `supabase start`), run the migration and tests there and show the output. If you do not, say so plainly in the report; do not claim the tests passed.
3. The contract does not change. `src/lib/finance-in-action/contract/*` stays as it is. `channel` lives in the view's columns, never inside `package`.
4. The manual way does not lower the bar. Every rule in PRD R1 is enforced by the database, and the site's own `buildRegistry` validation still runs on every package it reads.
5. A package with a `failed` gate is never shown, from either channel (PRD D5).
6. No real company figures in the repository. Tests use the SYNTHETIC fixtures; any change of their provenance to `filings` happens only inside a rolled-back test transaction.
7. Secrets. `SUPABASE_DB_URL` is read from `.env.local` only, never printed, never committed. Confirm `.env.local` is git-ignored.
8. No change to what the page looks like, to auth, admin, authoring or the TipTap editor.
9. CI as in `.github/workflows/ci.yml`: eslint under its ceiling, typecheck clean, vitest green, `assert-test-count` floor raised and never lowered, build, and the live build with `assert-no-synthetic`.
10. British English in code comments and any site copy; the runbook is in Indonesian.
11. Draft PR only. Never merge, never push to `main`.

Stop and report, do not improvise, when

* `band-energy` is not accepted as a sub-industry `chainStage` by `CHAIN_POSITIONS` / `groupAlongChain`;
* `pg_jsonschema` rejects a SYNTHETIC fixture that the site's validator accepts, or the reverse, and the cause is not a bug you can fix in your own code;
* a change would need DDL on any `fsre*` schema;
* a test fails twice after a fix attempt.

3. Owner decisions
D1 and D2 are agreed. D3 to D7 carry the owner's defaults in `PRD.md` §4; build to them. Where a value is still the owner's to give (the BREN sub-industry code and name), use `OWNER-DECISION` and list it in the report.
4. Work
Follow `PLAN.md` phases 1 to 5. The SQL in `PLAN.md` is a sketch: correct it where it is wrong, keep its intent, and record every correction. In particular check and record:

* that `jsonb_matches_schema` accepts the contract's draft-07 schema as stored, and that the stored copy equals `model-package.schema.json` (add the unit test);
* that the view's ordering implements D2 exactly, including ties and a null `approved_at`;
* that `anon` can select `fia.model_packages` and can neither select nor write `fia.manual_release` or `fia.contract_schema`;
* that a published manual row cannot be edited or deleted, only withdrawn;
* that the `fsre*` objects are byte-identical before and after (compare `pg_get_viewdef` and the object list).

`scripts/fia/publish-manual.ts` must run the same validation the site runs (import it, do not copy it), refuse to write anything when `--check` fails, and print the reasons in the site's words.
The runbook `docs/company-models/two-gates/RUNBOOK.md` is for an owner who is not an engineer: every command complete and ready to paste, with his values filled in (project `asypkbkiebjvvpimewfp`, approver "Dika Gustiana Irawan"), except the database password, which he types into `.env.local` himself. Cover: first-time setup, check a package, stage, publish, withdraw, list, and what each error means.
Add an entry to `docs/DECISIONS.md` for D1 to D7 with today's date.
5. Tests

* SQL: `supabase/tests/fia_manual_release.sql`, one transaction, rolled back, printing `PASS`/`FAIL` per named rule. One positive case and at least one negative case for every rule in PRD R1, plus A4, A5 and A6.
* Unit: `fia.contract_schema` in the migration equals the contract file; `published.ts` sends `Accept-Profile: fia`; `publish-manual.ts --check` rejects a broken package with the site's reason and rejects a SYNTHETIC fixture on `--publish`.

6. Report
`docs/company-models/two-gates/report.md`, Indonesian, with:

1. Start and end SHA, commit list.
2. Verbatim output of every CI command and of the SQL tests (or the plain statement that the SQL could not be run locally, and why).
3. Every correction to the PLAN sketch and every decision you made yourself, with the reason.
4. Every `OWNER-DECISION` left open.
5. The owner's remaining steps (phase 6), copied from the runbook.
