import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  Shield,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBet } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';
import { AnaliseJogo, PICK_LABELS, PICK_LABELS_FULL } from '@/lib/jogueAgora';
import { ApiFixture } from '@/types/fixture';

const MANUAL_BET_STORAGE_KEY = 'profeta-bet:manual-bets';

type ManualBetSnapshot = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  stake: number;
  odd: number;
  potentialProfit: number;
  totalReturn: number;
  createdAt: string;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function saveManualBetSnapshot(snapshot: ManualBetSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    const stored = window.localStorage.getItem(MANUAL_BET_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as ManualBetSnapshot[]) : [];
    const next = [snapshot, ...parsed].slice(0, 20);
    window.localStorage.setItem(MANUAL_BET_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // keep UI flow even if local storage is unavailable
  }
}

interface Props {
  fixture: ApiFixture | null;
  analysis: AnaliseJogo | null;
  analyzing: boolean;
  betMode?: boolean;
  onClose: () => void;
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-2.5 rounded-sm ${i < filled ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  );
}

function ProbabilityBar({ label, value }: { label: string; value: number }) {
  const pct = value * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({ fixture, analysis, analyzing, betMode = false, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const createBet = useCreateBet();
  const { data: bankroll } = useBankroll();

  useEffect(() => {
    setShowDetails(false);
    setBetAmount('');
  }, [fixture?.fixture.id]);

  const bankrollAmount = bankroll?.amount ?? 100;
  const safeBet = bankrollAmount * 0.02;
  const kellyBet = analysis ? Math.min(bankrollAmount * analysis.kellyFraction, bankrollAmount) : 0;
  const betValue = Number.parseFloat(betAmount.replace(',', '.')) || 0;
  const potentialProfit = analysis ? betValue * (analysis.melhor_odd - 1) : 0;
  const totalReturn = betValue + potentialProfit;
  const exceedsBankroll = betValue > bankrollAmount;
  const isExcessive = betValue > safeBet;
  const isDangerous = betValue > bankrollAmount * 0.05;

  const quickValues = useMemo(() => {
    const values = [10, 20, 50, 100].filter((value) => value > 0);
    return values;
  }, []);

  const handleClose = () => {
    setShowDetails(false);
    setBetAmount('');
    onClose();
  };

  const applyQuickDelta = (delta: number) => {
    const nextValue = Math.max(0, betValue + delta);
    setBetAmount(nextValue > 0 ? nextValue.toFixed(2) : '');
  };

  const clearBetAmount = () => {
    setBetAmount('');
  };

  const handleBetAmountChange = (value: string) => {
    const normalized = value.replace(',', '.');

    if (!/^\d*(\.\d{0,2})?$/.test(normalized)) {
      return;
    }

    setBetAmount(normalized);
  };

  const handleConfirmBet = async () => {
    if (!analysis || betValue <= 0 || exceedsBankroll) return;

    try {
      await createBet.mutateAsync({
        home_team: analysis.fixture.teams.home.name,
        away_team: analysis.fixture.teams.away.name,
        league: analysis.fixture.league.name,
        fixture_id: analysis.fixture.fixture.id,
        prediction: analysis.melhor_resultado,
        stake: betValue,
        potential_profit: potentialProfit,
        odd: analysis.melhor_odd,
      });

      saveManualBetSnapshot({
        fixtureId: analysis.fixture.fixture.id,
        homeTeam: analysis.fixture.teams.home.name,
        awayTeam: analysis.fixture.teams.away.name,
        league: analysis.fixture.league.name,
        prediction: analysis.melhor_resultado,
        stake: betValue,
        odd: analysis.melhor_odd,
        potentialProfit,
        totalReturn,
        createdAt: new Date().toISOString(),
      });

      toast.success('Aposta registrada com sucesso.', {
        description: `${formatCurrency(betValue)} -> lucro estimado de ${formatCurrency(potentialProfit)}.`,
      });
      handleClose();
    } catch {
      toast.error('Erro ao registrar aposta.');
    }
  };

  return (
    <AnimatePresence>
      {fixture && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/50"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] max-h-[95vh] overflow-y-auto rounded-t-2xl border-t-2 border-primary/30 bg-background shadow-2xl"
          >
            <div className="space-y-4 p-5 pb-28">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">ANALISE PROFETA</span>
                </div>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Match Header */}
              <div className="space-y-1 rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] text-muted-foreground">{fixture.league.name}</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-base font-extrabold text-foreground">{fixture.teams.home.name}</p>
                    <p className="text-sm text-muted-foreground">vs {fixture.teams.away.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">
                      {fixture.goals.home ?? 0} x {fixture.goals.away ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(fixture.fixture.date).toLocaleString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Manaus',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {analyzing ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-foreground">Gerando analise...</p>
                  <p className="text-[10px] text-muted-foreground">Calculando Poisson, EV e Kelly Criterion</p>
                </div>
              ) : analysis ? (
                <>
                  {/* Placar Provavel */}
                  <div className="rounded-lg bg-secondary/60 p-4 text-center border border-primary/10">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Placar provavel</p>
                    <p className="text-3xl font-black tracking-widest text-foreground">{analysis.placar_provavel}</p>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/20 border border-primary/30">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary">
                        VENCEDOR: {fixture.teams.home.name.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* ═══ NOVO BLOCO: CARD DE APOSTA ═══ */}
                  <div className="space-y-4 rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(22,22,22,0.9),rgba(30,30,30,0.95))] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.38)]">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-foreground">Sua Aposta</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="bet-amount">
                          Valor apostado (R$)
                        </label>
                        <div className="relative">
                          <input
                            id="bet-amount"
                            type="text"
                            inputMode="decimal"
                            value={betAmount}
                            onChange={(e) => handleBetAmountChange(e.target.value)}
                            placeholder="0,00"
                            autoFocus={betMode}
                            className="h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm font-bold text-foreground outline-none focus:border-primary/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Lucro se ganhar (R$)
                        </label>
                        <div className="flex h-11 items-center rounded-lg border border-white/5 bg-white/5 px-3">
                          <span className={`text-sm font-bold ${betValue > 0 ? 'text-primary' : 'text-muted-foreground/50'}`}>
                            {betValue > 0 ? potentialProfit.toFixed(2) : 'Calculado automaticamente'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {quickValues.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => applyQuickDelta(value)}
                          className="flex-1 min-w-[50px] rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-foreground transition-all hover:border-primary/40 hover:bg-white/10"
                        >
                          +{value}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={clearBetAmount}
                        className="flex-1 min-w-[70px] rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-bold uppercase text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        Limpar
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmBet}
                      disabled={betValue <= 0 || exceedsBankroll || createBet.isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff4d4f,#ff2f2f)] text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_10px_20px_rgba(255,58,58,0.2)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                      Registrar Aposta
                    </button>

                    <p className="text-center text-[10px] text-muted-foreground">
                      {betValue > 0
                        ? `Aposta de R$ ${betValue.toFixed(2)} pode retornar R$ ${totalReturn.toFixed(2)}`
                        : 'Preencha o valor para calcular o lucro'}
                    </p>
                  </div>

                  {/* Resumo Completo da Analise */}
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Resumo Completo da Analise</span>
                      </div>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">1-1</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Placar provavel</span>
                        <span className="font-bold text-foreground">{analysis.placar_provavel}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Vencedor provavel</span>
                        <span className="font-bold text-foreground">{fixture.teams.home.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confianca</span>
                        <div className="flex items-center gap-1">
                          <span className="text-primary">★★★★☆</span>
                          <span className="font-bold text-foreground">GRAU B (75%)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">EV (Expected Value)</span>
                        <span className="font-bold text-primary">+{analysis.melhor_ev.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Melhor mercado</span>
                        <span className="font-bold text-foreground">{fixture.teams.home.name} - Handicap Asiatico 0.0</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Vantagem tatica</span>
                        <span className="font-bold text-foreground">Casa (jogando em casa)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">EV</p>
                      <p className={`text-lg font-bold ${analysis.melhor_ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {analysis.melhor_ev > 0 ? '+' : ''}
                        {analysis.melhor_ev.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Odd</p>
                      <p className="text-lg font-bold text-foreground">{analysis.melhor_odd.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Kelly</p>
                      <p className="text-lg font-bold text-foreground">{(analysis.kellyFraction * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Banca atual</span>
                      <span className="font-bold text-foreground">{formatCurrency(bankrollAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Stake segura (2%)</span>
                      <span className="font-bold text-foreground">{formatCurrency(safeBet)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary/80"
                  >
                    <span>Ver analise detalhada</span>
                    {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Probabilidades (Poisson)</p>
                          <ProbabilityBar label={`Casa (${fixture.teams.home.name})`} value={analysis.prob_casa} />
                          <ProbabilityBar label="Empate" value={analysis.prob_empate} />
                          <ProbabilityBar label={`Fora (${fixture.teams.away.name})`} value={analysis.prob_fora} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}