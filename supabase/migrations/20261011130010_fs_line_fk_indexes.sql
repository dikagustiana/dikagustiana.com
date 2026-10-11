-- =============================================================================
-- Covering indexes for fs_line's two foreign keys (Plan 1.1).
--
-- The Supabase performance advisor flagged both after
-- 20261011130000_fs_statements.sql was applied (unindexed_foreign_keys):
--   * fs_line_parent_in_scope (parent_id, period_id, statement): deleting or
--     re-keying a line looks up the rows that name it as their parent;
--   * fs_line_fsli_slug_fkey (fsli_slug): deleting or re-slugging an
--     fsli_pages row looks up the statement rows that link to it (ON DELETE
--     SET NULL, ON UPDATE CASCADE).
--
-- DOWN:
--   DROP INDEX public.fs_line_by_parent;
--   DROP INDEX public.fs_line_by_fsli_slug;
-- =============================================================================

CREATE INDEX fs_line_by_parent    ON public.fs_line (parent_id, period_id, statement);
CREATE INDEX fs_line_by_fsli_slug ON public.fs_line (fsli_slug);
