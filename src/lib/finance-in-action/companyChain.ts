/**
 * The chain at company level (chain view, PRD D-C2). Nothing here is stored:
 * a company's neighbours are worked from the registry, its sub-industry's
 * chain stage, and the link register read from either end (linksFrom,
 * linksTo). There is no company-to-company edge written by hand, because no
 * source names who supplies whom.
 */
import type { ModelPackage } from './contract/types';
import { isMeasured, type IndustryLink } from './contract/links';
import { positionOf, type ChainPosition } from './chain';
import { linksFrom, linksTo } from './links';
import type { CompanyEntry, Registry, SubIndustry } from './registry';

export interface CompanyRail {
  /** The company's own sub-industry, the company included, in registry order. */
  sameSubIndustry: CompanyEntry[];
  /** The rest of its chain stage (or layer). */
  restOfStage: CompanyEntry[];
}

/** The model page's company rail: the sub-industry first, then the rest of the stage. */
export function companyRail(reg: Registry, pkg: ModelPackage): CompanyRail {
  const stageOf = (c: CompanyEntry) => reg.subIndustry(c.subIndustry)?.chainStage;
  return {
    sameSubIndustry: reg.companies.filter((c) => c.subIndustry === pkg.meta.subIndustry),
    restOfStage: reg.companies.filter((c) => c.subIndustry !== pkg.meta.subIndustry && stageOf(c) === pkg.meta.chainStage),
  };
}

/** One sub-industry at the other end of a register link, with its companies. */
export interface ChainNeighbour {
  link: IndustryLink;
  /** Which end of the link the neighbour is: upstream feeds this company's sub-industry, downstream is fed by it. */
  direction: 'upstream' | 'downstream';
  code: string;
  subIndustry: SubIndustry | undefined;
  /** Where the neighbour sits: a stage, or a spanning layer. */
  position: ChainPosition | undefined;
  companies: CompanyEntry[];
  measured: boolean;
}

export interface CompanyChainView {
  /** Links into this sub-industry from a stage. */
  upstream: ChainNeighbour[];
  /** The other companies of this sub-industry. */
  sameSubIndustry: CompanyEntry[];
  /** Links out of this sub-industry to a stage. */
  downstream: ChainNeighbour[];
  /** Links to or from a spanning layer (energy, logistics), kept as their own group. */
  layers: ChainNeighbour[];
  /** When the company itself sits on a spanning layer: the layer, and where it runs. */
  band: ChainPosition | null;
}

/**
 * The company-level chain (PRD D-C2): the upstream companies of X are the
 * companies in `link.from` of every link whose `to` is X's sub-industry, and
 * downstream likewise. Derived on every read, never stored.
 */
export function companyChain(reg: Registry, pkg: ModelPackage): CompanyChainView {
  const code = pkg.meta.subIndustry;
  const neighbour = (link: IndustryLink, direction: ChainNeighbour['direction']): ChainNeighbour => {
    const other = direction === 'upstream' ? link.from : link.to;
    const subIndustry = reg.subIndustry(other);
    return {
      link,
      direction,
      code: other,
      subIndustry,
      position: subIndustry ? positionOf(subIndustry.chainStage) : undefined,
      companies: reg.companies.filter((c) => c.subIndustry === other),
      measured: isMeasured(link),
    };
  };
  const all = [...linksTo(reg, code).map((l) => neighbour(l, 'upstream')), ...linksFrom(reg, code).map((l) => neighbour(l, 'downstream'))];
  const onLayer = (n: ChainNeighbour) => n.position?.kind === 'layer';
  const own = positionOf(pkg.meta.chainStage);
  return {
    upstream: all.filter((n) => n.direction === 'upstream' && !onLayer(n)),
    sameSubIndustry: reg.companies.filter((c) => c.subIndustry === code && c.ticker !== pkg.meta.ticker),
    downstream: all.filter((n) => n.direction === 'downstream' && !onLayer(n)),
    layers: all.filter(onLayer),
    band: own?.kind === 'layer' ? own : null,
  };
}
