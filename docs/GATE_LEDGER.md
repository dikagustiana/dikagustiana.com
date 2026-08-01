# GATE LEDGER

The primary artefact for the gated-completion mandate. One row per gate.

**States**

- `PASSED` — observed on running software, with the measurement recorded below.
- `CODED-NOT-VERIFIED` — the code exists; the gate was not run. Honest and acceptable; a
  session may end here. Pick it up cleanly next time.
- `BLOCKED` — with the specific reason and what would unblock it.

**A gate is never passed by** `tsc --noEmit`, a green build, passing unit tests, code that
looks correct, or reasoning that it should work. All five were true of `getEssayLink` while
it returned a route that does not exist.

| # | Gate | State | Evidence |
|---|------|-------|----------|
| 0 | `main` contains Phase A+B; `_pending` drop still unapplied | **PASSED** | PR #5 merged as `1d6c7f4`. Read `src/lib/presentation.ts` back from `refs/heads/main` via the GitHub API — file present, blob `1641e99`. Live DB `information_schema.columns` for `public.essays` returns all four of `manager_fields`, `economist_fields`, `educator_fields`, `coach_fields` plus `presentation` → drop not applied. |
| 0b | Two merged branches deleted | **BLOCKED** | `claude/dikagustiana-supabase-rebuild-ioiyd1` and `claude/dikagustiana-supabase-phase-2-w564rz` both have 0 unique commits vs `main` (`git rev-list --count`), so deletion is safe. The git proxy rejects delete-pushes (`send-pack: unexpected disconnect`, 3 attempts) and the GitHub MCP exposes no delete-branch tool. **Unblocked by:** deleting both in the GitHub UI. `archive/pre-rebuild-history` deliberately untouched (417 unique commits, only copy of pre-rebuild history). |
| 1a | Every homepage/About card resolves; no dead `/essays/` links | **PASSED** | Browser sweep (`gate1a.mjs`) against the live DB. Collected all internal `<a href>` on `/` (24) and `/about` (16), deduped to 14, navigated to each and classified the *rendered* page (an SPA always returns HTTP 200, so the catch-all's NotFound render is the real signal). **0 of 16 targets rendered 404.** Key observations: the homepage card now emits `/finance/analytics/t4-m07/fa-07-01` — previously `/essays/fa-07-01`, which matched no route; `/essays/fa-07-01` **redirects** to the canonical URL (final path differs, 23,428 chars rendered); `/essays/site-rebuild-note` now renders (2,420 chars) where it previously had no working URL anywhere. About's essay section legitimately renders nothing — `is_selected` is true on 0 rows (verified in SQL), an intentional empty state, not a break. |
| 1b | Curriculum index shows truthful planned-vs-published; anon still sees 0 of 160 drafts | _pending_ | |
| 1c | Staged drop migration rehearsed on scratch DB; admin preview still renders; then applied live | _pending_ | |
| 1d | List-view payload measured in bytes, before and after | _pending_ | |
| 1e | View-live button opens the correct canonical URL for `fa-07-01` | _pending_ | |
| 1f | Wrong essay-shaped URL produces the improved 404 | _pending_ | |
| 2 | Both reports in `DECISIONS.md`; takeaways finding targets `WriterValidation.tsx` | _pending_ | |
| 3 | Font computed (not fallback); 5 pages at 375px with no h-scroll; 44px tap targets; `ui-audit` recorded | _pending_ | |
| 4 | All 68 routes have a verdict; zero `NOT TESTED` | _pending_ | |
| 5 | Image round-trips to anon read; non-admin refused; all block types survive; preview == published; one authoring route; no duplicate-extension warning | _pending_ | |
| 6 | 3,000-word reload recovery re-observed; dump script run and inspected | _pending_ | |
| 7 | Each of the five never-checked module groups has a verdict | _pending_ | |

## Notes

**Section 0 housekeeping.** `@tiptap/html` confirmed absent from both `package.json` and
`package-lock.json` (0 occurrences in each) — the earlier ambiguity is closed.
