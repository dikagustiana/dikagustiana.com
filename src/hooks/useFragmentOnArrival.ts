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
 * any more, clear of the sticky header, and not at all if the reader has
 * already scrolled. Written for the homepage's sections (Index.tsx); the FSLI
 * page uses it for its essay's headings (FsliDetail.tsx).
 */
export function useFragmentOnArrival() {
  const { hash } = useLocation();
  const fetching = useIsFetching();
  // The first render counts nothing as fetching yet: the queries start after
  // it. "Nothing fetching any more" means after something was.
  const started = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    if (fetching > 0) started.current = true;
    if (done.current || !started.current || fetching > 0) return;
    // Arrival ends at the first settled pass, with a fragment or without; a
    // fragment that comes later (the skip link, say) is the browser's to follow.
    done.current = true;
    if (!hash) return;
    // A hand-typed fragment need not be valid percent-encoding ("/#100%"), and
    // a throw in the frame below would be uncaught: such a one is used as typed.
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep it as typed
    }
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target || window.scrollY > 0) return;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - header, behavior: scrollBehavior() });
    });
  }, [hash, fetching]);
}
