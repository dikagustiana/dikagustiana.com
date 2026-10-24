import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/states";
import { Analytics } from "@vercel/analytics/react";
import { RETIRED_ESSAY_REDIRECTS } from "@/config/retiredEssaySlugs";

// Pages — lazy-loaded so each route ships its own chunk and heavy libraries
// (editor, charts, math) only download when a route that needs them is visited.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Accounting = lazy(() => import("./pages/Accounting"));
const GreenTransition = lazy(() => import("./pages/GreenTransition"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DevelopmentFinance = lazy(() => import("./pages/DevelopmentFinance"));
const DevelopmentFinancePhase = lazy(() => import("./pages/DevelopmentFinancePhase"));
const DevelopmentFinanceEssayPage = lazy(() => import("./pages/DevelopmentFinanceEssayPage"));
const ClimateFinance = lazy(() => import("./pages/ClimateFinance"));

// FSLI
const FsViewer = lazy(() => import("./pages/FsViewer"));
const FsliDetail = lazy(() => import("./pages/FsliDetail"));

// Accounting
const ConsolidatedReporting = lazy(() => import("./pages/ConsolidatedReporting"));
const StatutoryReporting = lazy(() => import("./pages/StatutoryReporting"));
const ConsolidationDetail = lazy(() => import("./pages/ConsolidationDetail"));

// Finance
const FinanceWorkspace = lazy(() => import("./pages/FinanceWorkspace"));

// Green Transition
const GreenTransitionPhase = lazy(() => import("./pages/GreenTransitionPhase"));
const GreenTransitionEssayPage = lazy(() => import("./pages/GreenTransitionEssayPage"));
const GreenTransitionTracker = lazy(() => import("./pages/GreenTransitionTracker"));
const GreenTransitionCurrentCondition = lazy(() => import("./pages/GreenTransitionCurrentCondition"));
const TransitionChartDetail = lazy(() => import("./pages/TransitionChartDetail"));

// Learning
const CriticalThinkingResearch = lazy(() => import("./pages/CriticalThinkingResearch"));
const CriticalThinkingPhase = lazy(() => import("./pages/CriticalThinkingPhase"));
const CriticalThinkingEssay = lazy(() => import("./pages/CriticalThinkingEssay"));
const BooksAcademia = lazy(() => import("./pages/BooksAcademia"));
const BooksCategoryRedirect = lazy(() => import("./pages/BookRedirects").then((m) => ({ default: m.BooksCategoryRedirect })));
const BookRedirect = lazy(() => import("./pages/BookRedirects").then((m) => ({ default: m.BookRedirect })));
const EnglishIelts = lazy(() => import("./pages/EnglishIelts"));

// Admin
const Settings = lazy(() => import("./pages/Settings"));
const DebugAuth = lazy(() => import("./pages/DebugAuth"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const AdminBooks = lazy(() => import("./pages/AdminBooks"));
const AdminTransitionData = lazy(() => import("./pages/AdminTransitionData"));
const TheNextBigThing = lazy(() => import("./pages/TheNextBigThing"));
const NextBigThingEssayPage = lazy(() => import("./pages/NextBigThingEssayPage"));
const FinanceTrackChild = lazy(() => import("./pages/FinanceTrackChild"));
const FinanceLanding = lazy(() => import("./pages/FinanceLanding"));
const FinanceInMotion = lazy(() => import("./pages/FinanceInMotion"));
const CapitalConditionDetail = lazy(() => import("./pages/CapitalConditionDetail"));
const FinanceTrackIndex = lazy(() => import("./pages/FinanceTrackIndex"));
// Kawasan Industri (docs/world/PRD-kawasan-industri.md). __WORLD_KAWASAN__ is a
// compile-time constant like __FIA_PREVIEW__: unset, the route is the 404 page
// and the world's chunk is never emitted.
const KawasanPage = lazy(() => (__WORLD_KAWASAN__ ? import("./pages/world/KawasanPage") : import("./pages/NotFound")));
// Finance in Action v3.1 (docs/company-models/implementation-brief-v3.1.md).
// __FIA_PREVIEW__ and __FIA_LIVE__ are compile-time constants (vite.config.ts).
// Preview: the viewer with its SYNTHETIC fixtures. Live: the same viewer over
// the published packages only, through page modules that import no fixture
// (src/lib/finance-in-action/live.ts), so the fixture chunk is never emitted.
// Neither set: the route renders exactly what it rendered before. The preview
// wins when both are set, and assert-no-synthetic fails that build.
const FinanceInActionIndex = lazy(() =>
  __FIA_PREVIEW__
    ? import("./pages/finance-in-action/FiaIndexPage")
    : __FIA_LIVE__
      ? import("./pages/finance-in-action/FiaLiveIndexPage")
      : import("./pages/FinanceInActionIndex"),
);
const FinanceModelDetail = lazy(() =>
  __FIA_PREVIEW__
    ? import("./pages/finance-in-action/FiaModelRoute")
    : __FIA_LIVE__
      ? import("./pages/finance-in-action/FiaLiveModelRoute")
      : import("./pages/FinanceModelDetail"),
);
const AdminEditorRedirect = lazy(() => import("./pages/AdminEditorRedirect"));
const WriterEditorPage = lazy(() => import("./pages/WriterEditorPage"));
const WriterListPage = lazy(() => import("./pages/WriterListPage"));
const BriefEditorPage = lazy(() => import("./pages/BriefEditorPage"));

// Canonical Writer Studio (lazy-loaded)
const WriterStudio = lazy(() => import("./domains/writing/WriterStudio"));
// Universal essay resolver: /essays/:slug
const EssayBySlug = lazy(() => import("./pages/EssayBySlug"));

const queryClient = new QueryClient();

// /finance-101/essays/:slug used to discard the slug and dump the reader at
// /finance, losing the essay entirely. Hand it to the universal resolver, which
// forwards to the canonical URL or renders the essay when it has no placement.
const FinanceEssayLegacyRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={slug ? `/essays/${slug}` : '/finance'} replace />;
};

// The pre-rename canonical shape (/finance/:track/:module/:essay). The module
// left the address; the universal resolver forwards to the three-segment
// canonical URL and understands old curriculum-code slugs.
const FourSegmentEssayRedirect = () => {
  const { essaySlug } = useParams();
  return <Navigate to={essaySlug ? `/essays/${essaySlug}` : '/finance'} replace />;
};

// Capital in Motion moved from /finance/capital-in-motion/:conditionSlug to sit
// under its section, /finance/capital-allocation/:conditionSlug. A bare
// <Navigate to="…/:conditionSlug"> would send the literal ":conditionSlug",
// so the param is carried across here.
const CapitalConditionLegacyRedirect = () => {
  const { conditionSlug } = useParams();
  return (
    <Navigate
      to={conditionSlug ? `/finance/capital-allocation/${conditionSlug}` : '/finance/capital-allocation'}
      replace
    />
  );
};

// About was removed by owner decision on 10 October 2026; the two sections it
// left on the homepage, the argument and the revision of judgment, were removed
// on 11 October 2026. An old link keeps what it carried: the map's address
// (?lens=&distance=&node=, the contract in useChainUrl.ts, which the homepage's
// map reads too) and its fragment.
const AboutRedirect = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: '/', search, hash }} replace />;
};

