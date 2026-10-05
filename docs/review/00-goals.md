# Phase 1 — Goals translated into checks

The owner's goals, restated as pass/fail checks. These are the yardstick for every later
phase: Phase 4 and 6 apply them to the live site, Phase 5 grounds technical findings in
them, and Phase 12 re-runs them after the fixes. Each check carries an ID used throughout
`docs/review/`, and a measurability tag:

- **[code]** — decidable from the repository (source, migrations, workflow files).
- **[live]** — decidable from the public site at https://dikagustiana.com.
- **[judge]** — a reviewer's read; the doc records the evidence and the verdict.

Owner decisions that are fixed for this review (theme and authoring experience are
refined, never redesigned; the chain map keeps its swimlane form; curriculum stubs stay
visible; `/finance/finance-in-action` and `docs/company-models/` are out of scope) are
encoded as guardrails FD1–FD4 at the end. Six specific claims the owner asked to have
confirmed or refuted are listed in §8 and resolved with evidence in Phases 2–5.

---

## Goal 1 — A capital-allocation doctrine platform

*Paraphrase: the intended reader is a senior finance person in an emerging-market
multinational who is sceptical by profession. The writing earns trust by showing causal
drivers and mechanisms — how something works and why — rather than labelling phenomena.
The site must read like the work of someone who can be entrusted with capital decisions.*

| ID | Check | Tag |
|---|---|---|
| G1.1 | Sampled published essays argue with mechanisms: named drivers, causal chains, worked numbers — not topic-label prose. Sample ≥10 essays across sections. | [judge] |
| G1.2 | Claims that need support carry citations that resolve to primary sources; the essay's own Verification Register says what was checked and how. | [live]+[judge] |
| G1.3 | The reading surface (typography, page furniture, absence of clutter) presents as professional finance writing on desktop and phone. | [judge] |
| G1.4 | Nothing on the public site undercuts trust: no placeholder text, no lorem, no visible debug surfaces, no broken layouts on the pages a reader reaches. | [live] |

## Goal 2 — A credibility instrument

*Paraphrase: the site is evidence of the owner's thinking, rigour and direction for
scholarship/admissions panels and research organisations in development finance and the
green transition. A panel member with ten minutes must leave knowing what he thinks, how
he works, and why it matters.*

| ID | Check | Tag |
|---|---|---|
| G2.1 | Within ten seconds of landing on the homepage, a first-time reader can state the owner's thesis and field (development finance / green transition) from what the page itself says. | [live]+[judge] |
| G2.2 | Within ten minutes starting at the homepage, a reader can reach: the owner's method (how he works), his direction (where he is going), and at least one complete piece of his best work — without a search engine and without dead links. | [live] |
| G2.3 | The about page states the direction (development finance and the green transition) and shows the method, not only a biography. | [live]+[judge] |
| G2.4 | The ten-minute path (home → about → one full essay → its section index) contains no 404s, no broken links, no unreadable layouts on a laptop and a phone. | [live] |

## Goal 3 — One intellectual architecture

*Paraphrase: the economy section reads the present from the macro side, finance reads the
same present from the micro side through unit economics, and reindustrialisation / green
finance cover how the economy shifts. Underneath them all sits the industry chain map —
raw materials to end users — in swimlane form, carrying the line "Nothing here is
complicated. It only looks that way from the wrong distance." Every section should feel
like the same chain read at a different distance.*

| ID | Check | Tag |
|---|---|---|
| G3.1 | The chain map is reachable from the homepage and from every section index in ≤2 clicks. | [live]+[code] |
| G3.2 | From any published essay, the related chain-map stage and its section are reachable in ≤2 clicks. | [live]+[code] |
| G3.3 | The chain map renders in swimlane form and carries the "wrong distance" line. | [live]+[code] |
| G3.4 | Each section index says, in its own copy, how it relates to the same underlying chain (a different distance on the same object), so the architecture is legible to a reader, not only to the author. | [judge] |

## Goal 4 — A finance curriculum honest about its progress

*Paraphrase: the finance section has six parts — 01 Fundamentals, 02 Strategic Finance,
03 Planning & Forecasting, 04 Financial Analytics, 05 Capital in Motion (a framework of 21
capital conditions in six layers, each ending in a decision rule), and 06 Finance in
Action (built elsewhere, out of scope). Many essays are stubs on purpose: they are the
progress tracker. Stubs must read as planned work, never as broken pages.*

