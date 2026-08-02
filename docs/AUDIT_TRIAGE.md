# Audit triage — eighteen findings, ranked

2026-08-02. Base `main` @ `03662e8`. Eighteen findings from an external audit, plus six
unnumbered hygiene items. The order below is mine, not the auditor's.

## The criterion

**Ranked by expected loss of the work the owner is about to create — a defect that can
destroy or silently hide essays outranks everything else, weighted by irreversibility,
then by cost-to-fix.** I agree with the owner's framing and would sharpen it one step:
on free-tier Supabase there is no PITR and no automated backup, so "destroys" here means
*gone*, not *restorable*. An auditor's severity scale assumes recoverability and other
users; neither exists here. One consequence I acted on: irreversible-loss items outrank
CI, but CI outranks every merely-wrong behaviour, because it is the only item that keeps
the rest fixed.

## Corrections to the audit and the briefing — checked, not assumed

- **Lint fails with 2 errors, not 1**: `useBooks.ts:83` (useless escape) and
  `pasteFromWord.ts:206` (irregular whitespace — a literal NBSP that is load-bearing;
  it strips Word's `&nbsp;` spacers and must become ` `, not be deleted).
- **`/finance/finance-in-action` is a real route** (`App.tsx:126`) — that nav item is
  fine. The broken two are `/finance/planning-forecasting` and
  `/finance/financial-analytics` (DB slugs `planning`, `analytics`). Confirmed against
  `finance_sections`: five slugs — `fundamentals`, `strategic-finance`, `planning`,
  `analytics`, `capital-allocation`.
- **`capital-allocation` has 0 modules and 0 essays.** Adding it to the nav would
  advertise an empty track. Deliberately left out of the nav until it has content;
  recorded in DECISIONS.
- **#1 is worse than "writes `published`, never `status`".** `EssayDialog` also writes
  `content` without touching `content_json`. On an essay that has both, an edit through
  that dialog is *invisible* — `ArticleBody` prefers the stale JSON. Same class as the
  round-trip divergence bug. The fix must cover both.
- **#16–18 premature, re-verified**: `finance_models` 0 rows, `fsli_sections` 0 rows.
- **Framework migration: agree with the owner — no.** Two published essays do not
  justify a rewrite. The proportionate versions (sitemap, robots, real 404 signal,
  absolute OG images) are ranked below as #14.
- `essays.status` enum already contains `archived` — soft delete needs **no new column**.

## The ranking

| Rank | # | Finding | Why here | Size |
|---|---|---|---|---|
| 1 | 2 | Hard delete cascades revisions | One misclick + `confirm()` erases an essay **and its entire history**, unrecoverable on a tier with no PITR. The single highest expected-loss item. Fix: archive instead of delete (`status='archived'` exists), FK → `RESTRICT` so even a SQL hard delete cannot silently take the history with it. | hours |
| 2 | 1 | Dual publication state | `published=true, status='draft'` is reachable through a live second editor and is publicly readable — work the owner believes private, exposed; or published work hidden. Plus the `content`-without-`content_json` write (above), which makes edits vanish. Fix: DB trigger keeps the two columns coherent for every writer; dialog fixed client-side too. | hours |
| 3 | — | No CI + no automated backup | Every check in this project's history ran only when an agent remembered. CI (lint, typecheck, test, build) stops the fixes below from silently regressing; a scheduled backup workflow is the only mitigation of the no-PITR risk. Requires first fixing the 2 lint errors and the timezone-dependent test so it is born green. Backup needs a repo secret only the owner can set — shipped and marked blocked on that. | hours |
| 4 | 7 | Finance nav slugs broken | Confirmed. The main nav hides two whole tracks — readers clicking "Planning & Forecasting" get an empty index for a track that does not exist. Hides work, trivially fixable, plus the test the route sweep lacked: a nav **click-through**. | ~1h |
| 5 | 8 | WriterEditor duplicates the URL builder | Confirmed at `WriterEditor.tsx:541-544`, and its fallback `/finance/${slug}` is not even a route shape — the owner's own "view live" loop can point at a wrong page, hiding the essay from their verification. Fold into rank 4; the canonical builder already exists. | minutes |
| 6 | 4 | New essays stay at `/new` after insert | If true, the next save from that URL can insert again — duplicate essays and split work. Verify, then navigate to the slug route after create. | ~1h |
| 7 | 5 | No optimistic concurrency | One owner, but two tabs or two devices during months of writing is normal. A stale tab's autosave silently overwrites newer work — a destroyer, just needing two tabs instead of one click. Guard: compare `updated_at` on write; loud stop on conflict. | hours |
| 8 | 6 | Supabase errors render as 404 | A transient error shows "not found" — the owner believes an essay is gone (panic, or worse: recreates it, forking the work). Verify, then distinguish error-with-retry from genuinely absent, on the pages readers and the owner actually hit. | hours |
| 9 | 15 | Positioning / hero copy | The owner is right to pull it up: "Let's be insane and delusional" in front of scholarship reviewers costs more than most technical findings, and it is an hour of copy. Three identities collapse to one: the person. | ~1h |
| 10 | 12 | Unsafe URLs through persisted JSON / FigureBlock / References | Stored-XSS shape (`javascript:` hrefs bypass `sanitizeHtml` in the JSON render path). Only the admin writes today, which caps severity — but Word paste imports third-party hrefs, so it is not purely hypothetical. One `safeHref` helper, applied at the render sites, plus tests. | hours |
| 11 | 14 | No sitemap, soft 404s, SPA SEO | Proportionate versions only: sitemap + robots, absolute OG image, honest 404 signalling. Matters for the credibility audience, but only two essays exist to index — after the data-loss items, not before. No framework migration. | hours |
| 12 | — | `strict: false` | Real, but flipping it wholesale produces an untriaged error mountain and a revert. Incremental: measure per-flag error counts, enable the zero/low-count flags now, report the counts for the rest so the next session starts from numbers. | hours (partial) |
| 13 | 9 | Non-finance canonical redirects | Duplicate URLs for the same essay. Wrong, but hides nothing and destroys nothing with two published essays. | hours |
| 14 | 10 | React Query cache survives logout | A one-user site: there is no second person to see the cached data. Verify cheaply; fix is `queryClient.clear()` on signout. | minutes–1h |
| 15 | 11 | Auth role-resolution race | Worst case: admin UI briefly denies/flickers. Annoyance, not loss. Verify if reached. | ~1h |
| 16 | 3 | Audit log client-side, skippable | With one admin, the audit log audits the auditor. The archive flow (rank 1) removes the destructive action it existed to record. Server-side trigger logging is the real fix *when a second admin exists*. Decision, not code, today. | decision |
| 17 | 13 | CSP report-only, no endpoint | A header that reports to nowhere is decoration; enforcing a CSP on this SPA risks breaking it for no current attacker model. Decide and document; enforce later behind testing. | decision |
| 18 | 16/17/18 | FSLI publish flow, text-typed financials, model versioning | All three govern tables with **zero rows** and no insert path (`ModelAdminPanel` unreachable by construction — verified again today). Designing governance for unwritable tables is premature. Recorded so they resurface the day an insert path is built. | decision |

**Unnumbered hygiene, slotted where it earns it:** the 2 lint errors and the timezone
test are prerequisites of rank 3 (CI must be born green). Dependency vulnerabilities:
assess `npm audit` during rank 3; majors deferred with a note. The 1.14MB hero texture:
compress if a safe tool is at hand (it is on the first page a reviewer sees); else
record. Editor chunk size and coverage %: recorded, not this session.

## What this session will do, and where I expect to stop

Ranks 1–6 completed with gates. Rank 7 (concurrency) attempted; it touches the
gate-verified autosave machinery, so it gets a strict time-box and an honest
CODED-NOT-VERIFIED or not-reached mark if the box expires. Ranks 8–10 if the session
allows. Ranks 11+ as decisions/notes only. Every completed item lands in
`docs/GATE_LEDGER.md` with its measurement; the tail lands here and in DECISIONS as
explicitly not-reached.

End-of-session invariants to measure, not assume: `fa-07-01` at 21,946 chars / 81
blocks / md5 `b36b8ba5…`; zero tables without RLS; any probe identities and rows
removed.
