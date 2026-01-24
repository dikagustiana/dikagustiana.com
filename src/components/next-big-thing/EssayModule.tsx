import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Essay {
  id: string;
  title: string;
  snippet: string;
  category: string;
  readTime: string;
  date: string;
  featured?: boolean;
  tags: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'All Topics' },
  { id: 'technology', label: 'Technology' },
  { id: 'economy', label: 'Economy' },
  { id: 'society', label: 'Society' },
  { id: 'environment', label: 'Environment' },
  { id: 'governance', label: 'Governance' },
];

const ESSAYS: Essay[] = [
  {
    id: 'ai-transformation',
    title: 'The AI Transformation: Beyond the Hype Cycle',
    snippet: 'How artificial intelligence is reshaping industries, labor markets, and what it means for economic development in emerging markets.',
    category: 'technology',
    readTime: '8 min read',
    date: 'Jan 2025',
    featured: true,
    tags: ['AI', 'Future of Work', 'Digital Economy'],
  },
  {
    id: 'green-finance',
    title: 'Green Finance and the Capital Allocation Problem',
    snippet: 'Examining the gap between sustainable finance promises and actual capital flows to climate solutions in developing economies.',
    category: 'environment',
    readTime: '6 min read',
    date: 'Jan 2025',
    tags: ['Climate', 'Finance', 'ESG'],
  },
  {
    id: 'demographic-dividend',
    title: 'The Demographic Dividend Myth',
    snippet: 'Why a young population alone won\'t guarantee economic prosperity, and what policies actually matter for capturing demographic benefits.',
    category: 'economy',
    readTime: '7 min read',
    date: 'Dec 2024',
    featured: true,
    tags: ['Demographics', 'Development', 'Policy'],
  },
  {
    id: 'platform-economy',
    title: 'Platform Economy and the New Informality',
    snippet: 'Gig work platforms promised flexibility but delivered precarity. Understanding the regulatory challenges ahead.',
    category: 'economy',
    readTime: '5 min read',
    date: 'Dec 2024',
    tags: ['Labor', 'Platforms', 'Regulation'],
  },
  {
    id: 'smart-cities',
    title: 'Smart Cities: Technology Solutions Looking for Problems',
    snippet: 'A critical look at smart city initiatives and whether they address real urban challenges or create new dependencies.',
    category: 'technology',
    readTime: '6 min read',
    date: 'Nov 2024',
    tags: ['Urban', 'Tech', 'Infrastructure'],
  },
  {
    id: 'energy-transition-equity',
    title: 'Energy Transition: Who Pays, Who Benefits?',
    snippet: 'The distributional consequences of decarbonization policies and why "just transition" requires more than rhetoric.',
    category: 'environment',
    readTime: '9 min read',
    date: 'Nov 2024',
    featured: true,
    tags: ['Energy', 'Equity', 'Policy'],
  },
  {
    id: 'institutional-decay',
    title: 'Institutional Decay in Democratic Systems',
    snippet: 'How democratic institutions erode not through dramatic coups but through gradual hollowing of accountability mechanisms.',
    category: 'governance',
    readTime: '7 min read',
    date: 'Oct 2024',
    tags: ['Democracy', 'Institutions', 'Politics'],
  },
  {
    id: 'education-mismatch',
    title: 'The Education-Employment Mismatch',
    snippet: 'Why expanding higher education without reforming curriculum and labor markets creates educated unemployment.',
    category: 'society',
    readTime: '6 min read',
    date: 'Oct 2024',
    tags: ['Education', 'Employment', 'Skills'],
  },
];

export function EssayModule() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredEssays = selectedCategory === 'all'
    ? ESSAYS
    : ESSAYS.filter((e) => e.category === selectedCategory);

  return (
    <div id="all-essays" className="space-y-8">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors",
              selectedCategory === cat.id
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Essays Grid - All Consistent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEssays.map((essay) => (
          <Card 
            key={essay.id} 
            className="group hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer bg-card border-border overflow-hidden flex flex-col"
          >
            <CardContent className="p-6 flex flex-col flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs capitalize">
                  {essay.category}
                </Badge>
                {essay.featured && (
                  <Badge className="bg-accent text-accent-foreground text-xs">
                    Featured
                  </Badge>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                {essay.title}
              </h3>
              
              {/* Snippet */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3 flex-1">
                {essay.snippet}
              </p>

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {essay.readTime}
                </span>
                <span>{essay.date}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {essay.tags.slice(0, 3).map((tag) => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Read Link */}
              <span className="text-sm text-accent font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                Read Essay
                <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredEssays.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No essays found in this category.</p>
        </div>
      )}
    </div>
  );
}
