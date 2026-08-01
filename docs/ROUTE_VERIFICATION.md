# ROUTE VERIFICATION

Every declared route in `src/App.tsx`, exercised in a real browser against the **live**
database as three identities at two viewports. Generated from a sweep, not from reading code.

## Summary

| | |
|---|---|
| Routes swept | **65** of **66** `<Route path>` entries — the 66th is the `path="*"` catch-all, deliberately excluded from the sweep and verified separately (it renders the improved `NotFound`, exercised end-to-end by GATE 1f) |
| Defects | **0** |
| Access leaks | **0** |
| Horizontal scroll at 375px | **0** |
| NOT TESTED | **0** |

Reconciliation of every count that has been quoted: `grep -c '<Route'` says **68** because it
also matches `<Routes>` and `<RouteFallback`; there are **66** `<Route path>` entries; **65**
are sweepable pages and the 66th is the `*` catch-all. The mandate's original 68 predates the
`/admin/council` removal and used the loose grep.

## Identity gating — verified by separation, not assumed

| route | anon | non-admin | admin |
|---|---|---|---|
| `/admin/content` | 507 | 1,941 | **39,759** |
| `/admin/writer/:section/:slug` | 507 | 1,941 | **44,713** |
| `/admin/writer/:section/list` | 507 | 1,941 | **37,297** |

Anonymous visitors are bounced before the chrome renders; the non-admin lands on the shared
page with a `VIEWER` badge and no admin content; only the admin gets the `ADMIN` badge and the
data. Non-admin output is identical across every admin route because `RequireAdmin` redirects
it to the same place every time — the correct behaviour.

## Three harness defects found and fixed

Recording these because a measuring instrument that lies costs as much as broken software, and
all three produced confident, wrong answers.

1. **Login "success" without a session.** The helper returned `!url.includes('/auth')`, true
   even when no session existed, so a failed login yielded a whole pass of anonymous results
   labelled `admin` — and every admin route came back byte-identical across identities. It now
   asserts the token is in `localStorage`, asserts admin content renders, and **aborts**
   rather than emit mislabelled data.
2. **Blank check before the 404 check.** The improved `NotFound` page is ~110 characters and
   the blank threshold was <120, so four *working* 404s were reported as defects.
3. **A 1.5s probe wait.** `/admin/writer/:id` loads an essay and boots TipTap in ~4s and was
   reported as a blank screen; measured directly it renders 21,745 characters with zero
   console errors. The probe now re-checks an apparent blank for up to 6 more seconds.

## Four product defects found and fixed

Routes firing PostgREST **406s behind pages that rendered fine** — the swallowed-error class
this sweep exists to catch. `.single()` answers 406 on zero rows, and zero rows is normal:
`books_uploads` and `finance_models` are both empty, and a slug that does not exist is a
not-found for the page to render.

| route | was |
|---|---|
| `/finance/finance-in-action/:modelSlug` | 406 on `finance_models` |
| `/finance-101/budgeting` | 406 on `finance_settings` |
| `/critical-thinking-research/:phase/:essayId` | 406 on `essays` |
| `/books/:category/:bookId/read` | 406 on `books_uploads` |

Converted to `.maybeSingle()` across seven query modules.

## Mobile

**0 routes scroll horizontally at 375px.** Six did before: the breadcrumb trail did not wrap
(five routes) and the writer-list header row did not wrap. Two root causes, not six symptoms.

## Full table

