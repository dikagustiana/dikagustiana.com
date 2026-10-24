"""What every adaptor shares: the staged row, period parsing, and HTTP.

An adaptor knows how to talk to one API and returns StagedRow values. It never
writes to the database; fetch.py does that, and only to staging.
"""

from __future__ import annotations

import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Callable

USER_AGENT = "dikagustiana.com transition fetcher (+https://dikagustiana.com/green-transition/tracker)"


class FetchError(Exception):
    """A failure the job reports by name. Its message never carries a key."""


@dataclass(frozen=True)
class StagedRow:
    series_id: str
    member: str
    period_start: str  # ISO date, the first day of the period
    period_label: str
    value: str  # a decimal, kept as text so nothing is rounded on the way
    unit: str
    vintage: str
    is_projection: bool
    source_url: str
    source_code: str

    def to_stage(self, stage_token: str, fetch_run_id: str | None, retrieved_at: str) -> dict:
        row = asdict(self)
        row.update(
            stage_token=stage_token,
            fetch_run_id=fetch_run_id,
            retrieved_at=retrieved_at,
            ingest="api",
        )
        return row


_QUARTER_START = {1: 1, 2: 4, 3: 7, 4: 10}


def parse_period(text: str) -> tuple[date, str]:
    """A source's period as (first day, label).

    Accepts 2024, 2024-03, 2024-03-01, 2024-M03 (SDMX monthly) and 2024-Q1.
    """
    t = text.strip()
    if m := re.fullmatch(r"(\d{4})", t):
        return date(int(m[1]), 1, 1), t
    if m := re.fullmatch(r"(\d{4})-M?(\d{2})", t):
        d = date(int(m[1]), int(m[2]), 1)
        return d, d.strftime("%Y-%m")
    if m := re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", t):
        d = date(int(m[1]), int(m[2]), int(m[3]))
        return d, t
    if m := re.fullmatch(r"(\d{4})-Q([1-4])", t):
        return date(int(m[1]), _QUARTER_START[int(m[2])], 1), t
    raise FetchError(f"unrecognised period {text!r}")


def parse_value(text: object) -> str | None:
    """A numeric value as canonical decimal text; None for an empty cell."""
    if text is None:
        return None
    s = str(text).strip()
    if s == "" or s.upper() in {"NA", "NAN", "NULL"}:
        return None
    try:
        d = Decimal(s)
    except InvalidOperation as exc:
        raise FetchError(f"value {s!r} is not a number") from exc
    if not d.is_finite():
        raise FetchError(f"value {s!r} is not finite")
    return format(d.normalize(), "f") if d == d.to_integral() else str(d)


Getter = Callable[[str, dict], bytes]


def http_get(url: str, headers: dict, *, redact: str | None = None, tries: int = 3, timeout: int = 90) -> bytes:
    """GET with retries on 429 and 5xx. Errors name the URL with `redact` blanked."""
    shown = url.replace(redact, "***") if redact else url
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **headers})
    last: Exception | None = None
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            # A 404 from the IMF gateway can mean a missing key, not a missing
            # dataset (03-API-CONTRACT.md); say both.
            if exc.code == 429 or exc.code >= 500:
                last = exc
            else:
                raise FetchError(f"HTTP {exc.code} from {shown}") from None
        except (urllib.error.URLError, TimeoutError) as exc:
            last = exc
        time.sleep(2 ** (attempt + 1))
    raise FetchError(f"no answer from {shown} after {tries} tries: {type(last).__name__}") from None
