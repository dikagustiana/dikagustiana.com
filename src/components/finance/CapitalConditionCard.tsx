/**
 * CapitalConditionCard — Institutional condition card.
 * Light theme. Compressed. No decoration. Modular.
 * Supports independent Quantitative Lens and Hypothetical Model toggles.
 */

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export interface HypotheticalModelRow {
  metric: string;
  whatHappened: string;
  whatShouldHaveHappened: string;
}

export interface CapitalCondition {
  id: string;
  number: number;
  title: string;
  case: string;
  tension: string;
  quantitative: string;
  rule: string;
  hypotheticalModel?: HypotheticalModelRow[];
  layer: 'operational' | 'balance-sheet' | 'portfolio' | 'transition' | 'valuation' | 'structural-transformation';
}

interface CapitalConditionCardProps {
  condition: CapitalCondition;
}

export function CapitalConditionCard({ condition }: CapitalConditionCardProps) {
  const [showQuant, setShowQuant] = useState(false);
  const [showModel, setShowModel] = useState(false);

  return (
    <div id={`condition-${condition.number}`} className="py-5 border-b border-border last:border-b-0">
      {/* Number + Title */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
          {String(condition.number).padStart(2, '0')}
        </span>
        <h3 className="text-base font-display font-semibold text-foreground leading-snug">
          {condition.title}
        </h3>
      </div>

      <div className="pl-7 space-y-2.5">
        {/* Case */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Case
          </span>
          <p className="text-sm text-foreground mt-0.5">{condition.case}</p>
        </div>

        {/* Capital Tension */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Capital Tension
          </span>
          <p className="text-sm text-muted-foreground mt-0.5">{condition.tension}</p>
        </div>

        {/* Quantitative Lens — text link toggle */}
        {condition.quantitative && (
          <div>
            {!showQuant ? (
              <button
                onClick={() => setShowQuant(true)}
                className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
              >
                Show Quantitative Lens →
              </button>
            ) : (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                  Quantitative Lens
                </span>
                <p className="text-sm font-mono text-muted-foreground mt-0.5">
                  {condition.quantitative}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Decision Rule */}
        <div className="pt-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-primary/70">
            Decision Rule
          </span>
          <p className="text-sm font-semibold text-primary mt-0.5">
            {condition.rule}
          </p>
        </div>

        {/* Hypothetical Model — text link toggle */}
        <div>
          {!showModel ? (
            <button
              onClick={() => setShowModel(true)}
              className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
            >
              Show Hypothetical Model →
            </button>
          ) : (
            <div className="mt-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mb-2">
                Hypothetical Model
              </span>
              {condition.hypotheticalModel && condition.hypotheticalModel.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">Metric</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">What Happened</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">What Should Have Happened</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {condition.hypotheticalModel.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-3 py-2 text-xs font-medium">{row.metric}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-muted-foreground">{row.whatHappened}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-muted-foreground">{row.whatShouldHaveHappened}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">Metric</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">What Happened</TableHead>
                      <TableHead className="h-8 px-3 text-[10px] font-mono uppercase tracking-wider">What Should Have Happened</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-3 py-2 text-xs font-medium">Capital Outcome</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
