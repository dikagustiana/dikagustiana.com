import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Input } from '@/components/ui/input';
import { fsliItems, FsliItem } from '@/data/fsliData';

export default function FsliList() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = fsliItems.filter(item =>
    item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.indonesian.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentAssets = filteredItems.filter(item => item.category === 'current_assets');
  const nonCurrentAssets = filteredItems.filter(item => item.category === 'non_current_assets');

  const renderTable = (items: FsliItem[], title: string) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-card">
              <th className="text-left p-4 border-b border-border"></th>
              <th className="text-right p-4 border-b border-border">
                <div className="font-semibold">31 Desember 2024</div>
                <div className="text-sm text-muted-foreground">December 31, 2024</div>
              </th>
              <th className="text-right p-4 border-b border-border">
                <div className="font-semibold">31 Desember 2023</div>
                <div className="text-sm text-muted-foreground">December 31, 2023</div>
              </th>
              <th className="text-left p-4 border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.slug} className="hover:bg-card/50 transition-colors">
                <td className="p-4 border-b border-border">
                  <Link 
                    to={`/accounting/fsli/${item.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    <div>{item.indonesian}</div>
                    <div className="text-xs text-muted-foreground">{item.notes}</div>
                  </Link>
                </td>
                <td className="text-right p-4 border-b border-border font-mono">
                  {item.dec2024}
                </td>
                <td className="text-right p-4 border-b border-border font-mono text-muted-foreground">
                  {item.dec2023}
                </td>
                <td className="p-4 border-b border-border">
                  <Link 
                    to={`/accounting/fsli/${item.slug}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.english}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: 'Accounting', path: '/accounting' },
              { label: 'FSLI Detail' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            CONSOLIDATED STATEMENT OF FINANCIAL POSITION
          </h1>
          <div className="text-muted-foreground space-y-1">
            <p>Tanggal 31 Desember 2024</p>
            <p className="italic">As of December 31, 2024</p>
            <p className="text-sm mt-4">
              (Disajikan dalam Ribuan Dolar Amerika Serikat, Kecuali Dinyatakan Lain)
            </p>
            <p className="text-sm italic">
              (Expressed in Thousands of United States Dollars, Unless Otherwise Stated)
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search line items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* ASET / ASSETS Header */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-secondary px-6 py-4">
            <h2 className="text-xl font-bold">ASET / ASSETS</h2>
          </div>
          <div className="p-6">
            {renderTable(currentAssets, 'ASET LANCAR / CURRENT ASSETS')}
            {renderTable(nonCurrentAssets, 'ASET TIDAK LANCAR / NON-CURRENT ASSETS')}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
