import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, RotateCcw, Download, ChevronRight } from 'lucide-react';

interface PolicyInputs {
  vatIncrease: number;
  carbonTax: number;
  fuelSubsidyCut: number;
  wealthTax: number;
  socialSpendingIncrease: number;
  minimumWageIncrease: number;
  oligarchyPower: number;
  stateCapacity: number;
  laborOrganization: number;
}

interface SimulationResult {
  distributional: {
    group: string;
    netImpact: number;
    taxBurden: number;
    benefitGain: number;
  }[];
  sectoralImpacts: {
    sector: string;
    impact: string;
    magnitude: number;
  }[];
  fiscalBalance: {
    revenueChange: number;
    spendingChange: number;
    netBalance: number;
  };
  captureRisks: {
    risk: string;
    probability: number;
    mechanism: string;
  }[];
  auditSummary: string[];
}

const DEFAULT_INPUTS: PolicyInputs = {
  vatIncrease: 0,
  carbonTax: 0,
  fuelSubsidyCut: 0,
  wealthTax: 0,
  socialSpendingIncrease: 0,
  minimumWageIncrease: 0,
  oligarchyPower: 70,
  stateCapacity: 40,
  laborOrganization: 20,
};

function runSimulation(inputs: PolicyInputs): SimulationResult {
  // Deterministic simulation logic
  const captureMultiplier = inputs.oligarchyPower / 100;
  const implementationMultiplier = inputs.stateCapacity / 100;
  const resistanceMultiplier = (100 - inputs.laborOrganization) / 100;

  // Calculate distributional impacts
  const distributional = [
    {
      group: 'Top 1% (Oligarchs)',
      netImpact: -(inputs.wealthTax * 0.8 * (1 - captureMultiplier)) + (inputs.vatIncrease * 0.1),
      taxBurden: inputs.wealthTax * 0.8 * (1 - captureMultiplier),
      benefitGain: inputs.vatIncrease * 0.1 * captureMultiplier,
    },
    {
      group: 'Top 10% (Professional Elite)',
      netImpact: -(inputs.vatIncrease * 0.3) - (inputs.carbonTax * 0.2) + (inputs.socialSpendingIncrease * 0.05),
      taxBurden: inputs.vatIncrease * 0.3 + inputs.carbonTax * 0.2,
      benefitGain: inputs.socialSpendingIncrease * 0.05,
    },
    {
      group: 'Middle 40% (Formal Workers)',
      netImpact: -(inputs.vatIncrease * 0.4) - (inputs.fuelSubsidyCut * 0.3) + (inputs.socialSpendingIncrease * 0.2) + (inputs.minimumWageIncrease * 0.5),
      taxBurden: inputs.vatIncrease * 0.4 + inputs.fuelSubsidyCut * 0.3,
      benefitGain: inputs.socialSpendingIncrease * 0.2 + inputs.minimumWageIncrease * 0.5,
    },
    {
      group: 'Bottom 50% (Informal/Poor)',
      netImpact: -(inputs.vatIncrease * 0.5) - (inputs.fuelSubsidyCut * 0.6) + (inputs.socialSpendingIncrease * 0.7 * implementationMultiplier),
      taxBurden: inputs.vatIncrease * 0.5 + inputs.fuelSubsidyCut * 0.6,
      benefitGain: inputs.socialSpendingIncrease * 0.7 * implementationMultiplier,
    },
  ];

  // Calculate sectoral impacts
  const sectoralImpacts = [
    {
      sector: 'Extractive Industries',
      impact: inputs.carbonTax > 50 ? 'Negative' : 'Neutral',
      magnitude: -inputs.carbonTax * 0.3,
    },
    {
      sector: 'Retail/Consumer',
      impact: inputs.vatIncrease > 2 ? 'Negative' : 'Neutral',
      magnitude: -inputs.vatIncrease * 5,
    },
    {
      sector: 'Financial Services',
      impact: inputs.wealthTax > 1 ? 'Negative' : 'Positive',
      magnitude: -inputs.wealthTax * 10 + inputs.socialSpendingIncrease * 0.1,
    },
    {
      sector: 'Labor-Intensive Manufacturing',
      impact: inputs.minimumWageIncrease > 15 ? 'Negative' : 'Mixed',
      magnitude: -inputs.minimumWageIncrease * 0.5 + inputs.socialSpendingIncrease * 0.2,
    },
  ];

  // Calculate fiscal balance
  const revenueChange = 
    inputs.vatIncrease * 15 +
    inputs.carbonTax * 8 +
    inputs.wealthTax * 20 * (1 - captureMultiplier * 0.5) +
    inputs.fuelSubsidyCut * 12;
  
  const spendingChange = 
    inputs.socialSpendingIncrease * 10 +
    inputs.minimumWageIncrease * 0; // Minimum wage is private sector cost

  // Calculate capture risks
  const captureRisks = [
    {
      risk: 'Wealth Tax Evasion',
      probability: Math.min(95, 30 + inputs.oligarchyPower * 0.6),
      mechanism: 'Asset relocation, underreporting, political exemptions',
    },
    {
      risk: 'Carbon Tax Carve-outs',
      probability: Math.min(90, 20 + inputs.oligarchyPower * 0.7),
      mechanism: 'Industry lobbying for exemptions, delayed implementation',
    },
    {
      risk: 'Social Spending Leakage',
      probability: Math.max(10, 60 - inputs.stateCapacity * 0.5),
      mechanism: 'Administrative inefficiency, local capture, targeting errors',
    },
    {
      risk: 'Wage Enforcement Failure',
      probability: Math.max(15, 70 - inputs.stateCapacity * 0.4 - inputs.laborOrganization * 0.3),
      mechanism: 'Weak inspection, informalization pressure, employer collusion',
    },
  ];

  // Generate audit summary
  const auditSummary: string[] = [];
  
  if (inputs.wealthTax > 0 && inputs.oligarchyPower > 60) {
    auditSummary.push(`WARNING: Wealth tax of ${inputs.wealthTax}% faces ${Math.round(captureRisks[0].probability)}% capture probability given current oligarchic power structure.`);
  }
  
  if (inputs.fuelSubsidyCut > 20 && inputs.socialSpendingIncrease < inputs.fuelSubsidyCut) {
    auditSummary.push(`REGRESSIVE ALERT: Fuel subsidy reduction (${inputs.fuelSubsidyCut}%) exceeds compensatory social spending (${inputs.socialSpendingIncrease}%). Bottom 50% experiences net loss.`);
  }
  
  if (inputs.stateCapacity < 50 && inputs.socialSpendingIncrease > 30) {
    auditSummary.push(`IMPLEMENTATION RISK: Low state capacity (${inputs.stateCapacity}%) will result in significant leakage of social spending increases.`);
  }

  if (revenueChange - spendingChange < 0) {
    auditSummary.push(`FISCAL ALERT: Policy package produces deficit of IDR ${Math.abs(revenueChange - spendingChange).toFixed(1)} trillion.`);
  }

  if (distributional[3].netImpact < 0) {
    auditSummary.push(`DISTRIBUTIONAL FAILURE: Bottom 50% experiences net negative impact of ${distributional[3].netImpact.toFixed(1)}% despite "progressive" framing.`);
  }

  if (auditSummary.length === 0) {
    auditSummary.push('Policy package passes basic distributional checks. Proceed with implementation monitoring.');
  }

  return {
    distributional,
    sectoralImpacts,
    fiscalBalance: {
      revenueChange,
      spendingChange,
      netBalance: revenueChange - spendingChange,
    },
    captureRisks,
    auditSummary,
  };
}

