import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  createLeagueMatcher,
  normalizeLeagueName,
  persistLeagueFilterStorage,
  readSelectedLeagueIdsFromStorage,
  readStoredLeagueOptions,
  StoredLeagueOption,
} from "@/lib/leagueFilter";

export interface LeagueOption extends StoredLeagueOption {
  bandeira: string;
  totalJogos?: number;
  source?: "fixed" | "dynamic";
}

interface RegisterLeagueInput {
  id: string;
  nome: string;
  bandeira?: string;
  apiId?: number;
  totalJogos?: number;
  aliases?: string[];
}

interface LeagueFilterContextType {
  leagueOptions: LeagueOption[];
  selectedLeagueIds: string[];
  selectedLeague: string | null;
  setSelectedLeague: (league: string | null) => void;
  setSelectedLeagues: (ids: string[]) => void;
  toggleLeague: (id: string) => void;
  clearSelectedLeagues: () => void;
  isLeagueAllowed: (leagueName: string, leagueApiId?: number) => boolean;
  registerDynamicLeague: (league: RegisterLeagueInput) => void;
}

export const FIXED_LEAGUES: LeagueOption[] = [
  { id: "brasileirao-a", nome: "Brasileirão A", bandeira: "🇧🇷", source: "fixed", aliases: ["serie a brasil", "brasileirao serie a", "campeonato brasileiro"] },
  { id: "serie-b", nome: "Série B", bandeira: "🇧🇷", source: "fixed", aliases: ["brasileirao serie b", "serie b brasil", "campeonato brasileiro b"] },
  { id: "copa-do-brasil", nome: "Copa do Brasil", bandeira: "🇧🇷", source: "fixed" },
  { id: "brasileirao-fem", nome: "Brasileirão Fem.", bandeira: "🇧🇷", source: "fixed", aliases: ["brasileirao feminino", "campeonato brasileiro feminino"] },
  { id: "copa-do-brasil-fem", nome: "Copa BR Fem.", bandeira: "🇧🇷", source: "fixed", aliases: ["copa do brasil feminino", "copa br feminina"] },
  { id: "champions-league", nome: "Champions League", bandeira: "🏆", source: "fixed", aliases: ["uefa champions league"] },
  { id: "europa-league", nome: "Europa League", bandeira: "🟠", source: "fixed", aliases: ["uefa europa league"] },
  { id: "premier-league", nome: "Premier League", bandeira: "🏴", source: "fixed", aliases: ["england premier league", "epl"] },
  { id: "la-liga", nome: "La Liga", bandeira: "🇪🇸", source: "fixed", aliases: ["laliga", "primera division"] },
  { id: "serie-a-it", nome: "Serie A", bandeira: "🇮🇹", source: "fixed", aliases: ["italy serie a"] },
  { id: "bundesliga", nome: "Bundesliga", bandeira: "🇩🇪", source: "fixed", aliases: ["germany bundesliga"] },
  { id: "ligue-1", nome: "Ligue 1", bandeira: "🇫🇷", source: "fixed", aliases: ["france ligue 1"] },
  { id: "liga-argentina", nome: "Super Liga Argentina", bandeira: "🇦🇷", source: "fixed", aliases: ["liga argentina", "superliga argentina", "argentina primera division", "liga profesional argentina"] },
  { id: "mls", nome: "MLS", bandeira: "🇺🇸", source: "fixed", aliases: ["major league soccer"] },
  { id: "liga-mx", nome: "Liga MX", bandeira: "🇲🇽", source: "fixed", aliases: ["liga mexicana"] },
  { id: "liga-mx-fem", nome: "Liga MX Fem.", bandeira: "🇲🇽", source: "fixed", aliases: ["liga mx femenino", "liga mx feminina"] },
  { id: "libertadores", nome: "Libertadores", bandeira: "🌎", source: "fixed", aliases: ["copa libertadores", "conmebol libertadores"] },
  { id: "sul-americana", nome: "Sul-Americana", bandeira: "🥈", source: "fixed", aliases: ["copa sul-americana", "conmebol sudamericana"] },
];

const LeagueFilterContext = createContext<LeagueFilterContextType | null>(null);
const FIXED_ORDER = FIXED_LEAGUES.map((l) => l.id);

function toStoredOption(league: LeagueOption): StoredLeagueOption {
  return {
    id: league.id,
    nome: league.nome,
    apiId: league.apiId,
    aliases: league.aliases,
  };
}

function sortLeagues(a: LeagueOption, b: LeagueOption): number {
  const ai = FIXED_ORDER.indexOf(a.id);
  const bi = FIXED_ORDER.indexOf(b.id);

  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }

  return a.nome.localeCompare(b.nome, "pt-BR");
}

