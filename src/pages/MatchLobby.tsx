import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { MultiplaBar } from '@/components/oracle/MultiplaBar';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'LIVE', 'PEN']);

export default function MatchLobby() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchFilters, setMatchFilters] = useState<MatchFiltersState>({ league: '', timeOfDay: 'all', sortBy: 'time' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayQuery = useTodayFixtures();
  const tomorrowQuery = useTomorrowFixtures();
  const weekQuery = useWeekFixtures();
  const liveQuery = useLiveMatches();
  const { data: bets = [] } = useBets();
  const { data: bankroll } = useBankroll();
  const stopLoss = useStopLoss(bets, bankroll?.amount ?? 100, 100);

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
    toast.success('Atualizado!');
  }, [todayQuery, tomorrowQuery, weekQuery, liveQuery, queryClient]);

  // Preload logos
  useEffect(() => {
    const allFixtures = todayQuery.data ?? [];
    const names = allFixtures.flatMap(f => [f.teams.home.name, f.teams.away.name]);
    if (names.length > 0) preloadTeamLogos(names);
  }, [todayQuery.data]);

  // Get active data source based on tab
  const activeQuery = timeFilter === 'today' ? todayQuery
    : timeFilter === 'tomorrow' ? tomorrowQuery
    : timeFilter === 'week' ? weekQuery
    : todayQuery; // 'live' uses liveQuery separately

  const fixtures: ApiFixture[] = (activeQuery.data as ApiFixture[] | undefined) ?? [];

  // Group fixtures by league, apply search filter
  const grouped = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = fixtures.filter(f => {
      // For 'live' tab, only show live matches
      if (timeFilter === 'live') {
        if (!LIVE_STATUSES.has(f.fixture.status.short)) return false;
      }
      // Exclude finished in today/tomorrow/week
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

  // Determine "best value" matches - pick top 3 with highest simulated odds
  const bestValueIds = useMemo(() => {
    const allFixtures = grouped.flatMap(g => g.fixtures);
    if (allFixtures.length === 0) return new Set<number>();
    // Simulate value: prioritize matches not started yet, randomize with fixture id for variety
    const scored = allFixtures
      .filter(f => f.fixture.status.short === 'NS')
      .map(f => ({
        id: f.fixture.id,
        // Higher score = "better odds" - use a hash-like approach for variety
        score: ((f.fixture.id * 7 + 13) % 100) / 100,
      }))
      .sort((a, b) => b.score - a.score);
    return new Set(scored.slice(0, 3).map(s => s.id));
  }, [grouped]);

  const liveCount = (liveQuery.data ?? []).length;
  const currentLoading = timeFilter === 'live' ? liveQuery.isLoading : activeQuery.isLoading;
  const currentError = timeFilter === 'live' ? false : activeQuery.isError;
  const currentErrorObj = activeQuery.error;
  const totalMatches = grouped.reduce((sum, g) => sum + g.fixtures.length, 0);
  const hasResults = timeFilter === 'live' ? liveCount > 0 : totalMatches > 0;

  return (
    <div className="min-h-screen bg-background">
      <LobbyHeader />
      <LiveAlertBanner />
      <StopLossBanner status={stopLoss} />

      <main className="pb-24">
        {/* Search */}
        <section className="px-4 mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar time..."
              className="w-full bg-card border border-border focus:ring-primary focus:border-primary rounded-lg pl-12 pr-10 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Time tabs */}
        <section className="px-4 mt-4">
          <TimeTabs selected={timeFilter} onSelect={setTimeFilter} liveBadge={liveCount} />
        </section>

        {/* Live tab → use LiveMatches horizontal cards */}
        {timeFilter === 'live' && (
          <section className="mt-6">
            <LiveMatches matches={liveQuery.data ?? []} isLoading={liveQuery.isLoading} />
          </section>
        )}

        {/* Loading */}
        {timeFilter !== 'live' && currentLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Buscando jogos
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>...</motion.span>
            </p>
          </div>
        )}

        {/* Error */}
        {timeFilter !== 'live' && currentError && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 px-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-foreground text-center">Erro ao buscar jogos.</p>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              {currentErrorObj instanceof Error ? currentErrorObj.message : 'Verifique sua conexão.'}
            </p>
            <button
              onClick={handleForceRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Empty state */}
        {timeFilter !== 'live' && !currentLoading && !currentError && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 px-4">
            <p className="text-2xl font-extrabold text-muted-foreground tracking-wider">
              {searchQuery ? 'NENHUM RESULTADO' : 'NENHUM JOGO'}
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? `Nenhum jogo encontrado para "${searchQuery}".`
                : timeFilter === 'today' ? 'Não há jogos programados para hoje.'
                : timeFilter === 'tomorrow' ? 'Não há jogos programados para amanhã.'
                : 'Não há jogos programados para esta semana.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm hover:border-primary/50 transition-colors"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

        {/* Match list (non-live tabs) */}
        {timeFilter !== 'live' && !currentLoading && !currentError && hasResults && (
          <section className="mt-6 px-4 space-y-4">
            <MatchFilters
              filters={matchFilters}
              onChange={setMatchFilters}
              availableLeagues={availableLeagues}
            />
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