export function PolicyCaptureStressTool() {
  const [inputs, setInputs] = useState<PolicyInputs>(DEFAULT_INPUTS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState('inputs');

  const handleRun = () => {
    const simulationResult = runSimulation(inputs);
    setResult(simulationResult);
    setActiveTab('distribution');
  };

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
    setResult(null);
    setActiveTab('inputs');
  };

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="border-2 border-stone-900 bg-white">
        <div className="border-b-2 border-stone-900 px-6 py-4 bg-stone-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono text-xl font-bold uppercase tracking-wide">
                Policy Capture Stress Test
              </h2>
              <p className="font-mono text-xs text-stone-600 mt-1">
                Simulate policy packages. See who gains. See who pays. See who blocks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="font-mono text-xs rounded-none border-2 border-stone-900"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                className="font-mono text-xs rounded-none bg-red-900 hover:bg-red-800 text-white"
              >
                <Play className="h-3 w-3 mr-1" />
                Run Simulation
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b-2 border-stone-900">
            <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
              {['inputs', 'distribution', 'sectors', 'capture', 'audit'].map((tab, i) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={`rounded-none py-3 px-4 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50 hover:bg-stone-50 transition-colors ${
                    i < 4 ? 'border-r-2 border-stone-900' : ''
                  }`}
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Inputs Tab */}
          <TabsContent value="inputs" className="p-6 m-0">
            <div className="grid grid-cols-12 gap-8">
              {/* Tax Policy */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                <div className="border-b-2 border-stone-900 pb-2 mb-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
                    Revenue Policies
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="font-mono text-xs uppercase">VAT Increase (%pts)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.vatIncrease]}
                        onValueChange={([v]) => setInputs({ ...inputs, vatIncrease: v })}
                        max={5}
                        step={0.5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.vatIncrease}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="font-mono text-xs uppercase">Carbon Tax (USD/ton)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.carbonTax]}
                        onValueChange={([v]) => setInputs({ ...inputs, carbonTax: v })}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">${inputs.carbonTax}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="font-mono text-xs uppercase">Wealth Tax (%)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.wealthTax]}
                        onValueChange={([v]) => setInputs({ ...inputs, wealthTax: v })}
                        max={5}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.wealthTax}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="font-mono text-xs uppercase">Fuel Subsidy Cut (%)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.fuelSubsidyCut]}
                        onValueChange={([v]) => setInputs({ ...inputs, fuelSubsidyCut: v })}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.fuelSubsidyCut}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spending Policy */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                <div className="border-b-2 border-stone-900 pb-2 mb-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
                    Spending Policies
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="font-mono text-xs uppercase">Social Spending Increase (%)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.socialSpendingIncrease]}
                        onValueChange={([v]) => setInputs({ ...inputs, socialSpendingIncrease: v })}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.socialSpendingIncrease}%</span>
                    </div>
                  </div>

                  <div>
                    <Label className="font-mono text-xs uppercase">Minimum Wage Increase (%)</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.minimumWageIncrease]}
                        onValueChange={([v]) => setInputs({ ...inputs, minimumWageIncrease: v })}
                        max={50}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.minimumWageIncrease}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Power Structure */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                <div className="border-b-2 border-red-900 pb-2 mb-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-red-900">
                    Power Structure Parameters
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="font-mono text-xs uppercase">Oligarchy Power Index</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.oligarchyPower]}
                        onValueChange={([v]) => setInputs({ ...inputs, oligarchyPower: v })}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.oligarchyPower}</span>
                    </div>
                    <p className="font-mono text-xs text-stone-500 mt-1">
                      Capacity to block/capture policy implementation
                    </p>
                  </div>

                  <div>
                    <Label className="font-mono text-xs uppercase">State Capacity Index</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.stateCapacity]}
                        onValueChange={([v]) => setInputs({ ...inputs, stateCapacity: v })}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.stateCapacity}</span>
                    </div>
                    <p className="font-mono text-xs text-stone-500 mt-1">
                      Ability to implement and enforce policies
                    </p>
                  </div>

                  <div>
                    <Label className="font-mono text-xs uppercase">Labor Organization Index</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[inputs.laborOrganization]}
                        onValueChange={([v]) => setInputs({ ...inputs, laborOrganization: v })}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="font-mono text-sm w-12 text-right">{inputs.laborOrganization}</span>
                    </div>
                    <p className="font-mono text-xs text-stone-500 mt-1">
                      Worker capacity to demand enforcement
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 border-2 border-stone-300 bg-stone-50">
              <p className="font-mono text-xs text-stone-600">
                <strong>METHODOLOGY:</strong> This simulation uses deterministic formulas based on 
                political economy literature. Distributional incidence follows standard tax burden 
                assumptions. Capture probabilities are calibrated to Indonesian institutional context. 
                All assumptions are explicit and auditable.
              </p>
            </div>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="p-0 m-0">
            {result ? (
              <div className="divide-y-2 divide-stone-200">
                <div className="px-6 py-3 bg-stone-100 grid grid-cols-4 font-mono text-xs uppercase tracking-widest text-stone-600">
                  <span>Income Group</span>
                  <span className="text-right">Tax Burden</span>
                  <span className="text-right">Benefit Gain</span>
                  <span className="text-right">Net Impact</span>
                </div>
                {result.distributional.map((row) => (
                  <div
                    key={row.group}
                    className="px-6 py-4 grid grid-cols-4 font-mono text-sm items-center"
                  >
                    <span className="font-medium">{row.group}</span>
                    <span className="text-right text-red-700">-{row.taxBurden.toFixed(1)}%</span>
                    <span className="text-right text-green-700">+{row.benefitGain.toFixed(1)}%</span>
                    <span
                      className={`text-right font-bold ${
                        row.netImpact >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {row.netImpact >= 0 ? '+' : ''}{row.netImpact.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center font-mono text-stone-500">
                Run simulation to see distributional analysis
              </div>
            )}
          </TabsContent>

          {/* Sectors Tab */}
          <TabsContent value="sectors" className="p-0 m-0">
            {result ? (
              <div className="divide-y-2 divide-stone-200">
                <div className="px-6 py-3 bg-stone-100 grid grid-cols-3 font-mono text-xs uppercase tracking-widest text-stone-600">
                  <span>Sector</span>
                  <span className="text-center">Impact Direction</span>
                  <span className="text-right">Magnitude</span>
                </div>
                {result.sectoralImpacts.map((row) => (
                  <div
                    key={row.sector}
                    className="px-6 py-4 grid grid-cols-3 font-mono text-sm items-center"
                  >
                    <span className="font-medium">{row.sector}</span>
                    <span className="text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-none font-mono ${
                          row.impact === 'Negative'
                            ? 'border-red-900 text-red-900'
                            : row.impact === 'Positive'
                            ? 'border-green-900 text-green-900'
                            : 'border-stone-500 text-stone-500'
                        }`}
                      >
                        {row.impact}
                      </Badge>
                    </span>
                    <span
                      className={`text-right ${
                        row.magnitude < 0 ? 'text-red-700' : 'text-green-700'
                      }`}
                    >
                      {row.magnitude >= 0 ? '+' : ''}{row.magnitude.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center font-mono text-stone-500">
                Run simulation to see sectoral impacts
              </div>
            )}
          </TabsContent>

          {/* Capture Tab */}
          <TabsContent value="capture" className="p-0 m-0">
            {result ? (
              <div className="divide-y-2 divide-stone-200">
                <div className="px-6 py-3 bg-red-50 grid grid-cols-3 font-mono text-xs uppercase tracking-widest text-red-900">
                  <span>Capture Risk</span>
                  <span className="text-center">Probability</span>
                  <span>Mechanism</span>
                </div>
                {result.captureRisks.map((row) => (
                  <div
                    key={row.risk}
                    className="px-6 py-4 grid grid-cols-3 font-mono text-sm items-center"
                  >
                    <span className="font-medium">{row.risk}</span>
                    <span className="text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-none font-mono ${
                          row.probability > 70
                            ? 'border-red-900 text-red-900 bg-red-50'
                            : row.probability > 40
                            ? 'border-orange-700 text-orange-700 bg-orange-50'
                            : 'border-green-700 text-green-700 bg-green-50'
                        }`}
                      >
                        {row.probability.toFixed(0)}%
                      </Badge>
                    </span>
                    <span className="text-stone-600 text-xs">{row.mechanism}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center font-mono text-stone-500">
                Run simulation to see capture risk analysis
              </div>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="p-6 m-0">
            {result ? (
              <div className="space-y-6">
                {/* Fiscal Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="border-2 border-stone-900 p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stone-600 mb-2">
                      Revenue Change
                    </div>
                    <div className="font-mono text-2xl font-bold text-green-700">
                      +IDR {result.fiscalBalance.revenueChange.toFixed(1)}T
                    </div>
                  </div>
                  <div className="border-2 border-stone-900 p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stone-600 mb-2">
                      Spending Change
                    </div>
                    <div className="font-mono text-2xl font-bold text-red-700">
                      +IDR {result.fiscalBalance.spendingChange.toFixed(1)}T
                    </div>
                  </div>
                  <div className="border-2 border-stone-900 p-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-stone-600 mb-2">
                      Net Fiscal Balance
                    </div>
                    <div
                      className={`font-mono text-2xl font-bold ${
                        result.fiscalBalance.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {result.fiscalBalance.netBalance >= 0 ? '+' : ''}IDR {result.fiscalBalance.netBalance.toFixed(1)}T
                    </div>
                  </div>
                </div>

                {/* Audit Summary */}
                <div className="border-2 border-red-900 bg-red-50">
                  <div className="border-b-2 border-red-900 px-4 py-2 bg-red-100">
                    <span className="font-mono text-xs uppercase tracking-widest text-red-900 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Audit Summary
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {result.auditSummary.map((summary, i) => (
                      <p key={i} className="font-mono text-sm text-stone-800">
                        {summary}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Export */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs rounded-none border-2 border-stone-900"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export Audit Report
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center font-mono text-stone-500">
                Run simulation to see audit summary
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Essays */}
      <div className="border-2 border-stone-900 bg-white">
        <div className="border-b-2 border-stone-900 px-4 py-2 bg-stone-100">
          <span className="font-mono text-xs uppercase tracking-widest text-stone-600">
            Related Essays
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x-2 divide-stone-200">
          <a href="#" className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
            <span className="font-mono text-sm">The Fiscal Discipline Myth</span>
            <ChevronRight className="h-4 w-4" />
          </a>
          <a href="#" className="p-4 hover:bg-stone-50 transition-colors flex items-center justify-between">
            <span className="font-mono text-sm">Oligarchy and Governance Reform</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
