/**
 * TipTap JSON ↔ HTML serialization.
 *
 * Canonical format: TipTap JSON (stored in the `content` column).
 * HTML is derived output used only for rendering.
 *
 * This module also provides backward-compatible detection of legacy HTML
 * content so existing essays are rendered correctly.
 */

import type { JSONContent } from '@tiptap/core';
import type { FigureBlockData } from '@/components/editorial/FigureBlock';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/** Returns true when the stored string is legacy HTML (not TipTap JSON). */
export function isLegacyHtmlContent(content: string | null | undefined): boolean {
  if (!content || !content.trim()) return false;
  const trimmed = content.trim();
  // TipTap JSON always starts with '{'
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === 'doc') return false; // It's TipTap JSON
    } catch {
      // Not valid JSON — treat as HTML
    }
  }
  return true;
}

/** Parse stored content string into a TipTap JSON document (or null if legacy / empty). */
export function parseTiptapJson(content: string | null | undefined): JSONContent | null {
  if (!content || !content.trim()) return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.type === 'doc') return parsed as JSONContent;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// JSON → HTML rendering
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarks(text: string, marks?: Array<{ type: string; attrs?: Record<string, unknown> }>): string {
  if (!marks || marks.length === 0) return text;
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href ?? ''));
        const target = mark.attrs?.target ? ` target="${escapeHtml(String(mark.attrs.target))}"` : '';
        const rel = mark.attrs?.target ? ' rel="noopener noreferrer"' : '';
        result = `<a href="${href}"${target}${rel}>${result}</a>`;
        break;
      }
    }
  }
  return result;
}

function renderNode(node: JSONContent): string {
  if (!node) return '';

  switch (node.type) {
    case 'doc':
      return renderChildren(node.content);

    case 'paragraph':
      return `<p>${renderChildren(node.content)}</p>`;

    case 'heading': {
      const level = node.attrs?.level ?? 2;
      return `<h${level}>${renderChildren(node.content)}</h${level}>`;
    }

    case 'bulletList':
      return `<ul>${renderChildren(node.content)}</ul>`;

    case 'orderedList':
      return `<ol>${renderChildren(node.content)}</ol>`;

    case 'listItem':
      return `<li>${renderChildren(node.content)}</li>`;

    case 'blockquote':
      return `<blockquote>${renderChildren(node.content)}</blockquote>`;

    case 'codeBlock':
      return `<pre><code>${renderChildren(node.content)}</code></pre>`;

    case 'horizontalRule':
      return '<hr>';

    case 'hardBreak':
      return '<br>';

    case 'figure':
      return renderFigureHtml(node.attrs as unknown as FigureBlockData);

    case 'text': {
      const escaped = escapeHtml(node.text ?? '');
      return renderMarks(
        escaped,
        node.marks as Array<{ type: string; attrs?: Record<string, unknown> }>,
      );
    }

    default:
      // Unknown node type — render children if present
      return renderChildren(node.content);
  }
}

function renderChildren(content?: JSONContent[]): string {
  if (!content) return '';
  return content.map(renderNode).join('');
}

