import { useParams } from 'react-router-dom';
import { TranslationEditor } from '@/components/translation/TranslationEditor';
import NotFound from './NotFound';

/**
 * /admin/writer/:section/:slug/id — an essay's Indonesian version
 * (docs/prd/essay-language/04-PENULIS.md). Beside /brief in the URL space,
 * and like it a separate surface that never mounts the English long body.
 */
export default function TranslationEditorPage() {
  const { slug } = useParams<{ section: string; slug: string }>();
  if (!slug) return <NotFound />;
  return <TranslationEditor essaySlug={slug} />;
}
