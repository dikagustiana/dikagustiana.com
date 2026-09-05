/**
 * Lens and selection state shared with every target on the map — the joint
 * markers and layer bands inside the generated plate, and the rows of the
 * narrow-screen column. A target is a joint id or a band id.
 */
import { createContext } from 'react';
import type { LensId } from '@/data/industryChain';

export interface ChainLensState {
  lens: LensId | null;
  /** The joint or band whose panel is open, if any. */
  selected: string | null;
  /** Toggle a target; the element is remembered so focus can return to it. */
  onSelect: (id: string, trigger: Element | null) => void;
  panelId: string;
}

export const ChainLensContext = createContext<ChainLensState>({
  lens: null,
  selected: null,
  onSelect: () => {},
  panelId: '',
});
