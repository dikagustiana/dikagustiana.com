"""The fetcher's entry point.

    python3 -m pipelines.transition.fetch --source imf
    python3 -m pipelines.transition.fetch --source ember --series ember.idn.coal_share
    python3 -m pipelines.transition.fetch --source imf --dry-run          # no database
    python3 -m pipelines.transition.fetch --source imf --dry-run --record DIR

For each API series of the source: pull, stage under a fresh token, call
ds_run_publish_gate, and log the run in ds_fetch_run. A series that fails is
reported and the next one still runs; any failure makes the exit code 1, so
the scheduled workflow goes red and GitHub says so. A failure never touches
published data: rows only ever reach staging, and the gate decides.

Environment: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMBER_API_KEY
(Ember only), GITHUB_SHA and the run URL parts when on Actions.
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

from . import ember, imf_sdmx
from .common import FetchError, StagedRow
from .registry import SOURCES, spec_for
from .supabase_rest import Supabase

CHUNK = 500


def pull(series_id: str, series_url: str, today: date, *, record: Path | None = None) -> list[StagedRow]:
    spec = spec_for(series_id)
    if series_id in SOURCES["ember"]:
        get = None
        if record:
            def get(url, headers, _key=os.environ.get("EMBER_API_KEY", "")):
                from .common import http_get
                body = http_get(url, headers, redact=_key)
                (record / f"ember_{series_id}.json").write_bytes(body)
                return body
        return ember.fetch(series_id, spec, api_key=os.environ.get("EMBER_API_KEY", ""),
                           series_url=series_url, today=today, get=get)
    return imf_sdmx.fetch(series_id, spec, series_url=series_url, today=today)


def registry_rows(db: Supabase | None, source: str, only: str | None) -> list[dict]:
    """The API series to pull, with their database rows (or the code's, dry)."""
    known = SOURCES[source]
    if db is None:
        rows = [{"id": sid, "source_code": spec.source_code, "source_url": "https://example.invalid/dry-run"}
                for sid, spec in known.items()]
    else:
        rows = db.select("ds_series", select="id,source_code,source_url,status",
                         source_id=f"eq.{source}", ingest="eq.api", status="neq.retired", order="id")
    if only:
        rows = [r for r in rows if r["id"] == only]
        if not rows:
            raise FetchError(f"no API series {only} for source {source}")
    return rows


def run(source: str, *, only: str | None, dry_run: bool, record: Path | None, today: date) -> int:
    db = None if dry_run else Supabase(os.environ.get("VITE_SUPABASE_URL", ""),
                                       os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))
    run_id = None
    if db:
        run_url = None
        if os.environ.get("GITHUB_RUN_ID"):
            run_url = (f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/"
                       f"{os.environ.get('GITHUB_REPOSITORY', '')}/actions/runs/{os.environ['GITHUB_RUN_ID']}")
        run_id = db.insert("ds_fetch_run", {"source_id": source, "git_sha": os.environ.get("GITHUB_SHA"),
                                            "run_url": run_url}, returning=True)[0]["id"]

    errors: list[str] = []
    staged = 0
    ok_series = 0
    try:
        series = registry_rows(db, source, only)
    except FetchError as exc:
        series, errors = [], [str(exc)]

    for row in series:
        sid = row["id"]
        try:
            spec = spec_for(sid)
            if spec.source_code != row["source_code"]:
                raise FetchError(f"source_code differs: database {row['source_code']!r}, fetcher {spec.source_code!r}")
            rows = pull(sid, row["source_url"], today, record=record)
            if db is None:
                print(f"{sid}: {len(rows)} row(s), {rows[0].period_label} … {rows[-1].period_label}, "
                      f"vintage {rows[-1].vintage}, last value {rows[-1].value} {rows[-1].unit}")
                ok_series += 1
                continue

            token = str(uuid.uuid4())
            retrieved = datetime.now(timezone.utc).isoformat()
            # Last run's refused rows for this series go; an admin's manual
            # rows are never touched.
            db.delete("ds_observation_stage", series_id=f"eq.{sid}", ingest="eq.api")
            payload = [r.to_stage(token, run_id, retrieved) for r in rows]
            for i in range(0, len(payload), CHUNK):
                db.insert("ds_observation_stage", payload[i:i + CHUNK])
            staged += len(payload)
            result = db.rpc("ds_run_publish_gate", p_series_id=sid, p_stage_token=token)[0]
            line = (f"{sid}: staged {len(payload)}, rules {result['rules']}, failed {result['failed']}, "
                    f"warnings {result['warnings']}, published {result['published']} "
                    f"({result['rows_published']} new or revised, {result['rows_unchanged']} unchanged)")
            print(line)
            if result["published"]:
                ok_series += 1
            elif result["failed"]:
                errors.append(f"{sid}: refused by the gate ({result['failed']} rule(s) failed); see ds_check")
            else:
                # R7 warnings: staged and waiting for an admin. Not a failure
                # of the job, but it must be seen.
                ok_series += 1
                print(f"::warning::{sid}: {result['warnings']} warning(s) wait for an admin in /admin/transition-data")
        except FetchError as exc:
            errors.append(f"{sid}: {exc}")
        except Exception as exc:  # report and go on to the next series
            errors.append(f"{sid}: {type(exc).__name__}: {exc}")

    status = "ok" if not errors else ("partial" if ok_series else "failed")
    if db and run_id:
        db.update("ds_fetch_run", {"status": status, "finished_at": datetime.now(timezone.utc).isoformat(),
                                   "rows_staged": staged, "error": "\n".join(errors) or None}, id=f"eq.{run_id}")
    for e in errors:
        print(f"::error::{e}")
    print(f"{source}: {status}, {ok_series} of {len(series)} series ok")
    return 0 if not errors else 1


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--source", required=True, choices=sorted(SOURCES))
    ap.add_argument("--series", help="one series id only")
    ap.add_argument("--dry-run", action="store_true", help="pull and print, write nothing")
    ap.add_argument("--record", type=Path, help="with --dry-run: save the raw Ember answers here")
    args = ap.parse_args(argv)
    if args.record and not args.dry_run:
        ap.error("--record needs --dry-run")
    if args.record:
        args.record.mkdir(parents=True, exist_ok=True)
    return run(args.source, only=args.series, dry_run=args.dry_run, record=args.record,
               today=datetime.now(timezone.utc).date())


if __name__ == "__main__":
    sys.exit(main())
