-- =============================================================================
-- Foundations of Knowing: Mathematization becomes Part 3 (owner, 2026-10-26).
--
-- The owner's case: mathematics is not formulas but the way a problem is taken
-- apart and translated into a model, and the result translated back. It sits
-- between Logic (does the conclusion follow?) and Argument (how claims are
-- built), so Argument..Strategic Finance move up one number. The order of the
-- parts is src/config/foundationsOfKnowing.ts (FOUNDATIONS_PARTS).
--
-- 1. Categories critical-thinking-<part> with sort_order >= 3 move up one:
--    sort_order + 1 and the name's "Part N" with it ("Part 4 · Argument").
-- 2. One new category critical-thinking-mathematization, "Part 3 ·
--    Mathematization", sort_order 3.
-- 3. Every critical-thinking essay with sort_order >= 300 moves up 100, so
--    sort_order stays part × 100 + place (Argument 301..306 -> 401..406, ...,
--    Strategic Finance 901..906 -> 1001..1006). Phase ids do not change, so
--    no URL changes: /foundations-of-knowing/<phase>/<slug> stays the same.
--    essays.sort_order has no unique constraint, so one UPDATE is safe.
-- 4. Six draft stubs 301..306, built as the 2026-10-24 stubs were.
--
-- Fails closed: the ten part categories must be there with sort_order 0..9,
-- the mathematization category must not exist, no critical-thinking essay may
-- sit at sort_order >= 1000 already, and no seed slug may be taken.
--
-- Apply individually (MCP apply_migration or the SQL editor), never with
-- `supabase db push`.
--
-- DOWN (in this order):
--   DELETE FROM public.essays WHERE section = 'critical-thinking' AND phase = 'mathematization'
--     AND status = 'draft' AND content IS NULL;
--   UPDATE public.essays SET sort_order = sort_order - 100
--     WHERE section = 'critical-thinking' AND sort_order >= 400;
--   DELETE FROM public.categories WHERE slug = 'critical-thinking-mathematization';
--   UPDATE public.categories c SET sort_order = c.sort_order - 1,
--          name = 'Part ' || (c.sort_order - 1) || ' · ' || split_part(c.name, ' · ', 2)
--     FROM public.sections s
--    WHERE s.id = c.section_id AND s.slug = 'critical-thinking' AND c.sort_order >= 4;
-- =============================================================================

-- 0. Preconditions ------------------------------------------------------------
CREATE TEMP TABLE fok_math_seed (sort_order integer, slug text, title text);
INSERT INTO fok_math_seed (sort_order, slug, title) VALUES
  (301, 'mathematics-is-not-formulas', 'Mathematics Is Not Formulas'),
  (302, 'dissecting-a-problem', 'Dissecting a Problem'),
  (303, 'from-words-to-variables', 'From Words to Variables'),
  (304, 'assumptions-are-the-model', 'Assumptions Are the Model'),
  (305, 'proofs-and-refutations', 'Proofs and Refutations'),
  (306, 'unreasonable-effectiveness-and-its-limits', 'The Unreasonable Effectiveness of Mathematics, and Its Limits');

DO $pre$
DECLARE n integer; taken text; orders text;
BEGIN
  SELECT string_agg(c.sort_order::text, ',' ORDER BY c.sort_order) INTO orders
    FROM public.categories c JOIN public.sections s ON s.id = c.section_id
   WHERE s.slug = 'critical-thinking';
  IF orders IS DISTINCT FROM '0,1,2,3,4,5,6,7,8,9' THEN
    RAISE EXCEPTION 'critical-thinking categories have sort_order %, expected 0..9', orders;
  END IF;

  IF EXISTS (SELECT 1 FROM public.categories WHERE slug = 'critical-thinking-mathematization') THEN
    RAISE EXCEPTION 'critical-thinking-mathematization already exists';
  END IF;

  SELECT count(*) INTO n FROM public.essays WHERE section = 'critical-thinking' AND sort_order >= 1000;
  IF n <> 0 THEN
    RAISE EXCEPTION '% critical-thinking essay(s) already at sort_order >= 1000', n;
  END IF;

  SELECT string_agg(e.slug, ', ') INTO taken
    FROM public.essays e JOIN fok_math_seed f ON f.slug = e.slug;
  IF taken IS NOT NULL THEN
    RAISE EXCEPTION 'seed slug(s) already taken in public.essays: %', taken;
  END IF;
END
$pre$;

-- 1. Parts 3..9 move up one -----------------------------------------------------
UPDATE public.categories c
   SET sort_order = c.sort_order + 1,
       name = 'Part ' || (c.sort_order + 1) || ' · ' || split_part(c.name, ' · ', 2)
  FROM public.sections s
 WHERE s.id = c.section_id AND s.slug = 'critical-thinking' AND c.sort_order >= 3;

-- 2. The new part -----------------------------------------------------------------
INSERT INTO public.categories (section_id, slug, name, sort_order)
SELECT s.id, 'critical-thinking-mathematization', 'Part 3 · Mathematization', 3
FROM public.sections s
WHERE s.slug = 'critical-thinking';

-- 3. Their essays move up 100 -----------------------------------------------------
UPDATE public.essays
   SET sort_order = sort_order + 100
 WHERE section = 'critical-thinking' AND sort_order >= 300;

-- 4. The six stubs ----------------------------------------------------------------
INSERT INTO public.essays (section, phase, slug, title, sort_order, status, published, content, voice_role, category_id)
SELECT 'critical-thinking', 'mathematization', f.slug, f.title, f.sort_order,
       'draft'::content_status_enum, false, NULL, s.voice_role, c.id
FROM fok_math_seed f
JOIN public.sections s ON s.slug = 'critical-thinking'
JOIN public.categories c ON c.section_id = s.id AND c.slug = 'critical-thinking-mathematization';

-- Asserts -----------------------------------------------------------------------
DO $assert$
DECLARE n integer; names text;
BEGIN
  SELECT string_agg(c.name, ' | ' ORDER BY c.sort_order) INTO names
    FROM public.categories c JOIN public.sections s ON s.id = c.section_id
   WHERE s.slug = 'critical-thinking';
  IF names IS DISTINCT FROM
     'Part 0 · Before We Go Far | Part 1 · Knowing | Part 2 · Logic | Part 3 · Mathematization | '
     'Part 4 · Argument | Part 5 · Evidence & Sources | Part 6 · How Science Corrects Itself | '
     'Part 7 · Dialectics & Change | Part 8 · Uncertainty | Part 9 · Judgment Under Pressure | '
     'Part 10 · Strategic Finance as Applied Judgment' THEN
    RAISE EXCEPTION 'part categories are now: %', names;
  END IF;

  SELECT count(*) INTO n FROM public.essays
   WHERE section = 'critical-thinking' AND phase = 'mathematization'
     AND status = 'draft' AND NOT published AND content IS NULL;
  IF n <> 6 THEN RAISE EXCEPTION 'expected 6 mathematization stubs, found %', n; END IF;

  -- Every essay's sort_order still names its part: sort_order / 100 = the part's number.
  SELECT count(*) INTO n
    FROM public.essays e
    JOIN public.categories c ON c.slug = 'critical-thinking-' || e.phase
    JOIN public.sections s ON s.id = c.section_id AND s.slug = 'critical-thinking'
   WHERE e.section = 'critical-thinking' AND e.sort_order / 100 <> c.sort_order;
  IF n <> 0 THEN RAISE EXCEPTION '% essay(s) have a sort_order outside their part', n; END IF;
END
$assert$;

DROP TABLE fok_math_seed;
