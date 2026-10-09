/** The preview index (__FIA_PREVIEW__): the SYNTHETIC fixtures beside whatever the owner published. */
import { usePreviewRegistry } from '@/lib/finance-in-action/usePreviewRegistry';
import { FiaIndex } from './FiaIndex';

export default function FiaIndexPage() {
  return <FiaIndex useRegistry={usePreviewRegistry} />;
}
