import { describe, it, expect } from 'vitest';
import { sanitizeSearchParams } from '@/lib/admin/sanitizeQueryParams';

describe('sanitizeSearchParams', () => {
  it('returns non-sensitive params unchanged', () => {
    const out = sanitizeSearchParams('?foo=bar&page=2');
    expect(out).toContainEqual({ key: 'foo', value: 'bar' });
    expect(out).toContainEqual({ key: 'page', value: '2' });
  });

  it('masks keys containing "token"', () => {
    const out = sanitizeSearchParams('?access_token=abcdefghijklmnop');
    const p = out.find((x) => x.key === 'access_token');
    expect(p?.value).toBe('abcd…mnop');
    expect(p?.value).not.toContain('efghij');
  });

  it('fully masks short sensitive values', () => {
    const out = sanitizeSearchParams('?token=short');
    expect(out.find((x) => x.key === 'token')?.value).toBe('***');
  });

  it('masks JWT-shaped values even under a non-sensitive key', () => {
    const jwt = 'aaaaaaaaaa.bbbbbbbbbb.cccccccccc';
    const out = sanitizeSearchParams(`?next=${jwt}`);
    const p = out.find((x) => x.key === 'next');
    expect(p?.value).toBe('aaaa…cccc');
  });

  it('does not treat a normal value with two dots as a JWT', () => {
    const out = sanitizeSearchParams('?v=1.2.3');
    expect(out.find((x) => x.key === 'v')?.value).toBe('1.2.3');
  });

  it('handles empty query strings', () => {
    expect(sanitizeSearchParams('')).toEqual([]);
    expect(sanitizeSearchParams('?')).toEqual([]);
  });
});
