# Audit of the GLM review branch

Branch audited: `review/goals-2026-10` at `43e7ec0` (29 commits on `main` at `cf22d64`), left untouched.
Result: `review/goals-2026-10-curated`, cut from `main`. Audited 2026-10-05/06.
Live systems were read only: Vercel (API reads), DNS (lookups), GitHub (secret names, run history), Supabase `asypkbkiebjvvpimewfp` (`select` queries only). Nothing was deployed, migrated, re-configured or merged.

## Ringkasan

1. Saya cek ulang semua temuan GLM. Dari tiga temuan "urgent", satu salah dan dua benar.
2. Produksi **tidak** basi. `www.dikagustiana.com` menayangkan commit terakhir `main` (`cf22d64`, deploy 4 Okt), jadi pipeline GitHub→Vercel jalan normal dan tidak perlu diperbaiki.
3. Yang rusak itu domain apex. `dikagustiana.com` masih nempel di project Vercel lama (`dika-s-digital-studio`), yang me-redirect ke URL vercel.app-nya dan tampil layar putih. Ini juga sebab share card, canonical dan sitemap gagal, karena semua URL di kode pakai apex.
4. Backup memang belum pernah jalan: 64 run, 0 sukses, 0 secret di repo. Satu-satunya salinan semua tulisanmu ada di database produksi (paket free, tanpa backup bawaan).
5. Urutannya: (a) isi 2 secret dan jalankan backup sekali, (b) pindahkan apex ke project `dikagustiana-com`, (c) cek pakai curl, lalu refresh share card dan sitemap. Langkah lengkapnya ada di bawah.
6. Dari 15 work order GLM, 10 saya ambil apa adanya, 2 saya ambil dengan perbaikan, 3 saya buang. Satu fix susulan GLM sendiri (`3ec6cce`) ikut diambil.
7. Yang dibuang: aturan recovery berbasis waktu (bisa menyembunyikan draft yang belum tersimpan), link esai→peta rantai (tidak menunjuk stage mana pun, belum muncul di satu esai publik pun, dan menambah 62 KB di tiap halaman esai), dan ubahan `ci.yml` (file workflow itu blocker).
8. Yang saya perbaiki: refactor skrip backup dari GLM bikin log integritasnya mencetak "undefined", jadi saya kembalikan ke versi `main`. Config e2e dari GLM juga bisa diam-diam build pakai Supabase produksi, dan sekarang sudah dikunci.
9. Hasil branch kurasi: 925/925 unit test, 72/72 e2e, typecheck dan build bersih, 22 warning lint. Dokumen GLM dipindah ke `docs/review/glm/` dengan catatan koreksi.
10. Keputusan yang hanya bisa kamu ambil ada di bagian akhir, sudah saya urutkan. PR ini masih draft dan belum di-merge.

---

## 0. Blockers (items 5 to 8)

| Item | Finding | Commit | Carried? |
|---|---|---|---|
| 5. Workflow files changed | GLM edited `.github/workflows/ci.yml` twice. It added an e2e step (`npx playwright install --with-deps chromium`, `npx playwright test`) and lowered the lint ceiling from `--max-warnings=35` to `22`. | `1475005` (in part), `f0a006a` (entirely) | **No.** The `playwright.config.ts` half of `1475005` is carried without the `ci.yml` half; `f0a006a` is dropped. The owner can apply both himself (§7, decision 6). |
| 5. Secrets or `.env` committed | None. There are no `.env` paths in the diff, and no key-shaped strings (`eyJ…`, `sb_secret_`, `sbp_`, `ghp_`, `gho_`, `AKIA`) on added lines. | n/a | n/a |
| 6. Dependencies / lockfile | Unchanged: `package.json`, `package-lock.json` and `.npmrc` are not in the diff. All 716 `resolved` entries in the lockfile point at `https://registry.npmjs.org`. | n/a | n/a |
| 7. New network calls or third-party domains | None. The only URL on an added non-doc line is `http://127.0.0.1:54321`, the e2e fake Supabase in `playwright.config.ts`. No new `fetch`, script, analytics or import of an external package. | n/a | n/a |
| 8. Personal, employer or applicant information | None found in GLM's code or its 13 documents. There are no names other than the site's own, no employer, no e-mail or phone, no application details. The audience framing (scholarship and admissions panels) is already in `docs/DECISIONS.md` and `docs/REVIEW-2026-08.md` on `main`. The one machine path (`C:\work\glm\dika-baseline`, `11-report.md`) names no user. | n/a | Documents kept, moved to `docs/review/glm/` |

---

## 1. The three urgent findings

### 1.1 "Production is two months stale and blank; pushes to main never deploy": **refuted**

Production is current. The stale, blank page GLM saw is a different Vercel project, reached through the apex redirect in §1.2.

Evidence:

