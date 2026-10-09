/**
 * The world's slot on the landing and About pages, and its first paint
 * (gate 4, O8). Only ever rendered with the flag on; with it off the chain
 * wrappers never reach this module and Rollup drops it.
 *
 * WorldPoster is the frame as it first draws, before the frame's chunk has
 * arrived: the same section wrapper, the same header and controls
 * (FrameShell, inert here), and the stage with the poster, laid out by the
 * same rules (frame.css, inlined, because the world's stylesheet travels
 * with its chunk). The poster is the page's largest paint, at its final
 * place and size, and nothing moves when WorldFrame takes over.
 *
 * WorldSlot holds the poster until it is on screen and the browser has
 * reported the largest paint (the first largest-contentful-paint entry, where
 * the browser has them; the poster decoded and a frame drawn; at once if the
 * stage is below the fold; at the latest after 3 s), and only then fetches the
 * frame's chunk, inside a transition so the poster stays until the frame is
 * ready. Any pointer, focus or key on the poster's frame fetches it at once.
 * The frame's chunk (the registry, the card, the data hooks: 38 KB
 * compressed) therefore never competes with the poster for the connection
 * or the main thread. Under reduced motion the slot is the schematic and one
 * line, as WorldFrame would render it, and the frame is never fetched.
 */
import { lazy, startTransition, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { REDUCED_MOTION_QUERY } from '@/lib/motion';
import { DEFAULT_LAYERS, REDUCED_NOTE, coverageLine } from '@/lib/world/constants';
import { FrameHeader, PHONE_QUERY, PosterImage, SearchField, type FrameControls } from './FrameShell';
import FRAME_CSS from './frame.css?inline';

const WorldSection = __WORLD_KAWASAN__ ? lazy(() => import('./WorldSection')) : null;

type Variant = 'preview' | 'full';
type Heading = 'h1' | 'h2';

/**
 * Calls `onPainted` once the poster is on screen and the browser has reported
 * the page's largest paint (see the module comment). Any reported paint will
 * do, not only the poster's: Chrome passes over an image under 0.05 bits per
 * pixel as a placeholder, and the compact poster, served compressed, is under
 * that at a wide screen's stage, where the title is then the largest paint.
 */
function useAfterPosterPaint(img: RefObject<HTMLImageElement>, onPainted: (() => void) | undefined) {
  useEffect(() => {
    if (!onPainted) return;
    let done = false, po: PerformanceObserver | null = null, io: IntersectionObserver | null = null;
    const fire = () => { if (done) return; done = true; po?.disconnect(); io?.disconnect(); clearTimeout(latest); setTimeout(onPainted, 0); };
    const latest = setTimeout(fire, 3000);
    const el = img.current;
    // the poster decoded and one frame drawn: it is on screen
    const shown = new Promise<void>((resolve) => {
      if (!el) { resolve(); return; }
      const decoded = () => { (el.decode ? el.decode() : Promise.resolve()).catch(() => undefined).then(() => requestAnimationFrame(() => resolve())); };
      if (el.complete) decoded(); else { el.addEventListener('load', decoded, { once: true }); el.addEventListener('error', () => resolve(), { once: true }); }
    });
    // the first largest-contentful-paint entry, which the browser queues once that frame has been presented
    const reported = typeof PerformanceObserver === 'function' && (PerformanceObserver.supportedEntryTypes ?? []).includes('largest-contentful-paint')
      ? new Promise<void>((resolve) => { po = new PerformanceObserver(() => resolve()); po.observe({ type: 'largest-contentful-paint', buffered: true }); })
      : Promise.resolve();
    void Promise.all([shown, reported]).then(fire);
    // a stage below the fold is not the largest paint: nothing to wait for
    if (el && typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver((entries) => { io?.disconnect(); io = null; if (!entries.some((e) => e.isIntersecting)) fire(); });
      io.observe(el);
    }
    return () => { done = true; po?.disconnect(); io?.disconnect(); clearTimeout(latest); };
  }, [img, onPainted]);
}

export function WorldPoster({ variant, heading, onPainted, onWake }: { variant: Variant; heading: Heading; onPainted?: () => void; onWake?: () => void }) {
  const phone = useMediaQuery(PHONE_QUERY);
  const img = useRef<HTMLImageElement>(null);
  useAfterPosterPaint(img, onPainted);
  const wake = () => onWake?.();
  const inert: FrameControls = { place: wake, distance: wake, dragging: wake, overlay: wake, layer: wake, skema: wake };
  const Stage = heading === 'h1' ? 'h3' : 'h4';
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <div className="world-frame" data-world="loading" onPointerDown={wake} onFocus={wake} onKeyDown={wake}>
          <style>{FRAME_CSS}</style>
          <FrameHeader heading={heading} variant={variant} phone={phone} coverage={coverageLine('loading', 0)} view={null} ready={false} distance={0} overlay="none" layers={DEFAULT_LAYERS} on={inert}
            search={<SearchField value="" onChange={wake} />} />
          <div className="world-frame__stage">
            <PosterImage imgRef={img} />
            <Stage className="sr-only">The map</Stage>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The chain wrappers' world: the poster first, the frame after the poster's paint; the schematic under reduced motion. */
export function WorldSlot({ variant, heading, Schematic }: { variant: Variant; heading: Heading; Schematic: ComponentType<{ variant?: Variant; heading?: Heading }> }) {
  const [go, setGo] = useState(false);
  const fetchFrame = useCallback(() => startTransition(() => setGo(true)), []);
  // subscribed, not a snapshot: a reader who turns reduced motion off while the page is open gets the world
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);
  if (!WorldSection) return null;
  if (reduced) {
    return (
      <section id="industry-chain" className="border-b border-border py-12">
        <div className="container">
          <div className="world-frame" data-world="reduced">
            <style>{FRAME_CSS}</style>
            <p className="world-coverage">{REDUCED_NOTE}</p>
            <Schematic variant={variant} heading={heading} />
          </div>
        </div>
      </section>
    );
  }
  return (
    <Suspense fallback={<WorldPoster variant={variant} heading={heading} />}>
      {go ? <WorldSection variant={variant} heading={heading} /> : <WorldPoster variant={variant} heading={heading} onPainted={fetchFrame} onWake={fetchFrame} />}
    </Suspense>
  );
}
