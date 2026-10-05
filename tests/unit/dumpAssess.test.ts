/**
 * The backup dump's trust decision (WO-13, docs/review/09-plan.md): a dump
 * whose essays come back below the floor — the classic anon-key dump that
 * RLS-hides every draft — must be recognisable as untrustworthy, not
 * uploaded as a good artifact. These rules are what the daily workflow's
 * belt-and-braces step stands on.
 */
import { describe, it, expect } from 'vitest';
import { TABLES, assessTable, assessTableError, buildIntegrity } from '../../scripts/lib/dumpAssess.mjs';

describe('dumpAssess', () => {
  it('marks a table below its floor as suspicious', () => {
    const a = assessTable('essays', 100, 5, 1234);
    expect(a.belowFloor).toBe(true);
    expect(a.entry).toEqual({ rows: 5, bytes: 1234, below_expected_floor: true });
  });

  it('passes a table at or above its floor', () => {
    expect(assessTable('essays', 100, 162, 500000).belowFloor).toBe(false);
    expect(assessTable('finance_settings', 0, 0, 2).belowFloor).toBe(false);
  });

  it('floors every content table that must be non-empty', () => {
    const floors = Object.fromEntries(TABLES.map(t => [t.name, t.min]));
    expect(floors.essays).toBeGreaterThanOrEqual(100);
    expect(floors.finance_modules).toBeGreaterThanOrEqual(10);
    expect(floors.sections).toBeGreaterThanOrEqual(1);
  });

  it('an errored table always records why', () => {
    expect(assessTableError('HTTP 401')).toEqual({ entry: { error: 'HTTP 401' } });
  });

  it('integrity counts prove the bodies are actually in the dump', () => {
    const essays = [
      { content: '<p>a</p>', content_json: null, presentation: { deck: 'd' }, published: true },
      { content: null, content_json: { type: 'doc' }, presentation: null, published: false },
      { content: null, content_json: null, presentation: null, published: false },
    ];
    expect(buildIntegrity(essays)).toEqual({
      essays_total: 3,
      essays_with_body: 2,
      essays_with_presentation: 1,
      published: 1,
    });
  });

  it('a dump of empty rows reads as zero bodies, never as complete', () => {
    expect(buildIntegrity([])).toEqual({
      essays_total: 0,
      essays_with_body: 0,
      essays_with_presentation: 0,
      published: 0,
    });
  });
});
