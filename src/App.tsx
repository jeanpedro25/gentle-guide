import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MultiplaProvider } from "@/contexts/MultiplaContext";
import { clearFootballCache } from "@/services/footballApi";
import MatchLobby from "./pages/MatchLobby";
import MatchDetail from "./pages/MatchDetail";
import BankrollPage from "./pages/BankrollPage";
import HistoryPage from "./pages/HistoryPage";
import JogueAgoraPage from "./pages/JogueAgoraPage";
import NotFound from "./pages/NotFound";

// Clear old API cache and sessionStorage on app load
clearFootballCache();
sessionStorage.removeItem('selected-fixture');

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <MultiplaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MatchLobby />} />
            <Route path="/match/:id" element={<MatchDetail />} />
            <Route path="/jogar" element={<JogueAgoraPage />} />
            <Route path="/banca" element={<BankrollPage />} />
            <Route path="/historico" element={<HistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MultiplaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
