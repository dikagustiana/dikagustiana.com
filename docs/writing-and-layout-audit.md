# Writing & Layout Audit (Essay System)

## Scope and method

This audit focuses on the current essay authoring and rendering system for:

- `critical-thinking`
- `green-transition`
- `next-big-thing`

and the relevant admin surfaces under `/admin/content` and `/admin/writer/*`.

---

## 1) Architecture map

### Runtime stack

- Frontend: React + Vite + TypeScript.
- Routing: React Router (`BrowserRouter`, explicit route table).
- Data fetching/state: TanStack Query + Supabase client.
- Auth + authorization: Supabase Auth + `user_roles` table check in app state.
- Rich text engine: TipTap (JSON canonical content format) with custom `figure` node.
- Storage: Supabase Storage bucket `essay-images` for figure assets.

### Core architectural split

There are **two parallel essay authoring surfaces** today:

1. **Writer Studio path** (`/admin/writer/:section/...`)
   - Section-limited to `next-big-thing` and `green-transition`.
   - Uses `WriterEditor` + `EssayEditor`.
   - Stores body as a string in `essays.content` (TipTap JSON string now expected).

2. **Unified Admin Content path** (`/admin/content/:id`)
   - Cross-section authoring path, including `critical-thinking` and broader metadata.
   - Uses `UnifiedEditor` + `PostSettingsPanel` + `ToneFieldsEditor` + `LivePreviewPanel`.
   - Explicitly treats TipTap JSON as canonical for content.

Rendering is also split:

- `critical-thinking` essays render in a legacy `PageLayout` + `dangerouslySetInnerHTML` body path.
- `green-transition` and `next-big-thing` use the editorial stack (`ArticleLayout`, `ArticleHeader`, `ArticleBody`, etc.).

---

## 2) Framework and routing

### Framework

- Single-page React app with route-driven pages.
- Admin routes wrapped in `RequireAdmin`, which redirects non-admins to `/auth`.

### Essay route map

Public essay routes:

- `GET /critical-thinking-research/:phase/:essayId` → `CriticalThinkingEssay`
- `GET /green-transition/:phase/:slug` → `GreenTransitionEssayPage`
- `GET /the-next-big-thing/:slug` → `NextBigThingEssayPage`

Public index/list routes:

- `/critical-thinking-research` and `/critical-thinking-research/:phase`
- `/green-transition` and `/green-transition/:phase`
- `/the-next-big-thing`

Admin writing routes:

- `/admin/content` (unified content manager)
- `/admin/content/:id` (`new` or slug editor)
- `/admin/writer/:section` (writer list)
- `/admin/writer/:section/:slug` (`new` or edit)

---

## 3) Where Essay pages are defined and rendered

### Public rendering pages

- `CriticalThinkingEssay.tsx`
  - Loads by slug via `useEssay(essayId)`.
  - Access gate: non-admin only sees `status === 'published'`.
  - Body rendered from `contentToHtml(content)` via `dangerouslySetInnerHTML` inside a prose wrapper.

- `GreenTransitionEssayPage.tsx`
  - Loads directly from Supabase `.eq('section', 'green-transition').eq('slug', ...)`.
  - Uses editorial rendering components and `ArticleBody` parser.
  - Uses `economist_fields` for deck/key takeaways/references/author bio.

- `NextBigThingEssayPage.tsx`
  - Similar to Green Transition but section `next-big-thing`.

### List/index rendering

- `EditorialFeed` drives list UI and filtering for `green-transition`/`next-big-thing`.
- `GreenTransitionPhase` has a phase-specific custom feed.
- `CriticalThinkingPhase` uses `useEssays({ section, phase })`.

---

## 4) Where content is stored and how it is fetched

### Storage model

Essay content is persisted in `public.essays` with relevant fields:

- identity/routing: `id`, `section`, `phase`, `slug`
- display: `title`, `snippet`, `author`, `date`, `read_time`, `thumbnail_url`
- body: `content` (string; currently TipTap JSON string canonical)
- publication: `status`, `published`
- editorial metadata: `voice_role`, role JSON fields (`manager_fields`, `economist_fields`, etc.)
- relationships: `category_id`, `fsli_slug`, `topic`

