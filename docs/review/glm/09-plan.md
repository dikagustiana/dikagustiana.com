# Phase 10 — Plan (work orders, ranked)

Labels: **fix on the branch** (constraints 1/3/4 allow: no DB writes, no prose/thesis
edits, no fixed-decision violations — additive UI only, refined not redesigned) and
**owner only** (dashboard/DNS/secrets/wording/feature decisions). One commit per work
order with the stated prefix; build + typecheck + lint + unit tests re-run after each;
e2e re-run at Phase 12.

## Fix on the branch — execution order

| WO | Covers | Goal | Files | Tests to add/change | Effort | Risk | Prefix |
|---|---|---|---|---|---|---|---|
| WO-01 | Baseline red on Windows: `OFL.txt` hash test | G6 (tests trustworthy) | `.gitattributes` (new; eol pinned for `scripts/og-fonts/*`), re-checkout of the smudged file | suite returns 937/937 locally | S | minimal — renormalisation scoped to the fonts dir | `test:` |
| WO-02 | R7 recovery false positive | G6 | `src/lib/revisions.ts` (`findRecoveryCandidate` gains a recency check vs the row's `updated_at`), `src/hooks/useEssayAutosave.ts` (`useDraftRecovery` passes the row timestamp), `WriterEditor`/`BriefEditor` call sites | flip the `[pinned]` test; add: older-than-row autosave → no candidate; newer → candidate | S–M | low — the offer becomes strictly more conservative | `fix:` |
| WO-03 | R13 "Unknown error" chip | G6 | `src/hooks/useEssayAutosave.ts` (extract message from Error/PostgrestError shapes) | flip the pinned test to assert the real message | S | minimal | `fix:` |
| WO-04 | R8 same-tab save race | G6 | `src/hooks/useEssayAutosave.ts` (`flush` returns a promise awaiting the in-flight save), `src/components/writer/WriterEditor.tsx` (`handleSave` awaits it before its guarded write) | hook test: flush during in-flight autosave resolves after it, single write | S–M | medium — touches the save path; guarded by existing 19 tests | `fix:` |
| WO-05 | R20 footer legacy link | G2 | `src/components/Footer.tsx` (`/finance-101` → `/finance`) | extend `navConfig.test.ts` footer case if one exists, else a snapshot assertion | S | minimal | `fix:` |
| WO-06 | R14 dead code + R15 dangerous `useDeleteEssay` (K2) | G3 | remove: `lib/admin/sectionPhaseConfig.ts`, `lib/admin/sectionResolution.ts` (+ its test), `lib/essayTemplates.ts`, `hooks/use-mobile.tsx`, `components/ui/alert-dialog.tsx`, `components/NavLink.tsx`, `components/editorial/ImageUploader.tsx`, `components/green-transition/GreenTransitionRelatedEssays.tsx`, `components/consolidation/{ProcessStep,WorkingPaperTable}.tsx`, `components/admin/{AdminEditorDebugLine,LivePreviewPanel,ContentHealthIndicator,ContentPreview,ContentTemplates,DynamicListEditor,EssayTemplateForm,TemplateSelector}.tsx` + `components/admin/index.ts`, `components/finance/{index,ModelSuggestionBlock,ExpandableFormula,CapitalLayerCard}.tsx` (+ `featureComponents.test.tsx` references), `domains/writing/components/{LeftSidebar,RightSidebar,TopBar,index.tsx*}`, `hooks/queries/index.ts`; delete the dead mutations in `hooks/queries/useAdminEssays.ts` (`useBulkPublish`, `useDeleteEssay`, `useUpdateEssay`, `useCreateEssay`). KEEP test-only exports their tests use (`hasBrief`, `countFigures`, `validateImages`, `PUBLISHED_COLUMN`, `tiptapJsonToMarkdown`, `extractFiguresFromJson`) and `useRelatedEssays` (WO-10 uses it) | suite stays green; typecheck proves nothing imported them | M | low — zero-importer verified; git history keeps everything | `refactor:` |
| WO-07 | R16 `canonicalPath` mirror | G5/G6 | new `scripts/lib/canonicalPath.mjs` (pure), `scripts/prerender.mjs` imports it | `tests/unit/canonicalPathParity.test.ts`: prerender mapping ≡ `essayUrl` across every placement fixture (finance track/module, green-transition phases, development-finance, next-big-thing themes, accounting skip rules) | M | low | `refactor:` |
| WO-08 | R5 silent-failing index pages | G4/G6 | `FinanceLanding`, `FinanceTrackIndex`, `FinanceModulePage`, `GreenTransition`, `ClimateFinance`, `DevelopmentFinance`, `DevelopmentFinancePhase`, `TheNextBigThing`, `Accounting`, `FsliList`, `ConsolidatedReporting`, `StatutoryReporting` — render `ErrorState` when `isError` | unit test: query rejected → ErrorState visible (representative pages via `renderWithProviders`) | M | low-medium — additive UI only; loading/empty states untouched | `fix:` |
| WO-09 | R4 essay→chain link (G3.2) | G3 | `src/components/editorial/{ArticleShell,LongformArticleShell}.tsx` (optional `chainLink` prop rendered in existing footer furniture), essay pages compute it from `chainCurriculumMap` when the essay's finance module maps to a joint; deep link via the map's URL state | unit: module→joint→href mapping; shell renders link only when a mapping exists | M | medium — FD1: a single text link in existing furniture, no layout change; no prose | `ia:` |
| WO-10 | R11 related-essays on essay pages | G2/G3 | wire `RelatedContent` (exists, zero consumers) into the essay shells for same-section essays (cap 3, `useRelatedEssays`) | unit: renders up to 3 same-section essays; renders nothing when none | M | medium — additive, data-driven, no prose | `ia:` |
| WO-11 | R19 admin stats/audit failures | G6 | `useUnifiedContent.ts` (`useContentStats` throws), `useAuditLog.ts` (server-side filter), `AdminDashboard.tsx`/`AdminAuditLog.tsx` (error toast) | unit: stats query rejection surfaces error; filter generates `.ilike` | S | low — admin-only surfaces | `fix:` |
| WO-12 | R9 e2e on Windows + e2e in CI | G6 | `playwright.config.ts` (cross-platform webServer via a node wrapper script), `.github/workflows/ci.yml` (+ e2e job: `npx playwright install chromium`, `npx playwright test`) | no new unit tests; e2e suite is the test | S–M | low — CI minutes +≈3; Windows dev experience fixed | `test:` |
| WO-13 | R17 remaining critical tests | G6 | — | `AuthContext` transient-failure → RequireAdmin bounce test; `dump-content.mjs` dry-run test with a mocked fetch (floor logic + manifest) | M | low | `test:` |
| WO-14 | R35 lint ceiling ratchet | G3 | `ci.yml` `--max-warnings` 35 → actual count after all WOs | lint passes at the new ceiling | S | minimal | `chore:` |
| WO-15 | R20 root-level June-2026 records | G3 | `git mv AUDIT-LOG.md CHANGES-MADE.md UPGRADE-SUMMARY.md docs/archive/` | none | S | minimal | `docs:` |

Deliberately **not** executed on the branch: CSP enforcement (R12), search (R10),
byline text (R11b), writer structure checklist (R18), Learning demotion (R21),
capital-allocation nav (R22), staleTime/refetch tuning + editor chunk split + axe sweep
(proposals, Phase 5) — each is an owner product/wording decision or needs production
observability first.

## Owner-only decisions, ranked (each with the decision needed)

1. **R1 — repair the deploy pipeline and redeploy.** Decision: diagnose in the Vercel
   dashboard (is the GitHub integration connected? do builds fail?), confirm
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` exist for Production and
   Preview environments, redeploy main. *Recommendation: do this first; everything else
   readable on the site depends on it. Then re-run the blocked-live checks (Phase 12
   list).*
2. **R2 — fix the apex domain.** Decision: in Vercel, assign `dikagustiana.com` to the
   project (serve, or 308 → `https://www.dikagustiana.com`). *Recommendation: serve at
   apex with www redirecting, or the reverse — either is fine; the redirect must not
   point at the raw project URL.*
3. **R3 — set the two backup secrets.** Decision: add `VITE_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` in GitHub Actions secrets. *Recommendation: immediately
   after R1 — until then the production DB is the only copy of every essay.*
4. **R6 — make publishing trigger a rebuild.** Decision: create a Vercel deploy hook and
   (optionally) a small scheduled workflow that calls it. *Recommendation: after R1 is
   verified; without it, every publish leaves crawlers on stale cards/sitemap until the
   next manual deploy.*
5. **R21 — demote the Learning surfaces.** Decision: move IELTS/Books/Critical Thinking
   out of the main navigation (content stays live). *Recommendation: yes — the nav is
   the credibility instrument's shelf.*
6. **R10 — add search.** Decision: whether to add a client-side title/snippet search.
   *Recommendation: yes when convenient; at 160+ pages it is a small build.*
7. **R11b — essay byline.** Decision: provide the wording (constraint 3 puts all public
   thesis-voice text in his hands). *Recommendation: one line, name + one credential.*
8. **R12 — enforce the CSP.** Decision: after a report-monitoring window. *Recommendation:
   enforce `default-src 'self'; script-src 'self'` family when reports are quiet.*
9. **R22 — Capital in Motion in the nav.** Decision: lift or keep the "no modules yet"
   rule for part 05. *Recommendation: add it — it is the thickest finished asset.*
10. **R18 — writer structure checklist.** Decision: whether the Studio should carry the
    goal-5 checklist (hook/headers/boundaries/register). *Recommendation: a read-only
    checklist panel, no insertion, no prose.*
11. **R23 — editorial shape.** Decisions: resume or hand off the tracker with a dated
    note; whether Fundamentals (emptiest) should keep its "start here" role; whether the
    section indexes should name their distance on the chain. *Recommendation: a dated
    "paused, resumes when" note on the tracker is the highest-value sentence he can
    write this month.*

## Push plan

Phase 2 §9: a non-main push triggers no CI, no migrations, no function deploys (all
manual-only, quoted config). Vercel previews are undeterminable from the repo — accepted
residual (worst case: one failed preview build's minutes). The branch is pushed once
after this commit (review docs safe before any fix), and once after Phase 13, per the
brief.
