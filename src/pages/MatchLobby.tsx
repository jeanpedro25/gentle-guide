import { useState, useMemo, useCallback, useEffect } from 'react';
import { preloadTeamLogos } from '@/services/teamLogos';
import { useTodayFixtures, useTomorrowFixtures, useWeekFixtures } from '@/hooks/useFixtures';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { TimeTabs, TimeFilter } from '@/components/oracle/TimeTabs';
import { MatchCard } from '@/components/oracle/MatchCard';
import { LobbyHeader } from '@/components/oracle/LobbyHeader';
import { LiveMatches } from '@/components/oracle/LiveMatches';
import { LiveAlertBanner } from '@/components/oracle/LiveAlertBanner';
import { BottomNav } from '@/components/oracle/BottomNav';
import { ApiFixture } from '@/types/fixture';
import { clearFootballCache } from '@/services/footballApi';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, Search, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MultiplaBar } from '@/components/oracle/MultiplaBar';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'LIVE', 'PEN']);

export default function MatchLobby() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const todayQuery = useTodayFixtures();
  const tomorrowQuery = useTomorrowFixtures();
  const weekQuery = useWeekFixtures();
  const liveQuery = useLiveMatches();

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
          <section className="mt-6 px-4 space-y-6">
            {grouped.map((group) => (
              <div key={group.leagueName} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-base text-foreground">
                    {group.leagueName.toUpperCase()}
                    {group.country && (
                      <span className="text-muted-foreground font-normal text-sm ml-2">• {group.country}</span>
                    )}
                  </h2>
                </div>
                <div className="space-y-4">
                  {group.fixtures.map((fixture, i) => (
                    <MatchCard
                      key={fixture.fixture.id}
                      fixture={fixture}
                      onClick={() => handleMatchClick(fixture)}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <MultiplaBar />
      <BottomNav />
    </div>
  );
}
