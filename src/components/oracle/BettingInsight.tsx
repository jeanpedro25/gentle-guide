import { motion } from 'framer-motion';
import { PredictionResult } from '@/types/prediction';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface BettingInsightProps {
  result: PredictionResult;
}

export function BettingInsight({ result }: BettingInsightProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground">INSIGHT DE APOSTA</h3>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-oracle-win mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-oracle-muted font-body uppercase tracking-wider mb-1">Aposta Sugerida</p>
            <p className="text-sm font-body text-foreground">{result.suggestedBet}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-oracle-draw mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-oracle-muted font-body uppercase tracking-wider mb-1">Tendência de Odds</p>
            <p className="text-sm font-body text-foreground">{result.oddsTrend}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 pt-3 border-t border-border">
        <AlertCircle className="w-4 h-4 text-oracle-draw mt-0.5 shrink-0" />
        <p className="text-xs font-body text-oracle-muted">
          ⚠️ Apenas para entretenimento. Aposte com responsabilidade.
        </p>
      </div>
    </motion.div>
  );
}
