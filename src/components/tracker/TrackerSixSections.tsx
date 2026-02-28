interface TrackerSixSectionsProps {
  sections: {
    policyMovement: string;
    capitalSignal: string;
    institutionalIncentiveShift: string;
    executionFriction: string;
    directionalAssessment: string;
    strategicImplication: string;
  };
}

const sectionMeta = [
  { key: 'policyMovement', id: '01', label: 'POLICY MOVEMENT', desc: 'Enacted regulations, decrees, and formally adopted instruments' },
  { key: 'capitalSignal', id: '02', label: 'CAPITAL SIGNAL', desc: 'Observable shifts in institutional and commercial capital positioning' },
  { key: 'institutionalIncentiveShift', id: '03', label: 'INSTITUTIONAL INCENTIVE SHIFT', desc: 'Changes to structural incentives facing key actors' },
  { key: 'executionFriction', id: '04', label: 'EXECUTION FRICTION', desc: 'Documented obstacles to transition capital deployment' },
  { key: 'directionalAssessment', id: '05', label: 'DIRECTIONAL ASSESSMENT', desc: 'Committed quarterly analytical reading' },
  { key: 'strategicImplication', id: '06', label: 'STRATEGIC IMPLICATION', desc: 'Concrete observation for capital allocators and practitioners' },
] as const;

export function TrackerSixSections({ sections }: TrackerSixSectionsProps) {
  return (
    <div className="max-w-[720px] mx-auto space-y-0">
      {sectionMeta.map((meta, i) => {
        const content = sections[meta.key as keyof typeof sections] || '';
        const paragraphs = content.split('\n').filter(Boolean);

        return (
          <div key={meta.key}>
            {i > 0 && <hr className="border-t border-border my-10" />}
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {meta.id} / {meta.label}
              </p>
              <p className="font-semibold text-sm text-muted-foreground italic">
                {meta.desc}
              </p>
              <div className="space-y-4">
                {paragraphs.map((p, j) => (
                  <p key={j} className="text-foreground leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