function renderFigureHtml(attrs: FigureBlockData): string {
  if (!attrs) return '';

  const jsonData = JSON.stringify(attrs).replace(/"/g, '&quot;');
  const isWide = attrs.widthMode === 'wide';
  const wideClass = isWide ? ' figure-block--wide' : '';

  const imgAttrs = [
    `src="${escapeHtml(attrs.src)}"`,
    `alt="${escapeHtml(attrs.altText || '')}"`,
    attrs.naturalWidth ? `width="${attrs.naturalWidth}"` : '',
    attrs.naturalHeight ? `height="${attrs.naturalHeight}"` : '',
    'loading="lazy"',
    'class="w-full h-auto"',
  ]
    .filter(Boolean)
    .join(' ');

  let captionHtml = '';
  if (attrs.caption || attrs.sourceName) {
    const parts: string[] = [];
    if (attrs.caption) parts.push(escapeHtml(attrs.caption));
    if (attrs.sourceName) {
      const sourceText = attrs.sourceUrl
        ? `<a href="${escapeHtml(attrs.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(attrs.sourceName)}</a>`
        : escapeHtml(attrs.sourceName);
      parts.push(`<em>${sourceText}</em>`);
    }
    captionHtml = `<figcaption>${parts.join(' — ')}</figcaption>`;
  }

  return `<figure data-type="figure-block" data-figure="${jsonData}" class="figure-block${wideClass}"><img ${imgAttrs}>${captionHtml}</figure>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Convert a TipTap JSON document to HTML. */
export function tiptapJsonToHtml(doc: JSONContent): string {
  if (!doc || !doc.content) return '';
  return renderChildren(doc.content);
}

/**
 * Universal content-to-HTML converter.
 * Handles both TipTap JSON (canonical) and legacy HTML content.
 */
export function contentToHtml(content: string | null | undefined): string {
  if (!content || !content.trim()) return '';

  const json = parseTiptapJson(content);
  if (json) return tiptapJsonToHtml(json);

  // Legacy HTML — pass through
  return content;
}

// ---------------------------------------------------------------------------
// JSON → Markdown (plain-text rendering for AI review, exports, etc.)
// ---------------------------------------------------------------------------

function markdownMarks(text: string, marks?: Array<{ type: string; attrs?: Record<string, unknown> }>): string {
  if (!marks || marks.length === 0) return text;
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `**${result}**`;
        break;
      case 'italic':
        result = `*${result}*`;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'link': {
        const href = String(mark.attrs?.href ?? '');
        result = href ? `[${result}](${href})` : result;
        break;
      }
    }
  }
  return result;
}

function inlineMarkdown(content?: JSONContent[]): string {
  if (!content) return '';
  return content
    .map(node => {
      if (node.type === 'text') {
        return markdownMarks(
          node.text ?? '',
          node.marks as Array<{ type: string; attrs?: Record<string, unknown> }>,
        );
      }
      if (node.type === 'hardBreak') return '\n';
      return inlineMarkdown(node.content);
    })
    .join('');
}

function blockMarkdown(node: JSONContent): string {
  switch (node.type) {
    case 'paragraph':
      return inlineMarkdown(node.content);
    case 'heading': {
      const level = Number(node.attrs?.level ?? 2);
      return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${inlineMarkdown(node.content)}`;
    }
    case 'bulletList':
      return (node.content ?? [])
        .map(item => `- ${inlineMarkdownFromListItem(item)}`)
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => `${index + 1}. ${inlineMarkdownFromListItem(item)}`)
        .join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map(child => `> ${blockMarkdown(child)}`)
        .join('\n');
    case 'codeBlock':
      return `\`\`\`\n${inlineMarkdown(node.content)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'figure': {
      const attrs = node.attrs as unknown as FigureBlockData | undefined;
      if (!attrs?.src) return '';
      const caption = attrs.caption || attrs.altText || 'figure';
      return `![${caption}](${attrs.src})`;
    }
    default:
      return (node.content ?? []).map(blockMarkdown).filter(Boolean).join('\n\n');
  }
}

function inlineMarkdownFromListItem(item: JSONContent): string {
  return (item.content ?? []).map(blockMarkdown).filter(Boolean).join(' ');
}

/**
 * Convert a TipTap JSON document to Markdown-flavoured plain text.
 * Used to hand drafts to the Writing Council (and other text-only consumers).
 */
export function tiptapJsonToMarkdown(doc: JSONContent | null | undefined): string {
  if (!doc || !doc.content) return '';
  return doc.content.map(blockMarkdown).filter(Boolean).join('\n\n').trim();
}

// ---------------------------------------------------------------------------
// Figure extraction from TipTap JSON
// ---------------------------------------------------------------------------

/** Extract all FigureBlockData from a TipTap JSON document (no regex). */
export function extractFiguresFromJson(doc: JSONContent | null | undefined): FigureBlockData[] {
  if (!doc || !doc.content) return [];
  const figures: FigureBlockData[] = [];
  collectFigures(doc, figures);
  return figures;
}

function collectFigures(node: JSONContent, out: FigureBlockData[]): void {
  if (node.type === 'figure' && node.attrs) {
    const attrs = node.attrs as unknown as FigureBlockData;
    if (attrs.src) out.push(attrs);
  }
  if (node.content) {
    for (const child of node.content) {
      collectFigures(child, out);
    }
  }
}
