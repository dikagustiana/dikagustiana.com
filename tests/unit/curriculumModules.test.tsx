import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CurriculumEssayRow, type CurriculumEssay } from '@/components/curriculum/CurriculumModules';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));

const essay = (over: Partial<CurriculumEssay>): CurriculumEssay => ({
  id: 'e1',
  slug: 'descartes-doubt',
  title: "Descartes' Doubt: Tearing Down to Rebuild",
  snippet: null,
  author: 'Dika Gustiana',
  published: false,
  read_time: null,
  href: '/foundations-of-knowing/knowing/descartes-doubt',
  ...over,
});

const renderRow = (e: CurriculumEssay) =>
  render(
    <MemoryRouter>
      <CurriculumEssayRow essay={e} isAdmin={false} editSection="critical-thinking" />
    </MemoryRouter>,
  );

/** The essay row shared by the Finance tracks and Foundations of Knowing. */
describe('CurriculumEssayRow', () => {
  it('splits the title at its colon: the front bold, the rest on its own line', () => {
    renderRow(essay({}));
    const front = screen.getByText("Descartes' Doubt");
    expect(front).toHaveClass('font-semibold');
    expect(front.nextElementSibling).toHaveTextContent('Tearing Down to Rebuild');
  });

  it('a planned essay is inert for readers: no link, labelled Planned with its author', () => {
    const { container } = renderRow(essay({}));
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Planned · Dika Gustiana')).toBeInTheDocument();
  });

  it('a published essay links to its page', () => {
    renderRow(essay({ published: true, read_time: '12 min read' }));
    expect(screen.getByRole('link')).toHaveAttribute('href', '/foundations-of-knowing/knowing/descartes-doubt');
    expect(screen.getByText('Published · Dika Gustiana · 12 min read')).toBeInTheDocument();
  });
});