| ID | Check | Tag |
|---|---|---|
| G4.1 | The finance section presents all six parts, and part 05 presents 21 capital conditions in six layers, each condition ending in a decision rule. | [code]+[live] |
| G4.2 | Every stub page a reader can open states what it will become and shows no error, empty shell, or placeholder content that reads as broken. | [live] |
| G4.3 | Stubs remain visible in their section indexes (they are the progress tracker — hiding them would falsify it). | [code]+[live] |
| G4.4 | The finance landing page communicates the whole shape of the curriculum — including what exists and what is still coming — in one screenful. | [live]+[judge] |

## Goal 5 — Writing held to a verification standard

*Paraphrase: essays are in British English; each opens with a hook that has no header;
section headers state findings, not topics; there is a section on boundaries and limits;
each closes without a header; each carries a Verification Register table; citations trace
to primary sources; unverifiable or misattributed quotes are rejected outright, not
caveated; the homepage and essay H1s carry the owner's own thesis, not borrowed
authority.*

| ID | Check | Tag |
|---|---|---|
| G5.1 | Every published essay carries a Verification Register table. | [code]+[live] |
| G5.2 | Structure holds on sampled essays: opening hook with no header above it, section headers that state findings, a boundaries/limits section, a closing passage with no header. | [live]+[judge] |
| G5.3 | Essay copy is British English (spot-check via the content dump and published pages). | [code] |
| G5.4 | The homepage H1/hero and essay H1s are the owner's own thesis in his own words — no borrowed authority standing in for a claim of his own. | [live]+[judge] |
| G5.5 | No quote remains that cannot be verified or that is misattributed; where the review meets one, it is flagged for rejection, not reworded. | [code]+[judge] |

## Goal 6 — A tool the owner can run alone

*Paraphrase: the owner writes and publishes through the site's own Writer Studio.
Publishing must be quick, must never lose work, and must not be able to break the public
site. Backups, share cards, sitemap, RSS and the rebuild pipeline must work without his
attention.*

| ID | Check | Tag |
|---|---|---|
| G6.1 | The blank-essay-to-published path through Writer Studio works end to end (verified in tests with Supabase mocked) and publishes in a single session's work, not a developer's sequence of steps. | [code]+[test] |
| G6.2 | No work-loss vector remains in the editor: autosave exists, works while writing, and a crashed or closed session is recoverable. Every vector found in Phases 3–4 is either closed or logged with evidence. | [code]+[test] |
| G6.3 | A publishing action cannot corrupt or take down the public site: published-page rendering depends only on published data, and editor-side failures cannot blank a public page. | [code]+[live] |
| G6.4 | Backups run on a schedule with the secrets they need; sitemap, RSS feed and per-essay share cards regenerate as part of the build/publish pipeline without manual steps. | [code] |
| G6.5 | Public site hygiene is automatic: `/sitemap.xml` and the RSS feed are current, share cards differ per essay, and admin surfaces are unreachable for anonymous visitors. | [live]+[code] |

---

## FD — Fixed-decision guardrails (apply to every fix in Phase 11)

| ID | Guardrail |
|---|---|
| FD1 | No fix may redesign the theme or the admin/authoring experience; refinements only. |
| FD2 | No fix may change the chain map away from its swimlane form. |
| FD3 | No fix may hide curriculum stubs. |
| FD4 | No fix may touch `/finance/finance-in-action`, `docs/company-models/`, or any `feat/finance-in-action-*` branch; that work happens elsewhere. |

## §8 — Specific claims to confirm or refute (owner's list)

Resolved with evidence in the phase noted; each gets a finding ID in Phase 5.

| # | Claim | Resolved in |
|---|---|---|
| K1 | `VITE_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` may be missing from GitHub Actions, breaking backups. | Phase 2 (workflows) |
| K2 | `src/lib/admin/sectionPhaseConfig.ts` may be dead code. | Phase 3 |
| K3 | There may be no safety net for an essay that was never saved. | Phases 3–4 |
| K4 | Share cards may be identical across essays. | Phases 2, 4 |
| K5 | `SESSION_LOG` and README may hold stale references. | Phase 2 |
| K6 | Vercel build minutes may be spent by rebuilds that do not need to happen. | Phases 2, 5 |
