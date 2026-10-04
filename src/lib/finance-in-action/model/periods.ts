/** Period helpers: quarters, the year-ago comparator, the latest reported period. */
import type { ModelPackage, Period } from '../contract/types';

export const QUARTERS_PER_YEAR = 4;

export const quarterPeriods = (pkg: ModelPackage): Period[] => pkg.periods.filter((p) => p.kind === 'quarter');

/** The same quarter a year earlier: four places back in the package's quarter sequence. */
export function yearAgo(pkg: ModelPackage, periodId: string): Period | undefined {
  const q = quarterPeriods(pkg);
  const i = q.findIndex((p) => p.id === periodId);
  return i >= QUARTERS_PER_YEAR ? q[i - QUARTERS_PER_YEAR] : undefined;
}

export const periodById = (pkg: ModelPackage, id: string): Period | undefined => pkg.periods.find((p) => p.id === id);

/**
 * The default period of a list: the last one that is not a forecast, so a
 * reader lands on figures read out of the statements; the last one when all
 * are forecasts.
 */
export function latestReported(pkg: ModelPackage, ids: string[]): string | undefined {
  const reported = ids.filter((id) => periodById(pkg, id)?.forecast === false);
  return reported[reported.length - 1] ?? ids[ids.length - 1];
}
