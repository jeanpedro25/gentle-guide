import { motion } from 'framer-motion';
import { PredictionResult } from '@/types/prediction';
import { CountUpNumber } from './CountUpNumber';

interface ProbabilityBarsProps {
  result: PredictionResult;
  homeTeam: string;
  awayTeam: string;
}

export function ProbabilityBars({ result, homeTeam, awayTeam }: ProbabilityBarsProps) {
  const bars = [
    { label: homeTeam, value: result.homeWinPercent, color: 'bg-oracle-win', textColor: 'text-oracle-win' },
    { label: 'Empate', value: result.drawPercent, color: 'bg-oracle-draw', textColor: 'text-oracle-draw' },
    { label: awayTeam, value: result.awayWinPercent, color: 'bg-oracle-loss', textColor: 'text-oracle-loss' },
  ];

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
