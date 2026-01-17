import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EssayModule } from '@/components/next-big-thing/EssayModule';
import { PolicyCaptureStressTool } from '@/components/next-big-thing/PolicyCaptureStressTool';
import { ArchiveSection } from '@/components/next-big-thing/ArchiveSection';
import { FileText, Calculator, Archive, AlertTriangle } from 'lucide-react';

export default function TheNextBigThing() {
  const [activeLayer, setActiveLayer] = useState('essays');

  return (
    <Layout>
      <div className="min-h-screen bg-stone-50">
        {/* Header Block */}
        <div className="border-b-4 border-stone-900 bg-stone-900 text-stone-50">
          <div className="container mx-auto px-4 py-8">
            <Breadcrumb
              items={[
                { label: 'Home', path: '/' },
                { label: 'The Next Big Thing' },
              ]}
            />
            
            <div className="mt-6 grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-8">
                <h1 className="font-mono text-4xl md:text-5xl font-black tracking-tight uppercase">
                  The Next Big Thing
                </h1>
                <p className="mt-4 font-mono text-lg text-stone-400 max-w-2xl">
                  Digital Think Tank & National Audit Platform. 
                  Essays frame the problem. Tools expose the mechanics. Numbers force accountability.
                </p>
              </div>
              <div className="col-span-12 lg:col-span-4 flex items-end justify-end">
                <div className="text-right font-mono text-xs text-stone-500 uppercase">
                  <div>No opinion without structure</div>
                  <div>No theory without consequences</div>
                  <div>No policy without distribution</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-900 text-red-100 border-b-2 border-red-950">
          <div className="container mx-auto px-4 py-2 flex items-center gap-3 font-mono text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span className="uppercase tracking-wider">
              This platform treats policy as auditable infrastructure. Expect friction.
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <Tabs value={activeLayer} onValueChange={setActiveLayer} className="w-full">
            {/* Layer Navigation */}
            <div className="border-2 border-stone-900 bg-white mb-8">
              <div className="border-b-2 border-stone-900 px-4 py-2 bg-stone-100">
                <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
                  Platform Layers
                </span>
              </div>
              <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-3">
                <TabsTrigger 
                  value="essays" 
                  className="rounded-none border-r-2 border-stone-900 py-4 px-6 font-mono uppercase tracking-wide data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Layer 1: Essays
                </TabsTrigger>
                <TabsTrigger 
                  value="tools" 
                  className="rounded-none border-r-2 border-stone-900 py-4 px-6 font-mono uppercase tracking-wide data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Layer 2: Tools
                </TabsTrigger>
                <TabsTrigger 
                  value="archive" 
                  className="rounded-none py-4 px-6 font-mono uppercase tracking-wide data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50 hover:bg-stone-100 transition-colors"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Layer 3: Archive
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Layer Content */}
            <TabsContent value="essays" className="mt-0">
              <EssayModule />
            </TabsContent>

            <TabsContent value="tools" className="mt-0">
              <PolicyCaptureStressTool />
            </TabsContent>

            <TabsContent value="archive" className="mt-0">
              <ArchiveSection />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Block */}
        <div className="border-t-4 border-stone-900 bg-stone-900 text-stone-400 mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-12 gap-8 font-mono text-xs">
              <div className="col-span-12 md:col-span-4">
                <div className="uppercase tracking-widest text-stone-500 mb-2">Methodology</div>
                <p className="text-stone-400">
                  All simulations are deterministic. Assumptions are explicit. 
                  No optimization. No gamification.
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="uppercase tracking-widest text-stone-500 mb-2">Position</div>
                <p className="text-stone-400">
                  This platform reconciles technocracy with ideological critique. 
                  Essays frame. Tools expose. Numbers force.
                </p>
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="uppercase tracking-widest text-stone-500 mb-2">Warning</div>
                <p className="text-stone-400">
                  This is not educational content. This is internal audit methodology 
                  applied to public policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
