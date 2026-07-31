import { describe, it, expect } from 'vitest';
import {
  normalizeSectionValue,
  looksLikeUuid,
  looksLikeSlug,
  resolveSectionSlug,
  isFigureEnabledSection,
} from '@/lib/admin/sectionResolution';
import type { Section } from '@/hooks/queries/useSections';

const sections = [
  { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', slug: 'finance' },
  { id: '11111111-1111-4111-8111-111111111111', slug: 'green-transition' },
] as Section[];

describe('normalizeSectionValue', () => {
  it('trims and coerces null/undefined to empty', () => {
    expect(normalizeSectionValue('  finance ')).toBe('finance');
    expect(normalizeSectionValue(null)).toBe('');
    expect(normalizeSectionValue(undefined)).toBe('');
  });
});

describe('looksLikeUuid', () => {
  it('accepts a valid v4 uuid', () => {
    expect(looksLikeUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
  });
  it('rejects slugs and garbage', () => {
    expect(looksLikeUuid('finance')).toBe(false);
    expect(looksLikeUuid('not-a-uuid')).toBe(false);
  });
});

describe('looksLikeSlug', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(looksLikeSlug('green-transition')).toBe(true);
    expect(looksLikeSlug('finance')).toBe(true);
  });
  it('rejects uppercase, spaces, leading/trailing/double hyphens', () => {
    expect(looksLikeSlug('Finance')).toBe(false);
    expect(looksLikeSlug('a b')).toBe(false);
    expect(looksLikeSlug('-finance')).toBe(false);
    expect(looksLikeSlug('finance-')).toBe(false);
    expect(looksLikeSlug('a--b')).toBe(false);
  });
});

describe('resolveSectionSlug', () => {
  it('resolves by exact slug when sections are loaded', () => {
    expect(resolveSectionSlug('finance', sections)).toBe('finance');
  });
  it('resolves an id to its slug', () => {
    expect(resolveSectionSlug('11111111-1111-4111-8111-111111111111', sections)).toBe('green-transition');
  });
  it('returns empty for an unknown value when sections are loaded (strict)', () => {
    expect(resolveSectionSlug('marketing', sections)).toBe('');
  });
  it('falls back to slug-shaped values when sections are not yet loaded', () => {
    expect(resolveSectionSlug('finance', null)).toBe('finance');
    expect(resolveSectionSlug('finance')).toBe('finance');
  });
  it('rejects a UUID/garbage fallback when sections are not loaded', () => {
    expect(resolveSectionSlug('3f2504e0-4f89-41d3-9a0c-0305e82c3301', null)).toBe('');
    expect(resolveSectionSlug('   ', null)).toBe('');
  });
});

describe('isFigureEnabledSection', () => {
  it('is true for figure-enabled sections', () => {
    expect(isFigureEnabledSection('finance')).toBe(true);
    expect(isFigureEnabledSection('green-transition')).toBe(true);
  });
  it('is false for others', () => {
    expect(isFigureEnabledSection('books')).toBe(false);
  });
});
