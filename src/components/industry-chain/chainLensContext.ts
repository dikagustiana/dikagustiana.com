/**
 * The two controls and the selection, shared with every target on the map —
 * the joint markers, layer bands and switches inside the generated plate, and
 * the rows of the narrow-screen column.
 *
 *   lens      the distance the chain is read at: economy or finance. Always
 *             one of the two — the map has no reading-less state.
 *   shift     the overlay that is on, or null for the resting map.
 *   selected  the element whose reading is open, if any.
 *   hovered   what the pointer or the focus ring is on, with the element
 *             itself, so the one-line label can be pinned beside it.
 *   hidden    the enabling layers a reader has switched off for now.
 */
import { createContext } from 'react';
import type { LensId, ShiftId } from '@/data/industryChain';

export interface Hovered {
  id: string;
  /** The element under the pointer, so a label can be anchored to it. */
  el: Element | null;
}

export interface ChainLensState {
  lens: LensId;
  shift: ShiftId | null;
  selected: string | null;
  /** Toggle a target; the element is remembered so focus can return to it. */
  onSelect: (id: string, trigger: Element | null) => void;
  hovered: Hovered | null;
  onHover: (id: string | null, el?: Element | null) => void;
  /** Layers switched off; each band has its own switch. */
  hidden: ReadonlySet<string>;
  onToggleLayer: (id: string) => void;
  panelId: string;
}

export const ChainLensContext = createContext<ChainLensState>({
  lens: 'economy',
  shift: null,
  selected: null,
  onSelect: () => {},
  hovered: null,
  onHover: () => {},
  hidden: new Set(),
  onToggleLayer: () => {},
  panelId: '',
});
