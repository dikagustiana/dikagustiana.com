/**
 * Foundations of Knowing has its structure in two places: FOUNDATIONS_PARTS
 * (the pages, the nav, the writer's picker) and the migrations that seeded the
 * category rows and the stubs. Nothing at runtime ties them, so this does.
 * The 2026-10-24 seed made ten parts and 56 stubs (2/6/5/6/7/5/7/6/6/6); the
 * 2026-10-26 migration put Mathematization in as Part 3, moved every part from
 * 3 up one number and its stubs' sort_order up 100, and added six stubs. Here
 * the seed is replayed through that shift and compared with the constant:
 * same parts, same order, sort_order = part × 100 + place.
 *
 * It also holds the two moved addresses to their 301s in vercel.json, and the
 * Development Finance theme to its place in The Next Big Thing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOUNDATIONS_PARTS, foundationsPartName } from '@/config/foundationsOfKnowing';
import { NEXT_BIG_THING_THEMES, nextBigThingThemeDescription } from '@/config/nextBigThingThemes';
import { FOUNDATIONS_ESSAYS_KEY } from '@/hooks/queries/useFoundationsEssays';

const migration = (name: string) =>
  readFileSync(join(__dirname, '../../supabase/migrations', name), 'utf8');
const MIGRATION = migration('20261024185538_foundations_of_knowing.sql');
const MATH = migration('20261026120000_foundations_of_knowing_mathematization.sql');
const VERCEL = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8'));

const SEED_PARTS = [...MIGRATION.matchAll(/^\s*\((\d), '([a-z-]+)',\s+'Part \d · ([^']+)'\)/gm)].map((m) => ({
  number: Number(m[1]),
  id: m[2],
  label: m[3],
}));
const SEED_STUBS = [...MIGRATION.matchAll(/^\s*\((\d+),\s+'([a-z-]+)', '([a-z0-9-]+)', '/gm)].map((m) => ({
  sortOrder: Number(m[1]),
  phase: m[2],
  slug: m[3],
}));
const MATH_STUBS = [...MATH.matchAll(/^\s*\((\d+), '([a-z0-9-]+)', '/gm)].map((m) => ({
  sortOrder: Number(m[1]),
  phase: 'mathematization',
  slug: m[2],
}));

// The database after both migrations.
const PARTS_NOW = [
  ...SEED_PARTS.map((p) => (p.number >= 3 ? { ...p, number: p.number + 1 } : p)),
  { number: 3, id: 'mathematization', label: 'Mathematization' },
].sort((a, b) => a.number - b.number);
const STUBS_NOW = [
  ...SEED_STUBS.map((s) => (s.sortOrder >= 300 ? { ...s, sortOrder: s.sortOrder + 100 } : s)),
  ...MATH_STUBS,
];

describe('Foundations of Knowing parts', () => {
  it('numbers eleven parts 0-10, in order', () => {
    expect(FOUNDATIONS_PARTS.map((p) => p.number)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(FOUNDATIONS_PARTS.map((p) => p.id)).size).toBe(11);
  });

  it('has one category per part, named and ordered as the constant', () => {
    expect(SEED_PARTS).toHaveLength(10);
    expect(MATH).toContain("'critical-thinking-mathematization', 'Part 3 · Mathematization', 3");
    expect(PARTS_NOW.map((p) => ({ number: p.number, id: p.id, name: `Part ${p.number} · ${p.label}` }))).toEqual(
      FOUNDATIONS_PARTS.map((p) => ({ number: p.number, id: p.id, name: foundationsPartName(p) })),
    );
  });

  it('has 62 stubs, 2/6/5/6/6/7/5/7/6/6/6, sort_order = part × 100 + place', () => {
    expect(SEED_STUBS).toHaveLength(56);
    expect(MATH_STUBS).toHaveLength(6);
    expect(new Set(STUBS_NOW.map((s) => s.slug)).size).toBe(62);
    const perPart = FOUNDATIONS_PARTS.map((p) => STUBS_NOW.filter((s) => s.phase === p.id));
    expect(perPart.map((r) => r.length)).toEqual([2, 6, 5, 6, 6, 7, 5, 7, 6, 6, 6]);
    perPart.forEach((rows, n) => {
      expect(rows.map((r) => r.sortOrder)).toEqual(rows.map((_, i) => n * 100 + i + 1));
    });
  });
});

describe('the pages after an admin change', () => {
  it("read under the ['essays'] prefix the content mutations invalidate", () => {
    // useUnifiedContent's publish/unpublish/archive/restore/delete invalidate
    // ['essays']; a key outside it kept a published essay "Planned" for up to
    // staleTime (Codex review of PR #88).
    expect(FOUNDATIONS_ESSAYS_KEY[0]).toBe('essays');
    const writer = readFileSync(join(__dirname, '../../src/components/writer/WriterEditor.tsx'), 'utf8');
    expect(writer).toContain('invalidateQueries({ queryKey: FOUNDATIONS_ESSAYS_KEY })');
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
