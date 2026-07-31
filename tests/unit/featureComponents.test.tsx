import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AccountRow } from '@/components/consolidation/AccountRow';
import { KeyConceptCard } from '@/components/consolidation/KeyConceptCard';
import { CapitalLayerCard } from '@/components/finance/CapitalLayerCard';
import { FormulaBlock } from '@/components/finance/FormulaBlock';
import { WhatChangedPanel } from '@/components/tracker/WhatChangedPanel';

function tableWrap(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  );
}

describe('AccountRow (Accounting consolidation)', () => {
  it('renders a header row spanning all columns', () => {
    tableWrap(<AccountRow label="CURRENT ASSETS" values={[]} isHeader />);
    const cell = screen.getByText('CURRENT ASSETS');
    expect(cell).toHaveAttribute('colspan', '8');
  });

  it('renders values and a dash for empty/null/undefined', () => {
    tableWrap(
      <AccountRow
        label="Cash"
        values={[100, null, '']}
        combined={100}
        elimination={undefined}
        consolidated={100}
      />,
    );
    const row = screen.getByText('Cash').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    // label + 3 values + combined + elimination + consolidated = 7 cells
    expect(cells).toHaveLength(7);
    expect(within(row).getAllByText('—').length).toBe(3); // null, '' , undefined elimination
  });
});

describe('KeyConceptCard (consolidation)', () => {
  it('renders title and description', () => {
    render(<KeyConceptCard title="Goodwill" description="Excess of cost over fair value." />);
    expect(screen.getByText('Goodwill')).toBeInTheDocument();
    expect(screen.getByText(/Excess of cost/)).toBeInTheDocument();
  });
});

describe('CapitalLayerCard (Finance)', () => {
  it('renders the layer number, name and narrative', () => {
    render(<CapitalLayerCard layerNumber="01" layerName="Senior Debt" narrative="Lowest risk." />);
    expect(screen.getByText(/Layer 01/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Senior Debt' })).toBeInTheDocument();
    expect(screen.getByText('Lowest risk.')).toBeInTheDocument();
  });
});

describe('FormulaBlock (math rendering)', () => {
  it('renders KaTeX output for a block formula with a label', () => {
    const { container } = render(<FormulaBlock formula="a^2 + b^2 = c^2" label="Pythagoras" />);
    expect(screen.getByText('Pythagoras')).toBeInTheDocument();
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('renders inline without the bordered wrapper', () => {
    const { container } = render(<FormulaBlock formula="x" inline />);
    expect(container.querySelector('span .katex, span.katex')).toBeTruthy();
  });

  it('does not throw on invalid LaTeX (throwOnError=false)', () => {
    expect(() => render(<FormulaBlock formula="\\frac{" />)).not.toThrow();
  });
});

describe('WhatChangedPanel (Green Transition tracker)', () => {
  it('shows the first-issue message when there is no previous reading', () => {
    render(
      <WhatChangedPanel changed={[]} held={[]} reversed={[]} previousReading="" currentReading="A" />,
    );
    expect(screen.getByText(/first issue/i)).toBeInTheDocument();
  });

  it('renders changed/held/reversed columns and a comparison label', () => {
    render(
      <WhatChangedPanel
        changed={['Thesis A flipped']}
        held={['Thesis B holds']}
        reversed={[]}
        previousReading="Q1"
        currentReading="Q2"
        issueLabel="Issue 2"
        previousLabel="Issue 1"
      />,
    );
    expect(screen.getByText(/Comparison: Q1 → Q2/)).toBeInTheDocument();
    expect(screen.getByText('Issue 2 vs Issue 1')).toBeInTheDocument();
    expect(screen.getByText('Thesis A flipped')).toBeInTheDocument();
    expect(screen.getByText('Thesis B holds')).toBeInTheDocument();
    // 'Reversed' column is empty -> a dash
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
