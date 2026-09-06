/**
 * The map's state, in the address bar.
 *
 * Three things are worth sharing: which overlay is on, which distance the
 * chain is being read at, and which door is open. All three live in the URL
 * so an essay can link straight into the reading it is arguing from, and so a
 * reader can send someone else exactly what they are looking at.
 *
 *     /about?lens=green&distance=finance&node=energy
 *
 * The parameter names are the owner's, and they do NOT match the code's:
 * `lens` is the SHIFT overlay and `distance` is what the code calls the lens.
 * They are a published contract — essays will be written against them — so
 * they are spelled here once, mapped, and never renamed casually.
 *
 * `node` carries a SLUG, never a number and never an internal id. A number on
 * the map is a position in a reading order that changes with the overlay; the
 * slug does not change, which is the whole reason the table exists.
 *
 * Written with history.replaceState rather than the router, for two reasons:
 * the map is not a navigation, so it must not fill the back button with a
 * step per click; and the plate is rendered in places (tests, the landing
 * page preview) where it should not require a router to exist.
 */

import { useCallback, useEffect, useRef } from 'react';
import { SHIFT_BY_ID, idOfSlug, slugOf, type LensId, type ShiftId } from '@/data/industryChain';

export const CHAIN_PARAM = { shift: 'lens', lens: 'distance', node: 'node' } as const;

export interface ChainUrlState {
  lens: LensId | null;
  shift: ShiftId | null;
  node: string | null;
}

const isShiftId = (value: string | null): value is ShiftId => value !== null && value in SHIFT_BY_ID;
const isLensId = (value: string | null): value is LensId => value === 'economy' || value === 'finance';

/** What a query string asks the map to show. Anything unrecognised is ignored, never guessed. */
export function readChainUrl(search: string): ChainUrlState {
  const params = new URLSearchParams(search);
  const shift = params.get(CHAIN_PARAM.shift);
  const lens = params.get(CHAIN_PARAM.lens);
  const node = params.get(CHAIN_PARAM.node);
  return {
    shift: isShiftId(shift) ? shift : null,
    lens: isLensId(lens) ? lens : null,
    node: node ? idOfSlug(node) ?? null : null,
  };
}

/** The query string for a state, keeping every parameter that is not ours. */
export function writeChainUrl(search: string, state: ChainUrlState): string {
  const params = new URLSearchParams(search);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set(CHAIN_PARAM.shift, state.shift);
  // The resting distance is not worth carrying; a link that names one means it.
  set(CHAIN_PARAM.lens, state.lens === 'finance' ? 'finance' : null);
  set(CHAIN_PARAM.node, state.node ? slugOf(state.node) : null);
  const query = params.toString();
  return query ? `?${query}` : '';
}

const hasChainParams = (search: string) => {
  const params = new URLSearchParams(search);
  return Object.values(CHAIN_PARAM).some((key) => params.has(key));
};

/** The state the current address asks for, read once, before the first paint. */
export function initialChainUrl(enabled: boolean): ChainUrlState {
  if (!enabled || typeof window === 'undefined') return { lens: null, shift: null, node: null };
  return readChainUrl(window.location.search);
}

/**
 * Keeps the address in step with the map. It writes nothing on a plain visit
 * — an untouched map leaves the URL exactly as it found it — and from the
 * first change onwards it keeps the three parameters current.
 */
export function useChainUrl(enabled: boolean, state: ChainUrlState) {
  const touched = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const current = window.location.search;
    if (!touched.current) {
      const resting = state.lens !== 'finance' && !state.shift && !state.node;
      if (resting && !hasChainParams(current)) return;
      touched.current = true;
    }
    const next = writeChainUrl(current, state);
    if (next !== current) window.history.replaceState(window.history.state, '', `${window.location.pathname}${next}${window.location.hash}`);
  }, [enabled, state]);

  /** Re-read the address when the reader uses Back or Forward across a shared link. */
  const subscribe = useCallback(
    (apply: (state: ChainUrlState) => void) => {
      if (!enabled || typeof window === 'undefined') return undefined;
      const onPop = () => apply(readChainUrl(window.location.search));
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    },
    [enabled],
  );

  return subscribe;
}
