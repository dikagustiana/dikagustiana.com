/** The counts on a stage card of the index (brief §5.1). */
import type { PositionGroup } from './registry';
import { COPY } from './copy';
import { formatNumber } from './format';

export function countsLine(group: PositionGroup): string {
  const subs = group.subIndustries.length;
  const companies = group.subIndustries.reduce((n, s) => n + s.companies.length, 0);
  if (!subs) return COPY.noModels;
  const subWord = subs === 1 ? 'sub-industry' : 'sub-industries';
  const coWord = companies === 1 ? 'company' : 'companies';
  return `${formatNumber(subs)} ${subWord}, ${formatNumber(companies)} ${coWord}`;
}

export function publishedLine(group: PositionGroup): string | null {
  const companies = group.subIndustries.flatMap((s) => s.companies);
  if (!companies.length) return null;
  const published = companies.filter((c) => c.status === 'published').length;
  const preview = companies.filter((c) => c.status === 'preview').length;
  const parts = [`${formatNumber(published)} published`];
  if (preview) parts.push(`${formatNumber(preview)} preview`);
  return parts.join(', ');
}

