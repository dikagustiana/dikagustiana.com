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
-- Seed: USD/IDR from Bank Indonesia's JISDOR. The 477 daily fixings from
-- 1 Jul 2024 to 30 Jun 2026 were read from BI's own web service,
-- https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3 (one call
-- per quarter, 2026-10-25), and are kept in
-- data/fx/jisdor-usd-2024-07-to-2026-06.csv; scripts/fia/jisdor-seed.mjs
-- works the rows below from them. `average` is the mean of the period's daily
-- fixings, `closing` its last fixing. The forecast periods 26Q3E and 26Q4E
-- carry the 26Q2 average forward (owner's decision, 2026-10-24); their source
-- says so. Each row's source_url is the web-service call for its period.
--
-- The final DO block asserts the seeded row count.
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

-- Worked by scripts/fia/jisdor-seed.mjs from data/fx/jisdor-usd-2024-07-to-2026-06.csv.
INSERT INTO fia.fx_rates (period_id, from_ccy, to_ccy, rate, basis, source, source_url) VALUES
  ('24Q3', 'USD', 'IDR', 15800.66, 'average', 'BI JISDOR, mean of 65 daily fixings, 2024-07-01 to 2024-09-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2024-07-01&endDate=2024-09-30'),
  ('24Q3', 'USD', 'IDR', 15144.00, 'closing', 'BI JISDOR, last fixing of the period, 2024-09-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2024-07-01&endDate=2024-09-30'),
  ('24Q4', 'USD', 'IDR', 15796.52, 'average', 'BI JISDOR, mean of 63 daily fixings, 2024-10-01 to 2024-12-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2024-10-01&endDate=2024-12-31'),
  ('24Q4', 'USD', 'IDR', 16157.00, 'closing', 'BI JISDOR, last fixing of the period, 2024-12-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2024-10-01&endDate=2024-12-31'),
  ('25Q1', 'USD', 'IDR', 16358.83, 'average', 'BI JISDOR, mean of 58 daily fixings, 2025-01-02 to 2025-03-27', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-01-01&endDate=2025-03-31'),
  ('25Q1', 'USD', 'IDR', 16566.00, 'closing', 'BI JISDOR, last fixing of the period, 2025-03-27', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-01-01&endDate=2025-03-31'),
  ('25Q2', 'USD', 'IDR', 16507.20, 'average', 'BI JISDOR, mean of 51 daily fixings, 2025-04-08 to 2025-06-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-04-01&endDate=2025-06-30'),
  ('25Q2', 'USD', 'IDR', 16231.00, 'closing', 'BI JISDOR, last fixing of the period, 2025-06-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-04-01&endDate=2025-06-30'),
  ('25Q3', 'USD', 'IDR', 16371.11, 'average', 'BI JISDOR, mean of 64 daily fixings, 2025-07-01 to 2025-09-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-07-01&endDate=2025-09-30'),
  ('25Q3', 'USD', 'IDR', 16692.00, 'closing', 'BI JISDOR, last fixing of the period, 2025-09-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-07-01&endDate=2025-09-30'),
  ('25Q4', 'USD', 'IDR', 16667.84, 'average', 'BI JISDOR, mean of 64 daily fixings, 2025-10-01 to 2025-12-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-10-01&endDate=2025-12-31'),
  ('25Q4', 'USD', 'IDR', 16720.00, 'closing', 'BI JISDOR, last fixing of the period, 2025-12-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-10-01&endDate=2025-12-31'),
  ('FY25', 'USD', 'IDR', 16477.52, 'average', 'BI JISDOR, mean of 237 daily fixings, 2025-01-02 to 2025-12-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-01-01&endDate=2025-12-31'),
  ('FY25', 'USD', 'IDR', 16720.00, 'closing', 'BI JISDOR, last fixing of the period, 2025-12-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2025-01-01&endDate=2025-12-31'),
  ('26Q1', 'USD', 'IDR', 16858.16, 'average', 'BI JISDOR, mean of 55 daily fixings, 2026-01-02 to 2026-03-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2026-01-01&endDate=2026-03-31'),
  ('26Q1', 'USD', 'IDR', 16999.00, 'closing', 'BI JISDOR, last fixing of the period, 2026-03-31', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2026-01-01&endDate=2026-03-31'),
  ('26Q2', 'USD', 'IDR', 17544.77, 'average', 'BI JISDOR, mean of 57 daily fixings, 2026-04-01 to 2026-06-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2026-04-01&endDate=2026-06-30'),
  ('26Q2', 'USD', 'IDR', 17899.00, 'closing', 'BI JISDOR, last fixing of the period, 2026-06-30', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2026-04-01&endDate=2026-06-30'),
  ('26Q3E', 'USD', 'IDR', 17544.77, 'average', 'Forecast period: the BI JISDOR 26Q2 average carried forward', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2026-04-01&endDate=2026-06-30'),
  ('26Q4E', 'USD', 'IDR', 17544.77, 'average', 'Forecast period: the BI JISDOR 26Q2 average carried forward', 'https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursJisdor3?mts=USD&startDate=2026-04-01&endDate=2026-06-30');

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM fia.fx_rates;
  IF n <> 20 THEN
    RAISE EXCEPTION 'fia.fx_rates seeded % rows, expected 20', n;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
