# Linking an essay into the map

Version 5 · 14 September 2026. For the author, when writing an essay that argues from a
particular part of the chain.

## The address

    /?lens=<shift>&distance=<distance>&node=<slug>
    /about?lens=<shift>&distance=<distance>&node=<slug>

Every parameter is optional and any it does not recognise it ignores, so a partial link is
safe. The map is on both pages: `/` opens it at the overview, `/about` at the detail.

| Parameter | Values | Leave it out when |
| --- | --- | --- |
| `lens` | `green`, `reindustrialisation` | the essay is not arguing from a scenario |
| `distance` | `finance` | the economy reading is the one you mean (it is the resting state and the map never writes it) |
| `node` | a slug from the table below | you are pointing at the whole map |

The parameter names are not the code’s names: `lens` carries the SHIFT and `distance` carries
what the code calls the lens. They are a published contract and are spelled that way on
purpose. See `src/components/industry-chain/useChainUrl.ts`.

## What a link does when it opens

- The map restores exactly the state the address names, before the first paint.
- It stays at the **overview** — the level a reader meets — unless the element is one the
  grouping folds away, in which case it opens the detail so the reading has something to sit on.
  The table says which is which.
- An element the named shift does not mark is **not opened**: a panel with a heading and nothing
  under it is the one thing the map must not show. The rejected parameter is then dropped from
  the address. The **Opens** column says what each element needs.
- The figure is scrolled into view, because on both pages it is a long way down. A `#fragment`
  in the same address is the reader’s own instruction and wins.

## Two worked examples

    /?lens=green&distance=finance&node=energy

The green transition, read through finance, with the energy layer’s reading open. This is the
one reading on the map written against evidence rather than as an illustration.

    /?node=processing-trader

The margin cut where processing sells to the trader, at the economy distance, with no scenario
on. Nothing is asserted about where it stands — the card is the anatomy, not a diagnosis.

## The rule about these slugs

A slug is a **public address**. Rename one and every link written against it breaks, including
links in essays already published. `tests/unit/industryChain.test.ts` pins the whole table
verbatim for exactly that reason.

A slug is never a number. The numbers on the marks are positions in a reading order computed
from the drawing, and they renumber whenever the overlay changes. Never quote one as an
identity, in an essay or anywhere else.

## Every slug

**Opens** says when the element opens a reading of its own: *Always* for the two kinds of door
(a joint and a layer), *Under ...* for an element that only opens while that scenario is on, and
*Never on its own* for one that is drawn but carries no reading.

**Level** says whether the overview draws the element or the grouping folds it away. A link to
a *Detail only* element still works — it opens the detail.

| Slug | What | Label on the map | Opens | Level |
| --- | --- | --- | --- | --- |
| `aggregation-processing` | Joint | Aggregation → processing | Always | Overview and detail |
| `consumption-recovery` | Joint | Consumption → recovery | Always | Overview and detail |
| `distributor-wholesaler` | Joint | Distributor → wholesaler | Always | Detail only |
| `extraction-processing` | Joint | Extraction → processing | Always | Overview and detail |
| `manufacturing-distribution` | Joint | Manufacturing → distribution | Always | Overview and detail |
| `packaging-manufacturing` | Joint | Packaging → manufacturing | Always | Overview and detail |
| `processing-trader` | Joint | Processing → trader / importer | Always | Overview and detail |
| `production-aggregation` | Joint | Production → aggregation | Always | Overview and detail |
| `retail-consumption` | Joint | Retail → consumption | Always | Overview and detail |
| `trader-manufacturing` | Joint | Trader / importer → manufacturing | Always | Overview and detail |
| `wholesale-retail` | Joint | Wholesale → retail | Always | Overview and detail |
| `capital-finance` | Layer | Asset and project finance | Always | Overview and detail |
| `cold-chain` | Layer | Cold chain | Always | Overview and detail |
| `credit` | Layer | Working capital and trade credit | Always | Overview and detail |
| `energy` | Layer | Energy | Always | Overview and detail |
| `governance` | Layer | Principal–distributor contract governance | Always | Overview and detail |
| `logistics` | Layer | Logistics and warehousing | Always | Overview and detail |
| `regulation` | Layer | Regulation and standards | Always | Overview and detail |
| `biological-production` | Stage | Biological primary production | Never on its own | Overview and detail |
| `consumption` | Stage | Consumption and use | Never on its own | Overview and detail |
| `extraction` | Stage | Geological extraction | Never on its own | Overview and detail |
| `manufacturing` | Stage | Finished-goods manufacturing | Under reindustrialisation | Overview and detail |
| `packaging` | Stage | Packaging manufacture | Never on its own | Overview and detail |
| `processing` | Stage | Primary processing | Under reindustrialisation | Overview and detail |
| `recovery` | Stage | Recovery | Under green | Overview and detail |
| `aggregation` | Node | Aggregation | Never on its own | Overview and detail |
| `byproduct` | Node | By-product → another chain | Never on its own | Overview and detail |
| `distributor` | Node | Distributor | Never on its own | Detail only |
| `principal` | Node | Brand owner / principal | Never on its own | Overview and detail |
| `retail` | Node | Retail | Never on its own | Overview and detail |
| `retail-ecommerce` | Node | E-commerce, first party | Never on its own | Detail only |
| `retail-general-trade` | Node | Warung / general trade | Never on its own | Detail only |
| `retail-horeca` | Node | Horeca | Never on its own | Detail only |
| `retail-modern-trade` | Node | Modern trade | Never on its own | Detail only |
| `retail-quick-commerce` | Node | Quick commerce | Never on its own | Detail only |
| `trader` | Node | Trader / importer | Under reindustrialisation | Overview and detail |
| `wholesaler` | Node | Wholesaler | Never on its own | Detail only |
| `border-export` | Border | Export | Under reindustrialisation | Overview and detail |
| `border-import` | Border | Import | Under reindustrialisation | Overview and detail |
| `return-commercial` | Return | Commercial returns | Never on its own | Overview and detail |
| `return-packaging` | Return | Reusable packaging | Never on its own | Overview and detail |
| `return-postconsumer-material` | Return | Post-consumer material | Under green | Overview and detail |
| `return-postconsumer-organic` | Return | Post-consumer organic | Under green | Overview and detail |
| `return-scrap` | Return | Scrap and reject | Never on its own | Overview and detail |
| `return-secondary` | Return | Secondary market and refurbishment | Never on its own | Overview and detail |

---

Generated from `SLUGS`, `SHIFTS` and `drawnAtOverview` in `src/data/industryChain.ts` on the
branch head. If the table and the code ever disagree, the code is right and this file is stale.
