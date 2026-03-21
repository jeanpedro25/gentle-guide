import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Clock, Trophy, Zap, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures, useTomorrowFixtures } from '@/hooks/useFixtures';
import { BottomNav } from '@/components/oracle/BottomNav';
import { AnalysisPanel } from '@/components/jogueAgora/AnalysisPanel';
import { RankedMatchCard } from '@/components/jogueAgora/RankedMatchCard';
import { LoadingSteps, type LoadingStep, type StepStatus } from '@/components/jogueAgora/LoadingSteps';
import { analyzeMatch, classificarJogos, type AnaliseJogo, type RankingFinal } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';
import profetaLogo from '@/assets/profeta-bet-logo.png';

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 min for live updates

export default function JogueAgoraPage() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const { data: todayMatches = [], isLoading: loadingToday, refetch: refetchToday, dataUpdatedAt: updatedToday } = useTodayFixtures();
  const { data: tomorrowMatches = [], isLoading: loadingTomorrow, refetch: refetchTomorrow, dataUpdatedAt: updatedTomorrow } = useTomorrowFixtures();

  const [ranking, setRanking] = useState<RankingFinal | null>(null);
  const [allAnalyzed, setAllAnalyzed] = useState<AnaliseJogo[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<AnaliseJogo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [betMode, setBetMode] = useState(false);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const prevMatchCountRef = useRef(0);

  const bankrollAmount = bankroll?.amount ?? 100;
  const dataLoading = loadingToday || loadingTomorrow;

  // Combine today + tomorrow, include live + NS
  const allMatches = [...todayMatches, ...tomorrowMatches];
  const seenIds = new Set<number>();
  const uniqueMatches = allMatches.filter(m => {
    if (seenIds.has(m.fixture.id)) return false;
    seenIds.add(m.fixture.id);
    const status = m.fixture.status.short;
    return ['NS', '1H', 'HT', '2H', 'LIVE', 'PEN'].includes(status);
  });

  // Auto-analyze when matches load
  useEffect(() => {
    if (dataLoading || uniqueMatches.length === 0) return;
    if (uniqueMatches.length === prevMatchCountRef.current && ranking) return;
    prevMatchCountRef.current = uniqueMatches.length;
    runRanking(uniqueMatches);
  }, [dataLoading, uniqueMatches.length]);

  async function runRanking(matches: ApiFixture[]) {
    setIsRanking(true);
    setRanking(null);

    const newSteps: LoadingStep[] = [
      { icon: '⚽', text: `Buscando jogos disponíveis... (${matches.length})`, status: 'done' },
      { icon: '📊', text: 'Calculando probabilidades...', status: 'running' },
      { icon: '🧮', text: 'Calculando EV de cada jogo...', status: 'pending' },
      { icon: '🏆', text: 'Montando ranking final...', status: 'pending' },
    ];
    setSteps([...newSteps]);

    // Step 2: Analyze all matches
    await new Promise(r => setTimeout(r, 600));
    newSteps[1].status = 'done';
    newSteps[2].status = 'running';
    setSteps([...newSteps]);

    const analyzed = matches.map(m => analyzeMatch(m));
    await new Promise(r => setTimeout(r, 400));

    newSteps[2].status = 'done';
    newSteps[3].status = 'running';
    setSteps([...newSteps]);
    await new Promise(r => setTimeout(r, 300));

    // Step 4: Rank
    const result = classificarJogos(analyzed);
    newSteps[3].status = 'done';
    setSteps([...newSteps]);

    setAllAnalyzed(analyzed);
    setRanking(result);
    setAnalyzedAt(new Date());
    setIsRanking(false);
  }

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchToday();
      refetchTomorrow();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refetchToday, refetchTomorrow]);

  const handleRefresh = useCallback(() => {
    prevMatchCountRef.current = 0;
    setRanking(null);
    refetchToday();
    refetchTomorrow();
  }, [refetchToday, refetchTomorrow]);

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

  const minsUntilRefresh = analyzedAt
    ? Math.max(0, Math.round((analyzedAt.getTime() + AUTO_REFRESH_MS - Date.now()) / 60000))
    : null;

  const totalFound = ranking ? ranking.top.length + ranking.medio.length + ranking.explorar.length : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text">🎯 JOGUE AGORA</h1>
            <p className="text-[10px] text-muted-foreground">Top 10 melhores jogos analisados automaticamente</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {analyzedAt && (
              <span>
                Analisado às {analyzedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                {minsUntilRefresh !== null && ` — atualiza em ${minsUntilRefresh} min`}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-[10px] text-primary font-bold hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Summary strip */}
        <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Jogos analisados:</span>
            <span className="font-bold text-foreground">{uniqueMatches.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Banca:</span>
            <span className="font-bold text-primary">R$ {bankrollAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Loading or Results */}
        {(dataLoading || isRanking) ? (
          <LoadingSteps steps={steps.length > 0 ? steps : [
            { icon: '⚽', text: 'Buscando jogos disponíveis...', status: 'running' },
            { icon: '📊', text: 'Calculando probabilidades...', status: 'pending' },
            { icon: '🧮', text: 'Calculando EV de cada jogo...', status: 'pending' },
            { icon: '🏆', text: 'Montando ranking final...', status: 'pending' },
          ]} />
        ) : ranking ? (
          <>
            {/* Found count */}
            <p className="text-xs text-muted-foreground text-center">
              {totalFound > 0
                ? `Encontramos ${totalFound} jogos recomendados de ${uniqueMatches.length} analisados`
                : `Nenhum jogo com EV positivo encontrado em ${uniqueMatches.length} jogos analisados`
              }
            </p>

            {ranking.avisoTop && (
              <div className="text-center text-xs text-oracle-draw bg-oracle-draw/10 border border-oracle-draw/20 rounded-lg px-3 py-2">
                ⚠️ {ranking.avisoTop}
              </div>
            )}

            {/* ── SECTION: TOP 3 ── */}
            {ranking.top.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-extrabold text-primary uppercase tracking-wider">
                    🏆 Profeta Recomenda — Top {ranking.top.length}
                  </h2>
                </div>
                <div className="border-l-2 border-primary/40 pl-3 space-y-3">
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

            {/* ── SECTION: VALE A PENA ── */}
            {ranking.medio.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Zap className="w-4 h-4 text-oracle-draw" />
                  <h2 className="text-sm font-extrabold text-oracle-draw uppercase tracking-wider">
                    ⚡ Vale a Pena — {ranking.medio.length} jogos
                  </h2>
                </div>
                <div className="border-l-2 border-oracle-draw/40 pl-3 space-y-3">
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

            {/* ── SECTION: EXPLORAR ── */}
            {ranking.explorar.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <SearchIcon className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
                    🔍 Explorar — {ranking.explorar.length} jogos
                  </h2>
                </div>
                <div className="border-l-2 border-muted/40 pl-3 space-y-3">
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

            {totalFound === 0 && (
              <div className="text-center py-10 space-y-2">
                <p className="text-lg font-bold text-foreground">Sem jogos recomendados agora</p>
                <p className="text-sm text-muted-foreground">Mais jogos disponíveis em breve — volte mais tarde</p>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Analysis Panel */}
      <AnalysisPanel
        fixture={selectedFixture}
        analysis={analysis}
        analyzing={analyzing}
        betMode={betMode}
        onClose={handleCloseAnalysis}
      />

      <BottomNav />
    </div>
  );
}
