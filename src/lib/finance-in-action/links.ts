/** The link register, read from either end. */
import type { IndustryLink } from './contract/links';
import type { UELine } from './contract/types';
import { downstreamLineProblem } from './contract/validate';
import type { Registry } from './registry';

export const linksFrom = (reg: Registry, code: string): IndustryLink[] => reg.links.filter((l) => l.from === code);
export const linksTo = (reg: Registry, code: string): IndustryLink[] => reg.links.filter((l) => l.to === code);

/** Where the link card for a link opens: the index, lens on, that link selected. */
export function linkCardPath(link: IndustryLink): string {
  const params = new URLSearchParams({ connections: 'on', link: link.id });
  return `/finance/finance-in-action?${params.toString()}#links`;
}

export interface DrawnLink {
  link: IndustryLink;
  from: number;
  to: number;
  lane: number;
}

/** Which column each end sits in, and a lane per link so links between the same stages do not overlap. */
export function placeLinks(reg: Registry, stageIds: string[]): DrawnLink[] {
  const lanes = new Map<string, number>();
  const out: DrawnLink[] = [];
  for (const link of reg.links) {
    const from = stageIds.indexOf(reg.subIndustry(link.from)?.chainStage ?? '');
    const to = stageIds.indexOf(reg.subIndustry(link.to)?.chainStage ?? '');
    if (from < 0 || to < 0) continue;
    const pair = `${Math.min(from, to)}-${Math.max(from, to)}`;
    const lane = lanes.get(pair) ?? 0;
    lanes.set(pair, lane + 1);
    out.push({ link, from, to, lane });
  }
  return out;
}

export const linkName = (reg: Registry, link: IndustryLink): string =>
  `${reg.subIndustry(link.from)?.name ?? link.from} to ${reg.subIndustry(link.to)?.name ?? link.to}`;

/**
 * The downstream company's line that carries this link's input (PRD D-C1),
 * or null when the register names none or names one that does not resolve
 * (validation reports those; the screen ignores them).
 */
export function downstreamLine(reg: Registry, link: IndustryLink, ticker: string): UELine | null {
  const lineId = link.downstreamLines?.[ticker];
  if (!lineId || downstreamLineProblem(link, ticker, lineId, reg.packages)) return null;
  return reg.company(ticker)?.pkg?.unitEconomics.lines.find((l) => l.id === lineId) ?? null;
}
