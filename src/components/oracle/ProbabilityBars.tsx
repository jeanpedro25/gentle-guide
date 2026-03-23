import { motion } from 'framer-motion';
import { PredictionResult } from '@/types/prediction';
import { CountUpNumber } from './CountUpNumber';

interface ProbabilityBarsProps {
  result: PredictionResult;
  homeTeam: string;
  awayTeam: string;
}

export function ProbabilityBars({ result, homeTeam, awayTeam }: ProbabilityBarsProps) {
  const values = [result.homeWinPercent, result.drawPercent, result.awayWinPercent];
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const hasTie = maxValue === minValue;
  const pickTone = (value: number) => {
    if (hasTie) return 'draw';
    if (value === maxValue) return 'win';
    if (value === minValue) return 'loss';
    return 'draw';
  };

  const bars = [
    {
      label: homeTeam,
      value: result.homeWinPercent,
      tone: pickTone(result.homeWinPercent),
    },
    {
      label: 'Empate',
      value: result.drawPercent,
      tone: pickTone(result.drawPercent),
    },
    {
      label: awayTeam,
      value: result.awayWinPercent,
      tone: pickTone(result.awayWinPercent),
    },
  ].map((bar) => ({
    ...bar,
    color: bar.tone === 'win' ? 'bg-oracle-win' : bar.tone === 'loss' ? 'bg-oracle-loss' : 'bg-oracle-draw',
    textColor: bar.tone === 'win' ? 'text-oracle-win' : bar.tone === 'loss' ? 'text-oracle-loss' : 'text-oracle-draw',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground">PROBABILIDADES</h3>
      <div className="space-y-4">
        {bars.map((bar, i) => (
          <div key={bar.label} className="space-y-1.5">
            <div className="flex justify-between text-sm font-body">
              <span className="text-oracle-muted">{bar.label}</span>
              <span className={bar.textColor}>
                <CountUpNumber value={bar.value} duration={1000} />%
              </span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bar.value}%` }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.15, ease: 'easeOut' }}
                className={`h-full rounded-full ${bar.color}`}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
