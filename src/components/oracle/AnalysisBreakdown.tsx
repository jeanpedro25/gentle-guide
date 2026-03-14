import { motion } from 'framer-motion';
import { PredictionResult, OracleAnalysis, riskLabels } from '@/types/prediction';
import { AlertTriangle, Shield, ShieldAlert, Brain, Swords, Home, Goal } from 'lucide-react';

interface AnalysisBreakdownProps {
  result: PredictionResult;
  oracle?: OracleAnalysis;
}

export function AnalysisBreakdown({ result, oracle }: AnalysisBreakdownProps) {
  const riskIcon = result.riskLevel === 'LOW' ? Shield :
    result.riskLevel === 'MEDIUM' ? AlertTriangle : ShieldAlert;
  const RiskIcon = riskIcon;

  const riskColor = result.riskLevel === 'LOW' ? 'text-oracle-win' :
    result.riskLevel === 'MEDIUM' ? 'text-oracle-draw' : 'text-oracle-loss';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg tracking-wider text-foreground flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        ANÁLISE TÁTICA
      </h3>

      {/* Oracle-specific insights */}
      {oracle && (
        <div className="space-y-3">
          {/* Tactical Edge */}
          <div className="flex items-start gap-3">
            <Swords className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-oracle-muted font-body uppercase tracking-wider mb-1">Vantagem Tática</p>
              <p className="text-sm font-body text-foreground">{oracle.tacticalEdge}</p>
            </div>
          </div>

          {/* Home Advantage */}
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-oracle-draw mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-oracle-muted font-body uppercase tracking-wider mb-1">Fator Casa</p>
              <span className={`text-sm font-display ${oracle.homeAdvantage === 'FORTE' ? 'text-oracle-win' : oracle.homeAdvantage === 'FRACO' ? 'text-oracle-loss' : 'text-oracle-draw'}`}>
                {oracle.homeAdvantage}
              </span>
            </div>
          </div>

          {/* Goalkeeper Edge */}
          <div className="flex items-start gap-3">
            <Goal className="w-5 h-5 text-oracle-blue mt-0.5 shrink-0" style={{ color: 'hsl(var(--oracle-blue))' }} />
            <div>
              <p className="text-xs text-oracle-muted font-body uppercase tracking-wider mb-1">Vantagem Goleiro</p>
              <span className="text-sm font-display text-foreground">{oracle.goalkeeperEdge}</span>
            </div>
          </div>

          {/* Key Duels */}
          {oracle.keyDuels && oracle.keyDuels.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs text-oracle-muted font-body uppercase tracking-wider">Duelos Decisivos</p>
              {oracle.keyDuels.map((duel, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 border border-border"
                >
                  <span className="text-xs font-body text-foreground">{duel.homePlayer}</span>
                  <span className={`text-xs font-display px-2 ${duel.advantage === 'CASA' ? 'text-oracle-win' : duel.advantage === 'VISITANTE' ? 'text-oracle-loss' : 'text-oracle-draw'}`}>
                    {duel.advantage}
                  </span>
                  <span className="text-xs font-body text-foreground">{duel.awayPlayer}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Injury Impact */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs font-body text-oracle-muted">Impacto Lesões:</span>
            <span className={`text-xs font-display ${oracle.injuryImpact === 'CRITICO' || oracle.injuryImpact === 'ALTO' ? 'text-oracle-loss' : oracle.injuryImpact === 'MEDIO' ? 'text-oracle-draw' : 'text-oracle-win'}`}>
              {oracle.injuryImpact}
            </span>
          </div>
        </div>
      )}

      {/* Legacy fallback */}
      {!oracle && (
        <>
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
                  {factor}
                </motion.span>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 pt-2">
        <RiskIcon className={`w-4 h-4 ${riskColor}`} />
        <span className={`font-display text-sm ${riskColor}`}>
          {riskLabels[result.riskLevel]}
        </span>
      </div>
    </motion.div>
  );
}
