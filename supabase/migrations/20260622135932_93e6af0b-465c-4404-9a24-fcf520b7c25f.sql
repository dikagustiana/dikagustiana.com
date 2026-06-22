
-- 1. quant_backtests
DROP POLICY IF EXISTS "Users can create backtests" ON public.quant_backtests;
DROP POLICY IF EXISTS "Backtests are publicly readable" ON public.quant_backtests;
CREATE POLICY "Authenticated users insert own backtests"
  ON public.quant_backtests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users view backtests"
  ON public.quant_backtests FOR SELECT TO authenticated
  USING (true);

-- 2. Admin-only operational tables
DROP POLICY IF EXISTS "System health is publicly readable" ON public.remora_system_health;
CREATE POLICY "Admins view system health" ON public.remora_system_health
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Data freshness is publicly readable" ON public.remora_data_freshness;
CREATE POLICY "Admins view data freshness" ON public.remora_data_freshness
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Ingestion logs are publicly readable" ON public.remora_ingestion_logs;
CREATE POLICY "Admins view ingestion logs" ON public.remora_ingestion_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Data quality is publicly readable" ON public.quant_data_quality;
CREATE POLICY "Admins view data quality" ON public.quant_data_quality
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Proprietary trading tables: require auth
DO $$
DECLARE t text; policy_rec record;
BEGIN
  FOR t IN SELECT unnest(ARRAY['remora_signals','quant_regimes','quant_features','quant_signals','quant_positions','quant_backtest_results']) LOOP
    FOR policy_rec IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='SELECT' AND qual='true' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_rec.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "Authenticated users can view %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
  END LOOP;
END$$;

-- 4. profiles: tighten role scoping
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. Lock down SECURITY DEFINER functions from anon/authenticated direct calls
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- 6. Move pg_net out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 7. Restrict storage listing on public buckets to admins; public URLs still work
DROP POLICY IF EXISTS "Books are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Embeds are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Essay images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Finance model files are publicly readable" ON storage.objects;
CREATE POLICY "Admins can list public bucket objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('books','embeds','essay-images','finance-models')
    AND public.has_role(auth.uid(), 'admin')
  );
