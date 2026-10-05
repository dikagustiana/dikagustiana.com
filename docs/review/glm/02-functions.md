# Phase 3 — Function audit

Method: every exported function/hook/store action/edge function/SQL function enumerated
by a full read of each module; caller counts from greps of the export name across
`src/`, `scripts/`, `tests/`; verdicts decided from the code plus (where runnable) tests
executed in this session. Supabase was **mocked**, never called. Verdict scale:
**works** (behaves as intended, evidenced) · **broken** (does not do what it claims) ·
**dead** (no importers/callers) · **risky** (works, with a concrete hazard) ·
**unclear**.

Counts at the end (§5). New tests written this phase: `tests/unit/autosaveWrites.test.tsx`
(19 tests) — the entire autosave/backup write path was previously untested (§4).

## 1. `src/lib/*` — domain logic

| Function | Callers | Side effects / errors | Tests | Verdict + evidence |
|---|---|---|---|---|
| `auditLog.logAuditEvent` | `useAdminEssays`, `useUnifiedContent` | Supabase insert; never throws — failure warn DEV-only, silently skipped signed out | none | **works** (best-effort by design; audit rows can drop silently in prod — accepted for a log) |
| `brief.briefWordCount` / `isEmptyBrief` / `parseBriefDoc` | BriefEditor, shells, useBriefQueue | pure; parse returns null malformed | brief.test.ts | **works** |
| `brief.hasBrief` | 0 src (useBriefQueue inlines the predicate) | — | brief.test.ts | **dead in src** (test-only) |
| `essayUrl.essayUrl` / `universalEssayUrl` / `absoluteEssayUrl` / `essayUrlInputFromRow` | 8+ pages/components | pure; null on unmapped | essayUrl.test.ts (all branches) | **works** |
| `essayTemplates.*` | only dead `TemplateSelector` chain | — | none | **dead** (whole chain: essayTemplates.ts:327 + TemplateSelector via dead admin barrel) |
| `figureValidation.validateFigures` / `extractFiguresFromContent` | WriterValidation | malformed figure JSON silently skipped (intentional) | figureValidation.test.ts | **works** |
| `figureValidation.countFigures` | 0 src | — | tested | **dead in src** |
| `formatDate.formatDate` / `fullDate` | 16 shells/feeds | bad date → input returned | formatDate.test.ts (TZ-pinned in CI) | **works** |
| `imageValidation.validateImages` / `countImages` | 0 src (superseded by figureValidation) | — | imageBlock.test.ts | **dead in src** |
| `katexLoader` default | ArticleBody (dynamic import) | loads KaTeX on demand | asserted in readingPathWeight.test.ts | **works** |
| `linkPreview.fetchLinkPreview` | LinkCardDialog | edge-fn invoke; every path → `{ok:false,message}`, never throws | linkPreviewClient.test.ts | **works** |
| `motion.prefersReducedMotion` / `scrollBehavior` | ArticleToc, toolbar, FSLI, ChainPlate | matchMedia guarded | motion.test.ts | **works** |
| `presentation.resolvePresentation` | WriterEditor + 4 readers | pure | presentation.test.ts | **works** |
| `presentation.PRESENTATION_COLUMNS` | 0 src | — | tested | **dead in src** |
| `publication.onlyPublished` / `isPublished` / `PUBLISHED_COLUMN` | 6 hooks/pages | pure | publicationContract.test.ts | **works** (PUBLISHED_COLUMN dead in src) |
| `revisions.*` (11 pure fns) | useEssayAutosave ×many | pure | revisions.test.ts | **works** — except `findRecoveryCandidate`, **risky**: content-only comparison (revisions.ts:200) offers an autosave OLDER than the last manual save as "probably captured after the last save" → false recovery banner after a routine save+reload. Pinned by test `[pinned]` in autosaveWrites.test.tsx |
| `sanitizeHtml.sanitizeHtml` | ArticleBody, link cards, previews | DOMPurify whitelist + style-attr hook; iframes forbidden | sanitizeHtml.test.ts | **works** |
| `sectionLabels.sectionLabel` | 6 | trivial map | none | **works** (untested; trivial) |
| `shareImage.unixSeconds` / `essayShareImage` | prerender + SEO sides | pure | shareImage.test.tsx | **works** |
| `siteOrigin.SITE_ORIGIN` / `absoluteUrl` | SEO, ShareButton, prerender | constant | — | **works** — value `https://dikagustiana.com`, which today 308-redirects (Phase 2 §0); any canonical/og built from it is currently pointing at a redirecting origin |
| `utils.cn` | ubiquitous | — | — | **works** |
| `tiptap.getEditorExtensions` / `getSchemaExtensions` / `getBriefExtensions` | EssayEditor, BriefEditor, tests | — | editorHtmlRoundTrip.test.ts (453) | **works** |
| `tiptap/serialize.*` (`isLegacyHtmlContent`, `parseTiptapJson`, `tiptapJsonToHtml`, `contentToHtml`) | 6+ pages | malformed JSON → null / passthrough | serialize.test.ts + round-trip | **works** |
| `tiptap.tiptapJsonToMarkdown` / `extractFiguresFromJson` | 0 src | — | tested | **dead in src** |
| `tiptap/SlashCommand` | extensions | DOM popup appended/removed | none | **works, untested** (positioning hand-verified per comments) |
| `tiptap/insertMenu.buildInsertItems` / `filterInsertItems` | toolbar, slashCommand | pure | none | **works, untested** |
| `tiptap/pasteFromWord.*` | EssayEditor, BriefEditor | catch → original paste | pasteFromWord.test.ts | **works** |

