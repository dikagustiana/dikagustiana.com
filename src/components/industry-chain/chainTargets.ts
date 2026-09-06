/** A target is a joint id or a band id; these tell them apart and name them — and name anything else a shift can light. */
import {
  BAND_BY_ID,
  BORDERS,
  JOINT_BY_ID,
  JOINT_IDS,
  NODES,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  SHIFT_BY_ID,
  STAGES,
  isMarked,
  shiftTarget,
  type JointId,
  type ShiftId,
} from '@/data/industryChain';
import { MARK_ORDER } from './chainMarkOrder';

export const isJointId = (id: string): id is JointId => (JOINT_IDS as readonly string[]).includes(id);
export const isBandId = (id: string): boolean => id in BAND_BY_ID;
/** A door: something that opens a reading when selected. */
export const isDoor = (id: string): boolean => isJointId(id) || isBandId(id);

export function targetLabel(id: string): string {
  if (isJointId(id)) return JOINT_BY_ID[id].label;
  if (BAND_BY_ID[id]) return BAND_BY_ID[id].label;
  if (id === RETAIL_GROUP.id) return RETAIL_GROUP.label;
  const named =
    STAGES.find((s) => s.id === id) ??
    NODES.find((n) => n.id === id) ??
    RETAIL.find((r) => r.id === id) ??
    BORDERS.find((b) => b.id === id) ??
    RETURNS.find((r) => r.id === id);
  return named?.label ?? id;
}

/**
 * The marks of one shift, in reading order, already filtered to the targets
 * that can answer at both distances. The order is the generator's — where the
 * marks land on the plate — so the same list numbers the wide plate and the
 * narrow column, and a target listed in the data file but not yet placed on
 * the plate simply has no mark rather than an invented one.
 */
export function markedIds(shift: ShiftId): string[] {
  const placed = MARK_ORDER[shift] ?? [];
  const known = new Set(placed);
  return [
    ...placed.filter((id) => {
      const target = shiftTarget(shift, id);
      return target !== undefined && isMarked(target);
    }),
    // A target added to the data file since the last `npm run build:chain`
    // still gets a number, at the end, so the panel is reachable in the
    // column and the count never lies. The plate gains its mark on the next
    // regenerate; the unit test fails until then.
    ...SHIFT_BY_ID[shift].targets.filter((t) => !known.has(t.id) && isMarked(t)).map((t) => t.id),
  ];
}

/** The number a target shows under a shift, or 0 when it carries no mark. */
export function markNumber(shift: ShiftId, id: string): number {
  return markedIds(shift).indexOf(id) + 1;
}

/** How many essays the owner has attached to a target under a shift. */
export function markArticles(shift: ShiftId | null, id: string) {
  return shiftTarget(shift, id)?.articles ?? [];
}
