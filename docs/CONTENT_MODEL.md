# CONTENT MODEL & HIERARCHY

> The schema below reflects the **final state after all `supabase/migrations/*` are
> applied in timestamp order** — NOT the (stale) generated `types.ts`. The live
> Supabase DB is being migrated concurrently by another session; treat the schema
> as data-driven at runtime and do not hardcode structural assumptions.

## 1. The two content hierarchies

The app has **two parallel content hierarchies**, both ending at `essays`:

### A. Editorial hierarchy (FK-backed)
```
sections (slug, name, voice_role, sort_order, is_active)
  └─ categories (section_id FK→sections, parent_id FK→categories [self], slug, sort_order)
       └─ essays (category_id FK→categories  — NOT NULL, ON DELETE RESTRICT)
```
- `categories.parent_id` exists → **subsections are supported at the schema level**, but
  the public pages and Writer Studio currently treat categories as a **flat list per section**.
- `essays.category_id` is **NOT NULL with FK RESTRICT** (migration `20260215_001`). This is the
  referential-integrity guarantee: **no orphan essays**. Any insert/update without a valid
  `category_id` is rejected by the DB.

### B. Finance curriculum hierarchy (mixed FK + slug)
```
finance_sections (slug = "track")
  └─ finance_modules (track_slug FK→finance_sections.slug, slug, sort_order)
       └─ essays (module_id FK→finance_modules.id [nullable], finance_order, lesson_type)
```

## 2. How each public section places & resolves an essay

Different sections resolve essays by **different fields**. This is the crux of "placement":
what an editor must set so that clicking a leaf opens the right essay.

| Section | Public route | Placement fields the editor must set | Resolution filter |
|---|---|---|---|
| **Finance** | `/finance/:track/:moduleSlug/:essaySlug` | `section='finance'`, `module_id` (FK), `finance_order`, `lesson_type` | essay by global `slug`; lists by `module_id` |
| **Accounting → FSLI** | `/accounting/fsli/:slug` (leaf), essays under it | `fsli_slug` = `fsli_pages.slug` | `essays.eq(fsli_slug, slug)` |
| **Accounting → Consolidation** | `/accounting/consolidation/:topic` | `section='accounting'`, `topic` (enum slug) | `essays.eq(section,'accounting').eq(topic, …)` |
| **Green Transition** | `/green-transition/:phase/:slug` | `section='green-transition'`, `phase` (full DB value e.g. `where-we-are-now`), optional `category_id` | phase page filters by `phase`; essay by global `slug` |
| **Development Finance** | `/development-finance/:phase/:slug` | `section='development-finance'`, `phase` (matches URL slug) | `essays.eq(section).eq(phase)` |
| **Critical Thinking** | `/critical-thinking-research/:phase/:essayId` | `section='critical-thinking'`, `phase` ∈ {clarify,analyze,construct,apply}, `slug` | `:essayId` is actually the **slug** |
| **The Next Big Thing** | `/the-next-big-thing/:slug` | `section='next-big-thing'`, `phase` (topic), optional `category_id` | feed by `section` + topic(`phase`); essay by `slug` |
| **Books** | `/books/:category/:bookId/read` | `books_uploads.category`, file metadata | `books_uploads.eq(category)` / `.eq(id)` |

**Every section also resolves the leaf essay by a globally-unique `essays.slug`.** `slug` is
`UNIQUE` (migration `20260310000954` / `20260215_001`), so a slug collision across sections is
impossible — but it also means an essay is reachable by slug regardless of section, and the
*containing* nav only shows it if the placement field above matches.

## 3. Writer Studio placement: current state vs. gaps

Writer Studio (`src/domains/writing/`) currently lets an admin set: **Section** (→ `section` slug
+ `category.section_id`), **Category** (→ `category_id`, and `phase` is derived by stripping the
section prefix from the category slug), **Slug**, and — for Finance only — **Module / Lesson order /
Lesson type**. It computes a live **URL preview** per section.

**Gaps found (this pass addresses the data-integrity ones):**
1. `essays.category_id` is required by the DB, but Writer Studio only validated category on
   *publish*, so a **draft save with no category errored at the DB** with an opaque message.
   → Now validated on every save with a clear message.
