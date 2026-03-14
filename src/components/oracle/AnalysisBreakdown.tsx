import { motion } from 'framer-motion';
import { AnalysisBreakdown as AnalysisBreakdownOld } from './AnalysisBreakdown';
import { PredictionResult, riskLabels } from '@/types/prediction';
import { AlertTriangle, Shield, ShieldAlert, Brain } from 'lucide-react';

interface AnalysisBreakdownProps {
  result: PredictionResult;
}

export function AnalysisBreakdown({ result }: AnalysisBreakdownProps) {
  const riskIcon = result.riskLevel === 'LOW' ? Shield :
    result.riskLevel === 'MEDIUM' ? AlertTriangle : ShieldAlert;
  const RiskIcon = riskIcon;

  const riskColor = result.riskLevel === 'LOW' ? 'text-oracle-win' :
    result.riskLevel === 'MEDIUM' ? 'text-oracle-draw' : 'text-oracle-loss';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        POR QUE ESSA PREVISÃO?
      </h3>

      <p className="text-sm font-body text-muted-foreground leading-relaxed">{result.reasoning}</p>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Fatores-Chave</p>
        <div className="flex flex-wrap gap-2">
          {result.keyFactors.map((factor, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="px-3 py-1.5 bg-secondary/70 border border-border rounded-full text-xs font-body text-foreground"
            >
              ⚡ {factor}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <RiskIcon className={`w-4 h-4 ${riskColor}`} />
        <span className={`font-display text-sm ${riskColor}`}>
          {riskLabels[result.riskLevel]}
        </span>
      </div>
    </motion.div>
  );
}
