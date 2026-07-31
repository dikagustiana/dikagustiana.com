import { describe, it, expect } from 'vitest';
import { canAutosave } from '@/domains/writing/schema/types';

describe('canAutosave', () => {
  const ok = { essayId: 'e1', title: 'Hello', sectionId: 's1', categoryId: 'c1' };

  it('allows autosave when the essay exists and has required placement', () => {
    expect(canAutosave(ok)).toBe(true);
  });

  it('blocks autosave for not-yet-created essays (no id)', () => {
    expect(canAutosave({ ...ok, essayId: null })).toBe(false);
  });

  it('blocks autosave without a section or category (NOT NULL FK)', () => {
    expect(canAutosave({ ...ok, sectionId: '' })).toBe(false);
    expect(canAutosave({ ...ok, categoryId: '' })).toBe(false);
  });

  it('blocks autosave with a blank title', () => {
    expect(canAutosave({ ...ok, title: '   ' })).toBe(false);
  });
});
