-- FSLI: point a line item that has no essay of its own at the line item whose
-- essay covers it.
--
-- NOT APPLIED TO PRODUCTION; owner applies via apply_migration (README,
-- "Database & migrations"). The site reads the column defensively: fsli_pages
-- is read with select *, so until the column exists the key is simply absent
-- and the page treats it as NULL, which shows nothing in its place. A deploy
-- ahead of this migration changes nothing a reader can see.
--
-- An essay names one line item (essays.fsli_slug), so the non-current portion
-- or the breakdown of a written line item has no essay of its own. Owner
-- decision D2(a) of the October 2026 site sweep: covered_by_slug names the
-- page whose essay covers it, and the page shows one sentence, "Covered in
-- <essay title>", linking there. NULL means not covered; the three
-- other-*-assets pages stay NULL.
--
-- A foreign key to fsli_pages (slug), like fsli_sections.page_slug. ON UPDATE
-- CASCADE keeps the pointer through a re-slug. ON DELETE SET NULL because
-- useUnifiedContent deletes fsli_pages rows directly: deleting a covering page
-- must neither fail on the pages that point at it nor take them with it.
--
-- One nullable text column on fsli_pages. The anon read policy on fsli_pages
-- covers it as it covers every other column; no new table, policy, role, view
-- or function. Re-running is harmless: the column add is IF NOT EXISTS, and
-- each UPDATE touches only rows still NULL, so a pointer the owner changed
-- afterwards is kept.
--
-- The mapping is not an edit to those eight pages. fsli_pages stamps
-- updated_at on every UPDATE (trigger update_fsli_pages_updated_at), and the
-- page prints that column as "Updated <date>", so the trigger is disabled
-- around the UPDATEs and their pages keep the date they had. Everything runs
-- in one transaction, so a failure part-way cannot leave the trigger off.

BEGIN;

ALTER TABLE public.fsli_pages
  ADD COLUMN IF NOT EXISTS covered_by_slug text
    REFERENCES public.fsli_pages (slug) ON UPDATE CASCADE ON DELETE SET NULL;

COMMENT ON COLUMN public.fsli_pages.covered_by_slug IS
  'Slug of the line item whose essay covers this one; the page links there. NULL when not covered.';

ALTER TABLE public.fsli_pages DISABLE TRIGGER update_fsli_pages_updated_at;

UPDATE public.fsli_pages SET covered_by_slug = 'restricted-cash'
 WHERE slug = 'restricted-cash-non-current'
   AND covered_by_slug IS NULL;

UPDATE public.fsli_pages SET covered_by_slug = 'trade-receivables-net'
 WHERE slug IN ('trade-receivables-net-non-current', 'third-parties', 'related-parties')
   AND covered_by_slug IS NULL;

-- other-receivables-net and other-non-current-receivables pointed at
-- due-from-government here. Superseded before this file was ever applied:
-- 20261012100100_fsli_covered_by_essays_2026_10.sql maps them from the
-- essays of 11 Oct 2026 (trade-receivables-net, and none).

UPDATE public.fsli_pages SET covered_by_slug = 'corporate-dividend-taxes-receivable-current'
 WHERE slug = 'corporate-dividend-taxes-receivable-non-current'
   AND covered_by_slug IS NULL;

UPDATE public.fsli_pages SET covered_by_slug = 'advances-prepayments-current'
 WHERE slug = 'advances-prepayments-non-current'
   AND covered_by_slug IS NULL;

ALTER TABLE public.fsli_pages ENABLE TRIGGER update_fsli_pages_updated_at;

COMMIT;
