import { Logo } from './header/Logo';
import { MainNav } from './header/MainNav';
import { MobileNav } from './header/MobileNav';

/**
 * DESKTOP CAPACITY. The header row and the navigation inside it both wrap.
 *
 * The row is sized in rem, so it grows with a reader's default font — and the
 * seven navigation labels grow with it, in a flex row that did not wrap.
 * Measured on /about at a 24px root font: the navigation ran to 1,394px inside
 * a 1,348px page and gave the whole document a horizontal scrollbar; at 28px it
 * ran to 1,591px at every width tested, up to 1,440. A reader who has asked for
 * larger text is the last reader who should have to scroll sideways to find the
 * navigation.
 *
 * Wrapping rather than hiding, because nothing here is optional: every label is
 * a section of the site, and a capacity problem solved by dropping items solves
 * it by making destinations unreachable. At the default font size nothing moves
 * — the row is one line at every width from 1024 to 1440, exactly as before.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-header border-b border-header/20">
      <div className="container max-w-[1920px] mx-auto flex min-h-16 flex-wrap items-center justify-between gap-x-4 px-4">
        <Logo />
        <div className="flex flex-wrap items-center justify-end gap-1">
          <MainNav />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