## 2. Hooks and state

### `useEssayAutosave.ts` — the goal-6 core (deep-read; now tested)

| Function | Behaviour (evidence: src/hooks/useEssayAutosave.ts) | Verdict |
|---|---|---|
| `fetchLatestRevision` (:63) | newest revision across both bodies (one sequence) | **works** (untested before this phase) |
| `fetchLatestRevisionOfBody` (:83) | body-scoped newest revision (rollup/recovery fence) | **works** |
| `writeRevision` (:110) | rollup into own burst row else append; `revision_no`=max+1, 23505 → recompute+retry ≤3 | **works** — cross-tab rollup impossible (`shouldRollUpRevision` requires `latest.id === ownRevisionId`); covered by 6 new tests |
| `useEssayAutosave` (:241) | 2 s debounce; `inFlight` dedup; visibilitychange flush; `recordRevision` appends explicit markers (`ownRevisionId=null`); row write (never-published only) is backup-FIRST, guarded `.eq('published', false)` + `.eq('updated_at', known)`, `serverUpdatedAtRef` advanced from the returned row (:306-334); zero rows → loud "changed in another tab" error; chip states from `lastSavedTo` | **works**; **risky (race)**: a same-tab manual save in flight while an autosave is in flight can hit the same guard — the loser (either write) reports the "another tab" error about its OWN tab's write. Not data loss (guard holds; the revision is already written); a false alarm with no recovery action. Covered/pinned in autosaveWrites.test.tsx |
| `useDraftRecovery` (:447) | once per essay per body; offers newest differing autosave; failure → null, never blocks the editor | **risky** — inherits `findRecoveryCandidate`'s missing recency check: a stale autosave differing from the row triggers the "Unsaved draft recovered" banner even when the row is newer (false positive after every save+reload). Pinned by test |

### `src/hooks/queries/*` — data layer

Global `QueryClient` has **no defaultOptions** (`src/App.tsx:90`) → TanStack defaults
(retry ×3, staleTime 0, refetchOnWindowFocus true); no hook sets `throwOnError`, so a
failed query renders as `data === undefined` — i.e. an empty list, not an error state,
on most public pages (the ErrorBoundary catches render errors, not query errors).

