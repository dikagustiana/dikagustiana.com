/**
 * Interaction state for the map, shared by the desktop and mobile trees so
 * both drive one detail panel.
 *
 * `pinnedId` is what a click fixed; `activeId` is what the panel is showing,
 * which is the pinned element unless the pointer or the keyboard is currently
 * on another one. `aria-pressed` follows the pin, not the hover.
 */

import { createContext, useContext } from 'react';
import { MACRO_BY_ID } from './chainModel';

export interface ChainInteraction {
  pinnedId: string | null;
  activeId: string | null;
  macroId: string | null;
  highlights: ReadonlySet<string>;
  detail: boolean;
  panelId: string;
  select: (id: string) => void;
  preview: (id: string | null) => void;
}

const ChainContext = createContext<ChainInteraction | null>(null);

export const ChainProvider = ChainContext.Provider;

export function useChain(): ChainInteraction {
  const value = useContext(ChainContext);
  if (!value) throw new Error('useChain must be used inside the industry chain map');
  return value;
}

export interface ChainElementState {
  isPinned: boolean;
  isActive: boolean;
  /** Lit by the current macro lens. */
  isLit: boolean;
  /** A lens is on and this element is not part of it. */
  isDimmed: boolean;
  /** The lens badge to stamp on a lit element, so the highlight is not colour alone. */
  badge?: string;
  buttonProps: {
    type: 'button';
    'aria-pressed': boolean;
    'aria-controls': string;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

export function useChainElement(id: string): ChainElementState {
  const chain = useChain();
  const isLit = chain.highlights.has(id);
  const macro = chain.macroId ? MACRO_BY_ID.get(chain.macroId) : undefined;

  return {
    isPinned: chain.pinnedId === id,
    isActive: chain.activeId === id,
    isLit,
    isDimmed: Boolean(chain.macroId) && !isLit,
    badge: isLit ? macro?.badge : undefined,
    buttonProps: {
      type: 'button',
      'aria-pressed': chain.pinnedId === id,
      'aria-controls': chain.panelId,
      onClick: () => chain.select(id),
      onMouseEnter: () => chain.preview(id),
      onMouseLeave: () => chain.preview(null),
      onFocus: () => chain.preview(id),
      onBlur: () => chain.preview(null),
    },
  };
}
