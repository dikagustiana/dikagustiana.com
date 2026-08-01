# ROUTE VERIFICATION

Every declared route in `src/App.tsx`, exercised in a real browser against the **live**
database. Generated from a sweep, not from reading code.

## Status: PARTIAL — the identity dimension is NOT verified

Read this before using the table. The sweep runs three identities (anonymous, authenticated
non-admin, admin), but in the run that produced this file **all three passes returned
byte-identical results on every admin route** (507 characters on `/admin/dashboard`,
`/admin/content`, `/admin/audit-log`, `/admin/writer/:section/list`, `/settings`). Identical
output across identities means the harness collected no signal from that dimension, so the
non-admin and admin columns are omitted rather than filled with numbers that would look like
evidence.

`auth.users.last_sign_in_at` confirms both accounts *did* authenticate during the run
(09:29:14 admin, 09:27:20 non-admin), so the fault is the harness's post-login readiness
check, not the credentials. **Fix before re-running:** inject the Supabase session into
`localStorage` directly instead of driving the login form, and assert an admin-only element is
present before starting the pass.

The **anonymous** column and the **375px** column are valid and are reported below.

## Summary

| | |
|---|---|
| Routes swept | **65** (65 `<Route path>` entries; the `*` catch-all is excluded) |
| Anonymous defects | **0** |
| Horizontal scroll at 375px | **5** |
| Non-admin / admin columns | **NOT TESTED** — see above |

### Defects found and fixed during this sweep

Four routes fired PostgREST **406** responses behind pages that rendered fine — precisely the
swallowed-error class the sweep exists to catch. `.single()` answers 406 on zero rows, and
zero rows is normal here: `books_uploads` and `finance_models` are both empty, and a slug that
does not exist is a not-found for the page to render.

| route | was | now |
|---|---|---|
| `/finance/finance-in-action/:modelSlug` | 406 on `finance_models` | clean |
| `/finance-101/budgeting` | 406 on `finance_settings` | clean |
| `/critical-thinking-research/:phase/:essayId` | 406 on `essays` | clean |
| `/books/:category/:bookId/read` | 406 on `books_uploads` | clean |

Converted `.single()` → `.maybeSingle()` in `useFinance`, `useBooks`, `useFinanceModels`,
`useEssays`, `useFsliPages`, `useSections`, `useCategories`. Re-measured: zero
401/403/406/500 on all four.

**A harness bug worth recording:** the first run also flagged four essay routes as
`DEFECT: blank`. They were not. The improved `NotFound` page is ~110 characters, and the
blank-screen threshold (<120) was evaluated *before* the 404 check. The classifier now tests
`is404` first. A measuring instrument that reports working software as broken is as costly as
one that reports broken software as working.

### Horizontal scroll at 375px

- `/accounting/consolidation/:topic` — ⚠ h-scroll 394px
- `/finance/:track/:moduleSlug` — ⚠ h-scroll 387px
- `/green-transition/tracker/archive` — ⚠ h-scroll 377px
- `/books/:category` — ⚠ h-scroll 388px
- `/books/:category/:bookId/read` — ⚠ h-scroll 419px

These are the concrete targets for the Section 3 responsive work.

## Full table

