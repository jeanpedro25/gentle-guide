import { useState, useMemo } from 'react';
import { useFilteredFixtures } from '@/hooks/useFixtures';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { LeagueTabs } from '@/components/oracle/LeagueTabs';
import { MatchCard } from '@/components/oracle/MatchCard';
import { LobbyHeader } from '@/components/oracle/LobbyHeader';
import { LiveMatches } from '@/components/oracle/LiveMatches';
import { ApiFixture } from '@/types/fixture';
import { isUsingRealData } from '@/services/footballApi';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MultiplaBar } from '@/components/oracle/MultiplaBar';
import { useNavigate } from 'react-router-dom';

export default function MatchLobby() {
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, isError, error, refetch } = useFilteredFixtures(selectedLeague);
  const liveQuery = useLiveMatches();
  const navigate = useNavigate();

  const handleMatchClick = (fixture: ApiFixture) => {
    sessionStorage.setItem('selected-fixture', JSON.stringify(fixture));
    navigate(`/match/${fixture.fixture.id}`);
  };

  const realData = isUsingRealData();

  // Filter fixtures by search query (team name)
  const filteredData = useMemo(() => {
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
  }, [data, searchQuery]);

  const totalMatches = filteredData.reduce((sum, g) => sum + g.fixtures.length, 0);

  return (
    <div className="min-h-screen bg-oracle-bg">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4">
        <LobbyHeader onRefresh={() => refetch()} />

        {/* Real data indicator */}
        {!isLoading && realData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-oracle-win/5 border border-oracle-win/20"
          >
            <span className="w-2 h-2 rounded-full bg-oracle-win animate-pulse" />
            <p className="text-xs font-body text-muted-foreground">
              <span className="text-oracle-win font-semibold">Dados ao vivo</span> — Jogos reais da API
            </p>
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

        <LeagueTabs selectedLeagueId={selectedLeague} onSelect={setSelectedLeague} />

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-body text-muted-foreground text-sm">
              Buscando jogos (30 dias)
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ...
              </motion.span>
            </p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="font-body text-foreground text-center">Erro ao buscar jogos.</p>
            <p className="font-body text-muted-foreground text-sm text-center max-w-md">
              {error instanceof Error ? error.message : 'Verifique sua API Key.'}
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body text-sm hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <p className="font-display text-2xl text-muted-foreground tracking-wider">
              {searchQuery ? 'NENHUM RESULTADO' : 'NENHUM JOGO ENCONTRADO'}
            </p>
            <p className="font-body text-muted-foreground text-sm">
              {searchQuery
                ? `Nenhum jogo encontrado para "${searchQuery}".`
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

        {!isLoading && !isError && filteredData.length > 0 && (
          <div className="space-y-6">
            {/* Total count */}
            <p className="text-xs font-body text-muted-foreground">
              {totalMatches} {totalMatches === 1 ? 'jogo encontrado' : 'jogos encontrados'}
              {searchQuery && ` para "${searchQuery}"`}
            </p>

            {filteredData.map(({ league, fixtures }) => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
