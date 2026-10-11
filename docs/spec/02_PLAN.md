# Implementation plan

Two PRs. PR 1 (FSLI) and PR 2 (Tracker) are independent; run them in parallel sessions or sequentially. Each PR has its own preview deployment and its own sign-off.

Step 0 applies to both and is done once.

## Step 0 — Discovery (both PRs, read-only, ~20 min)

Nothing in this plan assumes file paths. Before writing code, establish and write to `docs/spec/00_discovery.md`:

- Router: file and pattern for routes (`/accounting/fsli`, `/green-transition/tracker`), how redirects are declared.
- Supabase: migrations folder, existing tables touching FSLI (what the current asset rows live in), existing tables for essays/tracker content, RLS policy pattern, how the app reads (generated types? direct client?).
- Admin/authoring: where draft→publish lives today for essays; reuse that pattern.
- Theme tokens: font families, type scale, spacing scale, colour tokens, where they are defined. The restyle must use these, not new values.
- Storage: where PDFs can live (Supabase Storage bucket vs. repo `data/`). Default: repo `data/fs/` for the source PDF and JSON, Storage only if the repo already excludes binaries.
- Scripts: Python available in CI? If not, the checker also needs a TypeScript port or runs locally only — decide and record.
- Existing checker agent: the content pipeline has a `checker` agent with Supabase schema awareness. Record its location and whether the FSLI checker should hook into it (preferred) or stand alone.

Stop and report after Step 0 if anything contradicts the PRD (e.g. essays are markdown-in-repo, not Supabase). Do not reinterpret silently.

---

## PR 1 — FSLI viewer

### 1.1 Schema
- Migration: `fs_company`, `fs_period`, `fs_line`, `fs_soce_cell`, `fs_check` per PRD §A5. RLS: public read where `fs_period.status='published'`; authenticated owner read/write all.
- Migration: drop or rename the current FSLI asset table (D2). Rename to `_legacy_*` rather than drop, so the PR is reversible.
- Regenerate Supabase types.

### 1.2 Source data
- `data/fs/phe/fy2024/source.pdf` is already committed in step 0 from the attachment. If Step 0 decided on Supabase Storage instead, upload it there as well and record the path.
- `data/fs/phe/fy2024/README.md`: auditor, report no., statement page map, extraction date.

### 1.3 Checker first
- `scripts/fs_check.py` implementing every rule in PRD §A6. Stdlib only. Input: `statements.json`. Output: table + non-zero exit on any fail. `--json` flag writes results for loading into `fs_check`.
- `scripts/tests/test_fs_check.py`: (a) golden fixture from PRD §A6 passes; (b) each of ±1 perturbations on a random item fails with the right rule id; (c) a missing label fails LABEL.
- Build and test this **before** extracting, so extraction is validated on first run.

### 1.4 Extraction
- Read PDF p.11–18. Produce `statements.json` for `sofp`, `pl_oci`, `soce`, `cf` (CF is extracted now because it is cheap and XS-CF-CASH is a free cross-check; it is simply not shown in the UI yet).
- Run checker. Iterate until exit 0. Every record carries `source_page`.
- Commit the JSON. It is the reviewable artefact.

### 1.5 Loader
- `scripts/fs_load.ts` (or `.py`, whichever matches repo tooling): reads `statements.json` + checker JSON, upserts `fs_period` (draft), `fs_line`, `fs_soce_cell`, `fs_check`. Refuses to run if the checker JSON has any `passed=false`.

### 1.6 UI
- Route `/accounting/fsli/:company/:period`; redirect from `/accounting/fsli` → `/accounting/fsli/phe/fy2024`.
- Components: `FsHeader`, `FsTabs`, `FsVerticalStatement` (SoFP, P&L/OCI, CF share it), `FsSoceMatrix`, `FsTieOutBadge`, `FsCompanyPicker`, `FsSearch` (reuse existing search if present).
- States: loading skeleton; empty tab ("Not yet loaded from the FY2024 report."); error; populated.
- Mobile layout per PRD §A7.

