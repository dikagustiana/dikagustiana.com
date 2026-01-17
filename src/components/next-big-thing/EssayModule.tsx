import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ExternalLink, Calculator } from 'lucide-react';

interface Essay {
  id: string;
  title: string;
  thesis: string;
  cluster: string;
  status: 'published' | 'draft' | 'archived';
  linkedTool?: string;
  whatObscures: string;
  whatEnables: string;
}

const ESSAY_CLUSTERS = [
  { id: 'political-economy', label: 'Political Economy', count: 4 },
  { id: 'neoliberalism', label: 'Neoliberalism & Technocracy', count: 3 },
  { id: 'soe-rents', label: 'SOE & Rent Channels', count: 2 },
  { id: 'labor', label: 'Labor & Informality', count: 3 },
  { id: 'energy', label: 'Energy Transition', count: 2 },
  { id: 'fiscal', label: 'Fiscal Policy', count: 3 },
  { id: 'capital-markets', label: 'Capital & Oligarchy', count: 2 },
  { id: 'planning', label: 'Development Planning', count: 2 },
];

const ESSAYS: Essay[] = [
  {
    id: 'post-1965-settlement',
    title: 'The Post-1965 Settlement: Property Rights Without Politics',
    thesis: 'The New Order created a development regime that exchanged political demobilization for economic stability, embedding extraction rights in a depoliticized constitutional framework.',
    cluster: 'political-economy',
    status: 'published',
    linkedTool: 'policy-capture',
    whatObscures: 'The violence required to establish this order and the ongoing exclusions it produces.',
    whatEnables: 'A framework for understanding why "reform" always stops at property rights.',
  },
  {
    id: 'technocracy-limits',
    title: 'The Berkeley Mafia and the Limits of Technical Governance',
    thesis: 'Indonesian technocracy was never neutral - it was a political project that depoliticized distributional conflict by framing it as technical optimization.',
    cluster: 'neoliberalism',
    status: 'published',
    whatObscures: 'That "good policy" is always policy good for someone specific.',
    whatEnables: 'A critique of contemporary technocratic interventions like the Omnibus Law.',
  },
  {
    id: 'pertamina-rentier',
    title: 'Pertamina as Rentier State-Within-State',
    thesis: 'SOEs operate as parallel fiscal systems, channeling rents through off-budget mechanisms that escape democratic accountability while funding political reproduction.',
    cluster: 'soe-rents',
    status: 'published',
    linkedTool: 'soe-dependency',
    whatObscures: 'The actual distribution of energy subsidies and who captures transition rents.',
    whatEnables: 'An audit framework for SOE governance reform.',
  },
  {
    id: 'wage-suppression',
    title: 'The Political Economy of Wage Suppression',
    thesis: 'Low wages are not market outcomes but political constructions maintained through labor law, informalization, and the deliberate fragmentation of worker power.',
    cluster: 'labor',
    status: 'published',
    linkedTool: 'policy-capture',
    whatObscures: 'The coordinated effort required to keep wages low despite productivity gains.',
    whatEnables: 'A framework for analyzing minimum wage politics as class conflict.',
  },
  {
    id: 'carbon-colonialism',
    title: 'Carbon Markets as Colonial Continuation',
    thesis: 'Indonesian carbon markets replicate colonial extraction patterns by commodifying ecosystem services while displacing costs onto forest-dependent communities.',
    cluster: 'energy',
    status: 'published',
    linkedTool: 'carbon-burden',
    whatObscures: 'Who actually bears the cost of "just transition" in practice.',
    whatEnables: 'A distributional analysis of climate policy.',
  },
  {
    id: 'fiscal-myth',
    title: 'The Fiscal Discipline Myth: Austerity as Class Politics',
    thesis: 'Fiscal conservatism in Indonesia serves to limit redistributive capacity while maintaining space for capital-friendly interventions.',
    cluster: 'fiscal',
    status: 'published',
    linkedTool: 'budget-reallocation',
    whatObscures: 'That "fiscal space" is a political choice, not a technical constraint.',
    whatEnables: 'Alternative budget scenarios that reveal suppressed possibilities.',
  },
  {
    id: 'oligarch-governance',
    title: 'Oligarchy and the Limits of Corporate Governance Reform',
    thesis: 'Capital market reforms in Indonesia operate within oligarchic constraints that ensure concentrated ownership persists despite "modernization."',
    cluster: 'capital-markets',
    status: 'draft',
    whatObscures: 'How formal governance improvements coexist with unchanged power structures.',
    whatEnables: 'A framework for analyzing reform capture.',
  },
  {
    id: 'planning-accountability',
    title: 'RPJMN as Depoliticization Machine',
    thesis: 'National development planning transforms political choices into technical targets, foreclosing democratic deliberation over development paths.',
    cluster: 'planning',
    status: 'draft',
    whatObscures: 'The political assumptions embedded in "neutral" planning indicators.',
    whatEnables: 'A method for auditing planning documents for distributional bias.',
  },
];

