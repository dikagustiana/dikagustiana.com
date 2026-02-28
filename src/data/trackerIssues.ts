export interface WhatChanged {
  changed: string[];
  held: string[];
  reversed: string[];
}

export type DirectionalReading =
  | 'Advancing'
  | 'Stalling'
  | 'Fragmenting'
  | 'Regressing';

export interface SectionContent {
  body: string;
  keyObservation: string;
}

export interface TrackerIssue {
  slug: string;
  label: string;
  periodCovered: string;
  publishedAt: string;
  directionalReading: DirectionalReading;
  previousReading: DirectionalReading | '';
  strategicImplicationPreview: string;
  whatChanged: WhatChanged;
  sections: {
    policyMovement: SectionContent;
    capitalSignal: SectionContent;
    institutionalIncentiveShift: SectionContent;
    executionFriction: SectionContent;
    directionalAssessment: SectionContent;
    strategicImplication: SectionContent;
  };
  activeThreads: string[];
  openQuestion: string;
}

export const trackerIssues: TrackerIssue[] = [
  {
    slug: 'q2-2025',
    label: 'Q2 2025',
    periodCovered: 'April–June 2025',
    publishedAt: '2025-07-15',
    directionalReading: 'Fragmenting',
    previousReading: 'Stalling',
    strategicImplicationPreview:
      'Capital allocators face a widening gap between geothermal bankability and solar procurement gridlock, requiring sector-specific positioning rather than broad energy transition exposure.',
    whatChanged: {
      changed: [
        'PLN issued a partial procurement signal for renewable capacity in eastern Indonesia, breaking a two-quarter silence on new power purchase agreements.',
        'TKDN local content requirements for solar panel procurement created a direct conflict with cost assumptions embedded in JETP-backed project pipelines.',
        'Danantara\'s operational mandate remained undefined relative to energy transition capital deployment, creating institutional ambiguity for state-owned enterprise coordination.',
      ],
      held: [
        'JETP secretariat disbursement architecture remained procedurally incomplete, with no material change in fund flow mechanisms since Q1.',
        'OJK\'s sustainable finance taxonomy continued in draft consultation status without formal adoption.',
      ],
      reversed: [
        'Geothermal development, previously stalled by tariff disputes, showed renewed momentum through ESDM\'s revised pricing framework for new exploration zones.',
      ],
    },
    sections: {
      policyMovement: {
        body: 'ESDM released a revised geothermal pricing framework intended to close the tariff gap that had discouraged new exploration investment since the previous regulatory cycle. The framework introduces a ceiling price mechanism tied to regional grid cost benchmarks, which may improve bankability for projects in Sulawesi and Nusa Tenggara.\n\nSeparately, the Ministry issued a circular reinforcing TKDN thresholds for solar photovoltaic procurement, which several industry participants noted creates tension with cost assumptions embedded in internationally financed project proposals.\n\nNo material progress was observed on the long-awaited RUPTL update, which remains the binding constraint on PLN\'s procurement pipeline.',
        keyObservation: 'The RUPTL delay remains the single binding constraint on PLN\'s renewable procurement pipeline, regardless of progress in subsector-specific pricing frameworks.',
      },
      capitalSignal: {
        body: 'ADB\'s concessional facility for Indonesian energy transition projects entered a second phase of due diligence on three geothermal prospects, signaling continued institutional appetite for below-ground renewable assets despite surface-level policy uncertainty.\n\nPrivate equity interest in distributed solar remained muted, with several fund managers citing TKDN compliance costs as a dealbreaker at current panel price levels.\n\nPLN\'s balance sheet continued to constrain its ability to enter new long-term power purchase agreements without sovereign guarantee structures, a condition that limits the pipeline of bankable projects available to international capital.',
        keyObservation: 'ADB\'s continued due diligence signals institutional appetite that domestic regulatory uncertainty has not yet closed.',
      },
      institutionalIncentiveShift: {
        body: 'Danantara\'s establishment as a sovereign wealth vehicle introduced a new institutional actor whose mandate relative to energy transition remains formally undefined. State-owned enterprises including PLN and Pertamina have not received updated guidance on how Danantara\'s capital allocation priorities intersect with existing energy transition commitments.\n\nBKPM continued to process investment licenses for coal-adjacent industrial facilities in parallel with renewable energy approvals, reflecting an incentive structure that has not yet been recalibrated toward transition objectives.\n\nOJK maintained its draft sustainable finance taxonomy in consultation status, delaying the signal that would allow financial institutions to differentiate transition-aligned lending.',
        keyObservation: 'Danantara\'s undefined energy mandate creates a coordination vacuum across state-owned enterprises that no existing institution is positioned to fill.',
      },
      executionFriction: {
        body: 'TKDN requirements for solar panel procurement created a direct execution conflict with JETP-backed project cost models, which assume access to internationally competitive module pricing. Domestic manufacturing capacity for solar panels remains insufficient to meet projected procurement volumes at the quality and cost thresholds required by concessional finance providers.\n\nGrid interconnection timelines in eastern Indonesia continued to exceed project development schedules, creating a mismatch between generation readiness and offtake capacity.\n\nLand acquisition for utility-scale solar projects in Java encountered continued procedural delays related to spatial planning coordination between provincial and national authorities.',
        keyObservation: 'The TKDN–JETP cost conflict is structurally unresolvable at current domestic manufacturing capacity levels without regulatory adjustment.',
      },
      directionalAssessment: {
        body: 'The transition trajectory shifted from stalling to fragmenting during this quarter. Geothermal development showed genuine forward movement through ESDM\'s pricing framework revision, representing the most concrete policy action observed in the tracker\'s coverage period.\n\nHowever, solar procurement — the sector with the largest theoretical capacity addition potential — moved backward in practical terms due to the TKDN conflict with international project finance assumptions. The institutional landscape became more complex with Danantara\'s entry as an undefined actor, and the absence of RUPTL clarity continued to prevent PLN from committing to the procurement volumes that would unlock private capital at scale.\n\nThe overall reading is fragmenting: progress in one subsector, regression in another, and institutional ambiguity across the coordination layer.',
        keyObservation: 'Fragmenting describes a condition where subsector trajectories diverge — geothermal advances while solar regresses — making aggregate transition metrics misleading.',
      },
      strategicImplication: {
        body: 'Capital allocators face a widening gap between geothermal bankability and solar procurement gridlock, requiring sector-specific positioning rather than broad energy transition exposure. Geothermal assets with ESDM-compliant pricing structures represent the most actionable near-term opportunity, while solar positions should be deferred until TKDN resolution provides cost clarity.\n\nInstitutional investors with sovereign guarantee access retain a structural advantage that is unlikely to diminish in the near term.\n\nThe unresolved Danantara mandate creates optionality risk for state-owned enterprise partnerships that should be monitored but not yet priced into allocation decisions.',
        keyObservation: 'Sector-specific positioning — not broad energy transition exposure — is the only rational allocation posture in a fragmenting environment.',
      },
    },
    activeThreads: [
      'PLN Balance Sheet Thread',
      'JETP Disbursement Thread',
      'TKDN Conflict Thread',
    ],
    openQuestion:
      'The question this tracker will evaluate in Q3 2025 is whether Danantara\'s operational mandate will formally incorporate energy transition capital deployment, and whether the TKDN conflict resolves through regulatory adjustment or project restructuring.',
  },
  {
    slug: 'q1-2025',
    label: 'Q1 2025',
    periodCovered: 'January–March 2025',
    publishedAt: '2025-04-14',
    directionalReading: 'Stalling',
    previousReading: '',
    strategicImplicationPreview:
      'The absence of an updated RUPTL and the procedural incompleteness of the JETP secretariat mean that no new large-scale renewable procurement is structurally possible in the near term, regardless of stated policy ambition.',
    whatChanged: {
      changed: [],
      held: [],
      reversed: [],
    },
    sections: {
      policyMovement: {
        body: 'The Ministry of Energy and Mineral Resources did not release the long-anticipated RUPTL update during the quarter, extending the planning vacuum that has constrained PLN\'s ability to issue new procurement signals for renewable capacity.\n\nJETP\'s investment and policy plan, while formally endorsed at the political level, did not translate into operational procurement instruments or disbursement schedules. OJK circulated a draft sustainable finance taxonomy for stakeholder consultation, but the document has not been formally adopted and does not yet carry regulatory force for financial institution lending practices.\n\nESDM issued a ministerial regulation on rooftop solar net metering revisions, though the practical impact on installed capacity remains limited by grid interconnection constraints at the distribution level.',
        keyObservation: 'The RUPTL\'s continued absence means PLN cannot legally commit to new renewable capacity procurement at scale, regardless of political signaling.',
      },
      capitalSignal: {
        body: 'International development finance institutions including ADB and the World Bank maintained programmatic engagement with Indonesian energy transition planning, but no new concessional facilities were operationalized during the quarter.\n\nPLN\'s balance sheet position continued to limit its capacity to enter new long-term power purchase agreements without sovereign guarantee structures, a constraint that several project developers cited as the binding obstacle to financial close on renewable energy projects.\n\nPertamina\'s upstream capital expenditure allocation showed no material rebalancing toward renewable or low-carbon energy segments. Private capital activity in Indonesian renewable energy remained concentrated in small-scale distributed generation, with utility-scale project development effectively paused pending RUPTL clarity.',
        keyObservation: 'PLN\'s balance sheet constraint — not policy intent — is the binding obstacle to financial close on renewable energy projects.',
      },
      institutionalIncentiveShift: {
        body: 'The JETP secretariat initiated organizational staffing but did not achieve the operational capacity required to begin processing project proposals or disbursing funds during the quarter.\n\nPLN\'s institutional incentive structure remained oriented toward system reliability and cost management rather than capacity addition, reflecting the utility\'s constrained balance sheet and the absence of regulatory direction to prioritize renewable procurement.\n\nBKPM continued to approve investment licenses across the energy sector without differentiation between fossil and renewable projects, indicating that the investment facilitation layer has not yet incorporated transition-aligned screening criteria. No changes were observed in the fiscal incentive framework for renewable energy investment.',
        keyObservation: 'BKPM\'s undifferentiated investment licensing reveals that the facilitation layer operates without transition-aligned screening criteria.',
      },
      executionFriction: {
        body: 'Grid interconnection capacity in high-potential renewable energy zones, particularly in Sulawesi and Nusa Tenggara, remained insufficient to absorb the generation volumes projected in proposed project pipelines.\n\nLand acquisition for utility-scale projects continued to encounter procedural delays related to spatial planning coordination, environmental impact assessment timelines, and local government permitting requirements.\n\nPLN\'s technical standards for grid-connected renewable generation have not been updated to reflect current technology capabilities, creating compliance uncertainty for project developers. The domestic supply chain for renewable energy equipment remained underdeveloped relative to the installation volumes implied by stated national targets.',
        keyObservation: 'Grid interconnection insufficiency in eastern Indonesia represents a physical constraint that policy instruments alone cannot resolve in the near term.',
      },
      directionalAssessment: {
        body: 'Indonesia\'s energy transition entered a stalling phase during the first quarter of this tracker\'s coverage. The foundational planning instrument — the RUPTL — remained unreleased, which structurally prevents PLN from committing to new renewable capacity procurement at scale.\n\nThe JETP secretariat exists institutionally but does not yet function operationally, meaning that the largest dedicated transition finance mechanism available to Indonesia cannot yet deploy capital. OJK\'s taxonomy draft represents a directionally positive signal but carries no regulatory weight in its current form.\n\nThe overall reading is stalling: institutional architecture is being assembled, but no instrument has reached the operational threshold required to produce observable transition outcomes.',
        keyObservation: 'Stalling describes a condition where institutional architecture exists but no instrument has crossed the operational threshold required to produce observable outcomes.',
      },
      strategicImplication: {
        body: 'The absence of an updated RUPTL and the procedural incompleteness of the JETP secretariat mean that no new large-scale renewable procurement is structurally possible in the near term, regardless of stated policy ambition.\n\nCapital allocators should treat Indonesia\'s energy transition as a pre-procurement environment and avoid positioning based on policy announcements that lack operational instruments. The most productive near-term engagement for institutional investors is monitoring the RUPTL timeline and JETP secretariat operational capacity as leading indicators of actual procurement opportunity.\n\nEarly-stage project development activity should focus on geothermal and small-scale distributed solar, where existing regulatory frameworks — however imperfect — permit project advancement without dependence on unreleased planning instruments.',
        keyObservation: 'Indonesia\'s energy transition should be treated as a pre-procurement environment until the RUPTL update and JETP operationalization cross observable thresholds.',
      },
    },
    activeThreads: [
      'PLN Balance Sheet Thread',
      'JETP Disbursement Thread',
    ],
    openQuestion:
      'The question this tracker will evaluate in Q2 2025 is whether the RUPTL update materializes and whether the JETP secretariat achieves operational capacity sufficient to begin processing project proposals.',
  },
];
