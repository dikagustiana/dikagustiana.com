import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuantDataEngine } from '@/components/quant/QuantDataEngine';
import { QuantSignalsList } from '@/components/quant/QuantSignalsList';
import { QuantRegimeDisplay } from '@/components/quant/QuantRegimeDisplay';
import { QuantBacktestPanel } from '@/components/quant/QuantBacktestPanel';
import { QuantRiskPanel } from '@/components/quant/QuantRiskPanel';
import { QuantSystemHealth } from '@/components/quant/QuantSystemHealth';
import { 
  Activity, 
  Zap, 
  Database, 
  BarChart3,
  Shield,
  Gauge
} from 'lucide-react';

const DikaQuantEngine = () => {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Dika's Tools", href: "/dikas-tools" },
    { label: "Dika Quant Engine" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold mb-2">Dika Quant Engine</h1>
          <p className="text-muted-foreground">
            Regime-aware probabilistic trading signals for Indonesian equity markets. No narratives. Data driven.
          </p>
        </div>

        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-primary">Quantitative Philosophy</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Many weak signals combined. No single indicator reliance.</li>
                <li>• Regime-aware allocation. Strategy weights shift with market state.</li>
                <li>• Half-Kelly sizing. Conservative position management.</li>
                <li>• Walk-forward backtesting only. No in-sample optimization.</li>
              </ul>
            </div>
          </div>
        </div>

        <Tabs defaultValue="signals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto">
            <TabsTrigger value="signals" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="regimes" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Regimes</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Risk</span>
            </TabsTrigger>
            <TabsTrigger value="backtest" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Backtest</span>
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

          <TabsContent value="signals" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <QuantSignalsList />
              </div>
              <div>
                <QuantRegimeDisplay />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="regimes">
            <QuantRegimeDisplay />
          </TabsContent>

          <TabsContent value="risk">
            <QuantRiskPanel />
          </TabsContent>

          <TabsContent value="backtest">
            <QuantBacktestPanel />
          </TabsContent>

          <TabsContent value="data">
            <QuantDataEngine />
          </TabsContent>

          <TabsContent value="health">
            <QuantSystemHealth />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default DikaQuantEngine;