// The tracker became one page on 11 October 2026 (docs/spec/01_PRD.md, Part B).
// Its old issue pages land on the issue's section of that page; the archive and
// the 22 entry pages, whose content was rewritten or deleted, land on the page
// itself (owner's answer, docs/spec/00_discovery.md §9).
const TRACKER_ISSUE_ANCHORS = new Set(['q1-2025', 'q2-2025']);
const TrackerIssueRedirect = () => {
  const { issueSlug } = useParams();
  const hash = issueSlug && TRACKER_ISSUE_ANCHORS.has(issueSlug) ? `#${issueSlug}` : '';
  return <Navigate to={{ pathname: '/green-transition/tracker', hash }} replace />;
};

// The transition data layer's PRD names /transition/tracker; the tracker
// lives under its section, so the short address forwards there, a chart's
// address to the chart's page (docs/prd/transition-data-layer, D1).
const TransitionChartRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={slug ? `/green-transition/tracker/chart/${slug}` : '/green-transition/tracker'} replace />;
};

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingState />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Analytics />
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
            {/* Core */}
            <Route path="/" element={<Index />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<AboutRedirect />} />
            <Route path="/auth" element={<Auth />} />

            {/* Accounting */}
            <Route path="/accounting" element={<Accounting />} />
            {/* D4: the statements live at /:company/:period; the old address goes to PHE FY2024. */}
            <Route path="/accounting/fsli" element={<Navigate to="/accounting/fsli/phe/fy2024" replace />} />
            <Route path="/accounting/fsli/:company/:period" element={<FsViewer />} />
            <Route path="/accounting/fsli/:slug" element={<FsliDetail />} />
            <Route path="/accounting/consolidated-reporting" element={<ConsolidatedReporting />} />
            <Route path="/accounting/statutory-reporting" element={<StatutoryReporting />} />
            <Route path="/accounting/consolidation/:topic" element={<ConsolidationDetail />} />

            {/* Finance */}
            <Route path="/finance" element={<FinanceLanding />} />
            <Route path="/finance/capital-allocation" element={<FinanceInMotion />} />
            <Route path="/finance/capital-allocation/:conditionSlug" element={<CapitalConditionDetail />} />
            <Route path="/finance/finance-in-action" element={<FinanceInActionIndex />} />
            <Route path="/finance/finance-in-action/:modelSlug" element={<FinanceModelDetail />} />
            <Route path="/finance/kawasan" element={<KawasanPage />} />
            <Route path="/finance/kawasan/:ticker" element={<KawasanPage />} />
            <Route path="/finance/:track" element={<FinanceTrackIndex />} />
            {/* One route owns /finance/:track/:slug — module page or essay,
                decided by lookup (the two shapes are indistinguishable to the
                router). The essay's canonical URL is these three segments. */}
            <Route path="/finance/:track/:slug" element={<FinanceTrackChild />} />
            {/* The old four-segment address redirects through the universal
                resolver, which forwards to canonical (and understands old
                curriculum-code slugs). */}
            <Route path="/finance/:track/:moduleSlug/:essaySlug" element={<FourSegmentEssayRedirect />} />

            {/* Legacy redirects */}
            <Route path="/finance/finance-in-motion" element={<Navigate to="/finance/capital-allocation" replace />} />
            <Route path="/finance/capital-in-motion/:conditionSlug" element={<CapitalConditionLegacyRedirect />} />
            <Route path="/finance-101" element={<Navigate to="/finance" replace />} />
            <Route path="/finance-101/financial-analytics" element={<Navigate to="/finance/analytics" replace />} />
            <Route path="/finance-101/financial-analytics/:topic" element={<Navigate to="/finance/analytics" replace />} />
            <Route path="/finance-101/financial-planning-forecasting" element={<Navigate to="/finance/planning" replace />} />
            <Route path="/finance-101/budgeting" element={<Navigate to="/finance/planning/budget-architecture" replace />} />
            <Route path="/finance-101/cfa-prep" element={<Navigate to="/finance/fundamentals" replace />} />
            <Route path="/finance-101/essays/:slug" element={<FinanceEssayLegacyRedirect />} />
            {/* Accounting essays archived when a newer version replaced them
                (12 Oct 2026): their old address goes to the line item's page. */}
            {Object.entries(RETIRED_ESSAY_REDIRECTS).map(([slug, to]) => (
              <Route key={slug} path={`/essays/${slug}`} element={<Navigate to={to} replace />} />
            ))}
            {/* Universal essay route: canonical home for placement-less essays,
                redirect to the canonical URL for everything else. */}
            <Route path="/essays/:slug" element={<EssayBySlug />} />

            {/* Finance Workspace (admin-only) */}
            <Route path="/finance-workspace" element={<RequireAdmin><FinanceWorkspace /></RequireAdmin>} />

            {/* Green Transition */}
            <Route path="/green-transition" element={<GreenTransition />} />
            <Route path="/green-transition/climate-finance" element={<ClimateFinance />} />
            <Route path="/green-transition/climate-finance/:slug" element={<GreenTransitionEssayPage />} />
            <Route path="/green-transition/tracker" element={<GreenTransitionTracker />} />
            <Route path="/green-transition/tracker/chart/:slug" element={<TransitionChartDetail />} />
            <Route path="/transition/tracker" element={<Navigate to="/green-transition/tracker" replace />} />
            <Route path="/transition/tracker/:slug" element={<TransitionChartRedirect />} />
            <Route path="/green-transition/tracker/archive" element={<Navigate to="/green-transition/tracker" replace />} />
            <Route path="/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug" element={<Navigate to="/green-transition/tracker" replace />} />
            <Route path="/green-transition/tracker/:issueSlug" element={<TrackerIssueRedirect />} />
            <Route path="/green-transition/current-condition" element={<GreenTransitionCurrentCondition />} />
            <Route path="/green-transition/now" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/gaps" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/future" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase/:slug" element={<GreenTransitionEssayPage />} />

            {/* Development Finance */}
            <Route path="/development-finance" element={<DevelopmentFinance />} />
            <Route path="/development-finance/:phase" element={<DevelopmentFinancePhase />} />
            <Route path="/development-finance/:phase/:slug" element={<DevelopmentFinanceEssayPage />} />

            {/* Legacy Masyarakat Baru routes */}
            <Route path="/masyarakat-baru" element={<Navigate to="/critical-thinking-research" replace />} />
            <Route path="/masyarakat-baru/english-ielts" element={<Navigate to="/english-ielts" replace />} />
            <Route path="/masyarakat-baru/books-academia" element={<Navigate to="/books-academia" replace />} />
            <Route path="/masyarakat-baru/critical-thinking-research" element={<Navigate to="/critical-thinking-research" replace />} />

            {/* Critical Thinking */}
            <Route path="/critical-thinking-research" element={<CriticalThinkingResearch />} />
            <Route path="/critical-thinking-research/:phase" element={<CriticalThinkingPhase />} />
            <Route path="/critical-thinking-research/:phase/:essayId" element={<CriticalThinkingEssay />} />

            {/* Books */}
            <Route path="/books-academia" element={<BooksAcademia />} />
            {/* Retired 9 Oct 2026 (an orphan index with its own taxonomy). Without
                this the URL fell through to /books/:category as an empty
                "Categories" shelf. */}
            <Route path="/books/categories" element={<Navigate to="/books-academia" replace />} />
            {/* The old category and reader pages land on their shelf or book (site cleanup 2026-10, D8). */}
            <Route path="/books/:category" element={<BooksCategoryRedirect />} />
            <Route path="/books/:category/:bookId/read" element={<BookRedirect />} />

            {/* English IELTS */}
            <Route path="/english-ielts" element={<EnglishIelts />} />

            {/* Admin */}
            <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            <Route path="/debug/auth" element={<RequireAdmin><DebugAuth /></RequireAdmin>} />
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/content" element={<RequireAdmin><AdminContent /></RequireAdmin>} />
            <Route path="/admin/audit-log" element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />
            <Route path="/admin/books" element={<RequireAdmin><AdminBooks /></RequireAdmin>} />
            <Route path="/admin/transition-data" element={<RequireAdmin><AdminTransitionData /></RequireAdmin>} />

            {/* Canonical Writer Studio — single editor for all essays */}
            <Route path="/admin/writer/:id" element={
              <RequireAdmin>
                <WriterStudio />
              </RequireAdmin>
            } />

            {/* Section-scoped writer list and editor */}
            <Route path="/admin/writer/:section/list" element={<RequireAdmin><WriterListPage /></RequireAdmin>} />
            <Route path="/admin/writer/:section/:slug" element={<RequireAdmin><WriterEditorPage /></RequireAdmin>} />
            {/* The Brief companion's own surface — a separate component by
                design: it never mounts an editable long body. */}
            <Route path="/admin/writer/:section/:slug/brief" element={<RequireAdmin><BriefEditorPage /></RequireAdmin>} />

            {/* Legacy admin editor routes → redirect to Writer Studio */}
            <Route path="/admin/content/:id" element={<RequireAdmin><AdminEditorRedirect /></RequireAdmin>} />

            {/* The Next Big Thing. The essay's canonical URL is three
                segments — /the-next-big-thing/:theme/:slug — the editorial
                equivalent of /finance/:track/:slug (the theme is the
                category, cached on the row as `phase`). The two-segment
                shape stays as a resolver: it renders the essay when it has
                no theme and redirects to canonical when it does, so links
                minted before the taxonomy opened keep working. */}
            <Route path="/the-next-big-thing" element={<TheNextBigThing />} />
            <Route path="/the-next-big-thing/:theme/:slug" element={<NextBigThingEssayPage />} />
            <Route path="/the-next-big-thing/:slug" element={<NextBigThingEssayPage />} />

            {/* Not Found */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
