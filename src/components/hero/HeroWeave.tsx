import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DPR_MAX, RESIZE_DEBOUNCE_MS } from './weave/constants';
import { buildWeave, type Rect, type WeaveModel } from './weave/geometry';
import { drawWeave, preparePaint, type Paint, type Palette } from './weave/render';
import { REDUCED_MOTION, useAnimationGate } from './weave/useAnimationGate';

interface HeroWeaveProps {
  /** The stacked layout's fully woven block, or the desktop weave behind the text. */
  mobile: boolean;
  /** The headline block, for the wefts that pass under it. */
  textRef: RefObject<HTMLElement>;
  className?: string;
}

interface Scene {
  ctx: CanvasRenderingContext2D;
  model: WeaveModel;
  paint: Paint;
}

/** The hero's thread colours, read from its tokens (WeaveHero). */
function readPalette(el: Element): Palette {
  const css = getComputedStyle(el);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: token('--hero-ink', '#1E2761'),
    accent: token('--hero-accent', '#C2694A'),
    fibre: token('--hero-accent-fiber', '#D98B6E'),
  };
}

/**
 * The weave's canvas host (docs/home-hero-v2.md §3 "Lifecycle").
 *
 * One <canvas>, decorative (aria-hidden, takes no pointer, never focused),
 * at the device's pixel ratio capped at 2. The model is built from the
 * canvas's size and the headline block's rectangle, and built again 150 ms
 * after the last resize, and once the headline's face has loaded. One
 * requestAnimationFrame loop draws while useAnimationGate allows it; the
 * clock advances only while it runs, so the intro and the idle motion go on
 * from where they stopped. The intro plays once per mount: the clock is this
 * component's own, not stored anywhere. With reduced motion the canvas
 * holds the intro's last frame.
 */
export function HeroWeave({ mobile, textRef, className }: HeroWeaveProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const running = useAnimationGate(canvas);
  const reduced = useMediaQuery(REDUCED_MOTION);
  const scene = useRef<Scene | null>(null);
  const clock = useRef(0);

  const draw = useCallback(() => {
    const s = scene.current;
    if (!s) return;
    s.ctx.clearRect(0, 0, s.model.width, s.model.height);
    drawWeave(s.ctx, s.model, s.paint, clock.current, reduced);
  }, [reduced]);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = el.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;
    const context = ctx;
    let live = true;
    const build = () => {
      if (!live) return;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
      el.width = Math.round(box.width * dpr);
      el.height = Math.round(box.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = mobile ? null : textRef.current?.getBoundingClientRect();
      const text: Rect | null = t ? { left: t.left - box.left, top: t.top - box.top, right: t.right - box.left, bottom: t.bottom - box.top } : null;
      const model = buildWeave({ width: box.width, height: box.height, viewportWidth: window.innerWidth, mobile, text });
      scene.current = { ctx: context, model, paint: preparePaint(context, model, readPalette(el)) };
      el.dataset.pitch = String(model.pitch);
      el.dataset.warps = String(model.warps.length);
      el.dataset.wefts = String(model.wefts.length);
      draw();
    };
    build();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(build, RESIZE_DEBOUNCE_MS);
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null;
    ro?.observe(el);
    if (textRef.current) ro?.observe(textRef.current);
    document.fonts?.ready.then(build);
    return () => {
      live = false;
      clearTimeout(timer);
      ro?.disconnect();
    };
  }, [mobile, textRef, draw]);

  useEffect(() => {
    if (!running) {
      draw();
      return;
    }
    let raf = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      // A long gap (a stalled tab) moves the weave on by a tenth of a second at most.
      if (last !== null) clock.current += Math.min(0.1, (now - last) / 1000);
      last = now;
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, draw]);

  return <canvas ref={canvas} aria-hidden="true" className={className} data-weave={mobile ? 'mobile' : 'desktop'} />;
}
