/**
 * The section's addresses. Model pages follow the site's canonical shape,
 * section path plus one slug: /finance/finance-in-action/<ticker in lower
 * case> (Commit 0 report §8).
 */
import { positionAnchor, subIndustryAnchor } from './chain';

export const INDEX_PATH = '/finance/finance-in-action';
/** The index's two subsections (docs/prd/finance-restructure §1 B): Capital in Motion, then the company models. */
export const CAPITAL_IN_MOTION_ANCHOR = 'capital-in-motion';
export const COMPANY_MODELS_ANCHOR = 'company-models';
/** The "Conditions present" line on a model page. */
export const CONDITIONS_ANCHOR = 'fia-conditions';

export const modelPath = (ticker: string): string => `${INDEX_PATH}/${ticker.toLowerCase()}`;
export const positionPath = (positionId: string): string => `${INDEX_PATH}#${positionAnchor(positionId)}`;
export const subIndustryPath = (code: string): string => `${INDEX_PATH}#${subIndustryAnchor(code)}`;

/** The model page's address parameters. */
export const MODEL_PARAM = { lens: 'connections' } as const;
