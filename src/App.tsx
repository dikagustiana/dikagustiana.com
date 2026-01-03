import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Accounting from "./pages/Accounting";
import Finance101 from "./pages/Finance101";
import MasyarakatBaru from "./pages/MasyarakatBaru";
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
import GreenTransitionEssay from "./pages/GreenTransitionEssay";

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
import RemoraTrading from "./pages/RemoraTrading";
import DikaQuantEngine from "./pages/DikaQuantEngine";

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="/green-transition/:phase/:slug" element={<GreenTransitionEssay />} />
            
            {/* Masyarakat Baru */}
            <Route path="/masyarakat-baru" element={<MasyarakatBaru />} />
            <Route path="/masyarakat-baru/english-ielts" element={<EnglishIelts />} />
            <Route path="/masyarakat-baru/books-academia" element={<BooksAcademia />} />
            <Route path="/masyarakat-baru/critical-thinking-research" element={<CriticalThinkingResearch />} />
            
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
            <Route path="/settings" element={<Settings />} />
            <Route path="/debug/auth" element={<DebugAuth />} />
            <Route path="/admin/health" element={<AdminHealth />} />
            
            {/* Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
