import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { dayNumber, linear, niceTicks, yearTicks } from '@/lib/transition/scale';
import { SERIES_COLORS, formatValue, type Annotation, type ChartType, type Line, type Point } from '@/lib/transition/model';
import { SECTOR_LABEL } from '@/lib/tracker';

/**
 * The tracker's one chart, drawn in SVG from a chart's lines.
 *
 * Design rules (the dataviz method; PRD, Desain):
 *   - one y-axis per chart, never two;
 *   - navy for structure, #0070C0 for a lone data line, a validated
 *     categorical order for a mix (colour follows the member, never its rank),
 *     dark orange only for the policy markers;
 *   - IMF staff projections are dashed, actuals solid;
 *   - a crosshair and tooltip on hover and on the arrow keys, a legend for two
 *     or more lines, and a table view, so no value depends on colour or on a
 *     pointer.
 */

const STRUCTURE = '#1E2761';
const MARKER = '#9a3412';
const GRID = 'hsl(215 20% 88%)';
const INK_MUTED = 'hsl(215 15% 45%)';

export interface TransitionChartProps {
  chartType: ChartType;
  lines: Line[];
  unit: string | null;
  annotations?: Annotation[];
  /** Compact draws a shorter chart and numbers the markers without text. */
  compact?: boolean;
  /** Accessible name: the chart's finding. */
  title: string;
}

interface Period {
  x: string;
  label: string;
  values: Array<{ line: Line; color: string; point: Point }>;
}

