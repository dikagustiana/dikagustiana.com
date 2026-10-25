# Oyenza Studio fork — "Progress" tab: PRD, architecture, design, plan and routines

Version 1.0 · 25 Oct 2026 · Owner: Dika · Repo: `C:\work\oyenza-studio`, branch `more-me`
Companion files in `docs/more-me/`: `PROGRESS-PROMPTS.md` · `PRD.md` (study tabs, phases 0–9) · `WEALTH-PRD.md` (phases 10–17) · `CASHFLOW-CONTEXT.md` · `REPORT.md`
Mockup: the "Progress Tab Mockup" artifact from the planning chat (Writing segment shows real counts as of 25 Oct 2026 15:31 WIB).

Facts about the fork keep the tags from the earlier context files: **[observed]**, **[inferred]**, **[unknown]**. Facts about the site database were read directly from Supabase project `asypkbkiebjvvpimewfp` on 25 Oct 2026 and are marked **[db]**. Everything else is a design decision from the planning chat. Phases continue the `more-me` numbering from 18.

---

## 0. Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | Purpose | One tab, **Progress**, for the owner's intellectual output: writing, research, and the agents doing research for him. Three segments: Writing · Research · Agents |
| 2 | Tab row | Progress sits right after Wealth. **Today** leaves the tab row and becomes the fifth tile in the More section on "+". Tab count stays at 10 |
| 3 | Writing source | dikagustiana.com's Supabase, read through one edge function (`progress-feed`). Essays, sections, word counts and dates come from there. No essay input on the island |
| 4 | Writing outside the site | A small local list, "Elsewhere" (title, venue, words, status), entered on the island. Shown as a fourth filter. Needed because at least two current pieces (the MSCI essay, "The best time ever for an idea guy") are not in the site database [db] |
| 5 | Draft vs blank | `status = 'published'` → Published. `status = 'draft'` with ≥ 50 words → Draft. `status = 'draft'` with < 50 words → Blank. `archived` excluded. Reason: every curriculum stub is stored as `draft` [db], so status alone cannot separate work in progress from empty slots |
| 6 | Section integrity | An essay whose `section` slug is not in `sections` is flagged "No section" in orange (one such essay exists today [db]). The island only flags; the fix is on the site |
| 7 | Research, Lab | Indonesia Industrial Lab research is **local only** (`progress.json`), six stages (Scope · Data · Analysis · Draft · Review · Out), next step, due date, stalled after 14 days. It never goes to the site database: the site is public and its database is shared with other agents |
| 8 | Research, FSRE | Model-bank coverage read from the site feed (`fs_company`, `fs_period`) [db]. Grouping by sub-industry needs a column that does not exist yet; v1 shows a flat company list unless the site adds `fs_company.sub_industry` (phase 18 decision) |
| 9 | Agents source | Hermes on the VPS reports each run to a table `agent_runs` in the site's Supabase through a second edge function (`agent-run-report`) with its own token. The island reads runs through `progress-feed`. The VPS never holds a Supabase key |
| 10 | Agents metric | Tokens per run and per day by default. `cost_usd` shown when Hermes reports it; never computed by the island |
| 11 | Fetch rule | Fetch on page open and every 60 s while the Progress page is open. **Background exception:** while the last feed showed at least one running agent, fetch every 180 s via `next_wake` for at most 2 h after the page was last open, never in battery saver. Otherwise nothing runs |
| 12 | Credentials | One bearer token for `progress-feed`, pasted once on the island, stored DPAPI-sealed at `%LOCALAPPDATA%\Poni\progress-feed.bin` via the existing `services/secret.rs` [observed]. Never in `progress.json` or `settings.json` |
| 13 | HTTP in the fork | One short-lived thread per fetch (`std::thread::spawn`, exits on completion), posting an `AppEvent` back. No resident worker thread. The HTTP primitive is whatever `services/oyenza.rs` uses, reused through a shared helper if one exists, otherwise a minimal copy in a new file [unknown, verify in phase 20] |
| 14 | Control | Read-only. No stop, retry or dispatch of agents from the island in v1 |
| 15 | Privacy | Essay titles and research titles are the owner's own work and are shown. Agent task strings are shown as Hermes reports them; Hermes should not put client data in `task` (noted in the VPS hook spec) |

