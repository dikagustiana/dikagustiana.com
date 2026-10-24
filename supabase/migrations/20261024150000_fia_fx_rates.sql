-- =============================================================================
-- Finance in Action: exchange rates for cross-company comparisons
-- (docs/prd/2026-10-fia-fixes/README.md items 4 and 7).
--
--   fia.fx_rates   one row per period, currency pair and basis. `rate` is units
--                  of to_ccy per one unit of from_ccy (USD -> IDR: rupiah per
--                  dollar). `average` serves flows (the income statement, and
--                  so unit economics), `closing` serves balances. Every row
--                  names its source and the URL it was read from.
--
-- src/lib/finance-in-action/fx.ts reads the table as anon, through the Data API
-- schema the packages already use (fia). A period without a row converts to
-- nothing: the page says the figure is not comparable.
--
-- Seed: USD/IDR from Bank Indonesia's JISDOR, the mean of the daily fixings in
-- each period, and the last fixing of the period for `closing`. The forecast
-- periods 26Q3E and 26Q4E carry the 26Q2 average forward (owner's decision,
-- 2026-10-24); their source says so.
--
-- PENDING: the rates below are NULL until the owner supplies the JISDOR
-- figures (they could not be read from bi.go.id from the build terminal).
-- `rate` is NOT NULL, so this migration fails as written and cannot be applied
-- by mistake. The final DO block asserts the seeded row count.
--
-- Apply individually (MCP apply_migration or the SQL editor), never with
-- `supabase db push`: production's migration history diverges from this
-- directory (docs/company-models, 2026-10-24).
--
-- DOWN:
--   DROP TABLE IF EXISTS fia.fx_rates;
--   NOTIFY pgrst, 'reload schema';
-- =============================================================================

CREATE TABLE fia.fx_rates (
  period_id  text    NOT NULL,
  from_ccy   text    NOT NULL,
  to_ccy     text    NOT NULL,
  rate       numeric NOT NULL CHECK (rate > 0),
  basis      text    NOT NULL CHECK (basis IN ('average', 'closing')),
  source     text    NOT NULL,
  source_url text    NOT NULL CHECK (source_url ~ '^https://'),
  CONSTRAINT fx_rates_pkey PRIMARY KEY (period_id, from_ccy, to_ccy, basis),
  CONSTRAINT fx_rates_iso CHECK (from_ccy ~ '^[A-Z]{3}$' AND to_ccy ~ '^[A-Z]{3}$' AND from_ccy <> to_ccy)
);
COMMENT ON TABLE fia.fx_rates IS
  'Exchange rates for Finance in Action comparisons: rate = to_ccy per one from_ccy; average for flows, closing for balances (docs/prd/2026-10-fia-fixes items 4, 7).';

ALTER TABLE fia.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY fx_rates_read ON fia.fx_rates FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON fia.fx_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON fia.fx_rates TO anon, authenticated;

-- JISDOR page: https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx
INSERT INTO fia.fx_rates (period_id, from_ccy, to_ccy, rate, basis, source, source_url) VALUES
  ('24Q3',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Jul to 30 Sep 2024', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('24Q3',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 30 Sep 2024',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('24Q4',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Oct to 31 Dec 2024', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('24Q4',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 31 Dec 2024',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q1',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Jan to 31 Mar 2025', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q1',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 31 Mar 2025',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q2',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Apr to 30 Jun 2025', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q2',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 30 Jun 2025',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q3',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Jul to 30 Sep 2025', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q3',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 30 Sep 2025',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q4',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Oct to 31 Dec 2025', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('25Q4',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 31 Dec 2025',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('FY25',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Jan to 31 Dec 2025', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('FY25',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 31 Dec 2025',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('26Q1',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Jan to 31 Mar 2026', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('26Q1',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 31 Mar 2026',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('26Q2',  'USD', 'IDR', NULL /* PENDING */, 'average', 'BI JISDOR, mean of daily fixings, 1 Apr to 30 Jun 2026', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('26Q2',  'USD', 'IDR', NULL /* PENDING */, 'closing', 'BI JISDOR, last fixing to 30 Jun 2026',                 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('26Q3E', 'USD', 'IDR', NULL /* PENDING: = 26Q2 average */, 'average', 'Forecast period: the BI JISDOR 26Q2 average carried forward', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx'),
  ('26Q4E', 'USD', 'IDR', NULL /* PENDING: = 26Q2 average */, 'average', 'Forecast period: the BI JISDOR 26Q2 average carried forward', 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx');

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM fia.fx_rates;
  IF n <> 20 THEN
    RAISE EXCEPTION 'fia.fx_rates seeded % rows, expected 20', n;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
