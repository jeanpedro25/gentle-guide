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
import { ApiFixture } from '@/types/fixture';

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
    const values = [10, safeBet, kellyBet].filter((value) => value > 0);
    return Array.from(new Set(values.map((value) => Number(value.toFixed(2)))));
  }, [kellyBet, safeBet]);

  const handleClose = () => {
    setShowDetails(false);
    setBetAmount('');
    onClose();
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

      toast.success('Aposta registrada no historico.');
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

                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground">Opcao de aposta</p>
                        <p className="text-[11px] text-muted-foreground">
                          Digite quanto vai apostar e veja o lucro se acertar.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-foreground" htmlFor="bet-amount">
                        Quanto vai apostar?
                      </label>
                      <div className="flex items-center rounded-lg border border-border bg-background px-3">
                        <span className="text-sm font-bold text-primary">R$</span>
                        <input
                          id="bet-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="0,00"
                          autoFocus={betMode}
                          className="h-11 w-full bg-transparent px-2 text-sm font-semibold text-foreground outline-none"
                        />
                      </div>
                    </div>

                    {quickValues.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {quickValues.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setBetAmount(value.toFixed(2))}
                            className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            R$ {value.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] text-muted-foreground">Palpite</p>
                        <p className="text-sm font-bold text-foreground">{PICK_LABELS[analysis.melhor_resultado]}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] text-muted-foreground">Odd</p>
                        <p className="text-sm font-bold text-foreground">{analysis.melhor_odd.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] text-muted-foreground">Lucro se acertar</p>
                        <p className="text-sm font-bold text-primary">R$ {potentialProfit.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] text-muted-foreground">Retorno total</p>
                        <p className="text-sm font-bold text-foreground">R$ {totalReturn.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Banca atual</span>
                        <span className="font-bold text-foreground">R$ {bankrollAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Stake segura (2%)</span>
                        <span className="font-bold text-foreground">R$ {safeBet.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Stake sugerida por Kelly</span>
                        <span className="font-bold text-foreground">R$ {kellyBet.toFixed(2)}</span>
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
                          <p className="text-[10px] text-muted-foreground">Se acertar, o lucro estimado sera de R$ {potentialProfit.toFixed(2)}.</p>
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
                      disabled={betValue <= 0 || exceedsBankroll || createBet.isPending}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {createBet.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                      Registrar aposta
                    </button>
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
