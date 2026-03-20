import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface BetInputWidgetProps {
  bankrollAmount: number;
  odd: number;
  maxPct?: number; // default 5% = R$10 on R$200
}

export function BetInputWidget({ bankrollAmount, odd, maxPct = 5 }: BetInputWidgetProps) {
  const [betAmount, setBetAmount] = useState('');

  const maxBet = (bankrollAmount * maxPct) / 100;
  const safeBet = (bankrollAmount * 2) / 100; // 2% = safe recommendation
  const numAmount = parseFloat(betAmount) || 0;
  const isExcessive = numAmount > maxBet;
  const potentialProfit = numAmount * (odd - 1);
  const totalReturn = numAmount + potentialProfit;

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

      {numAmount > 0 && !isExcessive && (
        <p className="text-[10px] text-muted-foreground">
          Retorno total estimado: <span className="font-bold text-foreground">R$ {totalReturn.toFixed(2)}</span>
        </p>
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
