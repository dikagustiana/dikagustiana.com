/**
 * The industry chain map.
 *
 * One structure, two measurement systems: the same points that economic
 * variables enter the chain at are the points a set of financial statements
 * measures. The macro lens shows the first reading; the panel it opens carries
 * the second.
 *
 * Self-contained on purpose. It takes no props, owns its own state, reads
 * everything from `src/data/industryChain.ts`, and can be dropped onto another
 * page unchanged.
 */

import { useCallback, useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  BOUNDARY,
  CHAIN_META,
  LAYERS,
  NON_PHYSICAL_FLOWS,
} from '@/data/industryChain';
import { ChainProvider, type ChainInteraction } from './chainContext';
import { highlightSetFor, MACRO_BY_ID, resolvePanel } from './chainModel';
import { ChainControls, ChainLegend, MacroMarkerBar } from './ChainControls';
import { ChainDesktop } from './ChainDesktop';
import { ChainMobile } from './ChainMobile';
import { ChainDetailPanel } from './ChainDetailPanel';
import { LayerBand } from './ChainShapes';
import { BoundaryListEntry, NonPhysicalRow } from './ChainFlows';

export function IndustryChainMap() {
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [macroLens, setMacroLens] = useState(false);
  const [macroId, setMacroId] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);

  const activeMacroId = macroLens ? macroId : null;
  const highlights = useMemo(() => highlightSetFor(activeMacroId), [activeMacroId]);

  const select = useCallback((id: string) => {
    setPinnedId((current) => (current === id ? null : id));
  }, []);

  const preview = useCallback((id: string | null) => setHoveredId(id), []);

  const clear = useCallback(() => {
    setPinnedId(null);
    setHoveredId(null);
  }, []);

  const handleMacroLens = useCallback((next: boolean) => {
    setMacroLens(next);
    if (!next) {
      setMacroId(null);
      setPinnedId((current) => (current && MACRO_BY_ID.has(current) ? null : current));
    }
  }, []);

  const handleMacroSelect = useCallback((id: string) => {
    setMacroId((current) => (current === id ? null : id));
    setPinnedId((current) => (current === id ? null : id));
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') clear();
    },
    [clear],
  );

  const activeId = hoveredId ?? pinnedId;
  const model = activeId ? resolvePanel(activeId) : null;
  const lensLabel = activeMacroId ? MACRO_BY_ID.get(activeMacroId)?.label : undefined;

  const interaction: ChainInteraction = useMemo(
    () => ({
      pinnedId,
      activeId,
      macroId: activeMacroId,
      highlights,
      detail,
      panelId,
      select,
      preview,
    }),
    [pinnedId, activeId, activeMacroId, highlights, detail, panelId, select, preview],
  );

  return (
    <ChainProvider value={interaction}>
      {/* Escape clears the pinned element; the handler is scoped to the map. */}
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        <ChainControls
          macroLensId={`${baseId}-lens`}
          detailId={`${baseId}-detail`}
          macroLens={macroLens}
          detail={detail}
          hasSelection={pinnedId !== null}
          onMacroLensChange={handleMacroLens}
          onDetailChange={setDetail}
          onClear={clear}
        />

        {macroLens && <MacroMarkerBar activeId={macroId} onSelect={handleMacroSelect} />}

        <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
          <div className="hidden lg:block">
            <ChainDesktop />
          </div>
          <div className="lg:hidden">
            <ChainMobile />
          </div>

          {/* E — the two non-physical flows, thinner than anything physical. */}
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {CHAIN_META.sections.nonPhysical}
            </p>
            <div className="space-y-1">
              {NON_PHYSICAL_FLOWS.map((flow) => (
                <NonPhysicalRow
                  key={flow.id}
                  flow={flow}
                  lineStyle={flow.id === 'flow-money' ? 'dotted' : 'dashed'}
                />
              ))}
            </div>
          </div>

          {/* C — the enabling layers, running the length of the chain. */}
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {CHAIN_META.sections.layers}
            </p>
            <div className="space-y-1">
              {LAYERS.map((layer) => (
                <LayerBand key={layer.id} layer={layer} showSubBands={detail} />
              ))}
              <BoundaryListEntry boundary={BOUNDARY} />
            </div>
          </div>
        </div>

        <ChainDetailPanel
          panelId={panelId}
          model={model}
          lensLabel={lensLabel}
          litUnderLens={Boolean(activeId && model?.category !== 'macro' && highlights.has(activeId))}
        />

        <ChainLegend />
      </div>
    </ChainProvider>
  );
}

/**
 * The map as it appears on a page: heading, the thesis in one paragraph, then
 * the map. Kept separate from `IndustryChainMap` so the map itself can move to
 * another page without dragging a heading along with it.
 */
export function IndustryChainSection() {
  return (
    <section className="border-b border-border py-12" aria-labelledby="industry-chain-heading">
      <div className="container max-w-6xl">
        <h2
          id="industry-chain-heading"
          className="text-lg font-display font-semibold text-foreground"
        >
          {CHAIN_META.heading}
        </h2>
        <p className="mb-8 mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {CHAIN_META.intro}
        </p>
        <IndustryChainMap />
      </div>
    </section>
  );
}
