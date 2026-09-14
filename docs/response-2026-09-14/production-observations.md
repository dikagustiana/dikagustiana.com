# Production observations

Version 1 · 14 September 2026 · every line below is a **runtime observation**, made
from this session by HTTP request, with the URL and the method named. Nothing here is
inferred from repository source.

## Method and limits

- **Method**: `curl` over HTTPS from the execution environment on 14 September 2026, plus
  Chromium (Playwright) against a *local* build for layout checks. Response codes, byte
  sizes, and the raw HTML of each response were recorded.
- **Deployment identity**: **not determinable**. The Vercel account reachable from this
  session (`team_qkOkuTIM75I336YmxaGlDwWZ`) lists **no projects**, so the deployed commit,
  the project's git connection and its build settings could not be read. Every claim below
  is therefore about *what the origins serve*, never about which commit produced it — with
  one dated exception, marked where it appears.
- **Not checked**: HTTP caching headers, CDN behaviour, redirect chains beyond one hop,
  robots.txt handling, or any authenticated surface.

## 1. Two origins serve this site, and they are not the same build

| Host | Response | What it serves |
| --- | --- | --- |
| `https://www.dikagustiana.com/` | 200, 1 985 bytes | A build matching the repository's `index.html`: favicon links, `og:url`, **absolute** `og:image`, `twitter:image`. |
| `https://dikagustiana.com/` (apex) | **308 → `https://dika-s-digital-studio.vercel.app/`** | That host returns 200, 1 139 bytes: **no** favicon links, **no** `og:url`, **no** `twitter:image`, and `og:image` is the **relative** `/logo.png`. |

The apex build predates repository commit `c739e1a` (2 August 2026), which added exactly
those four things. That is the one dated claim, and it rests on served bytes plus `git log
-S`, not on deployment metadata. As of the audit baseline (`8898393`, 8 September 2026)
**39 commits** sit after `c739e1a` on `main`.

Corroborating, on the apex host:

| Asset | Result |
| --- | --- |
| `/og-image.png` | 200, **1 139 bytes** — the SPA shell, not an image. The file does not exist there; the `/(.*) → /index.html` rewrite catches it. |
| `/apple-touch-icon.png` | 200, **1 139 bytes** — same. |
| `/favicon.ico` | 200, 20 373 bytes — a real file. |

On `www` the same `/og-image.png` returns **53 103 bytes** of image.

### Why this matters more than it looks

`SITE_ORIGIN` is `https://dikagustiana.com` (no `www`), so **every canonical link and every
`og:url` the site emits points at the apex** — which 308-redirects to the stale origin,
where the per-essay files do not exist. A crawler that follows the canonical URL from the
current build lands on the old one and gets the generic card.

Verified: `https://www.dikagustiana.com/the-next-big-thing/economy/indonesias-reindustrialization-bet`
emits `<link rel="canonical" href="https://dikagustiana.com/the-next-big-thing/economy/indonesias-reindustrialization-bet" />`,
and that URL redirects to a host where the same path returns the 1 139-byte generic shell.

**This is a deployment and DNS matter, not a source defect, and it is not fixed in this
branch.** Pointing the apex at the current project, or making `www` the canonical origin,
is a production configuration change and outside what this work is authorised to do. See
the handoff.

## 2. Per-essay share cards work — on `www`

The prerender step is live there. Each published essay has its own static HTML with its own
tags:

| Route | Title in raw HTML | Canonical |
| --- | --- | --- |
| `/the-next-big-thing/economy/indonesias-reindustrialization-bet` | `Indonesia's Reindustrialization Bet \| Dika Gustiana` | apex + path |
| `/finance/analytics/driver-tree-construction` | `Driver Tree Construction \| Dika Gustiana` | apex + path |
| `/essays/site-rebuild-note` | `Site Rebuild Note: What Was Lost, and What Survived \| Dika Gustiana` | apex + path |

So the discoverability claim the repository makes **is** supported by crawler-visible output
— at the origin that serves the current build.

On the apex host, **all eight routes tested returned the identical 1 139-byte generic
shell**, including the three essays above. The feature is not live there.

### One defect found in that output, and fixed in this branch

`indonesias-reindustrialization-bet` has a deck ending in a newline, and it lands *inside*
the `content` attribute of five tags:

```
<meta property="og:description" content="Carbon Liability, Capital Sequencing, and The Conditions For Payoff
" />
```

`scripts/prerender.mjs` and `src/components/SEO.tsx` now collapse whitespace before
truncating. Fixed in source; **not yet visible in production**, which needs a deploy.

## 3. A URL that does not exist returns 200

`https://www.dikagustiana.com/this-page-does-not-exist-9f3a` → **HTTP 200**, the 1 985-byte
generic shell, with `og:url` claiming `https://dikagustiana.com/`. The React `NotFound`
route renders after JavaScript runs, so a human sees a 404 page and a crawler sees a
successful page.

This is a direct consequence of `vercel.json`'s `/(.*) → /index.html` rewrite, which every
client-routed SPA needs. Fixing it properly means either a status-aware rewrite or
server-side rendering, and the audit is explicit that neither should be prescribed from
this position. **Recorded, not fixed.** It is also the reason the audit's warning holds: a
200 on a route proves nothing about whether that route is a page.

## 4. Map-state URLs

`https://dika-s-digital-studio.vercel.app/about?lens=green&distance=finance&node=energy`
returns the same shell as `/about` — the query is not part of the served file, which is
correct: the map state is client state and the canonical URL strips the query. On `www` the
same holds. Nothing to fix.

## 5. What the earlier audit could not see, and why

The 13 September audit recorded that attempts to retrieve public pages failed, and was
right not to treat that as an outage. Production was reachable throughout this session.
Two of the three most consequential findings here — the two divergent origins, and the
soft 404 — are invisible from source, and the third (the newline in a deck) lives in the
database rather than the repository.

## Status of every claim above

| Claim | Status |
| --- | --- |
| Two origins serve different builds | Runtime-verified, 14 Sep 2026 |
| The apex build predates `c739e1a` | Inferred from served bytes + `git log -S`; strong, not certain |
| Canonical/`og:url` point at the redirecting apex | Runtime-verified |
| Per-essay prerender is live on `www` and absent on the apex | Runtime-verified |
| A nonexistent URL returns 200 | Runtime-verified |
| The deployed commit, and which repository each project builds from | **Unverifiable from this session** |
| Whether the apex redirect is deliberate | **Unverifiable.** The hostname matches the stale mirror repository's name; that is a coincidence worth checking, not a finding. |
