import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RemoraHealthStatus } from '@/components/remora/RemoraHealthStatus';
import { RemoraSignalsList } from '@/components/remora/RemoraSignalsList';
import { RemoraDataIngestion } from '@/components/remora/RemoraDataIngestion';
import { RemoraStocksList } from '@/components/remora/RemoraStocksList';
import { 
  Activity, 
  Zap, 
  Database, 
  LayoutDashboard,
  AlertTriangle,
  Shield
} from 'lucide-react';

const RemoraTrading = () => {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Dika's Tools", href: "/dikas-tools" },
    { label: "Remora Trading" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold mb-2">Remora Trading Decision System</h1>
          <p className="text-muted-foreground">
            Semi-automated trading signals for Indonesian equity markets using IDX data.
          </p>
        </div>

        {/* Data Integrity Notice */}
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-primary">Data Integrity Policy</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Only verified IDX and IDX-derived free public data sources allowed</li>
                <li>• All data is validated before storage (OHLC logic, volume, price ranges)</li>
                <li>• Signals are blocked or downgraded when data is stale or corrupted</li>
                <li>• Every output shows the last successful data update timestamp</li>
              </ul>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RemoraSignalsList />
              </div>
              <div>
                <RemoraHealthStatus />
              </div>
            </div>
            <RemoraStocksList />
          </TabsContent>

          <TabsContent value="signals">
            <RemoraSignalsList />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <RemoraDataIngestion />
            <RemoraStocksList />
          </TabsContent>

          <TabsContent value="health">
            <div className="max-w-2xl">
              <RemoraHealthStatus />
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-700">Trading Disclaimer</h3>
              <p className="text-sm text-yellow-600 mt-1">
                This is a decision support system, not financial advice. All signals are based on 
                technical analysis and historical data. Past performance does not guarantee future 
                results. Always conduct your own research and consult with a qualified financial 
                advisor before making investment decisions. The system will clearly indicate when 
                data is stale or confidence is low.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RemoraTrading;
