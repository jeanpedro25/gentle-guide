import { motion } from 'framer-motion';
import { PredictionResult, OracleAnalysis, predictionLabels, confidenceGradeLabels, confidenceGradeColors, verdictLabels } from '@/types/prediction';
import { CountUpNumber } from './CountUpNumber';

interface VerdictCardProps {
  result: PredictionResult;
  oracle?: OracleAnalysis;
  homeTeam: string;
  awayTeam: string;
}

export function VerdictCard({ result, oracle, homeTeam, awayTeam }: VerdictCardProps) {
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

  const isApostar = oracle?.verdict === 'APOSTAR';
  const verdictColor = isApostar ? 'text-oracle-win' : 'text-oracle-loss';
  const verdictBg = isApostar ? 'bg-oracle-win/10 border-oracle-win' : 'bg-oracle-loss/10 border-oracle-loss';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={`${cardClass} ${glowClass} p-6 md:p-8 text-center`}
    >
      <p className="text-oracle-muted text-sm font-body mb-2">VEREDITO ORACLE</p>

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

      {/* Oracle Verdict Badge */}
      {oracle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${verdictBg}`}>
            <span className={`font-display text-2xl tracking-widest ${verdictColor}`}>
              {verdictLabels[oracle.verdict]}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className={`font-display text-sm ${confidenceGradeColors[oracle.primaryBet.confidence] || 'text-oracle-muted'}`}>
              GRAU {oracle.primaryBet.confidence}
            </span>
            <span className="text-xs font-body text-oracle-muted">
              {confidenceGradeLabels[oracle.primaryBet.confidence]}
            </span>
          </div>

          <p className="text-sm font-body text-muted-foreground max-w-md mx-auto">
            {oracle.verdictReason}
          </p>
        </motion.div>
      )}

      {/* Legacy confidence bar (fallback) */}
      {!oracle && (
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
          </div>
        </div>
      )}
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
