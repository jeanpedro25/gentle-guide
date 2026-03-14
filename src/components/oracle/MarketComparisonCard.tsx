import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { ArrowLeftRight } from 'lucide-react';

interface MarketComparisonCardProps {
  oracle: OracleAnalysis;
}

export function MarketComparisonCard({ oracle }: MarketComparisonCardProps) {
  const { marketComparison, probabilities } = oracle;

  const rows = [
    {
      label: 'Casa',
      realProb: probabilities.homeWin,
      impliedProb: marketComparison.homeImpliedProb,
    },
    {
      label: 'Empate',
      realProb: probabilities.draw,
      impliedProb: marketComparison.drawImpliedProb,
    },
    {
      label: 'Visitante',
      realProb: probabilities.awayWin,
      impliedProb: marketComparison.awayImpliedProb,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-primary" />
        ORACLE vs MERCADO
      </h3>

      <div className="space-y-3">
        {rows.map((row) => {
          const edge = row.realProb - row.impliedProb;
          const hasValue = edge > 0.02;
          return (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs font-body text-oracle-muted w-16">{row.label}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-body mb-1">
                    <span className="text-oracle-muted">Oracle</span>
                    <span className="text-foreground">{(row.realProb * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.realProb * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-body mb-1">
                    <span className="text-oracle-muted">Mercado</span>
                    <span className="text-foreground">{(row.impliedProb * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.impliedProb * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-oracle-draw"
                    />
                  </div>
                </div>
                <span className={`text-xs font-display w-16 text-right ${hasValue ? 'text-oracle-win' : 'text-oracle-muted'}`}>
                  {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {marketComparison.valueDetected !== 'NONE' && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <span className="text-xs font-body text-oracle-muted">Valor detectado:</span>
          <span className="text-sm font-display text-oracle-win px-2 py-0.5 rounded bg-oracle-win/10 border border-oracle-win/30">
            {marketComparison.valueDetected}
          </span>
        </div>
      )}
    </motion.div>
  );
}
