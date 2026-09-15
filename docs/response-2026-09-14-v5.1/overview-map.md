# The overview and the detail, element by element

Version 5.1 · 15 September 2026 · branch `claude/vigilant-ritchie-n4aqrb`, from `201fa4e`.

Generated from `src/data/industryChain.ts` by the session's `gen-mapping.mjs`, so it cannot
drift from what the drawings are built out of. It answers, for every group the overview draws:
who is inside it, what crosses its edge, what happens inside it, where its returns go, how a
public address to any member resolves, what stays true at that distance, what the detail puts
back, and what an overlay may legitimately say about it.

Companion records: `response.md` (what was done, measured and not known) and `decisions.md`
(what this supersedes, with the superseded wording kept).

---

### `group-origins` — Origins (a frame; members drawn)

**Members.** `stage-biological` (Biological primary production) · `stage-extraction` (Geological extraction)

**Boundary connections** (drawn at both levels):

| Joint | Label | Direction | Marked by |
| --- | --- | --- | --- |
| `j-production-aggregation` | Production → aggregation | out | — |
| `j-extraction-processing` | Extraction → processing | out | reindustrialisation |

**Internal relationships**:

None: the members connect only across the group's edge.

**Borders cutting a joint of this group.** `border-export` (Export) at `j-extraction-processing`.

**Return destinations** (each its own arrow at both levels):

| Return | From | To | Relation to the group | Marked by |
| --- | --- | --- | --- | --- |
| `return-postconsumer-organic` | Recovery | Biological primary production | arrives in the group | green |

**Selection and public addresses.**

| Element | Slug | Level a link lands on | Opens a reading |
| --- | --- | --- | --- |
| `stage-biological` | `biological-production` | overview and detail | never on its own |
| `stage-extraction` | `extraction` | overview and detail | never on its own |

**What stays true inside it.** Two routes into the chain, and they do not merge: biological output goes through aggregation, extracted material goes straight to processing, and the export cut leaves before processing on the second route.

**What detail puts back.** The example lanes fanning into each origin.

**What an overlay can say about the group.** Neither shift marks an origin as such; the export cut belongs to the joint it cuts, and that joint is drawn.

**Essays that read a member.** None yet.

---

### `group-processing` — Processing and intermediation (a frame; members drawn)

**Members.** `node-aggregation` (Aggregation) · `stage-processing` (Primary processing) · `node-trader` (Trader / importer)

**Boundary connections** (drawn at both levels):

| Joint | Label | Direction | Marked by |
| --- | --- | --- | --- |
| `j-production-aggregation` | Production → aggregation | in | — |
| `j-extraction-processing` | Extraction → processing | in | reindustrialisation |
| `j-trader-manufacturing` | Trader / importer → manufacturing | out | reindustrialisation |

**Internal relationships** (drawn at both levels, inside the frame):

| Joint | Label | At the overview | Marked by |
| --- | --- | --- | --- |
| `j-aggregation-processing` | Aggregation → processing | drawn | — |
| `j-processing-trader` | Processing → trader / importer | drawn | reindustrialisation |

**Borders cutting a joint of this group.** `border-export` (Export) at `j-extraction-processing`; `border-import` (Import) at `j-trader-manufacturing`.

**Return destinations** (each its own arrow at both levels):

| Return | From | To | Relation to the group | Marked by |
| --- | --- | --- | --- | --- |
| `return-scrap` | Finished-goods manufacturing | Primary processing | arrives in the group | — |
| `return-postconsumer-material` | Recovery | Primary processing | arrives in the group | green |

The by-product (`branch-byproduct`) leaves processing forward into another chain at both levels; it is not a return.

**Selection and public addresses.**

| Element | Slug | Level a link lands on | Opens a reading |
| --- | --- | --- | --- |
| `node-aggregation` | `aggregation` | overview and detail | never on its own |
| `stage-processing` | `processing` | overview and detail | under reindustrialisation |
| `node-trader` | `trader` | overview and detail | under reindustrialisation |
| `j-aggregation-processing` | `aggregation-processing` | overview and detail | always |
| `j-processing-trader` | `processing-trader` | overview and detail | always |

**What stays true inside it.** One conversion, and the intermediation either side of it: the aggregator bulks the lots before the plant, the trader lands the inputs after it. Three margins — a spread, a conversion margin, a spread — and they do not add.

**What detail puts back.** The same three functions with more room, and the by-product branch at full length.

