import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, DollarSign, RefreshCw, Clock, AlertTriangle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll } from '@/hooks/usePredictions';
import { useTodayFixtures, useTomorrowFixtures } from '@/hooks/useFixtures';
import { BottomNav } from '@/components/oracle/BottomNav';
import { MatchListItem } from '@/components/jogueAgora/MatchListItem';
import { AnalysisPanel } from '@/components/jogueAgora/AnalysisPanel';
import { analyzeMatch, type AnaliseJogo } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';
import profetaLogo from '@/assets/profeta-bet-logo.png';

const AUTO_REFRESH_MS = 30 * 60 * 1000;

export default function JogueAgoraPage() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const { data: todayMatches = [], isLoading: loadingToday, refetch: refetchToday, dataUpdatedAt: updatedToday } = useTodayFixtures();
  const { data: tomorrowMatches = [], isLoading: loadingTomorrow, refetch: refetchTomorrow, dataUpdatedAt: updatedTomorrow } = useTomorrowFixtures();

  const bankrollAmount = bankroll?.amount ?? 100;
  const [tab, setTab] = useState<'hoje' | 'amanha'>('hoje');
  const [search, setSearch] = useState('');
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [analysis, setAnalysis] = useState<AnaliseJogo | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  

  const allMatches = tab === 'hoje' ? todayMatches : tomorrowMatches;
  const isLoading = tab === 'hoje' ? loadingToday : loadingTomorrow;
  const updatedAt = tab === 'hoje' ? updatedToday : updatedTomorrow;

  // Filter only upcoming (NS) matches
  const upcoming = allMatches.filter(m => m.fixture.status.short === 'NS');

  // Search filter
  const filtered = search.trim()
    ? upcoming.filter(m => {
        const q = search.toLowerCase();
        return (
          m.teams.home.name.toLowerCase().includes(q) ||
          m.teams.away.name.toLowerCase().includes(q) ||
          m.league.name.toLowerCase().includes(q)
        );
      })
    : upcoming;

  // Group by league
  const grouped = filtered.reduce<Record<string, ApiFixture[]>>((acc, m) => {
    const key = m.league.name || 'Outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === 'hoje') refetchToday();
      else refetchTomorrow();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [tab, refetchToday, refetchTomorrow]);

  const handleRefresh = useCallback(() => {
    if (tab === 'hoje') refetchToday();
    else refetchTomorrow();
  }, [tab, refetchToday, refetchTomorrow]);

  const handleAnalyze = useCallback((fixture: ApiFixture) => {
    setSelectedFixture(fixture);
    setAnalyzing(true);
    setAnalysis(null);
    // Simulate brief analysis time for UX
    setTimeout(() => {
      const result = analyzeMatch(fixture);
      setAnalysis(result);
      setAnalyzing(false);
    }, 800);
  }, []);

  const handleBet = useCallback((analise: AnaliseJogo) => {
    setBetAnalise(analise);
  }, []);

  const handleCloseAnalysis = useCallback(() => {
    setSelectedFixture(null);
    setAnalysis(null);
    setAnalyzing(false);
  }, []);

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
            <p className="text-[10px] text-muted-foreground">Escolha um jogo e gere a análise</p>
          </div>
        </div>

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

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
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
              onClick={() => { setTab(t); setSearch(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {t === 'hoje' ? '📅 HOJE' : '📅 AMANHÃ'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar time ou liga..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando jogos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-lg font-bold text-foreground">
              {search ? 'Nenhum jogo encontrado' : 'Nenhum jogo disponível'}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? 'Tente outro termo de busca' : 'Volte mais tarde para novos jogos'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} jogos disponíveis • Toque para analisar
            </p>

            {Object.entries(grouped).map(([league, matches]) => (
              <section key={league} className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{league}</h2>
                <div className="space-y-1.5">
                  {matches.map(m => (
                    <MatchListItem
                      key={m.fixture.id}
                      fixture={m}
                      onAnalyze={handleAnalyze}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {/* Analysis Panel (slide-up when a match is selected) */}
      <AnalysisPanel
        fixture={selectedFixture}
        analysis={analysis}
        analyzing={analyzing}
        onBet={handleBet}
        onClose={handleCloseAnalysis}
      />

      {/* Bet Panel */}
      <BetPanel
        analise={betAnalise}
        bankrollAmount={bankrollAmount}
        onClose={() => setBetAnalise(null)}
      />

      <BottomNav />
    </div>
  );
}
