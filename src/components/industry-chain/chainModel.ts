/**
 * The map's read model: turns an element id into the panel's content, and a
 * macro variable into the set of ids the lens should highlight.
 *
 * Pure and content-free. Every string it emits comes from
 * `src/data/industryChain.ts`; nothing here decides what anything means.
 */

import {
  BOUNDARY,
  BYPRODUCT_BRANCH,
  CHAIN_META,
  LAYERS,
  MACRO_ENTRIES,
  NODES,
  NODE_GROUPS,
  NON_PHYSICAL_FLOWS,
  RETURN_FLOWS,
  RETURN_SUMMARY,
  STAGES,
  type ChainCategory,
  type Described,
} from '@/data/industryChain';

/**
 * The visual family an element belongs to. The first four are the four
 * categories that must never be drawn as one another; the rest are the
 * non-physical flows, the border and the macro markers.
 */
export type PanelCategory = ChainCategory | 'flow' | 'boundary' | 'branch' | 'macro';

export interface PanelRow {
  label: string;
  values: string[];
}

export interface PanelModel {
  id: string;
  category: PanelCategory;
  categoryLabel: string;
  label: string;
  definition: string;
  rows: PanelRow[];
  detail: string[];
  micro?: { label: string; description: string };
  essaySlugs: string[];
}

const CATEGORY_LABEL: Record<PanelCategory, string> = {
  stage: CHAIN_META.categories[0].label,
  node: CHAIN_META.categories[1].label,
  layer: CHAIN_META.categories[2].label,
  return: CHAIN_META.categories[3].label,
  flow: CHAIN_META.sections.nonPhysical,
  boundary: CHAIN_META.sections.layers,
  branch: CHAIN_META.sections.returnFlows,
  macro: CHAIN_META.sections.macro,
};

const P = CHAIN_META.panel;

/** Every element that can be selected, indexed once. */
export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));
export const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
export const GROUP_BY_ID = new Map(NODE_GROUPS.map((g) => [g.id, g]));
export const LAYER_BY_ID = new Map(LAYERS.map((l) => [l.id, l]));
export const RETURN_BY_ID = new Map(RETURN_FLOWS.map((r) => [r.id, r]));
export const FLOW_BY_ID = new Map(NON_PHYSICAL_FLOWS.map((f) => [f.id, f]));
export const MACRO_BY_ID = new Map(MACRO_ENTRIES.map((m) => [m.id, m]));

const SUB_LABEL_BY_ID = new Map(
  STAGES.flatMap((stage) => (stage.subLabels ?? []).map((sub) => [sub.id, { stage, sub }] as const)),
);

const SUB_BAND_BY_ID = new Map(
  LAYERS.flatMap((layer) => (layer.subBands ?? []).map((band) => [band.id, { layer, band }] as const)),
);

/** Human label for any id the map knows about — used by the lens summary. */
export function labelFor(id: string): string | undefined {
  return (
    STAGE_BY_ID.get(id)?.label ??
    NODE_BY_ID.get(id)?.label ??
    GROUP_BY_ID.get(id)?.label ??
    LAYER_BY_ID.get(id)?.label ??
    RETURN_BY_ID.get(id)?.label ??
    FLOW_BY_ID.get(id)?.label ??
    MACRO_BY_ID.get(id)?.label ??
    SUB_LABEL_BY_ID.get(id)?.sub.label ??
    SUB_BAND_BY_ID.get(id)?.band.label ??
    (id === BOUNDARY.id ? BOUNDARY.label : undefined) ??
    (id === BYPRODUCT_BRANCH.id ? BYPRODUCT_BRANCH.label : undefined) ??
    (id === RETURN_SUMMARY.id ? RETURN_SUMMARY.label : undefined)
  );
}

function rowsFrom(pairs: [string, string[] | undefined][]): PanelRow[] {
  return pairs
    .filter((pair): pair is [string, string[]] => Array.isArray(pair[1]) && pair[1].length > 0)
    .map(([label, values]) => ({ label, values }));
}

function base(item: Described, category: PanelCategory, rows: PanelRow[] = []): PanelModel {
  return {
    id: item.id,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    label: item.label,
    definition: item.definition,
    rows: [...rowsFrom([[P.examples, item.examples]]), ...rows],
    detail: item.detail ? [...item.detail] : [],
    essaySlugs: item.essaySlugs,
  };
}

