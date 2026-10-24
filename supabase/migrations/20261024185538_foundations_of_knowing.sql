-- =============================================================================
-- Foundations of Knowing (docs/prd/foundations-of-knowing/README.md).
--
-- The Critical Thinking section is renamed for display and filled with its
-- planned structure: ten parts (Part 0-9) and 56 draft stubs. The section's
-- slug stays `critical-thinking`; only `sections.name` changes. The manifesto
-- is NOT changed here: the owner writes it (PRD, "Manifesto"), and until then
-- the old one stays. No page renders it (the banner was retired).
--
-- Development Finance becomes a theme of The Next Big Thing: one category row,
-- `next-big-thing-development-finance`, sort_order 7, after Growth. That is its
-- place in NEXT_BIG_THING_THEMES (src/config/nextBigThingThemes.ts). There is
-- no `development-finance` row in public.sections, and no essay carries that
-- section, so nothing else moves. The five published Next Big Thing essays are
-- not touched.
--
-- 1. essay_structure gains `phase` and `sort_order`, appended. The section and
--    part pages list drafts to every reader, as the Finance tracks do, and an
--    anonymous reader can reach a draft's title only through this view. Both
--    are placement and ordering, which the view's contract (DECISIONS.md
--    2026-08-03: "title, deck, slug, author, module reference, ordering,
--    published flag") already admits. Bodies stay out: content and
--    content_json are still not selectable. The options are restated because
--    CREATE OR REPLACE VIEW resets what it is not given.
-- 2. Ten categories `critical-thinking-<part>`, named "Part N · Label",
--    sort_order N. The writer's placement picker lists them; derivePhase()
--    strips the prefix back to the part id (essays.phase).
-- 3. One category for the Development Finance theme.
-- 4. sections.name -> 'Foundations of Knowing'.
-- 5. 56 stubs: status draft, published false, content NULL, voice_role from
--    the section ('economist'), sort_order = part x 100 + place in the part,
--    category = the part's row. Foreign keys resolved by subquery, never by
--    literal UUID.
--
-- Fails closed: if critical-thinking already holds an essay, or any seed slug
-- is taken anywhere in public.essays (slug is globally unique), it raises and
-- nothing is applied. The asserts at the end check 10 categories, 56 stubs,
-- the per-part counts 2/6/5/6/7/5/7/6/6/6 and unique sort_order.
--
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-10-24 (version
-- 20261024185538); this file is the repo mirror of what ran.
--
-- Apply individually (MCP apply_migration or the SQL editor), never with
-- `supabase db push`.
--
-- DOWN (in this order; the stubs first, the categories are RESTRICT-referenced):
--   DELETE FROM public.essays WHERE section = 'critical-thinking' AND status = 'draft' AND content IS NULL;
--   DELETE FROM public.categories WHERE slug LIKE 'critical-thinking-%';
--   DELETE FROM public.categories WHERE slug = 'next-big-thing-development-finance';
--   UPDATE public.sections SET name = 'Critical Thinking' WHERE slug = 'critical-thinking';
--   -- and the view back to its 20260803150000 definition (drop phase, sort_order:
--   -- DROP VIEW + CREATE VIEW + the REVOKE/GRANT pair, since columns cannot be removed by REPLACE).
-- =============================================================================

-- 0. Preconditions ------------------------------------------------------------
DO $pre$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.essays WHERE section = 'critical-thinking';
  IF n <> 0 THEN
    RAISE EXCEPTION 'critical-thinking already holds % essay(s); the seed expects 0', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sections WHERE slug = 'critical-thinking') THEN
    RAISE EXCEPTION 'section critical-thinking not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sections WHERE slug = 'next-big-thing') THEN
    RAISE EXCEPTION 'section next-big-thing not found';
  END IF;
END
$pre$;

