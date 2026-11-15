-- Acceptance for 20261115120000_essay_translations (docs/prd/essay-language/01-DATA.md §A4).
--
-- Self-asserting: every check RAISEs on failure, so the script either runs to
-- the end or stops at the first broken promise. Run it AFTER the migration,
-- inside a transaction that is rolled back:
--
--   BEGIN;
--   \i supabase/migrations/20261115120000_essay_translations.sql
--   \i docs/db/verify/05_essay_translations_acceptance.sql
--   ROLLBACK;
--
-- Fixtures are created inside that transaction and vanish with it. It needs
-- one admin row in user_roles (any real project has one; the local harness
-- seeds one in 01_rls_acceptance.sql).

-- --- Fixtures (as the connecting superuser) ------------------------------------
CREATE TEMP TABLE _et_fx AS
SELECT
  (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1) AS admin_id,
  gen_random_uuid() AS live_essay,
  gen_random_uuid() AS draft_essay;
GRANT SELECT ON _et_fx TO anon, authenticated;

DO $fx$
DECLARE f record; cat uuid;
BEGIN
  SELECT * INTO f FROM _et_fx;
  IF f.admin_id IS NULL THEN RAISE EXCEPTION 'fixture: no admin in user_roles'; END IF;
  SELECT category_id INTO cat FROM public.essays WHERE section = 'next-big-thing' LIMIT 1;
  INSERT INTO public.essays (id, section, category_id, slug, title, published, status)
  VALUES
    (f.live_essay,  'next-big-thing', cat, 'zz-et-live-'  || f.live_essay,  'ET live',  true,  'published'),
    (f.draft_essay, 'next-big-thing', cat, 'zz-et-draft-' || f.draft_essay, 'ET draft', false, 'draft');
  INSERT INTO public.essay_translations (essay_id, locale, title, published) VALUES
    (f.live_essay,  'id', 'ET terbit',              true),
    (f.draft_essay, 'id', 'ET terbit induk draf',   true);
  -- A draft translation needs a second essay (one row per essay per locale).
END $fx$;

DO $fx2$
DECLARE f record; cat uuid; e2 uuid := gen_random_uuid();
BEGIN
  SELECT * INTO f FROM _et_fx;
  SELECT category_id INTO cat FROM public.essays WHERE id = f.live_essay;
  INSERT INTO public.essays (id, section, category_id, slug, title, published, status)
  VALUES (e2, 'next-big-thing', cat, 'zz-et-live2-' || e2, 'ET live 2', true, 'published');
  INSERT INTO public.essay_translations (essay_id, locale, title, published)
  VALUES (e2, 'id', 'ET draf', false);
END $fx2$;

-- --- Shape -------------------------------------------------------------------------
DO $shape$
BEGIN
  BEGIN
    INSERT INTO public.essay_translations (essay_id, locale, title)
    SELECT live_essay, 'fr', 'x' FROM _et_fx;
    RAISE EXCEPTION 'FAIL: locale fr was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.essay_translations (essay_id, locale, title)
    SELECT live_essay, 'id', 'dup' FROM _et_fx;
    RAISE EXCEPTION 'FAIL: a second id row for one essay was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.essay_revisions (essay_id, revision_no, change_type)
    SELECT live_essay, 1, 'id_autosave' FROM _et_fx;
    INSERT INTO public.essay_revisions (essay_id, revision_no, change_type)
    SELECT live_essay, 2, 'id_brief_manual_save' FROM _et_fx;
  END;
  BEGIN
    INSERT INTO public.essay_revisions (essay_id, revision_no, change_type)
    SELECT live_essay, 3, 'id_nonsense' FROM _et_fx;
    RAISE EXCEPTION 'FAIL: unknown change_type accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RAISE NOTICE 'ok: shape';
END $shape$;

-- --- Anonymous -----------------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '', true);

