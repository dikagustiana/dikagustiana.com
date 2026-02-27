/**
 * ModuleHeaderFactory — Centralised variant switch for module headers.
 */

import { StrategicModuleHeader } from './StrategicModuleHeader';
import { PlanningModuleHeader } from './PlanningModuleHeader';
import { AnalyticsModuleHeader } from './AnalyticsModuleHeader';
import { NarrativeModuleHeader } from './NarrativeModuleHeader';

interface ModuleHeaderProps {
  variant: string;
  title: string;
  thesis: string | null;
  sortOrder: number;
}

export function ModuleHeaderFactory({ variant, title, thesis, sortOrder }: ModuleHeaderProps) {
  switch (variant) {
    case 'board':
      return <StrategicModuleHeader title={title} thesis={thesis} sortOrder={sortOrder} />;
    case 'planning':
      return <PlanningModuleHeader title={title} thesis={thesis} sortOrder={sortOrder} />;
    case 'analytics':
      return <AnalyticsModuleHeader title={title} thesis={thesis} sortOrder={sortOrder} />;
    default:
      return (
        <div className="mb-10">
          <span className="text-sm font-mono text-muted-foreground mb-2 block">
            {String(sortOrder).padStart(2, '0')}
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            {title}
          </h1>
        </div>
      );
  }
}
