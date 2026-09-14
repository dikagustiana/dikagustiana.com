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

/**
 * What a quarterly label is, and what it is not.
 *
 * Three of these words describe DIRECTION and one describes DIVERGENCE, so
 * they are not four positions on one dial and a quarter can carry more than
 * one of them at once. The label names the condition the author judged
 * DOMINANT across the instruments this tracker actually read that quarter —
 * not a measurement of the Indonesian energy transition as a whole, and not a
 * count of anything. `covers` says what was in the field of view; `excludes`
 * says what the label is not entitled to claim.
 */
export interface ReadingMeta {
  label: DirectionalReading;
  means: string;
  excludes: string;
}

export const READING_META: Record<DirectionalReading, ReadingMeta> = {
  Advancing: {
    label: 'Advancing',
    means: 'Instruments read this quarter moved toward the operational threshold that lets capital be committed.',
    excludes: 'It does not claim that deployment, emissions or capacity actually changed.',
  },
  Stalling: {
    label: 'Stalling',
    means: 'Institutional architecture exists but no instrument read this quarter crossed the threshold at which it produces an observable outcome.',
    excludes: 'It does not claim that nothing happened, nor that the direction has reversed.',
  },
  Fragmenting: {
    label: 'Fragmenting',
    means: 'Subsector trajectories read this quarter diverged \u2014 at least one advancing while at least one regressed \u2014 so an aggregate reading would average away the thing that matters.',
    excludes: 'Divergence is not a direction. It says nothing about whether the transition as a whole moved forward or back, and it is not exclusive of advance or regression within a subsector.',
  },
  Regressing: {
    label: 'Regressing',
    means: 'Instruments read this quarter moved away from the operational threshold, or a commitment already made was withdrawn.',
    excludes: 'It does not claim that every subsector moved back.',
  },
};

/**
 * Whether the tracker is still being written.
 *
 * A quarterly cadence is a promise, and an interface that keeps saying
 * “latest issue” while the newest issue is over a year old makes the promise
 * on the author’s behalf. This says the true thing instead. `paused` is the
 * default whenever no sourced continuation exists — it is not a commitment to
 * resume.
 */
export const TRACKER_COVERAGE = {
  state: 'paused' as 'active' | 'paused',
  /** The last quarter with a published issue. */
  coverageEndsWith: 'Q2 2025',
  /** The period the whole archive covers. */
  coversFrom: 'January 2025',
  /** When the most recent SUBSTANTIVE change to the tracker's content was made. */
  lastSubstantiveUpdate: '2026-09-14',
  lastSubstantiveUpdateNote:
    'Two chronology corrections were issued against the 2025 issues. No new quarter was added.',
  note:
    'This archive is paused, not current. It covers January\u2013June 2025 and stops there; Q3 2025 onward was never written. The open questions each issue ends on are the questions it was asking at the time, and they are still open here \u2014 nothing below has been updated to reflect what happened after its coverage period.',
} as const;

/**
 * Where a claim's support stands. The tracker asserts things about the world,
 * so every entry has to say what backs it — and a claim nobody has checked is
 * NOT the same as a claim that has been checked and failed.
 *
 *   verified      a named primary source supports the claim as stated
 *   contradicted  a named primary source contradicts it; a correction is filed
 *   unsupported   no source has been produced for it either way
 *   observation   the author's own reading of market or institutional behaviour,
 *                 which no single document can verify
 */
export type EvidenceStatus = 'verified' | 'contradicted' | 'unsupported' | 'observation';

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  verified: 'Source-checked',
  contradicted: 'Corrected',
  unsupported: 'No source cited',
  observation: 'Author observation',
};

export const EVIDENCE_MEANS: Record<EvidenceStatus, string> = {
  verified: 'A named primary source, listed below, supports this entry as written.',
  contradicted: 'A primary source contradicts part of this entry. The correction is above; the original text is kept as published.',
  unsupported: 'No primary source has been produced for the specific claims in this entry. Read it as the author\u2019s reading, not as a documented fact.',
  observation: 'This is the author\u2019s reading of how institutions and capital behaved, not a claim any single document can settle.',
};

