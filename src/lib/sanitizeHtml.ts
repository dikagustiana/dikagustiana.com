/**
 * Centralized HTML sanitizer for any path that uses dangerouslySetInnerHTML
 * with database-stored content. Even though only admins can author content,
 * we sanitize defensively to mitigate XSS in case an admin account is
 * compromised or legacy HTML contains hostile markup.
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
];

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });
}
