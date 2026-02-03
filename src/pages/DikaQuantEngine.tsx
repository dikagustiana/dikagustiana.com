import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
  return (
    <PageLayout
      variant="tool"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: "Dika's Tools", path: '/dikas-tools' },
        { label: 'Dika Quant Engine' }
      ]}
      showManifesto
      manifesto="Probabilistic signals only. No single-indicator reliance. Half-Kelly sizing. Walk-forward validation."
    >
      <SEO
        title="Dika Quant Engine"
        description="Regime-aware probabilistic trading signals for Indonesian equity markets with walk-forward backtesting."
      />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dika Quant Engine</h1>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>What to Check:</strong> Regime state, signal probability, backtest metrics, position risk.</p>
            <p><strong>Decision Supported:</strong> Is current regime favorable? What edge exists? What position size?</p>
          </div>
        </div>

        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
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
          </CardContent>
        </Card>

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
      </div>
    </PageLayout>
  );
};

export default DikaQuantEngine;
