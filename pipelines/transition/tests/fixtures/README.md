# Fetcher fixtures

**Recorded** from `https://api.imf.org/external/sdmx/3.0` on 2026-10-24, with no key
(see `docs/prd/transition-data-layer/03-API-CONTRACT.md`). The CSV files are trimmed to
recent periods; every column and the header row are as served.

| file | request |
|---|---|
| `imf_weo_ngdp_rpch.csv` | `data/dataflow/IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A?attributes=all`, periods ≥ 2020 kept |
| `imf_er_xdc_usd.csv` | `data/dataflow/IMF.STA/ER/4.0.1/IDN.XDC_USD.PA_RT.M?attributes=all`, ≥ 2025 |
| `imf_mfs_ir_policy.csv` | `data/dataflow/IMF.STA/MFS_IR/9.0.0/IDN.MFS166_RT_PT_A_PT.M?attributes=all`, ≥ 2025 |
| `imf_pcps_coal.csv` | `data/dataflow/IMF.RES/PCPS/9.0.0/G001.PCOALAU.USD.M?attributes=all`, ≥ 2025 |
| `er_flow.json`, `weo_flow.json` | `structure/dataflow/{agency}/{flow}/+` (the latest version) |
| `er_dsd.json`, `weo_dsd.json` | `structure/dataflow/{agency}/{flow}/{version}?references=datastructure` |

**Constructed, not recorded:** `ember_*.CONSTRUCTED.json`. The workspace proxy blocks
`api.ember-energy.org` (403), so these follow the response shape of Ember's OpenAPI v1
(`stats` + `data`, one object per entity, date and series) with placeholder values. They
test the parser, not Ember. Replace them with recorded responses from the first keyed run
(`python3 -m pipelines.transition.fetch --source ember --dry-run --record DIR`).
