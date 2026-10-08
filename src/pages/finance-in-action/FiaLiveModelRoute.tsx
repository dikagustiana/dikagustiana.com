/** The production model route (__FIA_LIVE__): only a published model opens the v3.1 page; no fixture is imported. */
import { useLiveRegistry } from '@/lib/finance-in-action/useLiveRegistry';
import { FiaModelRouter } from './FiaModelRouter';

export default function FiaLiveModelRoute() {
  return <FiaModelRouter useRegistry={useLiveRegistry} />;
}