-- 1. essay_structure: phase and sort_order, appended -------------------------
CREATE OR REPLACE VIEW public.essay_structure
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  e.id,
  e.slug,
  e.title,
  e.snippet,
  e.author,
  e.section,
  e.module_id,
  e.finance_order,
  e.published,
  CASE WHEN e.published THEN e.read_time END AS read_time,
  CASE WHEN e.published THEN e.lesson_type END AS lesson_type,
  e.phase,
  e.sort_order
FROM public.essays e
WHERE e.status IN ('draft'::content_status_enum, 'published'::content_status_enum);

COMMENT ON VIEW public.essay_structure IS
  'Public curriculum structure: titles/decks/placement/ordering of draft AND published essays (never bodies — content/content_json are not selectable here). SECURITY DEFINER on purpose; the column list is the security boundary. Scope and rationale: docs/DECISIONS.md 2026-08-03; phase and sort_order added 2026-10-24 (Foundations of Knowing).';

REVOKE ALL ON public.essay_structure FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.essay_structure TO anon, authenticated;

-- 2-3. Categories ---------------------------------------------------------------
INSERT INTO public.categories (section_id, slug, name, sort_order)
SELECT s.id, 'critical-thinking-' || p.id, p.name, p.n
FROM public.sections s
CROSS JOIN (VALUES
  (0, 'before-we-go-far',            'Part 0 · Before We Go Far'),
  (1, 'knowing',                     'Part 1 · Knowing'),
  (2, 'logic',                       'Part 2 · Logic'),
  (3, 'argument',                    'Part 3 · Argument'),
  (4, 'evidence-and-sources',        'Part 4 · Evidence & Sources'),
  (5, 'how-science-corrects-itself', 'Part 5 · How Science Corrects Itself'),
  (6, 'dialectics-and-change',       'Part 6 · Dialectics & Change'),
  (7, 'uncertainty',                 'Part 7 · Uncertainty'),
  (8, 'judgment-under-pressure',     'Part 8 · Judgment Under Pressure'),
  (9, 'strategic-finance',           'Part 9 · Strategic Finance as Applied Judgment')
) AS p(n, id, name)
WHERE s.slug = 'critical-thinking'
ON CONFLICT (section_id, slug) DO NOTHING;

INSERT INTO public.categories (section_id, slug, name, sort_order)
SELECT s.id, 'next-big-thing-development-finance', 'Development Finance', 7
FROM public.sections s
WHERE s.slug = 'next-big-thing'
ON CONFLICT (section_id, slug) DO NOTHING;

-- 4. Display name ----------------------------------------------------------------
UPDATE public.sections SET name = 'Foundations of Knowing' WHERE slug = 'critical-thinking';

