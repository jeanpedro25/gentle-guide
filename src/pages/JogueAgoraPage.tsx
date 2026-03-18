import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, DollarSign, RefreshCw, Clock, Trophy, TrendingUp, Compass, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures, useTomorrowFixtures } from '@/hooks/useFixtures';
import { BottomNav } from '@/components/oracle/BottomNav';
import { TopCard, MedioCard, ExplorarCard } from '@/components/jogueAgora/MatchAnalysisCard';
import { BetPanel } from '@/components/jogueAgora/BetPanel';
import { analyzeMatch, classificarJogos, type AnaliseJogo, type RankingFinal } from '@/lib/jogueAgora';
import profetaLogo from '@/assets/profeta-bet-logo.png';

const AUTO_REFRESH_MS = 30 * 60 * 1000; // 30 min

export default function JogueAgoraPage() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const { data: todayMatches = [], isLoading: loadingToday, refetch: refetchToday, dataUpdatedAt: updatedToday } = useTodayFixtures();
  const { data: tomorrowMatches = [], isLoading: loadingTomorrow, refetch: refetchTomorrow, dataUpdatedAt: updatedTomorrow } = useTomorrowFixtures();

  const bankrollAmount = bankroll?.amount ?? 100;
  const [selectedMatch, setSelectedMatch] = useState<AnaliseJogo | null>(null);
  const [tab, setTab] = useState<'hoje' | 'amanha'>('hoje');

  const allMatches = tab === 'hoje' ? todayMatches : tomorrowMatches;
  const isLoading = tab === 'hoje' ? loadingToday : loadingTomorrow;
  const updatedAt = tab === 'hoje' ? updatedToday : updatedTomorrow;

  // Auto refresh every 30 min
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === 'hoje') refetchToday();
      else refetchTomorrow();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [tab, refetchToday, refetchTomorrow]);

  const ranking: RankingFinal = useMemo(() => {
    const upcoming = allMatches.filter(m => m.fixture.status.short === 'NS');
    const analyzed = upcoming.map(analyzeMatch);
    return classificarJogos(analyzed);
  }, [allMatches]);

  const handleRefresh = useCallback(() => {
    if (tab === 'hoje') refetchToday();
    else refetchTomorrow();
  }, [tab, refetchToday, refetchTomorrow]);

  const lastUpdate = updatedAt ? new Date(updatedAt) : null;
  const nextUpdate = lastUpdate ? new Date(lastUpdate.getTime() + AUTO_REFRESH_MS) : null;
  const minsUntilRefresh = nextUpdate ? Math.max(0, Math.round((nextUpdate.getTime() - Date.now()) / 60000)) : null;

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
            <p className="text-[10px] text-muted-foreground">Análise automática dos melhores jogos de hoje</p>
          </div>
        </div>

        {/* Update timestamp + refresh */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {lastUpdate && (
              <span>
                Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                {minsUntilRefresh !== null && ` — próxima em ${minsUntilRefresh} min`}
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

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        {/* Bankroll strip */}
        <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Banca</span>
          </div>
          <span className="font-bold text-primary">R$ {bankrollAmount.toFixed(2)}</span>
          <span className="text-[10px] text-muted-foreground">Aposta segura: R$ {(bankrollAmount * 0.02).toFixed(2)}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['hoje', 'amanha'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {t === 'hoje' ? '📅 HOJE' : '📅 AMANHÃ'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando jogos...</p>
            <p className="text-[10px] text-muted-foreground">Calculando Poisson, EV e Kelly para cada partida</p>
          </div>
        ) : ranking.total === 0 ? (
          <div className="text-center py-16 space-y-2">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-lg font-bold text-foreground">Nenhum jogo recomendado agora</p>
            <p className="text-sm text-muted-foreground">Volte mais tarde para novas análises</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {ranking.total} jogos ranqueados • Poisson + EV + Kelly Criterion
            </p>

            {/* ═══ TOP 3 — PROFETA RECOMENDA ═══ */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-extrabold text-primary uppercase tracking-wider">
                  Profeta Recomenda
                </h2>
                <span className="text-[10px] text-muted-foreground">({ranking.top.length})</span>
              </div>

              {ranking.avisoTop && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-[10px] text-primary font-medium">{ranking.avisoTop}</p>
                </div>
              )}

              <div className="space-y-3">
                {ranking.top.map((m, i) => (
                  <TopCard key={m.fixture.fixture.id} analise={m} index={i} onBet={setSelectedMatch} />
                ))}
              </div>
            </section>

            {/* ═══ MEDIO 2 — VALE A PENA ═══ */}
            {ranking.medio.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-oracle-blue" />
                  <h2 className="text-sm font-extrabold text-oracle-blue uppercase tracking-wider">
                    Vale a Pena
                  </h2>
                  <span className="text-[10px] text-muted-foreground">({ranking.medio.length})</span>
                </div>
                <div className="space-y-3">
                  {ranking.medio.map((m, i) => (
                    <MedioCard key={m.fixture.fixture.id} analise={m} index={i} onBet={setSelectedMatch} />
                  ))}
                </div>
              </section>
            )}

            {/* ═══ EXPLORAR 5 — ESCOLHA DO APOSTADOR ═══ */}
            {ranking.explorar.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
                    Escolha do Apostador
                  </h2>
                  <span className="text-[10px] text-muted-foreground">({ranking.explorar.length})</span>
                </div>
                <div className="space-y-2">
                  {ranking.explorar.map((m, i) => (
                    <ExplorarCard key={m.fixture.fixture.id} analise={m} index={i} onBet={setSelectedMatch} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Bet Panel */}
      <BetPanel
        analise={selectedMatch}
        bankrollAmount={bankrollAmount}
        onClose={() => setSelectedMatch(null)}
      />

      <BottomNav />
    </div>
  );
}
