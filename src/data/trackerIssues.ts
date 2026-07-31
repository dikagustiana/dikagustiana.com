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

export interface TrackerEntry {
  slug: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  body: string;
  keyObservation: string;
}

export type SectionKey =
  | 'policyMovement'
  | 'capitalSignal'
  | 'institutionalIncentiveShift'
  | 'executionFriction'
  | 'directionalAssessment'
  | 'strategicImplication';

export const SECTION_META: { key: SectionKey; label: string; desc: string }[] = [
  { key: 'policyMovement', label: 'POLICY MOVEMENT', desc: 'Enacted regulations, decrees, and formally adopted instruments' },
  { key: 'capitalSignal', label: 'CAPITAL SIGNAL', desc: 'Observable shifts in institutional and commercial capital positioning' },
  { key: 'institutionalIncentiveShift', label: 'INSTITUTIONAL INCENTIVE SHIFT', desc: 'Changes to structural incentives facing key actors' },
  { key: 'executionFriction', label: 'EXECUTION FRICTION', desc: 'Documented obstacles to transition capital deployment' },
  { key: 'directionalAssessment', label: 'DIRECTIONAL ASSESSMENT', desc: 'Committed quarterly analytical reading' },
  { key: 'strategicImplication', label: 'STRATEGIC IMPLICATION', desc: 'Concrete observation for capital allocators and practitioners' },
];