-- 5. The 56 stubs ---------------------------------------------------------------
CREATE TEMP TABLE fok_seed (sort_order integer, phase text, slug text, title text);
INSERT INTO fok_seed (sort_order, phase, slug, title) VALUES
  (1,   'before-we-go-far', 'why-a-finance-site-needs-epistemology', 'Why a Finance Site Needs Epistemology'),
  (2,   'before-we-go-far', 'sequence-matters', 'Sequence Matters: Foundations Before Disciplines'),
  (101, 'knowing', 'what-does-it-mean-to-know-something', 'What Does It Mean to Know Something?'),
  (102, 'knowing', 'descartes-doubt', 'Descartes'' Doubt: Tearing Down to Rebuild'),
  (103, 'knowing', 'hume-and-the-problem-of-induction', 'Hume and the Problem of Induction'),
  (104, 'knowing', 'how-to-make-our-ideas-clear', 'How to Make Our Ideas Clear'),
  (105, 'knowing', 'map-and-territory', 'Map and Territory: Models as Representations'),
  (106, 'knowing', 'logika-mistika', 'Logika Mistika: When Explanation Escapes Evidence'),
  (201, 'logic', 'validity-is-not-truth', 'Validity Is Not Truth'),
  (202, 'logic', 'grammar-of-formal-logic', 'If-Then, All, Some: The Grammar of Formal Logic'),
  (203, 'logic', 'necessary-and-sufficient-conditions', 'Necessary and Sufficient Conditions'),
  (204, 'logic', 'induction-and-abduction', 'Induction and Abduction'),
  (205, 'logic', 'fallacies', 'Fallacies, Formal and Informal'),
  (301, 'argument', 'anatomy-of-an-argument', 'Anatomy of an Argument'),
  (302, 'argument', 'the-premise-you-didnt-say', 'The Premise You Didn''t Say'),
  (303, 'argument', 'steelmanning', 'Steelmanning'),
  (304, 'argument', 'when-analogies-mislead', 'When Analogies Mislead'),
  (305, 'argument', 'what-would-change-your-mind', 'What Would Change Your Mind'),
  (306, 'argument', 'writing-an-argument-that-survives-review', 'Writing an Argument That Survives Review'),
  (401, 'evidence-and-sources', 'who-produced-this-and-why', 'Who Produced This, and Why?'),
  (402, 'evidence-and-sources', 'power-and-knowledge', 'Power and Knowledge'),
  (403, 'evidence-and-sources', 'primary-secondary-generated', 'Primary, Secondary, Generated'),
  (404, 'evidence-and-sources', 'correlation-causation-confounding', 'Correlation, Causation, Confounding'),
  (405, 'evidence-and-sources', 'base-rates-survivorship-selection', 'Base Rates, Survivorship, Selection'),
  (406, 'evidence-and-sources', 'detecting-deception', 'Detecting Deception'),
  (407, 'evidence-and-sources', 'building-a-verification-register', 'Building a Verification Register'),
  (501, 'how-science-corrects-itself', 'method-as-an-invention', 'Method as an Invention: The Scientific Revolution'),
  (502, 'how-science-corrects-itself', 'popper-falsifiability', 'Popper: Falsifiability'),
  (503, 'how-science-corrects-itself', 'kuhn-and-lakatos', 'Kuhn and Lakatos: Paradigms and Research Programmes'),
  (504, 'how-science-corrects-itself', 'replication-crisis', 'The Replication Crisis and the Limits of Peer Review'),
  (505, 'how-science-corrects-itself', 'is-economics-a-science', 'Is Economics a Science?'),
  (601, 'dialectics-and-change', 'hegel-and-the-myth-of-the-triad', 'Hegel and the Myth of the Triad'),
  (602, 'dialectics-and-change', 'marx-historical-materialism', 'Marx: Historical Materialism'),
  (603, 'dialectics-and-change', 'contradiction-as-the-engine-of-change', 'Contradiction as the Engine of Change'),
  (604, 'dialectics-and-change', 'madilog', 'Madilog: Tan Malaka''s Synthesis'),
  (605, 'dialectics-and-change', 'institutions-are-historical-products', 'Institutions Are Historical Products'),
  (606, 'dialectics-and-change', 'path-dependence', 'Path Dependence'),
  (607, 'dialectics-and-change', 'holding-two-opposing-frameworks', 'Holding Two Opposing Frameworks'),
  (701, 'uncertainty', 'risk-vs-uncertainty', 'Risk vs Uncertainty'),
  (702, 'uncertainty', 'probability-frequency-or-belief', 'Probability: Frequency or Belief?'),
  (703, 'uncertainty', 'bayesian-updating', 'Bayesian Updating'),
  (704, 'uncertainty', 'fat-tails', 'Fat Tails'),
  (705, 'uncertainty', 'forecasting-and-calibration', 'Forecasting and Calibration'),
  (706, 'uncertainty', 'expected-value-vs-survival', 'Expected Value vs Survival'),
  (801, 'judgment-under-pressure', 'fast-thinking-and-its-biases', 'Fast Thinking and Its Biases'),
  (802, 'judgment-under-pressure', 'the-premortem', 'The Premortem'),
  (803, 'judgment-under-pressure', 'red-teams-and-devils-advocates', 'Red Teams and Devil''s Advocates'),
  (804, 'judgment-under-pressure', 'competing-hypotheses', 'Competing Hypotheses'),
  (805, 'judgment-under-pressure', 'deciding-with-incomplete-information', 'Deciding With Incomplete Information'),
  (806, 'judgment-under-pressure', 'signposts', 'Signposts: When to Change Course'),
  (901, 'strategic-finance', 'numbers-are-claims', 'Numbers Are Claims'),
  (902, 'strategic-finance', 'the-business-plan-as-a-falsifiable-hypothesis', 'The Business Plan as a Falsifiable Hypothesis'),
  (903, 'strategic-finance', 'capital-allocation-under-uncertainty', 'Capital Allocation Under Uncertainty'),
  (904, 'strategic-finance', 'variance-analysis-as-inquiry', 'Variance Analysis as Inquiry'),
  (905, 'strategic-finance', 'who-produces-the-forecast', 'Who Produces the Forecast?'),
  (906, 'strategic-finance', 'decisions-that-cannot-be-undone', 'Decisions That Cannot Be Undone');

