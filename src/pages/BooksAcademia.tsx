import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Calculator, TrendingUp, Brain } from 'lucide-react';
import { useBookCategories } from '@/hooks/queries/useBooks';
import { LoadingState } from '@/components/states/LoadingState';
import { EmptyState } from '@/components/states/EmptyState';

const categoryMeta: Record<string, { 
  icon: typeof BookOpen; 
  ignorance: string; 
  whyNow: string;
  howToRead: string;
}> = {
  'finance-accounting': {
    icon: Calculator,
    ignorance: 'The ignorance that numbers are neutral. They encode decisions, power, and interests.',
    whyNow: 'Financial literacy is a prerequisite for agency in any organization.',
    howToRead: 'Read with a spreadsheet open. Calculate alongside the text. Skip theory chapters.',
  },
  'economics': {
    icon: TrendingUp,
    ignorance: 'The ignorance that markets are natural. They are designed, regulated, and contested.',
    whyNow: 'Every policy debate is an economic debate. You cannot participate without the language.',
    howToRead: 'Focus on mechanisms and trade-offs. Question every assumption about incentives.',
  },
  'academic-temper': {
    icon: Brain,
    ignorance: 'The ignorance that opinions are equal. Argument quality varies. Learn to distinguish.',
    whyNow: 'Information abundance makes critical thinking more valuable, not less.',
    howToRead: 'Identify the author\'s thesis in paragraph one. Find their strongest opposing argument.',
  },
};

export default function BooksAcademia() {
  const { data: categories, isLoading, error } = useBookCategories();

  return (
    <PageLayout 
      role="educator"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Books' }
      ]}
      showManifesto
      manifesto="Books are tools. Use them or do not pick them up."
    >
      <SEO 
        title="Books"
        description="Readings that build capability. Each book fights a specific ignorance. Read with purpose."
      />

      <div className="container py-8">
        <div className="max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Books
          </h1>
          <p className="text-muted-foreground">
            Each book listed here fights a specific ignorance. The descriptions tell you what 
            capability you gain, not how "interesting" the book is. Read with purpose.
          </p>
        </div>

        {isLoading && <LoadingState variant="cards" count={3} />}

        {error && (
          <EmptyState 
            title="Failed to load categories"
            message="Could not retrieve book categories."
          />
        )}

        {categories && categories.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {categories.map((category) => {
              const meta = categoryMeta[category] || {
                icon: BookOpen,
                ignorance: 'Specific ignorance to be defined.',
                whyNow: 'Relevance to current context.',
                howToRead: 'Approach for maximum value.',
              };
              const CategoryIcon = meta.icon;

              return (
                <Link key={category} to={`/books/${category}`}>
                  <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground capitalize group-hover:text-accent transition-colors">
                          {category.replace(/-/g, ' ')}
                        </h3>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                            The Ignorance This Fights
                          </p>
                          <p className="text-foreground line-clamp-2">{meta.ignorance}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                            Why Needed Now
                          </p>
                          <p className="text-muted-foreground line-clamp-2">{meta.whyNow}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <span className="text-sm font-medium text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                          View Books
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {categories && categories.length === 0 && (
          <EmptyState 
            title="No categories yet"
            message="Book categories will appear here once books are uploaded."
          />
        )}
      </div>
    </PageLayout>
  );
}
