import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Check, Loader2, AlertTriangle } from 'lucide-react';
import { AnaliseJogo, PICK_LABELS } from '@/lib/jogueAgora';
import { useCreateBet } from '@/hooks/useBets';
import { toast } from 'sonner';

interface Props {
  analise: AnaliseJogo | null;
  bankrollAmount: number;
  onClose: () => void;
}

export function BetPanel({ analise, bankrollAmount, onClose }: Props) {
  const createBet = useCreateBet();
  const [betAmount, setBetAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const safeBet = bankrollAmount * 0.02;
  const betValue = parseFloat(betAmount) || 0;
  const isExcessive = betValue > safeBet;
  const isDangerous = betValue > bankrollAmount * 0.05;
  const exceedsBankroll = betValue > bankrollAmount;
  const potentialProfit = analise ? betValue * (analise.melhor_odd - 1) : 0;

  const handleOpen = () => {
    setBetAmount(safeBet.toFixed(2));
    setShowConfirm(false);
  };

  const handleConfirm = async () => {
    if (!analise || betValue <= 0 || exceedsBankroll) return;
    try {
      await createBet.mutateAsync({
        home_team: analise.fixture.teams.home.name,
        away_team: analise.fixture.teams.away.name,
        league: analise.fixture.league.name,
        fixture_id: analise.fixture.fixture.id,
        prediction: analise.melhor_resultado,
        stake: betValue,
        potential_profit: potentialProfit,
        odd: analise.melhor_odd,
      });
      toast.success('Aposta registrada! Será resolvida automaticamente.');
      onClose();
    } catch {
      toast.error('Erro ao registrar aposta');
    }
  };

  return (
    <AnimatePresence>
      {analise && (
        <motion.div
          key="bet-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onAnimationComplete={() => handleOpen()}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary/30 rounded-t-2xl p-5 pb-8 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-foreground">APOSTAR</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Match summary */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground">{analise.fixture.league.name}</p>
            <p className="text-sm font-bold text-foreground">{analise.fixture.teams.home.name} vs {analise.fixture.teams.away.name}</p>
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="text-primary font-bold">Previsão: {analise.melhor_resultado} ({PICK_LABELS[analise.melhor_resultado]})</span>
              <span className="text-foreground">Odd: {analise.melhor_odd.toFixed(2)}</span>
              <span className="text-primary">EV: +{analise.melhor_ev.toFixed(1)}%</span>
              <span className="text-muted-foreground">Placar: {analise.placar_provavel}</span>
              <span className="text-muted-foreground">Confiança: {analise.confianca}%</span>
            </div>
          </div>

          {!showConfirm ? (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-semibold">QUANTO VOCÊ QUER APOSTAR?</label>
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

              {exceedsBankroll && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-bold">Valor maior que a banca! Aposta bloqueada.</p>
                </div>
              )}
              {isDangerous && !exceedsBankroll && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-bold">🚨 Acima de 5% da banca — risco muito alto!</p>
                </div>
              )}
              {isExcessive && !isDangerous && !exceedsBankroll && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                  <p className="text-xs text-yellow-500 font-bold">⚠️ Acima de 2% da banca — risco alto</p>
                </div>
              )}

              {betValue > 0 && !exceedsBankroll && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Se ganhar:</span>
                    <span className="text-primary font-bold">+ R$ {potentialProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Se perder:</span>
                    <span className="text-destructive font-bold">- R$ {betValue.toFixed(2)}</span>
                  </div>
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
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">📋 Resumo antes de confirmar</p>
              <div className="space-y-2 text-sm">
                {[
                  ['Jogo', `${analise.fixture.teams.home.name} vs ${analise.fixture.teams.away.name}`],
                  ['Previsão', `${analise.melhor_resultado} (${PICK_LABELS[analise.melhor_resultado]})`],
                  ['Odd', analise.melhor_odd.toFixed(2)],
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
  );
}
