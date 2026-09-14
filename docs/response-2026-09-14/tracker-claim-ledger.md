# Green Transition Tracker — claim / source / outcome ledger

Version 1 · 14 September 2026 · checked against repository commit `8898393` (the audit
baseline, still `main` at execution time) and against the primary sources named below.

Scope of this ledger: the **22 static tracker entries** in `src/data/trackerIssues.ts`
(11 in Q2 2025, 11 in Q1 2025), plus the two issue-level framings (`whatChanged`,
`strategicImplicationPreview`). It does not cover essays, the chain map, or anything in
the CMS.

## Statuses used

| Status | Means |
| --- | --- |
| **Verified** | A named primary source supports the entry as written. |
| **Contradicted** | A named primary source contradicts part of it. A dated correction is filed and rendered above the text. |
| **No source cited** | Nobody has produced a source either way. *Unchecked is not false* — these are not claimed to be wrong. |
| **Author observation** | A reading of how institutions or capital behaved. No single document settles it; it is not reportage and is no longer presented as such. |

## Primary sources

| Key | Source | Published | What it establishes |
| --- | --- | --- | --- |
| RUPTL | [Kementerian ESDM — "Kementerian ESDM Resmi Merilis Dokumen RUPTL PLN 2025–2034"](https://esdm.go.id/id/media-center/arsip-berita/kementerian-esdm-resmi-merilis-dokumen-ruptl-pln-2025-2034) | 3 Jun 2025 | RUPTL PLN 2025–2034 was announced and ratified by the Minister on **26 May 2025**; document published **3 June 2025**. Establishes existence and dates only — nothing about procurement, financing or delivery under it. |
| TKBI | [OJK Keuangan Berkelanjutan — TKBI edisi kedua](https://keuanganberkelanjutan.ojk.go.id/keuanganberkelanjutan/ArticleList/View/1776) | 24 Feb 2025 | TKBI v2 introduced **11 Feb 2025** at PTIJK, disseminated **24 Feb 2025**; extends v1 (Feb 2024, energy) into construction/real estate, transport/storage, part of agriculture/forestry. Establishes publication and scope — **not** that any bank is obliged to lend against it. |
| PTIJK | [OJK — Siaran Pers, Pertemuan Tahunan Industri Jasa Keuangan 2025](https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/Pertemuan-Tahunan-Industri-Jasa-Keuangan-2025.aspx) | 11 Feb 2025 | The event at which TKBI v2 was introduced. |

Both were re-fetched and re-read on 14 September 2026 (externally verified; dates quoted
from the source pages, not from the audit).

---

## Q2 2025 (published 2025-07-15, covering April–June 2025)

| # | Entry | Claim in one line | Status | Outcome |
| --- | --- | --- | --- | --- |
| 1 | `geothermal-pricing-framework-revision` | ESDM revised geothermal pricing; **"no material progress on the RUPTL update"**, which "remains the single binding constraint". | **Contradicted** (RUPTL) | Correction filed and rendered above the entry. Dated 15 Jun 2025, three weeks after ratification. Body left unedited. The correction explicitly refuses the opposite overclaim: approval ≠ procurement. |
| 2 | `tkdn-threshold-solar-circular` | A ministry circular reinforced TKDN thresholds for solar PV; enforcement functions as a capital barrier. | No source cited | The circular is not identified by number or date. Needs a citation or a narrower framing. Left as published, labelled. |
| 3 | `adb-geothermal-due-diligence` | ADB entered second-phase due diligence on three geothermal prospects. | Author observation | Institutional behaviour; unnamed prospects. Labelled, not corrected. |
| 4 | `private-equity-solar-muted` | PE interest in distributed solar stayed muted; managers cite TKDN cost. | Author observation | Attributed to unnamed fund managers. Labelled. |
| 5 | `pln-balance-sheet-ppa-constraint` | PLN's balance sheet constrains long-term PPAs absent sovereign guarantees. | Author observation | No financial statement cited. **Untouched by the RUPTL correction** — this is the obstacle the correction leaves standing. |
| 6 | `danantara-mandate-undefined` | Danantara's energy-transition mandate remains formally undefined. | No source cited | Verifiable in principle (Law No. 1 of 2025 is cited in the reindustrialisation essay); no source here. Labelled. |
| 7 | `bkpm-licensing-undifferentiated` | BKPM licensing does not differentiate fossil from renewable. | No source cited | Labelled. |
| 8 | `tkdn-jetp-cost-conflict` | TKDN and JETP cost models are structurally incompatible. | Author observation | Labelled. |
| 9 | `grid-interconnection-eastern-indonesia` | Interconnection timelines of 12–24 months exceed project schedules. | No source cited | The magnitudes are specific and uncited. Labelled. |
| 10 | `q2-2025-directional-assessment` | Quarterly reading: **Fragmenting**. | Author observation | `readingBasis` now states the eight instruments the label was read from. `READING_META.Fragmenting` now states that divergence is not a direction and is not exclusive of advance or regression. |
| 11 | `q2-2025-strategic-implication` | Sector-specific positioning is "the **only** rational allocation posture"; defer solar; geothermal most actionable. | Author observation, **over-claimed** | Correction filed (A06). No price, horizon, mandate, downside or pricing-in was assessed. The word "only" is withdrawn; the narrower divergence claim stands. |
| — | Issue framing: `whatChanged.held` | "OJK's sustainable finance taxonomy continued in draft consultation status without formal adoption." | **Contradicted** (TKBI) | Issue-level correction filed. |
| — | Issue framing: `strategicImplicationPreview` | Same over-claim as #11, shown on the tracker index as live interface copy. | Over-claimed | **Rewritten** (not a historical body — this is current interface copy) to a scoped statement about sector selection within the asset class. |

## Q1 2025 (published 2025-04-14, covering January–March 2025)

| # | Entry | Claim in one line | Status | Outcome |
| --- | --- | --- | --- | --- |
| 12 | `ruptl-update-absent` | The RUPTL update was not released during the quarter. | **Verified** (RUPTL) | **Correct as written** — ratification came 26 May 2025, after this coverage period. Listed as verified precisely so the two corrections are not read as a verdict on the archive. |
| 13 | `jetp-plan-no-instruments` | JETP's plan was endorsed but produced no operational instruments. | No source cited | Labelled. |
| 14 | `ojk-taxonomy-draft` | OJK "circulated a draft" taxonomy, "not been formally adopted". | **Contradicted** (TKBI, PTIJK) | Correction filed. The surviving point is kept explicitly: a published taxonomy is not a lending obligation, and this tracker produced no evidence on whether bank behaviour changed. |
| 15 | `dfi-engagement-no-new-facilities` | ADB/World Bank engaged but opened no new concessional windows. | Author observation | Labelled. |
| 16 | `pln-balance-sheet-q1` | PLN's balance sheet is the binding obstacle to financial close. | Author observation | Labelled. |
| 17 | `jetp-secretariat-staffing` | The JETP secretariat began staffing but cannot process proposals. | No source cited | Labelled. |
| 18 | `bkpm-licensing-q1` | BKPM approved licences without fossil/renewable differentiation. | No source cited | Labelled. |
| 19 | `grid-interconnection-q1` | Interconnection capacity insufficient in Sulawesi and NTT. | No source cited | Labelled. |
| 20 | `domestic-supply-chain-underdeveloped` | Domestic RE supply chain lags the volumes national targets imply. | No source cited | Labelled. |
| 21 | `q1-2025-directional-assessment` | Quarterly reading: **Stalling**. Repeats the taxonomy-as-draft claim. | Author observation | `readingBasis` added. Issue-level correction filed for the taxonomy line; the Stalling reading survives because its load-bearing instrument (RUPTL) is correctly reported. |
| 22 | `q1-2025-strategic-implication` | Treat Indonesia as a pre-procurement environment. | Author observation | Labelled. Note that RUPTL ratification on 26 May 2025 is the event that ends the state this entry describes; the archive stops before saying so. |

---

## Totals

| Status | Count |
| --- | --- |
| Verified | 1 |
| Contradicted | 2 (+2 issue-level framings) |
| No source cited | 9 |
| Author observation | 10 |
| **Total entries** | **22** |

## What this ledger does not establish

- It does not verify the nine "no source cited" claims in either direction. They are
  unchecked, and the interface now says so rather than implying reportage.
- It does not establish what happened after June 2025. Nothing in the archive has been
  updated to reflect later events, and the coverage notice says that explicitly.
- Two corrections are not a verdict on the archive. One entry was checked and held.