- Vercel has **two** projects in team `dikagirawan-4804's projects`:

  | Project | Git repo | Domains attached | Env vars | Last production |
  |---|---|---|---|---|
  | `dikagustiana-com` (`prj_uDxn…`, created 2026-08-01) | `dikagustiana/dikagustiana.com` | `www.dikagustiana.com`, `dikagustiana-com.vercel.app` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (production + preview), `VITE_FIA_PREVIEW` (one preview branch) | `cf22d64`, 2026-10-04 13:16:42 UTC |
  | `dika-s-digital-studio` (`prj_Wav0…`, created 2026-06-20) | `dikagustiana/dika-s-digital-studio` (the pre-rebuild repo) | `dikagustiana.com` (redirect, §1.2), `dika-s-digital-studio.vercel.app` | **none** | `61ba0f6`, 2026-07-26; last deployment of any kind 2026-07-31 |

- Production deployment `dpl_AJrhVA1s6A5a5iAgZijfKkd8dHVe` (from `get_deployment`) has `target: production` and `readyState: READY`, and its git source is `main` @ `cf22d6402c5c534be74c009170e9e767de58470b`. Its aliases are `www.dikagustiana.com`, `dikagustiana-com.vercel.app`, `…-git-main-…`. `git rev-parse origin/main` gives `cf22d6402c5c…`, the same commit.
- Every merge to `main` in the last three weeks has a production deployment: #34 `1c33310`, #35 `85cdf51`, #36 `babaaf7`, #37 `2a62121`, #38 `17d0df5`, #39 `3c1f3a8`, #40 `cf22d64`. For `cf22d64` the CI run was created at 13:16:41 UTC and the Vercel deployment at 13:16:42 UTC.
- `curl https://www.dikagustiana.com/` returns 200 with bundle `index-CBdJfoTJ.js`. `curl https://www.dikagustiana.com/finance/analytics/driver-tree-construction` returns pre-rendered HTML with that essay's own `og:image` (`…/og/driver-tree-construction.png?v=1785760108`). The prerender step only runs when the build has the Supabase key, so production builds have it. `/sitemap.xml` and `/rss.xml` on www are `application/xml`; the sitemap lists 8 URLs.
- In the browser, `https://www.dikagustiana.com/` renders the homepage ("The industry chain").
- What GLM saw: `https://dika-s-digital-studio.vercel.app/` serves `index-tLuHZmHp.js` and stays white. The console shows `Uncaught Error: supabaseUrl is required` because that old project has no environment variables at all. GLM fingerprinted only this origin (`docs/review/glm/01-inventory.md` §0) and never fingerprinted www.
- GLM's own two pushes made preview deployments in state `BLOCKED` (`dpl_GVT2…` for `e4d7015`, `dpl_6KVh…` for `43e7ec0`), with `errorLink: …/troubleshoot-project-collaboration#account-configuration`. Vercel blocked them because GLM committed as `goals-review@users.noreply.local`, an author it cannot match to the team. That is not a pipeline fault: branches committed as the owner or as `Claude <noreply@anthropic.com>` built normally (e.g. `claude/finance-in-action-v3-h5iwlk`, READY).

**Owner steps: none for the pipeline.** Do not follow GLM's R1 (no reconnect, no redeploy). One optional check: in Vercel, open `dikagustiana-com` → Deployments. The top row marked Production · Current should read `cf22d64` ("Merge pull request #40…").

### 1.2 "The apex domain redirects to the raw vercel.app address": **confirmed, and worse than reported**

Evidence:

- `list_project_domains` on `dika-s-digital-studio` returns `dikagustiana.com` with `redirect: "dika-s-digital-studio.vercel.app"` and `redirectStatusCode: 308`, last updated 2026-08-01 05:09:48 UTC. That is the day the new project was created (05:26 UTC) and www was moved to it (14:06 UTC). The apex was never moved.
- On `dikagustiana-com`, `list_project_domains` returns `www.dikagustiana.com` (no redirect) and `dikagustiana-com.vercel.app`. **The apex is not attached to the live project.**
- Redirect chain:
  ```
  http://dikagustiana.com        → 308 → https://dikagustiana.com/
  https://dikagustiana.com       → 308 → https://dika-s-digital-studio.vercel.app/   (blank)
  http://www.dikagustiana.com    → 308 → https://www.dikagustiana.com/
  https://www.dikagustiana.com   → 200 (current site)
  ```
