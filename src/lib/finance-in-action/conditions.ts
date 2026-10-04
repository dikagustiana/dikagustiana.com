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
export const conditionHref = (n: number): string => `/finance/capital-allocation/${getConditionByNumber(n)?.id ?? conditionCode(n)}`;

/** The conditions a set of companies refers to, in number order. */
export function conditionsUsed(lists: number[][]): CapitalCondition[] {
  const nums = Array.from(new Set(lists.flat())).sort((a, b) => a - b);
  return nums.map((n) => getConditionByNumber(n)).filter((c): c is CapitalCondition => !!c);
}
