import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Accounting from "./pages/Accounting";
import Finance101 from "./pages/Finance101";
// MasyarakatBaru removed - sections flattened to direct access
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
import FinancialAnalytics from "./pages/FinancialAnalytics";
import FinancialAnalyticsDetail from "./pages/FinancialAnalyticsDetail";
import FinancialPlanningForecasting from "./pages/FinancialPlanningForecasting";
import Budgeting from "./pages/Budgeting";
import CfaPrep from "./pages/CfaPrep";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";

// Forecasting
import ForecastingInput from "./pages/ForecastingInput";
import ForecastingAssumptions from "./pages/ForecastingAssumptions";
import ForecastingOutput from "./pages/ForecastingOutput";

// Green Transition
import GreenTransitionPhase from "./pages/GreenTransitionPhase";
import GreenTransitionEssayPage from "./pages/GreenTransitionEssayPage";

// Masyarakat Baru children
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
import AdminContentEditor from "./pages/AdminContentEditor";
import AdminDashboard from "./pages/AdminDashboard";
import RemoraTrading from "./pages/RemoraTrading";
import DikaQuantEngine from "./pages/DikaQuantEngine";
import TheNextBigThing from "./pages/TheNextBigThing";
import WriterListPage from "./pages/WriterListPage";
import WriterEditorPage from "./pages/WriterEditorPage";
import NextBigThingEssayPage from "./pages/NextBigThingEssayPage";

const queryClient = new QueryClient();

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
            <Route path="/auth" element={<Auth />} />
            
            {/* Accounting */}
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/accounting/fsli" element={<FsliList />} />
            <Route path="/accounting/fsli/:slug" element={<FsliDetail />} />
            <Route path="/accounting/consolidated-reporting" element={<ConsolidatedReporting />} />
            <Route path="/accounting/statutory-reporting" element={<StatutoryReporting />} />
            <Route path="/accounting/consolidation/:topic" element={<ConsolidationDetail />} />
            
            {/* Finance */}
            <Route path="/finance-101" element={<Finance101 />} />
            <Route path="/finance-101/financial-analytics" element={<FinancialAnalytics />} />
            <Route path="/finance-101/financial-analytics/:topic" element={<FinancialAnalyticsDetail />} />
            <Route path="/finance-101/financial-planning-forecasting" element={<FinancialPlanningForecasting />} />
            <Route path="/finance-101/budgeting" element={<Budgeting />} />
            <Route path="/finance-101/cfa-prep" element={<CfaPrep />} />
            
            {/* Finance Workspace */}
            <Route path="/finance-workspace" element={<FinanceWorkspace />} />
            <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
            
            {/* Forecasting */}
            <Route path="/forecasting/input" element={<ForecastingInput />} />
            <Route path="/forecasting/assumptions" element={<ForecastingAssumptions />} />
            <Route path="/forecasting/output" element={<ForecastingOutput />} />
            
            {/* Green Transition */}
            <Route path="/green-transition" element={<GreenTransition />} />
            <Route path="/green-transition/now" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/gaps" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/future" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase" element={<GreenTransitionPhase />} />
            <Route path="/green-transition/:phase/:slug" element={<GreenTransitionEssayPage />} />
            
            {/* Legacy Masyarakat Baru routes - redirect to flattened sections */}
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
            
            {/* Admin/Tools */}
            <Route path="/dikas-tools" element={<DikasTools />} />
            <Route path="/dikas-tools/remora-trading" element={<RemoraTrading />} />
            <Route path="/dikas-tools/quant-engine" element={<DikaQuantEngine />} />
            <Route path="/personal-finance" element={<PersonalFinance />} />
            <Route path="/model" element={<ModelPlatform />} />
            <Route path="/model/test" element={<ModelTest />} />
            <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            <Route path="/debug/auth" element={<RequireAdmin><DebugAuth /></RequireAdmin>} />
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="/admin/health" element={<RequireAdmin><AdminHealth /></RequireAdmin>} />
            <Route path="/admin/content" element={<RequireAdmin><AdminContent /></RequireAdmin>} />
            <Route path="/admin/content/:id" element={<RequireAdmin><AdminContentEditor /></RequireAdmin>} />
            <Route path="/admin/writer/:section" element={<RequireAdmin><WriterListPage /></RequireAdmin>} />
            <Route path="/admin/writer/:section/:slug" element={<RequireAdmin><WriterEditorPage /></RequireAdmin>} />
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
