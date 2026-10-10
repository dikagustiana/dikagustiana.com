-- Capital in Motion: one name for one page.
--
-- NOT APPLIED TO PRODUCTION; owner applies via apply_migration (README,
-- "Database & migrations"). Until it lands the /finance card keeps its old
-- title and nothing else changes: the landing reads the column it has always
-- read.
--
-- The page at /finance/capital-allocation is "Capital in Motion" in its h1,
-- its SEO title and its breadcrumb, and the nav says the same; only the
-- /finance card, which reads finance_sections.title, still said "Capital
-- Allocation". Owner decision D6(a) of the October 2026 sweep: one name,
-- everywhere.
--
-- The slug stays capital-allocation, so the address (and what search engines
-- hold for it) does not move. The description is left as it is (R6.4). No
-- new table, column, policy, role, view or function.

UPDATE public.finance_sections
SET title = 'Capital in Motion'
WHERE slug = 'capital-allocation';

-- Assert: the row exists and carries the new title. A mistyped slug would
-- update nothing and pass silently; it must fail the migration instead.
DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.finance_sections
   WHERE slug = 'capital-allocation'
     AND title = 'Capital in Motion';
  IF n <> 1 THEN
    RAISE EXCEPTION 'expected 1 capital-allocation section titled Capital in Motion, found %', n;
  END IF;
END
$assert$;