function colorOf(lines: Line[], index: number): string {
  return lines.length === 1 ? SERIES_COLORS[0] : SERIES_COLORS[index % SERIES_COLORS.length];
}

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function TransitionChart({ chartType, lines, unit, annotations = [], compact = false, title }: TransitionChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>(640);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const height = compact ? 220 : 340;
  const m = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = Math.max(width - m.left - m.right, 80);
  const innerH = height - m.top - m.bottom;

  const colored = useMemo(() => lines.map((line, i) => ({ line, color: colorOf(lines, i) })), [lines]);

  const periods: Period[] = useMemo(() => {
    const by = new Map<string, Period>();
    for (const { line, color } of colored) {
      for (const point of line.points) {
        const p = by.get(point.x) ?? { x: point.x, label: point.label, values: [] };
        p.values.push({ line, color, point });
        by.set(point.x, p);
      }
    }
    return [...by.values()].sort((a, b) => a.x.localeCompare(b.x));
  }, [colored]);

  const isTimeline = chartType === 'timeline';
  const isBar = chartType === 'bar' || chartType === 'stacked_bar';

  const xs = isTimeline ? annotations.map((a) => a.x) : periods.map((p) => p.x);
  const xMin = xs[0];
  const xMax = xs.at(-1);

  // A timeline has no values: its events read better as a list by quarter
  // than as dots on an axis, where a quarter's entries would sit on one line.
  if (isTimeline) return <Timeline annotations={annotations} compact={compact} />;

  if (!xMin || !xMax) {
    return (
      <div ref={wrapRef} className="flex h-40 items-center justify-center border border-dashed border-border text-sm text-muted-foreground">
        No published value yet.
      </div>
    );
  }

  // Bars need room for half a bar each side of the first and last period.
  const nPeriods = Math.max(periods.length, 1);
  const band = isBar ? innerW / nPeriods : 0;
  const pad = isTimeline ? 45 : 0;
  const x = linear([dayNumber(xMin) - pad, dayNumber(xMax) + pad], isBar ? [band / 2, innerW - band / 2] : [0, innerW]);
  const xOf = (iso: string) => x(dayNumber(iso));

  let lo = 0;
  let hi = 1;
  if (!isTimeline) {
    const vals =
      chartType === 'stacked_bar'
        ? periods.map((p) => p.values.reduce((s, v) => s + Math.max(v.point.value, 0), 0))
        : periods.flatMap((p) => p.values.map((v) => v.point.value));
    lo = Math.min(...vals);
    hi = Math.max(...vals);
    if (isBar || lo >= 0) lo = Math.min(0, lo);
  }
  const yTicks = isTimeline ? [] : niceTicks(lo, hi, compact ? 4 : 5);
  const yDomain: [number, number] = isTimeline ? [0, 1] : [yTicks[0] ?? lo, yTicks.at(-1) ?? hi];
  const y = linear(yDomain, [innerH, 0]);

  const xTicks = yearTicks(xMin, xMax, Math.max(2, Math.floor(innerW / 70)));

  const linePath = (pts: Point[], step: boolean) =>
    pts
      .map((p, i) => {
        const px = xOf(p.x).toFixed(1);
        const py = y(p.value).toFixed(1);
        if (i === 0) return `M${px},${py}`;
        return step ? `H${px}V${py}` : `L${px},${py}`;
      })
      .join('');

  const move = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - m.left;
    let best = 0;
    let bestD = Infinity;
    periods.forEach((p, i) => {
      const d = Math.abs(xOf(p.x) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setActive(best);
  };
  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (svg) move(e.clientX, svg.getBoundingClientRect());
  };
  const onKey = (e: KeyboardEvent<SVGRectElement>) => {
    if (!periods.length) return;
    const last = periods.length - 1;
    const cur = active ?? last;
    const next = e.key === 'ArrowLeft' ? cur - 1 : e.key === 'ArrowRight' ? cur + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.min(Math.max(next, 0), last));
  };

  const activePeriod = active != null ? periods[active] : null;
  const tipLeft = activePeriod ? m.left + xOf(activePeriod.x) : 0;

  return (
    <figure className="m-0">
      {colored.length >= 2 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground" aria-label="Legend">
          {colored.map(({ line, color }) => (
            <li key={line.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              {line.name}
            </li>
          ))}
        </ul>
      )}

      <div ref={wrapRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
          className="block max-w-full overflow-visible font-sans"
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_MUTED}>
                  {formatValue(t, unit === '%' || unit?.startsWith('% ') ? '%' : null)}
                </text>
              </g>
            ))}
            {xTicks.map((yr) => {
              const px = xOf(`${yr}-01-01`);
              if (px < -1 || px > innerW + 1) return null;
              return (
                <text key={yr} x={px} y={innerH + 18} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
                  {yr}
                </text>
              );
            })}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke={STRUCTURE} strokeWidth={1} />

            {/* Policy markers: register entries at the end of their quarter,
                one marker per quarter numbered with its entries; a marker too
                close to the one before it drops a row so labels never sit on
                each other. */}
            {markerGroups(annotations).map((g, gi, all) => {
              const px = xOf(g.x);
              if (px < 0 || px > innerW) return null;
              const prev = gi > 0 ? xOf(all[gi - 1].x) : -Infinity;
              const rowY = px - prev < 26 && gi % 2 === 1 ? 32 : 10;
              const label = g.numbers.length === 1 ? `${g.numbers[0]}` : `${g.numbers[0]}–${g.numbers.at(-1)}`;
              return (
                <g key={g.x}>
                  <title>{g.items.map((a, i) => `${g.numbers[i]}. ${a.quarter} · ${SECTOR_LABEL[a.sector]}: ${a.finding}`).join('\n')}</title>
                  <line x1={px} x2={px} y1={rowY} y2={innerH} stroke={MARKER} strokeWidth={1} strokeDasharray="3 3" />
                  <rect x={px - (label.length * 3.4 + 7)} y={rowY - 8} width={label.length * 6.8 + 14} height={16} rx={8} fill="white" stroke={MARKER} strokeWidth={1.5} />
                  <text x={px} y={rowY} dy="0.33em" textAnchor="middle" fontSize={10} fontWeight={600} fill={MARKER}>
                    {label}
                  </text>
                </g>
              );
            })}

            {chartType === 'stacked_bar' &&
              periods.map((p) => {
                let base = 0;
                const w = Math.max(band - 4, 2);
                return (
                  <g key={p.x}>
                    {p.values.map(({ line, color, point }) => {
                      const v = Math.max(point.value, 0);
                      const y0 = y(base);
                      const y1 = y(base + v);
                      base += v;
                      return (
                        <rect
                          key={line.key}
                          x={xOf(p.x) - w / 2}
                          y={y1}
                          width={w}
                          height={Math.max(y0 - y1 - 1, 0)}
                          fill={color}
                          opacity={point.isProjection ? 0.55 : 1}
                        />
                      );
                    })}
                  </g>
                );
              })}

            {chartType === 'bar' &&
              colored.map(({ line, color }, li) => {
                const w = Math.max((band - 4) / colored.length, 2);
                return line.points.map((p) => (
                  <rect
                    key={`${line.key}-${p.x}`}
                    x={xOf(p.x) - (band - 4) / 2 + li * w}
                    y={Math.min(y(p.value), y(0))}
                    width={Math.max(w - 1, 1)}
                    height={Math.abs(y(0) - y(p.value))}
                    rx={2}
                    fill={color}
                    opacity={p.isProjection ? 0.55 : 1}
                  />
                ));
              })}

            {(chartType === 'line' || chartType === 'step') &&
              colored.map(({ line, color }) => {
                const actual = line.points.filter((p) => !p.isProjection);
                const projIdx = line.points.findIndex((p) => p.isProjection);
                // The dashed part starts at the last actual, so the line is unbroken.
                const projected = projIdx >= 0 ? line.points.slice(Math.max(projIdx - 1, 0)) : [];
                const few = line.points.length <= 40;
                return (
                  <g key={line.key}>
                    {actual.length > 0 && (
                      <path d={linePath(actual, chartType === 'step')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                    )}
                    {projected.length > 1 && (
                      <path d={linePath(projected, chartType === 'step')} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 4" />
                    )}
                    {few &&
                      line.points.map((p) => (
                        <circle key={p.x} cx={xOf(p.x)} cy={y(p.value)} r={3} fill={p.isProjection ? 'white' : color} stroke={color} strokeWidth={1.5} />
                      ))}
                  </g>
                );
              })}

            {chartType === 'dot_whisker' &&
              colored.map(({ line, color }) =>
                line.points.map((p) => (
                  <circle key={`${line.key}-${p.x}`} cx={xOf(p.x)} cy={y(p.value)} r={4} fill={p.isProjection ? 'white' : color} stroke={color} strokeWidth={2} />
                )),
              )}

            {activePeriod && (
              <line x1={xOf(activePeriod.x)} x2={xOf(activePeriod.x)} y1={0} y2={innerH} stroke={STRUCTURE} strokeWidth={1} opacity={0.5} />
            )}

            {!isTimeline && periods.length > 0 && (
              <rect
                x={0}
                y={0}
                width={innerW}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                role="slider"
                aria-label={`${title}: use the arrow keys to read each period`}
                aria-valuemin={0}
                aria-valuemax={periods.length - 1}
                aria-valuenow={active ?? periods.length - 1}
                aria-valuetext={
                  activePeriod
                    ? `${activePeriod.label}: ${activePeriod.values.map((v) => `${v.line.name} ${formatValue(v.point.value, v.line.unit)}`).join(', ')}`
                    : undefined
                }
                onPointerMove={onPointer}
                onPointerDown={onPointer}
                onPointerLeave={() => setActive(null)}
                onKeyDown={onKey}
                onBlur={() => setActive(null)}
                className="cursor-crosshair outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              />
            )}
          </g>
        </svg>

        {activePeriod && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-40 max-w-64 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-sm"
            style={{
              left: Math.min(Math.max(tipLeft + 12, 0), Math.max(width - 200, 0)),
            }}
          >
            <div className="font-semibold text-foreground">{activePeriod.label}</div>
            <ul className="mt-1 space-y-0.5">
              {activePeriod.values.map(({ line, color, point }) => (
                <li key={line.key} className="flex items-center justify-between gap-3 text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
                    {line.name}
                  </span>
                  <span className="tabular-nums">
                    {formatValue(point.value, line.unit)}
                    {point.isProjection && <span className="text-muted-foreground"> proj.</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-1 text-muted-foreground">vintage {activePeriod.values[0]?.point.vintage}</div>
          </div>
        )}
      </div>

      {annotations.length > 0 && !compact && !isTimeline && (
        <ol className="mt-3 space-y-1 text-sm text-foreground" aria-label="Policy markers">
          {annotations.map((a, i) => (
            <li key={a.id} className="flex gap-2">
              <span className="w-5 shrink-0 font-semibold tabular-nums" style={{ color: MARKER }}>
                {i + 1}
              </span>
              <span>
                <span className="text-muted-foreground">
                  {a.quarter} · {SECTOR_LABEL[a.sector]}.{' '}
                </span>
                {a.finding}
              </span>
            </li>
          ))}
        </ol>
      )}
      {annotations.length > 0 && compact && !isTimeline && (
        <p className="mt-2 text-xs text-muted-foreground">
          {annotations.length} policy marker{annotations.length === 1 ? '' : 's'} from the tracker register, listed on the chart’s own page.
        </p>
      )}

      {!isTimeline && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs text-accent underline underline-offset-2 hover:opacity-80"
            aria-expanded={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? 'Hide the table' : 'Show the values as a table'}
          </button>
          {showTable && (
            <div id={tableId} className="mt-2 max-h-72 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Period</th>
                    {colored.map(({ line }) => (
                      <th key={line.key} className="py-1 pr-3 text-right font-medium">
                        {line.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...periods].reverse().map((p) => (
                    <tr key={p.x} className="border-b border-border/60">
                      <td className="py-1 pr-3 tabular-nums">{p.label}</td>
                      {colored.map(({ line }) => {
                        const v = p.values.find((pv) => pv.line.key === line.key);
                        return (
                          <td key={line.key} className="py-1 pr-3 text-right tabular-nums">
                            {v ? formatValue(v.point.value, line.unit) + (v.point.isProjection ? ' (proj.)' : '') : '–'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

function Timeline({ annotations, compact }: { annotations: Annotation[]; compact: boolean }) {
  if (annotations.length === 0) {
    return <p className="text-sm text-muted-foreground">No verified register entry is published for these sectors.</p>;
  }
  const quarters = [...new Set(annotations.map((a) => a.quarter))].sort();
  return (
    <ol className="relative space-y-6 border-l-2 pl-5" style={{ borderColor: MARKER }} aria-label="Policy timeline">
      {quarters.map((q) => (
        <li key={q} className="relative">
          <span aria-hidden="true" className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 bg-background" style={{ borderColor: MARKER }} />
          <p className="font-sans text-sm font-semibold text-foreground">{q.replace('Q', ' Q')}</p>
          <ul className="mt-2 space-y-2">
            {annotations
              .filter((a) => a.quarter === q)
              .map((a) => (
                <li key={a.id} className="text-sm leading-snug">
                  <span className="font-medium" style={{ color: MARKER }}>
                    {SECTOR_LABEL[a.sector]}
                  </span>{' '}
                  <span className={compact ? 'line-clamp-2 text-foreground' : 'text-foreground'}>{a.finding}</span>
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** Annotations grouped by date, each keeping its number in the list order. */
function markerGroups(annotations: Annotation[]): Array<{ x: string; items: Annotation[]; numbers: number[] }> {
  const by = new Map<string, { x: string; items: Annotation[]; numbers: number[] }>();
  annotations.forEach((a, i) => {
    const g = by.get(a.x) ?? { x: a.x, items: [], numbers: [] };
    g.items.push(a);
    g.numbers.push(i + 1);
    by.set(a.x, g);
  });
  return [...by.values()].sort((p, q) => p.x.localeCompare(q.x));
}
