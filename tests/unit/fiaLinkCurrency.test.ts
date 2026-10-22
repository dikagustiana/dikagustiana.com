/**
 * The link card's per-unit money across currencies and volume units: a
 * package that reports in US dollars is never mixed with rupiah (the viewer
 * holds no exchange rate), and "thousand tonnes" meets "Mt" on one scale.
 */
import { describe, expect, it } from 'vitest';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { splitRowRef } from '@/lib/finance-in-action/contract/types';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { perUnitRp } from '@/lib/finance-in-action/linkMath';

const base = (ticker: string): ModelPackage => {
  const entry = previewRegistry().companies.find((c) => c.ticker === ticker);
  if (!entry?.pkg) throw new Error(`no package for ${ticker}`);
  return structuredClone(entry.pkg);
};

function row(pkg: ModelPackage, rowRef: string) {
  const r = splitRowRef(rowRef)!;
  return pkg.sheets.find((s) => s.id === r.sheet)!.rows.find((x) => x.id === r.rowId)!;
}

describe('per-unit money in the link card', () => {
  const pkg = base('SCEM');
  const revenueRef = pkg.unitEconomics.lines.find((l) => l.role === 'revenue')!.rowRef;
  const period = pkg.unitEconomics.periods[0];

  it('reads a rupiah package', () => {
    expect(perUnitRp(pkg, revenueRef, period)).not.toBeNull();
  });

  it('gives the same rupiah per tonne whether volume is in Mt or thousand tonnes', () => {
    const before = perUnitRp(pkg, revenueRef, period);
    const scaled = base('SCEM');
    const denom = row(scaled, scaled.unitEconomics.denominatorRowRef);
    const factor = denom.unit === 'Mt' ? 1e3 : denom.unit === 'kt' ? 1 : null;
    if (factor === null) return; // the fixture states volume in another unit; nothing to rescale
    denom.unit = 'thousand tonnes';
    denom.cells.forEach((c) => { if (c.value !== null) c.value *= factor; });
    expect(perUnitRp(scaled, revenueRef, period)).toBeCloseTo(before!, 6);
  });

  it('leaves a US dollar package missing rather than converting it', () => {
    const usd = base('SCEM');
    row(usd, revenueRef).unit = 'US$ thousand';
    expect(perUnitRp(usd, revenueRef, period)).toBeNull();
  });
});
