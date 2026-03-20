import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface BetInputWidgetProps {
  bankrollAmount: number;
  odd: number;
  maxPct?: number; // default 5% = R$10 on R$200
}

type BetOutcome = 'GANHA' | 'PERDE' | 'EMPATA';

const OUTCOME_LABEL: Record<BetOutcome, string> = {
  GANHA: 'Ganha',
  PERDE: 'Perde',
  EMPATA: 'Empata',
};

export function BetInputWidget({ bankrollAmount, odd, maxPct = 5 }: BetInputWidgetProps) {
  const [betAmount, setBetAmount] = useState('');
  const [betOutcome, setBetOutcome] = useState<BetOutcome>('GANHA');

  const maxBet = (bankrollAmount * maxPct) / 100;
  const safeBet = (bankrollAmount * 2) / 100; // 2% = safe recommendation
  const numAmount = parseFloat(betAmount) || 0;
  const isExcessive = numAmount > maxBet;

  const potentialProfit = numAmount * (odd - 1);
  const totalReturn = numAmount + potentialProfit;

  const settledProfit =
    betOutcome === 'GANHA' ? potentialProfit :
    betOutcome === 'PERDE' ? -numAmount :
    0;

  const settledReturn =
    betOutcome === 'GANHA' ? totalReturn :
    betOutcome === 'PERDE' ? 0 :
    numAmount;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">R$</span>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="0,00"
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm font-semibold border transition-colors bg-card focus:outline-none ${
              isExcessive
                ? 'border-destructive text-destructive focus:ring-destructive/50'
                : 'border-border text-foreground focus:ring-primary/50'
            } focus:ring-1`}
          />
        </div>

        {numAmount > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Lucro se ganhar</p>
            <div className="flex items-center gap-1 text-xs justify-end">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-primary font-bold">+R$ {potentialProfit.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {numAmount > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Resultado da aposta</p>

          <div className="grid grid-cols-3 gap-1">
            {(['GANHA', 'EMPATA', 'PERDE'] as BetOutcome[]).map((outcome) => {
              const selected = betOutcome === outcome;
              return (
                <button
                  key={outcome}
                  type="button"
                  onClick={() => setBetOutcome(outcome)}
                  className={`py-1.5 rounded-md text-[10px] font-bold border transition-colors ${
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

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lucro / Prejuízo</span>
              <span className={`font-bold ${settledProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {settledProfit >= 0 ? '+' : '-'}R$ {Math.abs(settledProfit).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-primary/20 pt-1">
              <span className="text-muted-foreground">Retorno total</span>
              <span className="font-bold text-foreground">R$ {settledReturn.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isExcessive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-destructive font-semibold leading-tight">
              ⚠️ Risco Excessivo! Use 2% (R$ {safeBet.toFixed(2)})
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