---

## 1. PRD

### 1.1 Problem

The owner's output lives in four places: essays in the site database, research notes for Indonesia Industrial Lab, the FSRE model bank, and Hermes agent runs on a VPS. None of them shows progress at a glance, and a finished or failed agent run is only noticed by looking at the VPS. The island is on screen all day; a Progress tab makes "what is moving, what is stalled, what just finished" one hover away.

### 1.2 User

One person, the owner. He writes in the site's TipTap editor, runs Lab research on his laptop, and runs FSRE agents on Hermes.

### 1.3 Goals

- G1 Writing progress by section and by essay, read from the site database with no second entry.
- G2 Lab research tracked locally with stages, next step, due date and a stalled flag.
- G3 FSRE coverage read from the site database.
- G4 Agent runs from the VPS, with running/done/failed state and token use, and a notice when a run ends.
- G5 Nothing runs at rest beyond the bounded background rule in §0 row 11.
- G6 Additive to the fork; one site-side edge function pair; one VPS-side hook. No Oyenza code touched.
- G7 No database key on the laptop or the VPS.

### 1.4 Non-goals (v1)

- Editing essays, sections or FSRE data from the island.
- Agent control (stop, retry, dispatch).
- Personal OS Lab integration.
- Sub-industry grouping of FSRE unless the site adds the column.
- A collapsed-island pill ("Modeler done").
- Mac beyond compiling.

### 1.5 Layout change

**Tab row:** Music · IELTS · LPDP · Campus · Wealth · **Progress** · Tasks · System · [Prayer] · Add-ons (+).
`PageKind::Today` leaves `tabs()` and stays reachable via `Command::SetPage`; the More section on "+" becomes Focus · Health · Shelf · Clipboard · **Today**. Any shortcut or notice that opens Today must keep working [verify in phase 20].

**Progress page:** key `progress`, title "Progress", icon `BarsUp` (three rising bars on a baseline, new in `icons.rs`). Height = the Oyenza page height (262 [observed]). Segment switch at the top as on Wealth: Writing · Research · Agents, with a right-aligned meta string per segment ("61 of 263 published · 13 archived", "Lab: local · FSRE: site", "Hermes · 2 running · synced 1 min ago").

### 1.6 Segment: Writing

