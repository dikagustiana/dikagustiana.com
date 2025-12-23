import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { BookOpen, DollarSign, GraduationCap } from 'lucide-react';

const categories = [
  {
    id: 'categories',
    title: 'Books',
    description: 'Browse our complete book collection by category.',
    icon: BookOpen,
    path: '/books/categories',
  },
  {
    id: 'finance-accounting',
    title: 'Finance and Accounting Books',
    description: 'Essential reads for finance and accounting professionals.',
    icon: DollarSign,
    path: '/books/finance-accounting',
  },
  {
    id: 'academic-temper',
    title: 'An Academic Temper',
    description: 'Curated collection for scholarly pursuits and academic excellence.',
    icon: GraduationCap,
    path: '/books/academic-temper',
  },
];

export default function BooksAcademia() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Books and Academia' }
            ]}
          />
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16" style={{ backgroundColor: '#E6F4FF' }}>
        <div className="container text-center">
          <h1 
            className="text-4xl md:text-5xl font-display font-bold mb-4"
            style={{ color: '#2F4B6E', fontFamily: "'Plus Jakarta Sans', 'Playfair Display', serif" }}
          >
            Books That Change You
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore powerful reads that expand your knowledge and reshape your perspective.
          </p>
        </div>
      </section>

      <main className="flex-1 container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {categories.map((category) => (
            <Link key={category.id} to={category.path}>
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                <CardHeader className="text-center">
                  <category.icon className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
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
