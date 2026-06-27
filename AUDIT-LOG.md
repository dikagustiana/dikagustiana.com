# AUDIT-LOG

Append-only running log of the autonomous audit/upgrade pass.
Format: timestamp · phase · severity · file(s) · problem → action → verification → commit.

> Branch: `claude/autonomy-contract-setup-40bdmd`. This pass builds on substantial
> prior audit work (see `docs/UPGRADE_REPORT.md`). It re-verifies the baseline and
> closes remaining actionable items.

---

## Phase 0 — Baseline & characterization (2026-06-27)

**Environment**
- Node v22.22.2, npm 10.9.7.
- `npm ci` failed: lockfile drift (`@types/trusted-types@2.0.7` missing from
  `package-lock.json`). Used `npm install` (added 583 packages). Logged as
  pre-existing drift to reconcile.

**Starting snapshot (all measured on this branch):**
| Gate | Result |
|---|---|
| `eslint .` | **0 errors, 60 warnings** |
| `tsc --noEmit` | **0 errors** |
| `vite build` | **OK**, ~6s; total dist JS ≈ 1.68 MB uncompressed (3.4 MB dist) |
| `vitest run` | **145 passed / 145**, 18 files |
| `npm audit` | **21 vulnerabilities** (2 critical, 12 high, 7 moderate) |

Largest chunks: `editor` (TipTap) 377 kB, `react-vendor` 186 kB, `supabase` 172 kB,
main entry 137 kB. Route-level code-splitting already in place (prior pass).

---

## Phase 1–3 — Hygiene, config, dependencies (2026-06-27)

- **P2 deps** · `package-lock.json` · 21 npm advisories (2 crit/12 high/7 mod);
  prod-tree react-router XSS, lodash proto-pollution/code-injection,
  markdown-it/linkify-it/glob/flatted ReDoS. → `npm audit fix` (non-breaking);
  also reconciled lockfile drift so `npm ci` works. → build OK, 145 tests, 0 lint
  errors; 21→6 advisories (remaining 6 = dev-toolchain esbuild/vite/vitest only,
  need breaking major bump, queued). → `448a1fe`

## Phase 5 — Database / RLS (P0 territory) (2026-06-27)

- **P0** · `supabase/migrations/20260622135932…sql` (existing, not editable) ·
  `REVOKE EXECUTE ON has_role FROM anon, authenticated` while RLS policies call
  has_role() in those roles → Postgres errors "permission denied for function"
  on apply, breaking admin writes (essays FOR ALL), admin-only read tables
  (remora_*/quant_data_quality) and storage admin listing. **Reproduced in a
  local Postgres cluster** (initdb under non-root user; exact REVOKE → error).
  → New migration `20260627190000` re-GRANTs EXECUTE to authenticated, anon.
  → Validated locally. → `a6db7fc`
- **P0** · `supabase/migrations/20260301073018…sql` (existing) · essays SELECT
  `USING (true)` exposes drafts/archived + tone JSONB via public PostgREST.
  → New migration `20260627190100` role-split gating (anon=published only;
  authenticated=published OR admin). Public app already filters published=true,
  so no public-facing behavior change. → Validated locally (anon/non-admin see
  published only; admin sees drafts). → `a6db7fc`
- **Verified NON-issue** · quant_backtests INSERT `WITH CHECK (true)` flagged by
  recon was already fixed by 20260622135932 (`WITH CHECK auth.uid()=user_id`).
  No action.

## Phase 6 — Edge functions (2026-06-27)

- **P1** · `supabase/functions/parse-bank-statement/index.ts`,
  `parse-pdf-statement/index.ts` · no authentication → open proxy to paid AI
  gateway processing financial data; no payload bound. → Added Supabase
  getUser() auth guard (matches detect-recurring) + input type/size limits.
  functions.invoke attaches JWT and the upload dialog requires login, so call
  sites unaffected. Source-only (not deployed). → lint clean → `91d8a00`

## Phase 12 — Accessibility (2026-06-27)

- **P1** · 19 page components under `src/pages/*` · nested `<main>` inside
  PageLayout's `<main id=main-content>` → duplicate landmark + wrong skip-link
  target (WCAG 2.2). → Converted inner `<main>`→`<div>`. → build OK, 145 tests.
  → `c197cfd`
