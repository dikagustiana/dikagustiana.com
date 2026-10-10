import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { scrollBehavior } from '@/lib/motion';

/**
 * Go to the address's fragment once the page has drawn what it names.
 *
 * The browser looks for the fragment before a page drawn from queries has
 * drawn and finds nothing, and what sits above the target changes height as
 * its data arrives, so the jump is made here: once, when nothing is fetching
 * any more and the target is there, clear of the sticky header, and not at
 * all if the reader has already scrolled. Written for the homepage's sections
 * (Index.tsx); the FSLI page uses it for its essay's headings (FsliDetail.tsx).
 *
 * Each address is its own arrival: a page that stays mounted from one to the
 * next (FsliDetail, from one line item to another) starts over. A target not
 * drawn when the fetching settles (the essay read failed) is looked for again
 * at the next settle, so a retry that draws it still goes there.
 */
export function useFragmentOnArrival() {
  const { pathname, search, hash } = useLocation();
  const fetching = useIsFetching();
  const address = pathname + search;
  // The first render counts nothing as fetching yet: the queries start after
  // it. "Nothing fetching any more" means after something was.
  const arrival = useRef({ address, started: false, done: false });

  // After every render, not on a list of deps: the target is drawn from the
  // host page's data, and a read that settles within one batch (a retry
  // answered at once) never shows `fetching` above zero to a deps check.
  // Each pass after the arrival ends returns at once.
  useEffect(() => {
    if (arrival.current.address !== address) arrival.current = { address, started: false, done: false };
    const current = arrival.current;
    if (fetching > 0) current.started = true;
    if (current.done || !current.started || fetching > 0) return;
    // An arrival without a fragment ends at the first settled pass; a fragment
    // that comes later (the skip link, say) is the browser's to follow.
    if (!hash) {
      current.done = true;
      return;
    }
    // A hand-typed fragment need not be valid percent-encoding ("/#100%"), and
    // a throw in the frame below would be uncaught: such a one is used as typed.
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep it as typed
    }
    requestAnimationFrame(() => {
      if (current.done || arrival.current !== current) return;
      // The reader has moved: the page is theirs.
      if (window.scrollY > 0) {
        current.done = true;
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      current.done = true;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header, behavior: scrollBehavior() });
    });
  });
}
