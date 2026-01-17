import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, FileText, BookOpen, Scale, Clock } from 'lucide-react';

interface ArchiveItem {
  id: string;
  title: string;
  type: 'explainer' | 'document' | 'concept' | 'case';
  period?: string;
  linkedEssays: string[];
  summary: string;
}

const ARCHIVE_ITEMS: ArchiveItem[] = [
  {
    id: 'new-order-settlement',
    title: 'The New Order Political Settlement (1966-1998)',
    type: 'explainer',
    period: '1966-1998',
    linkedEssays: ['post-1965-settlement', 'technocracy-limits'],
    summary: 'The institutional architecture that exchanged political demobilization for economic stability, establishing property rights frameworks that persist through reformasi.',
  },
  {
    id: 'berkeley-mafia',
    title: 'The Berkeley Mafia and Technocratic Governance',
    type: 'explainer',
    period: '1966-1998',
    linkedEssays: ['technocracy-limits'],
    summary: 'US-trained economists who shaped Indonesian development policy, institutionalizing IMF-World Bank orthodoxy while serving New Order political consolidation.',
  },
  {
    id: 'omnibus-law-2020',
    title: 'Omnibus Law on Job Creation (UU 11/2020)',
    type: 'document',
    period: '2020',
    linkedEssays: ['wage-suppression', 'technocracy-limits'],
    summary: 'Annotated analysis of the 1,187-page law that restructured labor, environment, and business regulation under the rubric of "ease of doing business."',
  },
  {
    id: 'pertamina-governance',
    title: 'Pertamina Governance Structure',
    type: 'document',
    period: '1968-present',
    linkedEssays: ['pertamina-rentier'],
    summary: 'Organizational analysis of Indonesia\'s state oil company as a parallel fiscal system with off-budget revenue flows and political patronage functions.',
  },
  {
    id: 'concept-rentier-state',
    title: 'Concept: Rentier State',
    type: 'concept',
    linkedEssays: ['pertamina-rentier', 'post-1965-settlement'],
    summary: 'A state deriving substantial revenue from external rents (natural resources, strategic location) rather than taxation, with implications for accountability and state-society relations.',
  },
  {
    id: 'concept-policy-capture',
    title: 'Concept: Policy Capture',
    type: 'concept',
    linkedEssays: ['oligarch-governance', 'fiscal-myth'],
    summary: 'The process by which narrow interests shape policy design and implementation to serve their ends, often while maintaining formal appearances of public benefit.',
  },
  {
    id: 'concept-tax-incidence',
    title: 'Concept: Tax Incidence',
    type: 'concept',
    linkedEssays: ['fiscal-myth'],
    summary: 'The analysis of who actually bears the economic burden of a tax, regardless of who legally pays it. Essential for understanding regressive/progressive dynamics.',
  },
  {
    id: 'case-fuel-subsidy-2014',
    title: 'Case: 2014 Fuel Subsidy Reform',
    type: 'case',
    period: '2014',
    linkedEssays: ['fiscal-myth', 'pertamina-rentier'],
    summary: 'Analysis of the Jokowi administration\'s fuel subsidy reduction and compensatory social spending, examining distributional outcomes versus stated intentions.',
  },
  {
    id: 'case-minimum-wage-jakarta',
    title: 'Case: Jakarta Minimum Wage Politics',
    type: 'case',
    period: '2012-2023',
    linkedEssays: ['wage-suppression'],
    summary: 'Longitudinal analysis of minimum wage determination in Jakarta, tracking the interaction between labor mobilization, employer lobbying, and state mediation.',
  },
  {
    id: 'case-carbon-market-pilot',
    title: 'Case: Indonesia Carbon Market Pilot',
    type: 'case',
    period: '2023-present',
    linkedEssays: ['carbon-colonialism'],
    summary: 'Early analysis of Indonesia\'s carbon trading scheme, examining who captures value, who bears costs, and how forest-dependent communities are positioned.',
  },
];

const TYPE_CONFIG = {
  explainer: { label: 'Historical Explainer', icon: Clock, color: 'border-blue-900 text-blue-900' },
  document: { label: 'Policy Document', icon: FileText, color: 'border-stone-700 text-stone-700' },
  concept: { label: 'Key Concept', icon: BookOpen, color: 'border-green-900 text-green-900' },
  case: { label: 'Case Study', icon: Scale, color: 'border-red-900 text-red-900' },
};

