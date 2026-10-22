/**
 * Hands the homepage chain map Finance in Action's counts per stage, from the
 * live registry (chain view §3.7). Loaded by ChainPlate only when the build
 * sets VITE_FIA_LIVE; it imports no fixture. Renders nothing.
 */
import { useEffect, useMemo } from 'react';
import { useLiveRegistry } from '@/lib/finance-in-action/useLiveRegistry';
import { stageDoors } from '@/lib/finance-in-action/stageDoors';
import type { StageModelsMap } from '@/components/industry-chain/chainModelsContext';

export default function LiveStageModelsFeed({ onModels }: { onModels: (m: StageModelsMap) => void }) {
  const { reg } = useLiveRegistry();
  const doors = useMemo(() => stageDoors(reg), [reg]);
  useEffect(() => onModels(doors), [doors, onModels]);
  return null;
}
