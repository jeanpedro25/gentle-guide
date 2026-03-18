import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Loader2, TrendingUp, BarChart3, ChevronDown, ChevronUp, AlertTriangle, Check, DollarSign } from 'lucide-react';
import { ApiFixture } from '@/types/fixture';
import { AnaliseJogo, PICK_LABELS_FULL, PICK_LABELS } from '@/lib/jogueAgora';
import { useCreateBet } from '@/hooks/useBets';
import { useBankroll } from '@/hooks/usePredictions';
import { toast } from 'sonner';

interface Props {
  fixture: ApiFixture | null;
  analysis: AnaliseJogo | null;
  analyzing: boolean;
  onBet: (analise: AnaliseJogo) => void;
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
            className={`w-2.5 h-3 rounded-sm ${i < filled ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  );
}

function ProbabilityBar({ label, value }: { label: string; value: number }) {
  const pct = (value * 100).toFixed(0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

export function AnalysisPanel({ fixture, analysis, analyzing, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const createBet = useCreateBet();
  const { data: bankroll } = useBankroll();

  const bankrollAmount = bankroll?.amount ?? 100;
  const safeBet = bankrollAmount * 0.02;
  const betValue = parseFloat(betAmount) || 0;
  const potentialProfit = analysis ? betValue * (analysis.melhor_odd - 1) : 0;
  const totalReturn = betValue + potentialProfit;
  const isExcessive = betValue > safeBet;
  const isDangerous = betValue > bankrollAmount * 0.05;
  const exceedsBankroll = betValue > bankrollAmount;

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
      toast.success('✅ Aposta registrada no histórico! Aguardando resultado do jogo.');
      setBetAmount('');
      setShowConfirm(false);
      onClose();
    } catch {
      toast.error('Erro ao registrar aposta');
    }
  };

  const handleClose = () => {
    setBetAmount('');
    setShowConfirm(false);
    setShowDetails(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {fixture && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/50"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t-2 border-primary/30 rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="p-5 pb-28 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">ANÁLISE PROFETA</span>
                </div>
                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Match info */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-1">
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
                    timeZone: 'America/Sao_Paulo',
                  })}
                </p>
              </div>

              {analyzing ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-foreground">Gerando análise...</p>
                  <p className="text-[10px] text-muted-foreground">Calculando Poisson, EV e Kelly Criterion</p>
                </div>
              ) : analysis ? (
                <>
                  {/* Prediction badge */}
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {PICK_LABELS_FULL[analysis.melhor_resultado]}
                      </span>
                    </div>
                  </div>

                  {/* Predicted score */}
                  <div className="bg-secondary/60 rounded-lg p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Placar Provável</p>
                    <p className="text-3xl font-black text-foreground tracking-widest">{analysis.placar_provavel}</p>
                    <p className="text-[10px] text-muted-foreground">{analysis.prob_placar.toFixed(1)}% de probabilidade</p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">EV</p>
                      <p className={`text-lg font-bold ${analysis.melhor_ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {analysis.melhor_ev > 0 ? '+' : ''}{analysis.melhor_ev.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Odd</p>
                      <p className="text-lg font-bold text-foreground">{analysis.melhor_odd.toFixed(2)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Kelly</p>
                      <p className="text-lg font-bold text-foreground">{(analysis.kellyFraction * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Confiança</p>
                    <ConfidenceBar value={analysis.confianca} />
                  </div>

                  {/* Toggle detailed analysis */}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 border border-border text-sm font-bold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <span>📊 Ver Análise Detalhada</span>
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden space-y-3"
                      >
                        {/* Probability bars */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Probabilidades (Poisson)</p>
                          <ProbabilityBar label={`Casa (${fixture.teams.home.name})`} value={analysis.prob_casa} />
                          <ProbabilityBar label="Empate" value={analysis.prob_empate} />
                          <ProbabilityBar label={`Fora (${fixture.teams.away.name})`} value={analysis.prob_fora} />
                        </div>

                        {/* EV breakdown */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'EV Casa', value: analysis.ev_casa },
                            { label: 'EV Empate', value: analysis.ev_empate },
                            { label: 'EV Fora', value: analysis.ev_fora },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-secondary/50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                              <p className={`text-xs font-bold ${value > 0 ? 'text-primary' : 'text-destructive'}`}>
                                {value > 0 ? '+' : ''}{value.toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Odds comparison */}
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Odds Estimadas</p>
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

                        {/* Kelly suggestion */}
                        <div className="bg-card border border-border rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Kelly Criterion — Sugestão</p>
                          <p className="text-sm font-bold text-primary mt-1">
                            R$ {(bankrollAmount * analysis.kellyFraction).toFixed(2)} ({(analysis.kellyFraction * 100).toFixed(1)}% da banca)
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Banca: R$ {bankrollAmount.toFixed(2)} • Máx seguro: R$ {(bankrollAmount * 0.05).toFixed(2)} (5%)
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── BET SECTION ── */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">VALOR DA APOSTA</span>
                    </div>

                    {!showConfirm ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={betAmount}
                              onChange={e => setBetAmount(e.target.value)}
                              placeholder="0,00"
                              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-card text-lg font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <button
                            onClick={() => betValue > 0 && !exceedsBankroll && setShowConfirm(true)}
                            disabled={betValue <= 0 || exceedsBankroll}
                            className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all hover:bg-primary/90"
                          >
                            Confirmar
                          </button>
                        </div>

                        {/* Potential return display */}
                        {betValue > 0 && !exceedsBankroll && (
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Lucro potencial (odd ×{analysis.melhor_odd.toFixed(2)}):</span>
                              <span className="text-primary font-bold">+ R$ {potentialProfit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Retorno total se ganhar:</span>
                              <span className="text-primary font-extrabold text-base">R$ {totalReturn.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground">
                          Sugestão: R$ {safeBet.toFixed(2)} (2% da banca) • Banca: R$ {bankrollAmount.toFixed(2)}
                        </p>

                        {exceedsBankroll && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                            <p className="text-xs text-destructive font-bold">Valor maior que a banca!</p>
                          </div>
                        )}
                        {isDangerous && !exceedsBankroll && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                            <p className="text-xs text-destructive font-bold">🚨 Acima de 5% — risco muito alto!</p>
                          </div>
                        )}
                        {isExcessive && !isDangerous && !exceedsBankroll && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                            <p className="text-xs text-yellow-500 font-bold">⚠️ Acima de 2% — cuidado</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase">📋 Confirmar aposta</p>
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-sm">
                          {[
                            ['Jogo', `${analysis.fixture.teams.home.name} vs ${analysis.fixture.teams.away.name}`],
                            ['Previsão', `${analysis.melhor_resultado} (${PICK_LABELS[analysis.melhor_resultado]})`],
                            ['Odd', analysis.melhor_odd.toFixed(2)],
                            ['Valor apostado', `R$ ${betValue.toFixed(2)}`],
                            ['Lucro se ganhar', `+ R$ ${potentialProfit.toFixed(2)}`],
                            ['Retorno total', `R$ ${totalReturn.toFixed(2)}`],
                          ].map(([l, v]) => (
                            <div key={l} className="flex justify-between">
                              <span className="text-muted-foreground">{l}</span>
                              <span className="font-bold text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                          A aposta será registrada no histórico e resolvida automaticamente após o jogo.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 py-3 rounded-lg border border-border text-muted-foreground font-bold text-sm"
                          >
                            Voltar
                          </button>
                          <button
                            onClick={handleConfirmBet}
                            disabled={createBet.isPending}
                            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {createBet.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            ✅ Confirmar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