export function ArchiveSection() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredItems = selectedType
    ? ARCHIVE_ITEMS.filter((item) => item.type === selectedType)
    : ARCHIVE_ITEMS;

  const typeCounts = {
    explainer: ARCHIVE_ITEMS.filter((i) => i.type === 'explainer').length,
    document: ARCHIVE_ITEMS.filter((i) => i.type === 'document').length,
    concept: ARCHIVE_ITEMS.filter((i) => i.type === 'concept').length,
    case: ARCHIVE_ITEMS.filter((i) => i.type === 'case').length,
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Type Navigation */}
      <div className="col-span-12 lg:col-span-3">
        <div className="border-2 border-stone-900 bg-white sticky top-4">
          <div className="border-b-2 border-stone-900 px-4 py-3 bg-stone-100">
            <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
              Archive Types
            </span>
          </div>
          <div className="divide-y-2 divide-stone-200">
            <button
              onClick={() => setSelectedType(null)}
              className={`w-full text-left px-4 py-3 font-mono text-sm hover:bg-stone-50 transition-colors flex items-center justify-between ${
                selectedType === null ? 'bg-stone-900 text-stone-50' : ''
              }`}
            >
              <span>All Items</span>
              <span className="text-xs">{ARCHIVE_ITEMS.length}</span>
            </button>
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`w-full text-left px-4 py-3 font-mono text-sm hover:bg-stone-50 transition-colors flex items-center justify-between ${
                    selectedType === type ? 'bg-stone-900 text-stone-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </span>
                  <span className="text-xs">{typeCounts[type as keyof typeof typeCounts]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Archive Purpose */}
        <div className="border-2 border-stone-900 bg-stone-100 mt-6 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-stone-600 mb-2">
            Archive Purpose
          </div>
          <p className="font-mono text-xs text-stone-600 leading-relaxed">
            This is not a reading list. This is a reference archive tied to arguments and simulations. 
            Each entry grounds essays and tools historically, providing operational context for analysis.
          </p>
        </div>
      </div>

      {/* Archive Items */}
      <div className="col-span-12 lg:col-span-9">
        <div className="border-2 border-stone-900 bg-white">
          <div className="border-b-2 border-stone-900 px-4 py-3 bg-stone-100 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
              {selectedType ? TYPE_CONFIG[selectedType as keyof typeof TYPE_CONFIG].label : 'All Archive Items'}
            </span>
            <span className="font-mono text-xs text-stone-500">
              {filteredItems.length} entries
            </span>
          </div>

          <div className="divide-y-2 divide-stone-200">
            {filteredItems.map((item) => {
              const config = TYPE_CONFIG[item.type];
              const Icon = config.icon;

              return (
                <article key={item.id} className="p-6 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs uppercase rounded-none ${config.color}`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {item.period && (
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs rounded-none"
                          >
                            {item.period}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-mono text-lg font-bold text-stone-900 mb-2">
                        {item.title}
                      </h3>

                      <p className="font-mono text-sm text-stone-600 mb-4 leading-relaxed">
                        {item.summary}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-500 uppercase">
                          Linked Essays:
                        </span>
                        {item.linkedEssays.map((essayId) => (
                          <Badge
                            key={essayId}
                            variant="outline"
                            className="font-mono text-xs rounded-none border-stone-400 text-stone-600"
                          >
                            {essayId}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <button className="p-2 border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="border-2 border-stone-900 bg-white mt-6">
          <div className="border-b-2 border-stone-900 px-4 py-3 bg-stone-100">
            <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
              Historical Timeline
            </span>
          </div>
          <div className="p-6">
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-stone-900"></div>
              
              <div className="space-y-6 pl-8">
                <div className="relative">
                  <div className="absolute -left-8 top-1 w-4 h-4 bg-stone-900 rounded-full"></div>
                  <div className="font-mono text-xs text-stone-500">1965-1966</div>
                  <div className="font-mono text-sm font-bold">Mass Violence & New Order Establishment</div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-8 top-1 w-4 h-4 bg-stone-900 rounded-full"></div>
                  <div className="font-mono text-xs text-stone-500">1966-1998</div>
                  <div className="font-mono text-sm font-bold">Technocratic Development & Authoritarian Rule</div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-8 top-1 w-4 h-4 bg-stone-900 rounded-full"></div>
                  <div className="font-mono text-xs text-stone-500">1997-1998</div>
                  <div className="font-mono text-sm font-bold">Asian Financial Crisis & Reformasi</div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-8 top-1 w-4 h-4 bg-stone-900 rounded-full"></div>
                  <div className="font-mono text-xs text-stone-500">1999-2014</div>
                  <div className="font-mono text-sm font-bold">Democratic Consolidation & Decentralization</div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-8 top-1 w-4 h-4 bg-red-900 rounded-full"></div>
                  <div className="font-mono text-xs text-red-900">2014-present</div>
                  <div className="font-mono text-sm font-bold">Infrastructure Push & Democratic Backsliding</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
