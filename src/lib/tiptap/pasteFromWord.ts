/**
 * Paste normalisation for Microsoft Word.
 *
 * The owner writes in Word and pastes in. Word puts a document on the
 * clipboard that is mostly not content: `<o:p>` Office namespace tags, VML
 * blocks, `<style>` sheets full of `mso-*` rules, `class="MsoNormal"` on every
 * paragraph, and inline `style` on every span. ProseMirror parses what it
 * recognises and discards the rest silently — the same class of loss as the
 * dropped pasted images.
 *
 * What this preserves, in order of how much it matters:
 *   - paragraph and heading structure, with Word's heading levels mapped into
 *     the two the schema allows;
 *   - bold, italic, underline, strikethrough, superscript/subscript, links;
 *   - lists — including Word's fake lists, which are ordinary paragraphs with
 *     a literal bullet character and an `mso-list` style;
 *   - tables.
 *
 * What it deliberately drops: colour, font family, font size, margins,
 * highlighting, and Word's empty spacer paragraphs. House typography is the
 * point of the writing surface; pasted Word styling would undo it.
 */

/** Word's clipboard HTML is identifiable before we spend any work on it. */
export function isWordHtml(html: string): boolean {
  return (
    /class=["']?Mso/i.test(html) ||
    /<o:p\b/i.test(html) ||
    /urn:schemas-microsoft-com/i.test(html) ||
    /mso-(list|pagination|style|bidi|fareast|ansi)/i.test(html) ||
    /<!--\s*\[if\s+(?:gte\s+)?mso/i.test(html)
  );
}

/** Word heading class/tag → the levels this schema allows (h2, h3). */
function mappedHeadingLevel(el: Element): 2 | 3 | null {
  const tag = el.tagName.toLowerCase();
  const fromTag = /^h([1-6])$/.exec(tag)?.[1];
  // `data-w-heading` is stamped from `class`/`style` before those are stripped.
  const stamped = el.getAttribute('data-w-heading');
  const level = Number(fromTag ?? stamped ?? NaN);
  if (!Number.isFinite(level)) return null;

  // The body allows h2 and h3 only. Word's H1 is the document title, which in
  // this product is a database field rather than a body block — so H1 becomes
  // the top body level (h2) and everything deeper collapses to h3 rather than
  // being dropped. Verified against the real import: 10 H1→h2, 3 H2→h3.
  return level <= 1 ? 2 : level === 2 ? 2 : 3;
}

const BULLET_PREFIX = /^\s*(?:[•·▪◦o§*\-–—]|[a-zA-Z0-9]{1,3}[.)])\s+/;

function isOrderedMarker(text: string): boolean {
  return /^\s*(?:\d+|[ivxlcdm]+|[a-z])[.)]\s+/i.test(text);
}

/**
 * Word writes list items as paragraphs carrying `mso-list` in `style` and
 * `MsoListParagraph…` in `class`, with the bullet or number as literal text.
 *
 * Both of those attributes are stripped later as presentational noise, so the
 * intent has to be recorded first. It was not, once: attribute stripping ran
 * before list detection, every test of `style`/`class` came back empty, and a
 * pasted Word list arrived as flat paragraphs each beginning with a stray "·".
 */
function stampWordIntent(body: HTMLElement): void {
  body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div').forEach(el => {
    const style = el.getAttribute('style') || '';
    const cls = el.getAttribute('class') || '';
    const text = el.textContent || '';

    // `MsoListParagraph` alone also marks plain indented paragraphs, so it
    // only counts as a list when Word left a marker in the text too.
    const isList =
      /mso-list\s*:/i.test(style) ||
      (/MsoListParagraph/i.test(cls) && BULLET_PREFIX.test(text));
    if (isList) {
      el.setAttribute('data-w-list', isOrderedMarker(text) ? 'ordered' : 'bullet');
    }

    const level = /mso-outline-level\s*:\s*(\d)/i.exec(style)?.[1]
      ?? /mso(?:heading|title)?(\d)/i.exec(cls.replace(/\s+/g, ''))?.[1];
    if (level) el.setAttribute('data-w-heading', level);
  });
}

/**
 * Normalise Word clipboard HTML into markup the schema understands.
 * Returns the transformed HTML; callers pass non-Word HTML through untouched.
 */
