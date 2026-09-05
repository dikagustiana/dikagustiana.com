/** Lens state shared with the generated plate's joint targets. */
import { createContext } from 'react';
import type { JointId, LensId } from '@/data/industryChain';

export interface ChainLensState {
  lens: LensId | null;
  activeJoints: ReadonlySet<JointId>;
  selectedJoint: JointId | null;
  onSelectJoint: (joint: JointId) => void;
  panelId: string;
}

export const ChainLensContext = createContext<ChainLensState>({
  lens: null,
  activeJoints: new Set(),
  selectedJoint: null,
  onSelectJoint: () => {},
  panelId: '',
});