- DNS (lookups against 1.1.1.1): `dikagustiana.com A 216.198.79.1` (Vercel), `www CNAME dikagustiana.com`, `NS ns1/ns2.dns-parking.com` (Hostinger), SOA serial `2026100101`. **DNS is not the problem.** Both names already reach Vercel, which routes them by host to different projects.
- Why it is worse than GLM said: the code treats the apex as the canonical origin (`src/lib/siteOrigin.ts:7`, `scripts/prerender.mjs:32`, `src/lib/shareImage.mjs:21`, `index.html:26-30`, `public/robots.txt:24`). Every canonical link, `og:url`, `og:image`, sitemap `<loc>` and the robots `Sitemap:` line therefore lands on the old blank project:
  ```
  https://dikagustiana.com/og/driver-tree-construction.png?v=…  → 200 text/html  (old SPA shell, not an image)
  https://www.dikagustiana.com/og/driver-tree-construction.png?v=… → 200 image/png
  https://dikagustiana.com/sitemap.xml → 200 text/html ;  www → 200 application/xml
  ```
  So the per-essay share cards (K4) do exist on www, but every platform that follows the `og:image` URL gets HTML instead of an image. Google is told the canonical copy of every essay is a blank page.
- `docs/SESSION_LOG.md` on `main` already says to run the tab-switch check "on www.dikagustiana.com, not the apex, which lands on the old deployment".

**Owner steps, in order** (recommended shape: serve on the apex, redirect www to the apex, because the apex is what the code already emits):

1. Vercel → team *dikagirawan-4804's projects* → project **`dika-s-digital-studio`** → Settings → Domains. Find `dikagustiana.com`, which shows a redirect to `dika-s-digital-studio.vercel.app`, and **Remove** it.
   *Check:* the row is gone. For a minute or two `https://dikagustiana.com` may answer 404; that is expected.
2. Vercel → project **`dikagustiana-com`** → Settings → Domains → **Add** `dikagustiana.com`, connected to **Production**, with **no redirect**. If Vercel offers to move it from the other project instead, accept that and skip step 1.
   *Check:* the row shows "Valid Configuration". If it shows a DNS warning, set exactly the record Vercel names in Hostinger hPanel → Domains → `dikagustiana.com` → DNS records. The current `A 216.198.79.1` should already satisfy it.
3. On the same page, edit `www.dikagustiana.com` → Redirect to `dikagustiana.com`, status **308**.
   *Check (any terminal):*
   ```bash
   curl -sI https://dikagustiana.com/ | head -1
   ```
   expect `HTTP/1.1 200 OK` and no `Location`. Then:
   ```bash
   curl -sI https://www.dikagustiana.com/ | grep -iE '^(HTTP|location)'
   ```
   expect `308` and `location: https://dikagustiana.com/`. Then:
   ```bash
   curl -sI "https://dikagustiana.com/og/driver-tree-construction.png" | grep -i content-type
   ```
   expect `image/png`. Then:
   ```bash
   curl -s https://dikagustiana.com/sitemap.xml | grep -c "<loc>"
   ```
   expect `8`.
4. Open `https://dikagustiana.com/` in a private window. It should show "The industry chain", not a white page.
5. Refresh the caches that already hold the broken card. Paste one essay URL into LinkedIn's Post Inspector (`linkedin.com/post-inspector`) and confirm the card shows that essay's title. In Google Search Console, add or verify the `dikagustiana.com` property, submit `https://dikagustiana.com/sitemap.xml` and request indexing of the homepage. WhatsApp and X refresh by themselves over days; the WhatsApp test in `docs/SESSION_LOG.md` (WO-R05 Part 5) can now be run.
6. Then decide on the old project (decision 3 in §7). It still serves the blank page at `dika-s-digital-studio.vercel.app`.

### 1.3 "No backups run; the Actions secrets are empty": **confirmed**

Evidence:

- `.github/workflows/backup.yml:41-42` expects the repository secrets **`VITE_SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`**. The schedule is `17 20 * * *` (line 23), plus manual dispatch (line 24).
- `gh api repos/dikagustiana/dikagustiana.com/actions/secrets` returns `{"total_count":0,"secrets":[]}`, and `gh secret list --env Preview` / `--env Production` return nothing. The repo is user-owned, so there are no organisation secrets.
- `…/actions/workflows/backup.yml/runs` has `total_count` 64; the same query with `?status=success` has `total_count` 0. **No run has ever succeeded** since the workflow was created on 2026-08-02. The latest run, `37242617434` at 2026-10-04 23:07 UTC, logs `VITE_SUPABASE_URL: ` and `SUPABASE_SERVICE_ROLE_KEY: ` as empty, then `FATAL: VITE_SUPABASE_URL not set (checked .env and the environment).`
- The Supabase organisation is on the **free** plan (`get_organization`), so there is no managed daily backup or PITR. The live database holds 167 essays (160 draft, 7 published), 52 revisions, and 2 images in `essay-images`. **It is the only copy.**
- The repo is private, so workflow artifacts are visible only to collaborators.

**Owner steps, in order** (do these first, before the domain; they touch nothing on the site):

