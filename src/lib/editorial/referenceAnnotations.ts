/**
 * Reference annotations (docs/prd/2026-10-fia-fixes item 10). The Finance
 * essays' reference lists carry the builder's working notes: `VERIFIED: every
 * quotation was checked against the PDF on disk.`, `UNAVAILABLE: the file on
 * disk is damaged.`, `MISNUMBERED, since …`. An admin sees them; a reader sees
 * the references without them. Nothing stored changes: this is how a list
 * renders, not what it holds.
 *
 * - A sentence that carries one of the four markers is dropped, as is a
 *   parenthesis that carries one. A reference left with nothing is dropped.
 * - A reference marked UNAVAILABLE that the body does not cite (`[n]`, or a
 *   link to `#ref-n`) is dropped from the reader's list.
 *
 * The PRD's pattern, /\b(VERIFIED|UNVERIFIED|UNAVAILABLE|MISNUMBERED)\b:?\s[^.]*\.(\s|$)/,
 * misses a marker followed by a comma ("MISNUMBERED, since …") and leaves the
 * "NOT" of "NOT VERIFIED" behind, so whole sentences are matched instead.
 * The callers decide who is a reader; the Finance essay page applies it to
 * non-admins.
 */

const MARKER = /\b(VERIFIED|UNVERIFIED|UNAVAILABLE|MISNUMBERED)\b/;
const PARENTHESIS = /\s*\([^()]*\b(?:VERIFIED|UNVERIFIED|UNAVAILABLE|MISNUMBERED)\b[^()]*\)/g;
/** A sentence ends at a full stop followed by space and a capital, a quote or a bracket, or at the end. */
const BOUNDARY = /(?<=\.)\s+(?=[A-Z"“(‘“])/;

/** A plain-text label without its annotations; empty when it was nothing else. */
export function stripAnnotations(label: string): string {
  const withoutParens = label.replace(PARENTHESIS, '');
  return withoutParens
    .split(BOUNDARY)
    .filter((s) => !MARKER.test(s))
    .join(' ')
    .trim();
}

export const isUnavailable = (label: string): boolean => /\bUNAVAILABLE\b/.test(label);

/** The reference numbers a body cites: `[3]`, `[2, 4]`, or a link to `#ref-3`. */
export function citedIndexes(bodyText: string): Set<number> {
  const out = new Set<number>();
  for (const m of bodyText.matchAll(/\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g)) for (const n of m[1].split(/\s*[,–-]\s*/)) out.add(Number(n));
  for (const m of bodyText.matchAll(/#(?:ref|reference|cite)-(\d+)/g)) out.add(Number(m[1]));
  return out;
}

/** The plain-string or {label, url} references a reader sees: annotations stripped, uncited UNAVAILABLE ones and empty ones dropped. */
export function publicReferences<T extends string | { label: string; url?: string }>(refs: T[], cited: Set<number>): T[] {
  const out: T[] = [];
  refs.forEach((ref, i) => {
    const label = typeof ref === 'string' ? ref : ref.label;
    if (isUnavailable(label) && !cited.has(i + 1)) return;
    const stripped = stripAnnotations(label);
    if (!stripped) return;
    out.push((typeof ref === 'string' ? stripped : { ...(ref as { label: string; url?: string }), label: stripped }) as T);
  });
  return out;
}

const HEADING = /^H[1-6]$/;

/** Drops the annotated sentences inside one list item, keeping its inline markup (<em>, <a>) where the sentence stays. */
function stripItem(li: Element): void {
  const doc = li.ownerDocument;
  // The item's inline content: its paragraph, or the item itself.
  const host = li.querySelector(':scope > p') ?? li;
  for (const t of Array.from(host.childNodes)) if (t.nodeType === t.TEXT_NODE) t.textContent = (t.textContent ?? '').replace(PARENTHESIS, '');
  // Cut the text nodes at sentence boundaries, then group the nodes into sentences.
  const sentences: Node[][] = [[]];
  for (const node of Array.from(host.childNodes)) {
    if (node.nodeType !== node.TEXT_NODE) {
      sentences[sentences.length - 1].push(node);
      continue;
    }
    const parts = (node.textContent ?? '').split(BOUNDARY);
    parts.forEach((part, i) => {
      if (i > 0) sentences.push([]);
      if (part) sentences[sentences.length - 1].push(doc.createTextNode(part));
    });
  }
  const kept = sentences.filter((s) => s.length && !MARKER.test(s.map((n) => n.textContent ?? '').join('')));
  while (host.firstChild) host.removeChild(host.firstChild);
  kept.forEach((s, i) => {
    if (i > 0) host.appendChild(doc.createTextNode(' '));
    for (const n of s) host.appendChild(n);
  });
  if (host.lastChild?.nodeType === host.TEXT_NODE) host.lastChild.textContent = (host.lastChild.textContent ?? '').replace(/\s+$/, '');
}

/**
 * An HTML body as a reader sees it: in the list that follows a "References"
 * heading, every item stripped of its annotations, an item marked UNAVAILABLE
 * that the rest of the body does not cite dropped, and an item left empty
 * dropped. A body that is not HTML, or has no such list, comes back as it was.
 */
export function publicReferencesHtml(html: string): string {
  if (!html || !html.trimStart().startsWith('<') || !MARKER.test(html) || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const lists: Element[] = [];
  for (const h of Array.from(doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6'))) {
    if (!/^\s*references\s*$/i.test(h.textContent ?? '')) continue;
    let next = h.nextElementSibling;
    while (next && !HEADING.test(next.tagName)) {
      if (next.tagName === 'OL' || next.tagName === 'UL') lists.push(next);
      next = next.nextElementSibling;
    }
  }
  if (!lists.length) return html;
  // What the body cites, the reference lists themselves left out.
  const bodyOnly = doc.body.cloneNode(true) as HTMLElement;
  for (const h of Array.from(bodyOnly.querySelectorAll('h1, h2, h3, h4, h5, h6'))) {
    if (!/^\s*references\s*$/i.test(h.textContent ?? '')) continue;
    let next = h.nextElementSibling;
    while (next && !HEADING.test(next.tagName)) {
      const drop = next;
      next = next.nextElementSibling;
      drop.remove();
    }
  }
  const cited = citedIndexes(`${bodyOnly.textContent ?? ''} ${bodyOnly.innerHTML}`);
  for (const list of lists) {
    Array.from(list.children).forEach((li, i) => {
      const text = li.textContent ?? '';
      if (isUnavailable(text) && !cited.has(i + 1)) {
        li.remove();
        return;
      }
      stripItem(li);
      if (!(li.textContent ?? '').trim()) li.remove();
    });
  }
  return doc.body.innerHTML;
}
