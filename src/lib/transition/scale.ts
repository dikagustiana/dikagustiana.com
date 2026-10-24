/**
 * The few scale functions the transition charts need, so the tracker ships no
 * chart library (Recharts was removed from the site for weight, GATE_LEDGER
 * row 5; the tracker must load under 2 s on 4G).
 */

export function dayNumber(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;
}

export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** "Nice" ticks across [lo, hi], about `count` of them. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const raw = (hi - lo) / Math.max(count, 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** Year ticks across a date span: every year, or every 2, 5, 10 when long. */
export function yearTicks(fromIso: string, toIso: string, maxTicks = 8): number[] {
  const y0 = Number(fromIso.slice(0, 4));
  const y1 = Number(toIso.slice(0, 4));
  const span = Math.max(y1 - y0, 1);
  const step = [1, 2, 5, 10, 20].find((s) => span / s <= maxTicks) ?? 25;
  const years: number[] = [];
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) years.push(y);
  return years;
}