2. **No field to set `fsli_slug`** → essays could not be attached to an FSLI leaf
   (e.g. "Cash Equivalents") from Writer Studio.
3. **No field to set `topic`** → essays could not be attached to a Consolidation topic.
4. `phase` is derived from the category slug; for sections that resolve by `phase`
   (Green Transition / Dev Finance / Critical Thinking / Next Big Thing) the category slugs must be
   named so the derived phase equals the value the public page filters on. This is **data-dependent**
   and brittle; documented for live reconciliation.
5. Dead UI: `tags` and `meta_description` were collected but **no such columns exist** on `essays`,
   so the values were silently discarded.

## 4. Tables (final state, condensed)

Core: `sections`, `categories` (self-ref `parent_id`), `essays` (+ `essay_revisions`),
`pages`, `content_blocks`, `category_cards`, `embeds`.
FSLI: `fsli_pages`, `fsli_sections`.
Finance curriculum: `finance_sections`, `finance_modules`, `finance_models`.
Finance tracking (user-owned): `finance_accounts`, `finance_categories`, `finance_transactions`,
`finance_budgets`, `finance_net_worth_history`.
Markets: `remora_stocks`, `remora_ohlcv_daily`, `remora_corporate_actions`, `remora_signals`,
`remora_ingestion_logs`, `remora_system_health`, `remora_data_freshness`, `remora_watchlist`;
`quant_regimes`, `quant_features`, `quant_signals`, `quant_positions`, `quant_backtests`,
`quant_backtest_results`, `quant_data_quality`.
Identity: `user_roles` (enum `app_role`), `profiles`.

### `essays` columns (final)
`id, section (legacy/denormalized), phase, slug (UNIQUE), title, snippet, author, date,
read_time, thumbnail_url, content (legacy string), content_json (JSONB canonical), layout_config
(JSONB), published, sort_order, category_id (NOT NULL FK), voice_role, prerequisites[],
learning_outcomes[], status (enum), manager_fields/economist_fields/educator_fields/coach_fields
(JSONB), voice_validated_at, fsli_slug, topic, finance_section, finance_order, module_id (FK),
lesson_type (enum), is_selected, created_at, updated_at`.
**No `tags`, no `meta_description`.**

## 5. RLS posture

Every table has RLS enabled with policies. Public content (`sections`, `categories`, `essays`,
`fsli_*`, finance curriculum, markets) is **publicly readable**; **all writes are admin-gated** via
`has_role(auth.uid(),'admin')`. User-owned data (`finance_*` tracking, `profiles`,
`remora_watchlist`) is owner-scoped by `auth.uid() = user_id`. `essay_revisions` is admin-only.

> **Note:** since migration `20260301073018`, **all essays are publicly selectable (even
> unpublished/draft)** — visibility is gated in the app layer, not the DB. Drafts are therefore
> reachable by anyone who knows the slug. Flagged for product decision (see UPGRADE_REPORT "When you
> wake up").

## 6. Functions / triggers / enums

Functions: `has_role(uuid, app_role)` (SECURITY DEFINER), `update_updated_at_column()`,
`handle_new_user()` (auto-create profile), `validate_essay_tone_fields()` (blocks publish unless the
active voice-role fields are filled; auto-sets `tone_pending`), `try_parse_jsonb()`.
Enums: `app_role`, `content_status_enum (draft|tone_pending|published|archived)`,
`voice_role_enum`, `lesson_type_enum`, `account_type`, `transaction_type`, `model_depth`.

## 7. Admin grant

Admin = a row in `user_roles (user_id, role='admin')`. Test seed (`supabase/seed.sql`) provisions
`admin@dika.test` / `user@dika.test`. The production admin is `dika.g.irawan@gmail.com` (grant must
be applied to the live DB — queued).

## 8. Storage buckets

`essay-images`, `embeds`, `books`, `finance-models` — all public-read, admin-write. Storage policies
use a direct `EXISTS(user_roles…)` subquery (not `has_role`) because storage policies can't call
custom functions (migration `20260211100001`).
