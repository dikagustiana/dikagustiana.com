"""The API series the fetcher knows how to read, and how.

The database registry (ds_series) is the authority on what exists; this table
is the authority on how each series is read. fetch.py refuses a series whose
source_code here and in the database differ, so neither can change alone.
tests/test_registry.py checks this file against the seed migration.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EmberSpec:
    endpoint: str  # e.g. "electricity-generation/yearly"
    value_field: str
    unit: str
    params: tuple[tuple[str, str], ...] = ()
    # Members taken from the response's `series` field. None: every row is a
    # member (a mix). A tuple of one name: that row only, stored as member ''.
    only_series: tuple[str, ...] | None = None
    start: str = "2000"

    @property
    def source_code(self) -> str:
        if not self.params:
            return self.endpoint
        return self.endpoint + "?" + "&".join(f"{k}={v}" for k, v in self.params)


@dataclass(frozen=True)
class ImfSpec:
    agency: str
    dataflow: str
    version: str
    key: str
    unit: str
    # The UNIT attribute the source must carry, when it carries one.
    source_unit: str | None = None
    start: str = "2000"
    # WEO: the vintage is the edition, and years after the last actual are
    # projections.
    edition_prefix: str | None = None

    @property
    def source_code(self) -> str:
        return f"{self.agency}/{self.dataflow}/{self.version}/{self.key}"


EMBER: dict[str, EmberSpec] = {
    "ember.idn.generation": EmberSpec(
        "electricity-generation/yearly", "generation_twh", "TWh", (("is_aggregate_series", "false"),)
    ),
    "ember.idn.capacity": EmberSpec(
        "installed-capacity/monthly", "capacity_gw", "GW", (("is_aggregate_series", "false"),), start="2015-01"
    ),
    "ember.idn.coal_share": EmberSpec(
        "electricity-generation/yearly", "share_of_generation_pct", "%", (("series", "Coal"),), only_series=("Coal",)
    ),
    "ember.idn.co2_intensity": EmberSpec(
        "carbon-intensity/yearly", "emissions_intensity_gco2_per_kwh", "gCO2e/kWh"
    ),
    "ember.idn.power_emissions": EmberSpec(
        "power-sector-emissions/yearly", "emissions_mtco2", "MtCO2e", (("series", "Total"),), only_series=("Total",)
    ),
}

IMF: dict[str, ImfSpec] = {
    # From July 2005, when the BI rate began; the IMF series has no value
    # from December 2001 to June 2005.
    "imf.idn.policy_rate": ImfSpec(
        "IMF.STA", "MFS_IR", "9.0.0", "IDN.MFS166_RT_PT_A_PT.M", "% per annum", start="2005-07"
    ),
    "imf.idn.idr_usd": ImfSpec("IMF.STA", "ER", "4.0.1", "IDN.XDC_USD.PA_RT.M", "IDR per USD"),
    "imf.weo.idn.gdp_growth": ImfSpec(
        "IMF.RES", "WEO", "9.0.0", "IDN.NGDP_RPCH.A", "% change", source_unit="PT", edition_prefix="WEO"
    ),
    "imf.weo.idn.inflation": ImfSpec(
        "IMF.RES", "WEO", "9.0.0", "IDN.PCPIPCH.A", "% change", source_unit="PT", edition_prefix="WEO"
    ),
    "imf.pcps.coal_au": ImfSpec("IMF.RES", "PCPS", "9.0.0", "G001.PCOALAU.USD.M", "USD per tonne"),
}

SOURCES = {"ember": EMBER, "imf": IMF}


def spec_for(series_id: str):
    for table in SOURCES.values():
        if series_id in table:
            return table[series_id]
    raise KeyError(series_id)
