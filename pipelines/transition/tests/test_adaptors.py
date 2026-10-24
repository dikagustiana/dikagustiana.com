"""The adaptors against recorded IMF answers and constructed Ember ones.

Run: python3 -m unittest discover -s pipelines/transition/tests -t . -v
"""

from __future__ import annotations

import json
import re
import unittest
from datetime import date
from pathlib import Path

from pipelines.transition import ember, imf_sdmx
from pipelines.transition.common import FetchError, parse_period, parse_value
from pipelines.transition.registry import EMBER, IMF

FIX = Path(__file__).parent / "fixtures"
TODAY = date(2026, 10, 24)
ROOT = Path(__file__).resolve().parents[3]


def fake_get(routes: dict[str, bytes]):
    """A getter answering by URL substring; anything else is an error."""
    calls: list[str] = []

    def get(url: str, headers: dict) -> bytes:
        calls.append(url)
        for part, body in routes.items():
            if part in url:
                return body
        raise AssertionError(f"unexpected request {url}")

    get.calls = calls  # type: ignore[attr-defined]
    return get


def flow(version: str) -> bytes:
    return json.dumps({"data": {"dataflows": [{"id": "X", "version": version}]}}).encode()


def dsd(*dims: str) -> bytes:
    return json.dumps({"data": {"dataStructures": [{"dataStructureComponents": {"dimensionList": {
        "dimensions": [{"id": d, "position": i} for i, d in enumerate(dims)]}}}]}}).encode()


class CommonTest(unittest.TestCase):
    def test_periods(self):
        self.assertEqual(parse_period("2024"), (date(2024, 1, 1), "2024"))
        self.assertEqual(parse_period("2026-M03"), (date(2026, 3, 1), "2026-03"))
        self.assertEqual(parse_period("2026-03"), (date(2026, 3, 1), "2026-03"))
        self.assertEqual(parse_period("2025-Q3"), (date(2025, 7, 1), "2025-Q3"))
        with self.assertRaises(FetchError):
            parse_period("March 2026")

    def test_values_keep_their_digits(self):
        self.assertEqual(parse_value("17849.3157894737"), "17849.3157894737")
        self.assertEqual(parse_value("650.0"), "650")
        self.assertEqual(parse_value(5.75), "5.75")
        self.assertIsNone(parse_value(""))
        self.assertIsNone(parse_value(None))
        with self.assertRaises(FetchError):
            parse_value("n/a!")


