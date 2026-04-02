import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Clock, Trophy, Zap, Timer, Calendar } from 'lucide-react';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures, useTomorrowFixtures } from '@/hooks/useFixtures';
import { AnalysisPanel } from '@/components/jogueAgora/AnalysisPanel';
import { RankedMatchCard } from '@/components/jogueAgora/RankedMatchCard';
import { LoadingSteps, type LoadingStep } from '@/components/jogueAgora/LoadingSteps';
import { analyzeMatch, classificarJogos, type AnaliseJogo, type RankingFinal } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';
import { useLeagueFilter } from '@/contexts/LeagueFilterContext';

export default function JogueAgoraPage() {
  const { data: bankroll } = useBankroll();
  const { data: todayMatches = [], isLoading: loadingToday, refetch: refetchToday } = useTodayFixtures();
  const { data: tomorrowMatches = [], isLoading: loadingTomorrow, refetch: refetchTomorrow } = useTomorrowFixtures();
  const { isLeagueAllowed } = useLeagueFilter();

  const [dayFilter, setDayFilter] = useState<'today' | 'tomorrow'>('today');
  const [ranking, setRanking] = useState<RankingFinal | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<AnaliseJogo | null>(null);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  
  const bankrollAmount = bankroll?.amount ?? 200;

  const currentMatches = dayFilter === 'today' ? todayMatches : tomorrowMatches;
  const isLoading = dayFilter === 'today' ? loadingToday : loadingTomorrow;

  // Mostra TODOS os jogos não-iniciados que passaram no filtro da liga
  const upcomingMatches = useMemo(() => {
    return currentMatches.filter(m => {
      // Apenas não iniciados
      if (m.fixture.status.short !== 'NS') return false;
      // Respeitar filtro de liga da sidebar
      if (!isLeagueAllowed(m.league.name, m.league.id)) return false;
      return true;
    });
  }, [currentMatches, isLeagueAllowed]);

  useEffect(() => {
    if (isLoading) return;
    runRanking(upcomingMatches);
  }, [isLoading, upcomingMatches]);

  async function runRanking(matches: ApiFixture[]) {
    if (matches.length === 0) {
      setRanking({ top: [], medio: [], explorar: [], total: 0 });
      return;
    }

    setIsRanking(true);
    const newSteps: LoadingStep[] = [
      { icon: '⚽', text: `Escaneando todos os jogos... (${matches.length})`, status: 'done' },
      { icon: '📊', text: 'Calculando EV e Probabilidades...', status: 'running' },
      { icon: '🏆', text: 'Selecionando Melhores Oportunidades...', status: 'pending' },
    ];
    setSteps([...newSteps]);

    // Analisa todos
    const analyzed = matches.map(m => analyzeMatch(m));
    
    newSteps[1].status = 'done';
    newSteps[2].status = 'running';
    setSteps([...newSteps]);

    // Classifica
    const result = classificarJogos(analyzed);
    
    // Filtra para remover a classificação "PASSAR" rigorosamente se necessário.
    // classificarJogos do lib já restringe os resultados retornados às premissas EV positivo e confiança.
    // Agora não cortamos mais com .slice(). Queremos exibir TODOS os aprovados!
    const filteredResult: RankingFinal = {
      top: result.top,
      medio: result.medio,
      explorar: result.explorar,
      total: result.top.length + result.medio.length + result.explorar.length
    };

    setRanking(filteredResult);
    setIsRanking(false);
  }

  const handleRefresh = useCallback(() => {
    setRanking(null);
    if (dayFilter === 'today') refetchToday();
    else refetchTomorrow();
  }, [refetchToday, refetchTomorrow, dayFilter]);

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
      {/* Page header e Tabs */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight gold-gradient-text uppercase">COMPUTADOR QUÂNTICO</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Analisando 100% das partidas disponíveis</p>
          </div>
          <button onClick={handleRefresh} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-4 h-4 text-primary ${isLoading || isRanking ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex bg-[#1A1A1A] rounded-xl p-1 w-full max-w-sm border border-[#2B2B2B]">
          <button
            onClick={() => setDayFilter('today')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              dayFilter === 'today' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'
            }`}
          >
            🔥 Hoje
          </button>
          <button
            onClick={() => setDayFilter('tomorrow')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              dayFilter === 'tomorrow' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-white'
            }`}
          >
            📅 Amanhã
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase">Oportunidades (EV+):</span>
            <span className="font-black text-white">{ranking?.total ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">Banca:</span>
            <span className="font-black text-primary">R$ {bankrollAmount.toFixed(2)}</span>
          </div>
        </div>

        {(isLoading || isRanking) ? (
          <LoadingSteps steps={steps} />
        ) : ranking ? (
          <>
            {ranking.top.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-black text-primary uppercase tracking-widest">RECOMENDAÇÕES DE ELITE (ALTO EV)</h2>
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
              <section className="space-y-4 mt-8">
                <div className="flex items-center gap-2 px-1">
                  <Zap className="w-5 h-5 text-oracle-draw" />
                  <h2 className="text-sm font-black text-oracle-draw uppercase tracking-widest">MÉDIO RISCO / BOM VALOR</h2>
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

            {ranking.explorar.length > 0 && (
              <section className="space-y-4 mt-8">
                <div className="flex items-center gap-2 px-1 text-muted-foreground">
                  <Calendar className="w-5 h-5" />
                  <h2 className="text-sm font-black uppercase tracking-widest">OPORTUNIDADES SECUNDÁRIAS</h2>
                </div>
                <div className="space-y-4">
                  {ranking.explorar.map((a, i) => (
                    <RankedMatchCard
                      key={a.fixture.fixture.id}
                      analise={a}
                      rank={ranking.top.length + ranking.medio.length + i + 1}
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
                <p className="text-lg font-bold text-white">Nenhuma oportunidade com EV positivo.</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  O sistema analisou os jogos e determinou risco alto demais em todos as partidas ativas.
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
