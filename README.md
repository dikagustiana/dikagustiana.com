# dikagustiana.com

A personal essay site covering finance, economics, and the green transition, with a
finance curriculum (sections → modules → essays) authored through an in-app CMS. Public
pages are anonymous-readable; authoring is admin-only.

- **Frontend:** Vite 5 · React 18 · TypeScript 5.8 · Tailwind 3 · shadcn/ui · React Router 6 ·
  TanStack Query 5 · TipTap 3 · Recharts · Zod · DOMPurify · KaTeX
- **Backend:** Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js`, one edge
  function (`council-review`, the AI "Writing Council")
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

The `council-review` edge function additionally needs, set as Supabase function secrets:

| secret | what |
|---|---|
| `AI_GATEWAY_URL` | base URL of an OpenAI-compatible chat-completions API |
| `AI_GATEWAY_API_KEY` | key for that API |

Without them, `/admin/council` renders an explicit "not configured" state rather than
erroring. `SUPABASE_URL` and the anon/publishable key are injected by the platform.

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
- `supabase/functions/council-review/` — the one edge function
- `docs/` — schema plan, decisions, session log, and per-session reports
