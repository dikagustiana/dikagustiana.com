/** The preview model route (__FIA_PREVIEW__): a fixture or a published model opens the v3.1 page. */
import { usePreviewRegistry } from '@/lib/finance-in-action/usePreviewRegistry';
import { FiaModelRouter } from './FiaModelRouter';

export default function FiaModelRoute() {
  return <FiaModelRouter useRegistry={usePreviewRegistry} />;
}
