import { useState, useMemo, useCallback, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { preloadTeamLogos } from '@/services/teamLogos';
import { useTodayFixtures, useTomorrowFixtures, useWeekFixtures } from '@/hooks/useFixtures';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { TimeTabs, TimeFilter } from '@/components/oracle/TimeTabs';
import { LobbyHeader } from '@/components/oracle/LobbyHeader';
import { LiveMatches } from '@/components/oracle/LiveMatches';
import { LiveAlertBanner } from '@/components/oracle/LiveAlertBanner';
import { BottomNav } from '@/components/oracle/BottomNav';
import { StopLossBanner } from '@/components/oracle/StopLossBanner';
import { MatchFilters, MatchFiltersState, applyMatchFilters } from '@/components/oracle/MatchFilters';
import { MatchListPaginated } from '@/components/oracle/MatchListPaginated';
import { useStopLoss } from '@/hooks/useStopLoss';
import { useBets } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';
import { ApiFixture } from '@/types/fixture';
import { clearFootballCache } from '@/services/footballApi';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MultiplaBar } from '@/components/oracle/MultiplaBar';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'LIVE', 'PEN']);

export default function MatchLobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isLeagueAllowed } = useLeagueFilter();
  
  const initialFilter = location.pathname === '/aovivo' ? 'live' : 'today';
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchFilters, setMatchFilters] = useState<MatchFiltersState>({ league: '', timeOfDay: 'all', sortBy: 'time' });

  const todayQuery = useTodayFixtures();
  const tomorrowQuery = useTomorrowFixtures();
  const weekQuery = useWeekFixtures();
  const liveQuery = useLiveMatches();
  const { data: bets = [] } = useBets();
  const { data: bankroll } = useBankroll();
  const stopLoss = useStopLoss(bets, bankroll?.amount ?? 100, 100);

  useEffect(() => {
    if (location.pathname === '/aovivo') {
      setTimeFilter('live');
    } else if (location.pathname === '/proximos' && timeFilter === 'live') {
      setTimeFilter('today');
    }
  }, [location.pathname]);

  const handleMatchClick = (fixture: ApiFixture) => {
    sessionStorage.setItem('selected-fixture', JSON.stringify(fixture));
    navigate(`/match/${fixture.fixture.id}`);
  };

  const handleForceRefresh = useCallback(async () => {
    clearFootballCache();
    queryClient.removeQueries({ queryKey: ['fixtures'] });
    await Promise.all([
      todayQuery.refetch(),
      tomorrowQuery.refetch(),
      weekQuery.refetch(),
      liveQuery.refetch(),
    ]);
    toast.success('Dados atualizados!');
  }, [todayQuery, tomorrowQuery, weekQuery, liveQuery, queryClient]);

  useEffect(() => {
    const allFixtures = todayQuery.data ?? [];
    const names = allFixtures.flatMap(f => [f.teams.home.name, f.teams.away.name]);
    if (names.length > 0) preloadTeamLogos(names);
  }, [todayQuery.data]);

  const activeQuery = timeFilter === 'today' ? todayQuery
    : timeFilter === 'tomorrow' ? tomorrowQuery
    : timeFilter === 'week' ? weekQuery
    : todayQuery;

  const fixtures: ApiFixture[] = (activeQuery.data as ApiFixture[] | undefined) ?? [];

  const grouped = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = fixtures.filter(f => {
      if (timeFilter === 'live') {
        if (!LIVE_STATUSES.has(f.fixture.status.short)) return false;
      }
      
      if (timeFilter !== 'live') {
        const s = f.fixture.status.short;
        if (s === 'FT' || s === 'AET' || s === 'PEN') return false;
      }

      if (q && !f.teams.home.name.toLowerCase().includes(q) && !f.teams.away.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const groups = new Map<string, { leagueName: string; country: string; fixtures: ApiFixture[] }>();
    for (const f of filtered) {
      const key = f.league.name;
      if (!groups.has(key)) {
        groups.set(key, { leagueName: f.league.name, country: f.league.country, fixtures: [] });
      }
      groups.get(key)!.fixtures.push(f);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aLive = a.fixtures.some(f => LIVE_STATUSES.has(f.fixture.status.short));
      const bLive = b.fixtures.some(f => LIVE_STATUSES.has(f.fixture.status.short));
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return a.leagueName.localeCompare(b.leagueName);
    });
  }, [fixtures, searchQuery, timeFilter]);

  useEffect(() => {
    if (timeFilter === 'today' && !activeQuery.isLoading && grouped.length === 0 && !searchQuery) {
      if (tomorrowQuery.data && tomorrowQuery.data.length > 0) {
        setTimeFilter('tomorrow');
      }
    }
  }, [timeFilter, grouped.length, activeQuery.isLoading, tomorrowQuery.data, searchQuery]);

  const bestValueIds = useMemo(() => {
    const allFixtures = grouped.flatMap(g => g.fixtures);
    if (allFixtures.length === 0) return new Set<number>();
    const scored = allFixtures
      .filter(f => f.fixture.status.short === 'NS')
      .map(f => ({
        id: f.fixture.id,
        score: ((f.fixture.id * 7 + 13) % 100) / 100,
      }))
      .sort((a, b) => b.score - a.score);
    return new Set(scored.slice(0, 3).map(s => s.id));
  }, [grouped]);

  const availableLeagues = useMemo(() => {
    return grouped.map(g => g.leagueName).sort();
  }, [grouped]);

  const filteredGrouped = useMemo(() => {
    return applyMatchFilters(grouped, matchFilters) as typeof grouped;
  }, [grouped, matchFilters]);

  // Contagem real de jogos ao vivo filtrados
  const liveMatchesFiltered = useMemo(() => {
    return (liveQuery.data ?? []).filter(m => isLeagueAllowed(m.league, 0));
  }, [liveQuery.data, isLeagueAllowed]);

  const liveCount = liveMatchesFiltered.length;
  const currentLoading = timeFilter === 'live' ? liveQuery.isLoading : activeQuery.isLoading;
  const currentError = timeFilter === 'live' ? false : activeQuery.isError;
  
  // Total de jogos exibidos na aba atual
  const totalMatchesShown = useMemo(() => {
    if (timeFilter === 'live') return liveCount;
    return filteredGrouped.reduce((sum, g) => sum + g.fixtures.length, 0);
  }, [timeFilter, liveCount, filteredGrouped]);

  const hasResults = totalMatchesShown > 0;

  return (
    <div className="min-h-screen bg-background">
      <LobbyHeader />
      <LiveAlertBanner />
      <StopLossBanner status={stopLoss} />

      <main className="pb-24">
        <section className="px-4 mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar time ou liga..."
              className="w-full bg-card border border-border focus:ring-primary focus:border-primary rounded-lg pl-12 pr-10 py-3 text-sm font-body text-white placeholder:text-muted-foreground focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        <section className="px-4 mt-4">
          <TimeTabs selected={timeFilter} onSelect={setTimeFilter} liveBadge={liveCount} />
        </section>

        {timeFilter === 'live' && (
          <section className="mt-6">
            <div className="px-4 mb-2 flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {totalMatchesShown} {totalMatchesShown === 1 ? 'Jogo' : 'Jogos'} ao vivo
              </span>
            </div>
            <LiveMatches matches={liveQuery.data ?? []} isLoading={liveQuery.isLoading} />
          </section>
        )}

        {timeFilter !== 'live' && currentLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Buscando partidas...</p>
          </div>
        )}

        {timeFilter !== 'live' && currentError && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 px-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-white text-center font-bold">Erro ao carregar jogos.</p>
            <button
              onClick={handleForceRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:brightness-110 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        )}

        {timeFilter !== 'live' && !currentLoading && !currentError && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 px-4 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-black text-white uppercase tracking-tighter">
              {searchQuery ? 'Nenhum resultado' : 'Fim da rodada'}
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              {searchQuery
                ? `Não encontramos jogos para "${searchQuery}".`
                : timeFilter === 'today' ? 'Não há mais jogos pendentes para hoje. Confira a aba "Amanhã".'
                : 'Nenhum jogo programado para este período.'}
            </p>
          </div>
        )}

        {timeFilter !== 'live' && !currentLoading && !currentError && hasResults && (
          <section className="mt-6 px-4 space-y-4">
            <div className="flex items-center justify-between">
              <MatchFilters
                filters={matchFilters}
                onChange={setMatchFilters}
                availableLeagues={availableLeagues}
              />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {totalMatchesShown} {totalMatchesShown === 1 ? 'Jogo' : 'Jogos'}
              </span>
            </div>
            <MatchListPaginated
              grouped={filteredGrouped}
              bestValueIds={bestValueIds}
              onMatchClick={handleMatchClick}
            />
          </section>
        )}
      </main>

      <MultiplaBar />
      <BottomNav />
    </div>
  );
}