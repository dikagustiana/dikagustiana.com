// "On this page" for an FSLI line item, built from the headings of the
// essay the page renders as its body.
//
// The ids are not minted here. extractHeadings is the essay page's own ToC
// reader: it numbers `section-N-<slug of the text>` over the same heading set
// ArticleBody numbers the rendered ids over (tests/unit/tocHeadingIds), so an
// entry always names a heading that is on the page. The position prefix keeps
// two headings with the same words apart, and the id stays the same for as
// long as the essay does. A second slugifier here would drift from the body.

import { extractHeadings } from '@/components/editorial/ArticleToc';
import { contentToHtml } from '@/lib/tiptap/serialize';

export interface FsliTocEntry {
  id: string;
  title: string;
  /** The h3s under this h2, in document order. */
  children: { id: string; title: string }[];
}

/**
 * One entry per h2, its h3s nested under it. An h3 that comes before any h2
 * stands on its own. `contents` is one string per essay rendered on the page,
 * in page order, TipTap JSON or legacy HTML (the two forms ArticleBody reads).
 *
 * ArticleBody restarts its counter for every essay it renders, so two essays
 * on one page can produce the same id; the first keeps it and the repeat is
 * left out rather than listed twice under one anchor.
 */
export function buildFsliToc(contents: ReadonlyArray<string | null | undefined>): FsliTocEntry[] {
  const toc: FsliTocEntry[] = [];
  const seen = new Set<string>();

  for (const content of contents) {
    // Per essay: an h3 never nests under the previous essay's last h2.
    let parent: FsliTocEntry | null = null;
    for (const heading of extractHeadings(contentToHtml(content))) {
      if (seen.has(heading.id)) continue;
      seen.add(heading.id);
      const title = heading.text.trim();
      if (heading.level === 'h3' && parent) {
        parent.children.push({ id: heading.id, title });
        continue;
      }
      const entry: FsliTocEntry = { id: heading.id, title, children: [] };
      toc.push(entry);
      if (heading.level === 'h2') parent = entry;
    }
  }

  return toc;
}

/** Every id the table lists, in page order: the scroll-spy's watch list. */
export function fsliTocIds(toc: readonly FsliTocEntry[]): string[] {
  return toc.flatMap((entry) => [entry.id, ...entry.children.map((child) => child.id)]);
}