/** A primary source, with the date it was published and the date of what it records. */
export interface Source {
  label: string;
  url: string;
  /** When the source itself was published. */
  publishedAt: string;
  /** What the source actually establishes — never more than that. */
  supports: string;
}

/**
 * A dated, visible correction.
 *
 * The entry body is never rewritten: it stays exactly as published, because a
 * tracker whose history quietly changes is worth less than one that is wrong
 * in public and says so. A correction is issued on the date it is issued, and
 * it says three things — what was claimed, what is actually the case, and
 * what that does to the conclusion the claim carried.
 */
export interface Correction {
  /** The date this correction was issued. Never the date of the original entry. */
  issuedAt: string;
  /** The original claim, quoted or fairly paraphrased. */
  claim: string;
  /** The corrected fact. */
  correction: string;
  /** What the correction does to the conclusion — including where it leaves it standing. */
  effect: string;
  sources: Source[];
}

export interface TrackerEntry {
  slug: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  body: string;
  keyObservation: string;
  /** Where this entry's claims stand. Omitted means `unsupported`. */
  evidence?: EvidenceStatus;
  sources?: Source[];
  corrections?: Correction[];
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
  /**
   * What the quarterly label was read FROM — the instruments and subsectors
   * actually in view. A label without this is a verdict with no stated scope.
   */
  readingBasis?: string;
  /** Corrections that bear on the issue as a whole rather than on one entry. */
  corrections?: Correction[];
}

/* ── The primary sources the corrections below rest on ───────────────────── */

const SRC_RUPTL: Source = {
  label: 'Kementerian ESDM \u2014 \u201cKementerian ESDM Resmi Merilis Dokumen RUPTL PLN 2025\u20132034\u201d',
  url: 'https://esdm.go.id/id/media-center/arsip-berita/kementerian-esdm-resmi-merilis-dokumen-ruptl-pln-2025-2034',
  publishedAt: '2025-06-03',
  supports:
    'The Minister of Energy and Mineral Resources announced and ratified RUPTL PLN 2025\u20132034 on Monday 26 May 2025; the ministry published the document on 3 June 2025. It establishes the plan\u2019s existence and its dates \u2014 nothing about procurement, financing or delivery under it.',
};

const SRC_TKBI: Source = {
  label: 'OJK Keuangan Berkelanjutan \u2014 Taksonomi untuk Keuangan Berkelanjutan Indonesia (TKBI) edisi kedua',
  url: 'https://keuanganberkelanjutan.ojk.go.id/keuanganberkelanjutan/ArticleList/View/1776',
  publishedAt: '2025-02-24',
  supports:
    'TKBI version 2 was introduced on 11 February 2025 at the Pertemuan Tahunan Industri Jasa Keuangan and disseminated on 24 February 2025, extending version 1 (February 2024) beyond energy into construction and real estate, transport and storage, and part of agriculture and forestry. It establishes publication and scope \u2014 not that any bank is obliged to lend against it.',
};

const SRC_OJK_PTIJK: Source = {
  label: 'OJK \u2014 Siaran Pers, Pertemuan Tahunan Industri Jasa Keuangan 2025',
  url: 'https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/Pertemuan-Tahunan-Industri-Jasa-Keuangan-2025.aspx',
  publishedAt: '2025-02-11',
  supports: 'The annual financial-services industry meeting at which TKBI\u2019s second edition was introduced, on 11 February 2025.',
};

