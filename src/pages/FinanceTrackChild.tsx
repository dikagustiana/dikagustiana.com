/**
 * FinanceTrackChild — resolves /finance/:track/:slug.
 *
 * The canonical essay URL is three segments (/finance/:track/:essaySlug) and
 * the module browsing page is ALSO three segments (/finance/:track/:moduleSlug)
 * — React Router cannot rank two identical dynamic patterns, so one route owns
 * the position and decides at runtime: if :slug names a module, render the
 * module page; otherwise it is an essay slug.
 *
 * Module slugs (t4-m07) and essay slugs (driver-tree-construction) live in
 * different namespaces in practice, but the decision is by lookup, not by
 * pattern — a pattern would silently break the day a module gets a wordy slug.
 */

import { useParams, Navigate } from 'react-router-dom';
import { useFinanceModuleBySlug } from '@/hooks/queries/useFinance';
import { LoadingState } from '@/components/states';
import FinanceModulePage from './FinanceModulePage';
import FinanceEssayPage from './FinanceEssayPage';

export default function FinanceTrackChild() {
  const { track, slug } = useParams<{ track: string; slug: string }>();
  const { data: module, isLoading } = useFinanceModuleBySlug(slug || '');

  if (isLoading) {
    return (
      <div className="container py-16">
        <LoadingState />
      </div>
    );
  }

  if (module) {
    // A module reached under the wrong track heals to its real address,
    // matching the essay pages' redirect-not-404 behaviour.
    if (module.track_slug && module.track_slug !== track) {
      return <Navigate to={`/finance/${module.track_slug}/${module.slug}`} replace />;
    }
    return <FinanceModulePage />;
  }

  return <FinanceEssayPage />;
}
