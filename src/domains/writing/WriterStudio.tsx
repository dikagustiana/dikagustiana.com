/**
 * WriterStudio — retired in Section 5.2, now a redirect.
 *
 * This was the second essay-authoring stack ("Stack B"): its own editor
 * (UnifiedEditor), its own upload path, its own save logic. Two authoring
 * surfaces meant two schemas, two sets of understood block types, and no way
 * to know which one an essay had been written in.
 *
 * The one authoring route is `/admin/writer/:section/:slug`. This component
 * keeps the old `/admin/writer/:id` URL working — bookmarks, the browser's
 * history, links in older notes — by resolving the id and forwarding, rather
 * than 404-ing on a URL that used to work.
 *
 * Its upload path lives on as `uploadEssayImage` in src/lib/tiptap/uploadImage.ts.
 * The route itself can be deleted from App.tsx once nothing links here.
 */

import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState } from '@/components/states';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function WriterStudio() {
  const { id } = useParams<{ id: string }>();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setTarget('/admin/writer/finance/list');
      return;
    }

    // `/admin/writer/new` is the dashboard's "New Essay" button. The canonical
    // editor spells a new essay `/admin/writer/:section/new`; every essay in
    // the database is a finance essay, so that is the sensible default.
    if (id === 'new') {
      setTarget('/admin/writer/finance/new');
      return;
    }

    // `/admin/writer/finance` is a section, not an essay id. It previously
    // loaded the studio with a nonsense id; send it to that section's list.
    if (!UUID_RE.test(id)) {
      setTarget(`/admin/writer/${id}/list`);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('essays')
        .select('slug, section')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;
      setTarget(
        data?.slug && data?.section
          ? `/admin/writer/${data.section}/${data.slug}`
          : '/admin/writer/finance/list',
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!target) return <LoadingState />;
  return <Navigate to={target} replace />;
}
