/**
 * Condition ↔ company (docs/prd/finance-restructure §4): every published
 * package carries `meta.conditionIds` (contract/model-package.schema.json),
 * so the companies exhibiting a Capital in Motion condition are read from
 * the registry, never stored a second time. Built once per registry.
 *
 * Every one of the 21 conditions has an entry: a condition no published
 * company is tagged with maps to an empty list, not to undefined, so a page
 * can say "No company tagged yet" without a guard.
 */
import { CONDITIONS } from '@/data/capitalConditions';
import { conditionCode } from './conditions';
import type { CompanyEntry, Registry } from './registry';

export type CompaniesByCondition = Map<number, CompanyEntry[]>;

/** Published companies (a package, status published) by condition number, each list by ticker. */
export function companiesByCondition(reg: Pick<Registry, 'companies'>): CompaniesByCondition {
  const out: CompaniesByCondition = new Map(CONDITIONS.map((c) => [c.number, []]));
  const published = reg.companies
    .filter((c) => c.pkg && c.status === 'published')
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  for (const company of published) {
    for (const n of new Set(company.conditionIds)) out.get(n)?.push(company);
  }
  return out;
}

/** The companies for one condition: always a list. */
export const companiesFor = (index: CompaniesByCondition, n: number): CompanyEntry[] => index.get(n) ?? [];

/** "T1 · M14B" from a finance_modules slug such as t1-m14b. */
export const moduleChip = (slug: string): string => slug.toUpperCase().split('-').join(' · ');

/** A condition's row in subsection A of the index: #condition-03. */
export const conditionRowAnchor = (n: number): string => `condition-${conditionCode(n)}`;