### 1.7 Publish gate
- Admin action `publishPeriod(period_id)`: server-side (edge function or RPC) re-runs the tie-out rules against `fs_line`/`fs_soce_cell` in SQL or TS, writes `fs_check`, sets `status='published'` only if all pass. UI button disabled when latest run has a failure.

### 1.8 Verification (in PR description, with evidence)
- Checker output pasted.
- Screenshot of SoFP and P&L/OCI at 1440 and 375.
- Row-count comparison: rows in `statements.json` per statement vs. rows counted on PDF pages.
- axe/Lighthouse numbers.
- Confirmation that the old wrong figures (PRD §A1 table) no longer appear anywhere.

---

## PR 2 — Tracker rebuild

### 2.1 Content research (before any code)
- For each existing claim on the page (Q1 and Q2 2025, all three columns), find the primary document. Build `docs/spec/tracker_sources.md`: claim → sector → primary source (issuer, doc no., date, URL, accessed date) → status `verified` / `unverifiable` → proposed rewritten `finding` + `detail`.
- Candidate primary sources to check first: ESDM regulations on geothermal/renewable pricing 2025, Kepmen/Permen on TKDN for solar modules, PLN RUPTL 2025–2034 status and any PLN procurement announcements H1 2025, JETP Secretariat / CIPP updates, OJK taxonomy (TKBI) consultation documents, Danantara founding regulation (UU BUMN amendment / PP) and any mandate documents. Use web search; cite the document, not the article about it.
- Unverifiable claims go into a "proposed for deletion" list. Do not rewrite them into something vaguer.
- **Stop here and hand `tracker_sources.md` to Dika for sign-off before 2.2.** This is a hard gate; the rest of the PR depends on which entries survive.

### 2.2 Content model
- Migration for `tracker_entry` per PRD §B4 (or equivalent in the essay content system found in Step 0). Seed from the signed-off `tracker_sources.md`, `published=false`.

### 2.3 Page
- Restructure per PRD §B5 order. Remove the three bordered cards, the monospace labels, the Changed/Held/Reversed grid.
- `SectorRegister` table component; `IssueSection` for Q2 and Q1 with finding-first titles; `SourceList` with numbered refs.
- Status line once. Link to the current-condition essay series index (create the index route if it does not exist yet; a stub page listing "Learn from the UK" is enough).
- Use theme tokens only. Content width = the essay content width already used elsewhere on the site.

### 2.4 Lint for the acceptance list
- Add a small test (`tracker_copy.test.ts`) that loads published entries and asserts the banned-phrase list in PRD §B6 and the single-"paused" rule. Runs in CI.

### 2.5 Verification (in PR description)
- `tracker_sources.md` final, with Dika's sign-off noted.
- Screenshots at 1440 and 375.
- Font families loaded on route (from devtools Network, filtered to fonts).
- Contrast measurement on body text and table text.
- Lighthouse accessibility.

---

## Sequencing and effort

| Step | Depends on | Rough size |
|---|---|---|
| 0 Discovery | — | small |
| 1.1–1.3 Schema + checker | 0 | medium |
| 1.4–1.5 Extract + load | 1.3 | medium (iteration is on the checker, not on reading) |
| 1.6–1.8 UI + gate | 1.1 | large |
| 2.1 Research | 0 | large, and blocked on Dika sign-off |
| 2.2–2.5 Tracker build | 2.1 sign-off | medium |

Start 2.1 immediately in parallel with 1.1–1.3; it is the long pole and the only step with an external wait.

## Rollback

- PR 1: legacy table was renamed, not dropped; redirect can be reverted; `fs_*` tables can be dropped by the down-migration.
- PR 2: old page content remains in git history; `tracker_entry` down-migration drops the table.
