import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fsliItems, FsliItem } from '@/data/fsliData';

export default function FsliList() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = fsliItems.filter(item =>
    item.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.indonesian.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentAssets = filteredItems.filter(item => item.category === 'current_assets');
  const nonCurrentAssets = filteredItems.filter(item => item.category === 'non_current_assets');

  // Calculate totals
  const parseNumber = (str: string) => parseFloat(str.replace(/,/g, '')) || 0;
  const formatNumber = (num: number) => num.toLocaleString('en-US');
  
  const totalCurrentAssets2024 = currentAssets.reduce((sum, item) => sum + parseNumber(item.dec2024), 0);
  const totalCurrentAssets2023 = currentAssets.reduce((sum, item) => sum + parseNumber(item.dec2023), 0);
  const totalNonCurrentAssets2024 = nonCurrentAssets.reduce((sum, item) => sum + parseNumber(item.dec2024), 0);
  const totalNonCurrentAssets2023 = nonCurrentAssets.reduce((sum, item) => sum + parseNumber(item.dec2023), 0);
  const totalAssets2024 = totalCurrentAssets2024 + totalNonCurrentAssets2024;
  const totalAssets2023 = totalCurrentAssets2023 + totalNonCurrentAssets2023;

  const renderRow = (item: FsliItem, isIndented = false) => (
    <tr key={item.slug} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <Link to={`/accounting/fsli/${item.slug}`} className="hover:text-accent transition-colors">
          <span className={isIndented ? 'pl-4' : ''}>{item.indonesian}</span>
        </Link>
        {item.notes && (
          <div className="text-xs text-muted-foreground">{item.notes}</div>
        )}
      </td>
      <td className="py-3 px-4 text-right font-mono text-sm">{item.dec2024}</td>
      <td className="py-3 px-4 text-right font-mono text-sm text-muted-foreground">{item.dec2023}</td>
      <td className="py-3 px-4 text-right text-muted-foreground text-sm">
        <Link to={`/accounting/fsli/${item.slug}`} className="hover:text-accent transition-colors">
          {item.english}
        </Link>
      </td>
    </tr>
  );

  const renderTotalRow = (label: string, labelEn: string, val2024: number, val2023: number, isBold = false) => (
    <tr className={`border-b border-border ${isBold ? 'bg-header text-header-foreground' : 'bg-muted/50'}`}>
      <td className={`py-3 px-4 ${isBold ? 'font-bold' : 'font-semibold'}`}>{label}</td>
      <td className={`py-3 px-4 text-right font-mono text-sm ${isBold ? 'font-bold' : 'font-semibold'}`}>
        {formatNumber(val2024)}
      </td>
      <td className={`py-3 px-4 text-right font-mono text-sm ${isBold ? '' : 'text-muted-foreground'}`}>
        {formatNumber(val2023)}
      </td>
      <td className={`py-3 px-4 text-right text-sm ${isBold ? '' : 'text-muted-foreground'}`}>{labelEn}</td>
    </tr>
  );

  const renderSectionHeader = (labelId: string, labelEn: string) => (
    <tr className="bg-header text-header-foreground">
      <td colSpan={4} className="py-3 px-4 font-bold text-sm">
        {labelId} / {labelEn}
      </td>
    </tr>
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

      <main className="flex-1 container py-8 max-w-6xl">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            CONSOLIDATED STATEMENT OF FINANCIAL POSITION
          </h1>
          <div className="text-accent font-semibold">Tanggal 31 Desember 2024</div>
          <div className="text-muted-foreground italic text-sm">As of December 31, 2024</div>
          <div className="text-muted-foreground text-xs mt-2">
            (Disajikan dalam Ribuan Dolar Amerika Serikat, Kecuali Dinyatakan Lain)
          </div>
          <div className="text-muted-foreground text-xs italic">
            (Expressed in Thousands of United States Dollars, Unless Otherwise Stated)
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search line items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        {/* ASET / ASSETS Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden mb-8">
          {/* Main Header */}
          <div className="bg-header text-header-foreground px-4 py-3">
            <h2 className="font-bold text-lg">ASET / ASSETS</h2>
          </div>

          {/* Column Headers */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 w-1/3"></th>
                  <th className="text-right py-3 px-4 w-1/6">
                    <div className="font-bold text-sm">31 Desember 2024</div>
                    <div className="text-xs text-muted-foreground italic">December 31, 2024</div>
                  </th>
                  <th className="text-right py-3 px-4 w-1/6">
                    <div className="font-bold text-sm">31 Desember 2023</div>
                    <div className="text-xs text-muted-foreground italic">December 31, 2023</div>
                  </th>
                  <th className="text-right py-3 px-4 w-1/3"></th>
                </tr>
              </thead>
              <tbody>
                {/* CURRENT ASSETS Section */}
                {renderSectionHeader('ASET LANCAR', 'CURRENT ASSETS')}
                {currentAssets.map((item) => renderRow(item))}
                {renderTotalRow('Jumlah Aset Lancar', 'Total Current Assets', totalCurrentAssets2024, totalCurrentAssets2023)}

                {/* NON-CURRENT ASSETS Section */}
                {renderSectionHeader('ASET TIDAK LANCAR', 'NON-CURRENT ASSETS')}
                {nonCurrentAssets.map((item) => renderRow(item))}
                {renderTotalRow('Jumlah Aset Tidak Lancar', 'Total Non-current Assets', totalNonCurrentAssets2024, totalNonCurrentAssets2023)}

                {/* TOTAL ASSETS */}
                {renderTotalRow('JUMLAH ASET', 'TOTAL ASSETS', totalAssets2024, totalAssets2023, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <h3 className="font-bold text-foreground mb-1">ASET TIDAK LANCAR</h3>
            <p className="text-xs text-accent uppercase tracking-wide mb-2">NON-CURRENT ASSETS</p>
            <p className="text-muted-foreground text-sm mb-4">{nonCurrentAssets.length}+ Items</p>
            <Button variant="default" className="w-full bg-header hover:bg-header/90 text-header-foreground">
              Coming Soon
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <h3 className="font-bold text-foreground mb-1">LIABILITAS</h3>
            <p className="text-xs text-accent uppercase tracking-wide mb-2">LIABILITIES</p>
            <p className="text-muted-foreground text-sm mb-4">12+ Items</p>
            <Button variant="default" className="w-full bg-header hover:bg-header/90 text-header-foreground">
              Coming Soon
            </Button>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 text-center">
            <h3 className="font-bold text-foreground mb-1">EKUITAS</h3>
            <p className="text-xs text-accent uppercase tracking-wide mb-2">EQUITY</p>
            <p className="text-muted-foreground text-sm mb-4">8+ Items</p>
            <Button variant="default" className="w-full bg-header hover:bg-header/90 text-header-foreground">
              Coming Soon
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}