class ImfTest(unittest.TestCase):
    def test_weo_uses_the_recorded_structure_and_names_the_edition(self):
        spec = IMF["imf.weo.idn.gdp_growth"]
        get = fake_get({
            "structure/dataflow/IMF.RES/WEO/%2B": (FIX / "weo_flow.json").read_bytes(),
            "structure/dataflow/IMF.RES/WEO/9.0.0?references": (FIX / "weo_dsd.json").read_bytes(),
            "data/dataflow/IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A": (FIX / "imf_weo_ngdp_rpch.csv").read_bytes(),
        })
        rows = imf_sdmx.fetch("imf.weo.idn.gdp_growth", spec, series_url="https://data.imf.org/en/datasets/IMF.RES:WEO",
                              today=TODAY, get=get)
        self.assertEqual({r.vintage for r in rows}, {"WEO-2026-10"})
        by_year = {r.period_label: r for r in rows}
        self.assertEqual(by_year["2031"].value, "5.247723")
        self.assertFalse(by_year["2025"].is_projection)  # LATEST_ACTUAL_ANNUAL_DATA = 2025
        self.assertTrue(by_year["2026"].is_projection)
        self.assertEqual({r.unit for r in rows}, {"% change"})
        self.assertEqual({r.source_code for r in rows}, {"IMF.RES/WEO/9.0.0/IDN.NGDP_RPCH.A"})
        self.assertIn("attributes=all", get.calls[-1])

    def test_er_reads_rupiah_per_dollar(self):
        spec = IMF["imf.idn.idr_usd"]
        get = fake_get({
            "structure/dataflow/IMF.STA/ER/%2B": (FIX / "er_flow.json").read_bytes(),
            "structure/dataflow/IMF.STA/ER/4.0.1?references": (FIX / "er_dsd.json").read_bytes(),
            "data/dataflow/IMF.STA/ER": (FIX / "imf_er_xdc_usd.csv").read_bytes(),
        })
        rows = imf_sdmx.fetch("imf.idn.idr_usd", spec, series_url="https://data.imf.org/en/datasets/IMF.STA:ER",
                              today=TODAY, get=get)
        self.assertEqual(rows[0].period_label, "2025-01")
        self.assertGreater(float(rows[0].value), 10000)  # rupiah per dollar, not the inverse
        self.assertEqual({r.vintage for r in rows}, {"2026-10-24"})
        self.assertFalse(any(r.is_projection for r in rows))

    def test_policy_rate_and_coal_parse(self):
        for sid, fixture, dims in [
            ("imf.idn.policy_rate", "imf_mfs_ir_policy.csv", ("COUNTRY", "INDICATOR", "FREQUENCY")),
            ("imf.pcps.coal_au", "imf_pcps_coal.csv", ("COUNTRY", "INDICATOR", "DATA_TRANSFORMATION", "FREQUENCY")),
        ]:
            spec = IMF[sid]
            rows = imf_sdmx.parse_csv(sid, spec, (FIX / fixture).read_text(encoding="utf-8-sig"),
                                      dims=list(dims), series_url="https://data.imf.org/", today=TODAY)
            self.assertTrue(rows, sid)
            self.assertTrue(all(re.fullmatch(r"\d{4}-\d{2}-01", r.period_start) for r in rows), sid)

    def test_a_new_dataflow_version_fails_by_name(self):
        get = fake_get({"structure/dataflow/IMF.STA/ER/%2B": flow("5.0.0")})
        with self.assertRaisesRegex(FetchError, "now version 5.0.0, pinned 4.0.1"):
            imf_sdmx.fetch("imf.idn.idr_usd", IMF["imf.idn.idr_usd"], series_url="https://x", today=TODAY, get=get)

    def test_a_key_that_does_not_fit_the_structure_fails(self):
        get = fake_get({"%2B": flow("4.0.1"), "?references": dsd("COUNTRY", "INDICATOR", "FREQUENCY")})
        with self.assertRaisesRegex(FetchError, "has 4 parts"):
            imf_sdmx.fetch("imf.idn.idr_usd", IMF["imf.idn.idr_usd"], series_url="https://x", today=TODAY, get=get)

    def test_rows_off_the_key_mean_the_order_changed(self):
        text = (FIX / "imf_er_xdc_usd.csv").read_text(encoding="utf-8-sig")
        with self.assertRaisesRegex(FetchError, "dimension order changed"):
            imf_sdmx.parse_csv("imf.idn.idr_usd", IMF["imf.idn.idr_usd"], text,
                               dims=["INDICATOR", "COUNTRY", "TYPE_OF_TRANSFORMATION", "FREQUENCY"],
                               series_url="https://x", today=TODAY)

    def test_a_scaled_value_is_staged_with_a_unit_r5_refuses(self):
        text = "COUNTRY,INDICATOR,FREQUENCY,TIME_PERIOD,OBS_VALUE,SCALE\nIDN,MFS166_RT_PT_A_PT,M,2026-M01,5,3\n"
        rows = imf_sdmx.parse_csv("imf.idn.policy_rate", IMF["imf.idn.policy_rate"], text,
                                  dims=["COUNTRY", "INDICATOR", "FREQUENCY"], series_url="https://x", today=TODAY)
        self.assertNotEqual(rows[0].unit, IMF["imf.idn.policy_rate"].unit)

    def test_weo_without_publication_date_fails(self):
        text = "COUNTRY,INDICATOR,FREQUENCY,TIME_PERIOD,OBS_VALUE,LATEST_ACTUAL_ANNUAL_DATA\nIDN,NGDP_RPCH,A,2025,5,2025\n"
        with self.assertRaisesRegex(FetchError, "PUBLICATION_DATE"):
            imf_sdmx.parse_csv("imf.weo.idn.gdp_growth", IMF["imf.weo.idn.gdp_growth"], text,
                               dims=["COUNTRY", "INDICATOR", "FREQUENCY"], series_url="https://x", today=TODAY)


