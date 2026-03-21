import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Clock, Trophy, Zap, Search as SearchIcon, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures } from '@/hooks/useFixtures';
import { BottomNav } from '@/components/oracle/BottomNav';
import { AnalysisPanel } from '@/components/jogueAgora/AnalysisPanel';
import { RankedMatchCard } from '@/components/jogueAgora/RankedMatchCard';
import { LoadingSteps, type LoadingStep } from '@/components/jogueAgora/LoadingSteps';
import { analyzeMatch, classificarJogos, type AnaliseJogo, type RankingFinal } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';
import profetaLogo from '@/assets/profeta-bet-logo.png';

const AUTO_REFRESH_MS = 2 * 60 * 1000; // Atualiza a cada 2 min para pegar jogos novos

export default function JogueAgoraPage() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const { data: todayMatches = [], isLoading: loadingToday, refetch: refetchToday } = useTodayFixtures();

  const [ranking, setRanking] = useState<RankingFinal | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<AnaliseJogo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [betMode, setBetMode] = useState(false);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [isRanking, setIsRanking] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const prevMatchCountRef = useRef(0);

  const bankrollAmount = bankroll?.amount ?? 200;

  // Filtro: Apenas jogos que começam em breve (próximas 6 horas) ou que estão AO VIVO
  const upcomingMatches = todayMatches.filter(m => {
    const status = m.fixture.status.short;
    const isLive = ['1H', 'HT', '2H', 'LIVE', 'PEN'].includes(status);
    
    if (isLive) return true;
    
    if (status === 'NS') {
      const matchTime = new Date(m.fixture.date).getTime();
      const now = Date.now();
      const diffHours = (matchTime - now) / (1000 * 60 * 60);
      return diffHours >= -0.5 && diffHours <= 6; // Começa em até 6h ou começou há no máximo 30min
    }
    
    return false;
  });

  useEffect(() => {
    if (loadingToday || upcomingMatches.length === 0) return;
    if (upcomingMatches.length === prevMatchCountRef.current && ranking) return;
    prevMatchCountRef.current = upcomingMatches.length;
    runRanking(upcomingMatches);
  }, [loadingToday, upcomingMatches.length]);

  async function runRanking(matches: ApiFixture[]) {
    setIsRanking(true);
    setRanking(null);

    const newSteps: LoadingStep[] = [
      { icon: '⚽', text: `Localizando jogos iminentes... (${matches.length})`, status: 'done' },
      { icon: '📊', text: 'Processando modelos matemáticos...', status: 'running' },
      { icon: '🧮', text: 'Identificando Valor Esperado (EV)...', status: 'pending' },
      { icon: '🏆', text: 'Gerando Top 10 Recomendações...', status: 'pending' },
    ];
    setSteps([...newSteps]);

    await new Promise(r => setTimeout(r, 800));
    newSteps[1].status = 'done';
    newSteps[2].status = 'running';
    setSteps([...newSteps]);

    const analyzed = matches.map(m => analyzeMatch(m));
    await new Promise(r => setTimeout(r, 600));

    newSteps[2].status = 'done';
    newSteps[3].status = 'running';
    setSteps([...newSteps]);
    await new Promise(r => setTimeout(r, 400));

    const result = classificarJogos(analyzed);
    newSteps[3].status = 'done';
    setSteps([...newSteps]);

    setRanking(result);
    setAnalyzedAt(new Date());
    setIsRanking(false);
  }

  const handleRefresh = useCallback(() => {
    prevMatchCountRef.current = 0;
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

  const totalFound = ranking ? ranking.top.length + ranking.medio.length + ranking.explorar.length : 0;

  return (
    <div className="min-h-screen bg-[#111111] pb-24">
      <header className="sticky top-0 z-40 px-4 py-4 bg-[#111111]/90 backdrop-blur-lg border-b border-[#2B2B2B]">
        <div className="flex items-center gap-3">
          <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight gold-gradient-text uppercase">🎯 JOGUE AGORA</h1>
            <p className="text-[10px] text-muted-foreground font-bold">JOGOS QUE COMEÇAM EM BREVE COM ALTO VALOR</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${loadingToday ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase">Jogos Próximos:</span>
            <span className="font-black text-white">{upcomingMatches.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">Banca:</span>
            <span className="font-black text-primary">R$ {bankrollAmount.toFixed(2)}</span>
          </div>
        </div>

        {(loadingToday || isRanking) ? (
          <LoadingSteps steps={steps.length > 0 ? steps : [
            { icon: '⚽', text: 'Buscando jogos na API...', status: 'running' },
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
                    RECOMENDAÇÕES DE ELITE
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
                    OPORTUNIDADES DE VALOR
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

            {totalFound === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-bold text-white">Nenhum jogo de valor agora</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  O Profeta está monitorando a API. Novos jogos aparecerão assim que as odds abrirem.
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