# Prompt for Claude Code — paste everything below this line

You are working on `dikagustiana/dikagustiana.com` (Vite + React 18 + TypeScript + Tailwind + shadcn/ui + TanStack Query + TipTap; Supabase project `asypkbkiebjvvpimewfp`; deployed on Vercel project `dikagustiana-com`, team `team_qkOkuTIM75I336YmxaGlDwWZ`). The owner is Dika. He is not an engineer: anything he must run himself, give as a complete copy-paste command with his values filled in.

Four spec files are attached to this message: `01-PRD.md`, `02-ARCHITECTURE.md`, `03-DESIGN.md`, `04-PLAN.md`. They are the source of truth. Read all four in full before touching anything. Where the code disagrees with them, the code is the fact: report the disagreement, do not paper over it.

## What to build

1. Consolidation working paper cleanup (PRD §A): no inspector, no legend, no download, no Method section, no Topics section, no Copy address, no Feeds/Fed-by highlighting, no gridlines, true full screen, column P no longer clipped, copy rewritten.
2. Site-wide centring of reading pages via a `PageLayout` `width` prop (PRD §B).
3. Removal of every lecture-notes reference and mention from all essays in Supabase, with citations renumbered (PRD §C).
4. Books shelves: collapsible shelves, cards, deep-linkable dialog with synopsis, Free = download / Paid = buy link, managed from `/admin/books` (PRD §D).

## How to work

- Follow `04-PLAN.md` phase by phase. Branch `feat/site-cleanup-2026-10`. One commit per work package. Use the task list so progress is visible.
- **Phase 0 changes nothing.** It ends with a report to Dika (Gate A) containing: baseline test state, the workbook import map, the confirmed cause of the column-P clipping, the centring audit table, the essay match counts and citation markup format, the `books_uploads` row count, the draft Books migration SQL, every place the code contradicts the spec, and the defaults X1–X7 from PRD §4. Also state risk R1 plainly: the repo is public, so the xlsx and workbook JSON are downloadable from GitHub whatever the site does. Then **stop and wait for his "go"**.
- **Gate B**: no write to `essays` until Dika approves `lecture-notes-diff.md`. Backup first, dry run first, one transaction, `content` and `content_json` kept in sync, `essay_revisions` written. Sentence rewrites are proposals in the diff, never applied unseen.
- **Gate C**: no merge to `main` without Dika's "go" after he has tested the Vercel preview.
- Never apply a migration, change Vercel env vars, or change Supabase settings without it being in an approved gate.
- Do not redesign the theme. Use existing tokens and components (`collapsible`, `dialog`, `sanitizeHtml`, the TipTap setup in `src/components/editorial/EssayEditor.tsx`, the up/down reorder pattern of `src/components/admin/HomepageOrder.tsx`). Add no new dependencies unless the report at Gate A justifies one.
- Fix root causes, not symptoms. If a test asserts a removed feature, update the test to the new behaviour; do not delete test files wholesale.
- Secrets: read the Supabase service role key from the environment; never print it, never commit it.

## Verification before you report done

- `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run build` all green (pre-existing failures listed separately).
- `grep -r "\.xlsx" dist/` returns nothing.
- Essay checks: zero matches for `lecture note`, `Rumpun Akuntansi`, `AKL – Chapter`, `AKL - Chapter` in `content` and `content_json`; every inline citation resolves to a reference.
- Before/after screenshots at 1440, 1920, 2560 and 390 px for every changed page; reading column centred within ±2 px.
- A fresh sub-agent that did not build the work checks every acceptance line in PRD §6 against the preview and the code, and reports pass/fail per line.

## Final report (in Indonesian, short)

Per work package: what changed, files touched, decisions you made on your own, anything not done and why. Then: PR link, preview URL, Gate B diff link, rollback commands (copy-paste ready), and the exact steps for Dika to add his first free and first paid book in `/admin/books`.