export const trackerIssues: TrackerIssue[] = [
  {
    slug: 'q2-2025',
    label: 'Q2 2025',
    periodCovered: 'April–June 2025',
    publishedAt: '2025-07-15',
    directionalReading: 'Fragmenting',
    previousReading: 'Stalling',
    strategicImplicationPreview:
      'Within Indonesian energy-transition exposure, geothermal and solar diverged this quarter on bankability, so a single sector-blind position would have averaged across two different problems. That is a statement about sector selection inside this asset class — not about whether to hold it.',
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
          evidence: 'contradicted',
          sources: [SRC_RUPTL],
          corrections: [
            {
              issuedAt: '2026-09-14',
              claim:
                'That as of 15 June 2025 \u201cno material progress was observed on the long-awaited RUPTL update\u201d, and that the RUPTL delay was therefore still the single binding constraint on PLN\u2019s renewable procurement pipeline.',
              correction:
                'RUPTL PLN 2025\u20132034 had already been announced and ratified by the Minister of Energy and Mineral Resources on 26 May 2025, and the ministry published the document on 3 June 2025 \u2014 both before this entry\u2019s date. There was no outstanding RUPTL delay on 15 June 2025.',
              effect:
                'The premise fails, so the conclusion built on it does not stand as written: the planning vacuum this entry treats as the binding constraint had closed. What the correction does NOT establish is that PLN\u2019s procurement pipeline opened. Approval of a plan is not procurement, financing or construction, and the obstacles this issue documents elsewhere \u2014 PLN\u2019s balance sheet, sovereign guarantee dependency, TKDN cost conflict, grid interconnection timelines \u2014 are untouched by it. The honest revision is narrower than the original claim, not its opposite: after 26 May 2025 the question stops being whether a plan exists and becomes what is procured under it, which this archive never went on to answer.',
              sources: [SRC_RUPTL],
            },
          ],
        },
        {
          slug: 'tkdn-threshold-solar-circular',
          title: 'Ministry Reinforces TKDN Thresholds for Solar Photovoltaic Procurement',
          subtitle: 'The circular creates tension with cost assumptions in internationally financed project proposals.',
          publishedAt: '2025-06-20',
          body: 'The Ministry issued a circular reinforcing TKDN thresholds for solar photovoltaic procurement, maintaining the existing local content requirement at levels that several industry participants described as incompatible with competitive project economics.\n\nThe circular effectively reaffirms Indonesia\'s industrial policy position that renewable energy deployment must serve domestic manufacturing development objectives alongside decarbonization targets. This dual mandate creates a structural tension that project developers working with international concessional finance must navigate.',
          keyObservation: 'TKDN enforcement at current levels functions as an effective capital barrier to international solar financing structures.',
          evidence: 'unsupported',
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
          evidence: 'observation',
        },
        {
          slug: 'private-equity-solar-muted',
          title: 'Private Equity Interest in Distributed Solar Remains Muted',
          subtitle: 'Fund managers cite TKDN compliance costs as a dealbreaker at current panel price levels.',
          publishedAt: '2025-06-01',
          body: 'Private equity interest in distributed solar remained muted throughout the quarter, with several fund managers citing TKDN compliance costs as a dealbreaker at current panel price levels.\n\nThe gap between internationally available module pricing and TKDN-compliant domestic pricing has widened as global solar panel costs continue to decline while Indonesian manufacturing costs remain structurally higher. This dynamic creates a growing penalty for projects that must comply with local content requirements.',
          keyObservation: 'TKDN compliance costs are now functioning as a de facto capital allocation filter against smaller-ticket solar structures.',
          evidence: 'observation',
        },
        {
          slug: 'pln-balance-sheet-ppa-constraint',
          title: 'PLN Balance Sheet Continues to Constrain Long-Term PPA Capacity',
          subtitle: 'Without sovereign guarantee structures, the pipeline of bankable projects available to international capital remains limited.',
          publishedAt: '2025-06-10',
          body: 'PLN\'s balance sheet continued to constrain its ability to enter new long-term power purchase agreements without sovereign guarantee structures, a condition that limits the pipeline of bankable projects available to international capital.\n\nThe utility\'s debt-to-equity ratio and existing long-term obligations create a structural ceiling on new PPA commitments. Project developers have increasingly indicated that PLN creditworthiness, rather than regulatory or pricing considerations, is the binding constraint on bringing new renewable capacity to financial close.\n\nSovereign guarantee dependency is now structurally embedded in PLN\'s procurement model and will not resolve without explicit fiscal intervention or a fundamental restructuring of the utility\'s balance sheet.',
          keyObservation: 'Sovereign guarantee dependency is structurally embedded in PLN\'s procurement model and will not resolve without explicit fiscal intervention.',
          evidence: 'observation',
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
          evidence: 'unsupported',
        },
        {
          slug: 'bkpm-licensing-undifferentiated',
          title: 'BKPM Investment Licensing Remains Undifferentiated Between Fossil and Renewable',
          subtitle: 'The investment facilitation layer operates without transition-aligned screening criteria.',
          publishedAt: '2025-06-05',
          body: 'BKPM continued to process investment licenses for coal-adjacent industrial facilities in parallel with renewable energy approvals, reflecting an incentive structure that has not yet been recalibrated toward transition objectives.\n\nThe absence of differentiated treatment in the investment licensing process means that Indonesia\'s formal investment gateway does not currently distinguish between transition-aligned and transition-adverse capital inflows. This structural neutrality at the facilitation layer undermines the directional signal that other policy instruments attempt to create.',
          keyObservation: 'BKPM\'s undifferentiated licensing reveals that Indonesia\'s investment facilitation layer has not incorporated transition-aligned screening.',
          evidence: 'unsupported',
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
          evidence: 'observation',
        },
        {
          slug: 'grid-interconnection-eastern-indonesia',
          title: 'Grid Interconnection Timelines Continue to Exceed Project Development Schedules',
          subtitle: 'Generation readiness in eastern Indonesia runs ahead of offtake capacity.',
          publishedAt: '2025-06-18',
          body: 'Grid interconnection timelines in eastern Indonesia continued to exceed project development schedules, creating a mismatch between generation readiness and offtake capacity. Projects that achieve technical readiness face delays of twelve to twenty-four months for grid connection, during which time project economics deteriorate and financing commitments may lapse.\n\nLand acquisition for utility-scale solar projects in Java encountered continued procedural delays related to spatial planning coordination between provincial and national authorities. These delays are not primarily technical but procedural, reflecting the fragmented nature of land-use governance in Indonesia.',
          keyObservation: 'Grid interconnection insufficiency in eastern Indonesia represents a physical constraint that policy instruments alone cannot resolve in the near term.',
          evidence: 'unsupported',
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
          evidence: 'observation',
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
          evidence: 'observation',
          corrections: [
            {
              issuedAt: '2026-09-14',
              claim:
                'That sector-specific positioning was the only rational allocation posture, that solar positions should be deferred, and that geothermal represented the most actionable near-term opportunity.',
              correction:
                'The analysis behind these sentences compared two subsectors on one dimension \u2014 how close each was to a bankable procurement decision. It examined no purchase price, no holding period, no mandate or liability profile, no downside case, and no evidence about what was already reflected in asset prices. A ranking on bankability alone cannot establish what any allocator should do, let alone what is uniquely rational for all of them.',
              effect:
                'Read the narrower claim, which the evidence does support: during Q2 2025 the two subsectors diverged sharply enough on procurement bankability that treating Indonesian energy transition as one exposure would have averaged two unlike problems together. Whether that divergence was worth acting on depends on entry price, horizon, mandate and what the market had already priced \u2014 none of which this tracker assessed. The word \u201conly\u201d is withdrawn.',
              sources: [],
            },
          ],
        },
      ],
    },
    readingBasis:
      'Read from four policy instruments (the ESDM geothermal pricing revision, the TKDN solar circular, the Danantara mandate, BKPM licensing practice), two capital observations (ADB geothermal due diligence, private-equity appetite for distributed solar) and two execution constraints (PLN—s balance sheet, grid interconnection in eastern Indonesia). Fragmenting names the divergence between those readings — geothermal moving while solar did not — and claims nothing about subsectors outside that list, about installed capacity, or about emissions.',
    corrections: [
      {
        issuedAt: '2026-09-14',
        claim:
          'Two of this issue\u2019s framing claims: that the absence of RUPTL clarity continued through Q2 2025 to prevent PLN committing to procurement volumes, and that OJK\u2019s sustainable finance taxonomy continued in draft consultation status without formal adoption.',
        correction:
          'Both are wrong on the dates. RUPTL PLN 2025\u20132034 was ratified on 26 May 2025 and published on 3 June 2025 \u2014 inside this issue\u2019s coverage period, and before the entries that treat it as outstanding. The OJK instrument is TKBI, whose second edition was introduced on 11 February 2025 and disseminated on 24 February 2025; it was published throughout this quarter, not in draft.',
        effect:
          'The Fragmenting reading does not rest on either claim \u2014 it rests on the geothermal/solar divergence, which the corrections do not touch \u2014 so the quarterly label stands. What does not stand is the account of WHY procurement had not moved. Two of the obstacles this issue named had in fact been cleared during the quarter, which means the issue understated how much of the remaining friction sat in balance sheets, guarantees, local-content economics and grid connection rather than in missing paperwork. That is a materially different diagnosis from the one published.',
        sources: [SRC_RUPTL, SRC_TKBI],
      },
    ],
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
          // This entry holds. RUPTL 2025–2034 was ratified on 26 May 2025, which
          // is after the quarter this entry covers — so “not released during
          // January–March 2025” is correct as written. It is listed here as
          // source-checked precisely so that the two corrected entries are not
          // read as a verdict on the archive as a whole.
          evidence: 'verified',
          sources: [SRC_RUPTL],
        },
        {
          slug: 'jetp-plan-no-instruments',
          title: 'JETP Investment Plan Endorsed But Lacks Operational Instruments',
          subtitle: 'Political endorsement has not translated into procurement mechanisms or disbursement schedules.',
          publishedAt: '2025-02-20',
          body: 'JETP\'s investment and policy plan, while formally endorsed at the political level, did not translate into operational procurement instruments or disbursement schedules during the quarter.\n\nThe gap between political endorsement and operational readiness remains wide. The plan identifies priority sectors and indicative capital requirements but does not specify the procurement mechanisms through which capital would flow to specific projects.',
          keyObservation: 'Political endorsement without operational instruments produces announcements, not capital deployment.',
          evidence: 'unsupported',
        },
        {
          slug: 'ojk-taxonomy-draft',
          title: 'OJK Circulates Sustainable Finance Taxonomy for Consultation',
          subtitle: 'The draft does not yet carry regulatory force for financial institution lending practices.',
          publishedAt: '2025-03-01',
          body: 'OJK circulated a draft sustainable finance taxonomy for stakeholder consultation, but the document has not been formally adopted and does not yet carry regulatory force for financial institution lending practices.\n\nThe taxonomy, once adopted, would provide financial institutions with a formal framework for classifying transition-aligned lending. Its current draft status means that banks continue to operate without a regulatory signal distinguishing between transition-aligned and transition-adverse credit allocation.',
          keyObservation: 'OJK\'s taxonomy in draft form signals direction but creates no binding obligation for financial institution behavior.',
          evidence: 'contradicted',
          sources: [SRC_TKBI, SRC_OJK_PTIJK],
          corrections: [
            {
              issuedAt: '2026-09-14',
              claim:
                'That as of 1 March 2025 OJK\u2019s sustainable finance taxonomy was a draft circulating for stakeholder consultation and had \u201cnot been formally adopted\u201d.',
              correction:
                'The instrument this entry describes is the Taksonomi untuk Keuangan Berkelanjutan Indonesia (TKBI). Its second edition was introduced on 11 February 2025 at OJK\u2019s Pertemuan Tahunan Industri Jasa Keuangan and disseminated on 24 February 2025, extending the first edition (February 2024, energy only) into construction and real estate, transport and storage, and part of agriculture and forestry. By 1 March 2025 it was published, not in draft consultation.',
              effect:
                'The chronology fails. The entry\u2019s underlying point survives the correction and is the part worth keeping: a published taxonomy is a classification framework, not a lending obligation. TKBI\u2019s existence does not by itself require any bank to reallocate credit, and this tracker produced no evidence either way on whether bank lending behaviour changed after February 2025. Read the entry as making that narrower claim, on the correct dates.',
              sources: [SRC_TKBI, SRC_OJK_PTIJK],
            },
          ],
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
          evidence: 'observation',
        },
        {
          slug: 'pln-balance-sheet-q1',
          title: 'PLN Balance Sheet Remains the Binding Constraint on Project Finance',
          subtitle: 'Several project developers cite sovereign guarantee dependency as the obstacle to financial close.',
          publishedAt: '2025-03-10',
          body: 'PLN\'s balance sheet position continued to limit its capacity to enter new long-term power purchase agreements without sovereign guarantee structures, a constraint that several project developers cited as the binding obstacle to financial close on renewable energy projects.\n\nPertamina\'s upstream capital expenditure allocation showed no material rebalancing toward renewable or low-carbon energy segments. Private capital activity in Indonesian renewable energy remained concentrated in small-scale distributed generation, with utility-scale project development effectively paused pending RUPTL clarity.',
          keyObservation: 'PLN\'s balance sheet constraint — not policy intent — is the binding obstacle to financial close on renewable energy projects.',
          evidence: 'observation',
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
          evidence: 'unsupported',
        },
        {
          slug: 'bkpm-licensing-q1',
          title: 'BKPM Approves Investment Licenses Without Fossil-Renewable Differentiation',
          subtitle: 'The investment facilitation layer has not incorporated transition-aligned screening criteria.',
          publishedAt: '2025-03-05',
          body: 'BKPM continued to approve investment licenses across the energy sector without differentiation between fossil and renewable projects, indicating that the investment facilitation layer has not yet incorporated transition-aligned screening criteria.\n\nPLN\'s institutional incentive structure remained oriented toward system reliability and cost management rather than capacity addition, reflecting the utility\'s constrained balance sheet and the absence of regulatory direction to prioritize renewable procurement. No changes were observed in the fiscal incentive framework for renewable energy investment.',
          keyObservation: 'BKPM\'s undifferentiated investment licensing reveals that the facilitation layer operates without transition-aligned screening criteria.',
          evidence: 'unsupported',
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
          evidence: 'unsupported',
        },
        {
          slug: 'domestic-supply-chain-underdeveloped',
          title: 'Domestic Renewable Energy Supply Chain Remains Underdeveloped',
          subtitle: 'Installation volumes implied by national targets far exceed current manufacturing and logistics capacity.',
          publishedAt: '2025-03-18',
          body: 'The domestic supply chain for renewable energy equipment remained underdeveloped relative to the installation volumes implied by stated national targets. This gap between ambition and industrial capacity creates a structural dependency on imports that conflicts with TKDN local content requirements.\n\nThe tension between deployment speed and industrial development objectives has not been formally addressed in policy, leaving project developers to navigate conflicting mandates without clear regulatory guidance.',
          keyObservation: 'The gap between deployment ambition and domestic industrial capacity creates a structural conflict that current policy does not acknowledge or resolve.',
          evidence: 'unsupported',
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
          evidence: 'observation',
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
          evidence: 'observation',
        },
      ],
    },
    readingBasis:
      'Read from three policy instruments (the unreleased RUPTL update, the JETP investment plan, the OJK taxonomy), two capital observations (DFI engagement without new facilities, PLN\u2019s balance sheet) and three execution constraints (JETP secretariat capacity, BKPM licensing, grid interconnection and supply chain). Stalling names the condition of those instruments, not of Indonesian energy investment as a whole.',
    corrections: [
      {
        issuedAt: '2026-09-14',
        claim:
          'That OJK\u2019s taxonomy was a draft carrying no regulatory weight in its current form as at the end of Q1 2025 \u2014 a claim this issue\u2019s quarterly assessment repeats.',
        correction:
          'TKBI\u2019s second edition was introduced on 11 February 2025 and disseminated on 24 February 2025. It was a published taxonomy for most of the quarter.',
        effect:
          'The Stalling reading survives, because its load-bearing instrument is the unreleased RUPTL, and that entry is correct: RUPTL 2025\u20132034 was not ratified until 26 May 2025, after this coverage period. But the taxonomy should have been counted as a published instrument that created no lending obligation, rather than as an unfinished one \u2014 a different kind of gap, and a more interesting one.',
        sources: [SRC_TKBI, SRC_RUPTL],
      },
    ],
    activeThreads: [
      'PLN Balance Sheet Thread',
      'JETP Disbursement Thread',
    ],
    openQuestion:
      'The question this tracker will evaluate in Q2 2025 is whether the RUPTL update materializes and whether the JETP secretariat achieves operational capacity sufficient to begin processing project proposals.',
  },
];
