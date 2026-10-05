/**
 * /finance/finance-in-action/:modelSlug in the preview build. A ticker with a
 * model package (a fixture, or a model the owner published) opens the v3.1
 * model page; any other slug falls through to the existing page, which reads
 * finance_models as before. While the published models are being read, a slug
 * that is not a fixture waits rather than falling through too early.
 */
import { useParams } from 'react-router-dom';
import FinanceModelDetail from '@/pages/FinanceModelDetail';
import { COPY } from '@/lib/finance-in-action/copy';
import { usePreviewRegistry } from '@/lib/finance-in-action/usePreviewRegistry';
import { FiaModelPage } from './FiaModelPage';

export default function FiaModelRoute() {
  const { modelSlug } = useParams<{ modelSlug: string }>();
  const { reg, published } = usePreviewRegistry();
  const company = modelSlug ? reg.company(modelSlug) : undefined;
  if (company?.pkg) return <FiaModelPage key={company.ticker} pkg={company.pkg} reg={reg} />;
  if (published === 'loading') {
    return (
      <p role="status" className="container max-w-5xl px-4 py-8 text-sm text-muted-foreground sm:px-8">
        {COPY.publishedLoading}
      </p>
    );
  }
  return <FinanceModelDetail />;
}
