# Phase 9 — Reconciliation

Every finding from Phases 3–8 re-reviewed as one list against the goals (00-goals.md):
kept, merged, re-ranked, or dropped, with the reason. Ranked by **goal impact first**,
then severity. Locus key: **branch** = a Phase 11 work order (constraints 1/3/4 allow);
**owner** = needs a decision or dashboard/DNS/secret action the review must not perform;
**proposal** = offered, default no; **drop** = recorded, no action.

## Kept findings, ranked

| # | Finding (merged sources) | Why this rank | P | G | Locus |
|---|---|---|---|---|---|
| R1 | **The GitHub→Vercel pipeline does not deploy main; production serves a ~2-month-old build that renders blank against the current database** (merges F1 blank page, F19 discoverability collapse, K4 live cards). Evidence: Phase 2 §0 fingerprinting; blank-page observation + screenshot; CI green on main. | Every goal that needs the live site (1,2,4,5 reading; 6 pipeline) is blocked at the last step. The code behind every other finding is already better than what visitors can see. | P0 | G0 | **owner**: diagnose Vercel (integration/build logs), confirm `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` exist for Production **and Preview**, redeploy. Recommendation: after redeploy, run the blocked-live re-verification list (03-features end) |
| R2 | **Apex domain 308-redirects to the raw project URL** (`dikagustiana.com` → `dika-s-digital-studio.vercel.app`); www serves 200 (F32). | First impression of every visitor who types the domain; panel readers land on an agency-looking URL with a blank page. | P0 | G0 | **owner**: assign/redirect the apex in the Vercel dashboard (apex → `https://www.dikagustiana.com` or serve at apex) |
| R3 | **No backups are happening**: backup workflow secrets unset; every scheduled run fails (`FATAL: VITE_SUPABASE_URL not set`); the workflow is the only backup; free tier has no PITR (F13, K1). | Goal 6's "never lose work" is currently protected in the editor but not at the storage layer; the sole copy of all content is the production DB. | P0 | G0 | **owner**: set `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` as Actions secrets (names only; the workflow already hard-fails loudly when absent) |
| R4 | **From any essay, the chain-map stage is unreachable in ≤2 clicks** (G3.2 fail, Phase 6): chain components used only by Index/About; essays carry only a section back-link; mapping data already exists (`chainCurriculumMap.ts`, `chainPlacement.ts`). | The architecture's central claim ("same object at different distances") is one-directional in navigation; this is the goal-3 gap a fix can actually close in code. | P2 | G1 | **branch**: additive essay-furniture link for finance essays whose module maps to a chain stage (FD1-respecting refinement; no prose touched) |
| R5 | **Query-driven index pages fail silent** — no `throwOnError`, `data===undefined` renders as empty; DB hiccup looks like emptiness (F5). Direct-fetch pages already render `ErrorState`. | A DB outage would look like the site having no content — the "broken vs planned" distinction goal 4 depends on would invert exactly when things break. | P2 | G1 | **branch**: error states for query-driven section indexes (reuse `ErrorState`) |
| R6 | **Publishing never triggers a rebuild** — crawler surfaces (per-essay cards, sitemap, RSS, prerendered pages) are build artifacts; no deploy hook exists anywhere (Phase 7, reader 4). After R1 is repaired this becomes the standing gap in "rebuild pipeline works without attention". | Goal 6 names this explicitly. Not fixable from the repo (the hook URL is a Vercel secret). | P2 | G1 | **owner**: create a Vercel deploy hook; optionally a scheduled keep-fresh build. Recommendation: wire the hook to a tiny scheduled workflow only after R1 is confirmed healthy |
| R7 | **Recovery banner false positive** — stale autosave offered as "probably captured after the last save" (F2; pinned test). | Erodes the writer's trust in the recovery net — the net's credibility is the product (goal 6). | P2 | G2 | **branch**: add recency comparison (autosave `created_at` vs row `updated_at`) to `findRecoveryCandidate`; flip the pinned test |
| R8 | **Same-tab save/autosave race reports "changed in another tab" about its own tab** (F3). | Rare, loud, no data loss, no action available — a trust-eroder in the same chip. | P2 | G2 | **branch**: make the manual save flush and await the in-flight autosave first |
| R9 | **CI never runs the e2e suite** (F28) and **the e2e webServer cannot start on Windows** (F29). | The 72-test suite only runs when remembered; the suite is the site's regression memory. | P2 | G2 | **branch**: cross-platform webServer command + add an e2e job to ci.yml (chromium install + run) |
| R10 | **No search anywhere** (Phase 4/6). | A 10-minute panel reader cannot look up a topic; discovery is purely structural. Feature addition — owner's product call. | P2 | G2 | **owner** (proposal): client-side index over titles/snippets would suffice at this scale |
| R11 | **Essay pages end the visit**: no related essays (`RelatedContent.tsx` built, zero consumers; `useRelatedEssays` dead), no author-credibility line, no chain link (R4 covers the last). | Reader panels 1 and 2 stop here; the component exists, the data exists. | P2 | G2 | **branch (related-essays rail, additive, conservative same-section logic)** / **owner (byline wording — constraint 3: new public text in his voice needs his words)** |
| R12 | **CSP ships Report-Only only** (F9). | No browser-side backstop; flipping to enforcing without reading reports risks breakage nobody can see. | P2 | G2 | **owner** (proposal): monitor reports for a period, then enforce |
| R13 | **Writer-Studio chip shows "Unknown error" for Supabase failures** (F4, pinned test). | Small trust-eroder; one-line extraction fix. | P3 | G2 | **branch** |
| R14 | **Dead code, 24 units** incl. K2-confirmed `sectionPhaseConfig.ts` (with its shadowed `CONSOLIDATION_TOPICS` copy) (F22). | Hygiene with one real hazard (see R15); keeps the codebase honest for a solo maintainer. | P3 | G3 | **branch**: remove the zero-reference files (keep test-only exports their tests use) |
| R15 | **`useDeleteEssay` is dead AND hard-DELETEs rows** (F23) — the exact behaviour the live admin flow abolished. | One accidental import from irreversible content loss; goal-6 adjacent. | P2 | G2 | **branch**: delete it (with R14) |
| R16 | **`canonicalPath` hand-mirrors `essayUrl`, untestable as-is** (F24). | Silent wrong og:url/canonical risk on a branch nobody re-checks. | P2 | G2 | **branch**: extract to `scripts/lib/canonicalPath.mjs` + parity test vs `essayUrl` |
| R17 | **Autosave-test gaps**: component-level publish click-through, `dump-content.mjs`, `AuthContext` transient-failure bounce (F30). | The write layer is now tested (Phase 3); these are the remaining criticals. | P2 | G2 | **branch**: AuthContext failure-path test + dump-content dry-run test; component publish test if feasible without flakiness |
| R18 | **No structure tooling for the goal-5 essay standard**; `essayTemplates.ts` is dead *and* below the standard (Phase 6). | The hook/headers/boundaries/register checklist lives only in the author's head. | P3 | G2 | **branch (tooling only)**: writer-side structure checklist (no prose, no templates insertion) — or drop if the owner prefers memory |
| R19 | **Admin dashboard stats and audit-log filter fail quietly** (F6, F7). | Owner-only surfaces; wrong zeros and missed audit rows. | P3 | G3 | **branch**: surface errors; server-side filter for the audit log |
| R20 | **Footer "Finance" link is legacy `/finance-101`** (F8); **lint ceiling 35 vs actual 25** (F35); **root-level June-2026 audit records** (F26); **`staleTime` 0 + refetchOnWindowFocus** egress (F17); **editor chunk 871 kB** (F15); **a11y never machine-audited** (F21); **dump floors hardcoded** (F14); **Vercel preview minutes unknown** (F34). | Hygiene bundle; each small, none urgent. | P3 | G3 | **branch**: footer link; lint ceiling 25; move the three root records to `docs/archive/`. **proposal**: staleTime/refetch tuning; editor chunk split; axe sweep. **drop**: F14 (working as designed, documented) |
| R21 | **Learning surfaces (IELTS, Books, Critical Thinking, Tools) serve none of the six goals and dilute the credibility instrument** (Phases 6–7). | Content removal is forbidden (constraint 1/3); navigation prominence is an editorial decision about the owner's own material. | P2 | G1→owner | **owner**: demote from main nav / move under a clear "Personal" or archive label; keep URLs live (redirects already exist for /masyarakat-baru) |
| R22 | **Capital in Motion absent from the finance dropdown** (navConfig comment says deliberate until it has modules; the framework is complete and static). | Discoverability of the thickest finished asset. Contradicts a documented owner decision if done unilaterally. | P3 | G2 | **owner**: confirm or lift the "no modules yet" rule for part 05 |
| R23 | **Tracker paused since Q2 2025**; **Fundamentals is the emptiest room on the likely panel path**; **section indexes don't name their distance on the chain** (Phases 6–8). | Editorial-shape facts, not code defects; wording is constraint-3 territory. | P3 | G2 | **owner** (report carries the observation; no code change proposed) |

