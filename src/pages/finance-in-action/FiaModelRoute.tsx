/**
 * /finance/finance-in-action/:modelSlug in the preview build. A ticker with a
 * model package opens the v3.1 model page; any other slug falls through to the
 * existing page, which reads finance_models as before.
 */
import { useParams } from 'react-router-dom';
import FinanceModelDetail from '@/pages/FinanceModelDetail';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { FiaModelPage } from './FiaModelPage';

export default function FiaModelRoute() {
  const { modelSlug } = useParams<{ modelSlug: string }>();
  const reg = previewRegistry();
  const company = modelSlug ? reg.company(modelSlug) : undefined;
  if (company?.pkg) return <FiaModelPage key={company.ticker} pkg={company.pkg} reg={reg} />;
  return <FinanceModelDetail />;
}
