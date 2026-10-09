/**
 * /finance/finance-in-action/:modelSlug with the v3.1 viewer. A ticker with a
 * model package (a fixture in the preview, or a model the owner published)
 * opens the v3.1 model page; any other slug falls through to the existing
 * page, which reads finance_models as before. While the published models are
 * being read, a slug without a package waits rather than falling through too
 * early. The registry hook is a prop for the reason FiaIndex gives: this
 * module imports no data, FiaModelRoute (preview) and FiaLiveModelRoute
 * (production) choose it.
 */
import { useParams } from 'react-router-dom';
import FinanceModelDetail from '@/pages/FinanceModelDetail';
import { COPY } from '@/lib/finance-in-action/copy';
import type { RegistryHook } from '@/lib/finance-in-action/registryState';
import { FiaModelPage } from './FiaModelPage';

export function FiaModelRouter({ useRegistry }: { useRegistry: RegistryHook }) {
  const { modelSlug } = useParams<{ modelSlug: string }>();
  const { reg, published } = useRegistry();
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