**What an overlay can say about the group.** Reindustrialisation marks the processing stage, the trader and the joint between them, each under its own id; the group carries no status of its own.

**Essays that read a member.** `stage-processing` → *Indonesia’s Reindustrialization Bet* (read under reindustrialisation)

---

### `group-manufacturing` — Manufacturing and packaging (a frame; members drawn)

**Members.** `stage-packaging` (Packaging manufacture) · `stage-manufacturing` (Finished-goods manufacturing) · `node-principal` (Brand owner / principal)

**Boundary connections** (drawn at both levels):

| Joint | Label | Direction | Marked by |
| --- | --- | --- | --- |
| `j-trader-manufacturing` | Trader / importer → manufacturing | in | reindustrialisation |
| `j-manufacturing-distribution` | Manufacturing → distribution | out | — |

**Internal relationships** (drawn at both levels, inside the frame):

| Joint | Label | At the overview | Marked by |
| --- | --- | --- | --- |
| `j-packaging-manufacturing` | Packaging → manufacturing | drawn | — |

**Borders cutting a joint of this group.** `border-import` (Import) at `j-trader-manufacturing`.

**Return destinations** (each its own arrow at both levels):

| Return | From | To | Relation to the group | Marked by |
| --- | --- | --- | --- | --- |
| `return-scrap` | Finished-goods manufacturing | Primary processing | leaves the group | — |
| `return-packaging` | Retail | Finished-goods manufacturing | arrives in the group | — |

**Selection and public addresses.**

| Element | Slug | Level a link lands on | Opens a reading |
| --- | --- | --- | --- |
| `stage-packaging` | `packaging` | overview and detail | never on its own |
| `stage-manufacturing` | `manufacturing` | overview and detail | under reindustrialisation |
| `node-principal` | `principal` | overview and detail | never on its own |
| `j-packaging-manufacturing` | `packaging-manufacturing` | overview and detail | always |

**What stays true inside it.** Packaging is a parallel input into the finished good, never a stage after it; the principal takes title alongside manufacturing and transforms nothing. Two conversion margins and a spread, kept apart.

**What detail puts back.** The same three functions with more room.

**What an overlay can say about the group.** Reindustrialisation marks the manufacturing stage under its own id; packaging and the principal carry no mark.

**Essays that read a member.** None yet.

---

### `group-distribution-retail` — Distribution and retail (collapsed into one box)

**Members.** `node-distributor` (Distributor, folded into the box) · `node-wholesaler` (Wholesaler, folded into the box) · `node-retail` (Retail, folded into the box) · `node-retail-general` (Warung / general trade, folded into the box) · `node-retail-modern` (Modern trade, folded into the box) · `node-retail-ecommerce` (E-commerce, first party, folded into the box) · `node-retail-quick` (Quick commerce, folded into the box) · `node-retail-horeca` (Horeca, folded into the box)

**Boundary connections** (drawn at both levels):

| Joint | Label | Direction | Marked by |
| --- | --- | --- | --- |
| `j-manufacturing-distribution` | Manufacturing → distribution | in | — |
| `j-retail-consumption` | Retail → consumption | out | — |

**Internal relationships** (drawn only on detail):

| Joint | Label | At the overview | Marked by |
| --- | --- | --- | --- |
| `j-distributor-wholesaler` | Distributor → wholesaler | inside the box; the address opens the detail | — |
| `j-wholesale-retail` | Wholesale → retail | inside the box; the address opens the detail | — |

**Return destinations** (each its own arrow at both levels):

| Return | From | To | Relation to the group | Marked by |
| --- | --- | --- | --- | --- |
| `return-commercial` | Retail | Distributor | inside the box — drawn as a loop on it | — |
| `return-packaging` | Retail | Finished-goods manufacturing | leaves the group | — |

**Selection and public addresses.**

| Element | Slug | Level a link lands on | Opens a reading |
| --- | --- | --- | --- |
| `node-distributor` | `distributor` | detail only | never on its own |
| `node-wholesaler` | `wholesaler` | detail only | never on its own |
| `node-retail` | `retail` | detail only | never on its own |
| `node-retail-general` | `retail-general-trade` | detail only | never on its own |
| `node-retail-modern` | `retail-modern-trade` | detail only | never on its own |
| `node-retail-ecommerce` | `retail-ecommerce` | detail only | never on its own |
| `node-retail-quick` | `retail-quick-commerce` | detail only | never on its own |
| `node-retail-horeca` | `retail-horeca` | detail only | never on its own |
| `j-distributor-wholesaler` | `distributor-wholesaler` | detail only | always |
| `j-wholesale-retail` | `wholesale-retail` | detail only | always |

