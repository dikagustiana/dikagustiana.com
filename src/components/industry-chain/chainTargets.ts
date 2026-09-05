/** A target is a joint id or a band id; these tell them apart and name them. */
import { BAND_BY_ID, JOINT_BY_ID, JOINT_IDS, type JointId } from '@/data/industryChain';

export const isJointId = (id: string): id is JointId => (JOINT_IDS as readonly string[]).includes(id);

export function targetLabel(id: string): string {
  if (isJointId(id)) return JOINT_BY_ID[id].label;
  return BAND_BY_ID[id]?.label ?? id;
}
