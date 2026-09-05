/**
 * A joint the curriculum has pinned a module to.
 *
 * Renders nothing unless the unit-economics lens is on AND the mapping table
 * has a chain-located module for this joint — so an unmapped joint is simply
 * not there: no dead target, no empty panel, nothing that looks broken. When
 * it does render it is a real button: keyboard-reachable, pressed state
 * exposed, focus ring visible.
 */

import { useContext, type KeyboardEvent } from 'react';
import type { JointId } from '@/data/industryChain';
import { JOINT_LABELS } from '@/data/industryChain';
import { ChainLensContext } from './chainLensContext';

export function JointHit({ id, cx, cy }: { id: JointId; cx: number; cy: number }) {
  const { lens, activeJoints, selectedJoint, onSelectJoint, panelId } = useContext(ChainLensContext);
  if (lens !== 'unit' || !activeJoints.has(id)) return null;

  const pressed = selectedJoint === id;
  const onKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectJoint(id);
    }
  };

  return (
    <g
      className="cp-joint"
      role="button"
      tabIndex={0}
      aria-label={JOINT_LABELS[id]}
      aria-pressed={pressed}
      aria-controls={pressed ? panelId : undefined}
      onClick={() => onSelectJoint(id)}
      onKeyDown={onKey}
    >
      <circle cx={cx} cy={cy} r={14} fill="transparent" stroke="none" />
      <circle cx={cx} cy={cy} r={6} />
    </g>
  );
}
