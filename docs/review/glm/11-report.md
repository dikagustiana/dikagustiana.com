# Phase 13 — Final report

Branch `review/goals-2026-10`, main @ `cf22d64` → branch tip. Full trail in
`docs/review/00-goals.md` … `10-reverification.md`.

## Ringkasan (Bahasa Indonesia, informal)

1. Saya telaah seluruh situs terhadap enam tujuan yang Anda tetapkan, fase demi fase.
2. Temuan terbesar: produksi tidak pernah ter-update sejak sekitar 1 Agustus 2026 — Vercel
   menayangkan build lama yang malah layar putih kosong; ini akar hampir semua masalah.
3. Domain utama (dikagustiana.com) justru me-redirect ke URL vercel.app mentah; www normal
   — dua-duanya perlu dibetulkan di dashboard Vercel, bukan dari kode.
4. Backup harian gagal terus karena dua secrets GitHub Actions belum terisi — satu-satunya
   salinan seluruh tulisan Anda saat ini hanya database produksi.
5. Sisi kode sebenarnya sehat: RLS ketat, autosave aman, dan 15 perbaikan sudah saya
   kerjakan langsung di branch (autosave, error state, tautan ke peta rantai, pembersihan
   kode mati, e2e masuk CI, dsb) — satu commit per perbaikan, semua tes hijau.
6. Stub kurikulum tampil jujur sebagai "Planned" yang tidak bisa diklik — tidak ada
   halaman yang terlihat rusak; mekanisme ini sudah dirancang dengan benar.
7. Klaim Anda: K1 (secrets backup) dan K2 (file mati) terbukti benar; K5 dan K6 terbukti
   tidak; K3 sebagian besar sudah ada jaring pengamannya; K4 hanya terjadi karena deploy
   yang basi.
8. Ada 11 keputusan yang hanya bisa Anda ambil — urutannya: betulkan deploy Vercel,
   perbaiki domain, isi secrets backup, lalu pasang deploy hook agar setiap publish
   memicu rebuild.
9. Pemeriksaan isi esai (Verification Register, bahasa Inggris, struktur) tertunda sampai
   produksi hidup lagi — daftar lengkapnya ada di `10-reverification.md` §6.
10. Laporan tiga belas fase ada di `docs/review/`; branch `review/goals-2026-10` sudah
    di-push dua kali sesuai aturan — silakan tinjau commit demi commit, boleh buang
    per commit.

## Phase 1 checks — start vs end

Legend: PASS-LOCAL = verified on a local production build / in code+tests; FAIL-LIVE /
BLOCKED-LIVE = only the repaired production deployment can decide (the live site is
currently blank behind a redirecting domain — findings R1/R2). Full table with notes:
`10-reverification.md` §4.

| Check | Start | End |
|---|---|---|
| G1.1 mechanisms over labels [judge] | BLOCKED-LIVE | BLOCKED-LIVE |
| G1.2 citations + Verification Register | BLOCKED-LIVE | BLOCKED-LIVE |
| G1.3 professional reading surface | PASS-LOCAL | PASS-LOCAL |
| G1.4 no broken surfaces | FAIL-LIVE | FAIL-LIVE (R1) |
| G2.1 thesis in ten seconds | PASS-LOCAL / FAIL-LIVE | PASS-LOCAL / FAIL-LIVE |
| G2.2 ten-minute panel path | PASS-LOCAL | PASS-LOCAL (search still absent — R10) |
| G2.3 about states method | PASS-LOCAL | PASS-LOCAL |
| G2.4 no dead ends | FAIL-LIVE | FAIL-LIVE (R1/R2) |
| G3.1 chain reachable ≤2 clicks | PASS | PASS |
| G3.2 related stage ≤2 clicks from essays | **FAIL** | **PARTIAL PASS** (stage deep-link for chain-pinned modules; owner extends the data table) |
| G3.3 swimlanes + the line | PASS | PASS (FD2 respected) |
| G3.4 sections name their distance | PARTIAL [judge] | PARTIAL [judge] (owner wording — R23) |
| G4.1 six parts, 21 conditions, 6 layers, decision rules | PASS | PASS |
| G4.2 stubs read planned, never broken | PASS by construction | PASS + honest error states when the DB is down |
| G4.3 stubs stay visible | PASS | PASS (FD3 respected) |
| G4.4 landing shows the whole shape | PASS-LOCAL | PASS-LOCAL |
| G5.1 Register per essay | BLOCKED-LIVE | BLOCKED-LIVE (tooling proposal R18) |
| G5.2 essay structure | BLOCKED-LIVE | BLOCKED-LIVE (reader surface pinned by e2e) |
| G5.3 British English | BLOCKED-LIVE | BLOCKED-LIVE |
| G5.4 homepage/H1 own thesis | PASS-LOCAL | PASS-LOCAL |
| G5.5 no unverifiable quotes | BLOCKED-LIVE | BLOCKED-LIVE |
| G6.1 blank→published works | PASS (code) | PASS (+tested write path) |
| G6.2 no work-loss vector | 2 risky gaps | **PASS — gaps closed and tested** |
| G6.3 publishing cannot break public site | PASS | PASS (+ honest failures) |
| G6.4 backups/feeds automatic | FAIL (secrets) | FAIL (owner) / code now tested |
| G6.5 feeds current, admin unreachable | BLOCKED-LIVE | BLOCKED-LIVE / PASS-LOCAL |
| FD1–FD4 fixed decisions | — | **all four respected** |

