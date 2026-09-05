/**
 * The chain below desktop width: the same map, turned through ninety degrees.
 *
 * Top to bottom instead of left to right, the two beginnings side by side
 * because they are still parallel, and the border still cutting across the
 * chain — which, once the chain runs downward, means a horizontal cut.
 * Every element stays interactive and stays keyboard reachable.
 */

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
import { BoundaryCutInline, DownChevron } from './ChainFlows';

const stageById = Object.fromEntries(STAGES.map((stage) => [stage.id, stage]));
const groupById = Object.fromEntries(NODE_GROUPS.map((group) => [group.id, group]));
const crossingById = Object.fromEntries(BOUNDARY.crossings.map((crossing) => [crossing.id, crossing]));

function membersOf(groupId: string) {
  return NODES.filter((node) => node.groupId === groupId).sort((a, b) => a.order - b.order);
}

function Step({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>;
}

export function ChainMobile() {
  const { detail } = useChain();
  const leftwardLabels = RETURN_FLOWS.filter((flow) => flow.shape === 'leftward').map((flow) => flow.label);

  return (
    <div className="space-y-1.5">
      <div className="mb-1">
        {detail ? (
          <div className="grid grid-cols-2 gap-2">
            {RETURN_FLOWS.map((flow) => (
              <ReturnChip key={flow.id} flow={flow} loop={flow.shape === 'loop'} />
            ))}
          </div>
        ) : (
          <ReturnRail summary={RETURN_SUMMARY} labels={leftwardLabels} orientation="vertical" />
        )}
      </div>

      {/* The two beginnings, side by side. */}
      <div className="grid grid-cols-2 gap-2">
        <StageBox stage={stageById['stage-biological']} />
        <StageBox stage={stageById['stage-extraction']} />
      </div>

      <BoundaryCutInline boundary={BOUNDARY} crossing={crossingById['crossing-export']} />
      <DownChevron />

      <Step>
        <NodeGroupPill group={groupById['group-aggregation']} />
        {detail &&
          membersOf('group-aggregation').map((node) => <NodePill key={node.id} node={node} compact />)}
      </Step>
      <DownChevron />

      <BoundaryCutInline boundary={BOUNDARY} crossing={crossingById['crossing-import-input']} />

      <Step>
        <StageBox stage={stageById['stage-processing']} />
        {detail && <BranchChip branch={BYPRODUCT_BRANCH} />}
      </Step>
      <DownChevron />

      {detail && (
        <>
          <Step>
            {NODES.filter((node) => node.id === 'node-trader').map((node) => (
              <NodePill key={node.id} node={node} />
            ))}
          </Step>
          <DownChevron />
        </>
      )}

      <BoundaryCutInline boundary={BOUNDARY} crossing={crossingById['crossing-import-capital']} />

      <Step>
        <div className="pl-8">
          <StageBox stage={stageById['stage-packaging']} />
          <DownChevron />
        </div>
        <StageBox stage={stageById['stage-manufacturing']} />
        {detail &&
          NODES.filter((node) => node.id === 'node-principal').map((node) => (
            <NodePill key={node.id} node={node} compact />
          ))}
      </Step>
      <DownChevron />

      <Step>
        <NodeGroupPill group={groupById['group-distribution']} />
        {detail &&
          membersOf('group-distribution')
            .filter((node) => node.column === 6)
            .map((node) => <NodePill key={node.id} node={node} compact />)}
      </Step>
      <DownChevron />

      <Step>
        <NodeGroupPill group={groupById['group-retail']} />
        {detail &&
          membersOf('group-retail').map((node) => <NodePill key={node.id} node={node} compact />)}
      </Step>
      <DownChevron />

      <StageBox stage={stageById['stage-consumption']} />
      <DownChevron />
      <StageBox stage={stageById['stage-recovery']} />

      <p className="pt-1 text-right text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {CHAIN_META.axisLabel} <span aria-hidden="true">▼</span>
      </p>
    </div>
  );
}
