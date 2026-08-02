import { Link } from 'react-router-dom';
import { Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4" aria-label="Home">
              <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            </Link>
            {/* The owner's tagline, verbatim. The standalone name heading is
                gone — the name appears only where LinkedIn or email is
                attached (owner's rule; reversible in one line). */}
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              A practitioner and (trying to be a good) problem solver by day; a
              sketcher of Indonesia&rsquo;s industrialization by night.
            </p>
            <div className="flex flex-col gap-2">
              <a href="https://www.linkedin.com/in/dika-gustiana-irawan/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-sm inline-flex items-center gap-2">
                <Linkedin className="h-4 w-4" aria-label="LinkedIn" />
                <span>Dika Gustiana Irawan · LinkedIn</span>
              </a>
              <a href="mailto:dika.g.irawan@gmail.com" className="text-muted-foreground hover:text-foreground transition-colors text-sm inline-flex items-center gap-2">
                <Mail className="h-4 w-4" aria-label="Email" />
                <span>dika.g.irawan@gmail.com</span>
              </a>
            </div>
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
          <p>&copy; {new Date().getFullYear()} dikagustiana.com. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
