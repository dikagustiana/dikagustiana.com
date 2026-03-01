import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { lazy, Suspense } from "react";
import { LoadingState } from "@/components/states";

// Pages
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Accounting from "./pages/Accounting";
import GreenTransition from "./pages/GreenTransition";
import NotFound from "./pages/NotFound";

// FSLI
import FsliList from "./pages/FsliList";
import FsliDetail from "./pages/FsliDetail";

// Accounting
import ConsolidatedReporting from "./pages/ConsolidatedReporting";
import StatutoryReporting from "./pages/StatutoryReporting";
import ConsolidationDetail from "./pages/ConsolidationDetail";

// Finance
import FinanceWorkspace from "./pages/FinanceWorkspace";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";

// Forecasting
import ForecastingInput from "./pages/ForecastingInput";
import ForecastingAssumptions from "./pages/ForecastingAssumptions";
import ForecastingOutput from "./pages/ForecastingOutput";

// Green Transition
import GreenTransitionPhase from "./pages/GreenTransitionPhase";
import GreenTransitionEssayPage from "./pages/GreenTransitionEssayPage";
import GreenTransitionTracker from "./pages/GreenTransitionTracker";
import GreenTransitionTrackerDetail from "./pages/GreenTransitionTrackerDetail";
import GreenTransitionTrackerArchive from "./pages/GreenTransitionTrackerArchive";
import GreenTransitionTrackerEssay from "./pages/GreenTransitionTrackerEssay";

// Learning
import CriticalThinkingResearch from "./pages/CriticalThinkingResearch";
import CriticalThinkingPhase from "./pages/CriticalThinkingPhase";
import CriticalThinkingEssay from "./pages/CriticalThinkingEssay";
import BooksAcademia from "./pages/BooksAcademia";
import BooksCategories from "./pages/BooksCategories";
import BooksList from "./pages/BooksList";
import BookReader from "./pages/BookReader";
import EnglishIelts from "./pages/EnglishIelts";

// Admin/Tools
import DikasTools from "./pages/DikasTools";
import PersonalFinance from "./pages/PersonalFinance";
import ModelPlatform from "./pages/ModelPlatform";
import ModelTest from "./pages/ModelTest";
import Settings from "./pages/Settings";
import DebugAuth from "./pages/DebugAuth";
import AdminHealth from "./pages/AdminHealth";
import AdminContent from "./pages/AdminContent";
import AdminDashboard from "./pages/AdminDashboard";
import RemoraTrading from "./pages/RemoraTrading";
import DikaQuantEngine from "./pages/DikaQuantEngine";
import TheNextBigThing from "./pages/TheNextBigThing";
import NextBigThingEssayPage from "./pages/NextBigThingEssayPage";
import FinanceEssayPage from "./pages/FinanceEssayPage";
import FinanceLanding from "./pages/FinanceLanding";
import FinanceInMotion from "./pages/FinanceInMotion";
import CapitalConditionDetail from "./pages/CapitalConditionDetail";
import FinanceTrackIndex from "./pages/FinanceTrackIndex";
import FinanceInActionIndex from "./pages/FinanceInActionIndex";
import FinanceModelDetail from "./pages/FinanceModelDetail";
import FinanceModulePage from "./pages/FinanceModulePage";
import AdminEditorRedirect from "./pages/AdminEditorRedirect";
import WriterEditorPage from "./pages/WriterEditorPage";
import WriterListPage from "./pages/WriterListPage";

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

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
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
            <Route path="/green-transition/tracker" element={<GreenTransitionTracker />} />
            <Route path="/green-transition/tracker/archive" element={<GreenTransitionTrackerArchive />} />
            <Route path="/green-transition/tracker/:issueSlug/:sectionKey/:entrySlug" element={<GreenTransitionTrackerEssay />} />
            <Route path="/green-transition/tracker/:issueSlug" element={<GreenTransitionTrackerDetail />} />
            <Route path="/green-transition/now" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/gaps" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/future" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase/:slug" element={<GreenTransitionEssayPage />} />

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

            {/* Canonical Writer Studio — single editor for all essays */}
            <Route path="/admin/writer/:id" element={
              <RequireAdmin>
                <Suspense fallback={<div className="flex items-center justify-center h-screen"><LoadingState /></div>}>
                  <WriterStudio />
                </Suspense>
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
