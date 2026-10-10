/**
 * FsliCoveredBy — the one sentence a line item without an essay of its own
 * shows when another line item's essay covers it ("Covered in <essay
 * title>"), linking to that line item's page. Owner decision D2(a), October
 * 2026 site sweep; the pointer is fsli_pages.covered_by_slug.
 *
 * The title is the covering page's essay's, the one its body opens with,
 * falling back to the covering page's own title while it has none. Nothing
 * renders until the essay read has settled, so the link never flips from one
 * title to the other in front of the reader.
 */

import { Link } from 'react-router-dom';
import { useEssaysByFsliSlug } from '@/hooks/queries/useEssays';
import { useFsliPage } from '@/hooks/queries/useFsliPages';

export function FsliCoveredBy({ slug }: { slug: string }) {
  const { data: essays, isLoading: essaysLoading } = useEssaysByFsliSlug(slug);
  const { data: page } = useFsliPage(slug);

  if (essaysLoading) return null;
  const title = essays?.[0]?.title ?? page?.title;
  if (!title) return null;

  return (
    <p className="text-muted-foreground" data-fsli-covered-by={slug}>
      Covered in{' '}
      <Link
        to={`/accounting/fsli/${slug}`}
        className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
      >
        {title}
      </Link>
    </p>
  );
}
