"""A small PostgREST client for the fetcher, with the service role key.

What the key may do is set by the migration's privileges, not here: read the
registry, write ds_fetch_run, stage and clear rows, call ds_run_publish_gate.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from .common import USER_AGENT, FetchError


class Supabase:
    def __init__(self, url: str, key: str):
        if not url or not key:
            raise FetchError("VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set")
        self.base = url.rstrip("/") + "/rest/v1"
        self.key = key

    def _call(self, method: str, path: str, *, body=None, prefer: str | None = None):
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        }
        if prefer:
            headers["Prefer"] = prefer
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")[:400]
            raise FetchError(f"Supabase {method} {path.split('?')[0]}: HTTP {exc.code} {detail}") from None
        except urllib.error.URLError as exc:
            raise FetchError(f"Supabase {method} {path.split('?')[0]}: {exc.reason}") from None
        return json.loads(raw) if raw else None

    def select(self, table: str, **filters: str) -> list[dict]:
        return self._call("GET", f"/{table}?{urllib.parse.urlencode(filters)}")

    def insert(self, table: str, rows, *, returning: bool = False):
        return self._call("POST", f"/{table}", body=rows,
                          prefer="return=representation" if returning else "return=minimal")

    def update(self, table: str, values: dict, **filters: str) -> None:
        self._call("PATCH", f"/{table}?{urllib.parse.urlencode(filters)}", body=values, prefer="return=minimal")

    def delete(self, table: str, **filters: str) -> None:
        self._call("DELETE", f"/{table}?{urllib.parse.urlencode(filters)}", prefer="return=minimal")

    def rpc(self, fn: str, **args):
        return self._call("POST", f"/rpc/{fn}", body=args)