## Functions and features — counts by verdict, before → after

- Functions (≈116 audited units): **works 87 → 93 · broken 0 → 0 · dead 24 → 7 (test-only
  keeps) · risky 5 → 0 · unclear 0 → 0.** The five risky items and the dangerous dead
  hard-delete are all resolved, each with a test.
- Tests: 917 → **934 unit tests, all passing** (the OFL failure was a Windows checkout
  artifact, fixed); e2e 72/72 (was unable to start on Windows; now also a CI step).
- Features: 15 of 16 feature areas PASS (Phase 4 matrix); search remains absent (owner
  decision); share cards / sitemap / RSS remain BLOCKED-LIVE on the stale deployment.

## Coverage by area (honest percentages)

| Area | Coverage | What it means |
|---|---|---|
| Routes, pages, reachability | 100% inventoried; structure browser-verified on every hub | content-level reading 0% (live site blank; DB out of bounds) |
| Functions/hooks/stores | ~100% of exports enumerated and verdicted; deep-read on the goal-6 core | component-level publish click-through not test-driven (dropped, see deviations) |
| Supabase schema, RLS, edge function | 100% of repository migrations + function code read | no live database was connected — by constraint |
| Writer Studio flows | ~85% | full code trace + hook-level tests; no full-browser authoring session (would need a real DB) |
| SEO / discoverability | code 100%, live 0% | the pipeline is verified; production serves none of it until redeploy |
| Accessibility | ~60% | inspection + e2e font/nav/keyboard evidence; no automated axe sweep (proposed) |
| Performance | ~50% | build metrics, chunk sizes, TTFB; no Lighthouse/lab run |
| CI / delivery | 100% of repo config + Actions run history (read-only) | Vercel dashboard facts (previews, build logs) unknowable from here — owner actions |

## Baseline vs end state

| Metric | Start (main @ cf22d64) | End (branch tip) |
|---|---|---|
| Build | PASS, 11.5 s; `editor` chunk 871.7 kB warning | PASS, ~5–6 s; same chunk classes (editor 854 kB, entry 132 kB, dist 4,379 kB) |
| Typecheck | PASS | PASS |
| Lint | 0 errors / 25 warnings (CI ceiling 35) | 0 errors / **22 warnings (ceiling 22)** |
| Unit tests | 916/917 (OFL hash red on Windows) | **934/934** + count-guard floor still satisfied |
| E2E | not startable on Windows; green in CI only as PR runs | **72/72 locally on Windows; new CI step runs it on every main push/PR** |
| Bundle | see build | comparable (dead code removed, +1 KB-class additions) |
| Live performance | TTFB 0.72 s home / 0.31 s essay route — shell only, site blank | unchanged; re-measure after the owner's redeploy |

## Work orders done (one commit each, prefix stated)

