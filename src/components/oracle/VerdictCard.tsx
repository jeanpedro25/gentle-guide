import { motion } from 'framer-motion';
import { PredictionResult, predictionLabels, confidenceLabels } from '@/types/prediction';
import { CountUpNumber } from './CountUpNumber';

interface VerdictCardProps {
  result: PredictionResult;
  homeTeam: string;
  awayTeam: string;
}

export function VerdictCard({ result, homeTeam, awayTeam }: VerdictCardProps) {
  const colorClass =
    result.prediction === 'HOME_WIN' ? 'win' :
    result.prediction === 'DRAW' ? 'draw' : 'loss';

  const glowClass =
    result.prediction === 'HOME_WIN' ? 'neon-glow-green' :
    result.prediction === 'DRAW' ? 'neon-glow-amber' : 'neon-glow-crimson';

  const textClass = `text-oracle-${colorClass}`;
  const cardClass = `glass-card-${colorClass}`;

  const winPercent =
    result.prediction === 'HOME_WIN' ? result.homeWinPercent :
    result.prediction === 'DRAW' ? result.drawPercent : result.awayWinPercent;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={`${cardClass} ${glowClass} p-6 md:p-8 text-center`}
    >
      <p className="text-oracle-muted text-sm font-body mb-2">VEREDITO</p>

      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-sm font-body text-oracle-muted">{homeTeam}</span>
        <span className="font-display text-lg text-oracle-muted">VS</span>
        <span className="text-sm font-body text-oracle-muted">{awayTeam}</span>
      </div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`font-display text-4xl md:text-5xl tracking-wider ${textClass} mb-4`}
      >
        {predictionLabels[result.prediction]}
      </motion.h2>

      <div className={`font-display text-6xl md:text-7xl ${textClass} mb-4`}>
        <CountUpNumber value={winPercent} duration={1200} />%
      </div>

      {/* Confidence gauge */}
      <div className="space-y-2">
        <p className="text-xs text-oracle-muted font-body uppercase tracking-wider">Confiança</p>
        <div className="flex items-center justify-center gap-2">
          <div className="w-40 h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidenceToPercent(result.confidence)}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className={`h-full rounded-full bg-oracle-${colorClass}`}
            />
          </div>
          <span className={`font-display text-sm ${textClass}`}>
            {confidenceLabels[result.confidence]}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function confidenceToPercent(c: string): number {
  switch (c) {
    case 'LOW': return 25;
    case 'MEDIUM': return 50;
    case 'HIGH': return 75;
    case 'VERY_HIGH': return 95;
    default: return 50;
  }
}