**What stays true inside it.** Three functions that take title and transform nothing, selling in ever smaller drops. The two transfers between them are real joints, inside this box at this level; their spreads are three spreads and do not add into one. Commercial returns run back from retail to the distributor inside the box.

**What detail puts back.** The distributor, the wholesaler and the retail node as separate boxes, the two joints between them, the five retail formats, and the sub-distributor recursion.

**What an overlay can say about the group.** Neither shift marks anything inside this box, so it never carries a mark; if one did, the mark would open the detail and sit on the member.

**Essays that read a member.** None yet.

---

### `group-use-recovery` — Use and recovery (a frame; members drawn)

**Members.** `stage-consumption` (Consumption and use) · `stage-recovery` (Recovery)

**Boundary connections** (drawn at both levels):

| Joint | Label | Direction | Marked by |
| --- | --- | --- | --- |
| `j-retail-consumption` | Retail → consumption | in | — |

**Internal relationships** (drawn at both levels, inside the frame):

| Joint | Label | At the overview | Marked by |
| --- | --- | --- | --- |
| `j-consumption-recovery` | Consumption → recovery | drawn | green |

**Return destinations** (each its own arrow at both levels):

| Return | From | To | Relation to the group | Marked by |
| --- | --- | --- | --- | --- |
| `return-postconsumer-material` | Recovery | Primary processing | leaves the group | green |
| `return-postconsumer-organic` | Recovery | Biological primary production | leaves the group | green |
| `return-secondary` | Consumption and use | Consumption and use | inside the frame | — |

**Selection and public addresses.**

| Element | Slug | Level a link lands on | Opens a reading |
| --- | --- | --- | --- |
| `stage-consumption` | `consumption` | overview and detail | never on its own |
| `stage-recovery` | `recovery` | overview and detail | under green |
| `j-consumption-recovery` | `consumption-recovery` | overview and detail | always |

**What stays true inside it.** Use is a destination, not a conversion margin. Recovery is paid to take what has no value and sells what still has some back up the chain — to processing as material, to biological production as compost, never to one place.

**What detail puts back.** The three demand components inside consumption.

**What an overlay can say about the group.** The green transition marks recovery, the joint into it and the two post-consumer returns, each under its own id.

**Essays that read a member.** None yet.

---

## Everything the overview hides

- `j-distributor-wholesaler` — Distributor → wholesaler
- `j-wholesale-retail` — Wholesale → retail
- `node-distributor` — Distributor
- `node-wholesaler` — Wholesaler
- `node-retail` — Retail
- `node-retail-general` — Warung / general trade
- `node-retail-modern` — Modern trade
- `node-retail-ecommerce` — E-commerce, first party
- `node-retail-quick` — Quick commerce
- `node-retail-horeca` — Horeca

## The enabling layers across the groups

| Layer | Short | Attaches | Span | Drawn joints it ticks at the overview |
| --- | --- | --- | --- | --- |
| `band-logistics` | Logistics | joints | The whole chain | 9 |
| `band-cold-chain` | Cold chain | joints | Production → consumption, on the chains that need it | 8 |
| `band-credit` | Working capital | joints | The whole chain | 9 |
| `band-capital` | Asset finance | recipients | The whole chain — wherever capacity is built or replaced | recipients: stage-biological, stage-extraction, stage-processing, stage-packaging, stage-manufacturing, node-distributor, node-wholesaler, node-retail, stage-recovery; also funds band-logistics, band-cold-chain, band-energy |
| `band-energy` | Energy | stages | The whole chain — an input into every stage | the stages (six distinct x at the overview) |
| `band-governance` | Contract governance | joints | Manufacturing → retail | 1 |
| `band-regulation` | Regulation | none | The whole chain | none |

## Mark order, identical at both levels

- **Reindustrialisation:** 1 `border-export` · 2 `j-extraction-processing` · 3 `stage-processing` · 4 `j-processing-trader` · 5 `node-trader` · 6 `j-trader-manufacturing` · 7 `border-import` · 8 `stage-manufacturing`
- **Green transition:** 1 `return-postconsumer-material` · 2 `return-postconsumer-organic` · 3 `j-consumption-recovery` · 4 `stage-recovery` · 5 `band-logistics` · 6 `band-cold-chain` · 7 `band-capital` · 8 `band-energy`
