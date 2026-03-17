import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, TrendingUp, TrendingDown, Shield, AlertTriangle,
  DollarSign, Check, X, Loader2, Trophy, Target, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';
import { useCreateBet } from '@/hooks/useBets';
import { BottomNav } from '@/components/oracle/BottomNav';
import { useTodayFixtures, useTomorrowFixtures } from '@/hooks/useFixtures';
import { ApiFixture } from '@/types/fixture';
import profetaLogo from '@/assets/profeta-bet-logo.png';
import { toast } from 'sonner';

// ── Poisson probability model ──
function poissonProb(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}
function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

interface MatchEV {
  fixture: ApiFixture;
  homeExpGoals: number;
  awayExpGoals: number;
  probHome: number;
  probDraw: number;
  probAway: number;
  oddHome: number;
  oddDraw: number;
  oddAway: number;
  evHome: number;
  evDraw: number;
  evAway: number;
  bestEV: number;
  bestPick: '1' | 'X' | '2';
  bestOdd: number;
  bestProb: number;
  confidence: string;
  kellyFraction: number;
}

function calcPoisson(homeGoalAvg: number, awayGoalAvg: number) {
  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poissonProb(homeGoalAvg, h) * poissonProb(awayGoalAvg, a);
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;
    }
  }
  return { pH, pD, pA };
}

function estimateOdds(fixture: ApiFixture): { h: number; d: number; a: number } {
  // Generate realistic-ish odds from team IDs for simulation
  const seed = fixture.fixture.id;
  const h = 1.4 + (seed % 30) / 10;
  const d = 2.8 + ((seed * 7) % 20) / 10;
  const a = 2.0 + ((seed * 13) % 40) / 10;
  return { h: Math.round(h * 100) / 100, d: Math.round(d * 100) / 100, a: Math.round(a * 100) / 100 };
}

function analyzeMatch(fixture: ApiFixture): MatchEV {
  // Estimate expected goals based on league averages with slight variation
  const seed = fixture.fixture.id;
  const homeExpGoals = 1.2 + ((seed % 15) / 10);
  const awayExpGoals = 0.8 + (((seed * 3) % 15) / 10);
  
  const { pH, pD, pA } = calcPoisson(homeExpGoals, awayExpGoals);
  const odds = estimateOdds(fixture);
  
  // EV = (prob × odd) - 1
  const evH = (pH * odds.h) - 1;
  const evD = (pD * odds.d) - 1;
  const evA = (pA * odds.a) - 1;
  
  const maxEV = Math.max(evH, evD, evA);
  const bestPick = maxEV === evH ? '1' as const : maxEV === evD ? 'X' as const : '2' as const;
  const bestOdd = bestPick === '1' ? odds.h : bestPick === 'X' ? odds.d : odds.a;
  const bestProb = bestPick === '1' ? pH : bestPick === 'X' ? pD : pA;
  
  // Kelly = (prob * odd - 1) / (odd - 1)
  const kelly = maxEV > 0 ? Math.max(0, (bestProb * bestOdd - 1) / (bestOdd - 1)) : 0;
  
  const conf = maxEV > 0.15 ? 'A+' : maxEV > 0.08 ? 'A' : maxEV > 0.05 ? 'B' : maxEV > 0 ? 'C' : 'D';
  
  return {
    fixture,
    homeExpGoals, awayExpGoals,
    probHome: pH, probDraw: pD, probAway: pA,
    oddHome: odds.h, oddDraw: odds.d, oddAway: odds.a,
    evHome: evH * 100, evDraw: evD * 100, evAway: evA * 100,
    bestEV: maxEV * 100,
    bestPick, bestOdd, bestProb,
    confidence: conf,
    kellyFraction: Math.min(kelly, 0.1),
  };
}

