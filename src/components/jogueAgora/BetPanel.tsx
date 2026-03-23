import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Check, Loader2, AlertTriangle } from 'lucide-react';
import { AnaliseJogo, PICK_LABELS } from '@/lib/jogueAgora';
import { gerarDecisaoFinal } from '@/lib/evDecision';
import { useCreateBet } from '@/hooks/useBets';
import { toast } from 'sonner';

interface Props {
  analise: AnaliseJogo | null;
  bankrollAmount: number;
  onClose: () => void;
}

type BetOutcome = 'GANHA' | 'PERDE' | 'EMPATA';

const OUTCOME_LABEL: Record<BetOutcome, string> = {
  GANHA: 'Ganha',
  PERDE: 'Perde',
  EMPATA: 'Empata (devolvida)',
};

export function BetPanel({ analise, bankrollAmount, onClose }: Props) {
  const createBet = useCreateBet();
  const [betAmount, setBetAmount] = useState('');
  const [manualProfit, setManualProfit] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [betOutcome, setBetOutcome] = useState<BetOutcome>('GANHA');

  const safeBet = bankrollAmount * 0.02;
  const decisao = analise ? gerarDecisaoFinal(analise.melhor_ev, analise.confianca) : null;
  const betValue = parseFloat(betAmount.replace(',', '.')) || 0;
  const manualProfitValue = parseFloat(manualProfit.replace(',', '.')) || 0;
  const hasManualProfit = manualProfit.trim().length > 0;
  const isExcessive = betValue > safeBet;
  const isDangerous = betValue > bankrollAmount * 0.05;
  const exceedsBankroll = betValue > bankrollAmount;

  const potentialProfit = hasManualProfit
    ? Math.max(0, manualProfitValue)
    : analise
      ? Math.max(0, betValue * (analise.melhor_odd - 1))
      : 0;
  const totalReturn = betValue + potentialProfit;

  const settledProfit =
    betOutcome === 'GANHA' ? potentialProfit :
    betOutcome === 'PERDE' ? -betValue :
    0;

  const settledReturn =
    betOutcome === 'GANHA' ? totalReturn :
    betOutcome === 'PERDE' ? 0 :
    betValue;

  const handleOpen = () => {
    setBetAmount(safeBet.toFixed(2));
    setManualProfit('');
    setBetOutcome('GANHA');
    setShowConfirm(false);
  };

  const handleClose = () => {
    setBetAmount('');
    setManualProfit('');
    setBetOutcome('GANHA');
    setShowConfirm(false);
    onClose();
  };

  const handleProfitChange = (value: string) => {
    const normalized = value.replace(',', '.');

    if (!/^\d*(\.\d{0,2})?$/.test(normalized)) {
      return;
    }

    setManualProfit(normalized);
  };

  const handleConfirm = async () => {
    if (!analise || !decisao?.botaoApostar || betValue <= 0 || exceedsBankroll) return;

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
      handleClose();
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
          onAnimationComplete={handleOpen}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary/30 rounded-t-2xl p-5 pb-8 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-foreground">APOSTAR</span>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground">{analise.fixture.league.name}</p>
            <p className="text-sm font-bold text-foreground">
              {analise.fixture.teams.home.name} vs {analise.fixture.teams.away.name}
            </p>
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="text-primary font-bold">
                Previsão: {analise.melhor_resultado} ({PICK_LABELS[analise.melhor_resultado]})
              </span>
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
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-lg font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0,00"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Sugestão: R$ {safeBet.toFixed(2)} (2% da banca)</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-semibold">LUCRO SE GANHAR (R$)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualProfit}
                    onChange={(e) => handleProfitChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder={betValue > 0 ? `Calculado: R$ ${potentialProfit.toFixed(2)}` : 'Editar lucro manual'}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Se preencher, o lucro manual substitui o calculo automatico pela odd.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">RESULTADO DA APOSTA</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['GANHA', 'EMPATA', 'PERDE'] as BetOutcome[]).map((outcome) => {
                    const selected = betOutcome === outcome;
                    return (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => setBetOutcome(outcome)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                          selected
                            ? 'bg-primary/20 text-primary border-primary/40'
                            : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/60'
                        }`}
                      >
                        {OUTCOME_LABEL[outcome]}
                      </button>
                    );
                  })}
                </div>
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
                <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor apostado</span>
                    <span className="font-bold text-foreground">R$ {betValue.toFixed(2)}</span>
                  </div>
                  {decisao && !decisao.botaoApostar && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Decisao</span>
                      <span className="font-bold text-destructive">{decisao.texto}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resultado marcado</span>
                    <span className="font-bold text-foreground">{OUTCOME_LABEL[betOutcome]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lucro / Prejuízo</span>
                    <span className={`font-bold ${settledProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {settledProfit >= 0 ? '+' : '-'}R$ {Math.abs(settledProfit).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-primary/20 pt-1.5">
                    <span className="text-muted-foreground">Retorno total</span>
                    <span className="font-bold text-foreground">R$ {settledReturn.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowConfirm(true)}
                disabled={!decisao?.botaoApostar || betValue <= 0 || exceedsBankroll}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decisao?.botaoApostar ? 'Continuar' : 'APOSTA NAO RECOMENDADA — EV INSUFICIENTE'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
                <p className="text-foreground font-semibold">Confirmar aposta?</p>
                <p className="text-muted-foreground mt-1">
                  Você vai apostar <strong>R$ {betValue.toFixed(2)}</strong> com odd <strong>{analise.melhor_odd.toFixed(2)}</strong>.
                </p>
                <p className="text-muted-foreground mt-1">
                  Resultado marcado: <strong>{OUTCOME_LABEL[betOutcome]}</strong>
                </p>
                <p className={`font-bold mt-1 ${settledProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  Lucro / Prejuízo: {settledProfit >= 0 ? '+' : '-'}R$ {Math.abs(settledProfit).toFixed(2)}
                </p>
                <p className="text-foreground font-semibold mt-1">Retorno total: R$ {settledReturn.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={createBet.isPending}
                  className="py-3 rounded-lg bg-secondary text-foreground text-sm font-bold hover:bg-secondary/80 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={createBet.isPending}
                  className="py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createBet.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Confirmando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
