-- =============================================================================
-- "Covered in <essay>" for the line-item pages that have no essay of their own
-- (owner decision D2(a) of the October 2026 sweep; plan D3(a) of 12 Oct 2026).
--
-- 20261010100000_fsli_covered_by.sql designed this and was never applied. Its
-- column is added here unchanged; its mapping is not, because the essays of
-- 11 Oct 2026 moved two claims: essay 10 (trade receivables) now covers other
-- receivables, which pointed at due-from-government, and essay 06 (advances
-- and prepayments) covers other current and other non-current assets, which
-- pointed nowhere. Each pointer below is an essay's own `also_covers` (or, for
-- the component pages, the line they break down). other-non-current-receivables
-- stays NULL: no essay claims it.
--
-- Either order of the two files ends in this mapping. The older file no
-- longer sets the two due-from-government pointers this one supersedes, and
-- each of its other UPDATEs touches only rows still NULL, so applied after
-- this it changes nothing. A database where it did run as first written
-- (a replay of an earlier checkout) holds those two stale pointers, and this
-- one replaces exactly that value; a pointer anyone set by hand is kept.
--
-- updated_at is stamped on every UPDATE and printed on the page as
-- "Updated <date>", so the trigger is suspended around the UPDATEs, in one
-- transaction, and these pages keep the date they had.
--
-- DOWN:
--   ALTER TABLE public.fsli_pages DROP COLUMN covered_by_slug;
-- =============================================================================

BEGIN;

ALTER TABLE public.fsli_pages
  ADD COLUMN IF NOT EXISTS covered_by_slug text
    REFERENCES public.fsli_pages (slug) ON UPDATE CASCADE ON DELETE SET NULL;

COMMENT ON COLUMN public.fsli_pages.covered_by_slug IS
  'Slug of the line item whose essay covers this one; the page links there. NULL when not covered.';

ALTER TABLE public.fsli_pages DISABLE TRIGGER update_fsli_pages_updated_at;

UPDATE public.fsli_pages SET covered_by_slug = 'restricted-cash'
 WHERE slug = 'restricted-cash-non-current' AND covered_by_slug IS NULL;

UPDATE public.fsli_pages SET covered_by_slug = 'trade-receivables-net'
 WHERE slug IN ('trade-receivables-net-non-current', 'third-parties', 'related-parties', 'other-receivables-net')
   AND covered_by_slug IS NULL;

-- The older migration's stale pointers, where a replay has set them.
UPDATE public.fsli_pages SET covered_by_slug = 'trade-receivables-net'
 WHERE slug = 'other-receivables-net' AND covered_by_slug = 'due-from-government';

UPDATE public.fsli_pages SET covered_by_slug = NULL
 WHERE slug = 'other-non-current-receivables' AND covered_by_slug = 'due-from-government';

UPDATE public.fsli_pages SET covered_by_slug = 'corporate-dividend-taxes-receivable-current'
 WHERE slug = 'corporate-dividend-taxes-receivable-non-current' AND covered_by_slug IS NULL;

UPDATE public.fsli_pages SET covered_by_slug = 'advances-prepayments-current'
 WHERE slug IN ('advances-prepayments-non-current', 'other-current-assets', 'other-non-current-assets', 'other-non-current-assets-final')
   AND covered_by_slug IS NULL;

ALTER TABLE public.fsli_pages ENABLE TRIGGER update_fsli_pages_updated_at;

COMMIT;
