import { useContext } from 'react';
import { CONDITION_STATUSES, shiftTarget } from '@/data/industryChain';
import { cn } from '@/lib/utils';
import { ChainLensContext } from './chainLensContext';
import { markNumber, targetLabel } from './chainTargets';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** The mobile counterpart of an SVG mark: number and status form stay one object. */
export function ConditionBadge({ id, interactive = true }: { id: string; interactive?: boolean }) {
  const { shift, selected, onSelect, panelId } = useContext(ChainLensContext);
  const target = shiftTarget(shift, id);
  if (!shift || !target) return null;
  const n = markNumber(shift, id);
  if (n === 0) return null;

  const status = CONDITION_STATUSES[target.condition.status];
  const body = (
    <>
      <span className="cp-condition-badge__mark" aria-hidden="true"><span>{n}</span></span>
      <span className="cp-condition-badge__label">{status.label}</span>
    </>
  );

  if (!interactive) {
    return (
      <span className="cp-condition-badge" data-status={target.condition.status} data-mark-n={n}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cn('cp-condition-badge', FOCUS)}
      data-status={target.condition.status}
      data-mark-n={n}
      aria-label={`${n}. ${targetLabel(id)} · ${status.label}`}
      aria-expanded={selected === id}
      aria-controls={selected === id ? panelId : undefined}
      onClick={(event) => onSelect(id, event.currentTarget)}
    >
      {body}
    </button>
  );
}
