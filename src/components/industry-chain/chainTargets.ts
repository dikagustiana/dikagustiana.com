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
  STAGES,
  type JointId,
} from '@/data/industryChain';

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
