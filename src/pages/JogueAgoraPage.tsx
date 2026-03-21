import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, Trophy, Zap, Timer, Compass } from 'lucide-react';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures, useTomorrowFixtures } from '@/hooks/useFixtures';
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
  const { data: tomorrowMatches = [] } = useTomorrowFixtures();
  const { isLeagueAllowed } = useLeagueFilter();

  const [ranking, setRanking] = useState<RankingFinal | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<AnaliseJogo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [betMode, setBetMode] = useState(false);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  
  const bankrollAmount = bankroll?.amount ?? 200;

  // Filtro: Apenas jogos que AINDA NÃO COMEÇARAM (NS), nas próximas 12h E que respeitam o filtro de ligas lateral
  const upcomingMatches = useMemo(() => {
    return [...todayMatches, ...tomorrowMatches].filter(m => {
      // 1. Status deve ser Não Iniciado
      if (m.fixture.status.short !== 'NS') return false;
      
      // 2. Deve estar no filtro de ligas selecionado no menu lateral
      if (!isLeagueAllowed(m.league.name, m.league.id)) return false;

      // 3. Janela de tempo (próximas 12 horas)
      const matchTime = new Date(m.fixture.date).getTime();
      const now = Date.now();
      const diffHours = (matchTime - now) / (1000 * 60 * 60);
      
      return diffHours > 0 && diffHours <= 12;
    });
  }, [todayMatches, tomorrowMatches, isLeagueAllowed]);

  // Dispara o ranking sempre que a lista de jogos filtrados mudar
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
      { icon: '⚽', text: `Escaneando jogos filtrados... (${matches.length})`, status: 'done' },
      { icon: '📊', text: 'Cruzando dados estatísticos...', status: 'running' },
      { icon: '🧮', text: 'Calculando Valor Esperado (EV)...', status: 'pending' },
      { icon: '🏆', text: 'Selecionando as melhores entradas...', status: 'pending' },
    ];
    setSteps([...newSteps]);

    await new Promise(r => setTimeout(r, 600));
    newSteps[1].status = 'done';
    newSteps[2].status = 'running';
    setSteps([...newSteps]);

    const analyzed = matches.map(m => analyzeMatch(m));
    await new Promise(r => setTimeout(r, 500));

    newSteps[2].status = 'done';
    newSteps[3].status = 'running';
    setSteps([...newSteps]);
    await new Promise(r => setTimeout(r, 300));

    const result = classificarJogos(analyzed);
    newSteps[3].status = 'done';
    setSteps([...newSteps]);

    setRanking(result);
    setIsRanking(false);
  }

  const handleRefresh = useCallback(() => {
    setRanking(null);
    refetchToday();
  }, [refetchToday]);

  const handleOpenAnalysis = useCallback((analise: AnaliseJogo) => {
    setSelectedFixture(analise.fixture);
    setAnalysis(analise);
    setAnalyzing(false);
    setBetMode(false);
  }, []);

  const handleOpenBet = useCallback((analise: AnaliseJogo) => {
    setSelectedFixture(analise.fixture);
    setAnalysis(analise);
    setAnalyzing(false);
    setBetMode(true);
  }, []);

  const handleCloseAnalysis = useCallback(() => {
    setSelectedFixture(null);
    setAnalysis(null);
    setAnalyzing(false);
    setBetMode(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] pb-24">
      <header className="sticky top-0 z-40 px-4 py-4 bg-[#111111]/90 backdrop-blur-lg border-b border-[#2B2B2B]">
        <div className="flex items-center gap-3">
          <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight gold-gradient-text uppercase">🎯 JOGUE AGORA</h1>
            <p className="text-[10px] text-muted-foreground font-bold">PRÉ-ANÁLISE DOS MELHORES JOGOS DAS PRÓXIMAS HORAS</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
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
          <LoadingSteps steps={steps.length > 0 ? steps : [
            { icon: '⚽', text: 'Buscando jogos...', status: 'running' },
            { icon: '📊', text: 'Calculando probabilidades...', status: 'pending' },
            { icon: '🧮', text: 'Analisando EV...', status: 'pending' },
            { icon: '🏆', text: 'Finalizando ranking...', status: 'pending' },
          ]} />
        ) : ranking ? (
          <>
            {ranking.top.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-black text-primary uppercase tracking-widest">
                    RECOMENDAÇÕES DE ELITE ({ranking.top.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {ranking.top.map((a, i) => (
                    <RankedMatchCard
                      key={a.fixture.fixture.id}
                      analise={a}
                      rank={i + 1}
                      onAnalyze={() => handleOpenAnalysis(a)}
                      onBet={() => handleOpenBet(a)}
                    />
                  ))}
                </div>
              </section>
            )}

            {ranking.medio.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Zap className="w-5 h-5 text-oracle-draw" />
                  <h2 className="text-sm font-black text-oracle-draw uppercase tracking-widest">
                    VALE A PENA CONFERIR ({ranking.medio.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {ranking.medio.map((a, i) => (
                    <RankedMatchCard
                      key={a.fixture.fixture.id}
                      analise={a}
                      rank={ranking.top.length + i + 1}
                      onAnalyze={() => handleOpenAnalysis(a)}
                      onBet={() => handleOpenBet(a)}
                    />
                  ))}
                </div>
              </section>
            )}

            {ranking.explorar.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Compass className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                    OUTRAS OPORTUNIDADES ({ranking.explorar.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {ranking.explorar.map((a, i) => (
                    <RankedMatchCard
                      key={a.fixture.fixture.id}
                      analise={a}
                      rank={ranking.top.length + ranking.medio.length + i + 1}
                      onAnalyze={() => handleOpenAnalysis(a)}
                      onBet={() => handleOpenBet(a)}
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
                <p className="text-lg font-bold text-white">Nenhuma oportunidade encontrada</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Tente ajustar os filtros de liga no menu lateral ou aguarde novas odds serem processadas.
                </p>
              </div>
            )}
          </>
        ) : null}
      </main>

      <AnalysisPanel
        fixture={selectedFixture}
        analysis={analysis}
        analyzing={analyzing}
        betMode={betMode}
        onClose={handleCloseAnalysis}
      />
    </div>
  );
}