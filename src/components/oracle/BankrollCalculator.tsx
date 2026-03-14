import { useState } from 'react';
import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface BankrollCalculatorProps {
  oracle: OracleAnalysis;
}

export function BankrollCalculator({ oracle }: BankrollCalculatorProps) {
  const [bankroll, setBankroll] = useState<string>('1000');
  const { primaryBet, verdict } = oracle;

  const bankrollNum = parseFloat(bankroll) || 0;
  const kellyPct = primaryBet.kellyFraction / 100;
  const betAmount = bankrollNum * kellyPct;
  const evPct = primaryBet.ev / 100;
  const potentialProfit = betAmount * evPct;
  const maxLoss = betAmount;

  const isRecommended = verdict === 'APOSTAR' && primaryBet.ev > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        GESTÃO DE BANCA
      </h3>

      {!isRecommended ? (
        <div className="text-center py-4">
          <p className="font-display text-lg text-oracle-loss">SEM EDGE — PROTEJA SUA BANCA</p>
          <p className="text-sm font-body text-oracle-muted mt-1">
            O Oracle não encontrou valor nesta partida. Passe e aguarde uma oportunidade melhor.
          </p>
        </div>
      ) : (
        <>
          {/* Bankroll Input */}
          <div className="space-y-2">
            <label className="text-xs font-body text-oracle-muted uppercase tracking-wider">
              Se sua banca for:
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-body text-oracle-muted">R$</span>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 font-display text-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                min="0"
                step="100"
              />
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center">
              <TrendingUp className="w-5 h-5 text-oracle-win mx-auto mb-1" />
              <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">Aposte</p>
              <p className="font-display text-2xl text-oracle-win">
                R$ {betAmount.toFixed(2)}
              </p>
              <p className="text-xs font-body text-oracle-muted">
                Kelly: {primaryBet.kellyFraction.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-xl bg-secondary/40 border border-border p-4 text-center">
              <TrendingUp className="w-5 h-5 text-oracle-draw mx-auto mb-1" />
              <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">Lucro potencial</p>
              <p className="font-display text-2xl text-oracle-draw">
                R$ {potentialProfit.toFixed(2)}
              </p>
              <p className="text-xs font-body text-oracle-muted">
                EV: {primaryBet.ev.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-xl bg-oracle-loss/5 border border-oracle-loss/20 p-4 text-center">
              <TrendingDown className="w-5 h-5 text-oracle-loss mx-auto mb-1" />
              <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">Perda máxima</p>
              <p className="font-display text-2xl text-oracle-loss">
                R$ {maxLoss.toFixed(2)}
              </p>
              <p className="text-xs font-body text-oracle-muted">
                {((maxLoss / bankrollNum) * 100).toFixed(1)}% da banca
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
