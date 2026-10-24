/**
 * Foundations of Knowing has its structure in two places: FOUNDATIONS_PARTS
 * (the pages, the nav, the writer's picker) and the migration that seeded the
 * category rows and the 56 stubs. Nothing at runtime ties them, so this does:
 * the parts in the migration are the parts here, in the same order, and the
 * stubs fall 2/6/5/6/7/5/7/6/6/6 with sort_order = part × 100 + place.
 *
 * It also holds the two moved addresses to their 301s in vercel.json, and the
 * Development Finance theme to its place in The Next Big Thing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOUNDATIONS_PARTS, foundationsPartName } from '@/config/foundationsOfKnowing';
import { NEXT_BIG_THING_THEMES, nextBigThingThemeDescription } from '@/config/nextBigThingThemes';

const MIGRATION = readFileSync(
  join(__dirname, '../../supabase/migrations/20261024185538_foundations_of_knowing.sql'),
  'utf8',
);
const VERCEL = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8'));

describe('Foundations of Knowing parts', () => {
  it('numbers ten parts 0-9, in order', () => {
    expect(FOUNDATIONS_PARTS.map((p) => p.number)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(FOUNDATIONS_PARTS.map((p) => p.id)).size).toBe(10);
  });

  it('seeds one category per part, named and ordered as the constant', () => {
    const rows = [...MIGRATION.matchAll(/^\s*\((\d), '([a-z-]+)',\s+'([^']+)'\)/gm)].map((m) => ({
      number: Number(m[1]),
      id: m[2],
      name: m[3],
    }));
    expect(rows).toEqual(
      FOUNDATIONS_PARTS.map((p) => ({ number: p.number, id: p.id, name: foundationsPartName(p) })),
    );
  });

  it('seeds 56 stubs, 2/6/5/6/7/5/7/6/6/6, sort_order = part × 100 + place', () => {
    const stubs = [...MIGRATION.matchAll(/^\s*\((\d+),\s+'([a-z-]+)', '([a-z0-9-]+)', '/gm)].map((m) => ({
      sortOrder: Number(m[1]),
      phase: m[2],
      slug: m[3],
    }));
    expect(stubs).toHaveLength(56);
    expect(new Set(stubs.map((s) => s.slug)).size).toBe(56);
    const perPart = FOUNDATIONS_PARTS.map((p) => stubs.filter((s) => s.phase === p.id));
    expect(perPart.map((r) => r.length)).toEqual([2, 6, 5, 6, 7, 5, 7, 6, 6, 6]);
    perPart.forEach((rows, n) => {
      expect(rows.map((r) => r.sortOrder)).toEqual(rows.map((_, i) => n * 100 + i + 1));
    });
  });
});

describe('moved addresses', () => {
  const redirect = (source: string) =>
    (VERCEL.redirects as { source: string; destination: string; statusCode?: number }[]).find(
      (r) => r.source === source,
    );

  it.each([
    ['/critical-thinking-research', '/foundations-of-knowing'],
    ['/critical-thinking-research/:path*', '/foundations-of-knowing/:path*'],
    ['/development-finance', '/the-next-big-thing?theme=development-finance'],
    ['/development-finance/:path*', '/the-next-big-thing?theme=development-finance'],
  ])('%s answers 301 → %s', (source, destination) => {
    expect(redirect(source)).toEqual({ source, destination, statusCode: 301 });
  });
});

describe('Development Finance as a Next Big Thing theme', () => {
  it('comes last, after Growth (category sort_order 7), with the old section line', () => {
    expect(NEXT_BIG_THING_THEMES.map((t) => t.id).slice(-2)).toEqual(['growth', 'development-finance']);
    expect(nextBigThingThemeDescription('development-finance')).toMatch(/^How public capital is deployed/);
    expect(nextBigThingThemeDescription('growth')).toBeNull();
    expect(MIGRATION).toContain("'next-big-thing-development-finance', 'Development Finance', 7");
  });
});
