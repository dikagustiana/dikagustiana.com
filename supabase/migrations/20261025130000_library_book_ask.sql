-- =============================================================================
-- Library phase 2, step 4: margin questions' daily caps and spend
-- (docs/prd/library-phase-2 §4, Data and Ask function).
--
-- book_ask_usage (day, visitor_hash, questions, usd_cents): one row per
-- visitor per day (the owner's day, Asia/Jakarta). visitor_hash is a salted
-- SHA-256 of the day, the address and the browser, never the address itself;
-- the signed-in owner is the row 'owner'. usd_cents is what that visitor's
-- answers cost, rounded up per answer, from the model's token usage.
--
-- Written only by the book-ask edge function, through the functions below,
-- which only the service role may execute; the admin reads the table
-- (spend per day: select day, sum(questions), sum(usd_cents) ... group by day).
-- Visitors can neither read nor write it.
--
--   book_ask_take(day, visitor, limit)  counts one question, atomically;
--                                       null when the visitor is at `limit`
--                                       (null limit: uncapped, the owner)
--   book_ask_release(day, visitor)      gives one back (a later guard
--                                       refused, or no answer came)
--   book_ask_spend(day, visitor, cents) adds an answer's cost
--   book_ask_spent(day)                 the day's spend, all visitors
--   book_ask_asked(day, visitor)        questions asked so far today
--
-- Apply on its own through the MCP (never `supabase db push`). Rollback:
-- supabase/rollback/20261025130100_library_book_ask_down.sql.
-- =============================================================================

CREATE TABLE public.book_ask_usage (
  day          date    NOT NULL,
  visitor_hash text    NOT NULL CHECK (visitor_hash = 'owner' OR visitor_hash ~ '^[0-9a-f]{64}$'),
  questions    integer NOT NULL DEFAULT 0 CHECK (questions >= 0),
  usd_cents    integer NOT NULL DEFAULT 0 CHECK (usd_cents >= 0),
  PRIMARY KEY (day, visitor_hash)
);

ALTER TABLE public.book_ask_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_ask_usage_select_admin"
  ON public.book_ask_usage FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

REVOKE ALL ON public.book_ask_usage FROM anon, authenticated;
GRANT SELECT ON public.book_ask_usage TO authenticated;
GRANT ALL    ON public.book_ask_usage TO service_role;

CREATE FUNCTION public.book_ask_take(p_day date, p_visitor text, p_limit integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  INSERT INTO public.book_ask_usage AS u (day, visitor_hash, questions)
  VALUES (p_day, p_visitor, 1)
  ON CONFLICT (day, visitor_hash) DO UPDATE
    SET questions = u.questions + 1
    WHERE p_limit IS NULL OR u.questions < p_limit
  RETURNING u.questions INTO n;
  -- A first question over a limit of 0 is refused too.
  IF n IS NOT NULL AND p_limit IS NOT NULL AND n > p_limit THEN
    UPDATE public.book_ask_usage SET questions = questions - 1 WHERE day = p_day AND visitor_hash = p_visitor;
    RETURN NULL;
  END IF;
  RETURN n;
END;
$$;

CREATE FUNCTION public.book_ask_release(p_day date, p_visitor text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.book_ask_usage SET questions = greatest(questions - 1, 0)
   WHERE day = p_day AND visitor_hash = p_visitor;
$$;

CREATE FUNCTION public.book_ask_spend(p_day date, p_visitor text, p_cents integer)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.book_ask_usage AS u (day, visitor_hash, usd_cents)
  VALUES (p_day, p_visitor, greatest(p_cents, 0))
  ON CONFLICT (day, visitor_hash) DO UPDATE SET usd_cents = u.usd_cents + greatest(p_cents, 0);
$$;

CREATE FUNCTION public.book_ask_spent(p_day date)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(sum(usd_cents), 0)::integer FROM public.book_ask_usage WHERE day = p_day;
$$;

CREATE FUNCTION public.book_ask_asked(p_day date, p_visitor text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((SELECT questions FROM public.book_ask_usage WHERE day = p_day AND visitor_hash = p_visitor), 0);
$$;

-- Functions are executable by PUBLIC by default; only the service role (the
-- edge function) may call these.
REVOKE ALL ON FUNCTION public.book_ask_take(date, text, integer)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_ask_release(date, text)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_ask_spend(date, text, integer)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_ask_spent(date)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_ask_asked(date, text)           FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_ask_take(date, text, integer)  TO service_role;
GRANT EXECUTE ON FUNCTION public.book_ask_release(date, text)        TO service_role;
GRANT EXECUTE ON FUNCTION public.book_ask_spend(date, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.book_ask_spent(date)                TO service_role;
GRANT EXECUTE ON FUNCTION public.book_ask_asked(date, text)          TO service_role;
