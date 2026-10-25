/**
 * docs/prd/2026-10-fia-fixes item 7: the fia.fx_rates seed is what
 * scripts/fia/jisdor-seed.mjs works from BI's daily JISDOR fixings
 * (data/fx/jisdor-usd-2024-07-to-2026-06.csv), and the file holds them whole.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261024150000_fia_fx_rates.sql'), 'utf8');
const CSV = fs.readFileSync(path.join(ROOT, 'data/fx/jisdor-usd-2024-07-to-2026-06.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));

describe('the JISDOR seed', () => {
  it('is the script\'s output, row for row', () => {
    const rows = execFileSync('node', [path.join(ROOT, 'scripts/fia/jisdor-seed.mjs')], { encoding: 'utf8' }).trim();
    expect(MIGRATION).toContain(rows);
    expect(MIGRATION).not.toMatch(/NULL \/\* PENDING/);
    expect(rows.split('\n')).toHaveLength(20);
  });

  it('reads 477 fixings, in date order, on working days, with the quarters BI returned', () => {
    expect(CSV).toHaveLength(477);
    const dates = CSV.map((r) => r[1]);
    expect([...dates].sort()).toEqual(dates);
    for (const d of dates) expect([0, 6]).not.toContain(new Date(`${d}T00:00:00Z`).getUTCDay());
    const per = (prefix: string[]) => dates.filter((d) => prefix.some((p) => d.startsWith(p))).length;
    expect(per(['2024-07', '2024-08', '2024-09'])).toBe(65);
    expect(per(['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'])).toBe(237);
    expect(per(['2026-04', '2026-05', '2026-06'])).toBe(57);
  });

  it('agrees with BI\'s own posts on two dates (28 Feb 2025 Rp16,575; 8 Sep 2025 Rp16,348)', () => {
    const at = (d: string) => Number(CSV.find((r) => r[1] === d)![2]);
    expect(at('2025-02-28')).toBe(16575);
    expect(at('2025-09-08')).toBe(16348);
  });
});