1. Supabase dashboard → project `dikagustiana-com` (`asypkbkiebjvvpimewfp`) → Project Settings → **API Keys** → **Legacy API keys** tab → `service_role` → Reveal → copy. Legacy keys are enabled on this project. Use the legacy JWT, not a new `sb_secret_…` key: `scripts/dump-content.mjs` sends the key as both `apikey` and `Authorization: Bearer`, and Supabase documents that a non-JWT secret key in `Authorization` is rejected.
2. GitHub → `dikagustiana/dikagustiana.com` → Settings → Secrets and variables → **Actions** → Repository secrets → New repository secret:
   - Name `VITE_SUPABASE_URL`, value `https://asypkbkiebjvvpimewfp.supabase.co`
   - Name `SUPABASE_SERVICE_ROLE_KEY`, value the key from step 1

   *Check:* the page lists both names, or `gh secret list --repo dikagustiana/dikagustiana.com` prints both.
3. GitHub → Actions → **Content backup** → Run workflow → branch `main`.
   *Check:* the run is green. The "Dump all content" log should show `essays 167 rows` with no `<< BELOW EXPECTED FLOOR`, then `essays with a body: 9` and `essays with a presentation: 13` (today's numbers, from `select` on the live table), then `Dump looks complete.` The "Verify dump is not suspiciously small" step should pass, and the run page should list an artifact `content-dump-<run id>`. Download it and open `essays.json`: 167 objects.
4. Next day: the scheduled run (03:17 WIB nominal; GitHub has been starting it between about 05:30 and 07:00 WIB) is green. *Check:* Actions → Content backup → the newest `schedule` run is green.
5. Once a month, download the newest artifact and keep it off GitHub. Artifacts expire after 90 days and live in the same account as the code. The dump covers database tables only; the 2 images in Storage (278 kB) are not in it, so download them once from Storage → `essay-images`.

Know this once the key is in Actions: any workflow file on any branch can read repository secrets. That is why item 5 makes workflow changes a blocker: never merge an agent branch that touches `.github/workflows/` without reading it. Rotate the `service_role` key if one ever slips through.

---

## 2. Boundary check (items 1 to 4)

| Item | Finding |
|---|---|
| 1. `/finance/finance-in-action`, `docs/company-models/`, essay content | Untouched. `git diff --stat main..review/goals-2026-10` over FIA paths, `docs/company-models/`, `supabase/`, `src/data/`, `src/config/` is empty. No essay content lives in the repo; no DB write was made. |
| 2. Owner's own words | Untouched. No H1, hero, About narrative, essay prose or thesis text is edited (`src/pages/Index.tsx`, `About.tsx`, `index.html`, `public/` are not in the diff). New strings GLM added are UI microcopy: error-state messages (`933b9e2`), an admin banner (`df8458c`), and the link label "View this on the industry chain" (`9b0e21e`, not carried). |
| 3. Theme, layout, authoring redesign; chain map; stubs | No redesign. `src/components/industry-chain/` is untouched and stubs are untouched. `9b0e21e` added a link row to both article shells: a refinement in size, but it overrode a decision the URL contract reserves for essay prose (§4, WO-09). Not carried. |
| 4. Migrations, edge functions, RLS, and what would apply them | None in the diff (`supabase/` untouched). Nothing applies them automatically. `ci.yml` has no DB step; the Vercel build is `vite build && assert-no-synthetic && prerender` (reads only); and `list_branches` on the Supabase project returns `[]`, so there is no branching or GitHub integration. |

---

## 3. GLM's commits, judged

Oldest first. *Correct?* asks whether it does what it claims, inside the boundaries, with passing tests. *Worth it?* weighs value to the goals against code, risk and upkeep. "Curated as" names the commit on `review/goals-2026-10-curated`.

| # | GLM | Prefix | Summary | Correct? | Worth it? | Verdict | Curated as | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | `6435634` | docs(review) | Phase 1: goals as checks G1–G6 | Yes | Yes, as record | keep (moved) | `b73658a` | Faithful restatement; passes item 8 |
| 2 | `1d013e9` | docs(review) | Phase 2: inventory, push triggers, baseline | **No**: §0 "production stale" fingerprints the old project | As record | keep (moved) | `b73658a` | Kept with a README naming the refuted claims |
| 3 | `1e47816` | test(review) | Phase 3 doc + 19 autosave write-path tests | Yes (19 pass, mocked client) | **Yes**: first tests on the path that keeps work safe | keep (split) | `f429424` + doc in `b73658a` | Test file carried alone |
| 4 | `b67cb30` | docs(review) | STATE position | n/a | Low | keep (moved) | `b73658a` | Part of the record |
| 5 | `1f7d170` | docs(review) | Phase 4 features | Partly: live rows describe the old project | As record | keep (moved) | `b73658a` | |
| 6 | `1e9dfe3` | docs(review) | Phase 5 findings F1–F36 | Partly: F1, F31, F34 wrong | As record | keep (moved) | `b73658a` | |
| 7 | `a856151` | docs(review) | Phase 6 goal fit | Partly: "no related essays" wrong (GLM retracts it in phase 12) | As record | keep (moved) | `b73658a` | |
| 8 | `e8cd849` | docs(review) | Phase 7 reader panels | "Today" halves wrong (blank site) | As record | keep (moved) | `b73658a` | |
| 9 | `709ec22` | docs(review) | Phase 8 content map | Yes, within its sources | As record | keep (moved) | `b73658a` | |
| 10 | `6641dfa` | docs(review) | Phase 9 reconciliation R1–R23 | R1 wrong; K3 marked "largely refuted" though 03-features logs it as full loss | As record | keep (moved) | `b73658a` | |
| 11 | `e4d7015` | docs(review) | Phase 10 plan | n/a | As record | keep (moved) | `b73658a` | |
| 12 | `8adddf9` | test | `.gitattributes`: OFL.txt and fonts pinned to LF | Yes. Note: an existing clone must re-check-out the file (`rm scripts/og-fonts/OFL.txt && git checkout -- scripts/og-fonts/OFL.txt`); switching branches does not re-smudge it | Yes, 4 lines | **keep** | `1f9fe64` | Windows suite goes green |
| 13 | `d931f0b` | fix | WO-02: offer recovery only if the autosave is newer than `essays.updated_at` | **No.** A rolled-up autosave stamps `created_at` from the client clock (`writeRevision`, rollup branch: `created_at: new Date().toISOString()`) while `updated_at` is the server's. The Brief editor and the long body bump the same `updated_at`, so saving the Brief hides the long body's unsaved autosave and vice versa. The "routine save-and-reload" false positive it targets cannot happen on the normal path, because a manual save writes a `manual_save` revision, which is then the newest | **No**: trades a dismissable banner for a hidden draft | **drop** | `83eb289` (test comment says why) | Weakens "never lose work" |
| 14 | `816dfb4` | fix | WO-03: autosave chip shows the PostgrestError message | Yes | Yes, small | **keep** | `5641d6f` | (The manual-save toast in `WriterEditor.handleSave` still has the old pattern; see §6) |
| 15 | `cb15b9c` | fix | WO-04: manual save awaits this tab's in-flight autosave | Yes. The race is real for never-published essays, where autosave writes the row; +1 test | Yes | **keep** | `7e26831` | Removes a false "changed in another tab" |
| 16 | `ab2fc5d` | fix | WO-05: footer Finance → `/finance` | Yes | Yes, 1 line | **keep** | `db57379` | |
| 17 | `f1fbf9f` | refactor | WO-06: remove 24 dead units incl. hard-DELETE `useDeleteEssay` | Yes. Every deleted file's importers are inside the deleted set (barrels or the tests of that code); typecheck clean; −24 tests that tested only dead code | **Yes**: −3,763 lines, CSS −12.9 KB, and no import away from a hard delete | **keep** | `a38f0dd` | Leaves `@radix-ui/react-alert-dialog` unused in `package.json` (§6) |
| 18 | `6629b71` | refactor | WO-07: `canonicalPath` extracted, parity test vs `essayUrl` | Yes; byte-identical logic, +10 tests | Yes | **keep** | `1770284` | Import sits mid-file in `prerender.mjs` (cosmetic) |
| 19 | `933b9e2` | fix | WO-08: error states on 5 query-driven indexes | Yes, but the track-index error rendered bare (fixed by `3ec6cce`). The plan promised tests; none were added | Yes | **keep** | `b597e70` | |
| 20 | `9b0e21e` | ia | WO-09: essay → chain link | **Not as claimed.** It links every pinned module to `/?distance=finance`, the homepage, and names no joint, though `link.joint` is in hand and `useChainUrl` supports `node=`. Its two pinned modules (`t1-m10`, `t3-m06`) have **0 published essays** (live `select`), so no reader sees it. It adds a 62.6 KB chunk (19.9 KB gzip) of chain data to `EssayBySlug` and `FinanceTrackChild`. `useChainUrl.ts` says the URL contract exists so essays "will be written against" it, which is the owner's prose to write | **No** | **drop** | n/a | Owner decision 10 |
| 21 | `2de6c20` | ia | WO-10: remove dead `useRelatedEssays`; the rail was already wired | Yes | Small | **keep** | `a079727` | Corrects GLM's own earlier claim |
| 22 | `df8458c` | fix | WO-11: stats errors shown; audit-log filter server-side | Yes. Probed: PostgREST accepts `(`, `)`, `.`, `:` and `'` in the search. Search no longer matches `table_name` (there is a separate filter for it) | Marginal (the log has 8 rows) but cheap | **keep** | `05e0605` | |
| 23 | `1475005` | test | WO-12: e2e webServer cross-platform + e2e step in `ci.yml` | Config half works, but `??=` keeps an inherited real `VITE_SUPABASE_URL`: probed, a shell exporting the production URL leaves it in place. `ci.yml` half is a blocker | Yes for the config half | **amend** | `c8f70c6` (no `ci.yml`) + `97b9be6` (`=`) | e2e now starts on Windows and can never point at production |
| 24 | `ca47b18` | test | WO-13: dump floors extracted to `dumpAssess.mjs` + auth failure-path test | **Dump half broken**: the log prints `essays with a body: undefined` (numbers read with `.length`) and each table file is written twice. Run against a local stub: `main` prints `2 / 1`, `ca47b18` prints `undefined / undefined`. Auth test correct | Auth test yes; dump refactor no (it tests `rows < min`, on a script that has never run for real) | **amend** | `e1c5c67` + `8620ed2` (dump script back to `main`) | |
| 25 | `f0a006a` | chore | WO-14: lint ceiling 35 → 22 in `ci.yml` | Number right (22) | n/a | **drop** (item 5) | n/a | Owner decision 6 |
| 26 | `b62ebdc` | docs | WO-15: June records → `docs/archive/`; untrack `*.tsbuildinfo` | Yes; implements `docs/REVIEW-2026-08.md` R12 | Yes: typecheck no longer dirties git | **keep** | `0b84867` | |
| 27 | `3ec6cce` | fix | Track-index error inside the page layout | Yes | Yes | **keep** (moved next to WO-08) | `d9e2836` | GLM's own amendment of `933b9e2` |
| 28 | `5071520` | docs(review) | Phase 12 reverification | Partly: "editor 854 kB", "G3.2 partial pass", "risky 5 → 0" wrong | As record | keep (moved) | `b73658a` | |
| 29 | `43e7ec0` | docs(review) | Phase 13 report | Headline (R1) wrong | As record | keep (moved) | `b73658a` | |

My own commits on the branch:

- `83eb289`: the pinned recovery test stays as the rule, with the reason (replaces WO-02).
- `97b9be6`: the e2e env is always the fake one.
- `8620ed2`: `dump-content.mjs` restored to `main`; `dumpAssess.mjs` and its test removed.
- `b73658a`: GLM's 13 documents, byte-identical to `43e7ec0`, under `docs/review/glm/` with a README.
- `2961108`: `MIN_TESTS` 913 → 921, following the script's own rule (actual − 4).
- The commit adding this file.

Tally: 15 work orders. Kept as is: WO-01, 03, 04, 05, 06, 07, 08, 10, 11, 15 (10), plus GLM's `3ec6cce`. Amended: WO-12, WO-13 (2). Dropped: WO-02, WO-09, WO-14 (3); WO-02's pinned test stays, now as the rule. All 13 review documents kept and moved.

---

## 4. GLM's claims, checked

### Confirmed

- **K1 / F13 / F33 / R3**: backup secrets missing (§1.3).
- **F32 / R2**: apex redirects to the old project URL (§1.2). GLM did not find the second project as the cause.
- **F19**: canonical and `og` URLs are built on the apex. GLM blamed the stale deploy; the apex alone explains it.
- **K2 / F22**: `sectionPhaseConfig.ts` and 23 other units are dead (importer check in §3, row 17).
- **F23**: `useDeleteEssay` did a hard `.from('essays').delete()` with no callers.
- **F24**: `canonicalPath` hand-mirrored `essayUrl`.
- **F3**: same-tab save race, for never-published essays only.
- **F4**: "Unknown error" for PostgrestError.
- **F5**: query-driven indexes went silent on failure.
- **F6**: stats swallowed errors.
- **F7**: the audit filter was client-side over 500 rows. True, but moot at 8 rows.
- **F8**: footer `/finance-101`.
- **F9**: CSP is Report-Only (live header confirms). See §6: it has no reporting endpoint.
- **F17**: `new QueryClient()` with defaults (`src/App.tsx:90`).
- **F25 / F35**: 25 warnings under a ceiling of 35.
- **F26**: June 2026 records at the root.
- **F28 / F29**: e2e not in CI; `npm run test:e2e` cannot start on Windows on `main` (reproduced: `'VITE_SUPABASE_URL' is not recognized…`, exit 1).
- **R10**: no search UI or route anywhere in `src/`.
- **R11 correction** (GLM's own): the related-essays rail was already wired.
- **Headline numbers reproduced:**
  - `main`: unit 916/917 on a Windows CRLF checkout (`shareCard.test.ts` OFL hash); e2e 72/72 only with a manually started server; lint 25 warnings.
  - GLM's tip: unit **934/934**, but only after re-checking-out `OFL.txt` (933/934 first); e2e **72/72** with the native command; lint 22; typecheck clean.
  - The Capital in Motion timing flake (`capitalConditionCaseGate.test.tsx`, 1 s `findByRole`) reproduces under local load on commits that passed minutes earlier, so it predates the branch.

### Refuted

- **R1 / F1 / F31**: production stale, GitHub→Vercel broken (§1.1).
- **K4** "identical cards on the live site": cards differ per essay on www; they break only through the apex URL (§1.2).
- **F34** "previews undeterminable; would fail at prerender": previews are on for every branch and build fine with the Preview env vars. GLM's own were `BLOCKED` by commit-author identity.
- **K6** "production does not rebuild at all": it rebuilds on every merge. The real minutes question is preview builds on every agent branch push: 40 deployments in three weeks.
- **`01-inventory.md` §0 / `03-features.md`** "sitemap and RSS serve the SPA fallback on both origins": www serves XML.
- **F2** "the banner fires after every routine save-and-reload": only when the `manual_save` revision fails to land.
- **WO-02 "closes the gap"**: it opens a worse one (§3, row 13).
- **`10-reverification.md`** "risky 5 → 0" and "G6.2 PASS, gaps closed": not with WO-02 as written, and K3 remains.
- **G3.2 "partial pass via stage deep link"**: the link names no stage and appears on no published essay (§3, row 20).
- **K3** "resolved, largely refuted" (`08-reconciliation.md`): confirmed instead. `canAutosave` requires the row, and there is no local buffer (no `localStorage`/IndexedDB draft in `src/`), so a crash, power cut or discarded mobile tab before the first manual save loses everything. `beforeunload` only helps on a deliberate close. GLM's own `03-features.md` §8 says "full loss".
- **WO-13** "the dump script now applies them": it broke the integrity log (§3, row 24).
- **Bundle claims** "editor 854 kB at end, dist 4,379 kB": the editor chunk is byte-identical across `main`, GLM and curated (`editor-B7ndAOBC.js`, 871.67 kB), and dist is 3.9 MB in all three builds (§5).

### Not reproduced

- GLM's build timings (11.5 s → 5–6 s). Mine were 5.1–5.4 s on all three branches; the difference is cache, not code.
- The exact 2/1/3 flake counts on a clean worktree.
- K5 (README and SESSION_LOG stale) was not re-checked beyond the SESSION_LOG lines quoted here, which are current.

---

## 5. Gates on the three branches

Measured on this Windows machine, Node 24.21, `npm ci` from the lockfile. Unit tests use `TZ=America/Chicago`, as CI does; the curated run used `--maxWorkers=2`, as CI does. The build skips prerender without a key, as on CI.

| | `main` @ `cf22d64` | GLM @ `43e7ec0` | curated @ tip |
|---|---|---|---|
| Lint (`eslint .`) | 0 errors / 25 warnings | 0 / 22 | 0 / 22 |
| Typecheck (`tsc -b --force`) | pass | pass | pass |
| Unit tests | 916/917 (OFL hash on CRLF checkout; CI on Linux is green) | 934/934 after OFL re-checkout (933/934 before) | **925/925**, floor 921 |
| Test-count floor | 913 | 913 (not raised) | 921 |
| E2E (Playwright, mocked Supabase) | 72/72, manual server only; `npm run test:e2e` cannot start on Windows | 72/72 native | **72/72 native** |
| Build | pass | pass | pass |
| dist total | 3,914,416 B | 3,906,123 B | 3,903,732 B |
| JS / CSS in `assets/` | 2,315,115 / 156,321 B | 2,319,719 / 143,424 B | 2,317,328 / 143,424 B |
| Entry chunk | 135.57 kB (43.16 gzip) | 135.70 kB | 135.59 kB (43.16 gzip) |
| `editor` chunk | 871.67 kB (270.05 gzip) | identical | identical |
| `ChainPlate` chunk | 176.71 kB | 115.02 kB + new `chainCurriculumMap` 62.31 kB (19.89 gzip) loaded by essay routes | 176.71 kB (as `main`) |

Every commit on the curated branch was gated (lint, typecheck, unit + floor, build) as it landed, and all were green. Two runs went red on the Capital in Motion timing flake while the machine was loaded. The same commits went green on re-run with CI's worker count, and an earlier commit that had passed failed the same way at the same time.

---

## 6. What GLM missed

1. **The second Vercel project.** Every downstream symptom GLM reported (blank page, stale bundle, generic cards, HTML sitemap) comes from one fact: the apex still belongs to `dika-s-digital-studio`. `docs/SESSION_LOG.md` on `main` already said the apex "lands on the old deployment".
2. **The owner's rebuild-on-publish plan is already staged.** GLM proposed a new deploy-hook design (R6). WO-R05 Part 4 already has the plan: gates G1 and G2 SQL in `docs/db/pending/wo-r05-rebuild/`, and G3 is the owner creating the deploy hook and storing it with `vault.create_secret`. It waits on his approval (`docs/SESSION_LOG.md`, "Then, in order", item 1).
3. **CSP Report-Only with nowhere to report.** The live header has no `report-uri` or `report-to`, so GLM's R12 ("monitor reports, then enforce") cannot work as configured.
4. **The backup does not cover Storage.** It dumps DB tables only; the 2 images in `essay-images` (278 kB) are outside it.
5. **WO-02, WO-12 and WO-13 shipped defects** that GLM's tests could not see: mixed clocks and a shared timestamp, `??=` on the e2e env, and `.length` on numbers in the dump log.
6. **Smaller items:**
   - `@radix-ui/react-alert-dialog` stays in `dependencies` after its only consumer was deleted.
   - The manual-save toast in `WriterEditor.handleSave` still collapses PostgrestError to "Unknown error"; WO-03 fixed only the autosave chip.
   - GLM did not raise `MIN_TESTS` (fixed here).
   - GLM committed under an identity Vercel blocks, so its own previews never built.
   - `main` has no branch protection: GitHub returns 403 "Upgrade to GitHub Pro or make this repository public". Any token with push rights can rewrite it.

---

## 7. Owner-only decisions, merged and re-ranked

GLM's list (R1–R23) and mine, ranked by what it protects or unlocks, each with a recommendation.

1. **Set the backup secrets and run the workflow once** (GLM R3). *Do it today.* Steps in §1.3. Five minutes, and it ends "the live DB is the only copy".
2. **Move the apex to `dikagustiana-com`** (GLM R2, re-scoped). *Do it today, right after 1.* Steps in §1.2. It fixes the blank first visit, share cards, canonicals and the sitemap at once.
3. **Retire the old project `dika-s-digital-studio`** (new). *Recommend deleting it once the §1.2 checks pass.* It is tied to the old repo and has no env vars, so it can only ever serve a blank page under a name that looks like yours. Vercel → project → Settings → Advanced → Delete. This cannot be undone. If you want to keep it, at least disconnect its Git repo so nothing redeploys it.
4. **Approve or redirect WO-R05 Part 4 (rebuild on publish)** (GLM R6, corrected). *Recommend approving the staged plan* rather than a new design. Without it, a newly published essay has no card, sitemap entry or RSS item until the next merge to `main`.
5. **A safety net before the first save** (K3, mine). *Recommend yes, as a refinement:* keep an unsaved new essay's draft in the browser (IndexedDB) until its first save creates the row, and offer it back on reopen. Today a crash before the first save loses everything typed.
6. **CI additions GLM attempted** (GLM WO-12/14). *Recommend applying both yourself* in one commit to `.github/workflows/ci.yml`: lower `--max-warnings=35` to `--max-warnings=22`, and after `npm run build` add:
   ```yaml
         - run: npx playwright install --with-deps chromium
         - run: npx playwright test
           env:
             TZ: America/Chicago
   ```
   The e2e build is safe in CI after `97b9be6` (fake env forced).
7. **CSP** (GLM R12, corrected). *Recommend* adding a `report-to`/`report-uri` endpoint first (Vercel has none built in; a free collector or a tiny edge function), or checking the browser console on the main routes yourself, then switching to `Content-Security-Policy`. The live policy already allows only `'self'` scripts and Supabase connections.
8. **Demote the Learning surfaces** (GLM R21). *Recommend yes:* move IELTS, Books and Critical Thinking out of the main nav, keeping the URLs. It is your material and your call.
9. **Capital in Motion in the finance dropdown** (GLM R22). *Recommend yes:* the framework is complete (21 conditions, 6 layers). The "absent until it has modules" rule in `src/config/navConfig.ts:23-24` dates from 2026-08-02, before the page was ported as static content (#39, 2026-10-03).
10. **Essay → chain links** (GLM R4/WO-09, dropped). *Recommend* writing them into essays as prose links using the published contract (`/?distance=finance&node=<slug>`), as `useChainUrl.ts` intends. Revisit an automatic furniture link once a pinned module has a published essay, and point it at the joint, not the homepage.
11. **Essay byline** (GLM R11b). *Recommend* one line in your words (name and one credential) if you want the CFO reader served. Only you can write it.
12. **Writer structure checklist** (GLM R18). *Recommend not yet.* Seven published essays; the standard lives with you, and a checklist is tooling to maintain.
13. **Search** (GLM R10). *Recommend not now:* seven published essays and visible structure. Revisit around thirty.
14. **Editorial shape** (GLM R23): the paused tracker, Fundamentals as "start here", sections naming their distance. *Recommend* a dated note on the tracker saying when and whether it resumes; the rest is wording only you can choose.
15. **Branch protection on `main`** (mine). *Optional:* it needs GitHub Pro on a private repo. Worth it if agents keep pushing with a token that can rewrite `main`.
16. **Unused `@radix-ui/react-alert-dialog`; the manual-save toast message** (mine). Housekeeping for a later pass.

---

## 8. How the branch was built and what pushing it does

- Each kept commit was cherry-picked with `-x`. GLM's commits keep GLM's authorship; amendments are separate commits by `Claude` directly after the commit they amend. The doc-only commits are carried as one commit at their final content. `1e47816` is carried for its test file only; `1475005` without `ci.yml`.
- `review/goals-2026-10` was not touched.
- Pushing this branch makes Vercel build one **preview** of it (preview env, read-only prerender of published essays). It does not touch production. Opening the draft PR runs CI's `pull_request` job, which has no secrets. No migration, function deploy or DB write follows from either.
