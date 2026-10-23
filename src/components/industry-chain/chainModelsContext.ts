/**
 * The company models Finance in Action holds per chain stage, for the map's
 * finance distance (chain view, PROMPT-site §3.7). Null when no build flag
 * puts the section on the site, and then the map draws nothing for it. The
 * map reads the counts; Finance in Action works them out (lib/finance-in-
 * action/counts.ts), so the map imports none of that section's data.
 */
import { createContext } from 'react';

export interface StageModels {
  /** Where the stage box goes: the stage's section of the Finance in Action index. */
  href: string;
  /** The small label on the box: "2 models", or "planned" when none is published. */
  text: string;
  /** The link's accessible name, saying where it goes. */
  name: string;
}

export type StageModelsMap = ReadonlyMap<string, StageModels>;

export const ChainModelsContext = createContext<StageModelsMap | null>(null);