| route | component | tables | intended | anon | 375px | verdict |
|---|---|---|---|---|---|---|
| `/` | Index | essays | public | OK (1934) | no h-scroll | OK |
| `/index` | Navigate | — | public | OK (1934) | no h-scroll | OK |
| `/about` | About | — | public | OK (2033) | no h-scroll | OK |
| `/auth` | Auth | — | public (anon) | OK (507) | no h-scroll | OK |
| `/accounting` | Accounting | — | public | OK (3089) | no h-scroll | OK |
| `/accounting/fsli` | FsliList | fsli_* | public | OK (3053) | no h-scroll | OK |
| `/accounting/fsli/:slug` | FsliDetail | essays, fsli_* | public | OK (3611) | no h-scroll | OK |
| `/accounting/consolidated-reporting` | ConsolidatedReporting | — | public | OK (5007) | no h-scroll | OK |
| `/accounting/statutory-reporting` | StatutoryReporting | — | public | OK (3294) | no h-scroll | OK |
| `/accounting/consolidation/:topic` | ConsolidationDetail | essays | public | OK (665) | ⚠ h-scroll 394px | OK |
| `/finance` | FinanceLanding | finance_* | public | OK (1179) | no h-scroll | OK |
| `/finance/finance-in-motion` | FinanceInMotion | — | public | OK (6308) | no h-scroll | OK |
| `/finance/capital-in-motion/:conditionSlug` | CapitalConditionDetail | — | public | OK (482) | no h-scroll | OK |
| `/finance/finance-in-action` | FinanceInActionIndex | finance_* | public | OK (642) | no h-scroll | OK |
| `/finance/finance-in-action/:modelSlug` | FinanceModelDetail | finance_* | public | OK (494) | no h-scroll | OK |
| `/finance/:track` | FinanceTrackIndex | finance_* | public | OK (1290) | no h-scroll | OK |
| `/finance/:track/:moduleSlug` | FinanceModulePage | essays, finance_* | public | OK (1018) | ⚠ h-scroll 387px | OK |
| `/finance/:track/:moduleSlug/:essaySlug` | FinanceEssayPage | essays, finance_* | public | OK (23428) | no h-scroll | OK |
| `/finance-101` | Navigate | — | public | OK (1179) | no h-scroll | OK |
| `/finance-101/financial-analytics` | Navigate | — | public | OK (1290) | no h-scroll | OK |
| `/finance-101/financial-analytics/:topic` | Navigate | — | public | OK (1290) | no h-scroll | OK |
| `/finance-101/financial-planning-forecasting` | Navigate | — | public | OK (1466) | no h-scroll | OK |
| `/finance-101/budgeting` | Navigate | — | public | OK (535) | no h-scroll | OK |
| `/finance-101/cfa-prep` | Navigate | — | public | OK (3381) | no h-scroll | OK |
| `/finance-101/essays/:slug` | FinanceEssayLegacyRedirect | — | public | OK (23428) | no h-scroll | OK |
| `/essays/:slug` | EssayBySlug | essays | public | OK (2420) | no h-scroll | OK |
| `/finance-workspace` | RequireAdmin | — | public | OK (507) | no h-scroll | OK |
| `/green-transition` | GreenTransition | — | public | OK (2441) | no h-scroll | OK |
| `/green-transition/climate-finance` | ClimateFinance | essays | public | OK (1662) | no h-scroll | OK |
| `/green-transition/climate-finance/:slug` | GreenTransitionEssayPage | essays | public | 404 | no h-scroll | OK — 404 by design |
| `/green-transition/tracker` | GreenTransitionTracker | — | public | OK (2336) | no h-scroll | OK |
| `/green-transition/tracker/archive` | GreenTransitionTrackerArchive | — | public | OK (1483) | ⚠ h-scroll 377px | OK |
| `/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug` | GreenTransitionTrackerEssay | — | public | OK (629) | no h-scroll | OK |
| `/green-transition/tracker/:issueSlug` | GreenTransitionTrackerDetail | — | public | OK (642) | no h-scroll | OK |
| `/green-transition/now` | GreenTransitionPhase | categories, essays | public | OK (652) | no h-scroll | OK |
| `/green-transition/gaps` | GreenTransitionPhase | categories, essays | public | OK (652) | no h-scroll | OK |
| `/green-transition/future` | GreenTransitionPhase | categories, essays | public | OK (652) | no h-scroll | OK |
| `/green-transition/:phase` | GreenTransitionPhase | categories, essays | public | OK (652) | no h-scroll | OK |
| `/green-transition/:phase/:slug` | GreenTransitionEssayPage | essays | public | 404 | no h-scroll | OK — 404 by design |
| `/development-finance` | DevelopmentFinance | essays | public | OK (1247) | no h-scroll | OK |
| `/development-finance/:phase` | DevelopmentFinancePhase | essays | public | OK (552) | no h-scroll | OK |
| `/development-finance/:phase/:slug` | DevelopmentFinanceEssayPage | essays | public | 404 | no h-scroll | OK — 404 by design |
| `/masyarakat-baru` | Navigate | — | public | OK (1811) | no h-scroll | OK |
| `/masyarakat-baru/english-ielts` | Navigate | — | public | OK (1733) | no h-scroll | OK |
| `/masyarakat-baru/books-academia` | Navigate | — | public | OK (765) | no h-scroll | OK |
| `/masyarakat-baru/critical-thinking-research` | Navigate | — | public | OK (1811) | no h-scroll | OK |
| `/critical-thinking-research` | CriticalThinkingResearch | — | public | OK (1811) | no h-scroll | OK |
| `/critical-thinking-research/:phase` | CriticalThinkingPhase | essays | public | OK (647) | no h-scroll | OK |
| `/critical-thinking-research/:phase/:essayId` | CriticalThinkingEssay | essays | public | OK (908) | no h-scroll | OK |
| `/books-academia` | BooksAcademia | books_uploads | public | OK (765) | no h-scroll | OK |
| `/books/categories` | BooksCategories | — | public | OK (671) | no h-scroll | OK |
| `/books/:category` | BooksList | books_uploads | public | OK (568) | ⚠ h-scroll 388px | OK |
| `/books/:category/:bookId/read` | BookReader | books, books_uploads | public | OK (579) | ⚠ h-scroll 419px | OK |
| `/english-ielts` | EnglishIelts | — | public | OK (1733) | no h-scroll | OK |
| `/settings` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/debug/auth` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/dashboard` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/content` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/audit-log` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/writer/:id` | — | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/writer/:section/list` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/writer/:section/:slug` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/admin/content/:id` | RequireAdmin | — | admin | OK (507) | no h-scroll | OK — renders (gating NOT verified) |
| `/the-next-big-thing` | TheNextBigThing | — | public | OK (1107) | no h-scroll | OK |
| `/the-next-big-thing/:slug` | NextBigThingEssayPage | essays | public | 404 | no h-scroll | OK — 404 by design |

## Method

- Desktop 1280×900; mobile 375×812.
- Parameterised routes filled with real values from the live database (`analytics` /
  `t4-m07` / `fa-07-01`, `cash-and-cash-equivalents`, …) so each route is exercised against
  data that exists rather than a placeholder.
- Runtime, not just render: console errors, failed requests, and any 401/403/406/500 are
  recorded. Raw PostgREST text reaching the DOM is always a defect.
- Empty state vs break: `books_uploads` and `finance_models` have **zero rows**, so those
  pages are *expected* to be empty. An intentional empty state passes; a blank screen, stuck
  spinner, error boundary or thrown exception is a defect.

## Known, not a break

`/finance/wrongtrack/wrongmodule/fa-07-01` renders the essay: the page looks up by
globally-unique slug and never checks that track and module match. Duplicate URL for the same
content — a canonicalisation issue.
