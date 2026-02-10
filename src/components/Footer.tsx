import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">D</span>
              </div>
              <span className="font-display text-lg font-semibold text-foreground">
                Dika Gustiana
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Finance, accounting, and green transition economics. Research and analysis.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Sections</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/accounting" className="text-muted-foreground hover:text-foreground transition-colors">Accounting</Link></li>
              <li><Link to="/finance-101" className="text-muted-foreground hover:text-foreground transition-colors">Finance</Link></li>
              <li><Link to="/green-transition" className="text-muted-foreground hover:text-foreground transition-colors">Green Transition</Link></li>
              <li><Link to="/the-next-big-thing" className="text-muted-foreground hover:text-foreground transition-colors">The Next Big Thing</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/english-ielts" className="text-muted-foreground hover:text-foreground transition-colors">IELTS Preparation</Link></li>
              <li><Link to="/books-academia" className="text-muted-foreground hover:text-foreground transition-colors">Books</Link></li>
              <li><Link to="/critical-thinking-research" className="text-muted-foreground hover:text-foreground transition-colors">Learning</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Dika Gustiana. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
