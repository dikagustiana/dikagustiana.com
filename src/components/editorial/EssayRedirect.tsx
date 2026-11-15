import { Navigate, useLocation } from 'react-router-dom';
import { languageQuery } from '@/lib/essayLanguage';

/**
 * An essay page's redirect to its canonical address that keeps `?lang=id`
 * (docs/prd/essay-language). Without it, /essays/<slug>?lang=id — the link the
 * writer's "View it live" opens, and any shared link to an older address —
 * landed on the English version. Every other parameter is dropped, as the
 * plain <Navigate> these replace always did.
 */
export function EssayRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${languageQuery(search)}`} replace />;
}
