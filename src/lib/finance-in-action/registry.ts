/**
 * Everything the section lists: model packages, the slate of planned
 * companies, the sub-industries and the link register, joined and checked.
 *
 * A package is listed only if it passes both the contract rules
 * (validatePackage) and the engine checks (checkFormulas); one that fails is
 * kept aside with its issues so the page can say so instead of drawing it.
 *
 * The Finance in Action pages also require a sub-industry the section lists
 * (`requireListedSubIndustry`): the index draws companies under their
 * sub-industry, so a package the section cannot place would otherwise be
 * neither drawn nor reported (found on the first end-to-end run, PRD "FSRE
 * publish path" M5). It is an option, off by default, because the Kawasan
 * Industri world builds the same registry and reads companies by ticker
 * against its own 125 sub-industries, where the section's list says nothing.
 */
import type { Depth, ModelStatus } from './constants';
import { STATUSES } from './constants';
import type { ModelPackage } from './contract/types';
import type { IndustryLink } from './contract/links';
import { validateLinkRegister, validatePackage, type ValidationIssue } from './contract/validate';
import { checkFormulas } from './model/checks';
import { Workbook } from './model/workbook';
import { CHAIN_POSITIONS, type ChainPosition } from './chain';

export interface SubIndustry {
  code: string;
  name: string;
  chainStage: string;
  /** The product, as a noun: "coal", "cement". */
  unitNoun: string;
  /** The unit it is counted in: "tonne". */
  unit: string;
  note: string;
}

export interface SlateEntry {
  ticker: string;
  name: string;
  subIndustry: string;
  status: ModelStatus;
  depth: Depth | null;
  conditionIds: number[];
}

export interface CompanyEntry {
  ticker: string;
  name: string;
  subIndustry: string;
  status: ModelStatus;
  depth: Depth | null;
  conditionIds: number[];
  /** The latest quarter's period id, when a package exists. */
  latestQuarter: string | null;
  synthetic: boolean;
  pkg: ModelPackage | null;
}

export interface RegistrySources {
  packages: ModelPackage[];
  slate: SlateEntry[];
  subIndustries: SubIndustry[];
  links: IndustryLink[];
}

export interface Registry {
  packages: ModelPackage[];
  rejected: { ticker: string; issues: ValidationIssue[] }[];
  companies: CompanyEntry[];
  subIndustries: SubIndustry[];
  links: IndustryLink[];
  /** Link register entries that do not resolve against the loaded packages (PRD D-C1); ignored on screen. */
  linkIssues: ValidationIssue[];
  company(ticker: string): CompanyEntry | undefined;
  subIndustry(code: string): SubIndustry | undefined;
  workbook(ticker: string): Workbook | undefined;
}

const STATUS_ORDER = STATUSES.map((s) => s.id);

export interface RegistryOptions {
  /** Reject a package whose meta.subIndustry is not in `subIndustries` (the section's pages); default false. */
  requireListedSubIndustry?: boolean;
}

export function buildRegistry(src: RegistrySources, options: RegistryOptions = {}): Registry {
  const workbooks = new Map<string, Workbook>();
  const packages: ModelPackage[] = [];
  const rejected: Registry['rejected'] = [];
  const listed = new Set(src.subIndustries.map((s) => s.code));
  for (const pkg of src.packages) {
    const issues = validatePackage(pkg);
    if (options.requireListedSubIndustry && !listed.has(pkg.meta.subIndustry)) {
      issues.push({ path: 'meta.subIndustry', message: `${pkg.meta.subIndustry} is not a sub-industry the section lists, so the package has no place on the chain` });
    }
    let wb: Workbook | undefined;
    if (!issues.length) {
      wb = new Workbook(pkg);
      issues.push(...checkFormulas(wb));
    }
    if (issues.length || !wb) {
      rejected.push({ ticker: pkg.meta.ticker, issues });
      continue;
    }
    packages.push(pkg);
    workbooks.set(pkg.meta.ticker, wb);
  }

  const fromPackages: CompanyEntry[] = packages.map((pkg) => ({
    ticker: pkg.meta.ticker,
    name: pkg.meta.name,
    subIndustry: pkg.meta.subIndustry,
    status: pkg.meta.status,
    depth: pkg.meta.depth,
    conditionIds: pkg.meta.conditionIds,
    latestQuarter: pkg.meta.asOf.latestQuarter,
    synthetic: pkg.meta.provenance === 'synthetic',
    pkg,
  }));
  const modelled = new Set(fromPackages.map((c) => c.ticker));
  const fromSlate: CompanyEntry[] = src.slate
    .filter((s) => !modelled.has(s.ticker))
    .map((s) => ({ ...s, latestQuarter: null, synthetic: false, pkg: null }));

  const companies = [...fromPackages, ...fromSlate].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.ticker.localeCompare(b.ticker),
  );

  return {
    packages,
    rejected,
    companies,
    subIndustries: src.subIndustries,
    links: src.links,
    linkIssues: validateLinkRegister(src.links, packages),
    company: (ticker) => companies.find((c) => c.ticker.toLowerCase() === ticker.toLowerCase()),
    subIndustry: (code) => src.subIndustries.find((s) => s.code === code),
    workbook: (ticker) => workbooks.get(ticker.toUpperCase()),
  };
}

export interface PositionGroup {
  position: ChainPosition;
  subIndustries: { subIndustry: SubIndustry; companies: CompanyEntry[] }[];
}

/** The section, grouped along the chain: every stage, then the two layers. */
export function groupAlongChain(reg: Registry, companies: CompanyEntry[] = reg.companies): PositionGroup[] {
  return CHAIN_POSITIONS.map((position) => ({
    position,
    subIndustries: reg.subIndustries
      .filter((s) => s.chainStage === position.id)
      .map((subIndustry) => ({ subIndustry, companies: companies.filter((c) => c.subIndustry === subIndustry.code) })),
  }));
}

/** The label of a period id within a package, or the id itself. */
export function periodLabel(pkg: ModelPackage | null, periodId: string | null): string | null {
  if (!periodId) return null;
  return pkg?.periods.find((p) => p.id === periodId)?.label ?? periodId;
}
