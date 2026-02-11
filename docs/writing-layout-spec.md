# Writing & Layout Implementation Spec

## Status

- Source of truth for current state: `docs/writing-and-layout-audit.md`.
- This document defines the **target implementation** and migration-safe rollout.
- Scope: essay sections (`critical-thinking`, `green-transition`, `next-big-thing`) with unified authoring + rendering.

---

## 1) Goals and non-goals

### Goals

1. Canonical structured essay body (`content_json`) with backward compatibility.
2. One rendering contract used by production pages and admin preview.
3. One editor core and one publish validator.
4. First-class blocks for table/embed/chart with validation + rendering parity.
5. Constrained layout ordering persisted in DB (`layout_config`).
6. Version history via `essay_revisions`.

### Non-goals (this phase)

- Freeform page builder.
- MDX runtime evaluation.
- Arbitrary third-party script embeds.

---

## 2) Data model changes

## 2.1 `essays` table

Add columns:

- `content_json jsonb null`
  - Canonical body format (TipTap JSON doc).
  - Expected shape: object with `type = 'doc'`, `content[]`.

- `layout_config jsonb null`
  - Constrained module order/toggles.
  - Per-essay override. If null, section defaults apply in app-level resolver.

Keep existing:

- `content text null` as legacy fallback during migration.

### Suggested `layout_config` schema (v1)

```json
{
  "version": 1,
  "optional_modules": ["pull_quote", "callout", "data_table"],
  "end_matter_order": ["key_takeaways", "references", "author_box", "related_essays"],
  "toggles": {
    "key_takeaways": true,
    "references": true,
    "author_box": true,
    "related_essays": true
  }
}
```

Constraints enforced in app validator:

- `related_essays` always enabled and last.
- No duplicate module IDs.
- Structural modules (`header`, `body`) are not reorderable and not user-removable.

## 2.2 `essay_revisions` table

Purpose: revision history and rollback source.

Columns:

- `id uuid pk default gen_random_uuid()`
- `essay_id uuid not null references public.essays(id) on delete cascade`
- `revision_no integer not null`
- `change_type text not null` (`create|autosave|manual_save|publish|unpublish|rollback|migration`)
- `title text null`
- `snippet text null`
- `content_json jsonb null`
- `layout_config jsonb null`
- `status public.content_status_enum null`
- `voice_role text null`
- `changed_by uuid null`
- `change_summary text null`
- `created_at timestamptz not null default now()`

Indexes:

- `idx_essay_revisions_essay_created_at (essay_id, created_at desc)`
- `idx_essay_revisions_essay_revision_no (essay_id, revision_no desc)`
- Unique `(essay_id, revision_no)`

RLS:

- Admin-only select/insert/delete/update (consistent with admin content operations).

---

## 3) Migration strategy

1. Schema migration adds `content_json`, `layout_config`, `essay_revisions`.
2. Backfill migration parses existing `content`:
   - If valid TipTap JSON doc string, copy into `content_json`.
   - Else leave `content_json = null` and keep legacy `content` for render fallback.
3. App write path update:
   - Editor writes `content_json` always.
   - Optionally mirror to `content` for temporary compatibility (or stop once all reads migrated).
4. Read path update:
   - Prefer `content_json`; fallback to `content`.
5. Sunset plan:
   - After completion + confidence window, deprecate fallback usage.

---

## 4) Shared rendering contract

Create one resolver used by all essay pages and admin preview.

### API

```ts
type ViewerContext = {
  isAdmin: boolean;
  isPreview: boolean; // admin preview/draft mode
  section: 'critical-thinking' | 'green-transition' | 'next-big-thing';
  routePhase?: string | null;
};

type ResolvedArticleProps = {
  header: {
    title: string;
    deck?: string | null;
    author?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    readTime?: string | null;
    topic?: string | null;
    heroImage?: string | null;
    heroCaption?: string | null;
  };
  body: {
    contentJson?: JSONContent | null;
    legacyHtml?: string | null;
  };
  modules: {
    keyTakeaways: string[];
    references: Array<{ label: string; url?: string }>;
    authorBio?: string | null;
    layoutConfig: LayoutConfigResolved;
  };
  access: {
    canView: boolean;
    redirectTo?: string;
  };
};

function resolveEssayRenderProps(
  essay: EssayRecord,
  viewer: ViewerContext,
): ResolvedArticleProps;
```

### Rules

- Access gate standardized here (`status === 'published'` for non-admins unless preview mode).
- Content resolution:
  - If `content_json` exists: render from JSON.
  - Else if legacy `content` exists: render legacy.
