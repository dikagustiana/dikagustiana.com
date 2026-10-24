"""The IMF's SDMX 3.0 API (api.imf.org), tested on 2026-10-24.

Contract, as observed (docs/prd/transition-data-layer/03-API-CONTRACT.md):
  * no key is needed for /structure or /data;
  * data:      /data/dataflow/{agency}/{flow}/{version}/{key}, key in DSD order;
  * structure: /structure/dataflow/{agency}/{flow}/+ names the latest version;
  * the c[TIME_PERIOD] filter is accepted and ignored, so we filter here;
  * Accept: text/csv returns one row per observation with the dimensions as
    columns; attributes=all adds PUBLICATION_DATE and, for WEO,
    LATEST_ACTUAL_ANNUAL_DATA.

The adaptor never assumes a dimension order. It reads the dataflow's DSD,
checks that the pinned key has one part per dimension, and checks every data
row's dimension columns against those parts. A new dataflow version fails the
job by name rather than reading a different structure.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import date

from .common import FetchError, Getter, StagedRow, http_get, parse_period, parse_value
from .registry import ImfSpec

BASE = "https://api.imf.org/external/sdmx/3.0"


def default_get(url: str, headers: dict) -> bytes:
    return http_get(url, headers)


def latest_version(spec: ImfSpec, get: Getter) -> str:
    body = get(f"{BASE}/structure/dataflow/{spec.agency}/{spec.dataflow}/%2B", {"Accept": "application/json"})
    flows = json.loads(body)["data"]["dataflows"]
    if not flows:
        raise FetchError(f"IMF lists no dataflow {spec.agency}:{spec.dataflow}")
    return flows[0]["version"]


def dimensions(spec: ImfSpec, get: Getter) -> list[str]:
    body = get(
        f"{BASE}/structure/dataflow/{spec.agency}/{spec.dataflow}/{spec.version}?references=datastructure",
        {"Accept": "application/json"},
    )
    data = json.loads(body)["data"]
    structures = data.get("dataStructures") or []
    if not structures:
        raise FetchError(f"no data structure for {spec.agency}:{spec.dataflow}({spec.version})")
    dims = structures[0]["dataStructureComponents"]["dimensionList"]["dimensions"]
    return [d["id"] for d in sorted(dims, key=lambda d: d.get("position", 0))]


def fetch(series_id: str, spec: ImfSpec, *, series_url: str, today: date, get: Getter = default_get) -> list[StagedRow]:
    current = latest_version(spec, get)
    if current != spec.version:
        raise FetchError(
            f"{spec.agency}:{spec.dataflow} is now version {current}, pinned {spec.version}: "
            "check the new structure, then register the new version (a new source_code)"
        )

    dims = dimensions(spec, get)
    parts = spec.key.split(".")
    if len(parts) != len(dims):
        raise FetchError(f"key {spec.key} has {len(parts)} parts; {spec.dataflow} has dimensions {'.'.join(dims)}")

    body = get(
        f"{BASE}/data/dataflow/{spec.agency}/{spec.dataflow}/{spec.version}/{spec.key}?attributes=all",
        {"Accept": "text/csv"},
    )
    return parse_csv(series_id, spec, body.decode("utf-8-sig"), dims=dims, series_url=series_url, today=today)


def parse_csv(series_id: str, spec: ImfSpec, text: str, *, dims: list[str], series_url: str, today: date) -> list[StagedRow]:
    reader = csv.DictReader(io.StringIO(text))
    missing = [d for d in [*dims, "TIME_PERIOD", "OBS_VALUE"] if d not in (reader.fieldnames or [])]
    if missing:
        raise FetchError(f"{spec.dataflow} CSV lacks column(s) {', '.join(missing)}")

    parts = dict(zip(dims, spec.key.split(".")))
    start = parse_period(spec.start)[0]
    rows: list[StagedRow] = []
    editions: set[str] = set()
    for rec in reader:
        for dim, want in parts.items():
            if rec[dim] != want:
                raise FetchError(f"{spec.dataflow} row has {dim}={rec[dim]}, the key asks {want}: dimension order changed?")
        value = parse_value(rec["OBS_VALUE"])
        if value is None:
            continue
        period, label = parse_period(rec["TIME_PERIOD"])
        if period < start:
            continue
        scale = (rec.get("SCALE") or "0").strip()
        unit = spec.unit
        if scale not in ("", "0"):
            unit = f"{spec.unit} (source SCALE {scale})"  # R5 refuses it
        if spec.source_unit and (rec.get("UNIT") or "") not in ("", spec.source_unit):
            unit = f"{spec.unit} (source UNIT {rec['UNIT']})"  # R5 refuses it

        if spec.edition_prefix:
            pub = (rec.get("PUBLICATION_DATE") or "").strip()
            if len(pub) < 7:
                raise FetchError(f"{spec.dataflow} row {label} has no PUBLICATION_DATE: the edition cannot be named")
            vintage = f"{spec.edition_prefix}-{pub[:7]}"
            editions.add(vintage)
            last_actual = (rec.get("LATEST_ACTUAL_ANNUAL_DATA") or "").strip()
            if not last_actual.isdigit():
                raise FetchError(f"{spec.dataflow} row {label} has no LATEST_ACTUAL_ANNUAL_DATA")
            is_projection = period.year > int(last_actual)
        else:
            vintage = today.isoformat()
            is_projection = False

        rows.append(
            StagedRow(
                series_id=series_id,
                member="",
                period_start=period.isoformat(),
                period_label=label,
                value=value,
                unit=unit,
                vintage=vintage,
                is_projection=is_projection,
                source_url=series_url,
                source_code=spec.source_code,
            )
        )
    if len(editions) > 1:
        raise FetchError(f"{spec.dataflow} answered with more than one edition: {', '.join(sorted(editions))}")
    if not rows:
        raise FetchError(f"{spec.source_code} returned no observation from {spec.start}")
    return rows
