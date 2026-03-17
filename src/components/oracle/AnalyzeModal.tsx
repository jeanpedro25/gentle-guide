import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, TrendingUp, AlertTriangle, Target, DollarSign, Check } from 'lucide-react';
import { OracleAnalysis, probAsPercent } from '@/types/prediction';
import { toast } from 'sonner';

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  oracle: OracleAnalysis | null;
  homeTeam: string;
  awayTeam: string;
  isLoading: boolean;
  bankrollAmount?: number;
}

export function AnalyzeModal({ isOpen, onClose, oracle, homeTeam, awayTeam, isLoading, bankrollAmount = 200 }: AnalyzeModalProps) {
  const [betAmount, setBetAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const kellyStake = oracle ? Math.min(oracle.primaryBet.kellyFraction * bankrollAmount, bankrollAmount * 0.1) : 0;
  const kellyPct = oracle ? Math.min(oracle.primaryBet.kellyFraction * 100, 10) : 0;

  const maxSafe = bankrollAmount * 0.05; // 5% = R$10 for R$200
  const betValue = parseFloat(betAmount) || 0;
  const isExcessive = betValue > maxSafe;
  const suggestedSafe = bankrollAmount * 0.02;

  // Calculate potential profit based on a default odd
  const defaultOdd = 2.0;
  const potentialProfit = betValue > 0 ? betValue * (defaultOdd - 1) : 0;

  const handleConfirm = () => {
    if (betValue <= 0) {
      toast.error('Digite um valor válido');
      return;
    }
    setConfirmed(true);
    toast.success(`Aposta de R$ ${betValue.toFixed(2)} confirmada! Sistema monitorando...`);
  };

  const handleClose = () => {
    setBetAmount('');
    setConfirmed(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl tracking-wider text-foreground">ANÁLISE PROFETA</h2>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-body text-muted-foreground text-sm">Analisando com IA...</p>
            </div>
          ) : oracle ? (
            <>
              {/* Predicted Score */}
              {oracle.predictedScore && (
                <div className="text-center space-y-2">
                  <p className="text-xs font-display tracking-wider text-muted-foreground">PLACAR PREVISTO</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-body text-sm text-foreground">{homeTeam}</span>
                    <span className="font-display text-5xl text-primary">{oracle.predictedScore.home}</span>
                    <span className="font-display text-2xl text-muted-foreground">×</span>
                    <span className="font-display text-5xl text-primary">{oracle.predictedScore.away}</span>
                    <span className="font-body text-sm text-foreground">{awayTeam}</span>
                  </div>
                </div>
              )}

              {/* Confidence bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">Confiança</span>
                  <span className="text-foreground font-semibold">{oracle.primaryBet.confidence}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${oracle.primaryBet.ev > 15 ? 95 : oracle.primaryBet.ev > 8 ? 75 : oracle.primaryBet.ev > 3 ? 55 : 30}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      oracle.verdict === 'APOSTAR' ? 'bg-primary neon-glow-green' : 'bg-destructive neon-glow-crimson'
                    }`}
                  />
                </div>
              </div>

              {/* Verdict */}
              <div className={`p-4 rounded-xl border text-center ${
                oracle.verdict === 'APOSTAR'
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-destructive/40 bg-destructive/5'
              }`}>
                <span className={`font-display text-2xl tracking-widest ${
                  oracle.verdict === 'APOSTAR' ? 'text-primary' : 'text-destructive'
                }`}>
                  {oracle.verdict === 'APOSTAR' ? '✅ APOSTAR' : '❌ PASSAR'}
                </span>
              </div>

              {/* Market + EV */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
                    <Target className="w-3 h-3" /> Mercado
                  </div>
                  <p className="font-body text-sm text-foreground font-semibold">{oracle.primaryBet.market}</p>
                </div>
                <div className="glass-card p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
                    <TrendingUp className="w-3 h-3" /> EV
                  </div>
                  <p className={`font-display text-lg ${oracle.primaryBet.ev > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {oracle.primaryBet.ev > 0 ? '+' : ''}{oracle.primaryBet.ev.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Kelly / Suggested Stake */}
              <div className="glass-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                  <DollarSign className="w-3 h-3" /> Kelly Criterion — Sugestão
                </div>
                <p className="font-display text-xl text-primary">
                  R$ {kellyStake.toFixed(2)} <span className="text-sm text-muted-foreground">({kellyPct.toFixed(1)}% da banca)</span>
                </p>
                <p className="text-xs font-body text-muted-foreground">
                  Banca: R$ {bankrollAmount.toFixed(2)} • Máx seguro: R$ {maxSafe.toFixed(2)} (5%)
                </p>
              </div>

              {/* ═══ BET INPUT SECTION ═══ */}
              <div className={`p-4 rounded-xl border-2 space-y-3 transition-colors ${
                isExcessive
                  ? 'border-destructive/60 bg-destructive/5'
                  : confirmed
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-border bg-card'
              }`}>
                <p className="text-xs font-display tracking-wider text-muted-foreground">
                  💰 VALOR DA APOSTA
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={betAmount}
                      onChange={e => { setBetAmount(e.target.value); setConfirmed(false); }}
                      placeholder="0,00"
                      disabled={confirmed}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border text-lg font-bold bg-background focus:outline-none transition-colors ${
                        isExcessive
                          ? 'border-destructive text-destructive focus:ring-destructive'
                          : 'border-border text-foreground focus:ring-primary focus:border-primary'
                      } disabled:opacity-60`}
                    />
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={betValue <= 0 || confirmed}
                    className={`px-5 py-3 rounded-lg font-bold text-sm transition-all ${
                      confirmed
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40'
                    }`}
                  >
                    {confirmed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>

                {/* Excessive risk warning */}
                {isExcessive && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-destructive">
                        ⚠️ Risco Excessivo! Use 2% (R$ {suggestedSafe.toFixed(2)})
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Valor excede 5% da banca (R$ {maxSafe.toFixed(2)}). Proteja seu capital!
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Potential profit */}
                {betValue > 0 && !isExcessive && (
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>Lucro potencial (odd ~{defaultOdd.toFixed(2)}):</span>
                    <span className="text-primary font-bold">+ R$ {potentialProfit.toFixed(2)}</span>
                  </div>
                )}

                {/* Confirmed message */}
                {confirmed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-primary font-semibold text-center"
                  >
                    ✅ Aposta registrada! O sistema monitorará o jogo.
                  </motion.p>
                )}
              </div>

              {/* Justification */}
              <div className="space-y-2">
                <p className="text-xs font-display tracking-wider text-muted-foreground">JUSTIFICATIVA</p>
                <p className="font-body text-sm text-foreground leading-relaxed">{oracle.primaryBet.reasoning}</p>
              </div>

              {/* Red Flags */}
              {oracle.redFlags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs font-display tracking-wider text-destructive">
                    <AlertTriangle className="w-3 h-3" /> ALERTAS DE RISCO
                  </div>
                  <ul className="space-y-1">
                    {oracle.redFlags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm font-body text-muted-foreground">
                        <span className="text-destructive shrink-0">⚠️</span> {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Probabilities */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: homeTeam, value: oracle.probabilities.homeWin },
                  { label: 'Empate', value: oracle.probabilities.draw },
                  { label: awayTeam, value: oracle.probabilities.awayWin },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card p-3 text-center">
                    <p className="text-xs font-body text-muted-foreground truncate">{label}</p>
                    <p className="font-display text-lg text-foreground">{probAsPercent(value).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
