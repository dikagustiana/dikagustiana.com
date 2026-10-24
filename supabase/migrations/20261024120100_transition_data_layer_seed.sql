-- =============================================================================
-- The transition data layer's registry, chain and chart definitions
-- (docs/prd/transition-data-layer/01-PRD.md, Fase 1 "Seed ds_source dan
-- registri seri", Fase 2 manual series, Fase 3 charts).
--
-- No value is seeded here. Values arrive through the gate only: API series
-- from the fetcher's first run, manual series from /admin/transition-data
-- with their source document and locator.
--
-- The IMF codes, dataflow versions and quotation direction were tested
-- against api.imf.org on 24 October 2026 (docs/prd/transition-data-layer/
-- 03-API-CONTRACT.md): no key is needed, the key order is the DSD's, and
-- IDR per USD is XDC_USD, not USD_XDC. The Ember codes are from Ember's
-- OpenAPI v1 and are first exercised by the fetcher's first keyed run.
--
-- Every chart lands unpublished with a bracketed title: the finding a chart
-- states is the author's to write (PRD, Desain), and ds_chart refuses to
-- publish a bracketed title. Every chain status is empty for the same reason.
--
-- ON CONFLICT DO NOTHING throughout: rerunning the file changes nothing.
--
-- DOWN: covered by supabase/rollback/20261024120000_transition_data_layer_down.sql
-- =============================================================================

INSERT INTO public.ds_source (id, name, homepage_url, license, access) VALUES
  ('ember', 'Ember', 'https://ember-energy.org/data/api/', 'CC BY 4.0', 'api'),
  ('imf',   'International Monetary Fund', 'https://data.imf.org/', 'IMF Copyright and Usage, https://www.imf.org/external/terms.htm', 'api'),
  ('esdm',  'Kementerian Energi dan Sumber Daya Mineral', 'https://www.esdm.go.id/', 'Public government document', 'manual'),
  ('pln',   'PT PLN (Persero)', 'https://web.pln.co.id/', 'Public company release', 'manual'),
  ('bei',   'Bursa Efek Indonesia (IDXCarbon)', 'https://idxcarbon.co.id/', 'Public exchange release', 'manual'),
  ('djppr', 'Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko, Kementerian Keuangan', 'https://www.djppr.kemenkeu.go.id/', 'Public government document', 'manual')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ds_series
  (id, source_id, source_code, source_url, title_id, title_en, unit, frequency, chain_link, ingest,
   is_projection, definition_note, review_due)
VALUES
  -- Ember, yearly and monthly electricity data. member = Ember's series name.
  ('ember.idn.generation', 'ember', 'electricity-generation/yearly?is_aggregate_series=false',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Pembangkitan listrik per sumber', 'Electricity generation by source', 'TWh', 'A', 'infrastructure', 'api',
   false, 'Ember yearly generation for Indonesia (entity_code IDN), field generation_twh, one member per non-aggregate source.', NULL),
  ('ember.idn.capacity', 'ember', 'installed-capacity/monthly?is_aggregate_series=false',
   'https://ember-energy.org/data/monthly-electricity-data/',
   'Kapasitas terpasang per sumber', 'Installed capacity by source', 'GW', 'M', 'infrastructure', 'api',
   false, 'Ember installed capacity for Indonesia, field capacity_gw. Ember publishes capacity monthly only.', NULL),
  ('ember.idn.coal_share', 'ember', 'electricity-generation/yearly?series=Coal',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Porsi batu bara dalam pembangkitan', 'Coal share of generation', '%', 'A', 'transition', 'api',
   false, 'Ember yearly generation for Indonesia, series Coal, field share_of_generation_pct.', NULL),
  ('ember.idn.co2_intensity', 'ember', 'carbon-intensity/yearly',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Intensitas karbon listrik', 'Carbon intensity of electricity', 'gCO2e/kWh', 'A', 'transition', 'api',
   false, 'Ember yearly carbon intensity of generation for Indonesia, field emissions_intensity_gco2_per_kwh.', NULL),
  ('ember.idn.power_emissions', 'ember', 'power-sector-emissions/yearly?series=Total',
   'https://ember-energy.org/data/yearly-electricity-data/',
   'Emisi sektor listrik', 'Power sector emissions', 'MtCO2e', 'A', 'transition', 'api',
   false, 'Ember yearly power-sector emissions for Indonesia, aggregate total, field emissions_mtco2.', NULL),
  -- IMF SDMX 3.0. source_code = agency/dataflow/version/key.
  ('imf.idn.policy_rate', 'imf', 'IMF.STA/MFS_IR/9.0.0/IDN.MFS166_RT_PT_A_PT.M',
   'https://data.imf.org/en/datasets/IMF.STA:MFS_IR',
   'Suku bunga kebijakan moneter', 'Monetary policy-related interest rate', '% per annum', 'M', 'finance', 'api',
   false, 'IMF Monetary and Financial Statistics, interest rates: indicator MFS166_RT_PT_A_PT (monetary policy-related rate, percent per annum) for Indonesia, monthly.', NULL),
  ('imf.idn.idr_usd', 'imf', 'IMF.STA/ER/4.0.1/IDN.XDC_USD.PA_RT.M',
   'https://data.imf.org/en/datasets/IMF.STA:ER',
   'Kurs rupiah per dolar AS, rata-rata periode', 'Rupiah per US dollar, period average', 'IDR per USD', 'M', 'finance', 'api',
   false, 'IMF Exchange Rates: XDC_USD (domestic currency per US dollar), PA_RT (period average), Indonesia, monthly.', NULL),
  ('imf.weo.idn.gdp_growth', 'imf', 'IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A',
   'https://data.imf.org/en/datasets/IMF.RES:WEO',
   'Pertumbuhan PDB riil', 'Real GDP growth', '% change', 'A', 'macro', 'api',
   true, 'IMF World Economic Outlook, NGDP_RPCH, Indonesia. The vintage is the edition (WEO-YYYY-MM from PUBLICATION_DATE); years after LATEST_ACTUAL_ANNUAL_DATA are IMF staff projections.', NULL),
  ('imf.weo.idn.inflation', 'imf', 'IMF.RES/WEO/9.0.0/IDN.PCPIPCH.A',
   'https://data.imf.org/en/datasets/IMF.RES:WEO',
   'Inflasi IHK, rata-rata periode', 'CPI inflation, period average', '% change', 'A', 'macro', 'api',
   true, 'IMF World Economic Outlook, PCPIPCH, Indonesia. Vintage and projection years as for real GDP growth.', NULL),
  ('imf.pcps.coal_au', 'imf', 'IMF.RES/PCPS/9.0.0/G001.PCOALAU.USD.M',
   'https://data.imf.org/en/datasets/IMF.RES:PCPS',
   'Harga batu bara Australia (Newcastle)', 'Coal price, Australia (Newcastle)', 'USD per tonne', 'M', 'macro', 'api',
   false, 'IMF Primary Commodity Prices, PCOALAU: Australian thermal coal, 12,000 btu/lb, FOB Newcastle/Port Kembla, US$ per metric tonne, monthly.', NULL),
  -- Manual series. One reporter and one definition each; a new definition
  -- is a new series.
  ('pln.idn.spklu_units', 'pln', 'PLN press release: SPKLU units operated by PLN',
   'https://web.pln.co.id/media/siaran-pers',
   'Unit SPKLU yang dioperasikan PLN', 'Public EV charging units operated by PLN', 'units', 'event', 'infrastructure', 'manual',
   false, 'Charging units (not locations) operated by PLN alone, as PLN''s own release states them. Counts from ESDM or that include other operators belong to a different series.', '2027-01-31'),
  ('bei.idxcarbon.volume', 'bei', 'IDXCarbon trading volume, all markets',
   'https://idxcarbon.co.id/',
   'Volume perdagangan IDXCarbon', 'IDXCarbon traded volume', 'tCO2e', 'Q', 'carbon_price', 'manual',
   false, 'Volume traded on IDXCarbon in the quarter, all markets, as BEI''s own release states it. Figures quoted by the press are not a source.', '2027-01-31'),
  ('djppr.idn.green_sukuk', 'djppr', 'Green sukuk issuance, per issuance',
   'https://www.djppr.kemenkeu.go.id/',
   'Penerbitan sukuk hijau pemerintah', 'Government green sukuk issuance', 'IDR trillion', 'event', 'finance', 'manual',
   false, 'Value of each sovereign green sukuk issuance (global and retail) at its settlement date, as DJPPR''s issuance release states it.', '2027-01-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ds_chain (chain_link, title, question, sort_order) VALUES
  ('policy',         'Policy',         'Are the rules in place that the rest of the chain depends on?', 1),
  ('infrastructure', 'Infrastructure', 'Is the physical system being built?', 2),
  ('finance',        'Finance',        'Is capital available, and at what cost?', 3),
  ('transition',     'Transition',     'Is the power system actually getting cleaner?', 4),
  ('carbon_price',   'Carbon price',   'Does carbon carry a price that changes decisions?', 5),
  ('macro',          'Macro context',  'What economy is the transition happening in?', 6)
ON CONFLICT (chain_link) DO NOTHING;

INSERT INTO public.ds_chart (slug, title, subtitle, chain_link, chart_type, annotation_sectors, sort_order) VALUES
  ('policy-timeline', '[Finding: which rule the chain is waiting on]',
   'Verified entries of the tracker register, by quarter', 'policy', 'timeline',
   '{geothermal,solar,pln_procurement,jetp,ojk_taxonomy,danantara,other}', 1),
  ('generation-mix', '[Finding: what the generation mix shows]',
   'Electricity generation by source, TWh', 'infrastructure', 'stacked_bar', '{pln_procurement}', 1),
  ('installed-capacity', '[Finding: what installed capacity shows]',
   'Installed capacity by source, GW', 'infrastructure', 'line', '{solar,geothermal}', 2),
  ('spklu-units', '[Finding: what PLN''s charging network shows]',
   'Public EV charging units operated by PLN', 'infrastructure', 'step', '{}', 3),
  ('policy-rate', '[Finding: what the policy rate says about the cost of capital]',
   'Bank Indonesia''s monetary policy-related rate, % per annum', 'finance', 'step', '{jetp,danantara}', 1),
  ('rupiah-per-dollar', '[Finding: what the rupiah means for imported equipment]',
   'Rupiah per US dollar, monthly average', 'finance', 'line', '{}', 2),
  ('green-sukuk', '[Finding: what green sukuk issuance shows]',
   'Government green sukuk issuance, IDR trillion', 'finance', 'bar', '{ojk_taxonomy}', 3),
  ('coal-share', '[Finding: whether coal''s share is falling]',
   'Coal share of electricity generation, %', 'transition', 'line', '{pln_procurement,jetp}', 1),
  ('grid-carbon-intensity', '[Finding: what grid carbon intensity shows]',
   'Carbon intensity of electricity, gCO2e/kWh', 'transition', 'line', '{}', 2),
  ('power-sector-emissions', '[Finding: what power-sector emissions show]',
   'Power-sector emissions, MtCO2e', 'transition', 'bar', '{}', 3),
  ('idxcarbon-volume', '[Finding: whether the carbon exchange is trading]',
   'IDXCarbon traded volume by quarter, tCO2e', 'carbon_price', 'bar', '{}', 1),
  ('weo-growth', '[Finding: what the IMF expects for growth]',
   'Real GDP growth and CPI inflation, % (IMF staff projections after the last actual year)', 'macro', 'line', '{}', 1),
  ('coal-price', '[Finding: what the coal price means for the transition]',
   'Australian thermal coal, US$ per tonne', 'macro', 'line', '{}', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ds_chart_series (chart_slug, series_id, label, role, members, sort_order) VALUES
  ('generation-mix', 'ember.idn.generation', 'Generation', 'primary',
   '{Coal,Gas,"Other fossil",Hydro,Bioenergy,"Other renewables",Solar,Wind}', 1),
  ('installed-capacity', 'ember.idn.capacity', 'Capacity', 'primary',
   '{Coal,Gas,"Other fossil",Hydro,Bioenergy,"Other renewables",Solar,Wind}', 1),
  ('spklu-units', 'pln.idn.spklu_units', 'SPKLU units (PLN)', 'primary', NULL, 1),
  ('policy-rate', 'imf.idn.policy_rate', 'Policy rate', 'primary', NULL, 1),
  ('rupiah-per-dollar', 'imf.idn.idr_usd', 'IDR per USD', 'primary', NULL, 1),
  ('green-sukuk', 'djppr.idn.green_sukuk', 'Green sukuk', 'primary', NULL, 1),
  ('coal-share', 'ember.idn.coal_share', 'Coal share', 'primary', NULL, 1),
  ('grid-carbon-intensity', 'ember.idn.co2_intensity', 'Carbon intensity', 'primary', NULL, 1),
  ('power-sector-emissions', 'ember.idn.power_emissions', 'Emissions', 'primary', NULL, 1),
  ('idxcarbon-volume', 'bei.idxcarbon.volume', 'Traded volume', 'primary', NULL, 1),
  ('weo-growth', 'imf.weo.idn.gdp_growth', 'Real GDP growth', 'primary', NULL, 1),
  ('weo-growth', 'imf.weo.idn.inflation', 'CPI inflation', 'context', NULL, 2),
  ('coal-price', 'imf.pcps.coal_au', 'Newcastle coal', 'primary', NULL, 1)
ON CONFLICT (chart_slug, series_id) DO NOTHING;