class EmberTest(unittest.TestCase):
    def test_a_mix_keeps_one_member_per_source_and_drops_aggregates(self):
        body = (FIX / "ember_generation_yearly.CONSTRUCTED.json").read_bytes()
        rows = ember.parse("ember.idn.generation", EMBER["ember.idn.generation"], body,
                           series_url="https://ember-energy.org/data/yearly-electricity-data/", today=TODAY)
        self.assertEqual(sorted({r.member for r in rows}), ["Coal", "Gas", "Solar"])
        self.assertEqual(len(rows), 6)  # Fossil is an aggregate; Wind 2022 has no value
        self.assertEqual({r.unit for r in rows}, {"TWh"})
        coal = [r for r in rows if r.member == "Coal"][0]
        self.assertEqual(coal.source_code, "electricity-generation/yearly?is_aggregate_series=false:Coal")

    def test_one_series_is_stored_without_a_member(self):
        body = (FIX / "ember_generation_yearly.CONSTRUCTED.json").read_bytes()
        rows = ember.parse("ember.idn.coal_share", EMBER["ember.idn.coal_share"], body,
                           series_url="https://ember-energy.org/", today=TODAY)
        self.assertEqual([(r.member, r.period_label, r.value) for r in rows], [("", "2023", "60.5"), ("", "2024", "60.5")])

    def test_a_missing_named_series_fails_with_what_is_there(self):
        body = (FIX / "ember_generation_yearly.CONSTRUCTED.json").read_bytes()
        with self.assertRaisesRegex(FetchError, "series Total not in the answer; it has Coal, Fossil, Gas, Solar, Wind"):
            ember.parse("ember.idn.power_emissions", EMBER["ember.idn.power_emissions"], body.replace(
                b'"generation_twh"', b'"emissions_mtco2"'), series_url="https://x", today=TODAY)

    def test_monthly_dates_land_on_the_first(self):
        body = (FIX / "ember_capacity_monthly.CONSTRUCTED.json").read_bytes()
        rows = ember.parse("ember.idn.capacity", EMBER["ember.idn.capacity"], body, series_url="https://x", today=TODAY)
        self.assertEqual([r.period_start for r in rows], ["2025-01-01", "2025-02-01"])

    def test_the_key_never_appears_in_an_error(self):
        def get(url, headers):
            from pipelines.transition.common import http_get
            return http_get(url.replace("https://api.ember-energy.org", "https://127.0.0.1:9"), headers,
                            redact="SECRET-KEY", tries=1, timeout=1)
        with self.assertRaises(FetchError) as ctx:
            ember.fetch("ember.idn.co2_intensity", EMBER["ember.idn.co2_intensity"], api_key="SECRET-KEY",
                        series_url="https://x", today=TODAY, get=get)
        self.assertNotIn("SECRET-KEY", str(ctx.exception))
        self.assertIn("api_key=***", str(ctx.exception))

    def test_no_key_fails_before_any_request(self):
        with self.assertRaisesRegex(FetchError, "EMBER_API_KEY"):
            ember.fetch("ember.idn.co2_intensity", EMBER["ember.idn.co2_intensity"], api_key="",
                        series_url="https://x", today=TODAY, get=fake_get({}))


class RegistryTest(unittest.TestCase):
    def test_the_fetcher_and_the_seed_name_the_same_api_series_and_codes(self):
        seed = (ROOT / "supabase/migrations/20261024120100_transition_data_layer_seed.sql").read_text()
        found = dict(re.findall(r"\('((?:ember|imf)\.[a-z0-9_.]+)', '(?:ember|imf)', '([^']+)'", seed))
        mine = {sid: spec.source_code for table in (EMBER, IMF) for sid, spec in table.items()}
        self.assertEqual(found, mine)

    def test_units_match_the_seed(self):
        seed = (ROOT / "supabase/migrations/20261024120100_transition_data_layer_seed.sql").read_text()
        for table in (EMBER, IMF):
            for sid, spec in table.items():
                m = re.search(rf"\('{re.escape(sid)}',.*?\n.*?\n\s+'[^']*', '[^']*', '([^']+)'", seed)
                self.assertIsNotNone(m, sid)
                self.assertEqual(m[1], spec.unit, sid)


if __name__ == "__main__":
    unittest.main()