export function normalizeWordHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  if (!body) return html;

  // 1. Remove everything that is markup about markup, not content.
  body.querySelectorAll('style, meta, link, xml, script, o\\:p, v\\:shapetype, v\\:shape')
    .forEach(el => el.remove());
  // Conditional comments (`<!--[if gte mso 9]>…`) survive DOMParser as comment
  // nodes; walk and drop them so their contents cannot leak in as text.
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.forEach(c => c.remove());

  // 1b. Record what `class` and `style` mean BEFORE step 2 throws them away.
  stampWordIntent(body);

  // 2. Strip presentational attributes everywhere. `style` carries Word's
  //    inline formatting; `class` carries Mso*; `lang`/`dir` are noise.
  body.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('lang');
    el.removeAttribute('dir');
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.removeAttribute('align');
    el.removeAttribute('valign');
    el.removeAttribute('border');
    el.removeAttribute('cellpadding');
    el.removeAttribute('cellspacing');
    const cls = el.getAttribute('class');
    if (cls && /Mso|Xl|^m_/i.test(cls)) el.removeAttribute('class');
    for (const attr of Array.from(el.attributes)) {
      if (/^(?:v|o|w|x|st\d):/i.test(attr.name) || attr.name.startsWith('mso')) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // 3. Word wraps runs in <span> and <font>; unwrap them, keeping their text.
  //    Semantic marks (b/i/u/s/sup/sub/a) are untouched.
  body.querySelectorAll('span, font').forEach(el => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  // 3b. Word wraps the whole document in `<div class=WordSection1>`. Unwrap it
  //     — and any other bare div — so the blocks are children of <body>. Step 5
  //     walks `body.children`, and with the wrapper in place that list is one
  //     element long and every list paragraph is invisible to it.
  for (let guard = 0; guard < 10; guard++) {
    const divs = body.querySelectorAll('div');
    if (divs.length === 0) break;
    divs.forEach(el => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
  }

  // 4. Headings: rewrite to the allowed levels before anything else reads them.
  body.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach(el => {
    const level = mappedHeadingLevel(el);
    if (!level) return;
    // A <p> only becomes a heading when Word explicitly said so.
    if (el.tagName.toLowerCase() === 'p' && !el.hasAttribute('data-w-heading')) return;
    const h = doc.createElement(`h${level}`);
    h.innerHTML = el.innerHTML;
    el.replaceWith(h);
  });

  // 5. Word's fake lists → real <ul>/<ol>. Consecutive marked paragraphs are
  //    gathered into one list; the bullet glyph itself is removed.
  const blocks = Array.from(body.children);
  let run: Element[] = [];
  const flushRun = () => {
    if (run.length === 0) return;
    const ordered = run[0].getAttribute('data-w-list') === 'ordered';
    const list = doc.createElement(ordered ? 'ol' : 'ul');
    run.forEach(p => {
      const li = doc.createElement('li');
      li.innerHTML = p.innerHTML;
      // Drop the literal marker Word left in the text.
      if (li.firstChild?.nodeType === Node.TEXT_NODE) {
        li.firstChild.textContent = (li.firstChild.textContent || '').replace(BULLET_PREFIX, '');
      }
      list.appendChild(li);
    });
    run[0].replaceWith(list);
    run.slice(1).forEach(p => p.remove());
    run = [];
  };
  for (const el of blocks) {
    // Only paragraphs: a stamped heading is a heading even if Word indented it.
    const kind = el.tagName.toLowerCase() === 'p' ? el.getAttribute('data-w-list') : null;
    if (!kind) {
      flushRun();
      continue;
    }
    // A bulleted list followed immediately by a numbered one is two lists, not
    // one. Without this the run carries on and the second list inherits the
    // first one's type.
    if (run.length > 0 && run[0].getAttribute('data-w-list') !== kind) flushRun();
    run.push(el);
  }
  flushRun();

  // 6. Drop paragraphs Word emits purely for spacing. A paragraph holding only
  //    whitespace or a non-breaking space is not content the author typed.
  body.querySelectorAll('p').forEach(p => {
    if (p.querySelector('img, table, a, br')) return;
    const text = (p.textContent || '').replace(/ /g, ' ').trim();
    if (text === '') p.remove();
  });

  // 7. Word's <b>/<i> map to the schema's marks; keep them but use the
  //    semantic tags ProseMirror's default parsers look for.
  body.querySelectorAll('b').forEach(el => {
    const strong = doc.createElement('strong');
    strong.innerHTML = el.innerHTML;
    el.replaceWith(strong);
  });
  body.querySelectorAll('i').forEach(el => {
    const em = doc.createElement('em');
    em.innerHTML = el.innerHTML;
    el.replaceWith(em);
  });

  // 8. The scaffolding attributes are ours, not content. Remove them so the
  //    pasted HTML is ordinary markup by the time ProseMirror parses it.
  body.querySelectorAll('[data-w-list], [data-w-heading]').forEach(el => {
    el.removeAttribute('data-w-list');
    el.removeAttribute('data-w-heading');
  });

  return body.innerHTML;
}

/**
 * `transformPastedHTML` for the editor. Non-Word HTML is returned untouched —
 * this must never interfere with an ordinary copy between two browser tabs.
 */
export function transformPastedHTML(html: string): string {
  if (!html || !isWordHtml(html)) return html;
  try {
    return normalizeWordHtml(html);
  } catch {
    // A transform that throws must not cost the author their paste.
    return html;
  }
}
