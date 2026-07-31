import { Logo } from './header/Logo';
import { MainNav } from './header/MainNav';
import { MobileNav } from './header/MobileNav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-header border-b border-header/20">
      <div className="container max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />
        <MainNav />
        <MobileNav />
      </div>
    </header>
  );
}
