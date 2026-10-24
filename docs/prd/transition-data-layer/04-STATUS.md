# Status per gate (24 October 2026)

What is built and proven in the repository, and what still needs a person, a key or a decision.
"Proven" means a test in CI or a run recorded here, not a reading of the code.

## G0 · Persiapan

| Item | State |
|---|---|
| IMF queries for Indonesia (WEO, policy rate, FX) and the coal code | **Done.** All four answer without a key; codes, versions and dimension order in `03-API-CONTRACT.md`. |
| Recharts in the bundle? | **No**, and not added back (D2). |
| Ember key, `EMBER_API_KEY` secret | **Dika.** Free registration at ember-energy.org/data/api. |
| P0: backup secrets in GitHub Actions | **Dika.** The same two secrets (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) serve `backup.yml` and `transition-fetch.yml`. |
| Indonesia in Ember's monthly data | Unchecked (Ember blocked from here); changes no code. |

## G1 · Data layer

| Item | State |
|---|---|
| Migration: tables, enums, views, RLS | **Written and tested** on Postgres 16 with the Supabase harness: `20261024120000_transition_data_layer.sql`. **Not applied to production.** |
| `ds_publish_series()` with R1–R8, writing `ds_check` | **Done**, plus R0 and the GATE row (D7). `supabase/tests/transition_data_layer.sql`: **65 passed, 0 failed**, one rolled-back transaction. |
| `ember.py`, `imf_sdmx.py` with tests on recorded answers | **Done.** IMF recorded; Ember constructed from its spec (fixtures README). 18 Python tests, in CI. |
| `transition-fetch.yml` | **Done.** Weekly, Monday 02:13 WIB, plus manual by source and series. |
| Seed: sources and the API series | **Done**: 6 sources, 10 API series (the PRD's 8 + WEO inflation and coal for Fase 4), 3 manual series, 13 charts, the chain. |
| Negative test: a failing job leaves public data unchanged | **Done**, in the SQL test (every refused run, then the public snapshot compared). |
| 8 series published, 10 values checked against the source | **After the migration is applied and the workflow runs.** The IMF five were already published end to end on the local harness from the live API. |

## G2 · Entri manual

| Item | State |
|---|---|
| Admin screen, one value and CSV with preview, publish through the same gate | **Done**: `/admin/transition-data` (linked from the dashboard). |
| A row without a locator refused by R2 | **Done**: on the client before staging, and in the database (SQL test). |
| Seed values for SPKLU, IDXCarbon, green sukuk | **Dika.** The registry rows exist; the values must come from PLN's, BEI's and DJPPR's own releases, with page or table. Press figures are refused by the rules' design (the PRD's IDXCarbon numbers are from Bisnis.com, not BEI). |
| `tracker_entry` ready as markers | **Done.** Verified, published rows of a chart's sectors, at the end of their quarter. |

## G3 · Tampilan publik

| Item | State |
|---|---|
| `TransitionChart`, trail, CSV, markers | **Done.** Screens reviewed in Chromium at 1280 and 390 px with the live IMF values. |
| Tracker index by chain link, chart page | **Done** (D1, D5). |
| `chartEmbed` with a picker in the editor | **Done**: "Tracker chart" in the `/` and `+` menus; the five-place content contract covered by tests. |
| Old tracker redirected | Same address (D1); `/transition/tracker` redirects. |
| Five links with a published chart | **Dika**: write each chart's finding in Admin → Transition data, then Publish. A bracketed title cannot be published. |
| Pilot essay; Verification Register review; < 2 s on 4G | **Dika**, after the charts are published. The tracker adds no library; the essay chunk loads chart code only when an essay embeds one. |

## G4 · FSRE

| Item | State |
|---|---|
| Assumptions by explicit WEO edition | **Done**: `ds_macro_assumptions('WEO-2026-10')`, `v_macro_editions` (D11); tested on the live IMF values. |
| FSRE reads from it; edition recorded in each model package; PTBA or INDY reproduced | **In the private fsre-skills repository**, not this one. |

## Decisions still Dika's (the build's default in brackets)

- Tracker as index plus embeds, or only a chart source for essays *(index plus embeds)*.
- Language *(English; `title_id` stored)*.
- Policy indicator: register markers only, or a RUPTL target series *(markers only; the policy
  link's chart is the register timeline)*.
- R7 threshold *(25% for every series; editable per series in the database)*.
- First series for the pilot essay *(none chosen)*.
