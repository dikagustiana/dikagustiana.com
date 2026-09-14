import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isPublished, PUBLISHED_COLUMN } from '@/lib/publication';

/**
 * One publication predicate, and it is the one the database enforces.
 *
 * `essays` carries both `published` (boolean) and `status` (enum). RLS gates
 * reads on `published = true` — verified against the live project on
 * 2026-09-14 by reading pg_policy — and consults `status` nowhere. A reader
 * query filtering on `status` therefore applies a second, unenforced gate: a
 * row RLS served whose `status` had drifted would be hidden from the reader
 * entitled to it, and the page would report it as absent.
 *
 * The two agreed on all 165 rows on that date, so this was invisible. That is
 * exactly why it needs a test rather than a comment.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/**
 * Admin surfaces legitimately read `status`: it is the writer's workflow label
 * (draft / published / archived) and drives editor state, queues and badges.
 * What none of them may do is use it as the PUBLICATION GATE in a query.
 */
const READER_SURFACES = walk('src').filter(
  (f) =>
    !f.includes('/admin') &&
    !f.includes('/writer') &&
    !f.includes('/domains/writing') &&
    !f.includes('/brief/') &&
    !/Admin|Writer|useUnifiedContent/.test(f),
);

describe('publication predicate', () => {
  it('names the column RLS gates on', () => {
    expect(PUBLISHED_COLUMN).toBe('published');
  });

  it('treats only published = true as published', () => {
    expect(isPublished({ published: true })).toBe(true);
    expect(isPublished({ published: false })).toBe(false);
    expect(isPublished({ published: null })).toBe(false);
    expect(isPublished({})).toBe(false);
  });

  it('is never expressed as a status filter on a reader surface', () => {
    const offenders = READER_SURFACES.filter((f) =>
      /\.eq\(\s*['"]status['"]\s*,\s*['"]published['"]\s*\)/.test(readFileSync(f, 'utf-8')),
    );
    expect(offenders).toEqual([]);
  });

  it('is never expressed as a status comparison gating what a reader sees', () => {
    const offenders = READER_SURFACES.filter((f) =>
      /\bdata\.status\s*[!=]==\s*['"]published['"]/.test(readFileSync(f, 'utf-8')),
    );
    expect(offenders).toEqual([]);
  });
});

describe('error copy claims only what a failed fetch knows', () => {
  const ALL = walk('src');

  it('never tells a reader their essay is still there after a failed fetch', () => {
    // A failed fetch establishes neither existence nor absence. The old copy
    // asserted existence, which is the same class of error as rendering 404
    // on an outage — just pointing the other way.
    const offenders = ALL.filter((f) => /still there/i.test(readFileSync(f, 'utf-8')));
    expect(offenders).toEqual([]);
  });
});

describe('share-card descriptions', () => {
  it('collapses whitespace rather than carrying a newline into a meta attribute', async () => {
    const { readFileSync } = await import('node:fs');
    // Verified in production on 2026-09-14: one published essay's deck ends in
    // a newline, and it appears inside the content attribute of five tags on
    // https://www.dikagustiana.com/the-next-big-thing/economy/indonesias-reindustrialization-bet
    // Both the runtime tags and the build-time ones now normalise it.
    expect(readFileSync('src/components/SEO.tsx', 'utf-8')).toMatch(/description\.replace\(\/\\s\+\/g, ' '\)\.trim\(\)/);
    expect(readFileSync('scripts/prerender.mjs', 'utf-8')).toMatch(/\.replace\(\/\\s\+\/g, ' '\)\.trim\(\)/);
  });
});
