"""Ember's electricity data API v1 (https://api.ember-energy.org/v1).

Contract, from Ember's OpenAPI v1 (03-API-CONTRACT.md):
  * GET /{dataset}/{yearly|monthly}?entity_code=IDN&start_date=…&api_key=…;
  * the answer is JSON with `stats` (rate_limit among it) and `data`, a list of
    objects carrying `date`, `series`, `is_aggregate_series` and the value
    fields (generation_twh, share_of_generation_pct, capacity_gw, …).

The key travels in the URL, so this module never prints a URL with it: every
error names the URL with the key blanked.
"""

from __future__ import annotations

import json
import time
import urllib.parse
from datetime import date

from .common import FetchError, Getter, StagedRow, http_get, parse_period, parse_value
from .registry import EmberSpec

BASE = "https://api.ember-energy.org/v1"


def request_url(spec: EmberSpec, api_key: str) -> str:
    params = [("entity_code", "IDN"), ("start_date", spec.start), *spec.params, ("api_key", api_key)]
    return f"{BASE}/{spec.endpoint}?{urllib.parse.urlencode(params)}"


def fetch(series_id: str, spec: EmberSpec, *, api_key: str, series_url: str, today: date,
          get: Getter | None = None) -> list[StagedRow]:
    if not api_key:
        raise FetchError("EMBER_API_KEY is not set")
    url = request_url(spec, api_key)
    getter = get or (lambda u, h: http_get(u, h, redact=api_key))
    body = getter(url, {"Accept": "application/json"})
    time.sleep(0 if get else 1)  # be gentle with the free tier between calls
    return parse(series_id, spec, body, series_url=series_url, today=today)


def parse(series_id: str, spec: EmberSpec, body: bytes, *, series_url: str, today: date) -> list[StagedRow]:
    try:
        doc = json.loads(body)
    except json.JSONDecodeError as exc:
        raise FetchError(f"Ember {spec.endpoint}: the answer is not JSON") from exc
    data = doc.get("data")
    if not isinstance(data, list):
        raise FetchError(f"Ember {spec.endpoint}: no `data` list in the answer")

    rows: list[StagedRow] = []
    seen_series: set[str] = set()
    for rec in data:
        if rec.get("entity_code") not in (None, "IDN"):
            continue
        name = str(rec.get("series") or "")
        seen_series.add(name)
        if spec.only_series is not None and name not in spec.only_series:
            continue
        if spec.only_series is None and rec.get("is_aggregate_series"):
            continue
        if spec.value_field not in rec:
            raise FetchError(f"Ember {spec.endpoint}: no field {spec.value_field} in the answer")
        value = parse_value(rec[spec.value_field])
        if value is None:
            continue
        period, label = parse_period(str(rec["date"]))
        member = "" if spec.only_series is not None else name
        if spec.only_series is None and not member:
            raise FetchError(f"Ember {spec.endpoint}: a row of a mix has no series name")
        rows.append(
            StagedRow(
                series_id=series_id,
                member=member,
                period_start=period.isoformat(),
                period_label=label,
                value=value,
                unit=spec.unit,
                vintage=today.isoformat(),
                is_projection=False,
                source_url=series_url,
                source_code=f"{spec.source_code}:{name}" if name else spec.source_code,
            )
        )

    if spec.only_series is not None and not rows:
        raise FetchError(
            f"Ember {spec.endpoint}: series {', '.join(spec.only_series)} not in the answer; "
            f"it has {', '.join(sorted(s for s in seen_series if s)) or 'none'}"
        )
    if not rows:
        raise FetchError(f"Ember {spec.endpoint}: no value for Indonesia from {spec.start}")
    return rows