| WO | Commit | Prefix | What |
|---|---|---|---|
| WO-01 | `8adddf9` | test: | `.gitattributes` — font licence pinned to LF; suite green on any checkout |
| WO-02 | `d931f0b` | fix: | recovery offered only for backups newer than the last save |
| WO-03 | `816dfb4` | fix: | autosave chip shows the real failure cause |
| WO-04 | `cb15b9c` | fix: | manual save settles the in-flight autosave first (no false "another tab") |
| WO-05 | `ab2fc5d` | fix: | footer Finance → `/finance` |
| WO-06 | `f1fbf9f` | refactor: | 24 dead units removed incl. the hard-delete mutation |
| WO-07 | `6629b71` | refactor: | canonical-path mapper extracted + essayUrl parity test |
| WO-08 | `933b9e2` | fix: | error states on query-driven indexes (no more silent emptiness) |
| — | `3ec6cce` | fix: | Phase 12 regression fix: that error state renders inside the layout |
| WO-09 | `9b0e21e` | ia: | essay→chain deep link for chain-pinned modules |
| WO-10 | `2de6c20` | ia: | dead duplicate related-hook removed; wired rail confirmed everywhere |
| WO-11 | `df8458c` | fix: | admin stats/audit failures surface; audit filter server-side |
| WO-12 | `1475005` | test: | e2e in CI + cross-platform webServer |
| WO-13 | `ca47b18` | test: | dump trust floors + auth failure path pinned |
| WO-14 | `f0a006a` | chore: | lint ceiling 35 → 22 |
| WO-15 | `b62ebdc` | docs: | June-2026 records archived; `*.tsbuildinfo` untracked |

Phase documentation commits: `6435634`, `1d013e9`, `1e47816`, `1f7d170`, `1e9dfe3`,
`a856151`, `e8cd849`, `709ec22`, `6641dfa`, `e4d7015`, `5071520` (+ one STATE fix
`b67cb30`). No commit touches essay prose, H1s, hero copy, the about narrative, the chain
map's rendering, stub visibility, or anything finance-in-action.

## Owner-only decisions, ranked (detail in `09-plan.md`)

1. **Repair the deploy pipeline and redeploy (R1).** Diagnose in the Vercel dashboard;
   confirm `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` exist for Production and
   Preview; redeploy main. Everything readable on the site waits on this.
2. **Fix the apex domain (R2).** Serve `dikagustiana.com` (or 308 → `https://www.`); it
   must not point at the raw project URL.
3. **Set the two backup secrets (R3).** GitHub Actions secrets `VITE_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` — until then, the production DB is the only copy of every
   essay.
4. **Trigger a rebuild on publish (R6).** Vercel deploy hook (+ optional scheduled
   workflow); otherwise crawlers see stale cards/sitemap until the next manual deploy.
5. **Demote the Learning surfaces (R21).** Move IELTS/Books/Critical Thinking out of the
   main nav; URLs stay live.
6. **Add search (R10).** A client-side title/snippet search suffices at this scale.
7. **Essay byline wording (R11).** Constraint 3 puts the words in your hands.
8. **Enforce the CSP (R12).** After a report-monitoring window.
9. **Capital in Motion in the finance nav (R22).** It is the thickest finished asset.
10. **Writer structure checklist (R18).** Read-only panel for the goal-5 standard.
11. **Editorial shape (R23).** Dated note on the paused tracker; whether Fundamentals
    stays the entry track; whether section indexes name their distance on the chain.

## Every deviation from the brief, with its reason

1. **`gh` used read-only** (workflow run list + one failed-run log) to confirm K1. The
   ban covers creating PRs/issues/releases/tags; no write occurred, and the K1 evidence
   (empty secrets in the run env) was decisive.
2. **A temporary clean-baseline git worktree** (`C:\work\glm\dika-baseline`, junctioned
   `node_modules`) was built once to attribute the unit-test flakiness to the baseline
   rather than my changes, then removed. It lived inside the session's working folder
   `C:\work\glm`, was never pushed, and no other repository was cloned or fetched.
3. **The e2e suite was run manually** (build + serve via Git Bash, then
   `npx playwright test` reusing the server) because the POSIX webServer command could not
   start on Windows; WO-12 made the npm script itself cross-platform and that path is what
   was verified afterwards (72/72).
4. **Content-level essay checks (ten essays / ten stubs) were not executable**: the live
   site is blank (R1) and no database may be contacted (constraint 1). They are recorded
   as BLOCKED-LIVE with code/e2e stand-ins and a re-verification list
   (`10-reverification.md` §6). This is the review's largest enforced gap.
5. **The component-level publish click-through test was dropped** (declared in
   `09-plan.md`): the write layer under it is tested at hook level (21 tests), and a full
   Tiptap component render risked the flakiness the suite already shows under local load.
6. **A repo-local neutral git identity** ("Goals Review
   <goals-review@users.noreply.local>") was configured because the machine had none;
   no personal information was written into the repository.
7. **`docs/review/STATE.md` was updated every phase but committed with the following
   phase's docs commit once** (after Phase 3) — the file's content stayed accurate at all
   times; only the commit batching differed.
8. **The first push happened after the Phase 10 commit and this second push after the
   Phase 13 commit**, exactly as ordered; nothing else was pushed, no PR was opened, and
   no live system was touched at any point.