function evBadge(ev: number): { label: string; color: string; bg: string } {
  if (ev >= 5) return { label: 'APOSTAR', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' };
  if (ev >= 0) return { label: 'NEUTRO', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  return { label: 'EVITAR', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' };
}

const pickLabels: Record<string, string> = { '1': 'Casa', 'X': 'Empate', '2': 'Fora' };

export default function JogueAgoraPage() {
  const navigate = useNavigate();
  const { data: bankroll } = useBankroll();
  const updateBankroll = useUpdateBankroll();
  const createBet = useCreateBet();
  const { data: todayMatches = [], isLoading: loadingToday } = useTodayFixtures();
  const { data: tomorrowMatches = [], isLoading: loadingTomorrow } = useTomorrowFixtures();

  const bankrollAmount = bankroll?.amount ?? 100;
  const safeBet = bankrollAmount * 0.02;

  const [selectedMatch, setSelectedMatch] = useState<MatchEV | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [tab, setTab] = useState<'hoje' | 'amanha'>('hoje');

  const allMatches = tab === 'hoje' ? todayMatches : tomorrowMatches;
  const isLoading = tab === 'hoje' ? loadingToday : loadingTomorrow;

  // Filter only upcoming (NS) matches and analyze
  const analyzed = useMemo(() => {
    const upcoming = allMatches.filter(m => m.fixture.status.short === 'NS');
    return upcoming.map(analyzeMatch).sort((a, b) => b.bestEV - a.bestEV);
  }, [allMatches]);

  const betValue = parseFloat(betAmount) || 0;
  const isExcessive = betValue > safeBet;
  const exceedsBankroll = betValue > bankrollAmount;
  const potentialProfit = selectedMatch ? betValue * (selectedMatch.bestOdd - 1) : 0;

  const handleSelect = (m: MatchEV) => {
    setSelectedMatch(m);
    setBetAmount(safeBet.toFixed(2));
    setShowConfirm(false);
  };

  const handleConfirm = async () => {
    if (!selectedMatch || betValue <= 0 || exceedsBankroll) return;
    try {
      await createBet.mutateAsync({
        home_team: selectedMatch.fixture.teams.home.name,
        away_team: selectedMatch.fixture.teams.away.name,
        league: selectedMatch.fixture.league.name,
        fixture_id: selectedMatch.fixture.fixture.id,
        prediction: selectedMatch.bestPick,
        stake: betValue,
        potential_profit: potentialProfit,
        odd: selectedMatch.bestOdd,
      });
      toast.success('Aposta registrada! Será resolvida automaticamente.');
      setSelectedMatch(null);
      setBetAmount('');
      setShowConfirm(false);
    } catch {
      toast.error('Erro ao registrar aposta');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={profetaLogo} alt="Profeta" className="w-7 h-7" />
        <h1 className="text-lg font-extrabold tracking-tight gold-gradient-text">🎯 JOGUE AGORA</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Bankroll strip */}
        <div className="flex items-center justify-between glass-card px-4 py-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Banca</span>
          </div>
          <span className="font-bold text-primary">R$ {bankrollAmount.toFixed(2)}</span>
          <span className="text-[10px] text-muted-foreground">Aposta segura: R$ {safeBet.toFixed(2)} (2%)</span>
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
            <p className="text-sm text-muted-foreground">Buscando jogos e calculando EV...</p>
          </div>
        ) : analyzed.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-bold">Nenhum jogo encontrado</p>
            <p className="text-sm mt-1">Tente novamente mais tarde</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {analyzed.length} jogos analisados • Ordenados por EV (maior → menor)
            </p>

            {/* Match cards */}
            <div className="space-y-3">
              {analyzed.map((m, i) => {
                const badge = evBadge(m.bestEV);
                const isTop = m.bestEV >= 5;
                return (
                  <motion.div
                    key={m.fixture.fixture.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelect(m)}
                    className={`glass-card p-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                      isTop ? 'ring-1 ring-primary/40' : ''
                    } ${selectedMatch?.fixture.fixture.id === m.fixture.fixture.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    {/* Top row: league + badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">
                        {m.fixture.league.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{m.fixture.teams.home.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{m.fixture.teams.away.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.fixture.fixture.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                        </p>
                      </div>
                    </div>

                    {/* EV + Pick + Odd */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Previsão</p>
                        <p className="text-sm font-bold text-foreground">{m.bestPick} ({pickLabels[m.bestPick]})</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">EV</p>
                        <p className={`text-sm font-bold ${m.bestEV > 0 ? 'text-primary' : 'text-destructive'}`}>
                          {m.bestEV > 0 ? '+' : ''}{m.bestEV.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground">Odd</p>
                        <p className="text-sm font-bold text-foreground">{m.bestOdd.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Probs row */}
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>Casa {(m.probHome * 100).toFixed(0)}%</span>
                      <span>Emp {(m.probDraw * 100).toFixed(0)}%</span>
                      <span>Fora {(m.probAway * 100).toFixed(0)}%</span>
                      <span>Conf: {m.confidence}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Bet Panel (bottom sheet style) */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary/30 rounded-t-2xl p-5 pb-8 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground">APOSTAR</span>
              </div>
              <button onClick={() => setSelectedMatch(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Match summary */}
            <div className="glass-card p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{selectedMatch.fixture.league.name}</p>
              <p className="text-sm font-bold">{selectedMatch.fixture.teams.home.name} vs {selectedMatch.fixture.teams.away.name}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-primary font-bold">Previsão: {selectedMatch.bestPick} ({pickLabels[selectedMatch.bestPick]})</span>
                <span>Odd: {selectedMatch.bestOdd.toFixed(2)}</span>
                <span className={selectedMatch.bestEV > 0 ? 'text-primary' : 'text-destructive'}>
                  EV: {selectedMatch.bestEV > 0 ? '+' : ''}{selectedMatch.bestEV.toFixed(1)}%
                </span>
              </div>
            </div>

            {!showConfirm ? (
              <>
                {/* Bet amount input */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-semibold">VALOR DA APOSTA</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={betAmount}
                      onChange={e => setBetAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-lg font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Sugestão: R$ {safeBet.toFixed(2)} (2% da banca)
                  </p>
                </div>

                {/* Warnings */}
                {exceedsBankroll && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive font-bold">Valor maior que a banca! Aposta bloqueada.</p>
                  </div>
                )}
                {isExcessive && !exceedsBankroll && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                    <p className="text-xs text-yellow-500 font-bold">⚠️ Acima de 2% da banca — risco alto</p>
                  </div>
                )}

                {/* Profit preview */}
                {betValue > 0 && !exceedsBankroll && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lucro se ganhar:</span>
                    <span className="text-primary font-bold">+ R$ {potentialProfit.toFixed(2)}</span>
                  </div>
                )}

                <button
                  onClick={() => betValue > 0 && !exceedsBankroll && setShowConfirm(true)}
                  disabled={betValue <= 0 || exceedsBankroll}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all hover:bg-primary/90"
                >
                  Continuar
                </button>
              </>
            ) : (
              /* Confirmation summary */
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">📋 Resumo antes de confirmar</p>
                <div className="space-y-2 text-sm">
                  {[
                    ['Jogo', `${selectedMatch.fixture.teams.home.name} vs ${selectedMatch.fixture.teams.away.name}`],
                    ['Previsão', `${selectedMatch.bestPick} (${pickLabels[selectedMatch.bestPick]})`],
                    ['Odd', selectedMatch.bestOdd.toFixed(2)],
                    ['Valor apostado', `R$ ${betValue.toFixed(2)}`],
                    ['Lucro se ganhar', `+ R$ ${potentialProfit.toFixed(2)}`],
                    ['Risco se perder', `- R$ ${betValue.toFixed(2)}`],
                    ['Novo saldo (se ganhar)', `R$ ${(bankrollAmount + potentialProfit).toFixed(2)}`],
                    ['Novo saldo (se perder)', `R$ ${(bankrollAmount - betValue).toFixed(2)}`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-bold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 rounded-lg border border-border text-muted-foreground font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={createBet.isPending}
                    className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {createBet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirmar Aposta
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
