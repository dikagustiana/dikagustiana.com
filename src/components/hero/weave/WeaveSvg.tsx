import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { fmt, looseD, nodePosition, type Weave } from './geometry';

// The hero's tokens (WeaveHero), set as style rather than as presentation
// attributes, which do not take var() in every browser.
const INK = { stroke: 'var(--hero-ink)' };
const ACCENT = { stroke: 'var(--hero-accent)' };
const FIBRE = { stroke: 'var(--hero-accent-fiber)' };
const BG = { stroke: 'var(--hero-bg)' };

interface WeaveSvgProps {
  weave: Weave;
  /** Whether the loose threads move (useAnimationGate). */
  running: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The weave as SVG (docs/hero-weave-prd.md §3, "Render loop").
 *
 * The first render draws the whole cloth and every loose thread at the
 * current moment, so the first frame a reader sees is complete and still.
 * While `running`, one requestAnimationFrame loop rewrites only the loose
 * paths' `d` and the nodes' `cx`/`cy`, through refs: no React state per
 * frame. The woven paths are written once. Stopped, the threads hold where
 * they are and go on from there when the loop starts again.
 *
 * Drawing order is the knot diagram of geometry.ts: woven warps, woven wefts
 * and their fibre, the background gap and warp patch at every crossing where
 * the warp is over, then the loose threads and their nodes.
 */
export function WeaveSvg({ weave, running, className, style }: WeaveSvgProps) {
  const c = weave.composition;
  const clock = useRef(0);
  const loose = useRef<Array<SVGPathElement | null>>([]);
  const nodes = useRef<Array<SVGCircleElement | null>>([]);
  const prefix = `weave${useId().replace(/:/g, '')}`;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      // A long frame (a stalled tab) moves the threads by a tenth of a second at most.
      if (last !== null) clock.current += Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = clock.current;
      weave.loose.forEach((thread, k) => loose.current[k]?.setAttribute('d', looseD(thread, t)));
      weave.nodes.forEach((node, k) => {
        const el = nodes.current[k];
        if (!el) return;
        const [x, y] = nodePosition(weave, node, t);
        el.setAttribute('cx', fmt(x));
        el.setAttribute('cy', fmt(y));
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, weave]);

  const t = clock.current;
  const warps = weave.loose.filter((x) => x.kind === 'warp');
  const wefts = weave.loose.filter((x) => x.kind === 'weft');
  const [dash, space] = c.weft.fibreDash;
  // Each fibre's dashes start in the middle of a gap at the weave entry, so
  // the woven fibre and the loose one, drawn away from that point in
  // opposite directions, read as one dashed line.
  const fibre = {
    style: FIBRE,
    strokeWidth: c.weft.fibreWidth,
    strokeDasharray: `${dash} ${space}`,
    strokeDashoffset: dash + space / 2,
    strokeLinecap: 'round' as const,
  };

  return (
    <svg
      viewBox={`0 0 ${c.width} ${c.height}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      data-composition={c.name}
    >
      <defs>
        {wefts.map((thread, j) => (
          <path
            key={thread.index}
            id={`${prefix}-weft-${thread.index}`}
            // weave.loose holds the warps first, then the wefts
            ref={(el) => (loose.current[warps.length + j] = el)}
            d={looseD(thread, t)}
          />
        ))}
      </defs>

      <g fill="none">
        <path d={weave.woven.warps} style={INK} strokeWidth={c.warp.strokeWidth} />
        <path d={weave.woven.wefts} style={ACCENT} strokeWidth={c.weft.strokeWidth} />
        {weave.woven.fibres.map((d, j) => (
          <path key={j} d={d} {...fibre} />
        ))}
        <path d={weave.woven.gaps} style={BG} strokeWidth={c.warp.strokeWidth + 2 * c.crossingGap} />
        <path d={weave.woven.patches} style={INK} strokeWidth={c.warp.strokeWidth} />

        {wefts.map((thread) => (
          <g key={thread.index} data-thread="weft">
            <use
              href={`#${prefix}-weft-${thread.index}`}
              style={ACCENT}
              strokeWidth={c.weft.strokeWidth}
              strokeLinecap="round"
            />
            <use href={`#${prefix}-weft-${thread.index}`} {...fibre} />
          </g>
        ))}

        {warps.map((thread, i) => (
          <path
            key={thread.index}
            ref={(el) => (loose.current[i] = el)}
            d={looseD(thread, t)}
            style={INK}
            strokeWidth={c.warp.strokeWidth}
            strokeLinecap="round"
            data-thread="warp"
          />
        ))}
      </g>

      {weave.nodes.map((node, k) => {
        const [x, y] = nodePosition(weave, node, t);
        return (
          <circle
            key={k}
            ref={(el) => (nodes.current[k] = el)}
            cx={fmt(x)}
            cy={fmt(y)}
            r={node.r}
            style={{ ...INK, fill: node.hollow ? 'var(--hero-bg)' : 'var(--hero-ink)' }}
            strokeWidth={node.hollow ? c.warp.nodes.hollowStroke : 0}
          />
        );
      })}
    </svg>
  );
}
