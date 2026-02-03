import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
  return (
    <PageLayout
      variant="tool"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: "Dika's Tools", path: '/dikas-tools' },
        { label: 'Remora Trading' }
      ]}
      showManifesto
      manifesto="Signals are hypotheses, not instructions. Check data freshness. Verify before acting."
    >
      <SEO
        title="Remora Trading"
        description="Semi-automated trading signals for Indonesian equity markets using IDX data. Data-driven decision support."
      />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Remora Trading Decision System</h1>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>What to Check:</strong> Signal freshness, data quality, position sizing, regime state.</p>
            <p><strong>Decision Supported:</strong> Which signals to act on? What size per position?</p>
          </div>
        </div>

        {/* Data Integrity Notice */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-primary">Data Integrity Policy</h3>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Only verified IDX and IDX-derived free public data sources</li>
                  <li>• All data validated before storage (OHLC logic, volume, price ranges)</li>
                  <li>• Signals blocked or downgraded when data is stale or corrupted</li>
                  <li>• Every output shows last successful data update timestamp</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

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
        <Card className="mt-8 bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-700">Trading Disclaimer</h3>
                <p className="text-sm text-amber-600 mt-1">
                  This is a decision support system, not financial advice. All signals are based on 
                  technical analysis and historical data. Past performance does not guarantee future 
                  results. Always conduct your own research. The system indicates when data is stale 
                  or confidence is low.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default RemoraTrading;