### Fetch patterns

- Generic hooks (`useEssays`, `useEssay`, `useFeaturedEssays`, etc.) query `essays` table.
- Editorial pages (`GreenTransitionEssayPage`, `NextBigThingEssayPage`) use direct Supabase queries.
- Lists filter by `status === 'published'` for non-admins.

### Format compatibility

`contentToHtml` detects format:

- If TipTap JSON string with `{"type":"doc"}` → serialized to HTML.
- Else treated as legacy HTML and passed through.

This allows mixed historical content while moving to JSON canonical form.

---

## 5) Admin entry points and permissions model

### Entry points

Primary admin routes for writing:

- `/admin/dashboard`: links to create/manage/health.
- `/admin/content`: unified content table with publish/unpublish/delete.
- `/admin/content/new` and `/admin/content/:slug`: unified editor.
- `/admin/writer/next-big-thing` and `/admin/writer/green-transition`: writer list.
- `/admin/writer/:section/new` and edit route: writer editor.

Section pages also expose admin add actions:

- `GreenTransitionPhase` has “Add Essay” button to `/admin/content/new?...`.
- `TheNextBigThing` has `EssayDialog` add flow.

### Permissions model

App-level permission:

- `AuthContext` loads session and checks `user_roles` for role `admin`.
- `RequireAdmin` gate controls protected routes.

DB-level permission:

- `essays` RLS policy allows select for published or admin role.
- write access for admins only.
- storage policy for `essay-images`: public read; insert/update/delete only for admin role.

Net: frontend + backend enforcement both exist.

---

## 6) Media handling path (upload, storage, rendering)

### Upload

- `FigureUploader` supports:
  - local upload (drag/drop/file picker/paste)
  - remote URL mode
- Allowed MIME: PNG/JPEG/WebP, max 5MB, warning >2MB.
- Upload path convention: `{section-or-drafts}/{timestamp-random}.{ext}`.

### Storage

- Supabase Storage bucket: `essay-images`.
- Bucket set public.
- RLS policies:
  - anyone can `SELECT` objects in this bucket
  - only admin-authenticated users can insert/update/delete

### Rendering

- Uploaded URL saved in figure node attrs (`src`).
- Figure serialized into body content as TipTap `figure` node attrs.
- Render path:
  - editor node view (`FigureBlock`) in editing
  - `ArticleBody` parse + `FigureBlock` in public editorial pages
- Graph-type figures support lightbox behavior.

---

## 7) Writing experience audit (admin)

### Current ways to create/edit essays

#### A) Unified content editor (`/admin/content/:id`)

Pros:

- Cross-section editor.
- Canonical JSON writing surface (`UnifiedEditor`).
- Explicit publish-time validation (`validateForPublish`).
- Side-by-side desktop live preview (`LivePreviewPanel`).
- Post settings + tone fields in collapsible sections.

Constraints/quirks:

- Save/publish redirects back to `/admin/content` (context switch).
- Read time is manually entered in post settings (not auto from content in this flow).
- Preview is desktop-only panel (`hidden lg:block`), no mobile simulation.

#### B) Writer editor (`/admin/writer/:section/:slug`)

Pros:

- Writer-centric UI with split editor/preview and distraction-free mode.
- Auto slug generation (new content).
- Auto read-time and word count from body text.
- Publish checklist includes minimum words, deck, takeaways, figure checks.

Constraints/quirks:

- Only supports two sections (`next-big-thing`, `green-transition`).
- Uses a custom validation set different from unified editor’s publish validator.
- Hero image handled as URL input only (no dedicated hero media manager).

### How an admin creates an essay today (happy path)

Most consistent path:

1. Open `/admin/content/new`.
2. Select section (can be pre-seeded via query params from section pages).
3. Enter title (slug auto-generated if left blank).
4. Write in `UnifiedEditor` (TipTap).
5. Insert figures via toolbar dialog or paste/drop image.
6. Complete post settings (phase, author, snippet, etc.).
7. Optionally fill tone fields.
8. Click Publish → `validateForPublish` runs.
9. On success, save and return to content list.

Alternative path (section-specific): use `/admin/writer/:section/new`.

### Pain points and missing features for flawless writing