export interface TrackerIssue {
  slug: string;
  label: string;
  periodCovered: string;
  publishedAt: string;
  directionalReading: DirectionalReading;
  previousReading: DirectionalReading | '';
  strategicImplicationPreview: string;
  whatChanged: WhatChanged;
  sections: Record<SectionKey, TrackerEntry[]>;
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
      policyMovement: [
        {
          slug: 'geothermal-pricing-framework-revision',
          title: 'ESDM Releases Revised Geothermal Pricing Framework',
          subtitle: 'A ceiling price mechanism tied to regional grid benchmarks may improve bankability in Sulawesi and Nusa Tenggara.',
          publishedAt: '2025-06-15',
          body: 'ESDM released a revised geothermal pricing framework intended to close the tariff gap that had discouraged new exploration investment since the previous regulatory cycle. The framework introduces a ceiling price mechanism tied to regional grid cost benchmarks, which may improve bankability for projects in Sulawesi and Nusa Tenggara.\n\nThe revision addresses a long-standing complaint from developers that the previous fixed-tariff structure did not reflect the actual cost of alternative generation sources in eastern Indonesia, where diesel and coal-fired generation remain the marginal price setters.\n\nNo material progress was observed on the long-awaited RUPTL update, which remains the binding constraint on PLN\'s procurement pipeline regardless of subsector-specific pricing improvements.',
          keyObservation: 'The RUPTL delay remains the single binding constraint on PLN\'s renewable procurement pipeline, regardless of progress in subsector-specific pricing frameworks.',
        },
        {
          slug: 'tkdn-threshold-solar-circular',
          title: 'Ministry Reinforces TKDN Thresholds for Solar Photovoltaic Procurement',
          subtitle: 'The circular creates tension with cost assumptions in internationally financed project proposals.',
          publishedAt: '2025-06-20',
          body: 'The Ministry issued a circular reinforcing TKDN thresholds for solar photovoltaic procurement, maintaining the existing local content requirement at levels that several industry participants described as incompatible with competitive project economics.\n\nThe circular effectively reaffirms Indonesia\'s industrial policy position that renewable energy deployment must serve domestic manufacturing development objectives alongside decarbonization targets. This dual mandate creates a structural tension that project developers working with international concessional finance must navigate.',
          keyObservation: 'TKDN enforcement at current levels functions as an effective capital barrier to international solar financing structures.',
        },
      ],
      capitalSignal: [
        {
          slug: 'adb-geothermal-due-diligence',
          title: 'ADB Advances Due Diligence on Three Geothermal Prospects',
          subtitle: 'Continued institutional appetite for below-ground renewable assets despite surface-level policy uncertainty.',
          publishedAt: '2025-05-10',
          body: 'ADB\'s concessional facility for Indonesian energy transition projects entered a second phase of due diligence on three geothermal prospects, signaling continued institutional appetite for below-ground renewable assets despite surface-level policy uncertainty.\n\nThe prospects under review are located in geologically favorable zones where exploration risk has been partially de-risked through prior government-funded surveys. ADB\'s engagement at this stage suggests that the revised pricing framework has improved the risk-return profile sufficiently to warrant continued capital deployment assessment.\n\nNotably, ADB\'s due diligence timeline has not been accelerated despite the pricing framework revision, suggesting that institutional capital maintains its own pace regardless of domestic regulatory momentum.',
          keyObservation: 'ADB\'s continued due diligence signals institutional appetite that domestic regulatory uncertainty has not yet closed.',
        },
        {
          slug: 'private-equity-solar-muted',
          title: 'Private Equity Interest in Distributed Solar Remains Muted',
          subtitle: 'Fund managers cite TKDN compliance costs as a dealbreaker at current panel price levels.',
          publishedAt: '2025-06-01',
          body: 'Private equity interest in distributed solar remained muted throughout the quarter, with several fund managers citing TKDN compliance costs as a dealbreaker at current panel price levels.\n\nThe gap between internationally available module pricing and TKDN-compliant domestic pricing has widened as global solar panel costs continue to decline while Indonesian manufacturing costs remain structurally higher. This dynamic creates a growing penalty for projects that must comply with local content requirements.',
          keyObservation: 'TKDN compliance costs are now functioning as a de facto capital allocation filter against smaller-ticket solar structures.',
        },
        {
          slug: 'pln-balance-sheet-ppa-constraint',
          title: 'PLN Balance Sheet Continues to Constrain Long-Term PPA Capacity',
          subtitle: 'Without sovereign guarantee structures, the pipeline of bankable projects available to international capital remains limited.',
          publishedAt: '2025-06-10',
          body: 'PLN\'s balance sheet continued to constrain its ability to enter new long-term power purchase agreements without sovereign guarantee structures, a condition that limits the pipeline of bankable projects available to international capital.\n\nThe utility\'s debt-to-equity ratio and existing long-term obligations create a structural ceiling on new PPA commitments. Project developers have increasingly indicated that PLN creditworthiness, rather than regulatory or pricing considerations, is the binding constraint on bringing new renewable capacity to financial close.\n\nSovereign guarantee dependency is now structurally embedded in PLN\'s procurement model and will not resolve without explicit fiscal intervention or a fundamental restructuring of the utility\'s balance sheet.',
          keyObservation: 'Sovereign guarantee dependency is structurally embedded in PLN\'s procurement model and will not resolve without explicit fiscal intervention.',
        },
      ],
      institutionalIncentiveShift: [
        {
          slug: 'danantara-mandate-undefined',
          title: 'Danantara\'s Energy Transition Mandate Remains Formally Undefined',
          subtitle: 'State-owned enterprises lack guidance on how the new sovereign wealth vehicle intersects with existing transition commitments.',
          publishedAt: '2025-05-20',
          body: 'Danantara\'s establishment as a sovereign wealth vehicle introduced a new institutional actor whose mandate relative to energy transition remains formally undefined. State-owned enterprises including PLN and Pertamina have not received updated guidance on how Danantara\'s capital allocation priorities intersect with existing energy transition commitments.\n\nThe absence of a defined mandate creates a coordination vacuum. Existing transition-related initiatives within SOEs now face uncertainty about whether Danantara will supplement, redirect, or consolidate their capital deployment strategies.',
          keyObservation: 'Danantara\'s undefined energy mandate creates a coordination vacuum across state-owned enterprises that no existing institution is positioned to fill.',
        },
        {
          slug: 'bkpm-licensing-undifferentiated',
          title: 'BKPM Investment Licensing Remains Undifferentiated Between Fossil and Renewable',
          subtitle: 'The investment facilitation layer operates without transition-aligned screening criteria.',
          publishedAt: '2025-06-05',
          body: 'BKPM continued to process investment licenses for coal-adjacent industrial facilities in parallel with renewable energy approvals, reflecting an incentive structure that has not yet been recalibrated toward transition objectives.\n\nThe absence of differentiated treatment in the investment licensing process means that Indonesia\'s formal investment gateway does not currently distinguish between transition-aligned and transition-adverse capital inflows. This structural neutrality at the facilitation layer undermines the directional signal that other policy instruments attempt to create.',
          keyObservation: 'BKPM\'s undifferentiated licensing reveals that Indonesia\'s investment facilitation layer has not incorporated transition-aligned screening.',
        },
      ],
      executionFriction: [
        {
          slug: 'tkdn-jetp-cost-conflict',
          title: 'TKDN–JETP Cost Model Conflict Reaches Structural Impasse',
          subtitle: 'Domestic manufacturing capacity cannot meet the quality and cost thresholds required by concessional finance providers.',
          publishedAt: '2025-06-12',
          body: 'TKDN requirements for solar panel procurement created a direct execution conflict with JETP-backed project cost models, which assume access to internationally competitive module pricing. Domestic manufacturing capacity for solar panels remains insufficient to meet projected procurement volumes at the quality and cost thresholds required by concessional finance providers.\n\nThis is not a temporary supply chain constraint but a structural mismatch between industrial policy objectives and climate finance architecture. Resolution requires either regulatory adjustment to TKDN thresholds or a significant increase in domestic manufacturing investment that would take several years to materialize.',
          keyObservation: 'The TKDN–JETP cost conflict is structurally unresolvable at current domestic manufacturing capacity levels without regulatory adjustment.',
        },
        {
          slug: 'grid-interconnection-eastern-indonesia',
          title: 'Grid Interconnection Timelines Continue to Exceed Project Development Schedules',
          subtitle: 'Generation readiness in eastern Indonesia runs ahead of offtake capacity.',
          publishedAt: '2025-06-18',
          body: 'Grid interconnection timelines in eastern Indonesia continued to exceed project development schedules, creating a mismatch between generation readiness and offtake capacity. Projects that achieve technical readiness face delays of twelve to twenty-four months for grid connection, during which time project economics deteriorate and financing commitments may lapse.\n\nLand acquisition for utility-scale solar projects in Java encountered continued procedural delays related to spatial planning coordination between provincial and national authorities. These delays are not primarily technical but procedural, reflecting the fragmented nature of land-use governance in Indonesia.',
          keyObservation: 'Grid interconnection insufficiency in eastern Indonesia represents a physical constraint that policy instruments alone cannot resolve in the near term.',
        },
      ],
      directionalAssessment: [
        {
          slug: 'q2-2025-directional-assessment',
          title: 'Quarterly Assessment: Fragmenting',
          subtitle: 'Progress in one subsector, regression in another, and institutional ambiguity across the coordination layer.',
          publishedAt: '2025-07-15',
          body: 'The transition trajectory shifted from stalling to fragmenting during this quarter. Geothermal development showed genuine forward movement through ESDM\'s pricing framework revision, representing the most concrete policy action observed in the tracker\'s coverage period.\n\nHowever, solar procurement — the sector with the largest theoretical capacity addition potential — moved backward in practical terms due to the TKDN conflict with international project finance assumptions. The institutional landscape became more complex with Danantara\'s entry as an undefined actor, and the absence of RUPTL clarity continued to prevent PLN from committing to the procurement volumes that would unlock private capital at scale.\n\nThe overall reading is fragmenting: progress in one subsector, regression in another, and institutional ambiguity across the coordination layer.',
          keyObservation: 'Fragmenting describes a condition where subsector trajectories diverge — geothermal advances while solar regresses — making aggregate transition metrics misleading.',
        },
      ],
      strategicImplication: [
        {
          slug: 'q2-2025-strategic-implication',
          title: 'Sector-Specific Positioning Required',
          subtitle: 'Broad energy transition exposure is no longer a rational allocation posture.',
          publishedAt: '2025-07-15',
          body: 'Capital allocators face a widening gap between geothermal bankability and solar procurement gridlock, requiring sector-specific positioning rather than broad energy transition exposure. Geothermal assets with ESDM-compliant pricing structures represent the most actionable near-term opportunity, while solar positions should be deferred until TKDN resolution provides cost clarity.\n\nInstitutional investors with sovereign guarantee access retain a structural advantage that is unlikely to diminish in the near term.\n\nThe unresolved Danantara mandate creates optionality risk for state-owned enterprise partnerships that should be monitored but not yet priced into allocation decisions.',
          keyObservation: 'Sector-specific positioning — not broad energy transition exposure — is the only rational allocation posture in a fragmenting environment.',
        },
      ],
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
      policyMovement: [
        {
          slug: 'ruptl-update-absent',
          title: 'RUPTL Update Remains Unreleased, Extending Planning Vacuum',
          subtitle: 'PLN cannot issue new procurement signals for renewable capacity without the updated electricity supply plan.',
          publishedAt: '2025-03-15',
          body: 'The Ministry of Energy and Mineral Resources did not release the long-anticipated RUPTL update during the quarter, extending the planning vacuum that has constrained PLN\'s ability to issue new procurement signals for renewable capacity.\n\nThe RUPTL serves as the legal basis for PLN\'s procurement pipeline. Without it, the utility cannot commit to new capacity additions regardless of available financing or developer readiness. This single document remains the most consequential bottleneck in Indonesia\'s energy transition architecture.',
          keyObservation: 'The RUPTL\'s continued absence means PLN cannot legally commit to new renewable capacity procurement at scale, regardless of political signaling.',
        },
        {
          slug: 'jetp-plan-no-instruments',
          title: 'JETP Investment Plan Endorsed But Lacks Operational Instruments',
          subtitle: 'Political endorsement has not translated into procurement mechanisms or disbursement schedules.',
          publishedAt: '2025-02-20',
          body: 'JETP\'s investment and policy plan, while formally endorsed at the political level, did not translate into operational procurement instruments or disbursement schedules during the quarter.\n\nThe gap between political endorsement and operational readiness remains wide. The plan identifies priority sectors and indicative capital requirements but does not specify the procurement mechanisms through which capital would flow to specific projects.',
          keyObservation: 'Political endorsement without operational instruments produces announcements, not capital deployment.',
        },
        {
          slug: 'ojk-taxonomy-draft',
          title: 'OJK Circulates Sustainable Finance Taxonomy for Consultation',
          subtitle: 'The draft does not yet carry regulatory force for financial institution lending practices.',
          publishedAt: '2025-03-01',
          body: 'OJK circulated a draft sustainable finance taxonomy for stakeholder consultation, but the document has not been formally adopted and does not yet carry regulatory force for financial institution lending practices.\n\nThe taxonomy, once adopted, would provide financial institutions with a formal framework for classifying transition-aligned lending. Its current draft status means that banks continue to operate without a regulatory signal distinguishing between transition-aligned and transition-adverse credit allocation.',
          keyObservation: 'OJK\'s taxonomy in draft form signals direction but creates no binding obligation for financial institution behavior.',
        },
      ],
      capitalSignal: [
        {
          slug: 'dfi-engagement-no-new-facilities',
          title: 'Development Finance Institutions Maintain Engagement Without New Facilities',
          subtitle: 'ADB and World Bank continue programmatic planning but have not operationalized new concessional windows.',
          publishedAt: '2025-02-15',
          body: 'International development finance institutions including ADB and the World Bank maintained programmatic engagement with Indonesian energy transition planning, but no new concessional facilities were operationalized during the quarter.\n\nThis pattern — continued engagement without capital deployment — reflects the structural dependency on domestic regulatory readiness that international capital cannot bypass. DFIs are positioned to deploy but await the procurement framework clarity that only domestic policy action can provide.',
          keyObservation: 'International development capital is positioned but structurally blocked by the absence of domestic procurement instruments.',
        },
        {
          slug: 'pln-balance-sheet-q1',
          title: 'PLN Balance Sheet Remains the Binding Constraint on Project Finance',
          subtitle: 'Several project developers cite sovereign guarantee dependency as the obstacle to financial close.',
          publishedAt: '2025-03-10',
          body: 'PLN\'s balance sheet position continued to limit its capacity to enter new long-term power purchase agreements without sovereign guarantee structures, a constraint that several project developers cited as the binding obstacle to financial close on renewable energy projects.\n\nPertamina\'s upstream capital expenditure allocation showed no material rebalancing toward renewable or low-carbon energy segments. Private capital activity in Indonesian renewable energy remained concentrated in small-scale distributed generation, with utility-scale project development effectively paused pending RUPTL clarity.',
          keyObservation: 'PLN\'s balance sheet constraint — not policy intent — is the binding obstacle to financial close on renewable energy projects.',
        },
      ],
      institutionalIncentiveShift: [
        {
          slug: 'jetp-secretariat-staffing',
          title: 'JETP Secretariat Initiates Staffing But Lacks Operational Capacity',
          subtitle: 'The secretariat cannot yet process project proposals or disburse funds.',
          publishedAt: '2025-02-28',
          body: 'The JETP secretariat initiated organizational staffing but did not achieve the operational capacity required to begin processing project proposals or disbursing funds during the quarter.\n\nThe gap between institutional existence and operational readiness means that the largest dedicated transition finance mechanism available to Indonesia cannot yet deploy capital. Staffing timelines suggest that operational capacity may not be achieved before the second half of the year at the earliest.',
          keyObservation: 'The JETP secretariat exists institutionally but does not yet function operationally — Indonesia\'s largest transition finance mechanism cannot deploy capital.',
        },
        {
          slug: 'bkpm-licensing-q1',
          title: 'BKPM Approves Investment Licenses Without Fossil-Renewable Differentiation',
          subtitle: 'The investment facilitation layer has not incorporated transition-aligned screening criteria.',
          publishedAt: '2025-03-05',
          body: 'BKPM continued to approve investment licenses across the energy sector without differentiation between fossil and renewable projects, indicating that the investment facilitation layer has not yet incorporated transition-aligned screening criteria.\n\nPLN\'s institutional incentive structure remained oriented toward system reliability and cost management rather than capacity addition, reflecting the utility\'s constrained balance sheet and the absence of regulatory direction to prioritize renewable procurement. No changes were observed in the fiscal incentive framework for renewable energy investment.',
          keyObservation: 'BKPM\'s undifferentiated investment licensing reveals that the facilitation layer operates without transition-aligned screening criteria.',
        },
      ],
      executionFriction: [
        {
          slug: 'grid-interconnection-q1',
          title: 'Grid Interconnection Capacity Insufficient in High-Potential Renewable Zones',
          subtitle: 'Sulawesi and Nusa Tenggara cannot absorb projected generation volumes.',
          publishedAt: '2025-03-12',
          body: 'Grid interconnection capacity in high-potential renewable energy zones, particularly in Sulawesi and Nusa Tenggara, remained insufficient to absorb the generation volumes projected in proposed project pipelines.\n\nLand acquisition for utility-scale projects continued to encounter procedural delays related to spatial planning coordination, environmental impact assessment timelines, and local government permitting requirements. PLN\'s technical standards for grid-connected renewable generation have not been updated to reflect current technology capabilities, creating compliance uncertainty for project developers.',
          keyObservation: 'Grid interconnection insufficiency in eastern Indonesia represents a physical constraint that policy instruments alone cannot resolve in the near term.',
        },
        {
          slug: 'domestic-supply-chain-underdeveloped',
          title: 'Domestic Renewable Energy Supply Chain Remains Underdeveloped',
          subtitle: 'Installation volumes implied by national targets far exceed current manufacturing and logistics capacity.',
          publishedAt: '2025-03-18',
          body: 'The domestic supply chain for renewable energy equipment remained underdeveloped relative to the installation volumes implied by stated national targets. This gap between ambition and industrial capacity creates a structural dependency on imports that conflicts with TKDN local content requirements.\n\nThe tension between deployment speed and industrial development objectives has not been formally addressed in policy, leaving project developers to navigate conflicting mandates without clear regulatory guidance.',
          keyObservation: 'The gap between deployment ambition and domestic industrial capacity creates a structural conflict that current policy does not acknowledge or resolve.',
        },
      ],
      directionalAssessment: [
        {
          slug: 'q1-2025-directional-assessment',
          title: 'Quarterly Assessment: Stalling',
          subtitle: 'Institutional architecture is being assembled, but no instrument has reached the operational threshold required to produce observable outcomes.',
          publishedAt: '2025-04-14',
          body: 'Indonesia\'s energy transition entered a stalling phase during the first quarter of this tracker\'s coverage. The foundational planning instrument — the RUPTL — remained unreleased, which structurally prevents PLN from committing to new renewable capacity procurement at scale.\n\nThe JETP secretariat exists institutionally but does not yet function operationally, meaning that the largest dedicated transition finance mechanism available to Indonesia cannot yet deploy capital. OJK\'s taxonomy draft represents a directionally positive signal but carries no regulatory weight in its current form.\n\nThe overall reading is stalling: institutional architecture is being assembled, but no instrument has reached the operational threshold required to produce observable transition outcomes.',
          keyObservation: 'Stalling describes a condition where institutional architecture exists but no instrument has crossed the operational threshold required to produce observable outcomes.',
        },
      ],
      strategicImplication: [
        {
          slug: 'q1-2025-strategic-implication',
          title: 'Treat Indonesia as a Pre-Procurement Environment',
          subtitle: 'Avoid positioning based on policy announcements that lack operational instruments.',
          publishedAt: '2025-04-14',
          body: 'The absence of an updated RUPTL and the procedural incompleteness of the JETP secretariat mean that no new large-scale renewable procurement is structurally possible in the near term, regardless of stated policy ambition.\n\nCapital allocators should treat Indonesia\'s energy transition as a pre-procurement environment and avoid positioning based on policy announcements that lack operational instruments. The most productive near-term engagement for institutional investors is monitoring the RUPTL timeline and JETP secretariat operational capacity as leading indicators of actual procurement opportunity.\n\nEarly-stage project development activity should focus on geothermal and small-scale distributed solar, where existing regulatory frameworks — however imperfect — permit project advancement without dependence on unreleased planning instruments.',
          keyObservation: 'Indonesia\'s energy transition should be treated as a pre-procurement environment until the RUPTL update and JETP operationalization cross observable thresholds.',
        },
      ],
    },
    activeThreads: [
      'PLN Balance Sheet Thread',
      'JETP Disbursement Thread',
    ],
    openQuestion:
      'The question this tracker will evaluate in Q2 2025 is whether the RUPTL update materializes and whether the JETP secretariat achieves operational capacity sufficient to begin processing project proposals.',
  },
];
