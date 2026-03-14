import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { BarChart3 } from 'lucide-react';

interface PoissonSectionProps {
  oracle: OracleAnalysis;
}

export function PoissonSection({ oracle }: PoissonSectionProps) {
  const { poisson, probabilities } = oracle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        MODELO POISSON
      </h3>

      {/* xG */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-xl bg-secondary/40 border border-border">
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">xG Casa</p>
          <p className="font-display text-3xl text-oracle-win">
            {poisson.homeExpectedGoals.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary/40 border border-border">
          <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">xG Visitante</p>
          <p className="font-display text-3xl text-oracle-loss">
            {poisson.awayExpectedGoals.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Most Likely Scores */}
      <div className="space-y-2">
        <p className="text-xs font-body text-oracle-muted uppercase tracking-wider">Placares Mais Prováveis</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {poisson.mostLikelyScores.slice(0, 6).map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              className={`text-center p-2 rounded-lg border ${i === 0 ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary/30'}`}
            >
              <p className={`font-display text-xl ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                {s.score}
              </p>
              <p className="text-xs font-body text-oracle-muted">
                {(s.prob * 100).toFixed(1)}%
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Extra markets */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-body text-oracle-muted">Over 2.5</span>
          <span className={`text-sm font-display ${probabilities.over25 > 0.5 ? 'text-oracle-win' : 'text-oracle-loss'}`}>
            {(probabilities.over25 * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-body text-oracle-muted">BTTS</span>
          <span className={`text-sm font-display ${probabilities.btts > 0.5 ? 'text-oracle-win' : 'text-oracle-loss'}`}>
            {(probabilities.btts * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
