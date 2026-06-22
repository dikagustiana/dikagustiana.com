import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/states";

// Pages — lazy-loaded so each route ships its own chunk and heavy libraries
// (editor, charts, math) only download when a route that needs them is visited.
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const Accounting = lazy(() => import("./pages/Accounting"));
const GreenTransition = lazy(() => import("./pages/GreenTransition"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DevelopmentFinance = lazy(() => import("./pages/DevelopmentFinance"));
const DevelopmentFinancePhase = lazy(() => import("./pages/DevelopmentFinancePhase"));
const DevelopmentFinanceEssayPage = lazy(() => import("./pages/DevelopmentFinanceEssayPage"));
const ClimateFinance = lazy(() => import("./pages/ClimateFinance"));

// FSLI
const FsliList = lazy(() => import("./pages/FsliList"));
const FsliDetail = lazy(() => import("./pages/FsliDetail"));

// Accounting
const ConsolidatedReporting = lazy(() => import("./pages/ConsolidatedReporting"));
const StatutoryReporting = lazy(() => import("./pages/StatutoryReporting"));
const ConsolidationDetail = lazy(() => import("./pages/ConsolidationDetail"));

// Finance
const FinanceWorkspace = lazy(() => import("./pages/FinanceWorkspace"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));

// Forecasting
const ForecastingInput = lazy(() => import("./pages/ForecastingInput"));
const ForecastingAssumptions = lazy(() => import("./pages/ForecastingAssumptions"));
const ForecastingOutput = lazy(() => import("./pages/ForecastingOutput"));

// Green Transition
const GreenTransitionPhase = lazy(() => import("./pages/GreenTransitionPhase"));
const GreenTransitionEssayPage = lazy(() => import("./pages/GreenTransitionEssayPage"));
const GreenTransitionTracker = lazy(() => import("./pages/GreenTransitionTracker"));
const GreenTransitionTrackerDetail = lazy(() => import("./pages/GreenTransitionTrackerDetail"));
const GreenTransitionTrackerArchive = lazy(() => import("./pages/GreenTransitionTrackerArchive"));
const GreenTransitionTrackerEssay = lazy(() => import("./pages/GreenTransitionTrackerEssay"));

// Learning
const CriticalThinkingResearch = lazy(() => import("./pages/CriticalThinkingResearch"));
const CriticalThinkingPhase = lazy(() => import("./pages/CriticalThinkingPhase"));
const CriticalThinkingEssay = lazy(() => import("./pages/CriticalThinkingEssay"));
const BooksAcademia = lazy(() => import("./pages/BooksAcademia"));
const BooksCategories = lazy(() => import("./pages/BooksCategories"));
const BooksList = lazy(() => import("./pages/BooksList"));
const BookReader = lazy(() => import("./pages/BookReader"));
const EnglishIelts = lazy(() => import("./pages/EnglishIelts"));

// Admin/Tools
const DikasTools = lazy(() => import("./pages/DikasTools"));
const PersonalFinance = lazy(() => import("./pages/PersonalFinance"));
const ModelPlatform = lazy(() => import("./pages/ModelPlatform"));
const ModelTest = lazy(() => import("./pages/ModelTest"));
const Settings = lazy(() => import("./pages/Settings"));
const DebugAuth = lazy(() => import("./pages/DebugAuth"));
const AdminHealth = lazy(() => import("./pages/AdminHealth"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAuditLog = lazy(() => import("./pages/AdminAuditLog"));
const RemoraTrading = lazy(() => import("./pages/RemoraTrading"));
const DikaQuantEngine = lazy(() => import("./pages/DikaQuantEngine"));
const TheNextBigThing = lazy(() => import("./pages/TheNextBigThing"));
const NextBigThingEssayPage = lazy(() => import("./pages/NextBigThingEssayPage"));
const FinanceEssayPage = lazy(() => import("./pages/FinanceEssayPage"));
const FinanceLanding = lazy(() => import("./pages/FinanceLanding"));
const FinanceInMotion = lazy(() => import("./pages/FinanceInMotion"));
const CapitalConditionDetail = lazy(() => import("./pages/CapitalConditionDetail"));
const FinanceTrackIndex = lazy(() => import("./pages/FinanceTrackIndex"));
const FinanceInActionIndex = lazy(() => import("./pages/FinanceInActionIndex"));
const FinanceModelDetail = lazy(() => import("./pages/FinanceModelDetail"));
const FinanceModulePage = lazy(() => import("./pages/FinanceModulePage"));
const AdminEditorRedirect = lazy(() => import("./pages/AdminEditorRedirect"));
const WriterEditorPage = lazy(() => import("./pages/WriterEditorPage"));
const WriterListPage = lazy(() => import("./pages/WriterListPage"));

// Canonical Writer Studio (lazy-loaded)
const WriterStudio = lazy(() => import("./domains/writing/WriterStudio"));

const queryClient = new QueryClient();

const FinanceEssayLegacyRedirect = () => {
  const { slug } = useParams();

  if (slug) {
    return <Navigate to="/finance" replace />;
  }

  return <Navigate to="/finance" replace />;
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
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
            {/* Core */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />

            {/* Accounting */}
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/accounting/fsli" element={<FsliList />} />
            <Route path="/accounting/fsli/:slug" element={<FsliDetail />} />
            <Route path="/accounting/consolidated-reporting" element={<ConsolidatedReporting />} />
            <Route path="/accounting/statutory-reporting" element={<StatutoryReporting />} />
            <Route path="/accounting/consolidation/:topic" element={<ConsolidationDetail />} />

            {/* Finance */}
            <Route path="/finance" element={<FinanceLanding />} />
            <Route path="/finance/finance-in-motion" element={<FinanceInMotion />} />
            <Route path="/finance/capital-in-motion/:conditionSlug" element={<CapitalConditionDetail />} />
            <Route path="/finance/finance-in-action" element={<FinanceInActionIndex />} />
            <Route path="/finance/finance-in-action/:modelSlug" element={<FinanceModelDetail />} />
            <Route path="/finance/:track" element={<FinanceTrackIndex />} />
            <Route path="/finance/:track/:moduleSlug" element={<FinanceModulePage />} />
            <Route path="/finance/:track/:moduleSlug/:essaySlug" element={<FinanceEssayPage />} />

            {/* Legacy redirects */}
            <Route path="/finance-101" element={<Navigate to="/finance" replace />} />
            <Route path="/finance-101/financial-analytics" element={<Navigate to="/finance/analytics" replace />} />
            <Route path="/finance-101/financial-analytics/:topic" element={<Navigate to="/finance/analytics" replace />} />
            <Route path="/finance-101/financial-planning-forecasting" element={<Navigate to="/finance/planning" replace />} />
            <Route path="/finance-101/budgeting" element={<Navigate to="/finance/planning/budget-architecture" replace />} />
            <Route path="/finance-101/cfa-prep" element={<Navigate to="/finance/fundamentals" replace />} />
            <Route path="/finance-101/essays/:slug" element={<FinanceEssayLegacyRedirect />} />

            {/* Finance Workspace (admin-only) */}
            <Route path="/finance-workspace" element={<RequireAdmin><FinanceWorkspace /></RequireAdmin>} />
            <Route path="/executive-dashboard" element={<RequireAdmin><ExecutiveDashboard /></RequireAdmin>} />

            {/* Forecasting (admin-only) */}
            <Route path="/forecasting/input" element={<RequireAdmin><ForecastingInput /></RequireAdmin>} />
            <Route path="/forecasting/assumptions" element={<RequireAdmin><ForecastingAssumptions /></RequireAdmin>} />
            <Route path="/forecasting/output" element={<RequireAdmin><ForecastingOutput /></RequireAdmin>} />

            {/* Green Transition */}
            <Route path="/green-transition" element={<GreenTransition />} />
            <Route path="/green-transition/climate-finance" element={<ClimateFinance />} />
            <Route path="/green-transition/climate-finance/:slug" element={<GreenTransitionEssayPage />} />
            <Route path="/green-transition/tracker" element={<GreenTransitionTracker />} />
            <Route path="/green-transition/tracker/archive" element={<GreenTransitionTrackerArchive />} />
            <Route path="/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug" element={<GreenTransitionTrackerEssay />} />
            <Route path="/green-transition/tracker/:issueSlug" element={<GreenTransitionTrackerDetail />} />
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
            <Route path="/books/categories" element={<BooksCategories />} />
            <Route path="/books/:category" element={<BooksList />} />
            <Route path="/books/:category/:bookId/read" element={<BookReader />} />

            {/* English IELTS */}
            <Route path="/english-ielts" element={<EnglishIelts />} />

            {/* Admin-only tools */}
            <Route path="/personal-finance" element={<RequireAdmin><PersonalFinance /></RequireAdmin>} />
            <Route path="/dikas-tools" element={<RequireAdmin><DikasTools /></RequireAdmin>} />
            <Route path="/dikas-tools/remora-trading" element={<RequireAdmin><RemoraTrading /></RequireAdmin>} />
            <Route path="/dikas-tools/quant-engine" element={<RequireAdmin><DikaQuantEngine /></RequireAdmin>} />
            <Route path="/model" element={<RequireAdmin><ModelPlatform /></RequireAdmin>} />
            <Route path="/model/test" element={<RequireAdmin><ModelTest /></RequireAdmin>} />
            <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            <Route path="/debug/auth" element={<RequireAdmin><DebugAuth /></RequireAdmin>} />
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/health" element={<RequireAdmin><AdminHealth /></RequireAdmin>} />
            <Route path="/admin/content" element={<RequireAdmin><AdminContent /></RequireAdmin>} />
            <Route path="/admin/audit-log" element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />


            {/* Canonical Writer Studio — single editor for all essays */}
            <Route path="/admin/writer/:id" element={
              <RequireAdmin>
                <WriterStudio />
              </RequireAdmin>
            } />

            {/* Section-scoped writer list and editor */}
            <Route path="/admin/writer/:section/list" element={<RequireAdmin><WriterListPage /></RequireAdmin>} />
            <Route path="/admin/writer/:section/:slug" element={<RequireAdmin><WriterEditorPage /></RequireAdmin>} />

            {/* Legacy admin editor routes → redirect to Writer Studio */}
            <Route path="/admin/content/:id" element={<RequireAdmin><AdminEditorRedirect /></RequireAdmin>} />

            {/* Public essay pages */}
            <Route path="/the-next-big-thing" element={<TheNextBigThing />} />
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
