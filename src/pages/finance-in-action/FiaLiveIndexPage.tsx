/**
 * The production index (__FIA_LIVE__): the owner's published models only,
 * the slate while there are none, and no fixture in this module's imports
 * (PRD "FSRE publish path" §6.3 A).
 */
import { useLiveRegistry } from '@/lib/finance-in-action/useLiveRegistry';
import { FiaIndex } from './FiaIndex';

export default function FiaLiveIndexPage() {
  return <FiaIndex useRegistry={useLiveRegistry} />;
}
