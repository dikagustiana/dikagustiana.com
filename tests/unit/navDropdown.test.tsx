/**
 * The header's dropdown (src/components/header/NavDropdown.tsx) under a
 * pointer and under a keyboard. The pointer: the menu opens on hover, stays
 * open while the pointer travels from the label to an item, and closes 150 ms
 * after the pointer leaves unless it comes back first; a hover never moves
 * focus. The keyboard: Enter, Space or ArrowDown on the chevron opens it with
 * focus on the first item. Escape, an outside click and an item click close it
 * as before. jsdom lays nothing out, so the seam between the label and the
 * panel is crossed for real in tests/e2e/nav.spec.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { NavDropdown, NAV_DROPDOWN_CLOSE_DELAY_MS } from '@/components/header/NavDropdown';
import { learningItems, nextBigThingItems } from '@/config/navConfig';

function Where() {
  const { pathname, search } = useLocation();
  return <output aria-label="Location">{pathname + search}</output>;
}

/** The Next Big Thing, with a search box elsewhere on the page to hold focus. */
function mount(
  dropdown = (
    <NavDropdown label="The Next Big Thing" items={nextBigThingItems} width="w-44" basePath="/the-next-big-thing" />
  ),
) {
  const utils = render(
    <MemoryRouter>
      <input aria-label="Search" />
      {dropdown}
      <Where />
    </MemoryRouter>,
  );
  return { ...utils, elsewhere: screen.getByRole('textbox', { name: 'Search' }) };
}

const menu = () => screen.queryByRole('menu');
const label = () => screen.getByRole('link', { name: 'The Next Big Thing' });
const chevron = () => screen.getByRole('button', { name: 'The Next Big Thing submenu' });
const item = (name: string) => screen.getByRole('menuitem', { name });

/**
 * The pointer moving from one element to another, as a browser reports it:
 * mouseout on the element left and mouseover on the element entered, each
 * naming the other. React derives onMouseEnter/onMouseLeave from this pair.
 * Synchronous, so the close delay can be measured on fake timers to the
 * millisecond (user-event awaits a timer of its own between steps).
 */
function move(from: Element | null, to: Element) {
  if (from) fireEvent.mouseOut(from, { relatedTarget: to });
  fireEvent.mouseOver(to, { relatedTarget: from });
}
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('NavDropdown under a pointer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens on hover and stays open while the pointer moves from the label to the last item', () => {
    mount();
    move(null, label());
    expect(menu()).toBeInTheDocument();

    move(label(), item('Growth'));
    wait(NAV_DROPDOWN_CLOSE_DELAY_MS * 2);
    expect(menu()).toBeInTheDocument();
  });

  it('closes 150 ms after the pointer leaves, and not before', () => {
    const { elsewhere } = mount();
    expect(NAV_DROPDOWN_CLOSE_DELAY_MS).toBe(150);
    move(null, label());
    move(label(), elsewhere);

    wait(149);
    expect(menu()).toBeInTheDocument();
    wait(1);
    expect(menu()).not.toBeInTheDocument();
  });

  it('stays open when the pointer comes back within 150 ms', () => {
    const { elsewhere } = mount();
    move(null, label());
    move(label(), elsewhere);
    wait(100);

    move(elsewhere, item('Growth'));
    wait(NAV_DROPDOWN_CLOSE_DELAY_MS * 2);
    expect(menu()).toBeInTheDocument();
  });

  it('does not move focus when the pointer opens it', () => {
    const { elsewhere } = mount();
    elsewhere.focus();
    move(elsewhere, label());
    expect(menu()).toBeInTheDocument();
    expect(elsewhere).toHaveFocus();

    move(label(), item('Growth'));
    expect(elsewhere).toHaveFocus();
  });

  it('clears a pending close when it unmounts', () => {
    const { elsewhere, unmount } = mount();
    move(null, label());
    const others = vi.getTimerCount();
    move(label(), elsewhere);
    expect(vi.getTimerCount()).toBe(others + 1);

    unmount();
    expect(vi.getTimerCount()).toBe(others);
  });
});

describe('NavDropdown under a keyboard', () => {
  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
    ['ArrowDown', '{ArrowDown}'],
  ])('opens from the keyboard (%s on the chevron) with focus on the first item', async (_name, key) => {
    const user = userEvent.setup();
    mount();
    chevron().focus();
    await user.keyboard(key);
    expect(menu()).toBeInTheDocument();
    expect(item('Technology')).toHaveFocus();
  });

  it('opens the same way from a label that is itself the menu button (Learning)', async () => {
    const user = userEvent.setup();
    mount(<NavDropdown label="Learning" items={learningItems} width="w-48" />);
    screen.getByRole('button', { name: 'Learning' }).focus();
    await user.keyboard('{Enter}');
    expect(item('Critical Thinking')).toHaveFocus();
  });

  it('keeps Escape: closes and returns focus to the chevron', async () => {
    const user = userEvent.setup();
    mount();
    chevron().focus();
    await user.keyboard('{Enter}');
    expect(item('Technology')).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(menu()).not.toBeInTheDocument();
    expect(chevron()).toHaveFocus();
  });

  it('keeps the outside click and the item click closing it', async () => {
    const user = userEvent.setup();
    const { elsewhere } = mount();
    chevron().focus();
    await user.keyboard('{Enter}');
    await user.click(elsewhere);
    expect(menu()).not.toBeInTheDocument();

    chevron().focus();
    await user.keyboard('{Enter}');
    await user.click(item('Growth'));
    expect(menu()).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Location' })).toHaveTextContent('/the-next-big-thing?theme=growth');
  });
});
