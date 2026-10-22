/**
 * The chain at company level (chain view, PRD D-C2). Nothing here is stored:
 * a company's neighbours are worked from the registry, its sub-industry's
 * chain stage, and the link register read from either end (linksFrom,
 * linksTo). There is no company-to-company edge written by hand, because no
 * source names who supplies whom.
 */
import type { ModelPackage } from './contract/types';
import type { CompanyEntry, Registry } from './registry';

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
