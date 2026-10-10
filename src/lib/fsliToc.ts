// "On this page" for an FSLI line item, built from the headings of the
// essay the page renders as its body, and the ids those headings carry.
//
// The ids follow PRD R1.2 of the October 2026 site sweep: the slug of the
// heading's own words, with an index only when the page already has that
// slug. The essay page numbers its ids by position instead
// (`section-N-<slug>`, ArticleBody and extractHeadings), so there a heading
// added near the top moves every anchor below it; here a heading keeps its
// anchor for as long as its words stay the same. The slugs are minted once
// for the whole page, so two essays on one page cannot hand out the same id.
// ArticleBody takes them through its headingIds prop and renders exactly
// these, so every entry names a heading that is on the page.

import { contentToHtml } from '@/lib/tiptap/serialize';

export interface FsliTocEntry {
  id: string;
  title: string;
  /** The h3s under this h2, in document order. */
  children: { id: string; title: string }[];
}

export interface FsliToc {
  /** One entry per h2, its h3s nested under it. */
  entries: FsliTocEntry[];
  /**
   * Per essay, in page order: the id of each of its h1–h6 headings, in
   * document order — ArticleBody's headingIds. The table lists only the
   * h2/h3s, but the body gives every heading an anchor.
   */
  headingIds: string[][];
}

// Ids the page holds before any heading: index.html's root and PageLayout's
// skip-link target. A heading reading "Main content" must not take either.
const PAGE_IDS = ['root', 'main-content'];

/** The same character rule as the body's positional ids, without the position. */
function slugOf(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return slug || 'section';
}

/**
 * Every h1–h6 of one essay, in document order. Walked over the HTML form,
 * as extractHeadings walks it for the essay page: tests/unit/fsliToc pins
 * that this is the set ArticleBody counts, for both stored forms.
 */
function headingsOf(content: string | null | undefined): { level: number; text: string }[] {
  const html = contentToHtml(content);
  if (!html) return [];
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'), (el) => ({
      level: Number(el.tagName.charAt(1)),
      text: el.textContent ?? '',
    }));
  } catch {
    // No ids handed out: the body keeps its positional ids and the table is
    // empty, so nothing listed can point at a heading that is not there.
    return [];
  }
}

/**
 * `contents` is one string per essay rendered on the page, in page order,
 * TipTap JSON or legacy HTML (the two forms ArticleBody reads). An h3 that
 * comes before any h2 of its essay stands on its own.
 */
export function buildFsliToc(contents: ReadonlyArray<string | null | undefined>): FsliToc {
  const entries: FsliTocEntry[] = [];
  const headingIds: string[][] = [];
  const used = new Set(PAGE_IDS);

  for (const content of contents) {
    const ids: string[] = [];
    // Per essay: an h3 never nests under the previous essay's last h2.
    let parent: FsliTocEntry | null = null;
    for (const heading of headingsOf(content)) {
      const base = slugOf(heading.text);
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      ids.push(id);

      if (heading.level !== 2 && heading.level !== 3) continue;
      const title = heading.text.trim();
      if (heading.level === 3 && parent) {
        parent.children.push({ id, title });
        continue;
      }
      const entry: FsliTocEntry = { id, title, children: [] };
      entries.push(entry);
      if (heading.level === 2) parent = entry;
    }
    headingIds.push(ids);
  }

  return { entries, headingIds };
}

/** Every id the table lists, in page order: the scroll-spy's watch list. */
export function fsliTocIds(toc: readonly FsliTocEntry[]): string[] {
  return toc.flatMap((entry) => [entry.id, ...entry.children.map((child) => child.id)]);
}
