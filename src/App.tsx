import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/guards/RequireAuth";
import { AnalysisPage } from "./pages/AnalysisPage";
import { AdminInventoryDetailPage } from "./pages/AdminInventoryDetailPage";
import { AIReportPage } from "./pages/AIReportPage";
import { AdminPage } from "./pages/AdminPage";
import { BusinessesPage } from "./pages/BusinessesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegistrationSuccessPage } from "./pages/RegistrationSuccessPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ScoreResultPage } from "./pages/ScoreResultPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubScoresPage } from "./pages/SubScoresPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/registration-success" element={<RegistrationSuccessPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/businesses/:businessId/dashboard" element={<DashboardPage />} />
              <Route path="/businesses/:businessId/score" element={<ScoreResultPage />} />
              <Route path="/businesses/:businessId/sub-scores" element={<SubScoresPage />} />
              <Route path="/businesses/:businessId/inventory-input" element={<AdminInventoryDetailPage />} />
              <Route path="/businesses/:businessId/inventory/new" element={<InventoryPage />} />
              <Route path="/businesses/:businessId/analysis" element={<AnalysisPage />} />
              <Route path="/businesses/:businessId/ai-report" element={<AIReportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/dashboard" element={<Navigate to="/businesses" replace />} />
              <Route path="/inventory" element={<Navigate to="/businesses" replace />} />
              <Route path="/analysis" element={<Navigate to="/businesses" replace />} />
            </Route>

            <Route element={<RequireAuth userOnly />}>
              <Route path="/businesses" element={<BusinessesPage />} />
            </Route>

            <Route element={<RequireAuth adminOnly />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/businesses/:businessId/inventory-input" element={<AdminInventoryDetailPage />} />
              <Route path="/admin/businesses/:businessId/ai-report" element={<AIReportPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
