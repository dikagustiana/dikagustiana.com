import { useParams } from 'react-router-dom';
import { BriefEditor } from '@/components/brief/BriefEditor';
import NotFound from './NotFound';

/**
 * /admin/writer/:section/:slug/brief — the Brief companion's own surface.
 *
 * It sits beside the long editor in the URL space because the Brief is a
 * second view of the SAME essay, but it is a different component on purpose:
 * this page never mounts an editable long body (docs/DECISIONS.md,
 * delegated decision 1). The section param is address symmetry with the
 * writer routes; the essay is loaded by its globally unique slug.
 */
export default function BriefEditorPage() {
  const { slug } = useParams<{ section: string; slug: string }>();
  if (!slug) return <NotFound />;
  return <BriefEditor essaySlug={slug} />;
}