/**
 * The whole panel, for whatever is selected. Returns null for an unknown id
 * rather than inventing a fallback: a panel describing nothing is worse than
 * no panel.
 */
export function resolvePanel(id: string): PanelModel | null {
  const stage = STAGE_BY_ID.get(id);
  if (stage) {
    return base(
      stage,
      'stage',
      rowsFrom([[P.subLabels, stage.subLabels?.map((sub) => `${sub.label} — ${sub.definition}`)]]),
    );
  }

  const subLabel = SUB_LABEL_BY_ID.get(id);
  if (subLabel) {
    return base(subLabel.sub, 'stage', [{ label: P.members, values: [subLabel.stage.label] }]);
  }

  const group = GROUP_BY_ID.get(id);
  if (group) {
    const members = group.members
      .map((memberId) => NODE_BY_ID.get(memberId)?.label)
      .filter((label): label is string => Boolean(label));
    return base(group, 'node', [{ label: P.members, values: members }]);
  }

  const node = NODE_BY_ID.get(id);
  if (node) {
    return base(node, 'node', rowsFrom([[P.recursion, node.recursion ? [node.recursion] : undefined]]));
  }

  const layer = LAYER_BY_ID.get(id);
  if (layer) {
    return base(
      layer,
      'layer',
      rowsFrom([[P.subBands, layer.subBands?.map((band) => `${band.label} — ${band.definition}`)]]),
    );
  }

  const subBand = SUB_BAND_BY_ID.get(id);
  if (subBand) {
    return base(subBand.band, 'layer', [{ label: P.members, values: [subBand.layer.label] }]);
  }

  if (id === BOUNDARY.id) {
    return base(BOUNDARY, 'boundary', [
      { label: P.crossings, values: BOUNDARY.crossings.map((crossing) => crossing.label) },
    ]);
  }

  if (id === RETURN_SUMMARY.id) {
    return base(RETURN_SUMMARY, 'return', [
      { label: P.members, values: RETURN_FLOWS.map((flow) => `${flow.label}: ${flow.from} → ${flow.to}`) },
    ]);
  }

  const returnFlow = RETURN_BY_ID.get(id);
  if (returnFlow) {
    return base(returnFlow, 'return', [
      { label: P.travels, values: [`${returnFlow.from} → ${returnFlow.to}`] },
    ]);
  }

  if (id === BYPRODUCT_BRANCH.id) {
    return base(BYPRODUCT_BRANCH, 'branch', [{ label: P.travels, values: [BYPRODUCT_BRANCH.to] }]);
  }

  const flow = FLOW_BY_ID.get(id);
  if (flow) {
    return base(flow, 'flow', [
      { label: P.leftward, values: [flow.leftward] },
      { label: P.rightward, values: [flow.rightward] },
    ]);
  }

  const macro = MACRO_BY_ID.get(id);
  if (macro) {
    const highlighted = macro.highlights
      .map((target) => labelFor(target))
      .filter((label): label is string => Boolean(label));
    return {
      ...base(macro, 'macro', [{ label: P.highlighted, values: Array.from(new Set(highlighted)) }]),
      micro: macro.micro,
    };
  }

  return null;
}

/**
 * The ids a lens lights up. A macro that names a node also lights its group,
 * so the highlight is honest at the top level where only the group is drawn;
 * a macro that names a sub-label also lights its stage, for the same reason.
 */
export function highlightSetFor(macroId: string | null): ReadonlySet<string> {
  if (!macroId) return new Set<string>();
  const macro = MACRO_BY_ID.get(macroId);
  if (!macro) return new Set<string>();

  const ids = new Set<string>();
  for (const target of macro.highlights) {
    ids.add(target);
    const node = NODE_BY_ID.get(target);
    if (node) ids.add(node.groupId);
    const subLabel = SUB_LABEL_BY_ID.get(target);
    if (subLabel) ids.add(subLabel.stage.id);
    const subBand = SUB_BAND_BY_ID.get(target);
    if (subBand) ids.add(subBand.layer.id);
    for (const crossing of BOUNDARY.crossings) {
      if (target === BOUNDARY.id) ids.add(crossing.id);
    }
  }
  return ids;
}
