import { motion } from 'framer-motion';
import { OracleAnalysis } from '@/types/prediction';
import { Grid3X3 } from 'lucide-react';

interface PoissonHeatmapProps {
  oracle: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

export function PoissonHeatmap({ oracle, homeTeam, awayTeam }: PoissonHeatmapProps) {
  const { poisson } = oracle;
  const lambdaH = poisson.homeExpectedGoals;
  const lambdaA = poisson.awayExpectedGoals;

  // Calculate Poisson probability for each scoreline
  const poissonProb = (lambda: number, k: number): number => {
    let factorial = 1;
    for (let i = 2; i <= k; i++) factorial *= i;
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial;
  };

  const maxGoals = 6;
  const grid: number[][] = [];
  let maxProb = 0;

  for (let h = 0; h <= maxGoals; h++) {
    grid[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poissonProb(lambdaH, h) * poissonProb(lambdaA, a);
      grid[h][a] = prob;
      if (prob > maxProb) maxProb = prob;
    }
  }

  // Find top 5 scores
  const allScores: { h: number; a: number; prob: number }[] = [];
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      allScores.push({ h, a, prob: grid[h][a] });
    }
  }
  allScores.sort((a, b) => b.prob - a.prob);
  const top5 = allScores.slice(0, 5);

  const getColor = (prob: number): string => {
    const intensity = prob / maxProb;
    if (intensity > 0.85) return 'bg-primary/80 text-primary-foreground';
    if (intensity > 0.65) return 'bg-primary/50 text-foreground';
    if (intensity > 0.45) return 'bg-primary/30 text-foreground';
    if (intensity > 0.25) return 'bg-primary/15 text-foreground';
    if (intensity > 0.1) return 'bg-secondary/80 text-muted-foreground';
    return 'bg-secondary/30 text-muted-foreground/50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Grid3X3 className="w-5 h-5 text-primary" />
        MATRIZ DE POISSON
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          {/* Column headers (Away goals) */}
          <div className="flex items-center gap-1 mb-1">
            <div className="w-16 text-right pr-2">
              <span className="text-[10px] font-body text-oracle-muted uppercase">{awayTeam.slice(0, 6)}</span>
            </div>
            {Array.from({ length: maxGoals + 1 }, (_, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-xs font-display text-oracle-muted">{i}</span>
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {Array.from({ length: maxGoals + 1 }, (_, h) => (
            <div key={h} className="flex items-center gap-1 mb-1">
              <div className="w-16 text-right pr-2 flex items-center justify-end gap-1">
                {h === 0 && (
                  <span className="text-[10px] font-body text-oracle-muted uppercase">{homeTeam.slice(0, 6)}</span>
                )}
                <span className="text-xs font-display text-oracle-muted">{h}</span>
              </div>
              {Array.from({ length: maxGoals + 1 }, (_, a) => {
                const prob = grid[h][a];
                const isTop1 = top5[0].h === h && top5[0].a === a;
                return (
                  <motion.div
                    key={a}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + (h * 7 + a) * 0.01 }}
                    className={`flex-1 aspect-square rounded-md flex items-center justify-center ${getColor(prob)} ${isTop1 ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                    title={`${h}x${a}: ${(prob * 100).toFixed(1)}%`}
                  >
                    <span className="text-[10px] font-body leading-none">
                      {(prob * 100).toFixed(1)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 scores */}
      <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
        <span className="text-xs font-body text-oracle-muted">Top 5:</span>
        {top5.map((s, i) => (
          <span
            key={i}
            className={`text-xs font-display px-2 py-1 rounded ${i === 0 ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'}`}
          >
            {s.h}x{s.a} ({(s.prob * 100).toFixed(1)}%)
          </span>
        ))}
      </div>
    </motion.div>
  );
}