1. **Two editor systems** with different validation and UX behavior.
2. **Two rendering pipelines** (critical-thinking legacy vs editorial pages).
3. **No first-class embeds/tables/charts block types** in TipTap config.
4. **No revision history/version compare** in editor flows.
5. **No scheduled publishing workflow**.
6. **Preview lacks route-level context** (related essays, page-level wrappers, SEO tags).
7. **No guaranteed schema-level content typing for blocks** (content is opaque string).
8. **Read-time logic inconsistent across editor paths** (manual vs auto).
9. **No structured citation/reference block model** beyond generic arrays/links.
10. **No media library/asset reuse UI** (upload is per insertion event).

---

## 8) What is required to support images, embeds, tables, charts inside essays

### Images (already partially solved)

Current system already supports robust images/figures.

To complete production-grade image support:

- Add focal-point/crop metadata support for hero and inline figures.
- Add optional caption alignment and size variants.
- Add image reuse picker from storage (not only upload/new URL).
- Add image replace action for existing figure nodes.

### Embeds

Required:

- New TipTap node `embed` with strict whitelist by provider (YouTube, Vimeo, X, etc.) or sandboxed iframe policy.
- Server-side URL sanitation + allowlist rules.
- Responsive embed container rendering component.
- Publish validation for unsupported providers.

### Tables

Required:

- Enable TipTap table extensions (`table`, `tableRow`, `tableCell`, `tableHeader`) OR introduce a structured “data table” block.
- Add editorial CSS for overflow/mobile handling.
- Ensure HTML serialization handles `<table>` semantics safely.
- Accessibility checks (headers, captions).

### Charts

Required:

- Prefer **data-driven chart block** over arbitrary script embeds.
- Block schema: chart type + series data + labels + units + source.
- Renderer can map to existing `ui/chart` Recharts primitives.
- Add fallback static image for SEO/social and no-JS contexts if needed.

---

## 9) Preview accuracy: current state and divergence

### What preview exists

- Writer flow: `WriterPreview` (custom Aeon-style preview panel).
- Unified flow: `LivePreviewPanel` using production `ArticleHeader` + `ArticleBody` + end-matter blocks.

### Where preview diverges from production

1. **Critical Thinking public page uses different layout/rendering path** than editorial preview.
2. **LivePreviewPanel omits some production page context** (e.g., related essays block, back link behavior, route-specific phase label mappings).
3. **Unified preview depends on `economistFields.hero_image_url`**, while some public pages use `thumbnail_url` directly; this can misrepresent hero image presence.
4. **No full-fidelity per-route preview mode** (preview isn’t literally rendering the target route component with draft data).
5. **Desktop-only preview in unified editor** hides preview entirely on smaller screens.

Conclusion: preview is strong but not yet truly WYSIWYG across all sections and page shells.

---

## 10) Layout editing audit

### Current layout system for essays and other pages

Essays:

- `green-transition`/`next-big-thing`: editorial composition (`ArticleLayout` + fixed section order: header → body → takeaways → references → author → related).
- `critical-thinking`: legacy `PageLayout` article wrapper with prose HTML render.

Other pages:

- Mostly hard-coded React page structures.
- Some non-essay content allows inline block editing via `EditableText` + `content_blocks` table.

### Hard-coded vs data-driven

Hard-coded:

- Most route-level page layouts and section order.
- Essay chrome sequence (header/body/end matter/related) in page components.

Data-driven:

- Essay body content and metadata fields from `essays`.
- Tone/voice metadata fields.
- Some generic text blocks on non-essay pages via `content_blocks`.

### What is safe to make draggable (with constraints)

Safe, constrained reordering candidates:

- End-matter block order among:
  - key takeaways
  - references
  - author box
  - related essays
- Optional insertions between body and end-matter:
  - pull quote block
  - callout block
  - data table block

Constraints to enforce:

- `ArticleHeader` must remain first.
- `ArticleBody` must remain second.
- `RelatedEssays` should remain last for engagement consistency.
- Max 1 instance for structural blocks (header, body, related, author box).
- Preserve semantic heading hierarchy and SEO-critical elements.

This is aligned with “constrained section reordering” rather than freeform builder.

---

## 11) Risk list

### Top 10 highest-risk changes

