-- The homepage glimpse pins three essays beside its running row.
--
-- essays.featured_rank is the pin: 1, 2 or 3, the slot the essay holds in
-- the glimpse's left zone, NULL for every essay that is not pinned. No two
-- essays hold the same slot (a partial unique index: NULL is free to repeat).
-- It is a separate thing from is_selected / selected_rank, which still order
-- the running row; a pinned essay is left out of that row.
--
-- Only a published essay can be pinned. A trigger clears the pin the moment
-- an essay stops being published (unpublished, archived), so the slot falls
-- back to the newest published essay on the homepage instead of pointing at
-- a draft. A CHECK holds the same rule, so nothing can write a pin onto an
-- unpublished row either.
--
-- The owner sets the pins in Admin → Content → Homepage Glimpse, which saves
-- all three at once through set_featured_essays(): one call, one transaction,
-- every old pin cleared before the new ones are written, so two essays never
-- hold one slot even for a moment.
--
-- Applied by the owner through apply_migration (README, "Database &
-- migrations"). The site reads the column defensively: until it exists,
-- Postgres answers 42703 and the homepage pins the three newest published
-- essays, so a deploy ahead of this migration changes nothing but the layout.

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS featured_rank integer;

COMMENT ON COLUMN public.essays.featured_rank IS
  'Pinned slot (1-3) in the homepage glimpse; NULL when not pinned. Published essays only; cleared on unpublish.';

ALTER TABLE public.essays
  DROP CONSTRAINT IF EXISTS essays_featured_rank_range,
  ADD CONSTRAINT essays_featured_rank_range
    CHECK (featured_rank IS NULL OR featured_rank BETWEEN 1 AND 3);

ALTER TABLE public.essays
  DROP CONSTRAINT IF EXISTS essays_featured_rank_published,
  ADD CONSTRAINT essays_featured_rank_published
    CHECK (featured_rank IS NULL OR published = true);

CREATE UNIQUE INDEX IF NOT EXISTS essays_featured_rank_unique
  ON public.essays (featured_rank)
  WHERE featured_rank IS NOT NULL;

-- Unpublishing gives up the pin. BEFORE, so the row is written without it
-- and the CHECK above never sees an unpublished pinned row. Not SECURITY
-- DEFINER: it only writes NEW (cf. validate_essay_tone_fields).
CREATE OR REPLACE FUNCTION public.clear_featured_rank_when_unpublished()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.featured_rank IS NOT NULL AND NEW.published IS DISTINCT FROM true THEN
    NEW.featured_rank = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_featured_rank_when_unpublished_trigger ON public.essays;
CREATE TRIGGER clear_featured_rank_when_unpublished_trigger
  BEFORE INSERT OR UPDATE OF published, featured_rank ON public.essays
  FOR EACH ROW EXECUTE FUNCTION public.clear_featured_rank_when_unpublished();

-- The panel's save. p_ids is the three slots in order, NULL for an empty
-- slot: ARRAY[a, NULL, c] pins a to slot 1 and c to slot 3. Every current pin
-- is cleared first, then the new ones are written, all in this one call's
-- transaction, so a swap never trips the unique index and a failure leaves
-- the old pins as they were.
--
-- SECURITY INVOKER: it runs as the caller, so the essays UPDATE policy
-- (admin only) is the gate, as it is for every other write to essays. The
-- explicit check below only turns a non-admin's silent no-op into an error.
CREATE OR REPLACE FUNCTION public.set_featured_essays(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  v_slot integer;
  v_id   uuid;
  v_hit  integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_ids IS NULL OR coalesce(array_length(p_ids, 1), 0) > 3 THEN
    RAISE EXCEPTION 'p_ids must hold at most 3 slots' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF (SELECT count(x) <> count(DISTINCT x) FROM unnest(p_ids) AS x) THEN
    RAISE EXCEPTION 'an essay can hold one slot only' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.essays SET featured_rank = NULL WHERE featured_rank IS NOT NULL;

  FOR v_slot IN 1 .. coalesce(array_length(p_ids, 1), 0) LOOP
    v_id := p_ids[v_slot];
    CONTINUE WHEN v_id IS NULL;
    UPDATE public.essays SET featured_rank = v_slot WHERE id = v_id AND published = true;
    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit = 0 THEN
      RAISE EXCEPTION 'essay % is not published', v_id USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_featured_essays(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_featured_essays(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.set_featured_essays(uuid[]) IS
  'Homepage glimpse pins: slot i <- p_ids[i] (NULL = empty), all old pins cleared first, in one transaction. Admin only (essays UPDATE policy).';
