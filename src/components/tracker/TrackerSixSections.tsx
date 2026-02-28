import { SectionContent } from '@/data/trackerIssues';

interface TrackerSixSectionsProps {
  sections: {
    policyMovement: SectionContent;
    capitalSignal: SectionContent;
    institutionalIncentiveShift: SectionContent;
    executionFriction: SectionContent;
    directionalAssessment: SectionContent;
    strategicImplication: SectionContent;
  };
  directionalReading?: string;
  openQuestion?: string;
}

const sectionMeta = [
  { key: 'policyMovement', id: '01', label: 'POLICY MOVEMENT', desc: 'Enacted regulations, decrees, and formally adopted instruments' },
  { key: 'capitalSignal', id: '02', label: 'CAPITAL SIGNAL', desc: 'Observable shifts in institutional and commercial capital positioning' },
  { key: 'institutionalIncentiveShift', id: '03', label: 'INSTITUTIONAL INCENTIVE SHIFT', desc: 'Changes to structural incentives facing key actors' },
  { key: 'executionFriction', id: '04', label: 'EXECUTION FRICTION', desc: 'Documented obstacles to transition capital deployment' },
  { key: 'directionalAssessment', id: '05', label: 'DIRECTIONAL ASSESSMENT', desc: 'Committed quarterly analytical reading' },
  { key: 'strategicImplication', id: '06', label: 'STRATEGIC IMPLICATION', desc: 'Concrete observation for capital allocators and practitioners' },
] as const;

export function TrackerSixSections({ sections, directionalReading, openQuestion }: TrackerSixSectionsProps) {
  return (
    <div className="max-w-[680px] mx-auto">
      {sectionMeta.map((meta, i) => {
        const section = sections[meta.key as keyof typeof sections];
        const paragraphs = section.body.split('\n\n').filter(Boolean);
        const isDirectionalAssessment = meta.key === 'directionalAssessment';
        const isStrategicImplication = meta.key === 'strategicImplication';

        return (
          <div key={meta.key}>
            {i > 0 && <div className="border-t border-border my-12" />}

            {/* Section identifier */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-xs text-muted-foreground tracking-widest">
                {meta.id}
              </span>
              <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                {meta.label}
              </span>
            </div>

            {/* Descriptor */}
            <p className="text-sm text-muted-foreground italic mb-6">
              {meta.desc}
            </p>

            {/* Directional Assessment reading label */}
            {isDirectionalAssessment && directionalReading && (
              <div className="inline-flex items-center gap-2 mb-6 py-1.5 px-3 bg-muted rounded-sm">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  Reading:
                </span>
                <span className="font-mono text-xs font-semibold text-foreground uppercase tracking-widest">
                  {directionalReading}
                </span>
              </div>
            )}

            {/* Body paragraphs */}
            <div>
              {paragraphs.map((p, j) => (
                <p key={j} className="text-[17px] leading-[1.75] text-foreground mb-5">
                  {p}
                </p>
              ))}
            </div>

            {/* Key Observation or Open Question */}
            {isStrategicImplication && openQuestion ? (
              <div className="mt-8 mb-2 pl-4 border-l-2 border-foreground/30">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                  Question for Next Quarter
                </p>
                <p className="text-[15px] text-foreground font-medium leading-snug italic">
                  {openQuestion}
                </p>
              </div>
            ) : (
              section.keyObservation && (
                <div className="mt-8 mb-2 pl-4 border-l-2 border-foreground/20">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                    Key Observation
                  </p>
                  <p className="text-[15px] text-foreground font-medium leading-snug">
                    {section.keyObservation}
                  </p>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
