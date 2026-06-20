#!/usr/bin/env bash
# ============================================================================
# Bring up a LOCAL test Supabase, apply ALL migrations + the e2e seed, and
# print the env you need to run the live suite. Safe: touches only the local
# stack, never production.
#
# Requires: Docker with image-registry egress (public.ecr.aws + its CDN).
# See docs/e2e-live-testing.md if image pulls are blocked.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Starting local Supabase (pulls images on first run)…"
npx supabase start

echo "==> Applying migrations + seed (supabase db reset)…"
npx supabase db reset

echo "==> Local Supabase status:"
npx supabase status

cat <<'EOF'

============================================================================
Next: export env and run the live suite. Grab the values from the status
output above (API URL, anon key, service_role key):

  export E2E_LIVE=1
  export SUPABASE_URL="http://127.0.0.1:54321"
  export SUPABASE_ANON_KEY="<anon key from status>"
  export SUPABASE_SERVICE_ROLE_KEY="<service_role key from status>"

  npm run test:e2e:live

To also test edge functions, in a second terminal:
  npx supabase functions serve
Then:
  export E2E_EDGE=1 && npm run test:e2e:live
============================================================================
EOF