**Content**
1. **Sections grid** (two columns, one row per section from `sections` ordered by `sort_order`, plus "No section" when any essay is orphaned): name, a two-tone bar (green = published share, orange = draft share, of the section's active total), and "published/total".
2. **Filter row:** Draft · Published · Blank · Elsewhere, each with its count. Default Draft. The column header on the right changes with the filter: "words · last edited" (Draft), "words · published" (Published), "section" (Blank), "venue · words" (Elsewhere).
3. **Essay list** (scrollable, rows 24 high): title (ellipsised), section, and the filter's right-hand figures. Draft rows older than 14 days show the date in red (stalled). Blank rows sorted by section then `sort_order`; Draft and Published by `updated_at` desc. Clicking a row opens the essay's admin URL in the browser (`Command::OpenUrl`, URL pattern from the feed).
4. **Input row**, only on the Elsewhere filter: grammar in §2.5.

**Acceptance criteria**
- AC-W1 With the feed as of 25 Oct 2026 [db], the sections grid shows Finance 18/162, Accounting 36/36, Green Transition 2/3, The Next Big Thing 5/5, Foundations of Knowing 0/56, No section 0/1; the filters read Draft 1 · Published 61 · Blank 201.
- AC-W2 The single draft ("Why Indonesia Cannot Afford to Wait", 1.796 words, 10 Oct) shows in red as stalled.
- AC-W3 "Climate Adjusted Cost of Capital" appears under Blank with an orange "No section" tag.
- AC-W4 `elsewhere "MSCI and investment grade" substack 2400 draft` adds a row under Elsewhere; `elsewhere "MSCI and investment grade" published` updates it; `elsewhere "…" rm` removes it with Undo.
- AC-W5 Without a token stored, the segment shows the token empty state (§2.7); with a token but no feed yet, "Loading from dikagustiana.com…" once, then the data or an error line with the HTTP status.
- AC-W6 Word counts in the list use the house format (1.796).

### 1.7 Segment: Research

**Content**
1. **Lab list** (left, scrollable): six-step mini stepper (done green, current blue, pending grey), title, "next step · due". Stalled (no change for 14 days) rows show "stalled N d" in red and dim the title. Footer "Scope · Data · Analysis · Draft · Review · Out".
2. **FSRE list** (right, scrollable): one row per `fs_company` with a bar = published periods / total periods and "n/m"; grouped by `sub_industry` when the feed provides it, flat otherwise. Footer "N companies · M periods published".
3. **Input row:** Lab grammar in §2.5.

**Rules**
- Stages are an index 0–5. `lab <name> next: <text>` sets the next step and touches `updated`. `lab <name> stage data` or a click on the stepper sets the stage and touches `updated`. `lab <name> due 30/11` sets the due day. `lab <name> done` sets stage Out.
- Stalled = `today − updated ≥ 14 days` and stage < Out.
- One notice per stall episode: key `lab:{id}:{updated}` in `noticed`; evaluated at load and at local day change while the page is open.

**Acceptance criteria**
- AC-R1 `lab new "Nickel downstreaming: value capture" due 8/11` creates a row at Scope with the due day.
- AC-R2 Clicking the third stepper dot sets Analysis and clears a stalled flag.
- AC-R3 A row untouched for 14 days turns red and raises one notice; touching it clears both; a second stall after a later touch raises a new notice.
- AC-R4 FSRE list shows every `fs_company` with its period counts; with `sub_industry` present the list is grouped with a header per group.
- AC-R5 Empty states for both columns.

### 1.8 Segment: Agents

**Content**
1. **Cards row:** Running (blue), Done today, Failed today (red when > 0), Tokens today (house format, "1,2 M" style).
2. **Runs list** (left, scrollable): running runs first with a pulsing blue dot and elapsed time, then today's finished runs newest first with Done/Failed tags and end time, then older runs (last 7 days). Row: `{agent} — {task}` ellipsised. Hover shows the error string for Failed in a tooltip.
3. **Right:** 7-day token sparkline (area + line, last point emphasised, value labels in the house format), then "Last failure: …" footnote.
4. No input row.

**Rules**
- A run is `running` until the report hook sends `done` or `failed`; a run still `running` 6 h after `started_at` is shown as "stale" in orange (Hermes probably died) and is not counted as running for the background fetch rule.
- Notices: on each feed, for every run whose status changed to done or failed since the last feed and whose key `run:{id}:{status}` is not in `noticed`, raise "Modeler finished · UNTR FY2025" or "Framer failed · ADRO segment split" with `NoticeAction::OpenPage(Progress)`, then record the key.
- The pulsing dot uses `request_anim` only while the Agents segment is visible and at least one run is running.

**Acceptance criteria**
- AC-A1 Seeded feed with 2 running, 7 done, 1 failed renders the cards and list in that order.
- AC-A2 A run that flips to failed between two feeds raises exactly one notice, and never again after restart.
- AC-A3 A run started 7 h ago and still running shows "stale" and does not keep the background fetch alive.
- AC-A4 Leaving the Progress page while a run is running arms the 180 s background fetch; it stops after the run ends or after 2 h; it never arms in battery saver.
- AC-A5 Sparkline values and the Tokens card use the house number format.
- AC-A6 Empty state when the feed has no runs.

### 1.9 Data sources, field by field

| Data | Source | Lives in |
|---|---|---|
| Sections (slug, name, sort_order) | site `sections` [db] via `progress-feed` | memory only, refreshed per fetch |
| Essays (id, title, section, status, words, updated_at, admin URL) | site `essays` [db], words computed in the edge function | memory only |
| FSRE companies and periods | site `fs_company`, `fs_period` [db] | memory only |
| Agent runs (id, agent, task, status, started_at, ended_at, tokens_in, tokens_out, cost_usd?, error?) | site `agent_runs` (new), written by `agent-run-report` from the VPS | memory only; `noticed` keys in `progress.json` |
| Daily token totals (7 days) | computed in the edge function from `agent_runs` | memory only |
| Lab research | owner | `progress.json → labs` |
| Elsewhere writing | owner | `progress.json → elsewhere` |
| Feed token | owner, once | `progress-feed.bin` (DPAPI) |
| Last feed snapshot | app | `progress.json → last_feed` (so the page shows something before the first fetch after start; titles only, no content) |
| Notice keys, last fetch time, background-arm deadline | app | `progress.json` |

### 1.10 Light-cost budget

- Page open: one fetch, then one per 60 s while open. Each response is a few tens of KB (essay metadata for ~280 rows, runs for 7 days).
- Background: only under §0 row 11. Worst case 40 fetches over 2 h, then silence.
- Threads: one short-lived thread per fetch; none at rest.
- Animation: the pulsing dot only while Agents is visible and something is running.
- Disk: one atomic write of `progress.json` per local mutation or notice; the `last_feed` snapshot is written at most once per minute.

### 1.11 Persistence and privacy

- `%APPDATA%\Poni\progress.json` + `.bak`, `version: 1`, `#[serde(default)]` everywhere, same corrupt-file rule and banner as `study.json`.
- Token sealed with DPAPI; removing it (`token clear`) deletes the file.
- The feed carries essay titles, Lab-free site data and agent task strings; no essay bodies, no Supabase keys. Lab research never leaves the laptop.
- The site-side functions use the service role internally and expose nothing without the bearer token; RLS stays on for all tables, and `agent_runs` has no anon or authenticated policies.

### 1.12 Risks

| Risk | Handling |
|---|---|
| HTTP primitive in the fork unknown | Phase 20 Verify A; copy the minimal client into `services/progress_http.rs` if no shared helper exists |
| Edge function cold starts slow the first fetch | Show the last snapshot immediately; the fetch replaces it |
| Hermes internals unknown; the hook may not fit its lifecycle | The hook is a plain script with two calls (start, end); phase 19 adapts it; the island treats missing `end` as "stale" after 6 h |
| `fs_company` has no sub-industry today [db] | Flat list in v1; grouping switches on when the column exists |
| Word count differs from the editor's | Documented as "approximate, HTML stripped"; the editor's count stays authoritative |
| Tab row conflict with upstream | Same pattern as the study and Wealth changes; listed in §4 |

### 1.13 Backlog (v2+)

1. Collapsed pill for agent runs ("Modeler · 12 min").
2. Stop/retry a run from the island through a third edge function.
3. Personal OS Lab sync for research.
4. Sub-industry grouping and target coverage per sub-industry.
5. Elsewhere pieces linked to Lab research items.

---

## 2. Architecture

### 2.1 Files

```
crates/poni-core/src/progress/
  mod.rs        Progress root (local data), load/save, Undo snapshot, noticed keys, background-arm state
  feed.rs       Feed types (serde) and parse_feed(); writing classification (Draft/Blank rule, No section)
  lab.rs        Lab item, stage enum, stalled(), next-step/due/stage transitions, parse_lab()
  elsewhere.rs  Piece, parse_elsewhere()
  agents.rs     Run status rules (stale), notices_for(prev, next), day totals formatting
  parse.rs      quoted names, days (reuse study/parse day rule), house-format numbers
crates/poni-core/src/lib.rs            + pub mod progress;

crates/poni/src/services/progress_http.rs   fetch_feed(url, token) on a spawned thread → AppEvent::Progress(Result<Feed, String>)
crates/poni/src/pages/
  progress.rs            page: switch, meta, token empty state, delegates to segments
  progress_writing.rs, progress_research.rs, progress_agents.rs
crates/poni/src/pages/mod.rs           PageKind::Progress; tabs(): + Progress, − Today; content_height; draw_page; next_wake
crates/poni/src/pages/<addons>.rs      More: + Today tile
crates/poni/src/events.rs              AppEvent::Progress(...)
crates/poni/src/state.rs               AppState.progress, progress_ro, progress_feed: Option<Feed>, progress_fetching: bool; PageUiState fields
crates/poni/src/commands.rs            Command::SaveProgress, Command::FetchProgress
crates/poni/src/app.rs                 load progress.json; token load/save via services::secret; apply AppEvent::Progress; fetch scheduling; notices
crates/poni/src/paths.rs               progress_path(), progress_backup_path(), progress_token_path()
crates/poni/src/icons.rs               Icon::BarsUp
crates/poni/src/selftest.rs            seed_progress(), fake Feed, scenes

Site repo (dikagustiana.com), supabase/functions/
  progress-feed/index.ts        GET, bearer PROGRESS_FEED_TOKEN, returns the Feed JSON (§2.3)
  agent-run-report/index.ts     POST, bearer AGENT_REPORT_TOKEN, upserts agent_runs
  migrations: agent_runs table; optional fs_company.sub_industry

VPS (Hermes)
  ~/hermes/hooks/report_run.sh  two calls: start and end (§5)
```

### 2.2 Types (sketch)

```rust
// progress/mod.rs
pub struct Progress {
    #[serde(default)] pub version: u32,                 // 1
    #[serde(default)] pub labs: Vec<Lab>,
    #[serde(default)] pub elsewhere: Vec<Piece>,
    #[serde(default)] pub noticed: Vec<String>,
    #[serde(default)] pub last_feed: Option<Feed>,      // titles and counts only
    #[serde(default)] pub last_fetch_unix: u64,
    #[serde(default)] pub bg_until_unix: u64,           // background fetch armed until this time, 0 = off
    #[serde(default)] pub next_id: u64,
}

// progress/lab.rs
pub enum Stage { Scope, Data, Analysis, Draft, Review, Out }     // index 0..=5
pub struct Lab { id: u64, title: String, stage: Stage, next: String, due: Option<Day>, updated: Day, notes: String }

// progress/elsewhere.rs
pub enum PieceStatus { Draft, Sent, Published }
pub struct Piece { id: u64, title: String, venue: String, words: u32, status: PieceStatus, updated: Day }

// progress/feed.rs  (mirrors the edge function JSON exactly)
pub struct Feed { generated_at: String, writing: Writing, fsre: Fsre, agents: Agents }
pub struct Writing { sections: Vec<SectionRow>, essays: Vec<EssayRow>, admin_url_pattern: String /* "https://dikagustiana.com/admin/essays/{id}" */ }
pub struct SectionRow { slug: String, name: String, sort_order: i32 }
pub struct EssayRow { id: String, title: String, section: Option<String>, status: String /* published|draft|archived */, words: u32, updated_at: String, sort_order: i32 }
pub enum Kind { Published, Draft, Blank }
pub fn classify(e: &EssayRow) -> Option<Kind>;        // None for archived; Draft iff status=draft && words>=50
pub fn section_ok(e: &EssayRow, sections: &[SectionRow]) -> bool;
pub struct Fsre { companies: Vec<CompanyRow> }
pub struct CompanyRow { id: String, short_name: String, sub_industry: Option<String>, periods_total: u32, periods_published: u32 }
pub struct Agents { runs: Vec<RunRow>, days: Vec<DayTokens> }
pub struct RunRow { id: String, agent: String, task: String, status: String /* running|done|failed */, started_at: String, ended_at: Option<String>, tokens_in: u64, tokens_out: u64, cost_usd: Option<f64>, error: Option<String> }
pub struct DayTokens { day: Day, tokens: u64 }
```

`PageUiState`: `progress_segment`, `writing_filter` (Draft default), `writing_scroll`, `research_scroll_l/r`, `agents_scroll`, `progress_input`, `progress_hint`, `progress_confirm`, `progress_undo: Option<Box<Progress>>`, `token_input: String` (masked), `agents_hover: Option<String>`.

### 2.3 Feed contract (edge function `progress-feed`)

`GET https://<project>.supabase.co/functions/v1/progress-feed` with `Authorization: Bearer <PROGRESS_FEED_TOKEN>`. 401 without it. Response `application/json`, shape = `Feed` above, with these rules implemented in SQL/TS on the server:

- `writing.essays`: all rows from `essays` where `status <> 'archived'`; `words` = count of whitespace-separated tokens after stripping tags from `content` (0 when null); `section` as stored (the island checks it against `sections`); `updated_at` ISO.
- `writing.sections`: `slug, name, sort_order` from `sections` where `is_active`.
- `fsre.companies`: `fs_company` joined to `fs_period` counts; `periods_published` = periods with `status = 'published'`; `sub_industry` from `fs_company.sub_industry` if that column exists, else null.
- `agents.runs`: `agent_runs` where `started_at >= now() − 7 days`, newest first, max 200.
- `agents.days`: tokens (`tokens_in + tokens_out`) summed per local day (Asia/Jakarta) for the last 7 days, zero-filled.
- Cache-Control: no-store. The function uses the service role key from its secrets; nothing is exposed without the bearer.

### 2.4 Table `agent_runs` and the report function

```sql
create table public.agent_runs (
  id          text primary key,            -- Hermes run id (uuid or any unique string)
  agent       text not null,               -- "FSRE · Modeler"
  task        text not null,               -- short human label, no client data
  status      text not null check (status in ('running','done','failed')),
  started_at  timestamptz not null,
  ended_at    timestamptz,
  tokens_in   bigint not null default 0,
  tokens_out  bigint not null default 0,
  cost_usd    numeric(10,4),
  error       text,
  meta        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.agent_runs enable row level security;   -- no policies: service role only
create index on public.agent_runs (started_at desc);
```

`POST …/functions/v1/agent-run-report` with `Authorization: Bearer <AGENT_REPORT_TOKEN>` and a JSON body `{id, agent, task, status, started_at?, ended_at?, tokens_in?, tokens_out?, cost_usd?, error?, meta?}`; the function upserts by `id` and sets `updated_at`. 401 without the token; 400 on a bad status.

### 2.5 Input grammar

Case-insensitive, quoted names for titles with spaces, `undo` restores the snapshot, unknown input stays with a hint.

**Writing (Elsewhere filter only)**

| Input | Effect |
|---|---|
| `elsewhere "<title>" <venue> <words> [draft\|sent\|published]` | Create or update a piece (default draft) |
| `elsewhere "<title>" <words>` · `elsewhere "<title>" published` | Update words or status |
| `elsewhere "<title>" rm` | Remove (Undo) |

**Research (Lab)**

| Input | Effect |
|---|---|
| `lab new "<title>" [due <day>]` | Create at Scope |
| `lab <name> next: <text>` | Set next step, touch updated |
| `lab <name> stage scope\|data\|analysis\|draft\|review\|out` · `lab <name> done` | Set stage, touch updated |
| `lab <name> due <day>` · `lab <name> due clear` | Due day |
| `lab <name> note <text>` | Append a note line |
| `lab <name> rm` | Remove (Undo) |

**Any segment, when no token is stored or on the token empty state**

| Input | Effect |
|---|---|
| `token <bearer>` | Seal and store the feed token, then fetch |
| `token clear` | Delete the sealed token; the page returns to the token empty state |
| `refresh` | Fetch now |

`<name>` matches a Lab title by case-insensitive prefix; ambiguity gives the hint "Which one? nickel or nickel-ev".

### 2.6 Layouts (DIPs, width 584, height 262)

```
y 0     Segment switch 28: Writing · Research · Agents pills; meta string right-aligned, ellipsised
y 34    Segment area
```

**Writing**
```
y 34    Sections grid: 2 columns × ceil(n/2) rows, row 18, gap 5; each row = name (ellipsis) | two-tone bar 92×6 | "p/t" 38 right
        (6 sections → 3 rows = 64 high)
y 104   Filter row 22: four fpills with counts; right header caption()
y 130   List to y 262 (or to y 218 when the Elsewhere input row shows): rows 24, columns title (1fr) | section 120 | figures 84 right; fade edges; wheel scroll
y 228   Input row 34 (Elsewhere filter only)
```

**Research**
```
y 34    Two columns: left 0..330, right 344..584; each: header caption() 16, scroll list, footer caption() 14
        Lab rows 24: stepper 6×(13×5, gap 3) = 93 | title (1fr, ellipsis) | "next · due" 150 right
        FSRE rows 22: name (1fr) | bar 72×6 | "n/m" 30 right; group headers 16 when grouped
y 228   Input row 34
```

**Agents**
```
y 34    Cards row 4 × (584−18)/4 wide, 40 high: label caption(), value 17px
y 80    Left 0..330: header 16, runs list rows 24: dot/tag 62 | "{agent} — {task}" (1fr) | time 48 right
        Right 344..584: header 16, sparkline 70 high (area fill 0.18, line 2, last point r 3, labels footnote()), footnote caption()
```

Colours from the palette [observed]: Published and done GREEN, Draft and stalled-warning ORANGE, Failed and stalled-text RED, running and current stage BLUE, pending white 0.08 track. Nothing below 11 px.

### 2.7 Empty, error and hover states

| Case | Shown |
|---|---|
| No token | BarsUp · "Connect the site feed" · "Paste the token: token <…>" (input row visible, masked) |
| Token, fetching, no snapshot | "Loading from dikagustiana.com…" caption under the switch |
| Fetch error | Last snapshot stays; one caption line "Feed error · 401" / "Feed error · offline" in RED, with `refresh` hint |
| Writing filter empty | "Nothing here" · e.g. "No drafts right now" |
| Research Lab empty | "No Lab research yet" · "Type lab new \"title\" due 30/11" |
| Research FSRE empty | "No companies in the model bank yet" |
| Agents empty | "No runs in the last 7 days" · "Hermes reports here through agent-run-report" |
| Corrupt progress.json | Banner on all segments, writes disabled |

Hover: rows brighten 0.04; Failed runs show the error; essay rows show an open-link icon; Lab rows show edit/remove icons. Motion: only the running dot.

### 2.8 Self-test

`seed_progress()`: a fake `Feed` with the real section list and counts from 25 Oct 2026 (18/162, 36/36, 2/3, 5/5, 0/56, 1 orphan), 12 named essays across the three kinds, 3 companies with mixed period counts (one with `sub_industry` set, two null, so the flat/grouped switch is exercised in two scenes), 10 runs (2 running, 1 stale, 1 failed, 6 done) and 7 day totals; local data with 4 Lab items (one stalled) and 2 Elsewhere pieces.

Scenes: `progress_no_token`, `progress_writing_draft`, `progress_writing_blank`, `progress_writing_elsewhere`, `progress_research`, `progress_research_grouped`, `progress_agents`, `progress_agents_empty`, `progress_feed_error`, `addons_more_five`.

---

## 3. Plan

Phases 18–25. Phases 18 and 19 are outside the fork repo (site and VPS) and come first because the island has nothing to show without them. One commit per phase in each repo.

| Phase | Where | Work | Check |
|---|---|---|---|
| 18 | Site repo | Migration: `agent_runs` (§2.4); decide and, if yes, add `fs_company.sub_industry text null`. Edge functions `progress-feed` and `agent-run-report` with secrets `PROGRESS_FEED_TOKEN`, `AGENT_REPORT_TOKEN`, service role from env. Deploy | `curl` without token → 401; with token → JSON matching §2.3 with today's counts (AC-W1 numbers); POST a test run then see it in the feed; delete the test run. **Checkpoint: owner keeps both tokens** |
| 19 | VPS | `report_run.sh` (§5) and wiring into Hermes's run lifecycle; a manual test run reports start and end | The feed shows the run with status done and token counts |
| 20 | Fork | Layout and plumbing: `PageKind::Progress`, icon, tab row (Today → "+"), `progress.json` load/save, token seal/unseal via `services/secret.rs`, `progress_http.rs` fetch thread, `AppEvent::Progress`, token empty state, fetch on open + 60 s while open. **Verify A:** which HTTP primitive `services/oyenza.rs` uses and whether a shared helper exists. **Verify B:** how Today is opened besides its tab | build; selftest `progress_no_token`, `addons_more_five`; manual: paste token, see "Loading…" then the meta string. **Checkpoint** |
| 21 | Fork core | `progress/*`: feed parsing with the §2.3 shape, `classify`, `section_ok`, Lab model and transitions, stalled rule, Elsewhere, `notices_for`, stale-run rule, grammar, house-format numbers | `cargo test -p poni-core`: classification table (published / draft 50 / draft 49 / archived), orphan section, stalled at 13 vs 14 days, stale at 5 h 59 vs 6 h, notices once, grammar per line |
| 22 | Fork | Writing segment | selftest writing scenes; AC-W1…W6 |
| 23 | Fork | Research segment + Lab notices | selftest research scenes; AC-R1…R5 |
| 24 | Fork | Agents segment, run notices, background fetch rule via `next_wake`, saver guard | selftest agents scenes + timing invariants; AC-A1…A6 |
| 25 | Fork | Self-test seed and all scenes; verification: tests, release build, selftest, `cargo mcheck`, Oyenza files untouched, grep for threads/timers, upstream dry-run merge; final report with the owner's setup script | report |

Definition of done per phase as in the earlier PRDs, plus: no Supabase key anywhere in the fork or on the VPS; `progress.json` never contains the token.

---

## 4. Routines

### 4.1 Upstream merge
As `PRD.md` §4.1. New conflict points: `tabs()` (Today removed), the More section (five tiles), `events.rs` (one variant), `commands.rs` (two variants).

### 4.2 First-run setup (owner, after phase 24)
1. Open Progress, type `token <PROGRESS_FEED_TOKEN>`.
2. Research: `lab new "…" due …` for each current Lab item; set stages with clicks.
3. Writing → Elsewhere: `elsewhere "…" <venue> <words>` for pieces outside the site.
4. On the VPS, confirm `report_run.sh` is called by Hermes; run one agent and watch the Agents segment.

### 4.3 Token rotation
Change the secret in Supabase, redeploy the function, `token clear` then `token <new>` on the island. For the VPS token, update the env var Hermes passes to the hook.

---

## 5. VPS hook (reference for phase 19)

```bash
#!/usr/bin/env bash
# report_run.sh start|end  — env: RUN_ID AGENT TASK [STATUS TOKENS_IN TOKENS_OUT COST_USD ERROR]
# Requires AGENT_REPORT_URL and AGENT_REPORT_TOKEN in the environment. Never put client data in TASK.
set -euo pipefail
now=$(date -u +%FT%TZ)
case "$1" in
  start) body=$(jq -n --arg id "$RUN_ID" --arg a "$AGENT" --arg t "$TASK" --arg s "$now" \
          '{id:$id,agent:$a,task:$t,status:"running",started_at:$s}') ;;
  end)   body=$(jq -n --arg id "$RUN_ID" --arg a "$AGENT" --arg t "$TASK" --arg st "${STATUS:-done}" --arg e "$now" \
          --argjson ti "${TOKENS_IN:-0}" --argjson to "${TOKENS_OUT:-0}" --arg err "${ERROR:-}" \
          '{id:$id,agent:$a,task:$t,status:$st,ended_at:$e,tokens_in:$ti,tokens_out:$to,error:(if $err=="" then null else $err end)}') ;;
  *) echo "usage: report_run.sh start|end" >&2; exit 2 ;;
esac
curl -fsS -X POST "$AGENT_REPORT_URL" -H "Authorization: Bearer $AGENT_REPORT_TOKEN" \
     -H "Content-Type: application/json" -d "$body" >/dev/null
```

How Hermes exposes run start/end, token counts and errors is **[unknown]**; phase 19 reads Hermes's docs or config on the VPS and wires the two calls where they fit (a wrapper around the agent command is acceptable). If token counts are not available, send 0 and the island shows "—".

---

## 6. Sources

- Site database counts and schema: Supabase project `asypkbkiebjvvpimewfp`, tables `essays`, `sections`, `fs_company`, `fs_period`, read 25 Oct 2026 15:31 WIB. Word counts are approximate (HTML stripped, whitespace tokens).
- Fork facts: `CASHFLOW-CONTEXT.md` §2–§7 and the earlier `CONTEXT.md`.
- Hermes run lifecycle, token reporting: not checked [unknown].
