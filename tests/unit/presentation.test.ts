import { describe, it, expect } from 'vitest';
import { resolvePresentation, type EssayPresentation } from '@/lib/presentation';

const NEW: EssayPresentation = { deck: 'from presentation', key_takeaways: ['a', 'b', 'c'] };
const OLD: EssayPresentation = { deck: 'from economist_fields', key_takeaways: ['x'] };

describe('resolvePresentation', () => {
  // The precedence assertion is the point of this test. During the window
  // between adding `presentation` and dropping the four persona columns, both
  // are populated with identical data, so a page rendering correctly does NOT
  // by itself prove it read the new column. This does.
  it('prefers presentation over the legacy persona columns', () => {
    const got = resolvePresentation({ presentation: NEW, economist_fields: OLD });
    expect(got.deck).toBe('from presentation');
    expect(got.key_takeaways).toHaveLength(3);
  });

  it('falls back to economist_fields when presentation is null', () => {
    expect(resolvePresentation({ presentation: null, economist_fields: OLD }).deck).toBe(
      'from economist_fields',
    );
  });

  it('falls back through the other persona columns in order', () => {
    expect(resolvePresentation({ manager_fields: OLD }).deck).toBe('from economist_fields');
    expect(resolvePresentation({ educator_fields: OLD }).deck).toBe('from economist_fields');
    expect(resolvePresentation({ coach_fields: OLD }).deck).toBe('from economist_fields');
  });

  it('returns an empty payload rather than throwing on null/absent rows', () => {
    expect(resolvePresentation(null)).toEqual({});
    expect(resolvePresentation(undefined)).toEqual({});
    expect(resolvePresentation({})).toEqual({});
  });

  it('does not treat an empty payload as missing', () => {
    // An essay deliberately saved with no references must stay empty, not
    // silently inherit whatever the legacy column still holds.
    expect(resolvePresentation({ presentation: {}, economist_fields: OLD })).toEqual({});
  });
});
