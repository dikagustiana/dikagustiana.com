/**
 * The chain at desktop width: one horizontal axis, left to right, read in a
 * single screen without horizontal scroll.
 *
 * Nine columns. Stages sit on the axis; the two beginnings share the first
 * column, one above the other, because they are parallel rather than
 * sequential. Nodes sit between the boxes. The border cuts vertically through
 * everything, drawn behind the boxes so the cut reads as a cut.
 */

import { cn } from '@/lib/utils';
import {
  BOUNDARY,
  BYPRODUCT_BRANCH,
  CHAIN_META,
  NODES,
  NODE_GROUPS,
  RETURN_FLOWS,
  RETURN_SUMMARY,
  STAGES,
} from '@/data/industryChain';
import { useChain } from './chainContext';
import { BranchChip, NodeGroupPill, NodePill, ReturnChip, ReturnRail, StageBox } from './ChainShapes';
import { BoundaryCut, DownChevron, ForwardChevron, MergeBrace } from './ChainFlows';

/**
 * Column widths: stages get the room, the gaps between them get less. Column
 * four holds the trader and importer, which only exists once Detail is on, so
 * it collapses to a connector's width until then.
 */
function columns(detail: boolean) {
  return `1.3fr 0.85fr 1.3fr ${detail ? '0.9fr' : '0.35fr'} 1.3fr 1fr 1fr 1.3fr 1.2fr`;
}

const ROW = { spacer: 1, upper: 2, main: 3, lower: 4 } as const;

const stageById = Object.fromEntries(STAGES.map((stage) => [stage.id, stage]));
const groupById = Object.fromEntries(NODE_GROUPS.map((group) => [group.id, group]));
const nodesByCell = NODES.reduce<Record<string, typeof NODES>>((acc, node) => {
  const key = `${node.column}-${node.lane}`;
  (acc[key] ??= []).push(node);
  return acc;
}, {});

function cellNodes(column: number, lane: 'upper' | 'main' | 'lower') {
  return [...(nodesByCell[`${column}-${lane}`] ?? [])].sort((a, b) => a.order - b.order);
}

function Cell({
  column,
  row,
  children,
  chevron = false,
}: {
  column: number;
  row: number;
  children: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <div
      style={{ gridColumnStart: column, gridRowStart: row }}
      className="relative z-10 flex min-w-0 flex-col justify-center gap-1"
    >
      {children}
      {chevron && <ForwardChevron />}
    </div>
  );
}

export function ChainDesktop() {
  const { detail } = useChain();
  const gridColumns = columns(detail);
  const leftwardLabels = RETURN_FLOWS.filter((flow) => flow.shape === 'leftward').map((flow) => flow.label);

  return (
    <div>
      {/* D — above the chain, pointing back up it. */}
      <div className="mb-2">
        {detail ? (
          <div className="grid grid-cols-5 gap-2">
            {RETURN_FLOWS.map((flow) => (
              <ReturnChip key={flow.id} flow={flow} loop={flow.shape === 'loop'} />
            ))}
          </div>
        ) : (
          <ReturnRail summary={RETURN_SUMMARY} labels={leftwardLabels} orientation="horizontal" />
        )}
      </div>

      <div className="relative grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: gridColumns }}>
        {/* Reserves the strip the border labels stand in. */}
        <div aria-hidden="true" style={{ gridColumn: '1 / -1', gridRowStart: ROW.spacer }} className="h-6" />

        {/* The axis itself, behind everything. */}
        <div
          aria-hidden="true"
          style={{ gridColumn: '2 / -1', gridRowStart: ROW.main }}
          className="pointer-events-none z-0 self-center border-t border-border"
        />

        {/* The border: vertical cuts, drawn behind the boxes. */}
        <div
          className="pointer-events-none absolute inset-0 z-0 grid gap-x-3"
          style={{ gridTemplateColumns: gridColumns }}
        >
          {BOUNDARY.crossings.map((crossing) => (
            <div
              key={crossing.id}
              style={{ gridColumnStart: crossing.column }}
              className={cn(
                'flex h-full',
                crossing.edge === 'end'
                  ? 'justify-end [transform:translateX(0.375rem)]'
                  : 'justify-start [transform:translateX(-0.375rem)]',
              )}
            >
              <BoundaryCut boundary={BOUNDARY} crossing={crossing} />
            </div>
          ))}
        </div>

        {/* Column 1 — the two beginnings, in parallel. */}
        <Cell column={1} row={ROW.upper}>
          <StageBox stage={stageById['stage-biological']} />
        </Cell>
        <Cell column={1} row={ROW.main}>
          <MergeBrace />
        </Cell>
        <Cell column={1} row={ROW.lower}>
          <StageBox stage={stageById['stage-extraction']} />
        </Cell>

        {/* Column 2 — aggregation. */}
        <Cell column={2} row={ROW.main} chevron>
          <NodeGroupPill group={groupById['group-aggregation']} />
          {detail &&
            cellNodes(2, 'main').map((node) => <NodePill key={node.id} node={node} compact />)}
        </Cell>

        {/* Column 3 — primary processing, and the by-product branch out of it. */}
        <Cell column={3} row={ROW.main} chevron>
          <StageBox stage={stageById['stage-processing']} />
        </Cell>
        {detail && (
          <Cell column={3} row={ROW.lower}>
            <BranchChip branch={BYPRODUCT_BRANCH} />
          </Cell>
        )}

        {/* Column 4 — the trader and importer, only once Detail is on. */}
        <Cell column={4} row={ROW.main} chevron={detail}>
          {detail && cellNodes(4, 'main').map((node) => <NodePill key={node.id} node={node} />)}
        </Cell>

        {/* Column 5 — manufacturing, with packaging joining from above. */}
        <Cell column={5} row={ROW.upper}>
          <StageBox stage={stageById['stage-packaging']} />
          <DownChevron />
        </Cell>
        <Cell column={5} row={ROW.main} chevron>
          <StageBox stage={stageById['stage-manufacturing']} />
        </Cell>
        {detail && (
          <Cell column={5} row={ROW.lower}>
            {cellNodes(5, 'lower').map((node) => (
              <NodePill key={node.id} node={node} compact />
            ))}
          </Cell>
        )}

        {/* Columns 6 and 7 — distribution, then retail. */}
        <Cell column={6} row={ROW.main} chevron>
          <NodeGroupPill group={groupById['group-distribution']} />
          {detail &&
            cellNodes(6, 'main').map((node) => <NodePill key={node.id} node={node} compact />)}
        </Cell>
        <Cell column={7} row={ROW.main} chevron>
          <NodeGroupPill group={groupById['group-retail']} />
          {detail &&
            cellNodes(7, 'main').map((node) => <NodePill key={node.id} node={node} compact />)}
        </Cell>

        {/* Columns 8 and 9 — use, then recovery. */}
        <Cell column={8} row={ROW.main} chevron>
          <StageBox stage={stageById['stage-consumption']} />
        </Cell>
        <Cell column={9} row={ROW.main}>
          <StageBox stage={stageById['stage-recovery']} />
        </Cell>
      </div>

      <p className="mt-2 text-right text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {CHAIN_META.axisLabel} <span aria-hidden="true">▶</span>
      </p>
    </div>
  );
}