DO $anon$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.essay_translations t, _et_fx f WHERE t.essay_id = f.live_essay;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: anon sees % rows of a published translation (want 1)', n; END IF;

  SELECT count(*) INTO n FROM public.essay_translations t, _et_fx f WHERE t.essay_id = f.draft_essay;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon reads a translation whose essay is a draft'; END IF;

  SELECT count(*) INTO n FROM public.essay_translations WHERE title = 'ET draf';
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon reads a draft translation'; END IF;

  SELECT count(*) INTO n FROM public.essay_translations WHERE published IS NOT TRUE;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon sees % unpublished translations', n; END IF;

  BEGIN
    INSERT INTO public.essay_translations (essay_id, locale, title)
    SELECT draft_essay, 'id', 'hack' FROM _et_fx;
    RAISE EXCEPTION 'FAIL: anon INSERT accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  UPDATE public.essay_translations SET title = 'defaced';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon UPDATE changed % rows', n; END IF;

  DELETE FROM public.essay_translations;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon DELETE removed % rows', n; END IF;

  RAISE NOTICE 'ok: anon';
EXCEPTION WHEN insufficient_privilege THEN
  -- UPDATE/DELETE without a grant is also a correct refusal.
  RAISE NOTICE 'ok: anon (write refused by privilege)';
END $anon$;
RESET ROLE;

-- --- Signed in, not admin -------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000beef"}', true);

DO $user$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.essay_translations WHERE title IN ('ET draf', 'ET terbit induk draf');
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin reads hidden translations (%)', n; END IF;

  SELECT count(*) INTO n FROM public.essay_translations WHERE title = 'ET terbit';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: non-admin cannot read a public translation'; END IF;

  BEGIN
    INSERT INTO public.essay_translations (essay_id, locale, title)
    SELECT live_essay, 'id', 'hack' FROM _et_fx;
    RAISE EXCEPTION 'FAIL: non-admin INSERT accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  UPDATE public.essay_translations SET title = 'defaced';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin UPDATE changed % rows', n; END IF;

  DELETE FROM public.essay_translations;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: non-admin DELETE removed % rows', n; END IF;

  RAISE NOTICE 'ok: authenticated non-admin';
END $user$;
RESET ROLE;

-- --- Admin --------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT admin_id FROM _et_fx))::text, true);

DO $admin$
DECLARE n int; f record;
BEGIN
  SELECT * INTO f FROM _et_fx;
  SELECT count(*) INTO n FROM public.essay_translations WHERE title IN ('ET terbit', 'ET draf', 'ET terbit induk draf');
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL: admin sees % of 3 fixture translations', n; END IF;

  UPDATE public.essay_translations SET title = 'ET terbit (diubah)' WHERE essay_id = f.live_essay;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: admin UPDATE changed % rows', n; END IF;

  DELETE FROM public.essay_translations WHERE essay_id = f.draft_essay;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: admin DELETE removed % rows', n; END IF;

  INSERT INTO public.essay_translations (essay_id, locale, title) VALUES (f.draft_essay, 'id', 'ET baru');
  RAISE NOTICE 'ok: admin';
END $admin$;
RESET ROLE;

-- --- Cascade and updated_at ---------------------------------------------------------------
DO $tail$
DECLARE n int; f record;
BEGIN
  SELECT * INTO f FROM _et_fx;
  -- now() is fixed inside one transaction, so the trigger is checked by existence.
  SELECT count(*) INTO n FROM pg_trigger
   WHERE tgrelid = 'public.essay_translations'::regclass AND tgname = 'update_essay_translations_updated_at';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: updated_at trigger missing'; END IF;

  DELETE FROM public.essays WHERE id = f.draft_essay;
  SELECT count(*) INTO n FROM public.essay_translations WHERE essay_id = f.draft_essay;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: deleting an essay left its translation'; END IF;
  RAISE NOTICE 'ok: cascade + trigger';
END $tail$;

DO $done$ BEGIN RAISE NOTICE 'ALL CHECKS PASSED'; END $done$;
