# API contract, as tested

The PRD's "Referensi API" left IMF half-verified: the workspace that wrote it could not reach
`api.imf.org`. This session could, on **24 October 2026**, and ran the Fase 0 tests directly.
Ember's API is still blocked from here (the proxy answers 403), so Ember rests on its OpenAPI
spec until the first keyed run.

## IMF SDMX 3.0 — verified

| Question the PRD left open | Answer, observed |
|---|---|
| Is a key needed? | **No.** `/structure` and `/data` answer 200 with no header. No `Ocp-Apim-Subscription-Key`. |
| Path form | `GET https://api.imf.org/external/sdmx/3.0/data/dataflow/{agency}/{flow}/{version}/{key}`. `+` (sent as `%2B`) is the latest version; `~` and `*` are refused (400/403). |
| Dimension order | The DSD's, read from `structure/dataflow/{agency}/{flow}/{version}?references=datastructure`. WEO is **COUNTRY.INDICATOR.FREQUENCY** (`IDN.NGDP_RPCH.A`); the PRD's "urutan B" (`A.IDN.NGDP_RPCH`) does not exist. |
| Time filter | `c[TIME_PERIOD]=ge:2020` must be percent-encoded (`c%5BTIME_PERIOD%5D=ge%3A2020`) or the gateway answers 400, and even then it is **ignored**: the full history comes back. The fetcher filters itself. |
| Format | `Accept: text/csv`: one row per observation, dimensions as columns, `TIME_PERIOD` as `2025`, `2026-M03`. `attributes=all` adds `PUBLICATION_DATE`, `UNIT`, `SCALE`, `LATEST_ACTUAL_ANNUAL_DATA`. |
| Policy rate code | **`MFS166_RT_PT_A_PT`** in `IMF.STA:MFS_IR` 9.0.0 ("Monetary policy-related, Rate, Percent per annum"). `FPOLM_PA` is gone. Indonesia's series has no value from 2001-12 to 2005-06, so the fetcher starts at 2005-07. Last value 5.75 (2026-07). |
| FX code and direction | **`IDN.XDC_USD.PA_RT.M`** in `IMF.STA:ER` 4.0.1 = rupiah per US dollar, period average (16,828 in 2026-01). The PRD's `USD_XDC` is the inverse (0.0000594). |
| Coal | `G001.PCOALAU.USD.M` in `IMF.RES:PCPS` **9.0.0** (agency IMF.RES confirmed). US$ per tonne, Newcastle/Port Kembla FOB. |
| WEO vintage | `IMF.RES:WEO` 9.0.0 currently carries `PUBLICATION_DATE` 2026-10-13, so the edition is **WEO-2026-10**. Past editions are separate dataflows (`IMF.RES:WEO_2026_APR_VINTAGE` 1.0.0), so an older edition can be backfilled later from its own dataflow. Projections are the years after `LATEST_ACTUAL_ANNUAL_DATA` (2025). |
| Units | WEO carries `UNIT=PT`; ER, MFS_IR and PCPS carry no `UNIT`. Every series carries `SCALE=0`. A row with another scale or unit is staged with a unit R5 refuses. |

The recorded answers are in `pipelines/transition/tests/fixtures/` and the adaptor's tests run
against them in CI. A full dry run against the live API:

```
$ python3 -m pipelines.transition.fetch --source imf --dry-run
imf.idn.policy_rate: 253 row(s), 2005-07 … 2026-07, vintage 2026-10-24, last value 5.75 % per annum
imf.idn.idr_usd: 320 row(s), 2000-01 … 2026-08, vintage 2026-10-24, last value 17849.3157894737 IDR per USD
imf.weo.idn.gdp_growth: 32 row(s), 2000 … 2031, vintage WEO-2026-10, last value 5.247723 % change
imf.weo.idn.inflation: 32 row(s), 2000 … 2031, vintage WEO-2026-10, last value 2.516051 % change
imf.pcps.coal_au: 321 row(s), 2000-01 … 2026-09, vintage 2026-10-24, last value 153.84 USD per tonne
imf: ok, 5 of 5 series ok
```

Those rows were then staged into the local Postgres 16 harness and run through
`ds_run_publish_gate` as the service role: **all five published**, R0–R7 passing, and R8 warning
only where the source itself has gaps.

## Ember v1 — from the OpenAPI spec, not yet exercised

| Item | Value |
|---|---|
| Base | `https://api.ember-energy.org/v1` |
| Key | query parameter `api_key` (free, email registration). Never printed: every error shows `api_key=***`. |
| Request | `/{dataset}/{yearly|monthly}?entity_code=IDN&start_date=…` |
| Answer | `{ "stats": {…}, "data": [{ "date", "series", "is_aggregate_series", <value fields> }] }` |

| Series | Endpoint | Field | Member |
|---|---|---|---|
| `ember.idn.generation` | `electricity-generation/yearly?is_aggregate_series=false` | `generation_twh` | each source |
| `ember.idn.capacity` | `installed-capacity/monthly?is_aggregate_series=false` | `capacity_gw` | each source |
| `ember.idn.coal_share` | `electricity-generation/yearly?series=Coal` | `share_of_generation_pct` | none |
| `ember.idn.co2_intensity` | `carbon-intensity/yearly` | `emissions_intensity_gco2_per_kwh` | none |
| `ember.idn.power_emissions` | `power-sector-emissions/yearly?series=Total` | `emissions_mtco2` | none |

What can still be wrong, and how it shows: a field name or the aggregate series' name
(`Total`) differing from the spec. Either fails the series **by name** ("series Total not in the
answer; it has …", "no field emissions_mtco2") and the run goes red; nothing is published. The
first keyed run settles it. To record Ember's real answers as fixtures:

```
EMBER_API_KEY=… python3 -m pipelines.transition.fetch --source ember --dry-run --record pipelines/transition/tests/fixtures/ember-recorded
```

Whether Indonesia is in Ember's **monthly** generation data is still unchecked; the registry
reads generation yearly and capacity monthly (the only form Ember publishes it in), so the answer
changes no code.
