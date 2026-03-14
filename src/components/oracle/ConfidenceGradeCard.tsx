import { motion } from 'framer-motion';
import { OracleAnalysis, confidenceGradeColors, confidenceGradeLabels } from '@/types/prediction';
import { Star, ShieldCheck, ShieldAlert, ShieldOff, Ban } from 'lucide-react';

interface ConfidenceGradeCardProps {
  oracle: OracleAnalysis;
}

const gradeDescriptions: Record<string, string> = {
  'A+': 'Edge matemático forte. Aposte com confiança.',
  'A': 'Bom valor detectado. Aposte com tamanho normal.',
  'B': 'Edge marginal. Aposte pequeno ou passe.',
  'C': 'Dados insuficientes. Passe.',
  'D': 'Contra a matemática. Nunca aposte.',
};

const gradeIcons: Record<string, typeof Star> = {
  'A+': Star,
  'A': ShieldCheck,
  'B': ShieldAlert,
  'C': ShieldOff,
  'D': Ban,
};

const gradeStars: Record<string, number> = {
  'A+': 5,
  'A': 4,
  'B': 3,
  'C': 2,
  'D': 1,
};

export function ConfidenceGradeCard({ oracle }: ConfidenceGradeCardProps) {
  const grade = oracle.primaryBet.confidence;
  const colorClass = confidenceGradeColors[grade] || 'text-oracle-muted';
  const Icon = gradeIcons[grade] || Star;
  const stars = gradeStars[grade] || 1;

  const bgClass =
    grade === 'A+' || grade === 'A' ? 'border-oracle-win/30 bg-oracle-win/5' :
    grade === 'B' ? 'border-oracle-draw/30 bg-oracle-draw/5' :
    'border-oracle-loss/30 bg-oracle-loss/5';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.45, type: 'spring' }}
      className={`glass-card p-6 text-center border ${bgClass}`}
    >
      <Icon className={`w-8 h-8 mx-auto mb-2 ${colorClass}`} />

      <p className={`font-display text-6xl md:text-7xl tracking-wider ${colorClass} mb-2`}>
        {grade}
      </p>

      {/* Stars */}
      <div className="flex items-center justify-center gap-1 mb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < stars ? colorClass : 'text-secondary'}`}
            fill={i < stars ? 'currentColor' : 'none'}
          />
        ))}
      </div>

      <p className="text-sm font-body text-foreground mb-1">
        {gradeDescriptions[grade]}
      </p>

      <p className="text-xs font-body text-oracle-muted">
        {confidenceGradeLabels[grade]}
      </p>
    </motion.div>
  );
}
