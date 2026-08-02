/**
 * Centralized HTML sanitizer for any path that uses dangerouslySetInnerHTML
 * with database-stored content. Even though only admins can author content,
 * we sanitize defensively to mitigate XSS in case an admin account is
 * compromised or legacy HTML contains hostile markup.
 *
 * The `style` attribute is allowed but NOT trusted: a hook below strips every
 * declaration except the three the editor can produce (`color`,
 * `background-color`, `text-align`) with tightly-patterned values. A blanket
 * style allowance would open CSS-based tricks; a named-property whitelist
 * keeps the attack surface at three enumerable shapes.
 *
 * `iframe` stays forbidden deliberately — widening that is the one change in
 * this project whose mistake is a security issue rather than a broken block.
 */
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'sup', 'sub',
  'a', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'figure', 'figcaption', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'class', 'id', 'data-type', 'data-figure',
  // Table geometry. Without colspan/rowspan a merged cell survives the
  // sanitizer as an ordinary one and the table silently loses its shape.
  'colspan', 'rowspan', 'colwidth', 'data-colwidth',
  // Link-preview card. `data-type` above identifies it; this carries the
  // payload so the block round-trips through HTML back into the editor.
  'data-link-card',
  // Math nodes carry only their LaTeX source; KaTeX renders client-side, so
  // its output markup never passes through this sanitizer at all.
  'data-latex',
  // Footnote marker: the note text. Numbering is positional, never stored.
  'data-footnote',
  // Blockquote display variant ('pull'), and inline colour/highlight/align —
  // see the style hook below.
  'data-variant',
  'style',
];

/**
 * Exactly the style declarations the editor can produce, nothing else.
 * Colour values: hex, rgb()/rgba() with numeric components, or a small set of
 * named colours is deliberately NOT included — the palette emits hex/rgb.
 */
const STYLE_VALUE: Record<string, RegExp> = {
  'color': /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/,
  'background-color': /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/,
  'text-align': /^(left|center|right|justify)$/,
};

function filterStyle(value: string): string {
  const kept: string[] = [];
  for (const declaration of value.split(';')) {
    const idx = declaration.indexOf(':');
    if (idx === -1) continue;
    const property = declaration.slice(0, idx).trim().toLowerCase();
    const propValue = declaration.slice(idx + 1).trim();
    const pattern = STYLE_VALUE[property];
    if (pattern && pattern.test(propValue)) {
      kept.push(`${property}: ${propValue}`);
    }
  }
  return kept.join('; ');
}

let hookInstalled = false;
function ensureStyleHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', node => {
    if (!(node instanceof Element)) return;
    const style = node.getAttribute('style');
    if (style == null) return;
    const filtered = filterStyle(style);
    if (filtered) {
      node.setAttribute('style', filtered);
    } else {
      node.removeAttribute('style');
    }
  });
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  ensureStyleHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });
}
