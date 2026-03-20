import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DynamicLeague {
  id: string;
  apiId: number;
  nome: string;
  bandeira: string;
}

interface LeagueFilterContextType {
  isLeagueAllowed: (name: string, id: number) => boolean;
  registerDynamicLeague: (league: DynamicLeague) => void;
  selectedLeague: string | null;
  setSelectedLeague: (id: string | null) => void;
  dynamicLeagues: DynamicLeague[];
}

const LeagueFilterContext = createContext<LeagueFilterContextType>({
  isLeagueAllowed: () => true,
  registerDynamicLeague: () => {},
  selectedLeague: null,
  setSelectedLeague: () => {},
  dynamicLeagues: [],
});

export function LeagueFilterProvider({ children }: { children: ReactNode }) {
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [dynamicLeagues, setDynamicLeagues] = useState<DynamicLeague[]>([]);

  const registerDynamicLeague = useCallback((league: DynamicLeague) => {
    setDynamicLeagues(prev => {
      if (prev.some(l => l.id === league.id)) return prev;
      return [...prev, league];
    });
  }, []);

  const isLeagueAllowed = useCallback((_name: string, id: number) => {
    if (!selectedLeague) return true;
    return String(id) === selectedLeague;
  }, [selectedLeague]);

  return (
    <LeagueFilterContext.Provider value={{ isLeagueAllowed, registerDynamicLeague, selectedLeague, setSelectedLeague, dynamicLeagues }}>
      {children}
    </LeagueFilterContext.Provider>
  );
}

export function useLeagueFilter() {
  return useContext(LeagueFilterContext);
}
