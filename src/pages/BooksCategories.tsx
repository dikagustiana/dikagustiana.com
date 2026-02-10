import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const categories = [
  { id: 'finance-accounting', title: 'Finance & Accounting', count: 12 },
  { id: 'academic-temper', title: 'An Academic Temper', count: 8 },
  { id: 'business-strategy', title: 'Business & Strategy', count: 15 },
  { id: 'personal-development', title: 'Personal Development', count: 10 },
];

export default function BooksCategories() {
  return (
    <PageLayout variant="content" role="educator" breadcrumbs={[{label:'Home',path:'/'},{label:'Books and Academia',path:'/books-academia'},{label:'Categories'}]}>
      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Book Categories
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse our collection by category.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {categories.map((category) => (
            <Link key={category.id} to={`/books/${category.id}`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.count} books</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </PageLayout>
  );
}
