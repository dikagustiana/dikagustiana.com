/**
 * The two controls and the selection, shared with every target on the map —
 * the joint markers and layer bands inside the generated plate, and the rows
 * of the narrow-screen column. A target is a joint id or a band id.
 *
 *   lens    the distance the chain is read at: economy or finance. Always one
 *           of the two — the map has no reading-less state.
 *   shift   the overlay that is on, or null for the resting map.
 */
import { createContext } from 'react';
import type { LensId, ShiftId } from '@/data/industryChain';

export interface ChainLensState {
  lens: LensId;
  shift: ShiftId | null;
  /** The joint or band whose panel is open, if any. */
  selected: string | null;
  /** Toggle a target; the element is remembered so focus can return to it. */
  onSelect: (id: string, trigger: Element | null) => void;
  panelId: string;
}

export const ChainLensContext = createContext<ChainLensState>({
  lens: 'economy',
  shift: null,
  selected: null,
  onSelect: () => {},
  panelId: '',
});
