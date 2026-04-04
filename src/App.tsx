import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePageTracking } from "@/hooks/usePageTracking";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Receipts from "./pages/Receipts";
import Transactions from "./pages/Transactions";
import Products from "./pages/Products";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Subscription from "./pages/Subscription";
import LegalNotice from "./pages/LegalNotice";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const { maintenance, loading } = useMaintenanceMode();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  // Allow admin and auth page through
  if (loading) return null;
  if (maintenance.enabled && !isAdmin && location.pathname !== "/auth" && location.pathname !== "/admin") {
    return <Maintenance message={maintenance.message} />;
  }
  return <>{children}</>;
};

const PageTracker = () => {
  usePageTracking();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <PageTracker />
            <MaintenanceGate>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/products" element={<Products />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/mentions-legales" element={<LegalNotice />} />
                <Route path="/legal" element={<LegalNotice />} />
                <Route path="/confidentialite" element={<PrivacyPolicy />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/cgu" element={<TermsOfService />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MaintenanceGate>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