| route | component | tables | intended | anon | non-admin | admin | 375px | verdict |
|---|---|---|---|---|---|---|---|---|
| `/` | Index | essays | public | OK (1934) | OK (1941) | OK (1974) | ok | OK |
| `/index` | Navigate | — | public | OK (1934) | OK (1941) | OK (1974) | ok | OK |
| `/about` | About | — | public | OK (2033) | OK (2040) | OK (2073) | ok | OK |
| `/auth` | Auth | — | public (anon) | OK (507) | OK (1941) | OK (1974) | ok | OK |
| `/accounting` | Accounting | — | public | OK (3089) | OK (3096) | OK (3129) | ok | OK |
| `/accounting/fsli` | FsliList | fsli_* | public | OK (3053) | OK (3060) | OK (3093) | ok | OK |
| `/accounting/fsli/:slug` | FsliDetail | essays, fsli_* | public | OK (3611) | OK (3618) | OK (3814) | ok | OK |
| `/accounting/consolidated-reporting` | ConsolidatedReporting | — | public | OK (5007) | OK (5014) | OK (5047) | ok | OK |
| `/accounting/statutory-reporting` | StatutoryReporting | — | public | OK (3294) | OK (3301) | OK (3334) | ok | OK |
| `/accounting/consolidation/:topic` | ConsolidationDetail | essays | public | OK (665) | OK (672) | OK (705) | ok | OK |
| `/finance` | FinanceLanding | finance_* | public | OK (1179) | OK (1186) | OK (1219) | ok | OK |
| `/finance/finance-in-motion` | FinanceInMotion | — | public | OK (6308) | OK (6315) | OK (6348) | ok | OK |
| `/finance/capital-in-motion/:conditionSlug` | CapitalConditionDetail | — | public | OK (482) | OK (489) | OK (522) | ok | OK |
| `/finance/finance-in-action` | FinanceInActionIndex | finance_* | public | OK (642) | OK (649) | OK (682) | ok | OK |
| `/finance/finance-in-action/:modelSlug` | FinanceModelDetail | finance_* | public | OK (494) | OK (501) | OK (534) | ok | OK |
| `/finance/:track` | FinanceTrackIndex | finance_* | public | OK (1364) | OK (1371) | OK (1404) | ok | OK |
| `/finance/:track/:moduleSlug` | FinanceModulePage | essays, finance_* | public | OK (1018) | OK (1025) | OK (1437) | ok | OK |
| `/finance/:track/:moduleSlug/:essaySlug` | FinanceEssayPage | essays, finance_* | public | OK (454) | OK (23435) | OK (23468) | ok | OK |
| `/finance-101` | Navigate | — | public | OK (1179) | OK (1186) | OK (1219) | ok | OK |
| `/finance-101/financial-analytics` | Navigate | — | public | OK (634) | OK (1371) | OK (1404) | ok | OK |
| `/finance-101/financial-analytics/:topic` | Navigate | — | public | OK (637) | OK (1371) | OK (1404) | ok | OK |
| `/finance-101/financial-planning-forecasting` | Navigate | — | public | OK (1112) | OK (1119) | OK (1152) | ok | OK |
| `/finance-101/budgeting` | Navigate | — | public | OK (535) | OK (542) | OK (575) | ok | OK |
| `/finance-101/cfa-prep` | Navigate | — | public | OK (1862) | OK (1869) | OK (1902) | ok | OK |
| `/finance-101/essays/:slug` | FinanceEssayLegacyRedirect | — | public | OK (23428) | OK (23435) | OK (23468) | ok | OK |
| `/essays/:slug` | EssayBySlug | essays | public | OK (2420) | OK (2427) | OK (2460) | ok | OK |
| `/finance-workspace` | RequireAdmin | — | public | OK (507) | OK (1941) | OK (1069) | ok | OK |
| `/green-transition` | GreenTransition | — | public | OK (2441) | OK (2448) | OK (2481) | ok | OK |
| `/green-transition/climate-finance` | ClimateFinance | essays | public | OK (1662) | OK (1669) | OK (1702) | ok | OK |
| `/green-transition/climate-finance/:slug` | GreenTransitionEssayPage | essays | public | 404 | 404 | 404 | ok | OK — 404 by design |
| `/green-transition/tracker` | GreenTransitionTracker | — | public | OK (2336) | OK (2343) | OK (2376) | ok | OK |
| `/green-transition/tracker/archive` | GreenTransitionTrackerArchive | — | public | OK (1483) | OK (1490) | OK (1523) | ok | OK |
| `/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug` | GreenTransitionTrackerEssay | — | public | OK (629) | OK (636) | OK (669) | ok | OK |
| `/green-transition/tracker/:issueSlug` | GreenTransitionTrackerDetail | — | public | OK (642) | OK (649) | OK (682) | ok | OK |
| `/green-transition/now` | GreenTransitionPhase | categories, essays | public | OK (652) | OK (659) | OK (702) | ok | OK |
| `/green-transition/gaps` | GreenTransitionPhase | categories, essays | public | OK (652) | OK (659) | OK (702) | ok | OK |
| `/green-transition/future` | GreenTransitionPhase | categories, essays | public | OK (652) | OK (659) | OK (702) | ok | OK |
| `/green-transition/:phase` | GreenTransitionPhase | categories, essays | public | OK (652) | OK (659) | OK (702) | ok | OK |
| `/green-transition/:phase/:slug` | GreenTransitionEssayPage | essays | public | 404 | 404 | 404 | ok | OK — 404 by design |
| `/development-finance` | DevelopmentFinance | essays | public | OK (1247) | OK (1254) | OK (1287) | ok | OK |
| `/development-finance/:phase` | DevelopmentFinancePhase | essays | public | OK (552) | OK (559) | OK (602) | ok | OK |
| `/development-finance/:phase/:slug` | DevelopmentFinanceEssayPage | essays | public | 404 | 404 | 404 | ok | OK — 404 by design |
| `/masyarakat-baru` | Navigate | — | public | OK (1811) | OK (1818) | OK (1851) | ok | OK |
| `/masyarakat-baru/english-ielts` | Navigate | — | public | OK (1733) | OK (1740) | OK (1773) | ok | OK |
| `/masyarakat-baru/books-academia` | Navigate | — | public | OK (765) | OK (772) | OK (805) | ok | OK |
| `/masyarakat-baru/critical-thinking-research` | Navigate | — | public | OK (1811) | OK (1818) | OK (1851) | ok | OK |
| `/critical-thinking-research` | CriticalThinkingResearch | — | public | OK (1811) | OK (1818) | OK (1851) | ok | OK |
| `/critical-thinking-research/:phase` | CriticalThinkingPhase | essays | public | OK (647) | OK (654) | OK (687) | ok | OK |
| `/critical-thinking-research/:phase/:essayId` | CriticalThinkingEssay | essays | public | OK (908) | OK (915) | OK (948) | ok | OK |
| `/books-academia` | BooksAcademia | books_uploads | public | OK (765) | OK (772) | OK (805) | ok | OK |
| `/books/categories` | BooksCategories | — | public | OK (671) | OK (678) | OK (711) | ok | OK |
| `/books/:category` | BooksList | books_uploads | public | OK (568) | OK (575) | OK (608) | ok | OK |
| `/books/:category/:bookId/read` | BookReader | books, books_uploads | public | OK (579) | OK (586) | OK (619) | ok | OK |
| `/english-ielts` | EnglishIelts | — | public | OK (1733) | OK (1740) | OK (1773) | ok | OK |
| `/settings` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (619) | ok | OK — gated correctly |
| `/debug/auth` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (780) | ok | OK — gated correctly |
| `/admin/dashboard` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (2085) | ok | OK — gated correctly |
| `/admin/content` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (39759) | ok | OK — gated correctly |
| `/admin/audit-log` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (741) | ok | OK — gated correctly |
| `/admin/writer/:id` | — | — | admin | OK (507) | OK (1941) | OK (21655) | ok | OK — gated correctly |
| `/admin/writer/:section/list` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (37297) | ok | OK — gated correctly |
| `/admin/writer/:section/:slug` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (44713) | ok | OK — gated correctly |
| `/admin/content/:id` | RequireAdmin | — | admin | OK (507) | OK (1941) | OK (21745) | ok | OK — gated correctly |
| `/the-next-big-thing` | TheNextBigThing | — | public | OK (1107) | OK (1114) | OK (1157) | ok | OK |
| `/the-next-big-thing/:slug` | NextBigThingEssayPage | essays | public | 404 | 404 | 404 | ok | OK — 404 by design |

## Method

- Desktop 1280×900; mobile 375×812 (admin identity, which reaches the most surface).
- Identities: anonymous · authenticated non-admin (`route-sweep-tester@`, zero rows in
  `user_roles`) · admin (`sweep-admin@`, granted service-side). **Both are temporary accounts
  created for this sweep and should be deleted** once it is no longer being re-run.
- Parameterised routes filled with real values from the live database (`analytics` /
  `t4-m07` / `fa-07-01`, `cash-and-cash-equivalents`, …).
- Runtime, not just render: console errors, failed requests, and any 401/403/406/500 are
  recorded. Raw PostgREST text reaching the DOM is always a defect.
- Empty state vs break: `books_uploads` and `finance_models` have **zero rows**, so those
  pages are *expected* to be empty. An intentional empty state passes; a blank screen, stuck
  spinner, error boundary or thrown exception is a defect.
- The `(n)` after OK is rendered body-text length — how a real page is told from chrome
  wrapped around nothing, and how the three identities are told apart.

## Known, not a break

`/finance/wrongtrack/wrongmodule/fa-07-01` renders the essay: the page looks up by
globally-unique slug and never checks that track and module match. Duplicate URL for the same
content — a canonicalisation issue.
