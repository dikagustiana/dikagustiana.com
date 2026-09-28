# dikagustiana.com

A personal essay site covering finance, economics, and the green transition, with a
finance curriculum (sections → modules → essays) authored through an in-app CMS. Public
pages are anonymous-readable; authoring is admin-only.

- **Frontend:** Vite 5 · React 18 · TypeScript 5.8 · Tailwind 3 · shadcn/ui · React Router 6 ·
  TanStack Query 5 · TipTap 3 · Recharts · Zod · DOMPurify · KaTeX
- **Backend:** Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`, one edge
  function (`link-preview`, which resolves a pasted URL to plain-text link-card metadata
  for the editor)
- **Hosting:** Vercel

## Running locally

```sh
npm ci
cp .env.example .env   # then fill in the two VITE_SUPABASE_* values
npm run dev            # Vite dev server
```

Scripts: `npm run build`, `npm run typecheck`, `npm run test:unit`, `npm run lint`.

## Environment variables

The client reads exactly two (see `src/integrations/supabase/client.ts`):

| var | what |
|---|---|
| `VITE_SUPABASE_URL` | the Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the publishable / anon key (protected by RLS) |

Vite inlines `import.meta.env` **at build time**, so changing these requires a rebuild —
setting them on the hosting platform without redeploying changes nothing. `.env` is
gitignored; production values live on Vercel.

## Edge function: `link-preview`

`supabase/functions/link-preview/` resolves a pasted URL to plain-text metadata (title,
description, author, source, published date) for the editor's link card. The editor calls
it at **authoring time** from the link-card dialog's **Fetch details** button. Published
pages never call it: they render the snapshot stored in the essay.

- **It needs no secrets.** It reads only what the platform injects: `SUPABASE_URL` and the
  project's publishable key (`SUPABASE_PUBLISHABLE_KEYS`, falling back to the legacy
  `SUPABASE_ANON_KEY`). There is no AI provider and nothing to configure.
- **Admin-only, checked twice.** It is deployed with `verify_jwt = true`
  (`supabase/config.toml`). The function also re-checks the caller's own token: Auth must
  return a user, and `public.user_roles` (read under that user's RLS) must hold their admin
  row. It constructs no service-role or secret-key client.
- **SSRF-hardened.** It accepts https only and port 443 only, and refuses any host that
  resolves to a non-public address. It follows at most 3 redirects, re-checking each hop,
  within a 5 s budget per fetch and a 512 KiB body cap. See the header of `resolve.ts`.
- **Metadata only.** Provider oEmbed HTML is read for its text and discarded. No markup
  reaches the editor or the database.
- **Deploy** through the Supabase MCP `deploy_edge_function` with `verify_jwt: true`,
  behind the owner's human gate. The resolver's logic is tested offline in
  `tests/unit/linkPreview.test.ts`.

The earlier `council-review` function (the AI "Writing Council") was removed on 2026-08-01;
its slug survives on the project only as a 410 tombstone until the owner runs
`supabase functions delete council-review`. Its `AI_GATEWAY_*` secrets are no longer used.

## Build pipeline

`npm run build` is `vite build && node scripts/prerender.mjs`, and Vercel runs it on every deploy.

1. `vite build` writes the single-page app into `dist/`.
2. `scripts/prerender.mjs` fetches the published essays with the publishable key. RLS returns
   published rows only. For each essay that owns its URL, the script does three things:
   - it writes `dist/<canonical path>/index.html`: the app's shell carrying that essay's
     `<title>`, description, Open Graph and Twitter tags, and canonical, for crawlers that run no
     JavaScript, WhatsApp's included;
   - it draws the essay's share card, `dist/og/<slug>.png` (1200 × 630,
     `scripts/lib/shareCard.mjs`);
   - it sets `og:image` to the essay's hero image when it has one, else to that card
     (`src/lib/shareImage.mjs`). The app imports the same formula, so hydration keeps the image.
   It then writes `dist/sitemap.xml` and `dist/rss.xml` from the same list, so there is no second
   route table. An accounting essay whose canonical is a page (an FSLI or topic page) is skipped.
3. **The build fails rather than ship a generic card.** Each of these exits 1:
   - a Vercel build without the key;
   - a failed fetch, or zero published essays;
   - a title the font cannot draw;
   - a card over 300 KB;
   - a tag that did not land.

   A keyless build outside Vercel, which is what CI runs, skips the prerender and says so.

The card renderer (satori and resvg, both devDependencies) runs only in this script, and nothing
of it reaches `dist/assets/`. Its fonts, and where they came from, are in `scripts/og-fonts/`.
Two scripts check the result without a deploy:
- `VITE_SUPABASE_PUBLISHABLE_KEY=… node scripts/render-share-card-review.mjs` redraws the review
  set in `docs/review/share-cards/`;
- after a keyed build, `node scripts/check-share-parity.mjs` compares each page's raw `og:image`
  with the hydrated one in Chromium.

**Freshness:** the pages, cards, sitemap and feed are as fresh as the last deploy. Publishing,
editing or unpublishing does not rebuild the site yet. The database-driven rebuild (WO-R05 Part 4)
is staged in `docs/db/pending/wo-r05-rebuild/` and **not applied**; until it is, redeploy after a
change. When it lands, this section gains the rebuild hook and how to rotate it.

## Database & migrations

The schema and its rationale are documented in `docs/SCHEMA_PLAN.md`; design decisions in
`docs/DECISIONS.md`. Migrations live in `supabase/migrations/`, named
`YYYYMMDDHHMMSS_description.sql` so filename order is apply order.

**All schema changes are applied through the Supabase `apply_migration` tooling — never
`supabase db push`, `supabase db reset`, or any CLI migration command.** Every table has
Row Level Security enabled with an explicit policy (deny-by-default); the invariant is
"zero tables without a policy". `supabase/migrations/_archive/` preserves the pre-rebuild
migration history and must not be deleted.

## Repository layout

- `src/` — the application
- `src/integrations/supabase/types.ts` — auto-generated from the live schema; replace, never hand-edit
- `src/lib/tiptap/` — the editor's node schema (`extensions.ts`) and HTML serialization (`serialize.ts`)
- `supabase/functions/link-preview/` — the one edge function (admin-only link-card metadata)
- `scripts/prerender.mjs`, `scripts/lib/` — the build's post-step: pre-rendered essay pages, share cards, sitemap and feed
- `docs/` — schema plan, decisions, session log, and per-session reports
