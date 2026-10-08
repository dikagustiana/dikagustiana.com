# Think-tank tags: proposed entries for the owner

The interim tag file `docs/world/think-tank-tags.json` is empty until the owner writes it; the
world then shows every room's published essays untagged, lighting nothing (PRD §7.10). Nothing
below is written to the file or the database by the agent. Each row is a proposal grounded in
the repository's own associations (`ESSAY_ASSOCIATIONS` in `src/data/industryChain.ts`).

| Essay slug | Proposed kind | Proposed tags | Evidence (for a thesis) | Falsifier (for a thesis) | Grounds |
|---|---|---|---|---|---|
| `indonesias-reindustrialization-bet` | thesis | `B146` (other metals and minerals: nickel), `B141`, `stage-processing`, `band-energy`, `band-capital`, `J411` | The essay's own sources on captive generation and the coal-generation regulation; a published model of a smelter when one exists | A smelter configured for the market it must sell into, financed without captive coal, at a public cost per durable job below the alternatives | `ESSAY_ASSOCIATIONS` for `band-energy`, `band-capital` and `stage-processing` (read under both shifts); `src/data/readingPath.ts` |

To accept a row, copy it into `think-tank-tags.json` as
`"indonesias-reindustrialization-bet": { "kind": "thesis", "tags": ["B146", …], "evidence": [{ "label": "…", "href": "…" }], "falsifier": "…" }`.