export function LeagueFilterProvider({ children }: { children: ReactNode }) {
  const [leagueMap, setLeagueMap] = useState<Record<string, LeagueOption>>(() => {
    const map: Record<string, LeagueOption> = {};

    FIXED_LEAGUES.forEach((league) => {
      map[league.id] = league;
    });

    const stored = readStoredLeagueOptions();
    stored.forEach((league) => {
      if (!map[league.id]) {
        map[league.id] = {
          id: league.id,
          nome: league.nome,
          apiId: league.apiId,
          aliases: league.aliases,
          bandeira: "🏟️",
          source: "dynamic",
        };
      }
    });

    return map;
  });

  const [selectedLeagueIds, setSelectedLeagueIds] = useState<string[]>(() => {
    const initial = readSelectedLeagueIdsFromStorage();
    return initial.filter((id) => typeof id === "string");
  });

  const leagueOptions = useMemo(() => Object.values(leagueMap).sort(sortLeagues), [leagueMap]);

  const persist = useCallback(
    (nextIds: string[], nextMap: Record<string, LeagueOption>) => {
      const leagues = Object.values(nextMap).map(toStoredOption);
      persistLeagueFilterStorage({ selectedLeagueIds: nextIds, leagues });
    },
    [],
  );

  const toggleLeague = useCallback(
    (id: string) => {
      setSelectedLeagueIds((prev) => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
        persist(next, leagueMap);
        return next;
      });
    },
    [leagueMap, persist],
  );

  const setSelectedLeagues = useCallback(
    (ids: string[]) => {
      const next = Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
      setSelectedLeagueIds(next);
      persist(next, leagueMap);
    },
    [leagueMap, persist],
  );

  const clearSelectedLeagues = useCallback(() => {
    setSelectedLeagueIds([]);
    persist([], leagueMap);
  }, [leagueMap, persist]);

  const selectedLeague = useMemo(() => {
    if (selectedLeagueIds.length !== 1) return null;
    const only = leagueMap[selectedLeagueIds[0]];
    return only?.nome ?? null;
  }, [selectedLeagueIds, leagueMap]);

  const setSelectedLeague = useCallback(
    (league: string | null) => {
      if (!league) {
        setSelectedLeagueIds([]);
        persist([], leagueMap);
        return;
      }

      const norm = normalizeLeagueName(league);
      const found = Object.values(leagueMap).find((item) => normalizeLeagueName(item.nome) === norm);

      if (!found) {
        setSelectedLeagueIds([]);
        persist([], leagueMap);
        return;
      }

      setSelectedLeagueIds([found.id]);
      persist([found.id], leagueMap);
    },
    [leagueMap, persist],
  );

  const registerDynamicLeague = useCallback((league: RegisterLeagueInput) => {
    if (!league?.nome) return;

    setLeagueMap((prev) => {
      const next = { ...prev };
      const prevCount = Object.keys(prev).length;

      const leagueNorm = normalizeLeagueName(league.nome);
      const existingByApi = typeof league.apiId === "number"
        ? Object.values(next).find((item) => item.apiId === league.apiId)
        : undefined;
      const existingByName = Object.values(next).find((item) => normalizeLeagueName(item.nome) === leagueNorm);

      const targetId = existingByApi?.id
        || existingByName?.id
        || league.id
        || (typeof league.apiId === "number" ? `api-${league.apiId}` : `league-${leagueNorm}`);

      next[targetId] = {
        id: targetId,
        nome: league.nome,
        bandeira: league.bandeira || next[targetId]?.bandeira || "🏟️",
        apiId: league.apiId ?? next[targetId]?.apiId,
        totalJogos: typeof league.totalJogos === "number" ? league.totalJogos : next[targetId]?.totalJogos,
        aliases: league.aliases ?? next[targetId]?.aliases,
        source: next[targetId]?.source || "dynamic",
      };

      const allPreviouslySelected = selectedLeagueIds.length > 0 && selectedLeagueIds.length === prevCount;
      if (allPreviouslySelected && !selectedLeagueIds.includes(targetId)) {
        const nextSelected = [...selectedLeagueIds, targetId];
        setSelectedLeagueIds(nextSelected);
        persist(nextSelected, next);
      } else {
        persist(selectedLeagueIds, next);
      }
      return next;
    });
  }, [persist, selectedLeagueIds]);

  const isLeagueAllowed = useCallback(
    (leagueName: string, leagueApiId?: number) => {
      const selectedOptions = selectedLeagueIds
        .map((id) => leagueMap[id])
        .filter((item): item is LeagueOption => Boolean(item))
        .map(toStoredOption);

      const matcher = createLeagueMatcher(selectedLeagueIds, selectedOptions);
      return matcher(leagueName, leagueApiId);
    },
    [selectedLeagueIds, leagueMap],
  );

  const value = useMemo<LeagueFilterContextType>(() => ({
    leagueOptions,
    selectedLeagueIds,
    selectedLeague,
    setSelectedLeague,
    setSelectedLeagues,
    toggleLeague,
    clearSelectedLeagues,
    isLeagueAllowed,
    registerDynamicLeague,
  }), [
    leagueOptions,
    selectedLeagueIds,
    selectedLeague,
    setSelectedLeague,
    setSelectedLeagues,
    toggleLeague,
    clearSelectedLeagues,
    isLeagueAllowed,
    registerDynamicLeague,
  ]);

  return <LeagueFilterContext.Provider value={value}>{children}</LeagueFilterContext.Provider>;
}

export function useLeagueFilter() {
  const ctx = useContext(LeagueFilterContext);
  if (!ctx) {
    throw new Error("useLeagueFilter deve ser usado dentro de LeagueFilterProvider");
  }
  return ctx;
}
