#!/usr/bin/env bash
# report_run.sh start|end — reports one Hermes run to the site's agent_run_report RPC
# (PROGRESS-PRD.md §2.4, §5; the RPC replaces the PRD's edge function, see the site's DECISIONS.md).
# env: RUN_ID AGENT TASK [STATUS TOKENS_IN TOKENS_OUT COST_USD ERROR]
# Endpoint and token come from the environment or ~/.config/progress/report.env (mode 600):
#   AGENT_REPORT_URL, AGENT_REPORT_APIKEY (the site's publishable key), AGENT_REPORT_TOKEN.
# Never put client data in TASK. Reporting never fails the caller: errors go to stderr, exit 0.
set -uo pipefail

env_file="${AGENT_REPORT_ENV:-$HOME/.config/progress/report.env}"
if [ -z "${AGENT_REPORT_TOKEN:-}" ] && [ -r "$env_file" ]; then
  set -a; . "$env_file"; set +a
fi
: "${AGENT_REPORT_URL:?AGENT_REPORT_URL not set}" "${AGENT_REPORT_APIKEY:?}" "${AGENT_REPORT_TOKEN:?}"

now=$(date -u +%FT%TZ)
case "${1:-}" in
  start) body=$(jq -n --arg id "$RUN_ID" --arg a "$AGENT" --arg t "$TASK" --arg s "$now" \
          '{run: {id:$id, agent:$a, task:$t, status:"running", started_at:$s}}') ;;
  end)   body=$(jq -n --arg id "$RUN_ID" --arg a "$AGENT" --arg t "$TASK" --arg st "${STATUS:-done}" \
          --arg e "$now" --argjson ti "${TOKENS_IN:-0}" --argjson to "${TOKENS_OUT:-0}" \
          --arg c "${COST_USD:-}" --arg err "${ERROR:-}" \
          '{run: ({id:$id, agent:$a, task:$t, status:$st, ended_at:$e, tokens_in:$ti, tokens_out:$to,
                   error:(if $err == "" then null else $err end)}
                  + (if $c == "" then {} else {cost_usd: ($c | tonumber)} end))}') ;;
  *) echo "usage: report_run.sh start|end" >&2; exit 2 ;;
esac || { echo "report_run: could not build the body" >&2; exit 0; }

curl -fsS --max-time 15 -X POST "$AGENT_REPORT_URL" \
     -H "apikey: $AGENT_REPORT_APIKEY" -H "x-progress-token: $AGENT_REPORT_TOKEN" \
     -H "Content-Type: application/json" -d "$body" >/dev/null \
  || echo "report_run: $1 report for $RUN_ID failed (run continues)" >&2
exit 0
