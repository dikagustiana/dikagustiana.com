/**
 * Section 05's conditions as Finance in Action names them: titles and
 * decision rules come from src/data/capitalConditions.ts and nowhere else
 * (constraint 6).
 */
import { getConditionByNumber, type CapitalCondition } from '@/data/capitalConditions';

const CODE_WIDTH = 2;

export const conditionCode = (n: number): string => String(n).padStart(CODE_WIDTH, '0');
export const conditionShort = (n: number): string => `Capital in Motion ${conditionCode(n)}`;
export const conditionOf = (n: number): CapitalCondition | undefined => getConditionByNumber(n);
/** Capital in Motion's index, under Finance in Action (docs/prd/finance-restructure §1 C). */
export const CAPITAL_IN_MOTION_PATH = '/finance/finance-in-action/capital-in-motion';
/**
 * The one place a condition's address is built. A number resolves to the
 * condition's slug; a string (a slug from an old address being forwarded) is
 * used as given, so the detail page can say "not found" for one that is not.
 */
export const conditionHref = (n: number | string): string =>
  `${CAPITAL_IN_MOTION_PATH}/${typeof n === 'string' ? n : getConditionByNumber(n)?.id ?? conditionCode(n)}`;

/** The conditions a set of companies refers to, in number order. */
export function conditionsUsed(lists: number[][]): CapitalCondition[] {
  const nums = Array.from(new Set(lists.flat())).sort((a, b) => a - b);
  return nums.map((n) => getConditionByNumber(n)).filter((c): c is CapitalCondition => !!c);
}
