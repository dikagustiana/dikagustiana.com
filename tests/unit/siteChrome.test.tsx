/**
 * The header's row and the footer after About (owner decision D4(a),
 * 2026-10-10): neither names a page that is gone. The phone's drawer is
 * drawn from navSections, which navConfig.test.ts holds to the same rule.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('@/hooks/useNavSectionCollapsed', () => ({ useNavSectionCollapsed: () => () => false }));

import { MainNav } from '@/components/header/MainNav';
import { Footer } from '@/components/Footer';

describe('the site chrome', () => {
  it('opens the header row on Home, with no About beside it', () => {
    render(
      <MemoryRouter>
        <MainNav />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = within(nav).getAllByRole('link');
    expect(links[0]).toHaveTextContent('Home');
    expect(links[0]).toHaveAttribute('href', '/');
    expect(within(nav).queryByRole('link', { name: 'About' })).toBeNull();
  });

  it('lists the sections in the footer without About', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    const sections = screen.getByRole('heading', { name: 'Sections' }).nextElementSibling as HTMLElement;
    expect(within(sections).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Accounting',
      'Finance',
      'Green Transition',
      'The Next Big Thing',
      'Development Finance',
    ]);
    expect(screen.queryByRole('link', { name: 'About' })).toBeNull();
  });
});