| Hook | Note | Verdict |
|---|---|---|
| `useEssays` / `useEssay` / `useFsliEssayBodies` / `useEssaysByTopic` | standard read hooks | **works** |
| `useEssaysByFsliSlug` / `useRelatedEssays` | zero external callers | **dead in src** |
| `useAdminEssays` | admin list | **works** |
| `useBulkPublish` / `useDeleteEssay` / `useUpdateEssay` / `useCreateEssay` (useAdminEssays.ts:54-222) | zero src callers; superseded by useUnifiedContent. **`useDeleteEssay` hard-DELETEs rows** (useAdminEssays.ts:111-114) — the exact behaviour `useDeleteContent` deliberately abolished (archive-not-delete, useUnifiedContent.ts:328-334). One accidental import away from irreversible content loss | **dead — risky**; recommend deletion (Phase 11) |
| `useAuditLog` | fetches limit 500, filters client-side → a search misses rows beyond the first 500, silently | **risky** |
| `useBooks` / `useBook` / `useBookCategories` / `useUploadBook` | upload has compensating storage delete on failed row insert (useBooks.ts:108-111) | **works** |
| `useBriefQueue` | published essays with briefs | **works** |
| `useCategories` / `useCategory` | | **works** / **dead in src** |
| `useFinanceSections` + settings/modules/models hooks | staleTime 2–5 min | **works** |
| `useFeaturedFinanceEssay` | `if (error) return null` — DB outage renders the slot empty with no signal | **works by design** (documented "or nothing at all"), silent-failure note |
| `useFinanceSectionEssays` | zero callers | **dead in src** |
| `useReadingPath` / `useSectionCounts` / `useSelectedEssays` / `useSections` | `onlyPublished` filters | **works** (`useSection` dead in src) |
| `useUnifiedContent` + mutations (bulk publish, toggle publish/select, delete=archive, restore) | writes + audit + invalidation; throw to caller (AdminContent toasts) | **works**; note: toggle-publish bypasses WriterEditor's optimistic guard — races a writer tab; loser fails loudly, acceptable |
| `useContentStats` | **both Supabase errors silently swallowed** (useUnifiedContent.ts:150,154) — dashboard shows zeros, indistinguishable from empty | **risky** |
| `useToast` / `useMediaQuery` / `useIsMobile` | `use-mobile.tsx` has zero importers | **works** / **works** / **dead** |

### `AuthContext.tsx`

`checkAdminRole` queries `user_roles` directly (RLS-own-row policy permits it —
`baseline_foundation.sql:255-263` names this consumer). `resolveSession` dedups
same-user auth events (the tab-focus wipe regression — authTabFocus.test.tsx).
**risky edge**: a transient network failure during the very first admin check sets
`isAdmin=false, isLoading=false` → `RequireAdmin` redirects the admin to `/auth`;
recovery only on the next auth event (e.g. tab refocus). Happy path + dedup tested.

## 3. Writer Studio save/publish surfaces (code-traced, component writes mocked-tested at the hook layer)

| Path | Writes, in order | Failure handling | Verdict |
|---|---|---|---|
| `WriterEditor.handleSave('draft'\|'published')` (WriterEditor.tsx:418-600) | validation gate → guarded UPDATE essays (full columns, `updated_at` guarded by `serverUpdatedAtRef`) → zero rows: destructive toast, nothing overwritten → fire-and-forget `recordRevision` → invalidate queries | row-write throw → destructive toast; revision-insert failure after a successful row write surfaces via the chip only (by design — the row is the artifact) | **works, untested at component level** (hook-level covered by new tests). Same-tab race noted in §2 |
| Create path (:553-570) | INSERT essays → navigate replace → `recordRevision('create')` | throw → toast | **works** |
| `BriefEditor.handleSave` (BriefEditor.tsx:290-330) | UPDATE essays SET `brief_json` guarded by `updated_at` only (never content/status) → `recordRevision('brief_manual_save')`; emptied canvas saves NULL | zero rows → destructive toast; throw → toast | **works, untested** at component level |
| Pagehide flush (WriterEditor.tsx:410-414 → `flush`) | best-effort immediate autosave on tab hide | may not complete on unload — acknowledged best-effort; the row/revision writes that already landed are safe | **works** (residual: work typed in the final <2 s before close may miss the backup) |

**K3 verdict (never-saved safety net): REFUTED as a total gap, CONFIRMED as narrow gaps.**
Autosave writes both a revision and the row for never-published essays; recovery probes
backups on load; pagehide flushes. Remaining vectors: (a) before the first `canAutosave`
state exists (no id/category yet — by design, canAutosave blocks until the row exists);
(b) the false-positive recovery banner erodes trust in the net; (c) the same-tab
save/autosave race alarm. None of these silently lose a saved row; the risky ones are
logged for Phase 5/9.

## 4. Edge function and SQL functions

