import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MultiplaProvider } from "@/contexts/MultiplaContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { clearFootballCache } from "@/services/footballApi";
import MatchLobby from "./pages/MatchLobby";
import MatchDetail from "./pages/MatchDetail";
import BankrollPage from "./pages/BankrollPage";
import HistoryPage from "./pages/HistoryPage";
import JogueAgoraPage from "./pages/JogueAgoraPage";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { LeagueFilterLayout } from "@/components/oracle/LeagueFilterLayout";

clearFootballCache();
sessionStorage.removeItem('selected-fixture');

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-bold text-lg">Carregando...</div>
    </div>
  );
  if (!user) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary font-bold text-lg">Carregando...</div>
    </div>
  );

  return (
    <Routes>
      <Route path="/welcome" element={user ? <Navigate to="/aovivo" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/aovivo" replace /> : <AuthPage />} />
      <Route element={<ProtectedRoute><LeagueFilterLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/aovivo" replace />} />
        <Route path="/aovivo" element={<MatchLobby />} />
        <Route path="/proximos" element={<MatchLobby />} />
        <Route path="/match/:id" element={<MatchDetail />} />
        <Route path="/jogar" element={<JogueAgoraPage />} />
        <Route path="/banca" element={<BankrollPage />} />
        <Route path="/perfil" element={<HistoryPage />} />
        <Route path="/historico" element={<HistoryPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <MultiplaProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </MultiplaProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;