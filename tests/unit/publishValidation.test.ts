import { describe, it, expect } from 'vitest';
import { validateForPublish } from '@/lib/admin/publishValidation';
import type { JSONContent } from '@tiptap/core';

const base = {
  title: 'My Essay',
  slug: 'my-essay',
  resolvedSection: 'finance',
  sectionValidated: true,
  contentJson: { type: 'doc', content: [] } as JSONContent,
  voiceRole: 'hybrid' as const,
  managerFields: {},
  economistFields: {},
  educatorFields: {},
  coachFields: {},
};

describe('validateForPublish', () => {
  it('passes a minimal valid hybrid essay', () => {
    const r = validateForPublish(base);
    expect(r.canPublish).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('requires title, slug and a validated section', () => {
    const r = validateForPublish({ ...base, title: ' ', slug: '', sectionValidated: false, resolvedSection: '' });
    expect(r.canPublish).toBe(false);
    const fields = r.errors.map((e) => e.field);
    expect(fields).toContain('title');
    expect(fields).toContain('slug');
    expect(fields).toContain('section');
  });

  it('errors on a figure missing alt text', () => {
    const contentJson = {
      type: 'doc',
      content: [{ type: 'figure', attrs: { src: 'a.png', altText: '' } }],
    } as JSONContent;
    const r = validateForPublish({ ...base, contentJson });
    expect(r.canPublish).toBe(false);
    expect(r.errors.some((e) => /Alt text is required/.test(e.message))).toBe(true);
  });

  it('green-transition requires figure source', () => {
    const contentJson = {
      type: 'doc',
      content: [{ type: 'figure', attrs: { src: 'a.png', altText: 'A', sourceName: '' } }],
    } as JSONContent;
    const r = validateForPublish({ ...base, resolvedSection: 'green-transition', contentJson });
    expect(r.errors.some((e) => /Source is required/.test(e.message))).toBe(true);
  });

  it('warns (not errors) for a very tall figure', () => {
    const contentJson = {
      type: 'doc',
      content: [{ type: 'figure', attrs: { src: 'a.png', altText: 'A', aspectRatio: 3 } }],
    } as JSONContent;
    const r = validateForPublish({ ...base, contentJson });
    expect(r.canPublish).toBe(true);
    expect(r.warnings.some((w) => /Very tall/.test(w.message))).toBe(true);
  });

  it('enforces tone fields for non-hybrid roles', () => {
    const r = validateForPublish({ ...base, voiceRole: 'manager' });
    expect(r.canPublish).toBe(false);
    expect(r.errors.some((e) => e.field === 'tone_fields')).toBe(true);
  });

  it('a complete manager essay can publish', () => {
    const r = validateForPublish({
      ...base,
      voiceRole: 'manager',
      managerFields: {
        whenYouNeedThis: 'now',
        whatToCalculate: 'NPV',
        procedure: ['step'],
        decisionSupported: 'invest?',
        commonErrors: [{ error: 'e', consequence: 'c' }],
      },
    });
    expect(r.canPublish).toBe(true);
  });
});
