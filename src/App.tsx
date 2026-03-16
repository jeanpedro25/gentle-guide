import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MultiplaProvider } from "@/contexts/MultiplaContext";
import { clearFootballCache } from "@/services/footballApi";
import MatchLobby from "./pages/MatchLobby";
import MatchDetail from "./pages/MatchDetail";
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MultiplaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
