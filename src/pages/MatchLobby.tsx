import { useState } from 'react';
import { useFilteredFixtures } from '@/hooks/useFixtures';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { LeagueTabs } from '@/components/oracle/LeagueTabs';
import { MatchCard } from '@/components/oracle/MatchCard';
import { LobbyHeader } from '@/components/oracle/LobbyHeader';
import { LiveMatches } from '@/components/oracle/LiveMatches';
import { ApiFixture } from '@/types/fixture';
import { isUsingRealData, getLastApiError } from '@/services/footballApi';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MatchLobby() {
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const { data, isLoading, isError, error, refetch } = useFilteredFixtures(selectedLeague);
  const liveQuery = useLiveMatches();
  const navigate = useNavigate();

  const handleMatchClick = (fixture: ApiFixture) => {
    sessionStorage.setItem('selected-fixture', JSON.stringify(fixture));
    navigate(`/match/${fixture.fixture.id}`);
  };

  const realData = isUsingRealData();
  const apiError = getLastApiError();

  return (
    <div className="min-h-screen bg-oracle-bg">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4">
        <LobbyHeader onRefresh={() => refetch()} />

        {/* Demo mode warning */}
        {!isLoading && !realData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-oracle-loss/10 border border-oracle-loss/30"
          >
            <AlertTriangle className="w-5 h-5 text-oracle-loss shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-display text-oracle-loss">MODO DEMONSTRAÇÃO</p>
              <p className="text-xs font-body text-muted-foreground mt-1">
                {apiError
                  ? `Erro da API: ${apiError}`
                  : 'Não foi possível obter jogos reais da API-Football.'}
              </p>
              <p className="text-xs font-body text-muted-foreground mt-1">
                Os jogos abaixo são <strong className="text-foreground">fictícios</strong>. Para dados reais, configure uma API key válida da{' '}
                <a href="https://www.api-football.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  API-Football
                </a>.
              </p>
            </div>
          </motion.div>
        )}

        {/* Real data indicator */}
        {!isLoading && realData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-oracle-win/5 border border-oracle-win/20"
          >
            <span className="w-2 h-2 rounded-full bg-oracle-win animate-pulse" />
            <p className="text-xs font-body text-muted-foreground">
              <span className="text-oracle-win font-semibold">Dados ao vivo</span> — Jogos reais da API-Football
            </p>
          </motion.div>
        )}

        {/* Live Matches */}
        <LiveMatches matches={liveQuery.data ?? []} isLoading={liveQuery.isLoading} />

        <LeagueTabs selectedLeagueId={selectedLeague} onSelect={setSelectedLeague} />

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-body text-muted-foreground text-sm">
              Buscando jogos
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

        {!isLoading && !isError && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <p className="font-display text-2xl text-muted-foreground tracking-wider">
              NENHUM JOGO ENCONTRADO
            </p>
            <p className="font-body text-muted-foreground text-sm">
              Não há jogos programados para esta liga no momento.
            </p>
          </div>
        )}

        {!isLoading && !isError && data.length > 0 && (
          <div className="space-y-6">
            {data.map(({ league, fixtures }) => (
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
