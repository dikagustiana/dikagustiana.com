import { Link } from 'react-router-dom';

/**
 * The header mark: icon only, linking home. The wordmark is gone — it wrapped
 * to two lines and made the header taller than the nav — and the logo is a
 * Link, not a button: clicking a logo and not going home is broken behaviour.
 * Sign In lives on the right with the other controls (AuthControl).
 */
export function Logo() {
  return (
    <Link
      to="/"
      aria-label="Home"
      className="flex min-h-[44px] min-w-[44px] items-center hover:opacity-80 transition-opacity"
    >
      <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
    </Link>
  );
}
