import { describe, it, expect } from 'vitest';
import { resolvePresentation, PRESENTATION_COLUMNS, type EssayPresentation } from '@/lib/presentation';

const PRES: EssayPresentation = { deck: 'from presentation', key_takeaways: ['a', 'b', 'c'] };

describe('resolvePresentation', () => {
  it('reads the presentation column', () => {
    const got = resolvePresentation({ presentation: PRES });
    expect(got.deck).toBe('from presentation');
    expect(got.key_takeaways).toHaveLength(3);
  });

  it('returns an empty payload rather than throwing on null/absent rows', () => {
    expect(resolvePresentation(null)).toEqual({});
    expect(resolvePresentation(undefined)).toEqual({});
    expect(resolvePresentation({})).toEqual({});
    expect(resolvePresentation({ presentation: null })).toEqual({});
  });

  it('does not invent content for an empty payload', () => {
    expect(resolvePresentation({ presentation: {} })).toEqual({});
  });

  // The four persona columns were dropped by migration 20260802000000.
  // Selecting a dropped column is a hard PostgREST error, not a silent null,
  // so no query may name one — this pins that the shared column list is clean.
  it('the shared column list names no dropped persona column', () => {
    for (const dead of ['economist_fields', 'manager_fields', 'educator_fields', 'coach_fields']) {
      expect(PRESENTATION_COLUMNS).not.toContain(dead);
    }
  });
});