- Header extraction normalized for all sections.
- `layout_config` merged with section defaults, then per-essay overrides.

### Usage contract

- `GreenTransitionEssayPage`, `NextBigThingEssayPage`, `CriticalThinkingEssay`, and `LivePreviewPanel` must all consume the same resolved props.

---

## 5) Editor unification

## Decision

Use **`UnifiedEditor`** as the single editor core for all essay sections.

### Implementation rules

- Replace Writer flow internals to call `UnifiedEditor` (retain route shells short-term).
- Remove duplicated validation logic in `WriterValidation` path.
- Keep one validator: `validateForPublish` (extended for new blocks/layout checks).

### Derived metrics

Single shared utility:

```ts
function deriveEssayMetricsFromDoc(doc: JSONContent | null): {
  wordCount: number;
  readTime: string; // e.g. "7 min read"
};
```

- Used in all admin editors and saved to `read_time` consistently.
- Word count derived from TipTap text extraction only.

---

## 6) New blocks

## 6.1 Table block

### Editor

- Enable TipTap table extensions:
  - `@tiptap/extension-table`
  - `@tiptap/extension-table-row`
  - `@tiptap/extension-table-cell`
  - `@tiptap/extension-table-header`

### Rendering

- `ArticleBody` supports table node rendering path.
- Wrap tables in overflow container for mobile:
  - horizontal scroll
  - sticky header optional (future)

### Serialization parity

- JSON->HTML serializer supports table nodes.
- Legacy compatibility remains unchanged.

### Validation

- Reject publish for malformed table node structures.
- Warn for wide tables with >N columns (mobile readability risk).

## 6.2 Embed block

### Block schema

```ts
type EmbedBlockData = {
  provider: 'youtube' | 'vimeo' | 'x' | 'spotify';
  url: string;
  title?: string;
};
```

### Sanitization

- Parse URL with strict allowlist by hostname + pathname patterns.
- Normalize to canonical embed URL format.
- Unsupported provider/url => publish validation error.

### Rendering

- Responsive iframe wrapper (`aspect-video` default).
- Sandbox attributes and restrictive `allow` list.

## 6.3 Chart block

### Block schema

```ts
type ChartBlockData = {
  chartType: 'line' | 'bar' | 'area';
  title?: string;
  description?: string;
  xKey: string;
  series: Array<{ key: string; label: string; color?: string }>;
  data: Array<Record<string, string | number>>;
  sourceName?: string;
  sourceUrl?: string;
};
```

### Renderer

- Uses existing `src/components/ui/chart.tsx` primitives.
- Chart component maps schema -> Recharts config.

### Validation

Publish fails if:

- `xKey` missing.
- `series` empty.
- `data` empty.
- Any series key missing from data rows.

Warn if:

- Data row count exceeds threshold (payload size risk).

---

## 7) Constrained drag-and-drop layout

### Allowed reorder scope

- End-matter modules only:
  - `key_takeaways`
  - `references`
  - `author_box`
  - `related_essays`
- Optional modules list order also editable within constrained set.

### Guardrails

- Structural modules fixed:
  - `header` first
  - `body` second
- `related_essays` cannot be removed; always last in end matter.
- No duplicate module IDs.
- Unknown module IDs rejected.

### Persistence

- Persist effective per-essay override in `essays.layout_config`.
- Section defaults stored in app config map (initially); later optional DB table if needed.

### Resolution

`resolveLayoutConfig(sectionDefault, essayOverride)`:

1. validate override
2. merge with default
3. enforce hard constraints
4. return final deterministic order/toggles

---

## 8) Revision history behavior

On each save/publish action:

1. Determine next `revision_no` for `essay_id` (max + 1).
2. Insert snapshot into `essay_revisions` with:
   - `content_json`
   - `layout_config`
   - key metadata (`title`, `snippet`, `status`, `voice_role`)
3. `changed_by` = authenticated user id.

Rollback behavior (later PR):

- choose revision
- copy snapshot back into `essays`
- insert new revision row with `change_type='rollback'`

---

## 9) Acceptance criteria (system-level)

1. All essay pages and admin preview render from shared resolver contract.
2. New writes persist canonical `content_json`.
3. Legacy essays still render via fallback without breakage.
4. One publish validator path used by all admin entry points.
5. Tables/embeds/charts render in preview and production with parity.
6. Layout reorder persists and respects constraints.
7. Each save/publish creates `essay_revisions` entry.

