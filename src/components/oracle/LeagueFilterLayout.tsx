import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, UserCircle2, X, LayoutDashboard, Zap, Calendar, Wallet, History, User } from "lucide-react";
import { useBankroll } from "@/hooks/usePredictions";
import { FIXED_LEAGUES, useLeagueFilter } from "@/contexts/LeagueFilterContext";
import { normalizeLeagueName } from "@/lib/leagueFilter";
import { useAutoResolveBets } from "@/hooks/useAutoResolveBets";

const MENU_ITEMS = [
  { icon: "🔴", label: "Ao Vivo", rota: "/aovivo", badge: "LIVE" },
  { icon: "⚡", label: "Jogue Agora", rota: "/jogar", badge: "TOP" },
  { icon: "📅", label: "Próximos Jogos", rota: "/proximos" },
  { icon: "💰", label: "Minha Banca", rota: "/banca" },
  { icon: "👤", label: "Meu Perfil", rota: "/perfil" },
  { icon: "📜", label: "Histórico", rota: "/historico" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { leagueOptions, selectedLeagueIds, setSelectedLeagues, clearSelectedLeagues } = useLeagueFilter();
  const [query, setQuery] = useState("");
  const [showAllLeagues, setShowAllLeagues] = useState(true);
  const [pendingLeagueIds, setPendingLeagueIds] = useState<string[]>(selectedLeagueIds);
  const { pathname } = useLocation();

  const fixedIds = useMemo(() => new Set(FIXED_LEAGUES.map((league) => league.id)), []);
  const allLeagueIds = useMemo(() => leagueOptions.map((league) => league.id), [leagueOptions]);
  
  const visibleLeagues = useMemo(() => {
    const pool = showAllLeagues ? leagueOptions : leagueOptions.filter(l => fixedIds.has(l.id));
    const normalizedQuery = normalizeLeagueName(query);
    if (!normalizedQuery) return pool;
    return pool.filter((league) => normalizeLeagueName(league.nome).includes(normalizedQuery));
  }, [showAllLeagues, leagueOptions, query, fixedIds]);

  useEffect(() => {
    setPendingLeagueIds(selectedLeagueIds);
  }, [selectedLeagueIds]);

  const hasChanges = useMemo(() => {
    if (pendingLeagueIds.length !== selectedLeagueIds.length) return true;
    const selectedSet = new Set(selectedLeagueIds);
    return pendingLeagueIds.some((id) => !selectedSet.has(id));
  }, [pendingLeagueIds, selectedLeagueIds]);

  const togglePendingLeague = (id: string) => {
    setPendingLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const applyPendingLeagues = () => {
    if (!hasChanges) return;
    setSelectedLeagues(pendingLeagueIds);
  };

  const clearAllFilters = () => {
    setPendingLeagueIds([]);
    clearSelectedLeagues();
  };

  const selectAllLeagues = () => {
    setPendingLeagueIds(allLeagueIds);
  };

  const deselectAllLeagues = () => {
    setPendingLeagueIds([]);
  };

  return (
    <div className="h-full flex flex-col bg-[#1A1A1A]">
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.rota}
            to={item.rota}
            onClick={onNavigate}
            className={({ isActive }) =>
              `mx-2 mb-1 flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-all border-l-[3px] ${
                isActive
                  ? "bg-[#C9A84C]/10 text-[#C9A84C] border-l-[#C9A84C]"
                  : "text-[#CFCFCF] border-l-transparent hover:bg-white/5"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-[#C9A84C]/20 text-[#C9A84C]">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="mx-4 my-4 border-t border-[#C9A84C]/20" />

        <div className="px-4 space-y-3">
          <p className="text-[10px] font-bold tracking-[1px] uppercase text-[#C9A84C]">
            Filtrar por Liga
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar liga..."
            className="w-full rounded-md border border-[#444] bg-[#2D2D2D] px-3 py-2 text-xs text-white placeholder:text-[#888] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]/50"
          />
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1 scrollbar-hide">
            {visibleLeagues.map((league) => (
              <label key={league.id} className="flex items-center gap-2 py-1.5 text-xs text-[#CCCCCC] cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={pendingLeagueIds.includes(league.id)}
                  onChange={() => togglePendingLeague(league.id)}
                  className="accent-[#C9A84C] w-3.5 h-3.5"
                />
                <span>{league.bandeira}</span>
                <span className="truncate flex-1">{league.nome}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllLeagues}
              className="flex-1 py-2 rounded border border-[#C9A84C]/40 text-[10px] text-[#C9A84C] font-bold uppercase hover:bg-[#C9A84C]/10 transition-colors"
            >
              Selecionar todas
            </button>
            <button
              onClick={deselectAllLeagues}
              className="flex-1 py-2 rounded border border-[#444] text-[10px] text-[#CFCFCF] font-bold uppercase hover:bg-white/5 transition-colors"
            >
              Desmarcar
            </button>
          </div>
          <button
            onClick={applyPendingLeagues}
            disabled={!hasChanges}
            className="w-full py-2 rounded bg-[#C9A84C] text-[11px] text-[#1A1A1A] font-black uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            OK
          </button>
          <button
            onClick={() => setShowAllLeagues(!showAllLeagues)}
            className="w-full text-[10px] text-[#C9A84C] font-bold uppercase hover:underline text-left"
          >
            {showAllLeagues ? "- Ver menos" : "+ Ver todas as ligas"}
          </button>
          {(selectedLeagueIds.length > 0 || pendingLeagueIds.length > 0) && (
            <button
              onClick={clearAllFilters}
              className="w-full py-2 rounded border border-[#C9A84C]/40 text-[10px] text-[#C9A84C] font-bold uppercase hover:bg-[#C9A84C]/10 transition-colors"
            >
              Limpar Filtros ({pendingLeagueIds.length || selectedLeagueIds.length})
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export function LeagueFilterLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: bankroll } = useBankroll();
  const location = useLocation();
  const navigate = useNavigate();

  useAutoResolveBets();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col">
      {/* Header Fixo */}
      <header className="fixed top-0 inset-x-0 z-[70] h-14 border-b border-[#2B2B2B] bg-[#111111]/95 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 border border-[#3B3B3B] rounded">
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-black tracking-tighter text-xl gold-gradient-text cursor-pointer" onClick={() => navigate('/')}>
            PROFETABET
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="text-[#C9A84C] text-[10px] font-bold">BANCA:</span>
            <span className="text-sm font-bold">R$ {(bankroll?.amount ?? 0).toFixed(2)}</span>
          </div>
          <button className="p-2 border border-[#3B3B3B] rounded hover:bg-white/5 transition-colors">
            <Bell className="w-4 h-4 text-[#CFCFCF]" />
          </button>
          <button onClick={() => navigate('/perfil')} className="p-2 border border-[#3B3B3B] rounded hover:bg-white/5 transition-colors">
            <UserCircle2 className="w-4 h-4 text-[#CFCFCF]" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block fixed left-0 top-14 bottom-0 w-[220px] border-r border-[#C9A84C]/40 z-50">
          <SidebarContent />
        </aside>

        {/* Sidebar Mobile (Drawer) */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/80 z-[80] md:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#1A1A1A] border-r border-[#C9A84C] z-[90] md:hidden"
              >
                <div className="h-14 flex items-center justify-between px-4 border-b border-[#2B2B2B]">
                  <span className="font-bold text-[#C9A84C]">MENU</span>
                  <button onClick={() => setMobileOpen(false)} className="p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Conteúdo Principal */}
        <main className="flex-1 md:ml-[220px] min-h-[calc(100vh-56px)] bg-[#111111] p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
