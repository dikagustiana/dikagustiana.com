/**
 * FinanceFundamentals — Modern landing page for the Financial Fundamentals curriculum.
 *
 * Route: /finance/fundamentals
 *
 * Displays:
 *  - Hero section with gradient and CTA
 *  - Learning progress bar
 *  - 5 Pillars of Finance Mastery cards (static display)
 *  - DB-backed list of 12 fundamentals
 */

import { Link } from 'react-router-dom';
import { useFinanceFundamentals } from '@/hooks/queries/useFinance';
import { LoadingState } from '@/components/states';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Progress } from '@/components/ui/progress';
import { SEO } from '@/components/SEO';
import {
  Building2,
  Calculator,
  LayoutDashboard,
  RefreshCcw,
  Target,
  ArrowRight,
  Download,
  BookOpen,
  Clock,
} from 'lucide-react';

// ── 5 Pillars data (static editorial content, not curriculum data) ──
const PILLARS = [
  {
    icon: Building2,
    title: 'Finance Foundations',
    subtitle: 'Laying the Groundwork',
    modules: 4,
    hours: '2.5 hours',
    accent: 'navy',
    glow: false,
  },
  {
    icon: Calculator,
    title: 'Valuation Mastery',
    subtitle: 'Speaking the Language of Money',
    modules: 5,
    hours: '4 hours',
    accent: 'teal',
    glow: false,
  },
  {
    icon: LayoutDashboard,
    title: 'FP&A Toolkit',
    subtitle: 'Diagnostics for Decision Making',
    modules: 6,
    hours: '5 hours',
    accent: 'emerald',
    glow: true,
  },
  {
    icon: RefreshCcw,
    title: 'Operational Finance',
    subtitle: 'Working Capital Excellence',
    modules: 5,
    hours: '3.5 hours',
    accent: 'amber',
    glow: false,
  },
  {
    icon: Target,
    title: 'Strategic Finance',
    subtitle: 'Capital Allocation & Value Creation',
    modules: 7,
    hours: '6 hours',
    accent: 'indigo',
    glow: false,
  },
];

const ACCENT_STYLES: Record<string, { card: string; icon: string; badge: string }> = {
  navy: {
    card: 'border-[#0A2540]/20 hover:border-[#0A2540]/40',
    icon: 'bg-[#0A2540]/10 text-[#0A2540]',
    badge: 'bg-[#0A2540]/10 text-[#0A2540]',
  },
  teal: {
    card: 'border-[#00C4B4]/30 hover:border-[#00C4B4]/60',
    icon: 'bg-[#00C4B4]/10 text-[#00C4B4]',
    badge: 'bg-[#00C4B4]/10 text-[#00C4B4]',
  },
  emerald: {
    card: 'border-emerald-400/40 hover:border-emerald-400/70',
    icon: 'bg-emerald-50 text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-600',
  },
  amber: {
    card: 'border-amber-400/30 hover:border-amber-400/60',
    icon: 'bg-amber-50 text-amber-600',
    badge: 'bg-amber-50 text-amber-600',
  },
  indigo: {
    card: 'border-indigo-400/30 hover:border-indigo-400/60',
    icon: 'bg-indigo-50 text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-600',
  },
};

export default function FinanceFundamentals() {
  const { data: fundamentals, isLoading } = useFinanceFundamentals();

  return (
    <>
      <SEO
        title="Finance Fundamentals — Core Concepts"
        description="A structured 12-concept curriculum covering the core concepts every finance professional must master."
      />
      <div className="min-h-screen flex flex-col bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Header />

        <main className="flex-1">
          {/* ── Hero ── */}
          <section
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0A2540 0%, #0d3a5c 40%, #00C4B4 100%)',
            }}
          >
            {/* Subtle chart pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 50 L15 35 L30 42 L45 20 L60 28' fill='none' stroke='white' stroke-width='1.5'/%3E%3Cpath d='M0 55 L15 45 L30 52 L45 30 L60 38' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />

            <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center text-white">
              {/* Progress bar */}
              <div className="mb-8 max-w-sm mx-auto">
                <p className="text-xs text-white/60 mb-2 font-medium tracking-wide uppercase">
                  Your Learning Progress
                </p>
                <div className="flex items-center gap-3">
                  <Progress
                    value={0}
                    className="flex-1 h-2 bg-white/20 [&>div]:bg-[#00C4B4]"
                  />
                  <span className="text-xs text-white/70 font-medium shrink-0">0% Complete</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4 tracking-tight">
                Finance Fundamentals
              </h1>
              <p className="text-xl md:text-2xl text-white/80 mb-4 font-light">
                Core concepts every finance professional must master
              </p>
              <p className="max-w-2xl mx-auto text-white/60 text-sm md:text-base leading-relaxed mb-10">
                Structured 5-pillar learning roadmap based on{' '}
                <em>Fundamentals of Financial Management 13th Edition</em> by Van Horne &amp;
                Wachowicz + practical FP&amp;A applications
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/finance/fundamentals#concepts"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all"
                  style={{ background: '#00C4B4', color: '#0A2540' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#00b3a4')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#00C4B4')}
                >
                  <BookOpen className="h-4 w-4" />
                  Mulai Learning Journey
                </Link>
                <button
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm border border-white/40 text-white hover:bg-white/10 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Full Roadmap PDF
                </button>
              </div>
            </div>
          </section>

          {/* ── 5 Pillars ── */}
          <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0A2540] mb-3">
                  The 5 Pillars of Finance Mastery
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
                  A structured progression from foundational literacy to strategic capital allocation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  const styles = ACCENT_STYLES[pillar.accent];
                  return (
                    <div
                      key={pillar.title}
                      className={`relative rounded-2xl border bg-white p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-200 ${styles.card} ${
                        pillar.glow ? 'ring-2 ring-emerald-400/40 shadow-emerald-100' : ''
                      }`}
                    >
                      {pillar.glow && (
                        <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Featured
                        </span>
                      )}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#0A2540] text-base mb-1">{pillar.title}</h3>
                        <p className="text-muted-foreground text-sm">{pillar.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border/50">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles.badge}`}>
                          {pillar.modules} modules
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {pillar.hours}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Fundamentals Index ── */}
          <section id="concepts" className="py-20 bg-[#f7f9fc]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-[#0A2540] mb-3">
                  Core Concepts
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
                  Twelve foundational concepts, each linking to structured readings and applied exercises.
                </p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingState />
                </div>
              ) : !fundamentals?.length ? (
                <p className="text-center text-muted-foreground py-12">
                  Concepts coming soon. Check back shortly.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fundamentals.map((f) => (
                    <Link
                      key={f.id}
                      to={`/finance/fundamentals/${f.slug}`}
                      className="group flex items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md hover:border-[#00C4B4]/40 transition-all duration-200"
                    >
                      {/* Number */}
                      <span
                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #0A2540, #0d3a5c)', color: '#00C4B4' }}
                      >
                        {String(f.number ?? f.sort_order).padStart(2, '0')}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#0A2540] text-sm md:text-base leading-snug mb-1 group-hover:text-[#00C4B4] transition-colors">
                          {f.title}
                        </h3>
                        {f.thesis && (
                          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2">
                            {f.thesis}
                          </p>
                        )}
                      </div>

                      <ArrowRight className="shrink-0 h-4 w-4 text-muted-foreground/40 group-hover:text-[#00C4B4] group-hover:translate-x-0.5 transition-all mt-1" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-border py-8 bg-white text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Friendly Learning Buddy
          </p>
        </footer>
      </div>
    </>
  );
}
