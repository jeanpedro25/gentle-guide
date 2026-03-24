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
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateBet } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';
import { AnaliseJogo, PICK_LABELS, PICK_LABELS_FULL } from '@/lib/jogueAgora';
import { gerarDecisaoFinal, getEvExplanation } from '@/lib/evDecision';
import { ApiFixture } from '@/types/fixture';
import { fetchMatchContext } from '@/services/footballApi';
import { analyzeMatch as analyzeOracleMatch } from '@/services/oracleService';
import { OracleAnalysis, probAsPercent } from '@/types/prediction';

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
  const [manualReturn, setManualReturn] = useState('');
  const [oracle, setOracle] = useState<OracleAnalysis | null>(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleError, setOracleError] = useState<string | null>(null);
  const createBet = useCreateBet();
  const { data: bankroll } = useBankroll();

  useEffect(() => {
    setShowDetails(false);
    setBetAmount('');
    setManualReturn('');
    setOracle(null);
    setOracleError(null);
    setOracleLoading(false);
  }, [fixture?.fixture.id]);

  useEffect(() => {
    if (!showDetails || !fixture || oracle || oracleLoading) return;

    let isActive = true;
    const runDetailedAnalysis = async () => {
      try {
        setOracleLoading(true);
        setOracleError(null);
        const context = await fetchMatchContext(fixture);
        const oracleResult = await analyzeOracleMatch(
          fixture,
          context.homeStats,
          context.awayStats,
          context.h2h
        );
        if (isActive) {
          setOracle(oracleResult);
        }
      } catch (err) {
        if (isActive) {
          const message = err instanceof Error ? err.message : 'Erro ao gerar analise detalhada.';
          setOracleError(message);
        }
      } finally {
        if (isActive) {
          setOracleLoading(false);
        }
      }
    };

    runDetailedAnalysis();

    return () => {
      isActive = false;
    };
  }, [fixture, oracle, oracleLoading, showDetails]);

  const bankrollAmount = bankroll?.amount ?? 100;
  const safeBet = bankrollAmount * 0.02;
  const kellyBet = analysis ? Math.min(bankrollAmount * analysis.kellyFraction, bankrollAmount) : 0;
  const decisao = analysis ? gerarDecisaoFinal(analysis.melhor_ev, analysis.confianca) : null;
  const betValue = Number.parseFloat(betAmount.replace(',', '.')) || 0;
  const manualReturnValue = Number.parseFloat(manualReturn.replace(',', '.')) || 0;
  const hasManualReturn = manualReturn.trim().length > 0;
  const potentialProfit = hasManualReturn
    ? Math.max(0, manualReturnValue - betValue)
    : analysis
      ? betValue * (analysis.melhor_odd - 1)
      : 0;
  const totalReturn = hasManualReturn ? manualReturnValue : betValue + potentialProfit;
  const exceedsBankroll = betValue > bankrollAmount;
  const isExcessive = betValue > safeBet;
  const isDangerous = betValue > bankrollAmount * 0.05;

  const quickValues = useMemo(() => {
    const values = [10, safeBet, kellyBet].filter((value) => value > 0);
    return Array.from(new Set(values.map((value) => Number(value.toFixed(2)))));
  }, [kellyBet, safeBet]);

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
    setManualReturn('');
  };

  const handleBetAmountChange = (value: string) => {
    const normalized = value.replace(',', '.');

    if (!/^\d*(\.\d{0,2})?$/.test(normalized)) {
      return;
    }

    setBetAmount(normalized);
  };

  const handleReturnChange = (value: string) => {
    const normalized = value.replace(',', '.');

    if (!/^\d*(\.\d{0,2})?$/.test(normalized)) {
      return;
    }

    setManualReturn(normalized);
  };

  const handleConfirmBet = async () => {
    if (!analysis || !decisao?.botaoApostar || betValue <= 0 || exceedsBankroll) return;

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
            className="fixed bottom-0 left-0 right-0 z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl border-t-2 border-primary/30 bg-background shadow-2xl"
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

              <div className="space-y-1 rounded-lg border border-border bg-card p-4">
                <p className="text-[10px] text-muted-foreground">{fixture.league.name}</p>
                <p className="text-base font-extrabold text-foreground">{fixture.teams.home.name}</p>
                <p className="text-sm text-muted-foreground">vs {fixture.teams.away.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(fixture.fixture.date).toLocaleString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Manaus',
                  })}
                </p>
              </div>

              {analyzing ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-foreground">Gerando analise...</p>
                  <p className="text-[10px] text-muted-foreground">Calculando Poisson, EV e Kelly Criterion</p>
                </div>
              ) : analysis ? (
                <>
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/20 px-4 py-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {PICK_LABELS_FULL[analysis.melhor_resultado]}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-secondary/60 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Placar provavel</p>
                    <p className="text-3xl font-black tracking-widest text-foreground">{analysis.placar_provavel}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {analysis.prob_placar.toFixed(1)}% de probabilidade
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">EV</p>
                      <p className={`text-lg font-bold ${analysis.melhor_ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {analysis.melhor_ev > 0 ? '+' : ''}
                        {analysis.melhor_ev.toFixed(1)}%
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {getEvExplanation(analysis.melhor_ev)}
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

                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">Confianca</p>
                    <ConfidenceBar value={analysis.confianca} />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-destructive/40 bg-[linear-gradient(135deg,rgba(120,18,26,0.34),rgba(32,10,13,0.96))] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.38)]">
                    {decisao && (
                      <div
                        className="rounded-lg border px-3 py-2 text-[11px]"
                        style={{ borderColor: decisao.cor, background: `${decisao.cor}20` }}
                      >
                        <p className="text-[12px] font-bold" style={{ color: decisao.corTexto }}>
                          {decisao.texto}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{decisao.subtexto}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-black/30">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-extrabold uppercase tracking-[0.12em] text-foreground">Sua aposta</p>
                        <p className="text-[11px] text-muted-foreground">
                          Preencha o valor para calcular lucro e retorno automaticamente.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90" htmlFor="bet-amount">
                          Valor apostado (R$)
                        </label>
                        <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/25 px-3 shadow-inner shadow-black/20">
                          <input
                            id="bet-amount"
                            type="text"
                            inputMode="decimal"
                            value={betAmount}
                            onChange={(e) => handleBetAmountChange(e.target.value)}
                            placeholder="Ex: 50.00"
                            autoFocus={betMode}
                            className="h-full w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/70"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                          Retorno se ganhar (R$)
                        </label>
                        <div className="flex h-12 items-center rounded-xl border border-white/10 bg-black/25 px-3 shadow-inner shadow-black/20">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={manualReturn}
                            onChange={(e) => handleReturnChange(e.target.value)}
                            placeholder={betValue > 0 ? formatCurrency(totalReturn) : 'Calculado automaticamente'}
                            className="h-full w-full bg-transparent text-sm font-bold text-primary outline-none placeholder:text-muted-foreground/70"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Lucro = retorno - valor apostado.</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[10, 20, 50, 100].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => applyQuickDelta(value)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-white/10 hover:text-primary"
                        >
                          +{value}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={clearBetAmount}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        Limpar
                      </button>
                    </div>

                    {quickValues.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {quickValues.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setBetAmount(value.toFixed(2))}
                            className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                          >
                            Stake sugerida R$ {value.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Palpite</p>
                        <p className="text-sm font-bold text-foreground">{PICK_LABELS[analysis.melhor_resultado]}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Odd</p>
                        <p className="text-sm font-bold text-foreground">{analysis.melhor_odd.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Lucro</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(potentialProfit)}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Retorno</p>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(totalReturn)}</p>
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
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Stake sugerida por Kelly</span>
                        <span className="font-bold text-foreground">{formatCurrency(kellyBet)}</span>
                      </div>
                    </div>

                    {isDangerous ? (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <div>
                          <p className="text-xs font-bold text-destructive">Valor alto demais para a banca</p>
                          <p className="text-[10px] text-muted-foreground">Essa aposta passa de 5% da banca e aumenta bastante o risco.</p>
                        </div>
                      </div>
                    ) : isExcessive ? (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <p className="text-xs font-bold text-amber-500">Acima da stake segura</p>
                          <p className="text-[10px] text-muted-foreground">Pode apostar, mas o valor esta acima dos 2% recomendados.</p>
                        </div>
                      </div>
                    ) : betValue > 0 ? (
                      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-primary">Aposta dentro do controle</p>
                          <p className="text-[10px] text-muted-foreground">Se acertar, o lucro estimado sera de {formatCurrency(potentialProfit)}.</p>
                        </div>
                      </div>
                    ) : null}

                    {exceedsBankroll && (
                      <p className="text-[11px] font-bold text-destructive">
                        O valor apostado nao pode ser maior que sua banca.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmBet}
                      disabled={!decisao?.botaoApostar || betValue <= 0 || exceedsBankroll || createBet.isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ff4d4f,#ff2f2f)] text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_14px_30px_rgba(255,58,58,0.28)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {createBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                      {decisao?.botaoApostar ? 'Registrar aposta' : 'APOSTA NAO RECOMENDADA — EV INSUFICIENTE'}
                    </button>

                    <p className="text-center text-[10px] text-muted-foreground">
                      {betValue > 0
                        ? `Aposta de ${formatCurrency(betValue)} pode retornar ${formatCurrency(totalReturn)} se bater.`
                        : 'Preencha o valor para calcular lucro'}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary/80"
                  >
                    <span>Ver analise detalhada (IA)</span>
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

                        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Analise detalhada (IA)</p>
                            {oracle ? (
                              <span className="text-[10px] font-bold text-primary">ATIVA</span>
                            ) : oracleLoading ? (
                              <span className="text-[10px] text-muted-foreground">GERANDO...</span>
                            ) : oracleError ? (
                              <span className="text-[10px] text-destructive">FALHOU</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">AGUARDANDO</span>
                            )}
                          </div>

                          {oracleLoading && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Gerando analise com dados taticos, EV e Kelly...
                            </div>
                          )}

                          {oracleError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                              {oracleError}
                            </div>
                          )}

                          {oracle && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-secondary/60 p-2 text-center">
                                  <p className="text-[10px] text-muted-foreground">Veredito</p>
                                  <p className="text-xs font-bold text-foreground">{oracle.verdict}</p>
                                </div>
                                <div className="rounded-lg bg-secondary/60 p-2 text-center">
                                  <p className="text-[10px] text-muted-foreground">Confianca</p>
                                  <p className="text-xs font-bold text-foreground">{oracle.primaryBet.confidence}</p>
                                </div>
                                <div className="rounded-lg bg-secondary/60 p-2 text-center">
                                  <p className="text-[10px] text-muted-foreground">EV</p>
                                  <p className={`text-xs font-bold ${oracle.primaryBet.ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                                    {oracle.primaryBet.ev > 0 ? '+' : ''}{oracle.primaryBet.ev.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="rounded-lg bg-secondary/60 p-2 text-center">
                                  <p className="text-[10px] text-muted-foreground">Kelly</p>
                                  <p className="text-xs font-bold text-foreground">{oracle.primaryBet.kellyFraction.toFixed(1)}%</p>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aposta principal</p>
                                <p className="text-xs font-bold text-foreground">{oracle.primaryBet.market}</p>
                                <p className="text-[11px] text-muted-foreground">{oracle.primaryBet.reasoning}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border/60 bg-background p-2">
                                  <p className="text-[10px] text-muted-foreground">1X2</p>
                                  <p className="text-[11px] text-foreground">
                                    Casa {probAsPercent(oracle.probabilities.homeWin).toFixed(0)}% · Emp {probAsPercent(oracle.probabilities.draw).toFixed(0)}% · Fora {probAsPercent(oracle.probabilities.awayWin).toFixed(0)}%
                                  </p>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-background p-2">
                                  <p className="text-[10px] text-muted-foreground">Over 2.5 / BTTS</p>
                                  <p className="text-[11px] text-foreground">
                                    Over {probAsPercent(oracle.probabilities.over25).toFixed(0)}% · BTTS {probAsPercent(oracle.probabilities.btts).toFixed(0)}%
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border/60 bg-background p-2">
                                  <p className="text-[10px] text-muted-foreground">xG (Poisson)</p>
                                  <p className="text-[11px] text-foreground">
                                    {oracle.poisson.homeExpectedGoals.toFixed(2)} x {oracle.poisson.awayExpectedGoals.toFixed(2)}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-background p-2">
                                  <p className="text-[10px] text-muted-foreground">Placar provavel</p>
                                  <p className="text-[11px] text-foreground">
                                    {oracle.predictedScore ? `${oracle.predictedScore.home}x${oracle.predictedScore.away}` : (oracle.poisson.mostLikelyScores?.[0]?.score ?? 'N/A')}
                                  </p>
                                </div>
                              </div>

                              {(oracle.redFlags?.length ?? 0) > 0 && (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Red flags</p>
                                  <p className="text-[11px] text-destructive">{oracle.redFlags.join(' · ')}</p>
                                </div>
                              )}

                              <div className="rounded-lg border border-border/60 bg-background p-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fatores-chave</p>
                                <p className="text-[11px] text-foreground">Vantagem casa: {oracle.homeAdvantage} · Goleiros: {oracle.goalkeeperEdge} · Impacto lesoes: {oracle.injuryImpact}</p>
                                <p className="text-[11px] text-muted-foreground">{oracle.tacticalEdge}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'EV Casa', value: analysis.ev_casa },
                            { label: 'EV Empate', value: analysis.ev_empate },
                            { label: 'EV Fora', value: analysis.ev_fora },
                          ].map(({ label, value }) => (
                            <div key={label} className="rounded-lg bg-secondary/50 p-2 text-center">
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                              <p className={`text-xs font-bold ${value > 0 ? 'text-primary' : 'text-destructive'}`}>
                                {value > 0 ? '+' : ''}
                                {value.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Odds estimadas</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Casa</p>
                              <p className="text-sm font-bold text-foreground">{analysis.odd_casa.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Empate</p>
                              <p className="text-sm font-bold text-foreground">{analysis.odd_empate.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Fora</p>
                              <p className="text-sm font-bold text-foreground">{analysis.odd_fora.toFixed(2)}</p>
                            </div>
                          </div>
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
