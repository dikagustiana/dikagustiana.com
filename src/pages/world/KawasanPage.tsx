/**
 * /finance/kawasan and /finance/kawasan/:ticker (PRD §7.7, §9.4): the world
 * on its own page, and a company's board that reopens after a refresh. The
 * route owns which board is open; the frame asks it to change.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import WorldFrame from '@/components/world/WorldFrame';
import { WORLD_PATH, boardPath } from '@/lib/world/constants';

export default function KawasanPage() {
  const { ticker } = useParams<{ ticker?: string }>();
  const navigate = useNavigate();
  return (
    <PageLayout variant="tool" title="Kawasan Industri" breadcrumbs={[{ label: 'Finance', path: '/finance' }, { label: 'Kawasan Industri', path: WORLD_PATH }]}>
      <SEO title="Kawasan Industri: the industry chain as a living world" description="Every IDX sub-industry has a building; every published model has a plot. The chain map, as a place." />
      <div className="container py-8">
        <WorldFrame variant="full" heading="h1" boardTicker={ticker ?? null} onBoard={(t) => navigate(t ? boardPath(t) : WORLD_PATH)} />
      </div>
    </PageLayout>
  );
}