DO $collide$
DECLARE taken text;
BEGIN
  SELECT string_agg(e.slug, ', ') INTO taken
    FROM public.essays e JOIN fok_seed f ON f.slug = e.slug;
  IF taken IS NOT NULL THEN
    RAISE EXCEPTION 'seed slug(s) already taken in public.essays: %', taken;
  END IF;
END
$collide$;

INSERT INTO public.essays (section, phase, slug, title, sort_order, status, published, content, voice_role, category_id)
SELECT 'critical-thinking', f.phase, f.slug, f.title, f.sort_order,
       'draft'::content_status_enum, false, NULL, s.voice_role, c.id
FROM fok_seed f
JOIN public.sections s ON s.slug = 'critical-thinking'
JOIN public.categories c ON c.section_id = s.id AND c.slug = 'critical-thinking-' || f.phase;

-- Asserts -----------------------------------------------------------------------
DO $assert$
DECLARE
  n integer;
  per_part text;
BEGIN
  SELECT count(*) INTO n
    FROM public.categories c JOIN public.sections s ON s.id = c.section_id
   WHERE s.slug = 'critical-thinking';
  IF n <> 10 THEN RAISE EXCEPTION 'expected 10 critical-thinking categories, found %', n; END IF;

  SELECT count(*) INTO n FROM public.categories WHERE slug = 'next-big-thing-development-finance';
  IF n <> 1 THEN RAISE EXCEPTION 'expected the next-big-thing-development-finance category, found %', n; END IF;

  SELECT count(*) INTO n FROM public.essays WHERE section = 'critical-thinking';
  IF n <> 56 THEN RAISE EXCEPTION 'expected 56 critical-thinking stubs, found %', n; END IF;

  SELECT count(DISTINCT sort_order) INTO n FROM public.essays WHERE section = 'critical-thinking';
  IF n <> 56 THEN RAISE EXCEPTION 'sort_order is not unique across the 56 stubs (% distinct)', n; END IF;

  SELECT count(*) INTO n FROM public.essays
   WHERE section = 'critical-thinking' AND (published OR status <> 'draft' OR content IS NOT NULL);
  IF n <> 0 THEN RAISE EXCEPTION '% stub(s) are not plain drafts', n; END IF;

  SELECT string_agg(k, '/' ORDER BY ord) INTO per_part FROM (
    SELECT (sort_order / 100) AS ord, count(*)::text AS k
      FROM public.essays WHERE section = 'critical-thinking'
     GROUP BY sort_order / 100
  ) x;
  IF per_part <> '2/6/5/6/7/5/7/6/6/6' THEN
    RAISE EXCEPTION 'per-part counts are %, expected 2/6/5/6/7/5/7/6/6/6', per_part;
  END IF;

  SELECT count(DISTINCT phase) INTO n FROM public.essays WHERE section = 'critical-thinking';
  IF n <> 10 THEN RAISE EXCEPTION 'expected 10 phases, found %', n; END IF;
END
$assert$;

DROP TABLE fok_seed;
