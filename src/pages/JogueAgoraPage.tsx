import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Clock, Trophy, Zap, Timer } from 'lucide-react';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures } from '@/hooks/useFixtures';
import { AnalysisPanel } from '@/components/jogueAgora/AnalysisPanel';
import { RankedMatchCard } from '@/components/jogueAgora/RankedMatchCard';
import { LoadingSteps, type LoadingStep } from '@/components/jogueAgora/LoadingSteps';
import { analyzeMatch, classificarJogos, type AnaliseJogo, type RankingFinal } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';
import profetaLogo from '@/assets/profeta-bet-logo.png';

export default function JogueAgoraPage() {
  const { data: bankroll } = useBankroll();
  const { data: todayMatches = [], isLoading: loadingToday, refetch: refetchToday } = useTodayFixtures();
  const { isLeagueAllowed } = useLeagueFilter();

  const [ranking, setRanking] = useState<RankingFinal | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<AnaliseJogo | null>(null);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  
  const bankrollAmount = bankroll?.amount ?? 200;

  // Filtro Otimizado: Apenas jogos NS, nas próximas 4 horas e que respeitam o filtro de ligas
  // Fallback: se não houver jogos nas próximas 4h, ampliar para 12h e depois para o dia todo.
  const upcomingMatches = useMemo(() => {
    const candidates = todayMatches.filter(m => {
      if (m.fixture.status.short !== 'NS') return false;
      if (!isLeagueAllowed(m.league.name, m.league.id)) return false;
      return true;
    });

    const now = Date.now();
    const withDiff = candidates.map(m => {
      const matchTime = new Date(m.fixture.date).getTime();
      const diffHours = (matchTime - now) / (1000 * 60 * 60);
      return { fixture: m, diffHours };
    });

    const within4 = withDiff.filter(({ diffHours }) => diffHours > 0 && diffHours <= 4).map(({ fixture }) => fixture);
    if (within4.length > 0) return within4;

    const within12 = withDiff.filter(({ diffHours }) => diffHours > 0 && diffHours <= 12).map(({ fixture }) => fixture);
    if (within12.length > 0) return within12;

    return candidates;
  }, [todayMatches, isLeagueAllowed]);

  useEffect(() => {
    if (loadingToday) return;
    runRanking(upcomingMatches);
  }, [loadingToday, upcomingMatches]);

  async function runRanking(matches: ApiFixture[]) {
    if (matches.length === 0) {
      setRanking({ top: [], medio: [], explorar: [], total: 0 });
      return;
    }

    setIsRanking(true);
    const newSteps: LoadingStep[] = [
      { icon: '⚽', text: `Escaneando jogos próximos... (${matches.length})`, status: 'done' },
      { icon: '📊', text: 'Cruzando dados estatísticos...', status: 'running' },
      { icon: '🏆', text: 'Selecionando Top 10...', status: 'pending' },
    ];
    setSteps([...newSteps]);

    // Análise local rápida (Poisson)
    const analyzed = matches.map(m => analyzeMatch(m));
    
    newSteps[1].status = 'done';
    newSteps[2].status = 'running';
    setSteps([...newSteps]);

    // Classifica e limita ao Top 10 total
    const result = classificarJogos(analyzed);
    
    // Limita a exibição para não sobrecarregar
    const limitedResult: RankingFinal = {
      top: result.top.slice(0, 5),
      medio: result.medio.slice(0, 3),
      explorar: result.explorar.slice(0, 2),
      total: Math.min(result.total, 10)
    };

    setRanking(limitedResult);
    setIsRanking(false);
  }

  const handleRefresh = useCallback(() => {
    setRanking(null);
    refetchToday();
  }, [refetchToday]);

  const handleOpenAnalysis = useCallback((analise: AnaliseJogo) => {
    setSelectedFixture(analise.fixture);
    setAnalysis(analise);
  }, []);

  const handleCloseAnalysis = useCallback(() => {
    setSelectedFixture(null);
    setAnalysis(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] pb-24">
      <header className="sticky top-0 z-40 px-4 py-4 bg-[#111111]/90 backdrop-blur-lg border-b border-[#2B2B2B]">
        <div className="flex items-center gap-3">
          <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight gold-gradient-text uppercase">🎯 TOP 10 AGORA</h1>
            <p className="text-[10px] text-muted-foreground font-bold">MELHORES OPORTUNIDADES NAS PRÓXIMAS 4 HORAS</p>
          </div>
          <button onClick={handleRefresh} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-4 h-4 text-primary ${loadingToday || isRanking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase">Oportunidades:</span>
            <span className="font-black text-white">{ranking?.total ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">Banca:</span>
            <span className="font-black text-primary">R$ {bankrollAmount.toFixed(2)}</span>
          </div>
        </div>

        {(loadingToday || isRanking) ? (
          <LoadingSteps steps={steps} />
        ) : ranking ? (
          <>
            {ranking.top.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-black text-primary uppercase tracking-widest">RECOMENDAÇÕES DE ELITE</h2>
                </div>
                <div className="space-y-4">
                  {ranking.top.map((a, i) => (
                    <RankedMatchCard
                      key={a.fixture.fixture.id}
                      analise={a}
                      rank={i + 1}
                      onAnalyze={() => handleOpenAnalysis(a)}
                      onBet={() => handleOpenAnalysis(a)}
                    />
                  ))}
                </div>
              </section>
            )}

            {ranking.medio.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Zap className="w-5 h-5 text-oracle-draw" />
                  <h2 className="text-sm font-black text-oracle-draw uppercase tracking-widest">VALE A PENA CONFERIR</h2>
                </div>
                <div className="space-y-4">
                  {ranking.medio.map((a, i) => (
                    <RankedMatchCard
                      key={a.fixture.fixture.id}
                      analise={a}
                      rank={ranking.top.length + i + 1}
                      onAnalyze={() => handleOpenAnalysis(a)}
                      onBet={() => handleOpenAnalysis(a)}
                    />
                  ))}
                </div>
              </section>
            )}

            {ranking.total === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-white">Nenhuma oportunidade imediata</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Tente ajustar os filtros de liga ou aguarde os próximos jogos.
                </p>
              </div>
            )}
          </>
        ) : null}
      </main>

      <AnalysisPanel
        fixture={selectedFixture}
        analysis={analysis}
        analyzing={false}
        onClose={handleCloseAnalysis}
      />
    </div>
  );
}
