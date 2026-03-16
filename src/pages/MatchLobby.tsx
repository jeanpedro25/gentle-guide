import { useState, useMemo, useCallback, useEffect } from 'react';
import { preloadTeamLogos } from '@/services/teamLogos';
import { useFilteredFixtures, useTodayFixtures } from '@/hooks/useFixtures';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { LeagueTabs } from '@/components/oracle/LeagueTabs';
import { MatchCard } from '@/components/oracle/MatchCard';
import { LobbyHeader } from '@/components/oracle/LobbyHeader';
import { LiveMatches } from '@/components/oracle/LiveMatches';
import { ApiFixture } from '@/types/fixture';
import { isUsingRealData, clearFootballCache } from '@/services/footballApi';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MultiplaBar } from '@/components/oracle/MultiplaBar';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function MatchLobby() {
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayMode, setTodayMode] = useState(true); // Start with HOJE active
  const { data, isLoading, isError, error, refetch } = useFilteredFixtures(selectedLeague, !todayMode);
  const todayQuery = useTodayFixtures();
  const liveQuery = useLiveMatches();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleMatchClick = (fixture: ApiFixture) => {
    sessionStorage.setItem('selected-fixture', JSON.stringify(fixture));
    navigate(`/match/${fixture.fixture.id}`);
  };

  const handleForceRefresh = useCallback(async () => {
    clearFootballCache();
    queryClient.removeQueries({ queryKey: ['fixtures'] });
    const [result] = await Promise.all([
      refetch(),
      todayQuery.refetch(),
      liveQuery.refetch(),
    ]);
    const total = result.data?.reduce((sum, g) => sum + g.fixtures.length, 0) ?? 0;
    toast.success(`Atualizado! ${total} jogos encontrados`);
  }, [refetch, todayQuery, liveQuery, queryClient]);

  const handleTodayToggle = useCallback(() => {
    setTodayMode(prev => !prev);
  }, []);

  const realData = isUsingRealData();

  // Preload team logos when fixtures load
  useEffect(() => {
    const allFixtures = todayQuery.data ?? [];
    const names = allFixtures.flatMap(f => [f.teams.home.name, f.teams.away.name]);
    if (names.length > 0) preloadTeamLogos(names);
  }, [todayQuery.data]);

  // Group today's fixtures by league (like EstrelaBet)
  const todayGrouped = useMemo(() => {
    if (!todayMode) return [];
    const todayFixtures = todayQuery.data ?? [];
    const q = searchQuery.toLowerCase().trim();

    const filtered = todayFixtures.filter(f => {
      if (q && !f.teams.home.name.toLowerCase().includes(q) && !f.teams.away.name.toLowerCase().includes(q)) return false;
      return true; // show all including FT
    });

    // Group by league name
    const groups = new Map<string, { leagueName: string; leagueLogo: string; country: string; fixtures: ApiFixture[] }>();
    for (const f of filtered) {
      const key = f.league.name;
      if (!groups.has(key)) {
        groups.set(key, { leagueName: f.league.name, leagueLogo: f.league.logo, country: f.league.country, fixtures: [] });
      }
      groups.get(key)!.fixtures.push(f);
    }

    // Sort: live matches first, then by league name
    return Array.from(groups.values()).sort((a, b) => {
      const aLive = a.fixtures.some(f => ['1H', '2H', 'HT', 'LIVE'].includes(f.fixture.status.short));
      const bLive = b.fixtures.some(f => ['1H', '2H', 'HT', 'LIVE'].includes(f.fixture.status.short));
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return a.leagueName.localeCompare(b.leagueName);
    });
  }, [todayMode, todayQuery.data, searchQuery]);

  // Filter grouped fixtures by search query (non-today mode)
  const filteredData = useMemo(() => {
    if (todayMode) return [];
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data
      .map(group => ({
        ...group,
        fixtures: group.fixtures.filter(f =>
          f.teams.home.name.toLowerCase().includes(q) ||
          f.teams.away.name.toLowerCase().includes(q)
        ),
      }))
      .filter(group => group.fixtures.length > 0);
  }, [data, searchQuery, todayMode]);

  const currentLoading = todayMode ? todayQuery.isLoading : isLoading;
  const currentError = todayMode ? todayQuery.isError : isError;
  const currentErrorObj = todayMode ? todayQuery.error : error;
  const totalMatches = todayMode
    ? todayGrouped.reduce((sum, g) => sum + g.fixtures.length, 0)
    : filteredData.reduce((sum, g) => sum + g.fixtures.length, 0);
  const hasResults = totalMatches > 0;

  return (
    <div className="min-h-screen bg-oracle-bg">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4">
        <LobbyHeader onRefresh={handleForceRefresh} />

        {/* Real data indicator */}
        {!currentLoading && realData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-oracle-win/5 border border-oracle-win/20"
          >
            <span className="w-2 h-2 rounded-full bg-oracle-win animate-pulse" />
            <p className="text-xs font-body text-muted-foreground">
              <span className="text-oracle-win font-semibold">Dados ao vivo</span> — Jogos reais da API
            </p>
            <button
              onClick={handleForceRefresh}
              className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-body hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </motion.div>
        )}

        {/* Live Matches */}
        <LiveMatches matches={liveQuery.data ?? []} isLoading={liveQuery.isLoading} />

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por time... (ex: Flamengo, Barcelona)"
            className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-10 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
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

        <LeagueTabs
          selectedLeagueId={selectedLeague}
          onSelect={setSelectedLeague}
          todayMode={todayMode}
          onTodayToggle={handleTodayToggle}
        />

        {currentLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-body text-muted-foreground text-sm">
              {todayMode ? 'Buscando jogos de hoje' : 'Buscando jogos (30 dias)'}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ...
              </motion.span>
            </p>
          </div>
        )}

        {currentError && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="font-body text-foreground text-center">Erro ao buscar jogos.</p>
            <p className="font-body text-muted-foreground text-sm text-center max-w-md">
              {currentErrorObj instanceof Error ? currentErrorObj.message : 'Verifique sua conexão.'}
            </p>
            <button
              onClick={handleForceRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        )}

        {!currentLoading && !currentError && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <p className="font-display text-2xl text-muted-foreground tracking-wider">
              {searchQuery ? 'NENHUM RESULTADO' : todayMode ? 'NENHUM JOGO HOJE' : 'NENHUM JOGO ENCONTRADO'}
            </p>
            <p className="font-body text-muted-foreground text-sm">
              {searchQuery
                ? `Nenhum jogo encontrado para "${searchQuery}".`
                : todayMode
                  ? 'Não há jogos programados para hoje nas ligas monitoradas.'
                  : 'Não há jogos programados para esta liga no momento.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground font-body text-sm hover:bg-secondary/80 transition-colors"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

        {!currentLoading && !currentError && hasResults && (
          <div className="space-y-6">
            <p className="text-xs font-body text-muted-foreground">
              {totalMatches} {totalMatches === 1 ? 'jogo encontrado' : 'jogos encontrados'}
              {todayMode && ' hoje'}
              {searchQuery && ` para "${searchQuery}"`}
            </p>

            {todayMode ? (
              /* Today mode: grouped by league like EstrelaBet */
              todayGrouped.map((group) => (
                <div key={group.leagueName} className="space-y-3">
                  <h2 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
                    {group.leagueLogo && (
                      <img src={group.leagueLogo} alt="" className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span>⚽</span>
                    {group.leagueName}
                    {group.country && <span className="text-xs font-body text-muted-foreground">• {group.country}</span>}
                    <span className="text-xs font-body text-muted-foreground ml-auto">
                      {group.fixtures.length} {group.fixtures.length === 1 ? 'jogo' : 'jogos'}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              ))
            ) : (
              /* League grouped mode */
              filteredData.map(({ league, fixtures }) => (
                <div key={league.id} className="space-y-3">
                  <h2 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
                    <span>{league.emoji}</span>
                    {league.name}
                    <span className="text-xs font-body text-muted-foreground ml-auto">
                      {fixtures.length} {fixtures.length === 1 ? 'jogo' : 'jogos'}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {fixtures.map((fixture, i) => (
                      <MatchCard
                        key={fixture.fixture.id}
                        fixture={fixture}
                        onClick={() => handleMatchClick(fixture)}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="h-20" />
        <MultiplaBar />
      </div>
    </div>
  );
}
