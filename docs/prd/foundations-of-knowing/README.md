# Foundations of Knowing: what was built

The owner's PRD, plan and prompt are in [PRD.md](PRD.md), kept as given (Indonesian). This file
records what shipped, where it differs from the PRD, and the evidence. Done on 2026-10-24.
The owner said "kerjakan sampai selesai" ("work it through to the end"), so the four gates ran
straight through without stopping at each one.

## What changed

| Area | Change |
|---|---|
| Name | "Critical Thinking" displays as **Foundations of Knowing** in the nav, the footer, the section, part and essay pages (breadcrumbs, `<title>`, meta), the admin labels and `sections.name`. The DB slug stays `critical-thinking`. |
| Nav | It is the second item, right of Home, on desktop and in the phone drawer. It is a plain link, because the ten parts are on its page. The "Learning" dropdown (called "Masyarakat Baru" in the PRD) now holds Books and IELTS only. Development Finance is gone from the nav and the footer. |
| Routes | `/foundations-of-knowing` (the map of ten parts), `/foundations-of-knowing/:part` (that part's essays in `sort_order`) and `/foundations-of-knowing/:part/:slug` (an essay). |
| Redirects | `vercel.json` answers `/critical-thinking-research` and `/critical-thinking-research/:path*` with a **301** to the same path under `/foundations-of-knowing`. It answers `/development-finance` and `/development-finance/:path*` with a **301** to `/the-next-big-thing?theme=development-finance`. The same rules are also `<Navigate>` routes in `App.tsx`, for in-app links and for any host that does not read `vercel.json` (the Cloudflare risk in the PRD). A retired phase such as `clarify` lands on the section page. |
| Parts | `src/config/foundationsOfKnowing.ts` is the one constant: 10 parts with phase id, label, number and order. Pages, nav, writer and tests all read from it. |
| Stubs | Drafts are listed on the section and part pages for every reader, the way Finance lists its stubs. Readers see them muted, with no link and labelled "Planned". Admins get a link to the editor. A published essay links to its page. |
| Admin | When the section is Foundations of Knowing, the writer's placement picker (the category select in Post settings) offers the ten parts as "Part N · Label". Picking one sets `essays.phase` through `derivePhase`. The live-URL preview shows `/foundations-of-knowing/<part>/<slug>`. Other sections are unchanged. |
| URL builders | `essayUrl`, `canonicalPath.mjs` (prerender, sitemap, RSS) and `buildCanonicalUrl` all build `/foundations-of-knowing/<part>/<slug>`. An essay with no part goes to `/essays/<slug>`, the universal route. The `development-finance` branches are removed. |
| Development Finance | It is now the theme `development-finance` of The Next Big Thing, added last in `NEXT_BIG_THING_THEMES`. It appears in the header dropdown, the sub-nav tabs, the topic filter and the writer's picker. The old section's line shows under the heading when the feed is filtered to the theme. Its three pages were deleted: `DevelopmentFinance.tsx`, `DevelopmentFinancePhase.tsx` and `DevelopmentFinanceEssayPage.tsx`. The feed's topic badge now shows the theme's label instead of the raw id. |

## Database (migration `20261024185538_foundations_of_knowing`, applied)

- `essay_structure` gains `phase` and `sort_order`, appended. An anonymous reader can see a draft's
  title only through this view, so the part pages need both columns. Both are placement and
  ordering, which the view's 2026-08-03 contract already allows. Bodies stay out.
- 10 categories `critical-thinking-<part>`, named "Part N · Label", sort_order N. The writer
  places an essay by its category, and `essays.category_id` is NOT NULL, so the parts must exist
  as categories. The PRD's SQL did not cover this.
- 1 category `next-big-thing-development-finance`, sort_order 7.
- `sections.name` = 'Foundations of Knowing'.
- 56 stubs: `status='draft'`, `published=false`, `content` NULL, `voice_role` 'economist' (taken
  from the section), `sort_order` = part × 100 + place in the part, category = the part's row.
- Preconditions checked inside the migration: 0 critical-thinking essays before the seed, and no
  seed slug already taken. The migration was dry-run in a rolled-back transaction first.
- Checked after applying: 56 rows, 10 phases, counts 2/6/5/6/7/5/7/6/6/6, sort_order unique
  (1–2, 101–106, …, 901–906), all plain drafts. The five published Next Big Thing essays are
  unchanged (growth ×3, economy, technology).
- `public.sections` has no `development-finance` row, and no essay carries that section, so
  nothing was deleted.
- `src/integrations/supabase/types.ts` was regenerated from the live schema. The diff also
  carries tables other sessions added (`ds_*`, `_wp3_stage`, …) that the file had not caught up with.

## Not done, and why

- **The manifesto is unchanged.** The PRD left it as "[ISI SENDIRI]" ("fill it in yourself"), and
  only the owner can write it. It still reads "Critical thinking is pattern recognition applied
  to claims. It is trainable." No page renders it, because the manifesto banner was retired.
  When the text is ready:
  `UPDATE public.sections SET manifesto = '<text>' WHERE slug = 'critical-thinking';`
- **No agent pipeline to update.** The PRD names `critical-thinking-researcher` and a checker
  with phase validation. Neither exists in this repository (searched for `researcher`, `checker`,
  `.claude/agents`). If they live elsewhere, their phase list is `FOUNDATIONS_PARTS` here.
- **There was no homepage card to remove.** The homepage's Sections list was taken out on
  2026-10-09. Development Finance's only remaining doors were the nav, the footer and the routes.
- **There was no admin "development-finance" section option to remove.** `AdminContent`'s
  filter never listed it, and `public.sections` has no such row.
- **The world registry is untouched.** `src/lib/world` still has a `development-finance` room.
  It is switched off (`on: false`) and its file is generated, so changing it belongs to the
  world's own regeneration.
- **Files kept, not renamed.** The PRD's hard rule allows deleting only Development Finance
  files. The new pages were therefore written into `CriticalThinkingResearch.tsx`,
  `CriticalThinkingPhase.tsx` and `CriticalThinkingEssay.tsx`. Their names follow the slug.
- **Work branch.** The work went on the session's designated branch, not
  `feat/foundations-of-knowing`. A PR was opened and nothing was merged.

## Evidence

- `npm run typecheck` passed. `npx eslint . --max-warnings=35` gave 0 errors and 22 warnings.
  `npx vitest run` passed in full. The new test file `tests/unit/foundationsOfKnowing.test.ts`
  ties the parts constant to the migration's categories and stubs (counts and sort_order), checks
  the four 301s in `vercel.json`, and checks the theme's place.
- `npm run build` passed.
- Browser run against the built site (`vite preview`): the sandbox cannot reach the Supabase
  host, so the browser was served the live rows read through the Supabase connector. Results:
  no horizontal overflow at 390 px or 1440 px. The section page lists the ten parts as "0 of N
  published" with N = 2/6/5/6/7/5/7/6/6/6. Every old address lands where it should. Finance,
  Accounting and Green Transition render. The only console error was
  `/_vercel/insights/script.js`, which exists only on Vercel.
- The writer save path, checked in a rolled-back transaction: a Foundations essay on
  `critical-thinking-logic` and a Next Big Thing essay on the Development Finance category both
  save. A category from another section is refused by `validate_essay_placement`. No rows were
  left behind.
- Screenshots: [shots/](shots/).
