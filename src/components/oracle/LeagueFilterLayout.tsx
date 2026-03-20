import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, Menu, UserCircle2, X } from "lucide-react";
import { useBankroll } from "@/hooks/usePredictions";
import { FIXED_LEAGUES, LeagueFilterProvider, useLeagueFilter } from "@/contexts/LeagueFilterContext";
import { normalizeLeagueName } from "@/lib/leagueFilter";

const MENU_ITEMS = [
  { icon: "🔴", label: "Ao Vivo", rota: "/aovivo", badge: "LIVE" },
  { icon: "⚡", label: "Jogue Agora", rota: "/jogar", badge: "TOP" },
  { icon: "📅", label: "Proximos Jogos", rota: "/proximos" },
  { icon: "💰", label: "Minha Banca", rota: "/banca" },
  { icon: "👤", label: "Meu Perfil", rota: "/perfil" },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { leagueOptions, selectedLeagueIds, toggleLeague, clearSelectedLeagues } = useLeagueFilter();
  const [query, setQuery] = useState("");
  const [showAllLeagues, setShowAllLeagues] = useState(false);

  const fixedIds = useMemo(() => new Set(FIXED_LEAGUES.map((league) => league.id)), []);
  const optionIds = useMemo(() => new Set(leagueOptions.map((league) => league.id)), [leagueOptions]);

  useEffect(() => {
    if (selectedLeagueIds.length === 0) return;
    if (optionIds.size === 0) return;

    const hasKnownSelection = selectedLeagueIds.some((id) => optionIds.has(id));
    if (!hasKnownSelection) {
      clearSelectedLeagues();
    }
  }, [selectedLeagueIds, optionIds, clearSelectedLeagues]);

  const fixedLeagues = useMemo(
    () => leagueOptions.filter((league) => fixedIds.has(league.id)),
    [leagueOptions, fixedIds],
  );

  const dynamicLeagues = useMemo(
    () => leagueOptions.filter((league) => !fixedIds.has(league.id)),
    [leagueOptions, fixedIds],
  );

  const visibleLeagues = useMemo(() => {
    const pool = showAllLeagues ? [...fixedLeagues, ...dynamicLeagues] : fixedLeagues;
    const normalizedQuery = normalizeLeagueName(query);

    if (!normalizedQuery) return pool;

    return pool.filter((league) => {
      const leagueNorm = normalizeLeagueName(league.nome);
      return leagueNorm.includes(normalizedQuery);
    });
  }, [showAllLeagues, fixedLeagues, dynamicLeagues, query]);

  return (
    <div className="h-full flex flex-col">
      <nav className="px-0 py-3">
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.rota}
            to={item.rota}
            onClick={onNavigate}
            className={({ isActive }) =>
              `mx-2 mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors border-l-[3px] ${
                isActive
                  ? "bg-[#C9A84C]/12 text-[#C9A84C] border-l-[#C9A84C]"
                  : "text-[#CFCFCF] border-l-transparent hover:bg-white/5"
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-[#C9A84C]/20 text-[#C9A84C]">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 border-t border-[#C9A84C]/40" />

      <div className="px-4 py-3">
        <p className="mb-2 text-[10px] font-bold tracking-[1px] uppercase text-[#C9A84C]">
          Filtrar por Liga
        </p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar liga..."
          className="w-full rounded-md border border-[#444] bg-[#2D2D2D] px-2.5 py-1.5 text-xs text-white placeholder:text-[#8f8f8f] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]/60"
        />

        <div className="mt-2 max-h-[300px] overflow-y-auto pr-1">
          {visibleLeagues.map((league) => {
            const checked = selectedLeagueIds.includes(league.id);

            return (
              <label
                key={league.id}
                className="flex items-center gap-2 py-1 text-xs text-[#CCCCCC] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleLeague(league.id)}
                  className="accent-[#C9A84C]"
                />
                <span>{league.bandeira}</span>
                <span className="truncate">{league.nome}</span>
                <span className="ml-auto text-[10px] text-[#888]">
                  {typeof league.totalJogos === "number" ? league.totalJogos : "—"}
                </span>
              </label>
            );
          })}
        </div>

        <button
          onClick={() => setShowAllLeagues((prev) => !prev)}
          className="mt-2 w-full rounded-md border border-[#444] bg-transparent px-2 py-1.5 text-[11px] text-[#C9A84C] hover:bg-[#C9A84C]/10"
        >
          {showAllLeagues ? "➖ Mostrar apenas ligas principais" : "➕ Ver todas as ligas disponíveis"}
        </button>

        {selectedLeagueIds.length > 0 && (
          <button
            onClick={clearSelectedLeagues}
            className="mt-2 w-full rounded-md border border-[#C9A84C] bg-transparent px-2 py-1.5 text-[11px] text-[#C9A84C] hover:bg-[#C9A84C]/10"
          >
            Limpar filtros ({selectedLeagueIds.length})
          </button>
        )}
      </div>
    </div>
  );
}

function LeagueFilterShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { data: bankroll } = useBankroll();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const bankrollLabel = useMemo(() => {
    const amount = bankroll?.amount ?? 200;
    return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }, [bankroll?.amount]);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <header className="fixed top-0 inset-x-0 z-[70] h-14 border-b border-[#2B2B2B] bg-[#111111]/95 backdrop-blur">
        <div className="h-full px-3 md:px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded border border-[#3B3B3B] text-[#CFCFCF]"
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-extrabold tracking-wide text-[#F5F5F5]">PROFETA BET</span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <span className="rounded-md border border-[#C9A84C]/60 px-2 py-1 text-[11px] font-semibold text-[#C9A84C]">
              banca: {bankrollLabel}
            </span>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#3B3B3B] text-[#CFCFCF]">
              <Bell className="w-4 h-4" />
            </button>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#3B3B3B] text-[#CFCFCF]">
              <UserCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="pt-14">
        <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-[220px] bg-[#1A1A1A] border-r border-[#C9A84C]">
          <SidebarContent />
        </aside>

        <div className={`md:hidden fixed inset-0 z-[80] ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          <button
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-black/60 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
            aria-label="Fechar menu"
          />

          <aside
            className={`absolute left-0 top-0 bottom-0 w-[min(86vw,320px)] bg-[#1A1A1A] border-r border-[#C9A84C] transition-transform ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="h-14 flex items-center justify-between px-3 border-b border-[#2B2B2B]">
              <span className="font-bold text-[#F5F5F5]">MENU</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#3B3B3B] text-[#CFCFCF]"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>

        <main className="md:ml-[220px] h-[calc(100vh-56px)] overflow-y-auto bg-[#111111] p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function LeagueFilterLayout() {
  return (
    <LeagueFilterProvider>
      <LeagueFilterShell />
    </LeagueFilterProvider>
  );
}