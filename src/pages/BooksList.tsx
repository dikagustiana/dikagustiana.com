import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Upload } from 'lucide-react';

const sampleBooks = [
  { id: 'book-1', title: 'Financial Statement Analysis', author: 'Various', year: 2023 },
  { id: 'book-2', title: 'Corporate Finance Principles', author: 'Various', year: 2022 },
  { id: 'book-3', title: 'Accounting Standards Guide', author: 'Various', year: 2024 },
];

export default function BooksList() {
  const { category } = useParams<{ category: string }>();
  const { isAdmin } = useAuth();

  const formatTitle = (s: string) => s?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Category';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Books and Academia', path: '/books-academia' },
              { label: 'Categories', path: '/books/categories' },
              { label: formatTitle(category || '') }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">
            {formatTitle(category || '')}
          </h1>
          {isAdmin && (
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Book
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleBooks.map((book) => (
            <Link key={book.id} to={`/books/${category}/${book.id}/read`}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{book.title}</CardTitle>
                  <CardDescription>
                    {book.author} • {book.year}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
