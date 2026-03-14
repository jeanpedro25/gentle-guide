import { motion } from 'framer-motion';
import { OracleAnalysis, normalizeProbabilities } from '@/types/prediction';
import { BarChart3, Target } from 'lucide-react';

interface PoissonSectionProps {
  oracle: OracleAnalysis;
  homeTeam?: string;
  awayTeam?: string;
}

export function PoissonSection({ oracle, homeTeam, awayTeam }: PoissonSectionProps) {
  const { poisson } = oracle;
  const probs = normalizeProbabilities(oracle.probabilities);

  // Get predicted score
  const predicted = oracle.predictedScore;
  const scenarios = oracle.scoreScenarios || poisson.mostLikelyScores.slice(0, 5).map(s => ({
    score: s.score,
    prob: s.prob > 1 ? s.prob : s.prob * 100,
  }));

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

      {/* Predicted Score - prominent display */}
      {predicted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          className="text-center py-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <p className="text-xs font-body text-muted-foreground uppercase tracking-wider mb-2">
            <Target className="w-3 h-3 inline mr-1" />
            PLACAR MAIS PROVÁVEL
          </p>
          <p className="font-display text-5xl text-primary">
            {predicted.home} × {predicted.away}
          </p>
        </motion.div>
      )}

      {/* xG */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-xl bg-secondary/40 border border-border">
          <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">xG Casa</p>
          <p className="font-display text-3xl text-oracle-win">
            {poisson.homeExpectedGoals.toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-secondary/40 border border-border">
          <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">xG Visitante</p>
          <p className="font-display text-3xl text-oracle-loss">
            {poisson.awayExpectedGoals.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Top 5 Score Scenarios */}
      {scenarios.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Top 5 Placares</p>
          <div className="flex items-center gap-2 flex-wrap">
            {scenarios.slice(0, 5).map((s, i) => {
              const probDisplay = s.prob > 1 ? s.prob.toFixed(1) : (s.prob * 100).toFixed(1);
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className={`text-xs font-display px-3 py-1.5 rounded-lg ${i === 0 ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-foreground'}`}
                >
                  {s.score} ({probDisplay}%)
                </motion.span>
              );
            })}
          </div>
        </div>
      )}

      {/* Most Likely Scores from Poisson */}
      <div className="space-y-2">
        <p className="text-xs font-body text-muted-foreground uppercase tracking-wider">Placares Poisson</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {poisson.mostLikelyScores.slice(0, 6).map((s, i) => {
            const probVal = s.prob > 1 ? s.prob : s.prob * 100;
            return (
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
                <p className="text-xs font-body text-muted-foreground">
                  {probVal.toFixed(1)}%
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Extra markets */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-body text-muted-foreground">Over 2.5</span>
          <span className={`text-sm font-display ${probs.over25 > 0.5 ? 'text-oracle-win' : 'text-oracle-loss'}`}>
            {(probs.over25 * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-body text-muted-foreground">BTTS</span>
          <span className={`text-sm font-display ${probs.btts > 0.5 ? 'text-oracle-win' : 'text-oracle-loss'}`}>
            {(probs.btts * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
