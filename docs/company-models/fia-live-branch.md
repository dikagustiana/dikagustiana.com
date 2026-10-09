# Branch `fia-live`

Standing preview branch for the published-only Finance in Action viewer (PRD "FSRE publish path" §6.3 A).

Vercel preview deployments of this branch build with `VITE_FIA_LIVE=true` and `VITE_FIA_PREVIEW=false`
(branch-scoped variables; every other preview branch keeps `VITE_FIA_PREVIEW=true` for the Kawasan Industri
world). The two flags cannot be built together (`scripts/assert-no-synthetic.mjs`), which is why this branch exists.

What a deployment of this branch shows at `/finance/finance-in-action`:
- before the first package is approved in the Personal OS partner room: the slate companies as planned and the
  sentence that the published models are not available yet;
- after: the published packages read from `fsre_published.model_packages` on project `asypkbkiebjvvpimewfp`.

Keep the branch at `main`: `git checkout fia-live && git merge --ff-only main && git push`. Production gets
`VITE_FIA_LIVE=true` only after the first real package is approved (decision O3).
