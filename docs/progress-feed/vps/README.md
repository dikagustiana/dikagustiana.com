# Hermes run reporting on the VPS (phase 19)

Installed on 25 Oct 2026 for user `hermesagent` on the Biznet Gio VPS (139.190.99.54).

| Path on the VPS | Mode | What |
|---|---|---|
| `~/hermes/hooks/report_run.sh` | 700 | `start` / `end` reporter (PRD §5), posts to `rpc/agent_run_report` |
| `~/hermes/bin/hermes-run` | 700 | Wrapper: start → command → end, tokens from the stream-json `result` line |
| `~/hermes/runs/<run-id>.out` | — | The command's stdout, one file per run |
| `~/.config/progress/report.env` | 600 | `AGENT_REPORT_URL`, `AGENT_REPORT_APIKEY` (publishable key), `AGENT_REPORT_TOKEN` |

No Supabase secret, service-role key or feed token is on the VPS.

## Why a wrapper

The FSRE dispatcher (`/opt/fsre`, `fsre-run`, `fsre-agent@.service`) is not provisioned on the VPS
yet. Runs today are manual `hermes -p fsre-sandbox chat …` calls. Hermes gateway hooks
(`agent:start`/`agent:end`) fire only for gateway chat turns and carry no token counts. The
wrapper covers every run that is launched through it, and the one-shot `--format stream-json`
result line gives the real input and output token counts.

```sh
~/hermes/bin/hermes-run "FSRE · sandbox" "fs-intake — UNVR FY2025" -- \
  ~/.local/bin/hermes -p fsre-sandbox chat --query-file brief.txt --format stream-json
```

Without `--format stream-json` the run is still reported, with 0 tokens (the island shows "—").
`TASK` is a short label only; never client data.

## When the dispatcher is provisioned

In `fsre-run`, wrap the `hermes … chat` line the same way, or call the hook around it:
`RUN_ID=$run_id AGENT=$agent TASK=… report_run.sh start` before and `STATUS=… TOKENS_IN=… end`
after, reading tokens from `$run_dir/out.jsonl`'s `result` line. The `fsre` unit then needs
`EnvironmentFile=` pointing at a copy of `report.env` readable by `fsre` only.

## Behaviour on failure

- Non-zero exit or a `result` line with `exit_code ≠ 0` → `failed`, error = the result's `error`
  (first line, 300 chars) or `exit <code>`.
- Ctrl-C / SIGTERM / SIGHUP → `failed` with `exit 130/143`. SIGKILL or a VPS crash leaves the run
  `running`; the island shows it as stale after 6 h.
- A failed report never fails the run (15 s curl timeout, message on stderr).

## Verified 25 Oct 2026

1. `fsre-sandbox` default model `upstage/solar-pro4:free` → run reported **failed** with
   "HTTP 404: This model's free period has ended…" (the profile's model needs changing; not done here).
2. Same task with `-m deepseek/deepseek-v4-flash-0731` → **done**, tokens 13.656 in / 4 out.
3. `sleep 30` killed with SIGTERM → **failed**, `exit 143` (row deleted afterwards).
