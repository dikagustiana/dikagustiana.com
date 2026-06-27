import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

/**
 * Security regression tests for the centralized HTML sanitizer used on every
 * dangerouslySetInnerHTML path (legacy essays, finance framing, writer preview,
 * admin content preview). These lock in the XSS defenses.
 */
describe('sanitizeHtml', () => {
  it('returns an empty string for nullish input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('preserves safe formatting markup', () => {
    const html = '<p>Hello <strong>world</strong> and <em>math</em></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('preserves links, lists and tables', () => {
    const out = sanitizeHtml(
      '<a href="https://example.com">x</a><ul><li>a</li></ul><table><tbody><tr><td>c</td></tr></tbody></table>'
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('<li>a</li>');
    expect(out).toContain('<td>c</td>');
  });

  it('strips <script> tags', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain('<p>ok</p>');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('removes inline event-handler attributes', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)" />');
    expect(out.toLowerCase()).not.toContain('onerror');
    expect(out).not.toContain('alert(1)');
  });

  it('neutralizes javascript: URLs in href', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('drops disallowed embedding tags (iframe/object/embed/form)', () => {
    const out = sanitizeHtml(
      '<iframe src="https://evil.test"></iframe><object data="x"></object><embed src="x"><form action="/x"></form>'
    );
    expect(out.toLowerCase()).not.toContain('<iframe');
    expect(out.toLowerCase()).not.toContain('<object');
    expect(out.toLowerCase()).not.toContain('<embed');
    expect(out.toLowerCase()).not.toContain('<form');
  });

  it('strips <style> tags (CSS-based exfiltration / overlay vectors)', () => {
    const out = sanitizeHtml('<style>body{display:none}</style><p>safe</p>');
    expect(out.toLowerCase()).not.toContain('<style');
    expect(out).toContain('<p>safe</p>');
  });
});