1. **Migrating content storage format again** without backward parser compatibility.
2. **Replacing route structure/slugs** (can break inbound links and indexing).
3. **Converging editors without migration plan** (writer workflow regressions).
4. **Adding untrusted embed support** without sanitization (security risk).
5. **Expanding block types without serializer parity** (preview/prod mismatches).
6. **Breaking RLS assumptions for essay-images bucket** (upload failures or leaked write access).
7. **Changing publication logic around `status` vs `published`** inconsistently.
8. **Removing legacy HTML fallback too early** (old essays can fail rendering).
9. **Making layout freeform** (design drift, accessibility regressions, maintenance explosion).
10. **Adding heavy interactive chart JS in body unbounded** (performance and CLS risk).

### What could break SEO, performance, or styling consistency

SEO risks:

- URL/path changes without redirects.
- Missing consistent heading structure in new blocks.
- Removing server-readable text content in favor of opaque embeds.

Performance risks:

- Large unoptimized images and chart payloads.
- Too many interactive blocks per article.
- No lazy loading for heavy embeds/charts.

Styling consistency risks:

- Freeform arbitrary layout controls.
- Multiple rendering engines/stylesheets for same block types.
- Divergent preview and production components.

---

## 12) Recommendation

## Chosen content model: **Structured JSON blocks** (not MDX)

### Why JSON blocks fit this repo better

- Existing editor architecture already centered on TipTap JSON canonical content.
- Existing serializer/parser and figure extraction are JSON-aware.
- Current validation pipeline (`validateForPublish`) operates on parsed JSON blocks.
- Existing admin UI depends on block metadata (figures, tone checks).
- MDX would introduce code execution/component boundary complexity and higher trust/sanitization concerns for admin content.

### Decision

Adopt and formalize **structured JSON blocks** as the only canonical essay body model.

Keep legacy HTML read-only compatibility temporarily for migration.

---

## Chosen layout model: **Constrained section reordering** (not freeform builder)

### Why this model

- Current design language is editorial and consistent across sections.
- SEO and readability depend on stable article anatomy.
- Team currently has split renderer/editor systems; freeform would amplify complexity.

### Decision

Implement a **limited layout schema**:

```text
[Header] [Body] [Optional Modules*] [End Matter Ordered Subset] [Related]
```

where only selected module slots are reorderable within constraints.

---

## Smallest viable block + layout control set (80/20)

### Body block set (phase 1)

1. Paragraph (with inline marks)
2. H2
3. H3
4. Bullet list
5. Ordered list
6. Blockquote
7. Horizontal rule
8. Figure (existing)
9. Table (new)
10. Embed (new, provider allowlist)
11. Chart (new, data-driven config)

### End-matter modules (phase 1)

- Key takeaways (optional)
- References (optional)
- Author box (optional)
- Related essays (required, fixed last)

### Layout controls (phase 1)

- Toggle visibility for optional end-matter modules.
- Reorder optional end-matter modules via drag handle.
- Keep Header/Body fixed.
- Persist module order as compact JSON in `economist_fields` (or dedicated column) for editorial sections.

This solves the majority of practical writing/layout needs while preserving style and SEO discipline.

---

## Suggested execution sequence (minimal-risk)

1. **Unify rendering baseline**
   - Move `critical-thinking` to editorial `ArticleBody` pipeline for consistency.
2. **Unify publish validation**
   - One validator shared by writer/admin flows.
3. **Add table block**
   - Lowest-risk new block with clear semantics.
4. **Add allowlisted embed block**
   - With strict sanitization and responsive wrapper.
5. **Add data-driven chart block**
   - Reuse existing chart primitives.
6. **Add constrained end-matter ordering**
   - Preserve fixed header/body/related boundaries.
7. **Deprecate duplicate writer flow gradually**
   - Keep URLs but back them by same editor core.

---

## Bottom line

The repo already has strong foundations for structured writing (TipTap JSON + figure nodes + publish-time validation + role-aware admin controls). The main problem is **fragmentation** (two editor flows, mixed rendering paths, uneven preview fidelity).

The safest path is to standardize on **structured JSON blocks + constrained layout ordering**, then add **table/embed/chart blocks** incrementally with strict validation and reusable production components.
