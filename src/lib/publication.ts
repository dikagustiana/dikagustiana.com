/**
 * What "published" means, in one place.
 *
 * The `essays` row carries TWO fields that look like publication state:
 *
 *   published  boolean, default false
 *   status     content_status_enum, default 'draft'
 *
 * Only one of them is enforced. Row Level Security on `public.essays` gates
 * anonymous reads on `published = true` (`essays_select_anon_published`), and
 * authenticated reads on `published = true OR caller is admin`
 * (`essays_select_authenticated`). `status` is application metadata: nothing
 * in the database consults it, so a query filtering on it is filtering a
 * second, unenforced field on top of the one that actually holds.
 *
 * Verified against the live project (`asypkbkiebjvvpimewfp`) on 2026-09-14 by
 * reading `pg_policy` and the column definitions directly. On that date the
 * two fields agreed on every one of 165 rows — 160 (`draft`, false) and 5
 * (`published`, true) — so nothing was visibly broken. The failure they would
 * produce is quiet either way: a row with `published = true` and a `status`
 * that is not `'published'` is served by RLS and then filtered out by the
 * application, which renders as "no essays in this phase yet" on a section
 * that has one.
 *
 * So: filter on the field RLS enforces, and treat `status` as the writer's
 * workflow label. Both are still written together by the publish flow; this
 * only decides which one a READ is allowed to depend on.
 *
 * NOT verified, and deliberately not assumed: whether every deployment of this
 * schema carries the same policies. The constant below is the single place to
 * change if that ever stops being true.
 */

/** The column RLS actually gates reads on. */
export const PUBLISHED_COLUMN = 'published' as const;

/**
 * Apply the publication filter to a PostgREST query builder.
 *
 * Typed structurally rather than against the generated Supabase types: the
 * various call sites build different row shapes, and pinning one of them here
 * would make the helper unusable from the others without a cast at every use.
 */
export function onlyPublished<T extends { eq(column: string, value: unknown): T }>(query: T): T {
  return query.eq(PUBLISHED_COLUMN, true);
}
