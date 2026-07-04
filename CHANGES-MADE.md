# CHANGES-MADE

Human-readable narrative of meaningful decisions made under the autonomy contract,
grouped by area. Each entry includes a one-line rationale. This is a record, not a
request for input.

> Context: this codebase has already been through one or more thorough audit passes
> (`docs/UPGRADE_REPORT.md`). Baseline on entry was healthy: build green, 0 type
> errors, 0 lint errors, 145 unit tests passing. Work this pass therefore targets
> the concrete remaining items rather than re-doing settled work.

---

## Security — RLS (database)

- **Re-granted `has_role()` EXECUTE to anon/authenticated** (`20260627190000`).
  The previous pass tried to lock down `has_role` from direct RPC by revoking
  EXECUTE, but that revoke breaks every RLS policy that calls the function (I
  reproduced the exact `permission denied for function has_role` error in a
  local Postgres). Re-granting is the smallest change that restores a working
  admin surface. _Rationale:_ a live, deployable site beats an unenforceable
  hardening attempt; the real fix (inline `user_roles` EXISTS checks in each
  policy) is documented as a roadmap item.
- **Re-gated essay SELECT by `published`** (`20260627190100`). Reversed the
  `USING (true)` policy that exposed drafts via the public API. Used a role-split
  (anon vs authenticated) so anonymous reads never depend on `has_role`'s grant
  state. _Rationale:_ RLS, not the app, is the trust boundary; the public app
  already only reads published rows, so this is a pure leak-closure.

## Security — Edge functions

- **Required authentication on the two bank-statement parsers.** They were
  unauthenticated proxies to a paid AI gateway handling financial data. Added
  the same `getUser()` guard the codebase already uses elsewhere, plus payload
  caps. _Rationale:_ defense against cost abuse and PII exposure with zero impact
  on the (already authenticated) real call site.

## Dependencies

- **Ran `npm audit fix` (non-breaking only).** Patched all production-tree CVEs;
  left the 6 dev-toolchain advisories that need a breaking Vite/Vitest major.
  _Rationale:_ ship the safe security wins now; major bumps need their own
  verified PR.

## Accessibility

- **Removed duplicate `<main>` landmarks** on 19 pages that nested their own
  `<main>` inside `PageLayout`'s. _Rationale:_ one main landmark per page is a
  WCAG requirement and makes the existing skip-link land correctly.