## Merged

- F1 (blank page) + F19 (discoverability) + K4 (identical live cards) → **R1** (one root cause: the stale deployment).
- F13 + K1 → **R3**.
- F22 + F23 → R14/R15 (split by hazard).
- F28 + F29 → R9 (one test-infra work stream).
- K3 → **resolved, largely refuted** in Phase 3/4: the never-saved essay is covered by the `beforeunload` dirty guard + pagehide flush; the residual windows are R7/R8.
- K5 → **resolved, refuted** (F27): README/SESSION_LOG references check out; the real stale bits are R20-level (footer link, migration comments, June-2026 records).
- K6 → **resolved, superseded** (F31/F34): production doesn't rebuild at all; preview-minute tuning folded into R1/R6 diagnostics.
- K2 → **confirmed** → R14.
- F10 (public buckets), F11 (draft-metadata view) → **dropped as findings**: documented, deliberate trade-offs (recorded in Phase 5 as ✔ with rationale).

## What the site does that serves no goal

1. The **Learning surfaces** (R21) — IELTS methodology, book library, critical-thinking framework, tools placeholders.
2. **`/debug/auth`** — admin-gated debug surface (harmless, robots-disallowed; candidate for removal whenever the owner next touches admin chrome).
3. **Legacy redirect scaffolding** (`/finance-101*`, `/masyarakat-baru`, four-segment essay redirects) — serves old links, not goals; keep (they protect readers), but stop minting new legacy URLs (R20 footer fix).
4. **Root-level June-2026 audit records** (R20) — history, not product.

## What the goals need that the site does not do yet

1. **A working production deployment and domain** (R1, R2) — every goal's precondition.
2. **Backups that actually run** (R3).
3. **Essay→chain navigation** (R4) and **essay-page continuations** (R11) — the architecture's promise, closed loops.
4. **A rebuild trigger tied to publishing** (R6) — "share cards, sitemap, RSS and the rebuild pipeline must work without his attention" currently requires a manual deploy.
5. **Search** (R10) and **a "start here" surface for the best work** (R23) — the 10-minute reader's shortcuts.
6. **Structure tooling for the verification standard** (R18) and **visible Verification Registers** (re-verify after R1) — goal 5's guarantee at scale.
7. **Error-visible public pages** (R5) — so a bad night for the database never masquerades as an empty curriculum.