export function EssayModule() {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const filteredEssays = selectedCluster
    ? ESSAYS.filter((e) => e.cluster === selectedCluster)
    : ESSAYS;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Cluster Navigation */}
      <div className="col-span-12 lg:col-span-3">
        <div className="border-2 border-stone-900 bg-white sticky top-4">
          <div className="border-b-2 border-stone-900 px-4 py-3 bg-stone-100">
            <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
              Essay Clusters
            </span>
          </div>
          <div className="divide-y-2 divide-stone-200">
            <button
              onClick={() => setSelectedCluster(null)}
              className={`w-full text-left px-4 py-3 font-mono text-sm hover:bg-stone-50 transition-colors flex items-center justify-between ${
                selectedCluster === null ? 'bg-stone-900 text-stone-50' : ''
              }`}
            >
              <span>All Essays</span>
              <span className="text-xs">{ESSAYS.length}</span>
            </button>
            {ESSAY_CLUSTERS.map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => setSelectedCluster(cluster.id)}
                className={`w-full text-left px-4 py-3 font-mono text-sm hover:bg-stone-50 transition-colors flex items-center justify-between ${
                  selectedCluster === cluster.id ? 'bg-stone-900 text-stone-50' : ''
                }`}
              >
                <span className="truncate">{cluster.label}</span>
                <span className="text-xs ml-2">{cluster.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Essay List */}
      <div className="col-span-12 lg:col-span-9">
        <div className="border-2 border-stone-900 bg-white">
          <div className="border-b-2 border-stone-900 px-4 py-3 bg-stone-100 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
              {selectedCluster
                ? ESSAY_CLUSTERS.find((c) => c.id === selectedCluster)?.label
                : 'All Essays'}
            </span>
            <span className="font-mono text-xs text-stone-500">
              {filteredEssays.length} entries
            </span>
          </div>

          <div className="divide-y-2 divide-stone-200">
            {filteredEssays.map((essay) => (
              <article key={essay.id} className="p-6 hover:bg-stone-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={essay.status === 'published' ? 'default' : 'secondary'}
                        className="font-mono text-xs uppercase rounded-none"
                      >
                        {essay.status}
                      </Badge>
                      {essay.linkedTool && (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs uppercase rounded-none border-red-900 text-red-900"
                        >
                          <Calculator className="h-3 w-3 mr-1" />
                          Tool Linked
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-mono text-lg font-bold text-stone-900 mb-2">
                      {essay.title}
                    </h3>

                    <p className="font-mono text-sm text-stone-600 mb-4 leading-relaxed">
                      <span className="font-bold">Thesis:</span> {essay.thesis}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="border-l-2 border-red-900 pl-3">
                        <div className="uppercase tracking-widest text-stone-500 mb-1">
                          What This Obscures
                        </div>
                        <p className="text-stone-600">{essay.whatObscures}</p>
                      </div>
                      <div className="border-l-2 border-stone-400 pl-3">
                        <div className="uppercase tracking-widest text-stone-500 mb-1">
                          What This Enables
                        </div>
                        <p className="text-stone-600">{essay.whatEnables}</p>
                      </div>
                    </div>
                  </div>

                  <button className="p-2 border-2 border-stone-900 hover:bg-stone-900 hover:text-stone-50 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
