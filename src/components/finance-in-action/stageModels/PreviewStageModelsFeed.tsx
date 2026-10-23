/**
 * Hands the homepage chain map Finance in Action's counts per stage, from the
 * preview registry (chain view §3.7). Loaded by ChainPlate only when the build
 * sets VITE_FIA_PREVIEW, so no fixture reaches a live bundle. Renders nothing.
 */
import { useEffect, useMemo } from 'react';
import { usePreviewRegistry } from '@/lib/finance-in-action/usePreviewRegistry';
import { stageDoors } from '@/lib/finance-in-action/stageDoors';
import type { StageModelsMap } from '@/components/industry-chain/chainModelsContext';

export default function PreviewStageModelsFeed({ onModels }: { onModels: (m: StageModelsMap) => void }) {
  const { reg } = usePreviewRegistry();
  const doors = useMemo(() => stageDoors(reg), [reg]);
  useEffect(() => onModels(doors), [doors, onModels]);
  return null;
}
