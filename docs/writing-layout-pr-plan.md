# Writing & Layout PR Plan

This plan is based on `docs/writing-and-layout-spec.md` and constrained to **7 PRs** (small, reversible).

---

## PR 1 — Schema foundation (safe additive)

### Scope

- Add canonical + layout columns on `essays`.
- Add `essay_revisions` table, indexes, and RLS.

### Touched files

- `supabase/migrations/20260212090000_add_content_json_layout_and_revisions.sql`
- `src/integrations/supabase/types.ts` (regenerated)

### Migration steps

1. Apply migration.
2. Regenerate Supabase TS types.

### Reversibility

- Fully additive; app behavior unchanged.
- Can rollback by dropping added columns/table.

### Acceptance checks

- Migration applies cleanly.
- `essays` has `content_json`, `layout_config`.
- `essay_revisions` exists with indexes + policies.

---

## PR 2 — Backfill and read fallback utilities

### Scope

- Backfill `content_json` from `content` where value is valid TipTap JSON.
- Add shared content resolver helper (JSON preferred, legacy fallback).

### Touched files

- `supabase/migrations/20260212091000_backfill_content_json_from_content.sql`
- `src/lib/tiptap/serialize.ts` (small helper extensions)
- `src/lib/editorial/contentResolver.ts` (new)

### Migration steps

1. Apply backfill SQL.
2. Verify non-null `content_json` count for valid JSON legacy rows.

### Reversibility

- Backfill is non-destructive (`content` retained).
- Helper usage can be reverted without data loss.

### Acceptance checks

- Valid JSON rows copied to `content_json`.
- Legacy HTML rows remain renderable.

---

## PR 3 — Shared rendering contract adoption

### Scope

- Introduce `resolveEssayRenderProps(essay, viewerContext)`.
- Switch public essay pages + admin preview to consume same resolver.

### Touched files

- `src/lib/editorial/resolveEssayRenderProps.ts` (new)
- `src/pages/GreenTransitionEssayPage.tsx`
- `src/pages/NextBigThingEssayPage.tsx`
- `src/pages/CriticalThinkingEssay.tsx`
- `src/components/admin/LivePreviewPanel.tsx`
- `src/components/editorial/ArticleBody.tsx` (if needed for unified content input)

### Migration steps

- None.

### Reversibility

- Resolver layer can be removed while keeping existing page-specific logic.

### Acceptance checks

- Draft access behavior unchanged (admin vs non-admin).
- Preview and production pages output matching header/body for same input.

---

## PR 4 — Editor unification and single validator

### Scope

- Use `UnifiedEditor` as single core across admin flows.
- Replace duplicated writer-side publish validation with `validateForPublish`.
- Add shared metrics derivation (word count/read-time) from TipTap JSON.

### Touched files

- `src/components/admin/UnifiedEditor.tsx`
- `src/components/writer/WriterEditor.tsx`
- `src/components/writer/WriterValidation.tsx` (remove/adapter)
- `src/lib/admin/publishValidation.ts`
- `src/lib/editorial/metrics.ts` (new)
- `src/pages/WriterEditorPage.tsx` (if route wrapper updates needed)

### Migration steps

- None.

### Reversibility

- Keep route-level wrappers; can revert by re-wiring writer editor internals.

### Acceptance checks

- Both `/admin/content/:id` and `/admin/writer/:section/:slug` publish through same validator.
- Read-time/word-count match for same document in both UIs.

---

## PR 5 — Table block end-to-end

### Scope

- Add TipTap table extensions to editor extension registry.
- Add renderer and serializer parity for table nodes.
- Add mobile overflow styling and table validation.

### Touched files

- `src/lib/tiptap/extensions.ts`
- `src/lib/tiptap/serialize.ts`
- `src/components/admin/UnifiedEditor.tsx` (toolbar commands)
- `src/components/editorial/ArticleBody.tsx`
- `src/lib/admin/publishValidation.ts`
- `src/index.css` (table overflow styles)

### Migration steps

- None.

### Reversibility

- Extensions/renderer logic can be removed without schema changes.

### Acceptance checks

- Author can insert/edit table in admin editor.
- Table renders in preview + production identically.
- Unsupported/malformed table blocks fail publish.

---

## PR 6 — Embed + chart blocks end-to-end

### Scope

- Add embed block with allowlist + URL sanitizer + responsive renderer.
- Add chart block with data schema + renderer using existing chart primitives.
- Add publish validation for both.

### Touched files

- `src/lib/tiptap/extensions.ts`
- `src/components/admin/UnifiedEditor.tsx`
- `src/components/editorial/ArticleBody.tsx`
- `src/components/editorial/EmbedBlock.tsx` (new)
- `src/components/editorial/ChartBlock.tsx` (new)
- `src/lib/editorial/embedSanitizer.ts` (new)
- `src/lib/editorial/chartSchema.ts` (new)
- `src/lib/admin/publishValidation.ts`

### Migration steps

- None.

### Reversibility

- Block types removable by stripping extension + renderer + validator code.

### Acceptance checks

- Unsupported embed URL blocks publish.
- Supported embeds render responsive in preview + production.
- Chart blocks render correctly from schema and fail publish on missing required fields.

---

## PR 7 — Constrained layout config + revision history writes

### Scope

- Add layout config resolver/guardrails + drag reorder UI for allowed modules.
- Persist per-essay `layout_config`.
- Write `essay_revisions` snapshot on save/publish.

### Touched files

- `src/lib/editorial/layoutConfig.ts` (new)
- `src/components/admin/PostSettingsPanel.tsx` (or dedicated layout panel)
- `src/pages/AdminContentEditor.tsx`
- `src/components/writer/WriterEditor.tsx`
- `src/hooks/queries/useAdminEssays.ts` (mutation payload extensions)
- `src/lib/editorial/resolveEssayRenderProps.ts` (module order application)

### Migration steps

- None (schema already added in PR 1).

### Reversibility

- Can disable layout DnD UI and stop writing revisions while keeping schema intact.

### Acceptance checks

- End-matter modules reorder only within constraints.
- Structural modules cannot be duplicated/removed.
- `layout_config` persists and affects preview + production consistently.
- Save/publish actions create `essay_revisions` rows.

---

## Operational checks for every PR

- Typecheck/build and lint target scope.
- Verify published route behavior for all 3 essay sections.
- Verify draft access restrictions (admin-only) unchanged.
- Verify no SEO path changes or slug format changes.