| Function | Caller | Notes | Verdict |
|---|---|---|---|
| `link-preview` `callerRole` (index.ts:58) | handler | bearer → auth/v1/user → user_roles under caller's token (RLS-scoped); failures → 401/403/503, bodies cancelled | **works** |
| `link-preview` handler (index.ts:144) | editor link-card dialog | POST-only; 413 >16 KiB; 400 bad JSON; resolution failures → 200 `{ok:false,reason}`; every fallible primitive internally guarded; no unhandled-rejection path found | **works** |
| `resolve.ts` chain (`checkUrlShape`, `checkTarget`, `guardedFetch`, parsers) | handler | SSRF guards verified in Phase 2 §4; typed failure results; policy refusals short-circuit | **works** (resolve.test coverage: linkPreview.test.ts, 467 lines) |
| `handle_new_user()` | auth signup trigger | SD, search_path pinned, idempotent | **works** |
| `update_updated_at_column()` | BEFORE UPDATE triggers | not definer; note: client-supplied `updated_at` is overwritten by now() — the optimistic guards read the RETURNED `updated_at`, so they stay consistent (verified: `.select('updated_at')` on the guarded writes) | **works** |
| `has_role()` | only `user_roles_insert_admin` policy | SD, search_path pinned, EXECUTE revoked from PUBLIC/anon | **works** |
| `validate_essay_placement()` | essays BEFORE INSERT/UPDATE trigger | fails closed on unresolvable placement; autosave's narrow column set never touches placement columns → no spurious rejections | **works** |

## 5. Build scripts

| Script | Guarded failure modes | Verdict |
|---|---|---|
| `dump-content.mjs` | missing creds → exit 1; below-floor table → exit 2 "do NOT treat as good backup" | **works** (floors hardcoded: essays ≥100 — will need maintenance as content grows) |
| `prerender.mjs` | fetch fail/card fail/template drift/feed mismatch/zero-written → exit 1; no key outside Vercel → skip with warning; on Vercel → exit 1 | **works**; `canonicalPath` (:87) is an untested hand-mirror of `essayUrl` — **risky** (drift ships wrong og:url silently; read-back check can't catch a diverging mapping). Import of the script is not side-effect-safe (runs main flow, `process.exit`), so a parity test requires extracting it — queued as a Phase 11 work order |
| `siteFeeds.mjs` | pure builders | **works** (tested) |
| `shareCard.mjs` | throws at import on wrong font/logo magic bytes; render failure → prerender exit 1 | **works** (pixel-level tests) |
| `check-share-parity.mjs` | manual QA tool; exits 1 on hydration mismatch | **works** (manual) |
| `assert-no-synthetic.mjs` / `assert-test-count.mjs` | exit 1/2 on violation | **works** |

## 6. Counts

Rough count across the audited surface (lib 40, hooks/queries 45, contexts 7,
writer/brief write paths 6, edge function 4 groups, SQL 4, scripts 10 groups ≈ 116
audited units):

| Verdict | Count | Highlights |
|---|---|---|
| works | 87 | — |
| broken | 0 | — |
| dead (incl. dead-in-src/test-only) | 24 | `sectionPhaseConfig.ts` (K2 confirmed), `essayTemplates` chain, `ImageUploader` (422 lines), `WorkingPaperTable` (248), `LivePreviewPanel` (197), retired `domains/writing/components/*`, 4 dead barrels, `use-mobile`, `alert-dialog`, `NavLink`, `useDeleteEssay` (risky-dead), plus the test-only exports listed in §1 |
| risky | 5 | `findRecoveryCandidate` recency gap; same-tab save race (false alarm, not data loss); `useContentStats` silent zeros; `useAuditLog` 500-row client filter; `canonicalPath` duplication (untested mirror) |
| unclear | 0 | — |

## 7. Tests written this phase

`tests/unit/autosaveWrites.test.tsx` — 19 tests, all passing (vitest, Supabase mocked):
`writeRevision` append/rollup/no-cross-tab-rollup/23505 retry/give-up/brief scoping (6);
`useEssayAutosave` backup-first ordering, guarded row write (`published=false` +
`updated_at` + ref advance), zero-rows loud failure, error surfacing (pinned), empty-doc
skip, flush, brief backup-only scoping, explicit-marker append (8);
`useDraftRecovery` offer/quiet/manual-marker-quiet/cross-body fence + the pinned
recency-gap behaviour (5). Two pins document known gaps for Phase 11:
recovery-recency rule and the "Unknown error" message extraction.

Residual untested criticals (component-level): `WriterEditor.handleSave` and
`BriefEditor.handleSave` end-to-end (their write logic is the hook layer tested above +
a guarded UPDATE in the component; a component test is queued as a Phase 11 candidate),
`checkAdminRole` transient-failure bounce, `dump-content.mjs` floors.
