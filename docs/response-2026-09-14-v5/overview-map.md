# The overview and the detail, element by element

Version 5 · 14 September 2026 · branch `claude/kind-hopper-3nhkce`.

Generated from `src/data/industryChain.ts` on the branch head and checked against the
emitted `ChainPlateSvg.tsx` by `tests/unit/industryChain.test.ts`
("draws the same elements at both levels but for the grouped ones").

## The rule

The overview is the SAME drawing at a coarser grouping. `scripts/build-chain-plate.mjs`
has one layout function, `plate(level)`, and `detail` does one thing: it un-groups. It
adds no relation, and it changes neither the distance nor the scenario.

Identity is the ID. Every element keeps its own id at both levels, so a link, a mark
number, a slug and an essay reference all mean the same thing whichever level is drawn.
The two group boxes are the only ids that exist at one level and not the other, and
neither is a door.

## The count

| | Overview | Detail |
| --- | --- | --- |
| Elements drawn under their own id | 40 | 48 |
| Group boxes standing for several | 2 | 0 |
| Joints as doors | 10 | 11 |
| Layers as doors, each with its switch | 7 | 7 |
| Borders | 2 | 2 |
| Returns, each with its own destination | 6 | 6 |
| Money and information flows | 4 | 4 |
| Marks under either shift, numbered alike | 16 | 16 |

## What is grouped, and what that keeps

### `group-distribution` — "Distribution and wholesale"

Stands for `node-distributor` and `node-wholesaler`.

**Keeps.** Both take title and transform nothing, and both sell into retail. The transfer
between them is real and is still a joint — it is simply internal to this box at this
level. Their spreads are two spreads and do not add into one.

**Detail opens.** The distributor and the wholesaler as separate nodes, the joint between
them, and the sub-distributor recursion.

### `group-retail` — drawn on the existing `node-retail` node

Stands for the five retail formats.

**Keeps.** One stock-holding intermediary function, under its own id, with both its
joints. The five formats differ in shelf margin, cost to serve and who can afford to
supply them; grouping them says they share a function, not a margin.

**Detail opens.** The five formats as rows.

## The one door the overview does not draw

`j-distributor-wholesaler`, the transfer between the distributor and the wholesaler. It
is inside the box they share. An address naming it opens the detail rather than a reading
with no element under it — `asksForFullChain` in `useChainUrl.ts` decides that from
`OVERVIEW_HIDES`, not from a hand-kept list.

## What the overview leaves out, and why none of it is a relation

| Left out | Why |
| --- | --- |
| The example lanes fanning into the two origins | They are examples of a function, not links in the chain. |
| The three demand components inside consumption | They divide a destination; they do not add a transfer. |
| The five retail formats | Grouped into the retail node, which keeps the function and the joint. |
| The distributor’s sub-distributor recursion | A note on how deep one node can nest, not another node. |

## What was available to group and was declined

**The returns.** Six returns have five destinations. Recyclate and compost leave recovery
for different chains; a commercial return goes back to the distributor and a packaging
return to the manufacturer. Any grouping that fits on one arrow would have to pick one,
and "everything comes back to processing" is exactly what the deleted taster drew with a
single "Returns → Primary processing" arrow standing for all six.

**The enabling layers.** All seven are drawn at both levels. The old taster carried three.
Energy is the layer this site’s argument turns on and the entrance most readers meet
showed it as nothing at all.

## Four traps a grouping could set, each held by a test

1. Aggregation feeds from BIOLOGICAL only; extraction reaches processing directly.
2. Packaging is a PARALLEL INPUT to manufacturing, never a stage after it.
3. Recovery does not send everything back to one place — hence the ungrouped returns.
4. Putting two functions in one box does not make their margins addable.

## Every element, at both levels

| What | id | Label | At the overview |
| --- | --- | --- | --- |
| stage | stage-biological | Biological primary production | drawn |
| stage | stage-extraction | Geological extraction | drawn |
| stage | stage-processing | Primary processing | drawn |
| stage | stage-packaging | Packaging manufacture | drawn |
| stage | stage-manufacturing | Finished-goods manufacturing | drawn |
| stage | stage-consumption | Consumption and use | drawn |
| stage | stage-recovery | Recovery | drawn |
| node | node-aggregation | Aggregation | drawn |
| node | node-trader | Trader / importer | drawn |
| node | node-principal | Brand owner / principal | drawn |
| node | node-distributor | Distributor | grouped |
| node | node-wholesaler | Wholesaler | grouped |
| node | node-retail | Retail | drawn |
| retail format | node-retail-general | Warung / general trade | grouped |
| retail format | node-retail-modern | Modern trade | grouped |
| retail format | node-retail-ecommerce | E-commerce, first party | grouped |
| retail format | node-retail-quick | Quick commerce | grouped |
| retail format | node-retail-horeca | Horeca | grouped |
| joint (door) | j-production-aggregation | Production → aggregation | drawn |
| joint (door) | j-extraction-processing | Extraction → processing | drawn |
| joint (door) | j-aggregation-processing | Aggregation → processing | drawn |
| joint (door) | j-processing-trader | Processing → trader / importer | drawn |
| joint (door) | j-trader-manufacturing | Trader / importer → manufacturing | drawn |
| joint (door) | j-packaging-manufacturing | Packaging → manufacturing | drawn |
| joint (door) | j-manufacturing-distribution | Manufacturing → distribution | drawn |
| joint (door) | j-distributor-wholesaler | Distributor → wholesaler | grouped |
| joint (door) | j-wholesale-retail | Wholesale → retail | drawn |
| joint (door) | j-retail-consumption | Retail → consumption | drawn |
| joint (door) | j-consumption-recovery | Consumption → recovery | drawn |
| layer (door) | band-logistics | Logistics and warehousing | drawn |
| layer (door) | band-cold-chain | Cold chain | drawn |
| layer (door) | band-credit | Working capital and trade credit | drawn |
| layer (door) | band-capital | Asset and project finance | drawn |
| layer (door) | band-energy | Energy | drawn |
| layer (door) | band-governance | Principal–distributor contract governance | drawn |
| layer (door) | band-regulation | Regulation and standards | drawn |
| border | border-export | Export | drawn |
| border | border-import | Import | drawn |
| return | return-scrap | Scrap and reject | drawn |
| return | return-commercial | Commercial returns | drawn |
| return | return-packaging | Reusable packaging | drawn |
| return | return-postconsumer-material | Post-consumer material | drawn |
| return | return-postconsumer-organic | Post-consumer organic | drawn |
| return | return-secondary | Secondary market and refurbishment | drawn |
| flow | flow-money-payment | Payment for the goods | drawn |
| flow | flow-money-credit | Trade credit · trade promotion · rebates | drawn |
| flow | flow-info-demand | Demand signal | drawn |
| flow | flow-info-spec | Specifications and standards | drawn |

---

Rows marked **grouped** are drawn at the overview inside a group box, under that box’s
own label, and return under their own id and label on detail. Nothing is dropped.
