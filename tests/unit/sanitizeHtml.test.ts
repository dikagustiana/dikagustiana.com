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

  // ── The Substack-toolbar additions (fourth place of the content contract).
  //    Math markup note: KaTeX's OUTPUT never passes through this sanitizer —
  //    the stored HTML carries only data-latex, and KaTeX renders client-side
  //    after sanitization. What must survive here is the carrier. ──

  it('keeps the math carriers (data-latex on inline and block math)', () => {
    const html =
      '<div data-type="block-math" data-latex="\\frac{a}{b} &amp; &quot;q&quot;"></div>' +
      '<p><span data-type="inline-math" data-latex="\\beta &gt; 1"></span></p>';
    const out = sanitizeHtml(html);
    expect(out).toContain('data-type="block-math"');
    expect(out).toContain('data-type="inline-math"');
    expect(out).toContain('data-latex');
  });

  it('keeps footnote markers and their note text', () => {
    const out = sanitizeHtml('<p>Claim.<sup data-type="footnote" data-footnote="BIS, &quot;Q1&quot;"></sup></p>');
    expect(out).toContain('data-type="footnote"');
    expect(out).toContain('data-footnote');
  });

  it('keeps the pull-quote variant and the callout container', () => {
    const out = sanitizeHtml(
      '<blockquote data-variant="pull"><p>Pulled.</p></blockquote><div data-type="callout"><p>Aside.</p></div>'
    );
    expect(out).toContain('data-variant="pull"');
    expect(out).toContain('data-type="callout"');
  });

  it('keeps exactly the three whitelisted style properties', () => {
    const out = sanitizeHtml(
      '<p style="text-align: center">c</p>' +
      '<span style="color: #980000">r</span>' +
      '<span style="background-color: rgb(255, 255, 0)">y</span>'
    );
    expect(out).toContain('text-align: center');
    expect(out).toContain('color: #980000');
    expect(out).toContain('background-color: rgb(255, 255, 0)');
  });

  it('strips every non-whitelisted style declaration, keeping whitelisted ones beside them', () => {
    const out = sanitizeHtml(
      '<span style="color: #ff0000; position: fixed; inset: 0; z-index: 9999; background-image: url(https://evil.test/x)">x</span>'
    );
    expect(out).toContain('color: #ff0000');
    expect(out).not.toContain('position');
    expect(out).not.toContain('z-index');
    expect(out).not.toContain('background-image');
    expect(out).not.toContain('evil.test');
  });

  it('rejects style values outside the safe pattern (expression / url / var)', () => {
    const out = sanitizeHtml('<span style="color: expression(alert(1)); background-color: url(x)">x</span>');
    expect(out).not.toContain('expression');
    expect(out).not.toContain('url(');
    expect(out).not.toContain('style=');
  });
});
